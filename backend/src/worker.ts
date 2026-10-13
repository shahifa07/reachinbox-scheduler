
import { Worker, Job, DelayedError } from "bullmq";
import nodemailer from "nodemailer";
import { config } from "./config";
import { pool } from "./db";
import { redis } from "./redis";
import { emailQueue, EmailJobData, QUEUE_NAME } from "./queue";
import { reindex, stripTags } from "./services/emails";
import { notifyRateLimit } from "./services/slack";

const RESERVE_SLOT = `
local now = tonumber(ARGV[1])
local gap = tonumber(ARGV[2])
local nxt = tonumber(redis.call('GET', KEYS[1]) or '0')
local slot = math.max(now, nxt)
redis.call('SET', KEYS[1], slot + gap, 'PX', (slot + gap - now) + 60000)
return slot
`;

const TRY_RATE = `
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
if c >= tonumber(ARGV[1]) then return 0 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 7200)
return 1
`;

const HOUR = 3600_000;

const hourKey = (ts: number) =>
  new Date(ts).toISOString().slice(0, 13);

const nextHourStart = (ts: number) =>
  (Math.floor(ts / HOUR) + 1) * HOUR;

async function defer(
  job: Job,
  token: string | undefined,
  at: number,
): Promise<never> {
  await job.moveToDelayed(at, token);
  throw new DelayedError();
}

async function processEmail(
  job: Job<EmailJobData>,
  token?: string,
) {
  const { rows } = await pool.query(
    `select e.*, s.email as sender_email, s.smtp
       from emails e
       join senders s on s.id = e.sender_id
      where e.id = $1`,
    [job.data.emailId],
  );

  const e = rows[0];

  if (!e || e.status !== "scheduled") {
    return "skipped";
  }

  const now = Date.now();

  // Gate 1: Minimum delay between sends from the same sender.
  if (!job.data.slotAt) {
    const slot = Number(
      await redis.eval(
        RESERVE_SLOT,
        1,
        `slot:${e.sender_id}`,
        now,
        config.worker.minDelayMs,
      ),
    );

    if (slot > now + 25) {
      await job.updateData({
        ...job.data,
        slotAt: slot,
      });

      await defer(job, token, slot);
    }
  } else if (job.data.slotAt > now + 25) {
    await defer(job, token, job.data.slotAt);
  }

  // Gate 2: Hourly limit per sender.
  const hk = hourKey(now);
  const rateKey = `rate:${e.sender_id}:${hk}`;

  const allowed = await redis.eval(
    TRY_RATE,
    1,
    rateKey,
    e.hourly_limit,
  );

  if (!allowed) {
    const overflowKey = `overflow:${e.sender_id}:${hk}`;
    const rank = await redis.incr(overflowKey);

    await redis.expire(overflowKey, 7200);

    const resumeAt =
      nextHourStart(now) + Math.min(rank, 60_000);

    await pool.query(
      `update emails
          set scheduled_at = $2,
              note = $3,
              updated_at = now()
        where id = $1`,
      [
        e.id,
        new Date(resumeAt),
        "Hourly limit reached - moved to next hour window",
      ],
    );

    await reindex([e.id]);

    if (
      await redis.set(
        `slack:${e.sender_id}:${hk}`,
        "1",
        "EX",
        7200,
        "NX",
      )
    ) {
      await notifyRateLimit(
        e.user_id,
        e.sender_email,
        e.hourly_limit,
        new Date(nextHourStart(now)),
      );
    }

    await job.updateData({ emailId: e.id });
    await defer(job, token, resumeAt);
  }

  const claim = await pool.query(
    `update emails
        set status = 'sending',
            updated_at = now()
      where id = $1
        and status = 'scheduled'
      returning id`,
    [e.id],
  );

  if (!claim.rowCount) {
    await redis.decr(rateKey);
    return "skipped";
  }

  try {
    // Use the Ethereal SMTP credentials stored for this sender.
    const smtp =
      typeof e.smtp === "string"
        ? JSON.parse(e.smtp)
        : e.smtp;

    if (!smtp?.host || !smtp?.user || !smtp?.pass) {
      throw new Error(
        `Missing Ethereal SMTP credentials for sender ${e.sender_email}`,
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Boolean(smtp.secure),
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    const info = await transporter.sendMail({
      from: `ReachInbox <${e.sender_email}>`,
      to: e.to_email,
      subject: e.subject,
      html: e.body,
      text: stripTags(e.body),
    });

    const previewUrl =
      nodemailer.getTestMessageUrl(info) || null;

    await pool.query(
      `update emails
          set status = 'sent',
              sent_at = now(),
              preview_url = $2,
              error = NULL,
              updated_at = now()
        where id = $1`,
      [e.id, previewUrl],
    );

    await reindex([e.id]);

    console.log(
      `[worker] Email ${e.id} sent through Ethereal: ${info.messageId}`,
    );

    if (previewUrl) {
      console.log(`[worker] Preview: ${previewUrl}`);
    }

    return "sent";
  } catch (err) {
    await pool.query(
      `update emails
          set status = 'failed',
              error = $2,
              updated_at = now()
        where id = $1`,
      [e.id, (err as Error).message],
    );

    await reindex([e.id]);

    throw err;
  }
}

/**
 * Start BullMQ worker.
 */
export function startWorker() {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAME,
    processEmail,
    {
      connection: redis,
      concurrency: config.worker.concurrency,
    },
  );

  worker.on("failed", (job, err) => {
    if (!(err instanceof DelayedError)) {
      console.error(
        `[worker] job ${job?.id} failed:`,
        err.message,
      );
    }
  });

  console.log(
    `[worker] started: concurrency=${config.worker.concurrency}, minDelay=${config.worker.minDelayMs}ms, maxPerHourPerSender=${config.worker.maxPerHourPerSender}`,
  );

  return worker;
}

export async function reconcile() {
  await pool.query(
    `update emails
        set status = 'failed',
            error = 'Worker interrupted while sending',
            updated_at = now()
      where status = 'sending'
        and updated_at < now() - interval '10 minutes'`,
  );

  const { rows } = await pool.query(
    `select id, scheduled_at
       from emails
      where status = 'scheduled'`,
  );

  const missing: {
    id: string;
    scheduled_at: Date;
  }[] = [];

  for (const r of rows) {
    if (!(await emailQueue.getJob(r.id))) {
      missing.push(r);
    }
  }

  if (missing.length) {
    await emailQueue.addBulk(
      missing.map((r) => ({
        name: "send",
        data: {
          emailId: r.id,
        },
        opts: {
          jobId: r.id,
          delay: Math.max(
            0,
            new Date(r.scheduled_at).getTime() -
              Date.now(),
          ),
        },
      })),
    );
  }

  console.log(
    `[reconcile] ${rows.length} scheduled emails in DB, re-queued ${missing.length} missing jobs`,
  );
}
