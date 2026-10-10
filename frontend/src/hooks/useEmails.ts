import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { EmailItem, Tab } from "../types";

/** Loads one tab and quietly polls so statuses move from scheduled -> sent without a manual refresh. */
export function useEmails(tab: Tab, q: string) {
  const [items, setItems] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) setLoading(true);
      try {
        setItems(await api.emails(tab, q));
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [tab, q],
  );

  useEffect(() => {
    load(false);
    const t = setInterval(() => load(true), 5000);
    return () => clearInterval(t);
  }, [load]);

  return { items, loading, error, refresh: () => load(true) };
}
