import { ClipboardEvent, KeyboardEvent, useRef, useState } from "react";
import { parseEmails } from "../../lib/parseEmails";
import { Icon } from "../ui/Icons";
import { useToast } from "../ui/Toast";

interface Props { value: string[]; onChange: (v: string[]) => void }

const MAX_VISIBLE = 3;

/** "To" field: chips for typed/pasted addresses, "+N" overflow chip, and the Upload List action. */
export function RecipientInput({ value, onChange }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const merge = (found: string[]) => onChange([...new Set([...value, ...found])]);

  const commit = () => {
    const found = parseEmails(text);
    if (found.length) { merge(found); setText(""); }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", ";"].includes(e.key) && text.trim()) {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const found = parseEmails(e.clipboardData.getData("text"));
    if (found.length) { e.preventDefault(); merge(found); }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    const found = parseEmails(await file.text());
    if (fileRef.current) fileRef.current.value = "";
    if (!found.length) return toast("No email addresses found in that file.", "error");
    merge(found);
    toast(`${found.length} email addresses detected in ${file.name}.`);
  };

  const collapsed = !focused && !expanded && value.length > MAX_VISIBLE;
  const shown = collapsed ? value.slice(0, MAX_VISIBLE) : value;
  const chip = "inline-flex items-center gap-1 rounded-full border border-pine/50 bg-pine-soft px-2 py-0.5 text-[11px]";

  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {shown.map((email) => (
          <span key={email} className={chip}>
            {email}
            <button type="button" aria-label={`Remove ${email}`} onClick={() => onChange(value.filter((v) => v !== email))} className="text-muted hover:text-ink">×</button>
          </span>
        ))}
        {collapsed && (
          <button type="button" onClick={() => setExpanded(true)} className={`${chip} font-medium`}>+{value.length - MAX_VISIBLE}</button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); commit(); }}
          placeholder={value.length ? "" : "recipient@example.com"}
          aria-label="Recipients"
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-xs placeholder:text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {value.length > 0 && <span className="text-[11px] text-muted">{value.length} email addresses detected</span>}
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium text-pine hover:underline">
          <Icon name="upload" size={14} /> Upload List
        </button>
      </div>
    </div>
  );
}
