# ReachInbox Email Scheduler

Full-stack email scheduler: Express + TypeScript + BullMQ/Redis + PostgreSQL + Elasticsearch + Ethereal SMTP, with a React + Tailwind dashboard.

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
Google Cloud Console > Credentials > OAuth client (Web). Authorized redirect URI: `http://localhost:4000/auth/google/callback`. Put the id/secret in `backend/.env`.

### Slack OAuth
1. Create an app at api.slack.com/apps, enable **Incoming Webhooks**, add the scope `incoming-webhook`.
2. Slack requires an **https** redirect URL: run `ngrok http 4000`, set `BACKEND_URL=https://<id>.ngrok-free.app` in `.env`, and add `https://<id>.ngrok-free.app/api/slack/callback` as a redirect URL in the Slack app.
3. Set `SLACK_CLIENT_ID/SECRET`, restart, click **Connect Slack** in the dashboard, pick a channel.
4. The callback stores the per-user incoming webhook URL. Disconnecting deletes it; with no connection, rate limit hits simply skip the notification.

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

**Delay between emails.** Per sender, a Lua script reserves the next send slot (`max(now, lastSlot) + MIN_DELAY_MS`). A job that gets a slot in the future is moved back to delayed with `moveToDelayed` (no attempt consumed, no failure). Result: sends of the same sender are at least `MIN_DELAY_MS` apart, regardless of concurrency, and different senders run in parallel.

**Hourly rate limit.** Redis counter `rate:{senderId}:{UTC hour}` incremented by an atomic "increment if under limit" Lua script. When the limit is hit, the job is **not dropped or failed**: it is moved to the start of the next hour window (+ a 1ms-per-overflow rank so original order is preserved), the DB row's `scheduled_at` and `note` are updated so the dashboard shows it, and the job is re-queued. After the window rolls over, the delayed jobs wake in order and take fresh send slots. The counter expires after 2h, so no cleanup is needed.

**Slack notification.** On the first rate limit hit per sender per hour window (deduplicated with `SET NX`, so 1000 delayed emails produce one message, not 1000) the worker POSTs to the user's stored webhook. Failures are logged, never thrown.

**Behavior under load (1000+ emails at once).** All 1000 are persisted and enqueued immediately as delayed jobs. Workers process at most `concurrency` at a time, spaced `MIN_DELAY_MS` per sender. With a limit of N/hour per sender, the first N/sender go out, the rest roll into following hours in order. Nothing is dropped, nothing is sent twice.

**Search.** Every create / reschedule / status change is indexed into Elasticsearch (`emails` index). `GET /api/emails?tab=&q=` uses `multi_match` over recipient, subject and body (fuzzy). If Elasticsearch is down, the API falls back to SQL `ILIKE`, and indexing failures never block sending.

**Auth.** Google OAuth (passport) issues a 7-day httpOnly JWT cookie. The Vite dev server proxies `/api`, `/auth`, `/admin` to the backend so everything is same-origin.

## Features implemented

Backend: scheduler (BullMQ delayed jobs) / persistence (Redis AOF + reconcile) / rate limiting (Redis Lua counters, per sender, configurable) / concurrency (configurable) / min delay (Redis slot reservation) / Slack OAuth + live notification / Elasticsearch indexing + search / Bull Board dashboard / Google OAuth / idempotency.

Frontend: Google login, header (name, email, avatar, logout), tabs (Scheduled / Sent), compose modal (subject, body, CSV/text upload with detected-count, start time, delay, hourly limit), tables with loading + empty + error states, toasts, search, auto-refresh, reusable UI components (`components/ui`), typed API layer.

## Assumptions, shortcuts and trade-offs

- The Figma file was not available to me, so the UI follows the written requirements with my own styling. Adjust `tailwind.config.js` and the components to match the design.
- Hour windows are UTC clock hours (simple and deterministic), not rolling 60-minute windows.
- A job that crashes mid-send (row left in `sending`) is marked `failed` by `reconcile()` after 10 minutes instead of being retried: this chooses at-most-once over at-least-once so an email is never duplicated.
- Bull Board is not behind auth (fine for a take-home; protect it in production).
- Rate-limited jobs get a 1ms-per-rank offset capped at 60s, so ordering is approximate past 60k overflow jobs per sender-hour.
- Schema is created with `create table if not exists` at boot rather than a migration tool.

## Demo video checklist (max 5 min)
1. Log in with Google, show header.
2. Compose: upload a CSV, show detected count, set start time + delay, Schedule.
3. Show Scheduled tab, then Sent tab filling in; open an Ethereal preview.
4. Restart: stop the server (Ctrl+C), start again, show future emails still send, no duplicates, Bull Board shows delayed jobs.
5. Rate limit: schedule e.g. 20 emails with hourly limit 5 and a 1s delay; show Slack message arriving, the "moved to next hour" note, and Bull Board delayed jobs.
