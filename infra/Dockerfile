# syntax=docker/dockerfile:1.7
#
# Multi-stage build for the Rasa Prompt monorepo. Two final targets:
#   docker build -f infra/Dockerfile --target worker -t rasa-worker .
#   docker build -f infra/Dockerfile --target bot    -t rasa-bot    .
# Build context = repository root.
#
# Apps are bundled with tsup (workspace @rasa/* packages are inlined); third-party deps stay
# external and come from a production-only, hoisted node_modules so the bundle can resolve
# transitive deps of inlined workspace packages (postgres, drizzle-orm, pino, zod, …).

ARG NODE_VERSION=22.22.0

# ─────────────────────────── base: node + pnpm ───────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# ─────────────────────────── manifests: every workspace package.json ───────────────────────────
# Copies only lockfile + manifests (preserving paths) so the install layers below stay cached until
# dependencies change, and new workspace packages are picked up without editing this file.
FROM base AS manifests
COPY . /src
RUN mkdir /manifests \
 && cd /src \
 && cp package.json pnpm-lock.yaml pnpm-workspace.yaml /manifests/ \
 && find apps packages -mindepth 2 -maxdepth 2 -name package.json -not -path "*/node_modules/*" \
      -exec cp --parents {} /manifests/ \;

# ─────────────────────────── deps: full install (cached on manifests) ───────────────────────────
FROM base AS deps
COPY --from=manifests /manifests/ ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ─────────────────────────── build: tsup bundles ───────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter @rasa/bot --filter @rasa/worker build

# ─────────────────────────── prod-deps: runtime node_modules only ───────────────────────────
FROM base AS prod-deps
COPY --from=manifests /manifests/ ./
# Production deps of bot + worker only, hoisted: the bundles inline @rasa/* packages, whose own
# deps (postgres, drizzle-orm, pino, zod, …) must then be resolvable from /app/node_modules.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts --config.shamefully-hoist=true \
      --filter "@rasa/bot..." --filter "@rasa/worker..."

# ─────────────────────────── runtime base ───────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# Drizzle migrations: @rasa/db resolves "../drizzle" relative to the bundle (dist/main.js),
# so ship them next to each app's dist folder.
COPY --from=build --chown=node:node /app/packages/db/drizzle ./apps/worker/drizzle
COPY --from=build --chown=node:node /app/packages/db/drizzle ./apps/bot/drizzle
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]

# ─────────────────────────── targets ───────────────────────────
FROM runtime AS worker
COPY --from=build --chown=node:node /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build --chown=node:node /app/apps/worker/dist ./apps/worker/dist
WORKDIR /app/apps/worker
CMD ["node", "--enable-source-maps", "dist/main.js"]

FROM runtime AS bot
COPY --from=build --chown=node:node /app/apps/bot/package.json ./apps/bot/package.json
COPY --from=build --chown=node:node /app/apps/bot/dist ./apps/bot/dist
WORKDIR /app/apps/bot
# PLATFORM=telegram|bale is set per container.
CMD ["node", "--enable-source-maps", "dist/main.js"]
