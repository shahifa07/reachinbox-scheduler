import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/ui/Icons";
import { Spinner } from "../components/ui/Spinner";
import { useEmails } from "../hooks/useEmails";
import type { EmailItem, Tab } from "../types";
import { EmailRow } from "./EmailRow";

type Filter = "all" | "delayed" | "sent" | "failed";

const FILTERS: Record<Tab, { value: Filter; label: string }[]> = {
  scheduled: [{ value: "all", label: "All scheduled" }, { value: "delayed", label: "Rate limited" }],
  sent: [{ value: "all", label: "All" }, { value: "sent", label: "Sent" }, { value: "failed", label: "Failed" }],
};

interface Props {
  tab: Tab;
  starred: Set<string>;
  onToggleStar: (id: string) => void;
  onOpen: (e: EmailItem) => void;
}

export function EmailList({ tab, starred, onToggleStar, onOpen }: Props) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300); // debounce
    return () => clearTimeout(t);
  }, [search]);

  const { items, loading, error, refresh } = useEmails(tab, q);

  const rows = useMemo(
    () => items.filter((e) => filter === "all" || (filter === "delayed" ? !!e.note : e.status === filter)),
    [items, filter],
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Search emails</span>
          <Icon name="search" size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full bg-field py-2.5 pl-10 pr-4 text-xs placeholder:text-muted focus:bg-white"
          />
        </label>

        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            aria-label="Filter"
            aria-expanded={menu}
            className={`rounded-md p-2 hover:bg-canvas ${filter !== "all" ? "text-pine" : "text-muted"}`}
          >
            <Icon name="filter" size={15} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-line bg-white p-1.5 text-xs shadow-lg">
                {FILTERS[tab].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => { setFilter(f.value); setMenu(false); }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-canvas"
                  >
                    {f.label}
                    {filter === f.value && <Icon name="check" size={13} className="text-pine" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={refresh} aria-label="Refresh" className="rounded-md p-2 text-muted hover:bg-canvas">
          <Icon name="refresh" size={15} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-24 text-xs text-muted"><Spinner /> Loading emails...</div>
      ) : error ? (
        <div className="py-24 text-center text-xs text-rose-ink">{error}</div>
      ) : rows.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm font-semibold">{tab === "scheduled" ? "No scheduled emails" : "No sent emails yet"}</p>
          <p className="mt-1 text-xs text-muted">
            {q || filter !== "all"
              ? "Nothing matches your search or filter."
              : tab === "scheduled"
                ? "Click Compose to schedule your first send."
                : "Emails appear here once they have been sent."}
          </p>
        </div>
      ) : (
        <div>
          {rows.map((e) => (
            <EmailRow key={e.id} email={e} starred={starred.has(e.id)} onToggleStar={() => onToggleStar(e.id)} onOpen={() => onOpen(e)} />
          ))}
        </div>
      )}
    </div>
  );
}
