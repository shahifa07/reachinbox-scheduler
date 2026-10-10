import { useMemo } from "react";
import { Avatar } from "../components/ui/Avatar";
import { Icon } from "../components/ui/Icons";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatLong } from "../lib/format";
import { sanitizeHtml } from "../lib/html";
import type { EmailItem, User } from "../types";

interface Props { email: EmailItem; user: User; starred: boolean; onToggleStar: () => void; onBack: () => void }

export function EmailDetail({ email, user, starred, onToggleStar, onBack }: Props) {
  const html = useMemo(() => sanitizeHtml(email.body), [email.body]);
  const when = email.sentAt ?? email.scheduledAt;

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center gap-3 px-6 py-4">
        <button onClick={onBack} aria-label="Back" className="rounded-md p-1 hover:bg-canvas"><Icon name="arrowLeft" size={20} /></button>
        <h1 className="flex-1 truncate text-lg font-medium">{email.subject}</h1>
        <button
          onClick={onToggleStar}
          aria-label={starred ? "Remove star" : "Star email"}
          className={starred ? "text-yellow-500" : "text-muted hover:text-ink"}
        >
          <Icon name="star" size={17} filled={starred} />
        </button>
        <Avatar user={user} size={28} />
      </header>

      <article className="mx-auto max-w-3xl px-6 pb-16 pt-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-semibold text-white">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs">
              <span className="font-semibold">{user.name}</span> <span className="text-muted">&lt;{email.senderEmail}&gt;</span>
            </div>
            <div className="text-[11px] text-muted">to {email.toEmail}</div>
          </div>
          <div className="shrink-0 text-[11px] text-muted">{formatLong(when)}</div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <StatusBadge email={email} />
          {email.note && <span className="text-peach-ink">{email.note}</span>}
          {email.error && <span className="text-rose-ink">{email.error}</span>}
          {email.previewUrl && (
            <a href={email.previewUrl} target="_blank" rel="noreferrer" className="text-pine underline">View in Ethereal</a>
          )}
        </div>

        <div className="email-body mt-8 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
