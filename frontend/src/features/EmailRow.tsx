import { Icon } from "../components/ui/Icons";
import { StatusBadge } from "../components/ui/StatusBadge";
import { previewText } from "../lib/html";
import type { EmailItem } from "../types";

interface Props { email: EmailItem; starred: boolean; onToggleStar: () => void; onOpen: () => void }

export function EmailRow({ email, starred, onToggleStar, onOpen }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="flex cursor-pointer items-center gap-4 border-b border-line px-3 py-3 text-xs hover:bg-canvas/60"
    >
      <div className="w-36 shrink-0 truncate md:w-44">To: {email.toEmail}</div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <StatusBadge email={email} />
        {email.status === "scheduled" && email.note && (
          <span title={email.note} className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[10px] text-muted">Rate limited</span>
        )}
        <span className="truncate">
          <span className="font-medium">{email.subject}</span>
          <span className="text-muted"> - {previewText(email.body)}</span>
        </span>
      </div>

      <button
        aria-label={starred ? "Remove star" : "Star email"}
        onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
        className={starred ? "text-yellow-500" : "text-muted/50 hover:text-muted"}
      >
        <Icon name="star" size={15} filled={starred} />
      </button>
    </div>
  );
}
