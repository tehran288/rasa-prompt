-- Runs once, on first initialisation of the data volume (docker-entrypoint-initdb.d).
-- Migrations also create extensions idempotently; this guarantees pg_trgm exists even for
-- tools that connect before the worker migrates.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
