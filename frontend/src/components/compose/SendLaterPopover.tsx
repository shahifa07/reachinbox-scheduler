import { useEffect, useState } from "react";
import { toLocalInputValue, tomorrowAt } from "../../lib/format";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icons";

interface Props { value: string; onDone: (v: string) => void; onCancel: () => void }

const QUICK = [
  { label: "Tomorrow", at: () => tomorrowAt(9) },
  { label: "Tomorrow, 10:00 AM", at: () => tomorrowAt(10) },
  { label: "Tomorrow, 11:00 AM", at: () => tomorrowAt(11) },
  { label: "Tomorrow, 3:00 PM", at: () => tomorrowAt(15) },
];

export function SendLaterPopover({ value, onDone, onCancel }: Props) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onCancel} />
      <div role="dialog" aria-label="Send later" className="absolute right-0 top-full z-20 mt-3 w-72 rounded-xl border border-line bg-white p-4 shadow-lg">
        <h2 className="text-sm font-semibold">Send Later</h2>

        <label className="mt-3 flex items-center gap-2 border-b border-line pb-1.5">
          <input
            type="datetime-local"
            value={draft}
            min={toLocalInputValue(new Date())}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Pick date and time"
            className="flex-1 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Icon name="calendar" size={14} className="text-muted" />
        </label>

        <ul className="mt-2">
          {QUICK.map((q) => (
            <li key={q.label}>
              <button type="button" onClick={() => setDraft(q.at())} className="w-full rounded-md px-1 py-2 text-left text-xs hover:bg-canvas">
                {q.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="text-xs font-medium">Cancel</button>
          <Button variant="outline" className="px-4 py-1 text-xs" onClick={() => onDone(draft)}>Done</Button>
        </div>
      </div>
    </>
  );
}
