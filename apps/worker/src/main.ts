/**
 * Worker entrypoint: pg-boss scheduler + consumers for every automated pipeline.
 * Also serves GET /healthz on PORT for Docker/Coolify health checks.
 */
import { createServer } from "node:http";
import { createLogger, loadConfig } from "@rasa/shared";
import { PgBoss } from "pg-boss";
import { createContainer } from "./container";
import { createHandlers } from "./handlers";
import { registerJobs } from "./schedule";

async function main() {
  const config = loadConfig();
  const logger = createLogger("worker", config.LOG_LEVEL);
  const container = await createContainer(config, logger);

  const boss = new PgBoss({ connectionString: config.DATABASE_URL, schema: "pgboss" });
  boss.on("error", (err) => logger.error({ err: { message: err.message } }, "pg-boss error"));
  await boss.start({ attempts: 5 });
  await registerJobs(boss, createHandlers(container.deps), logger);

  let ready = true;
  const server = createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: ready, service: "worker" }));
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(config.PORT, () => logger.info({ port: config.PORT }, "worker started"));

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    ready = false;
    logger.info({ signal }, "shutting down");
    const force = setTimeout(() => process.exit(1), 45_000);
    force.unref();
    try {
      await boss.stop({ graceful: true, timeout: 30_000 });
      await container.close();
      server.close();
    } catch (err) {
      logger.error({ err: { message: (err as Error).message } }, "shutdown error");
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) =>
    logger.error({ reason: String(reason) }, "unhandledRejection"),
  );
}

main().catch((err) => {
  console.error("worker failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});
