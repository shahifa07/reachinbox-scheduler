export interface User { id: string; email: string; name: string; avatar: string | null }

export type EmailStatus = "scheduled" | "sending" | "sent" | "failed";

export interface EmailItem {
  id: string;
  toEmail: string;
  subject: string;
  body: string; // HTML from the compose editor (older rows may be plain text)
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
  senderId?: number; // omit to rotate across all senders
}

export interface Sender { id: number; email: string }
export interface Counts { scheduled: number; sent: number }
export interface SlackStatus { connected: boolean; channel: string | null; team: string | null }
export interface AppConfig { defaultHourlyLimit: number; minDelayMs: number }
