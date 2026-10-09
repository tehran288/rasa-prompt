import type { Platform } from "@rasa/shared";
import { GrammyError } from "grammy";

/**
 * What each messenger's Bot API can do. Telegram is the reference implementation;
 * Bale (tapi.bale.ai) is Telegram-compatible but lacks several features, so every
 * optional feature is gated here and degraded gracefully.
 *
 * The map is mutable at runtime: when a call fails with "method not found"
 * (404 / "not found" / "unsupported") we switch the feature off for the rest of
 * the process via {@link disableOnUnsupported}.
 */
export interface Capabilities {
  /** Inline mode (@bot query in any chat). */
  inlineMode: boolean;
  /** Telegram Stars (XTR) invoices for digital goods. */
  starsPayments: boolean;
  /** Bale wallet invoices (IRR). Also requires BALE_WALLET_PROVIDER_TOKEN. */
  walletPayments: boolean;
  /** parse_mode=HTML formatting. When false, text is sent as plain text. */
  html: boolean;
  /** setMyCommands (command menu). */
  setMyCommands: boolean;
  /** editMessageText on callback queries (otherwise a new message is sent). */
  editMessages: boolean;
  /** refundStarPayment. */
  starRefunds: boolean;
  /** X-Telegram-Bot-Api-Secret-Token header on webhooks (setWebhook secret_token). */
  webhookSecretToken: boolean;
  /** link_preview_options parameter. */
  linkPreviewOptions: boolean;
  /** https://t.me/share/url share links. */
  shareUrl: boolean;
  /** Default base for deep links, e.g. https://t.me → https://t.me/<bot>?start=<payload> */
  deepLinkBase: string;
}

const TELEGRAM: Capabilities = {
  inlineMode: true,
  starsPayments: true,
  walletPayments: false,
  html: true,
  setMyCommands: true,
  editMessages: true,
  starRefunds: true,
  webhookSecretToken: true,
  linkPreviewOptions: true,
  shareUrl: true,
  deepLinkBase: "https://t.me",
};

const BALE: Capabilities = {
  inlineMode: false,
  starsPayments: false,
  walletPayments: true,
  // Bale's HTML/entity parity with Telegram is not guaranteed → plain text is the safe default.
  html: false,
  // Feature-detected at startup; disabled automatically if Bale answers "method not found".
  setMyCommands: true,
  editMessages: true,
  starRefunds: false,
  webhookSecretToken: false,
  linkPreviewOptions: false,
  shareUrl: false,
  deepLinkBase: "https://ble.ir",
};

export function getCapabilities(
  platform: Platform,
  overrides: Partial<Capabilities> = {},
): Capabilities {
  return { ...(platform === "telegram" ? TELEGRAM : BALE), ...overrides };
}

/** True when the error means "this Bot API method/parameter does not exist on this platform". */
export function isUnsupportedError(err: unknown): boolean {
  if (err instanceof GrammyError) {
    if (err.error_code === 404 || err.error_code === 501) return true;
    return /method not found|not found|not implemented|unsupported|unknown method/i.test(
      err.description,
    );
  }
  return false;
}

/** Turns a feature off when the platform says it does not exist. Returns true if disabled. */
export function disableOnUnsupported(
  caps: Capabilities,
  feature: keyof Omit<Capabilities, "deepLinkBase">,
  err: unknown,
): boolean {
  if (isUnsupportedError(err)) {
    caps[feature] = false;
    return true;
  }
  return false;
}
