import { Queue } from "bullmq";
import { redis } from "./redis";

export const QUEUE_NAME = "email-queue";

export interface EmailJobData {
  emailId: string;
  slotAt?: number; // reserved send slot (ms epoch) once the job passed the min-delay gate
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { age: 24 * 3600, count: 5000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});
