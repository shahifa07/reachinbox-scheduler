import { FormEvent, useState } from "react";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";

const field = "w-full rounded-lg bg-field px-3 py-3 text-xs placeholder:text-muted/80 focus:bg-white";

export function LoginPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // The design includes an email/password form, but the assignment requires Google OAuth only.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    toast("Email sign-in is not enabled. Please use Login with Google.", "error");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="w-full max-w-[330px] rounded-lg border border-line bg-white px-9 py-9">
        <h1 className="text-center text-2xl font-bold">Login</h1>

        <a
          href="/auth/google"
          className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-pine-soft px-4 py-2.5 text-xs font-medium hover:brightness-95"
        >
          <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
            <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Login with Google
        </a>

        <div className="my-4 flex items-center gap-3 text-[10px] text-muted">
          <span className="h-px flex-1 bg-line" />
          or sign up through email
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input className={field} placeholder="Email ID" type="email" aria-label="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={field} placeholder="Password" type="password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="mt-2 w-full py-2.5 text-xs">Login</Button>
        </form>
      </div>
    </main>
  );
}
