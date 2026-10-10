import "dotenv/config";

const num = (k: string, d: number) => (process.env[k] ? Number(process.env[k]) : d);
const str = (k: string, d = "") => process.env[k] ?? d;

export const config = {
  port: num("PORT", 4000),
  backendUrl: str("BACKEND_URL", "http://localhost:4000"),
  frontendUrl: str("FRONTEND_URL", "http://localhost:5173"),
  jwtSecret: str("JWT_SECRET", "dev-secret"),
  databaseUrl: str("DATABASE_URL", "postgres://reachinbox:reachinbox@localhost:5432/reachinbox"),
  redisUrl: str("REDIS_URL", "redis://localhost:6379"),
  esUrl: str("ELASTICSEARCH_URL", "http://localhost:9200"),
  google: { clientId: str("GOOGLE_CLIENT_ID"), clientSecret: str("GOOGLE_CLIENT_SECRET") },
  slack: { clientId: str("SLACK_CLIENT_ID"), clientSecret: str("SLACK_CLIENT_SECRET") },
  startWorker: str("START_WORKER", "true") !== "false",
  sendersPerUser: num("SENDERS_PER_USER", 2),
  worker: {
    concurrency: num("WORKER_CONCURRENCY", 5),
    minDelayMs: num("MIN_DELAY_MS", 2000),
    maxPerHourPerSender: num("MAX_EMAILS_PER_HOUR_PER_SENDER", 200),
  },
};
