import type { AppConfig, EmailItem, SchedulePayload, SlackStatus, Tab, User } from "../types";

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? res.statusText, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<User>("/api/me"),
  config: () => request<AppConfig>("/api/config"),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  emails: (tab: Tab, q: string) =>
    request<{ items: EmailItem[] }>(`/api/emails?tab=${tab}&q=${encodeURIComponent(q)}`).then((r) => r.items),
  schedule: (p: SchedulePayload) =>
    request<{ scheduled: number; firstSendAt: string }>("/api/schedule", { method: "POST", body: JSON.stringify(p) }),
  slackStatus: () => request<SlackStatus>("/api/slack/status"),
  slackDisconnect: () => request<{ ok: true }>("/api/slack", { method: "DELETE" }),
};
