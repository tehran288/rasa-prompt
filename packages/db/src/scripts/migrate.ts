import { runMigrations } from "../migrate";

const url = process.env.DATABASE_URL ?? "postgres://rasa:rasa@localhost:5432/rasa";
await runMigrations(url);
console.log("migrations applied");
