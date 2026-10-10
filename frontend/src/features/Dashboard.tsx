import { useEffect, useState } from "react";
import { useToast } from "../components/ui/Toast";
import { useCounts } from "../hooks/useCounts";
import { useStarred } from "../hooks/useStarred";
import { api } from "../lib/api";
import type { EmailItem, Sender, Tab, User } from "../types";
import { ComposePage } from "./ComposePage";
import { EmailDetail } from "./EmailDetail";
import { EmailList } from "./EmailList";
import { Sidebar } from "./Sidebar";

type View = { name: "list" } | { name: "compose" } | { name: "email"; email: EmailItem };

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const toast = useToast();
  const [view, setView] = useState<View>({ name: "list" });
  const [tab, setTab] = useState<Tab>("scheduled");
  const [senders, setSenders] = useState<Sender[]>([]);
  const { counts, refresh: refreshCounts } = useCounts();
  const { starred, toggle } = useStarred();

  useEffect(() => { api.senders().then(setSenders).catch(() => undefined); }, []);

  // Surface the result of the Slack OAuth redirect, then clean the URL.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("slack");
    if (!p) return;
    if (p === "connected") toast("Slack connected. You will be alerted when a sender hits its hourly limit.");
    else if (p === "not_configured") toast("Slack is not configured on the server.", "error");
    else toast("Could not connect Slack. Please try again.", "error");
    window.history.replaceState({}, "", window.location.pathname);
  }, [toast]);

  const toList = () => setView({ name: "list" });

  if (view.name === "compose") {
    return (
      <ComposePage
        senders={senders}
        onBack={toList}
        onScheduled={() => { refreshCounts(); setTab("scheduled"); toList(); }}
      />
    );
  }

  if (view.name === "email") {
    return (
      <EmailDetail
        email={view.email}
        user={user}
        starred={starred.has(view.email.id)}
        onToggleStar={() => toggle(view.email.id)}
        onBack={toList}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        user={user}
        counts={counts}
        tab={tab}
        onTab={setTab}
        onCompose={() => setView({ name: "compose" })}
        onLogout={onLogout}
      />
      <main className="min-w-0 flex-1 px-4 py-4 md:px-6">
        {/* key resets search + filter when switching tabs */}
        <EmailList key={tab} tab={tab} starred={starred} onToggleStar={toggle} onOpen={(email) => setView({ name: "email", email })} />
      </main>
    </div>
  );
}
