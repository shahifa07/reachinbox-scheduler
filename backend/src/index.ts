import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import { config } from "./config";
import { initDb } from "./db";
import { emailQueue } from "./queue";
import { apiRouter } from "./routes/api";
import { authRouter } from "./routes/auth";
import { initSearch } from "./search";
import { reconcile, startWorker } from "./worker";

async function main() {
  await initDb();
  await initSearch();

  const app = express();
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(passport.initialize());

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/auth", authRouter);
  app.use("/api", apiRouter);

  // Live BullMQ dashboard (queue counts, delayed/waiting/failed jobs, job data).
  const board = new ExpressAdapter();
  board.setBasePath("/admin/queues");
  createBullBoard({ queues: [new BullMQAdapter(emailQueue) as any], serverAdapter: board });
  app.use("/admin/queues", board.getRouter());

  app.listen(config.port, () => console.log(`[api] listening on :${config.port}`));

  await reconcile();
  if (config.startWorker) {
    const worker = startWorker();
    const shutdown = async () => {
      await worker.close(); // lets in-flight jobs finish; delayed jobs stay safe in Redis
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
