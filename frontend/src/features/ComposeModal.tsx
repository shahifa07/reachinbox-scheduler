import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input, Textarea } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import { api } from "../lib/api";
import { toLocalInputValue } from "../lib/format";
import { parseEmails } from "../lib/parseEmails";

interface Props { onClose: () => void; onScheduled: () => void }

export function ComposeModal({ onClose, onScheduled }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leads, setLeads] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [start, setStart] = useState(toLocalInputValue(new Date(Date.now() + 60_000)));
  const [delaySec, setDelaySec] = useState(2);
  const [hourly, setHourly] = useState(200);
  const [submitting, setSubmitting] = useState(false);

  // Defaults come from the server config so the UI never hardcodes limits.
  useEffect(() => {
    api.config().then((c) => { setDelaySec(c.minDelayMs / 1000); setHourly(c.defaultHourlyLimit); }).catch(() => undefined);
  }, []);

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setLeads(parseEmails(await file.text()));
  };

  const submit = async () => {
    if (!subject.trim() || !body.trim()) return toast("Add a subject and a body.", "error");
    if (!leads.length) return toast("Upload a CSV or text file that contains email addresses.", "error");
    if (!start) return toast("Choose a start time.", "error");
    setSubmitting(true);
    try {
      const r = await api.schedule({
        subject, body, emails: leads,
        startTime: new Date(start).toISOString(),
        delayBetweenMs: Math.round(delaySec * 1000),
        hourlyLimit: hourly,
      });
      toast(`Scheduled ${r.scheduled} emails.`);
      onScheduled();
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Compose new email" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Quick question about your onboarding" />
        <Textarea label="Body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi there..." />

        <div>
          <span className="mb-1 block text-sm font-medium">Leads</span>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-3">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Upload CSV or text file</Button>
            <span className="text-sm text-muted">
              {fileName ? (
                <>
                  {fileName}: <strong className="text-ink">{leads.length}</strong> email addresses detected
                </>
              ) : (
                "No file chosen"
              )}
            </span>
          </div>
        </div>

        <Input label="Start time" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Delay between emails (seconds)" type="number" min={0} step="0.5" value={delaySec} onChange={(e) => setDelaySec(Number(e.target.value))} />
          <Input label="Hourly limit per sender" type="number" min={1} value={hourly} onChange={(e) => setHourly(Number(e.target.value))} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={submitting} onClick={submit}>Schedule</Button>
        </div>
      </div>
    </Modal>
  );
}
