export interface User { id: string; email: string; name: string; avatar: string | null }

export type EmailStatus = "scheduled" | "sending" | "sent" | "failed";

export interface EmailItem {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  senderEmail: string;
  error: string | null;
  note: string | null;
  previewUrl: string | null;
}

export type Tab = "scheduled" | "sent";

export interface SchedulePayload {
  subject: string;
  body: string;
  emails: string[];
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
}

export interface SlackStatus { connected: boolean; channel: string | null; team: string | null }
export interface AppConfig { defaultHourlyLimit: number; minDelayMs: number }
