import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { api } from "../lib/api";
import type { SlackStatus } from "../types";

export function SlackConnect() {
  const toast = useToast();
  const [status, setStatus] = useState<SlackStatus | null>(null);

  const load = useCallback(() => api.slackStatus().then(setStatus).catch(() => setStatus(null)), []);
  useEffect(() => { load(); }, [load]);

  if (!status) return null;

  if (!status.connected) {
    // Full-page navigation: the backend redirects to Slack's real OAuth authorize screen.
    return (
      <a href="/api/slack/connect" className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-canvas">
        Connect Slack
      </a>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded-full bg-pine-soft px-2.5 py-1 font-medium text-pine-dark">
        Slack {status.channel ?? "connected"}
      </span>
      <Button
        variant="ghost"
        className="px-2 py-1"
        onClick={async () => {
          await api.slackDisconnect();
          toast("Slack disconnected. Rate limit alerts are paused.");
          load();
        }}
      >
        Disconnect
      </Button>
    </div>
  );
}
