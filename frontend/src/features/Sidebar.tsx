import { Icon, IconName } from "../components/ui/Icons";
import type { Counts, Tab, User } from "../types";
import { UserMenu } from "./UserMenu";

interface Props {
  user: User;
  counts: Counts;
  tab: Tab;
  onTab: (t: Tab) => void;
  onCompose: () => void;
  onLogout: () => void;
}

const NAV: { tab: Tab; label: string; icon: IconName }[] = [
  { tab: "scheduled", label: "Scheduled", icon: "clock" },
  { tab: "sent", label: "Sent", icon: "send" },
];

export function Sidebar({ user, counts, tab, onTab, onCompose, onLogout }: Props) {
  return (
    <aside className="w-full shrink-0 space-y-3 p-4 md:w-60">
      <div className="font-pixel text-4xl font-bold leading-none tracking-tight">ONB</div>
      <UserMenu user={user} onLogout={onLogout} />
      <button
        onClick={onCompose}
        className="w-full rounded-full border border-pine py-1.5 text-xs font-medium text-pine hover:bg-pine-soft"
      >
        Compose
      </button>

      <nav aria-label="Mailbox" className="pt-2">
        <div className="mb-1 px-2 text-[10px] uppercase tracking-wide text-muted">Core</div>
        {NAV.map((n) => (
          <button
            key={n.tab}
            onClick={() => onTab(n.tab)}
            aria-current={tab === n.tab ? "page" : undefined}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${
              tab === n.tab ? "bg-pine-soft font-semibold" : "hover:bg-canvas"
            }`}
          >
            <Icon name={n.icon} size={14} className="text-ink/70" />
            <span className="flex-1 text-left">{n.label}</span>
            <span className="text-[11px] font-normal text-muted">{counts[n.tab]}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
