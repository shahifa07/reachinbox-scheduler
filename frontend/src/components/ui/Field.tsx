import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const base =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm placeholder:text-muted/60 focus:border-pine";

function Wrap({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };
export function Input({ label, hint, className = "", ...rest }: InputProps) {
  return (
    <Wrap label={label} hint={hint}>
      <input {...rest} className={`${base} ${className}`} />
    </Wrap>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string };
export function Textarea({ label, hint, className = "", ...rest }: TextareaProps) {
  return (
    <Wrap label={label} hint={hint}>
      <textarea {...rest} className={`${base} ${className}`} />
    </Wrap>
  );
}
