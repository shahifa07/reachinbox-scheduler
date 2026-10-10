import { formatBadge } from "../../lib/format";
import type { EmailItem } from "../../types";
import { Icon } from "./Icons";

const base = "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium";

/** Scheduled -> orange pill with the send time; sent -> grey pill; failed -> red pill. */
export function StatusBadge({ email }: { email: EmailItem }) {
  if (email.status === "scheduled" || email.status === "sending") {
    return (
      <span title={email.note ?? undefined} className={`${base} bg-peach text-peach-ink`}>
        <Icon name="clock" size={11} />
        {email.status === "sending" ? "Sending" : formatBadge(email.scheduledAt)}
      </span>
    );
  }
  if (email.status === "failed") {
    return <span title={email.error ?? undefined} className={`${base} bg-rose-soft text-rose-ink`}>Failed</span>;
  }
  return <span className={`${base} bg-canvas text-ink/70`}>Sent</span>;
}
