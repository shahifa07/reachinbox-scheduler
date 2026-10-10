import { pool } from "../db";

/** Posts to the user's connected Slack channel. No connection => silently skipped. Never throws. */
export async function notifyRateLimit(userId: string, senderEmail: string, limit: number, resumeAt: Date) {
  try {
    const { rows } = await pool.query("select webhook_url from slack_connections where user_id = $1", [userId]);
    if (!rows[0]) return;
    const res = await fetch(rows[0].webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `:warning: *Hourly limit reached* for sender \`${senderEmail}\` (${limit}/hour). Remaining emails were rescheduled and resume at ${resumeAt.toISOString()}.`,
      }),
    });
    if (!res.ok) console.warn("[slack] webhook responded", res.status);
  } catch (e) {
    console.warn("[slack] notify failed:", (e as Error).message);
  }
}
