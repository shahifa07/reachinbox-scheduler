import { useCallback, useState } from "react";

const KEY = "starred-emails";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

/** Stars are a per-browser convenience, persisted in localStorage. */
export function useStarred() {
  const [starred, setStarred] = useState<Set<string>>(() => new Set(read()));

  const toggle = useCallback((id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { starred, toggle };
}
