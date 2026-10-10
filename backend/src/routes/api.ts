import { randomUUID } from "crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config";
import { pool } from "../db";
import { emailQueue } from "../queue";
import { searchEmails } from "../search";
import { reindex, toDto } from "../services/emails";
import { listSenders } from "../services/senders";
import { requireAuth } from "./auth";

export const apiRouter = Router();

// ---------- Slack OAuth callback (no cookie auth: identity travels in the signed `state`) ----------
apiRouter.get("/slack/callback", async (req, res) => {
  const back = (v: string) => res.redirect(`${config.frontendUrl}/?slack=${v}`);
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    const { sub } = jwt.verify(state ?? "", config.jwtSecret) as { sub: string };
    if (!code) return back("error");
    const r = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code,
        redirect_uri: `${config.backendUrl}/api/slack/callback`,
      }),
    });
    const data: any = await r.json();
    if (!data.ok || !data.incoming_webhook?.url) {
      console.warn("[slack] oauth failed:", data.error);
      return back("error");
    }
    await pool.query(
      `insert into slack_connections(user_id, webhook_url, channel, team) values ($1,$2,$3,$4)
       on conflict (user_id) do update set webhook_url = excluded.webhook_url, channel = excluded.channel, team = excluded.team`,
      [sub, data.incoming_webhook.url, data.incoming_webhook.channel, data.team?.name],
    );
    back("connected");
  } catch (e) {
    console.warn("[slack] callback error:", (e as Error).message);
    back("error");
  }
});

apiRouter.use(requireAuth);

apiRouter.get("/me", async (_req, res) => {
  const { rows } = await pool.query("select id, email, name, avatar from users where id = $1", [res.locals.userId]);
  if (!rows[0]) return res.status(401).json({ error: "Unknown user" });
  res.json(rows[0]);
});

apiRouter.get("/senders", async (_req, res) => res.json(await listSenders(res.locals.userId)));

apiRouter.get("/config", (_req, res) =>
  res.json({ defaultHourlyLimit: config.worker.maxPerHourPerSender, minDelayMs: config.worker.minDelayMs }),
);

// ---------- Schedule ----------
const scheduleSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  emails: z.array(z.string().email()).min(1).max(20000),
  startTime: z.string().datetime({ offset: true }),
  delayBetweenMs: z.number().int().min(0).max(24 * 3600 * 1000),
  hourlyLimit: z.number().int().min(1).max(100000),
});

apiRouter.post("/schedule", async (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { subject, body, startTime, delayBetweenMs, hourlyLimit } = parsed.data;
  const userId: string = res.locals.userId;

  const senders = await listSenders(userId);
  if (!senders.length) return res.status(503).json({ error: "No sender accounts available (Ethereal unreachable?)" });

  const recipients = [...new Set(parsed.data.emails.map((e) => e.toLowerCase()))];
  const start = Math.max(new Date(startTime).getTime(), Date.now());
  const CHUNK = 500;

  for (let off = 0; off < recipients.length; off += CHUNK) {
    const part = recipients.slice(off, off + CHUNK);
    const items = part.map((to, i) => {
      const idx = off + i;
      return { id: randomUUID(), to, senderId: senders[idx % senders.length].id, at: start + idx * delayBetweenMs };
    });

    // 1) Persist first (source of truth), 2) enqueue delayed jobs. jobId === emailId => enqueue is idempotent.
    await pool.query(
      `insert into emails(id, user_id, sender_id, to_email, subject, body, scheduled_at, hourly_limit)
       select id, $1, sid, t, $2, $3, at, $4
         from unnest($5::uuid[], $6::int[], $7::text[], $8::timestamptz[]) as x(id, sid, t, at)`,
      [
        userId,
        subject,
        body,
        hourlyLimit,
        items.map((x) => x.id),
        items.map((x) => x.senderId),
        items.map((x) => x.to),
        items.map((x) => new Date(x.at)),
      ],
    );
    await emailQueue.addBulk(
      items.map((x) => ({
        name: "send",
        data: { emailId: x.id },
        opts: { jobId: x.id, delay: Math.max(0, x.at - Date.now()) },
      })),
    );
    await reindex(items.map((x) => x.id));
  }

  res.status(201).json({ scheduled: recipients.length, firstSendAt: new Date(start).toISOString() });
});

// ---------- List / search ----------
apiRouter.get("/emails", async (req, res) => {
  const userId: string = res.locals.userId;
  const tab = req.query.tab === "sent" ? "sent" : "scheduled";
  const statuses = tab === "sent" ? ["sent", "failed"] : ["scheduled", "sending"];
  const q = String(req.query.q ?? "").trim();

  if (q) {
    try {
      return res.json({ items: await searchEmails(userId, q, statuses) });
    } catch (e) {
      console.warn("[search] falling back to SQL:", (e as Error).message);
    }
  }
  const order = tab === "sent" ? "coalesce(e.sent_at, e.updated_at) desc" : "e.scheduled_at asc";
  const { rows } = await pool.query(
    `select e.*, s.email as sender_email
       from emails e join senders s on s.id = e.sender_id
      where e.user_id = $1 and e.status = any($2::text[])
        and ($3 = '' or e.to_email ilike '%' || $3 || '%' or e.subject ilike '%' || $3 || '%')
      order by ${order} limit 500`,
    [userId, statuses, q],
  );
  res.json({ items: rows.map(toDto) });
});

// ---------- Slack connect / status / disconnect ----------
apiRouter.get("/slack/status", async (_req, res) => {
  const { rows } = await pool.query("select channel, team from slack_connections where user_id = $1", [
    res.locals.userId,
  ]);
  res.json({ connected: !!rows[0], channel: rows[0]?.channel ?? null, team: rows[0]?.team ?? null });
});

apiRouter.get("/slack/connect", (_req, res) => {
  if (!config.slack.clientId) return res.redirect(`${config.frontendUrl}/?slack=not_configured`);
  const state = jwt.sign({ sub: res.locals.userId }, config.jwtSecret, { expiresIn: "10m" });
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", config.slack.clientId);
  url.searchParams.set("scope", "incoming-webhook");
  url.searchParams.set("redirect_uri", `${config.backendUrl}/api/slack/callback`);
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

apiRouter.delete("/slack", async (_req, res) => {
  await pool.query("delete from slack_connections where user_id = $1", [res.locals.userId]);
  res.json({ ok: true });
});
