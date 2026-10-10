import { ReactNode, useEffect, useState } from "react";
import { RecipientInput } from "../components/compose/RecipientInput";
import { RichTextEditor } from "../components/compose/RichTextEditor";
import { SendLaterPopover } from "../components/compose/SendLaterPopover";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icons";
import { useToast } from "../components/ui/Toast";
import { api } from "../lib/api";
import { formatLong } from "../lib/format";
import { previewText } from "../lib/html";
import type { Sender } from "../types";

interface Props { senders: Sender[]; onBack: () => void; onScheduled: () => void }

function Row({ label, children, border = true }: { label: string; children: ReactNode; border?: boolean }) {
  return (
    <div className={`flex items-center gap-4 py-2.5 ${border ? "border-b border-line" : ""}`}>
      <span className="w-14 shrink-0 text-xs">{label}</span>
      {children}
    </div>
  );
}

const small = "w-14 rounded-md bg-field px-2 py-1.5 text-center text-xs placeholder:text-muted";

export function ComposePage({ senders, onBack, onScheduled }: Props) {
  const toast = useToast();
  const [from, setFrom] = useState("all");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [delaySec, setDelaySec] = useState(2);
  const [hourly, setHourly] = useState(200);
  const [sendAt, setSendAt] = useState(""); // empty => send now
  const [picker, setPicker] = useState(false);
  const [sending, setSending] = useState(false);

  // Defaults come from the server config so limits are never hardcoded in the UI.
  useEffect(() => {
    api.config().then((c) => { setDelaySec(c.minDelayMs / 1000); setHourly(c.defaultHourlyLimit); }).catch(() => undefined);
  }, []);

  const send = async () => {
    if (!recipients.length) return toast("Add at least one recipient or upload a list.", "error");
    if (!subject.trim()) return toast("Add a subject.", "error");
    if (!previewText(html)) return toast("Write a message before sending.", "error");
    if (!(hourly >= 1)) return toast("Hourly limit must be at least 1.", "error");
    if (!(delaySec >= 0)) return toast("Delay cannot be negative.", "error");

    setSending(true);
    try {
      const r = await api.schedule({
        subject: subject.trim(),
        body: html,
        emails: recipients,
        startTime: (sendAt ? new Date(sendAt) : new Date()).toISOString(),
        delayBetweenMs: Math.round(delaySec * 1000),
        hourlyLimit: hourly,
        senderId: from === "all" ? undefined : Number(from),
      });
      toast(`Scheduled ${r.scheduled} emails.`);
      onScheduled();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Back" className="rounded-md p-1 hover:bg-canvas"><Icon name="arrowLeft" size={20} /></button>
          <h1 className="text-lg">Compose New Email</h1>
        </div>

        <div className="relative flex items-center gap-3">
          {sendAt && <span className="text-[11px] text-muted">{formatLong(sendAt)}</span>}
          <button
            onClick={() => setPicker((p) => !p)}
            aria-label="Send later"
            aria-expanded={picker}
            className={`rounded-md p-1.5 hover:bg-canvas ${sendAt ? "text-pine" : "text-muted"}`}
          >
            <Icon name="clock" size={18} />
          </button>
          <Button variant="outline" loading={sending} onClick={send} className="px-5 py-1.5 text-xs">
            {sendAt ? "Send Later" : "Send"}
          </Button>
          {picker && <SendLaterPopover value={sendAt} onCancel={() => setPicker(false)} onDone={(v) => { setSendAt(v); setPicker(false); }} />}
        </div>
      </header>

      <div className="mx-auto max-w-[840px] px-6 pb-16 pt-2">
        <Row label="From" border={false}>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From"
            className="rounded-md bg-field px-3 py-1.5 text-xs"
          >
            <option value="all">All senders (rotate){senders.length ? ` - ${senders.length}` : ""}</option>
            {senders.map((s) => <option key={s.id} value={s.id}>{s.email}</option>)}
          </select>
        </Row>

        <Row label="To"><RecipientInput value={recipients} onChange={setRecipients} /></Row>

        <Row label="Subject">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            aria-label="Subject"
            className="flex-1 bg-transparent text-xs placeholder:text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </Row>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 text-xs">
          <label className="flex items-center gap-2">
            Delay between 2 emails
            <input type="number" min={0} step="0.5" value={delaySec} onChange={(e) => setDelaySec(Number(e.target.value))} placeholder="00" className={small} />
            <span className="text-[11px] text-muted">sec</span>
          </label>
          <label className="flex items-center gap-2">
            Hourly Limit
            <input type="number" min={1} value={hourly} onChange={(e) => setHourly(Number(e.target.value))} placeholder="00" className={small} />
            <span className="text-[11px] text-muted">per sender</span>
          </label>
        </div>

        <RichTextEditor onChange={setHtml} />
      </div>
    </div>
  );
}
