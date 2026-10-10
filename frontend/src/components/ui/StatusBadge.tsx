import type { EmailStatus } from "../../types";

const styles: Record<EmailStatus, string> = {
  scheduled: "bg-amber-soft text-amber-ink",
  sending: "bg-amber-soft text-amber-ink",
  sent: "bg-pine-soft text-pine-dark",
  failed: "bg-rose-soft text-rose-ink",
};

export function StatusBadge({ status }: { status: EmailStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>;
}
