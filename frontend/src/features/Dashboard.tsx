import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import type { Tab, User } from "../types";
import { ComposeModal } from "./ComposeModal";
import { EmailsPanel } from "./EmailsPanel";
import { Header } from "./Header";

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("scheduled");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [composing, setComposing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300); // debounce search
    return () => clearTimeout(t);
  }, [search]);

  // Surface the result of the Slack OAuth redirect, then clean the URL.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("slack");
    if (!p) return;
    if (p === "connected") toast("Slack connected. You will be alerted when a sender hits its hourly limit.");
    else if (p === "not_configured") toast("Slack is not configured on the server.", "error");
    else toast("Could not connect Slack. Please try again.", "error");
    window.history.replaceState({}, "", window.location.pathname);
  }, [toast]);

  return (
    <div className="min-h-screen">
      <Header user={user} onLogout={onLogout} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-line">
            {(["scheduled", "sent"] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold capitalize ${
                  tab === t ? "bg-pine text-white" : "text-muted hover:text-ink"
                }`}
              >
                {t} emails
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipient or subject"
              aria-label="Search emails"
              className="w-64 rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
            <Button onClick={() => setComposing(true)}>Compose new email</Button>
          </div>
        </div>

        <section className="rounded-2xl border border-line bg-white">
          <EmailsPanel key={`${tab}-${refreshKey}`} tab={tab} q={q} refreshKey={refreshKey} />
        </section>
      </main>

      {composing && <ComposeModal onClose={() => setComposing(false)} onScheduled={() => { setTab("scheduled"); setRefreshKey((k) => k + 1); }} />}
    </div>
  );
}
