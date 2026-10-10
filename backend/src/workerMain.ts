// Standalone worker process: `npm run worker`. Run several to demonstrate multi-instance safety.
import { initDb } from "./db";
import { initSearch } from "./search";
import { startWorker } from "./worker";

(async () => {
  await initDb();
  await initSearch();
  const worker = startWorker();
  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();
