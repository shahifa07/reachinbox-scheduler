import { pool } from "../db";
import { indexEmails } from "../search";

export interface EmailDto {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  status: "scheduled" | "sending" | "sent" | "failed";
  scheduledAt: string;
  sentAt: string | null;
  senderEmail: string;
  error: string | null;
  note: string | null;
  previewUrl: string | null;
}

/** Plain text of an HTML body (used for search indexing and the text/plain email part). */
export const stripTags = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export const toDto = (r: any): EmailDto => ({
  id: r.id,
  toEmail: r.to_email,
  subject: r.subject,
  body: r.body,
  status: r.status,
  scheduledAt: new Date(r.scheduled_at).toISOString(),
  sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
  senderEmail: r.sender_email,
  error: r.error,
  note: r.note,
  previewUrl: r.preview_url,
});

/** Re-read rows from Postgres (the source of truth) and push them to Elasticsearch. */
export async function reindex(ids: string[]) {
  if (!ids.length) return;
  const { rows } = await pool.query(
    `select e.*, s.email as sender_email
       from emails e join senders s on s.id = e.sender_id
      where e.id = any($1::uuid[])`,
    [ids],
  );
  await indexEmails(rows.map((r) => ({ ...toDto(r), userId: r.user_id, bodyText: stripTags(r.body) })));
}
