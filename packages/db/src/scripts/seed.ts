import { createDb } from "../db";
import { seed } from "../seed";

const url = process.env.DATABASE_URL ?? "postgres://rasa:rasa@localhost:5432/rasa";
const { db, close } = createDb(url, { max: 1 });
try {
  const r = await seed(db);
  console.log(`seeded ${r.categories} categories, ${r.prompts} prompts`);
} finally {
  await close();
}
