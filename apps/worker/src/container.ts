/**
 * Composition root: builds every dependency the worker jobs need from config.
 * Implementations come from sibling packages via their fixed factory names (team brief).
 */
import { createAiRouter, createAssistantAgents } from "@rasa/ai";
import { createDb, createServices, runMigrations } from "@rasa/db";
import { createIntelPipeline } from "@rasa/intel";
import type { Config, Logger } from "@rasa/shared";
import { Api } from "grammy";
import { type DbOps, type Messengers, systemClock, type WorkerDeps } from "./deps";
import { apiMessenger } from "./messenger";

const IDENT = /^[a-z_][a-z0-9_]*$/;

/** Minimal postgres.js surface we rely on. */
interface RawSql {
  unsafe(query: string, params?: unknown[]): PromiseLike<unknown[] & { count?: number }>;
}

export function createDbOps(sql: RawSql): DbOps {
  return {
    async ping() {
      await sql.unsafe("select 1");
    },
    async deleteOlderThan(table, column, days, keyPrefixes) {
      if (!IDENT.test(table) || !IDENT.test(column))
        throw new Error(`invalid identifier ${table}.${column}`);
      const exists = await sql.unsafe(
        "select 1 from information_schema.columns where table_schema = current_schema() and table_name = $1 and column_name = $2",
        [table, column],
      );
      if (exists.length === 0) return null;
      const params: unknown[] = [`${Math.max(1, Math.floor(days))} days`];
      let where = `"${column}" < now() - $1::interval`;
      if (keyPrefixes?.length) {
        params.push(keyPrefixes.map((p) => `${p.replace(/[\\%_]/g, (c) => `\\${c}`)}%`));
        where += ` and "key" like any($2::text[])`;
      }
      const res = await sql.unsafe(`delete from "${table}" where ${where}`, params);
      return res.count ?? 0;
    },
  };
}

export function createMessengers(config: Config, logger: Logger): Messengers {
  const messengers: Messengers = {};
  if (config.TELEGRAM_BOT_TOKEN) {
    messengers.telegram = apiMessenger(
      "telegram",
      new Api(config.TELEGRAM_BOT_TOKEN, { apiRoot: config.TELEGRAM_API_ROOT }),
    );
  } else {
    logger.warn("TELEGRAM_BOT_TOKEN empty — Telegram disabled in worker");
  }
  if (config.BALE_BOT_TOKEN) {
    messengers.bale = apiMessenger(
      "bale",
      new Api(config.BALE_BOT_TOKEN, { apiRoot: config.BALE_API_ROOT }),
    );
  } else {
    logger.warn("BALE_BOT_TOKEN empty — Bale disabled in worker");
  }
  return messengers;
}

export interface Container {
  deps: WorkerDeps;
  close(): Promise<void>;
}

export async function createContainer(
  config: Config,
  logger: Logger,
  opts: { migrate?: boolean } = {},
): Promise<Container> {
  if (opts.migrate !== false) {
    logger.info("running migrations");
    await runMigrations(config.DATABASE_URL);
  }
  const handle = createDb(config.DATABASE_URL);
  const services = createServices(handle.db);
  const ai = createAiRouter(config, {
    settings: services.settings,
    logger: logger.child({ mod: "ai" }),
  });
  const agents = createAssistantAgents(ai, {
    catalog: services.catalog,
    orders: services.orders,
    entitlements: services.entitlements,
    credits: services.credits,
    tickets: services.tickets,
    logger: logger.child({ mod: "agents" }),
  });
  const intel = createIntelPipeline(config, {
    ai,
    store: services.intel,
    catalog: services.catalog,
    logger: logger.child({ mod: "intel" }),
  });

  const deps: WorkerDeps = {
    config,
    logger,
    clock: systemClock,
    services,
    ai,
    agents,
    intel,
    messengers: createMessengers(config, logger),
    db: createDbOps(handle.sql as unknown as RawSql),
  };
  return { deps, close: () => handle.close() };
}
