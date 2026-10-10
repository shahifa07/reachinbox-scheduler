import { Button } from "../components/ui/Button";
import type { User } from "../types";
import { SlackConnect } from "./SlackConnect";

export function Header({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="text-lg font-bold">ReachInbox</span>
        <div className="flex flex-wrap items-center gap-4">
          <a href="/admin/queues" target="_blank" rel="noreferrer" className="text-sm font-medium text-muted hover:text-ink">
            Queue monitor
          </a>
          <SlackConnect />
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-9 w-9 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-soft font-semibold text-pine-dark">
                {user.name?.[0] ?? "?"}
              </div>
            )}
            <div className="leading-tight">
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-xs text-muted">{user.email}</div>
            </div>
            <Button variant="secondary" onClick={onLogout}>Log out</Button>
          </div>
        </div>
      </div>
    </header>
  );
}
