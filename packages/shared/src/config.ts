import { z } from "zod";

const csvIds = z
  .string()
  .default("")
  .transform((s) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  );

/**
 * Single source of truth for runtime configuration. Every app calls loadConfig() once.
 * See .env.example for documentation of each variable.
 */
export const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  DATABASE_URL: z.string().default("postgres://rasa:rasa@localhost:5432/rasa"),

  PLATFORM: z.enum(["telegram", "bale"]).default("telegram"),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  BALE_BOT_TOKEN: z.string().default(""),
  TELEGRAM_API_ROOT: z.string().default("https://api.telegram.org"),
  BALE_API_ROOT: z.string().default("https://tapi.bale.ai"),
  /** "polling" for dev; "webhook" in production */
  BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
  WEBHOOK_PUBLIC_URL: z.string().default(""),
  WEBHOOK_SECRET: z.string().default(""),
  PORT: z.coerce.number().default(8080),

  TELEGRAM_ADMIN_IDS: csvIds,
  BALE_ADMIN_IDS: csvIds,
  /** Chat ids that receive reports/alerts/review queue, per platform */
  TELEGRAM_ADMIN_CHAT_ID: z.string().default(""),
  BALE_ADMIN_CHAT_ID: z.string().default(""),
  TELEGRAM_CHANNEL_ID: z.string().default(""),
  BALE_CHANNEL_ID: z.string().default(""),

  BALE_WALLET_PROVIDER_TOKEN: z.string().default(""),
  WEB_BASE_URL: z.string().default("https://rasa-prompt.ir"),

  ANTHROPIC_API_KEY: z.string().default(""),
  /** Optional OpenAI-compatible endpoint (self-hosted open models, or a provider allowed for your users) */
  OPENAI_COMPAT_BASE_URL: z.string().default(""),
  OPENAI_COMPAT_API_KEY: z.string().default(""),
  OPENAI_COMPAT_MODEL: z.string().default(""),
  /** JSON map AiTask -> "provider:model", e.g. {"concierge":"anthropic:claude-haiku-5-5"} */
  AI_ROUTES: z.string().default(""),
  AI_DAILY_BUDGET_USD: z.coerce.number().default(10),

  /** Trend-intelligence sources (all optional; scouts without keys are skipped) */
  REDDIT_CLIENT_ID: z.string().default(""),
  REDDIT_CLIENT_SECRET: z.string().default(""),
  GITHUB_TOKEN: z.string().default(""),
  YOUTUBE_API_KEY: z.string().default(""),
  PRODUCTHUNT_TOKEN: z.string().default(""),
  SERPAPI_KEY: z.string().default(""), // Google Trends via SerpApi
  INTEL_DAILY_DRAFTS: z.coerce.number().default(10),
  INTEL_AUTO_PUBLISH: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  FREE_AI_BUILDS_PER_DAY: z.coerce.number().default(3),
  REFERRAL_REWARD_CREDITS: z.coerce.number().default(50),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  return ConfigSchema.parse(env);
}
