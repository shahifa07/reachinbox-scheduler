import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Counts } from "../types";

export function useCounts() {
  const [counts, setCounts] = useState<Counts>({ scheduled: 0, sent: 0 });
  const refresh = useCallback(() => api.counts().then(setCounts).catch(() => undefined), []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  return { counts, refresh };
}
