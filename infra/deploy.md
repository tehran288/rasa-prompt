# Deploying Rasa Prompt (bots + worker + Postgres)

Images: `ghcr.io/<owner>/rasa-bot` and `ghcr.io/<owner>/rasa-worker`, built by
`.github/workflows/docker.yml` on every `v*` tag (`git tag v0.3.0 && git push --tags`).
Everything else is in this folder: `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `env.example`.

## 1. Network constraints that decide the topology

| Endpoint | Reachable from Iran? | Reachable from abroad? |
|---|---|---|
| `api.telegram.org` (bot API) | **No** (filtered) | Yes |
| `tapi.bale.ai` (Bale bot API) | Yes | Usually yes, but Iranian services sometimes geo-restrict or rate-limit foreign IPs — **test from your server** (`curl -sS https://tapi.bale.ai/bot<token>/getMe`) |
| Anthropic / most AI APIs | Not usable from Iran (provider regional policy) | Yes |
| Zarinpal / Iranian gateways | Yes | Some reject foreign IPs |
| Bale webhooks → your server | Bale must reach your HTTPS endpoint | Abroad works if Bale's egress isn't restricted |

So the **Telegram bot, the worker (AI, intel scouts, Telegram channel posting) and the DB must run
outside Iran.** Only the Bale bot has a real choice.

## 2. Topology options

### Option A — everything on one server abroad (recommended start)

```
          ┌──────────────── VPS abroad (e.g. Hetzner/DO, 4 vCPU / 8 GB) ───────────────┐
Telegram ─┤ Caddy :443 → bot-telegram:8081                                             │
Bale ─────┤ Caddy :443 → bot-bale:8082        worker (pg-boss) ── Postgres 16 (volume) │
          │                                   backup → S3/R2 (nightly, encrypted)      │
          └─────────────────────────────────────────────────────────────────────────────┘
```

- **Pros:** one machine, one `docker compose up`, no tunnel, DB never leaves localhost. Worker can
  post to both channels.
- **Cons:** depends on `tapi.bale.ai` being reachable from the foreign IP and Bale delivering
  webhooks abroad. If Bale blocks it, fall back to `BOT_MODE=polling` for the Bale bot (outbound
  only), or move to option B.
- **Check before choosing:** `getMe` and `setWebhook` against Bale from the server; watch the
  `health-watch` alerts for "ربات بله" flapping in the first week.

### Option B — two regions: Bale bot on an Iranian server, same DB over WireGuard

```
  VPS abroad                                         Iranian VPS (e.g. ArvanCloud, Liara VM)
  ├─ Caddy → bot-telegram                            ├─ Caddy → bot-bale  ← Bale webhooks
  ├─ worker  (posts to Telegram AND Bale*)           └─ (no DB, no worker)
  ├─ Postgres 16  ◄──── WireGuard 10.8.0.0/24 ──────────┘  DATABASE_URL=postgres://…@10.8.0.1:5432/rasa
  └─ backup → S3
```

- **Pros:** Bale traffic stays domestic (fast, never blocked); Iranian payment callbacks can also be
  hosted there later.
- **Cons:** two servers to patch; every Bale DB query crosses the tunnel (~60–120 ms RTT → keep
  queries few per update; enable `sslmode=require` anyway); the tunnel itself can be disrupted by
  filtering (WireGuard UDP is sometimes throttled — have a fallback such as WireGuard over
  TCP/`udp2raw` or an SSH tunnel). Worker messages to Bale (`*`) are sent from abroad; if that is
  blocked, set `BALE_BOT_TOKEN` empty in the worker's env and Bale channel posts/admin alerts stop
  (Telegram admin alerts continue) — or run a second worker on the Iranian server with only Bale
  enabled (not recommended: jobs would run twice. If needed, ask for a `WORKER_PLATFORMS` switch).
- **Setup:**
  1. Abroad: `wg0` = `10.8.0.1/24`; Iran: `wg0` = `10.8.0.2/24`; `AllowedIPs` restricted to the
     peer; `PersistentKeepalive = 25` on the Iranian side.
  2. Abroad `infra/.env`: `POSTGRES_BIND=10.8.0.1` (Postgres publishes only on the tunnel) and
     firewall `ufw allow in on wg0 to any port 5432`.
  3. Create a dedicated DB role for the Bale bot (`GRANT` only the app tables — not `pgboss`).
  4. Iran: `docker compose -f infra/docker-compose.yml up -d bot-bale caddy` with
     `DATABASE_URL=postgres://bale_bot:…@10.8.0.1:5432/rasa?sslmode=require` and **no**
     `postgres`/`worker` services (`docker compose up` only the named services; remove the
     `depends_on` with an override file).
  5. Abroad: run everything except `bot-bale`.

### Option C — Bale bot in polling mode abroad

Same as A but `BOT_MODE=polling` for `bot-bale` (no inbound webhook needed). Simplest fix when
Bale won't deliver webhooks abroad but its API is reachable. Slightly higher latency.

**Decision rule:** start with A; if Bale `getMe`/webhooks fail from abroad, try C; if the API
itself is unreachable or slow, go to B.

## 3. First deployment (Option A)

```bash
# on the server (Ubuntu 24.04, Docker + compose plugin installed)
git clone https://github.com/<owner>/rasa-prompt && cd rasa-prompt
cp .env.example .env              # fill tokens, admin ids, ANTHROPIC_API_KEY, WEBHOOK_SECRET …
cp infra/env.example infra/.env   # DB password, GHCR_OWNER, IMAGE_TAG, S3 backup creds
# NOTE: in .env, remove trailing "# comments" on empty values — docker compose reads them as the value.
docker compose -f infra/docker-compose.yml --profile proxy --profile backup pull
docker compose -f infra/docker-compose.yml --profile proxy --profile backup up -d
docker compose -f infra/docker-compose.yml ps        # all "healthy"
docker compose -f infra/docker-compose.yml logs -f worker
```

DNS: `tg.bots.rasa-prompt.ir` and `bale.bots.rasa-prompt.ir` → server IP (if behind Cloudflare,
keep these records **DNS-only**; Telegram needs a valid cert on 443/80/88/8443 and Caddy needs
HTTP-01).

Upgrades: bump `IMAGE_TAG` in `infra/.env`, then `pull && up -d`. The worker migrates the DB on
boot; bots wait for the worker to be healthy. Rollback = previous tag (migrations are
forward-only — restore a backup if a migration must be undone).

## 4. Coolify

Coolify can run the same compose file:
1. New Resource → *Docker Compose* → repository, compose path `infra/docker-compose.yml`.
2. Put the app variables (contents of `.env`) and compose variables (`infra/env.example`) into
   Coolify's environment UI; mark tokens as secrets. Coolify writes them to `.env` for you.
3. Disable the `caddy` service (don't enable the `proxy` profile) — Coolify's Traefik terminates
   TLS. Assign domains `https://tg.bots…:8081` to `bot-telegram` and `https://bale.bots…:8082` to
   `bot-bale`.
4. Enable the `backup` profile or use Coolify's built-in scheduled Postgres backups to S3.
5. Deploy webhook: Coolify → Webhooks → copy the deploy URL into a GitHub secret if you want
   automatic deploys after `docker.yml` (add a `curl` step); otherwise click *Redeploy*.

## 5. Backups and restore

- `backup` service (`eeshugerman/postgres-backup-s3`): `pg_dump` at `BACKUP_SCHEDULE` (default
  daily), GPG-encrypted with `BACKUP_PASSPHRASE`, uploaded to `s3://$S3_BUCKET/$S3_PREFIX/`,
  pruned after `BACKUP_KEEP_DAYS` (30). Works with Cloudflare R2, ArvanCloud Object Storage, MinIO.
- On-demand backup: `docker compose -f infra/docker-compose.yml exec backup sh backup.sh`
- Restore latest: `docker compose -f infra/docker-compose.yml exec backup sh restore.sh`
  (or a specific one: `sh restore.sh <timestamp>`). Stop `worker`, `bot-telegram`, `bot-bale` first.
- Manual (no S3):
  ```bash
  docker compose -f infra/docker-compose.yml exec -T postgres pg_dump -U rasa -Fc rasa > rasa-$(date +%F).dump
  docker compose -f infra/docker-compose.yml exec -T postgres pg_restore -U rasa -d rasa --clean --if-exists < rasa-2026-10-08.dump
  ```
- **Test a restore monthly** into a scratch DB (`createdb rasa_restore_test`), per SOP 08.
- Keep `BACKUP_PASSPHRASE` in a password manager — backups are useless without it.

## 6. Ports and security checklist

- Only 80/443 (Caddy) and SSH are public. Postgres binds to `127.0.0.1` (or the WireGuard IP).
- Bots and worker run as non-root `node`, `tini` as PID 1, health checks on `/healthz`.
- `WEBHOOK_SECRET` set; Caddy blocks external `/healthz`.
- Secrets only in `.env` / Coolify secrets; never in the image (see `infra/Dockerfile.dockerignore`).
- Log rotation: json-file, 5 × 20 MB per container.
