import nodemailer from "nodemailer";
import { pool } from "../db";
import { config } from "../config";

/**
 * Ensure the user has N Ethereal (fake SMTP) sender accounts, so that
 * multi-sender, per-sender rate limiting can actually be demonstrated.
 */
export async function ensureSenders(userId: string) {
  const { rows } = await pool.query("select count(*)::int as n from senders where user_id = $1", [userId]);
  for (let i = rows[0].n; i < config.sendersPerUser; i++) {
    try {
      const acc = await nodemailer.createTestAccount();
      await pool.query("insert into senders(user_id, email, smtp) values ($1,$2,$3)", [
        userId,
        acc.user,
        { host: acc.smtp.host, port: acc.smtp.port, secure: acc.smtp.secure, user: acc.user, pass: acc.pass },
      ]);
    } catch (e) {
      console.warn("[senders] could not create Ethereal account:", (e as Error).message);
    }
  }
}

export const listSenders = async (userId: string) =>
  (await pool.query("select id, email from senders where user_id = $1 order by id", [userId])).rows;
