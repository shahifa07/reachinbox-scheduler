import { useCallback, useEffect, useState } from "react";
import { Avatar } from "../components/ui/Avatar";
import { Icon } from "../components/ui/Icons";
import { useToast } from "../components/ui/Toast";
import { api } from "../lib/api";
import type { SlackStatus, User } from "../types";

const item = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-canvas";

/** User card from the design; the chevron opens account actions (Slack connect, queue monitor, logout). */
export function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [slack, setSlack] = useState<SlackStatus | null>(null);

  const loadSlack = useCallback(() => api.slackStatus().then(setSlack).catch(() => setSlack(null)), []);
  useEffect(() => { loadSlack(); }, [loadSlack]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl bg-field px-2.5 py-2 text-left"
      >
        <Avatar user={user} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{user.name}</div>
          <div className="truncate text-[10px] text-muted">{user.email}</div>
        </div>
        <Icon name="chevronDown" size={14} className="shrink-0 text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-line bg-white p-1.5 text-xs shadow-lg">
            <a href="/admin/queues" target="_blank" rel="noreferrer" className={item}>Queue monitor</a>

            {slack?.connected ? (
              <div className={`${item} justify-between`}>
                <span className="truncate">Slack {slack.channel ?? "connected"}</span>
                <button
                  className="text-rose-ink hover:underline"
                  onClick={async () => {
                    await api.slackDisconnect();
                    toast("Slack disconnected. Rate limit alerts are paused.");
                    loadSlack();
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              // Full-page navigation: the backend redirects to Slack's real OAuth authorize screen.
              <a href="/api/slack/connect" className={item}>Connect Slack</a>
            )}

            <button onClick={onLogout} className={item}>
              <Icon name="logout" size={14} /> Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
