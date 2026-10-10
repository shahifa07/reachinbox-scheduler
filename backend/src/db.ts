import { Pool } from "pg";
import { config } from "./config";

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function initDb() {
  await pool.query(`
    create table if not exists users (
      id text primary key,
      email text not null,
      name text,
      avatar text,
      created_at timestamptz not null default now()
    );
    create table if not exists senders (
      id serial primary key,
      user_id text not null references users(id) on delete cascade,
      email text not null,
      smtp jsonb not null,
      created_at timestamptz not null default now()
    );
    create table if not exists emails (
      id uuid primary key,
      user_id text not null references users(id) on delete cascade,
      sender_id int not null references senders(id),
      to_email text not null,
      subject text not null,
      body text not null,
      status text not null default 'scheduled',
      scheduled_at timestamptz not null,
      sent_at timestamptz,
      hourly_limit int not null,
      error text,
      note text,
      preview_url text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists emails_user_status_idx on emails(user_id, status, scheduled_at);
    create table if not exists slack_connections (
      user_id text primary key references users(id) on delete cascade,
      webhook_url text not null,
      channel text,
      team text,
      created_at timestamptz not null default now()
    );
  `);
}
