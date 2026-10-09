import postgres from "postgres";
import { createDb, createServices, runMigrations, seed } from "../src";

const ADMIN_URL =
  process.env.TEST_ADMIN_DATABASE_URL ?? "postgres://rasa:rasa@localhost:5432/postgres";

/**
 * Creates a fresh database `rasa_test_db_<suffix>` (one per test file so files can run in
 * parallel), applies migrations and seeds it.
 */
export async function setupTestDb(suffix: string, opts: { seed?: boolean } = {}) {
  const name = `rasa_test_db_${suffix}`;
  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  await runMigrations(url.toString());
  const handle = createDb(url.toString(), { max: 12 });
  if (opts.seed !== false) await seed(handle.db);
  const services = createServices(handle.db, {
    referralRewardCredits: 50,
    adminIds: { telegram: ["999"] },
  });
  return { ...handle, services, url: url.toString() };
}

let counter = 0;
export function uniqueId(prefix = "u"): string {
  counter += 1;
  return `${prefix}${Date.now()}${counter}${Math.floor(Math.random() * 1000)}`;
}
