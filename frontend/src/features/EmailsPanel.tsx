import { Column, DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useEmails } from "../hooks/useEmails";
import { formatDateTime } from "../lib/format";
import type { EmailItem, Tab } from "../types";

const subjectCol: Column<EmailItem> = {
  header: "Subject",
  className: "max-w-xs truncate",
  render: (r) => r.subject,
};

const columns: Record<Tab, Column<EmailItem>[]> = {
  scheduled: [
    { header: "Email", render: (r) => <span className="font-medium">{r.toEmail}</span> },
    subjectCol,
    {
      header: "Scheduled time",
      render: (r) => (
        <div>
          {formatDateTime(r.scheduledAt)}
          {r.note && <div className="text-xs text-amber-ink">{r.note}</div>}
        </div>
      ),
    },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ],
  sent: [
    { header: "Email", render: (r) => <span className="font-medium">{r.toEmail}</span> },
    subjectCol,
    { header: "Sent time", render: (r) => formatDateTime(r.sentAt) },
    {
      header: "Status",
      render: (r) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={r.status} />
          {r.previewUrl && (
            <a href={r.previewUrl} target="_blank" rel="noreferrer" className="text-xs text-pine underline">preview</a>
          )}
          {r.error && <span className="text-xs text-rose-ink">{r.error}</span>}
        </div>
      ),
    },
  ],
};

export function EmailsPanel({ tab, q, refreshKey }: { tab: Tab; q: string; refreshKey: number }) {
  const { items, loading, error } = useEmails(tab, q);
  void refreshKey; // changing the key remounts this panel (see Dashboard) to refetch right after scheduling
  return (
    <DataTable
      columns={columns[tab]}
      rows={items}
      rowKey={(r) => r.id}
      loading={loading}
      error={error}
      emptyTitle={tab === "scheduled" ? "No scheduled emails" : "No sent emails yet"}
      emptyHint={
        q
          ? "Nothing matches that search."
          : tab === "scheduled"
            ? "Compose a new email to schedule your first send."
            : "Emails appear here once they have been sent."
      }
    />
  );
}
