/**
 * Runtime entry into @rasa/db for the website.
 *
 * We import the two factories from their source modules instead of the package index because
 * `@rasa/db`'s index also re-exports `migrate.ts`, whose top-level
 * `new URL("../drizzle", import.meta.url)` (a directory) cannot be bundled by Turbopack.
 * Contract request (see docs/engineering/web.md): expose a migration-free entry such as
 * `@rasa/db/runtime`, then switch this file to `export { createDb, createServices } from "@rasa/db/runtime"`.
 */
export { createDb } from "../../../../packages/db/src/db";
export { createServices } from "../../../../packages/db/src/services";
