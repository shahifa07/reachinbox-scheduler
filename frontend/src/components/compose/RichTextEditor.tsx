import { ClipboardEvent, useRef } from "react";
import { Icon, IconName } from "../ui/Icons";

interface Props { onChange: (html: string) => void }

type Tool = { icon: IconName; cmd: string; label: string; value?: string };

// Groups are separated by dividers, matching the toolbar in the design.
const GROUPS: Tool[][] = [
  [{ icon: "undo", cmd: "undo", label: "Undo" }, { icon: "redo", cmd: "redo", label: "Redo" }],
  [
    { icon: "bold", cmd: "bold", label: "Bold" },
    { icon: "italic", cmd: "italic", label: "Italic" },
    { icon: "underline", cmd: "underline", label: "Underline" },
  ],
  [
    { icon: "alignLeft", cmd: "justifyLeft", label: "Align left" },
    { icon: "alignCenter", cmd: "justifyCenter", label: "Align center" },
  ],
  [
    { icon: "listOl", cmd: "insertOrderedList", label: "Numbered list" },
    { icon: "listUl", cmd: "insertUnorderedList", label: "Bulleted list" },
    { icon: "quote", cmd: "formatBlock", label: "Quote", value: "blockquote" },
    { icon: "strike", cmd: "strikeThrough", label: "Strikethrough" },
  ],
];

/** Small contentEditable editor. Emits HTML, which the worker sends as the email's HTML part. */
export function RichTextEditor({ onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML === "<br>") el.innerHTML = ""; // keep the placeholder working after clearing
    onChange(el.innerHTML);
  };

  const run = (cmd: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    emit();
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault(); // paste as plain text so foreign styles never leak into the email
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  };

  return (
    <div className="rounded-xl bg-[#F7F8F7] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-0.5 rounded-full bg-white px-3 py-1.5 shadow-sm" role="toolbar" aria-label="Formatting">
        <select
          aria-label="Text size"
          defaultValue=""
          onChange={(e) => { run("fontSize", e.target.value); e.target.value = ""; }}
          className="mr-1 rounded bg-transparent px-1 py-1 text-xs text-muted"
        >
          <option value="" disabled>Size</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="6">Huge</option>
        </select>

        {GROUPS.map((group, i) => (
          <div key={i} className="flex items-center gap-0.5">
            {i > 0 && <span className="mx-1.5 h-4 w-px bg-line" />}
            {group.map((t) => (
              <button
                key={t.cmd + t.label}
                type="button"
                title={t.label}
                aria-label={t.label}
                onMouseDown={(e) => { e.preventDefault(); run(t.cmd, t.value); }} // keep the text selection
                className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink"
              >
                <Icon name={t.icon} size={14} />
              </button>
            ))}
          </div>
        ))}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Message body"
        data-placeholder="Type Your Reply..."
        onInput={emit}
        onPaste={onPaste}
        className="editor min-h-[300px] text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
