# ReachInbox Email Scheduler

Full-stack email scheduler: Express + TypeScript + BullMQ/Redis + PostgreSQL + Elasticsearch + Ethereal SMTP, with a React + Tailwind dashboard.

**Demo video:** (paste link here)

## Run it

Prerequisites: Node 18+, Docker.

```bash
docker compose up -d                      # postgres, redis (AOF on), elasticsearch

cd backend
cp .env.example .env                      # fill in Google + Slack credentials (see below)
npm install
npm run dev                               # API (:4000) + embedded BullMQ worker

# optional: extra worker processes to show multi-instance safety
npm run worker

cd ../frontend
npm install
npm run dev                               # http://localhost:5173
```

- Dashboard: http://localhost:5173
- Live BullMQ dashboard (Bull Board): http://localhost:4000/admin/queues (also linked as "Queue monitor" in the header)

### Ethereal Email
No manual setup. On first login the backend calls `nodemailer.createTestAccount()` and stores `SENDERS_PER_USER` (default 2) throwaway SMTP accounts as that user's **senders**. Emails are assigned to senders round-robin, which is what makes per-sender rate limiting visible. Each sent email stores an Ethereal preview URL (shown as "preview" in the Sent tab).

### Google OAuth
Google Cloud Console > Credentials > OAuth client (Web application). Authorized redirect URI: `http://localhost:4000/auth/google/callback` (plus `<BACKEND_URL>/auth/google/callback` if `BACKEND_URL` is changed, e.g. to an ngrok URL). Put the id/secret in `backend/.env`.

### Slack OAuth
1. Create an app at api.slack.com/apps (Blank app), enable **Incoming Webhooks**, and make sure the `incoming-webhook` scope is present.
2. Slack requires an **https** redirect URL: run `ngrok http 4000`, set `BACKEND_URL=https://<your-ngrok-domain>` in `.env`, and add `https://<your-ngrok-domain>/api/slack/callback` as a redirect URL in the Slack app (OAuth & Permissions).
3. Set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`, restart the backend, click **Connect Slack** in the dashboard, and pick a channel.
4. The callback stores the per-user incoming webhook URL. Disconnecting deletes it; with no connection, rate limit hits simply skip the notification (no crash). Connecting later starts notifications without a redeploy.

Note: Slack OAuth was tested through an ngrok tunnel (`ngrok http 4000`) with `BACKEND_URL` set to the ngrok URL. The tunnel is only needed while clicking "Connect Slack"; rate limit alerts are posted straight to the stored webhook afterward.

## Environment variables (backend)

| Var | Default | Meaning |
|---|---|---|
| `WORKER_CONCURRENCY` | 5 | parallel jobs per worker process |
| `MIN_DELAY_MS` | 2000 | **min 2 seconds between sends per sender** (also the UI default) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | 200 | default hourly cap per sender (UI default; each batch can override it) |
| `SENDERS_PER_USER` | 2 | Ethereal senders created per user |

## Architecture

**Scheduling.** `POST /api/schedule` validates input, inserts one row per recipient in Postgres (`status=scheduled`), then adds one BullMQ **delayed job** per email with `delay = scheduledAt - now`. No cron anywhere. `scheduledAt_i = startTime + i * delayBetween`.

**Persistence on restart.** Delayed jobs live in Redis (started with `appendonly yes`), so stopping and restarting the server loses nothing and nothing restarts from scratch: the worker simply resumes processing when each job's time comes. As a safety net, `reconcile()` runs on boot and re-creates jobs for any `scheduled` row that has no job (e.g. Redis wiped, or a crash between DB insert and enqueue). Postgres is the source of truth.

**Idempotency (no duplicate sends).**
1. `jobId = emailId`: BullMQ ignores a second add with the same id.
2. The worker only processes rows with `status='scheduled'`.
3. Atomic claim: `UPDATE ... SET status='sending' WHERE id=$1 AND status='scheduled'`. Only one worker can win, even with retries, stalled-job recovery or several instances.

**Concurrency.** `new Worker(..., { concurrency: WORKER_CONCURRENCY })`. All shared state (spacing, counters) lives in Redis and is updated with Lua scripts, so parallel jobs and multiple worker processes are safe.

**Delay between emails.** Per sender, a Lua script reserves the next send slot (`max(now, lastSlot) + MIN_DELAY_MS`). A job that gets a slot in the future is moved back to delayed with `moveToDelayed` (no attempt consumed, no failure). Result: sends of the same sender are at least `MIN_DELAY_MS` (default 2 seconds) apart, regardless of concurrency, and different senders run in parallel.

**Hourly rate limit.** Redis counter `rate:{senderId}:{UTC hour}` incremented by an atomic "increment if under limit" Lua script. When the limit is hit, the job is **not dropped or failed**: it is moved to the start of the next hour window (plus a 1ms-per-overflow rank so original order is preserved), the DB row's `scheduled_at` and `note` are updated so the dashboard shows it, and the job is re-queued. After the window rolls over, the delayed jobs wake in order and take fresh send slots. The counter expires after 2 hours, so no cleanup is needed.

**Slack notification.** On the first rate limit hit per sender per hour window (deduplicated with `SET NX`, so 1000 delayed emails produce one message per sender, not 1000) the worker POSTs to the user's stored webhook. Failures are logged, never thrown.

**Behavior under load (1000+ emails at once).** All 1000 are persisted and enqueued immediately as delayed jobs. Workers process at most `concurrency` at a time, spaced `MIN_DELAY_MS` per sender. With a limit of N/hour per sender, the first N per sender go out, and the rest roll into following hours in order. Nothing is dropped, nothing is sent twice.

**Search.** Every create / reschedule / status change is indexed into Elasticsearch (`emails` index). `GET /api/emails?tab=&q=` uses `multi_match` over recipient, subject and body (fuzzy). If Elasticsearch is down, the API falls back to SQL `ILIKE`, and indexing failures never block sending.

**Auth.** Google OAuth (passport) issues a 7-day httpOnly JWT cookie. The Vite dev server proxies `/api`, `/auth` and `/admin` to the backend so everything is same-origin in development.

## Features implemented

**Backend:** scheduler (BullMQ delayed jobs, no cron) / persistence (Redis AOF + reconcile on boot) / rate limiting (Redis Lua counters, per sender, configurable) / concurrency (configurable) / min delay between sends (Redis slot reservation) / Slack OAuth + live notification on rate limit / Elasticsearch indexing + search / live Bull Board dashboard / Google OAuth / idempotency.

**Frontend (built to the provided Figma screens):** Login screen (Login with Google, plus the email/password fields from the design), sidebar layout with the ONB logo, user card (name, email, avatar; menu with Slack connect, queue monitor and logout), Compose button, and Scheduled / Sent navigation with live counts. List view with search, filter and refresh, orange scheduled-time badges and grey "Sent" badges, star toggle, and an email detail view. Full-page Compose screen with From selector, recipient chips (+N overflow) and Upload List (CSV/text, shows the number of addresses detected), subject, delay between emails, hourly limit, a rich text editor, and a Send Later popover (date/time picker and quick options). Loading, empty and error states, toasts, reusable UI components (`components/ui`, `components/compose`), typed API layer.

## Assumptions, shortcuts and trade-offs

- The UI follows the Figma screens. Deviations: the email/password login fields are shown as in the design but are not wired up (the assignment requires real Google OAuth only), so submitting them shows a message pointing to Google login. The paperclip/attachments feature in the compose design is not implemented because it is not in the written requirements. Star state is stored per browser (localStorage).
- "From" can be a single sender or "All senders (rotate)", which round-robins across the user's Ethereal accounts so per-sender rate limiting is visible.
- The compose editor produces HTML, which is sent as the email's HTML part (with a plain-text fallback). Elasticsearch indexes the plain-text version of the body.
- Hour windows are UTC clock hours (simple and deterministic), not rolling 60-minute windows.
- A job that crashes mid-send (row left in `sending`) is marked `failed` by `reconcile()` after 10 minutes instead of being retried. This chooses at-most-once over at-least-once so an email is never duplicated.
- Bull Board is not behind authentication (acceptable for an assignment; it should be protected in production).
- Rate-limited jobs get a 1ms-per-rank offset capped at 60s, so ordering is approximate beyond 60k overflow jobs per sender-hour.
- Schema is created with `create table if not exists` at boot rather than a migration tool.
- Senders are Ethereal test accounts created automatically per user, so no real email is ever delivered.

## Demo video checklist (max 5 min)
1. Log in with Google, show header (name, email, avatar).
2. Compose: upload a CSV, show detected count, set start time + delay, Schedule.
3. Show Scheduled tab, then Sent tab filling in; open an Ethereal preview.
4. Restart: stop the server (Ctrl+C), start again, show future emails still send with no duplicates, and Bull Board showing delayed jobs.
5. Rate limit: schedule e.g. 20 emails with hourly limit 3 and a 1s delay; show the Slack message arriving, the "moved to next hour" note, and Bull Board delayed jobs.
