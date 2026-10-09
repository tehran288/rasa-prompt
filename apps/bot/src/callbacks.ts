/**
 * Compact callback_data scheme (Telegram/Bale limit: 64 bytes).
 * Free text (search queries, broadcast text) never goes into callback data — it lives in the session.
 *
 *   m:<screen>            menu screen (home, search, cats, trend, build, lib, acct, ref, sup, lang, plans, packs)
 *   l:<locale>            set language
 *   s:<page>              search results page (query in session.lastQuery)
 *   cs:<page>             categories list page
 *   c:<catId>:<page>      prompts in a category
 *   tr:<page>             trending page
 *   lib:<page>            my library page
 *   p:<promptId>          prompt card
 *   pf:<promptId>         full prompt body (free / entitled)
 *   w:<promptId>          start variables wizard
 *   wo:<optionIndex>      wizard: pick select option
 *   ws                    wizard: skip / use default
 *   r:<promptId>          run prompt with AI
 *   rs                    run session.runnable (filled or AI-built prompt)
 *   b:<k>:<refId>         buy; k = p (prompt) | b (bundle) | l (plan) | k (credit pack)
 *   sup:h | sup:x         support: talk to a human | end support
 *   a:<op>[:<id>]         admin: st (stats) bc (broadcast) rv (review) tk (tickets)
 *                                ap/rj <draftId>, rp/cl <ticketId>
 *   bc:s:<seg> | bc:l:<locale|all> | bc:ok | bc:x   broadcast composer
 *   noop                  page indicator
 */
import type { Locale, ProductKind } from "@rasa/shared";
import type { BroadcastSegment } from "./types";

export const MAX_CALLBACK_BYTES = 64;

export type Screen =
  | "home"
  | "search"
  | "cats"
  | "trend"
  | "build"
  | "lib"
  | "acct"
  | "ref"
  | "sup"
  | "lang"
  | "plans"
  | "packs";

const KIND_CODE: Record<ProductKind, string> = {
  prompt: "p",
  bundle: "b",
  plan: "l",
  credit_pack: "k",
};
const CODE_KIND: Record<string, ProductKind> = { p: "prompt", b: "bundle", l: "plan", k: "credit_pack" };

function check(data: string): string {
  const bytes = Buffer.byteLength(data, "utf8");
  if (bytes > MAX_CALLBACK_BYTES) {
    throw new Error(`callback_data too long (${bytes} bytes): ${data.slice(0, 20)}…`);
  }
  return data;
}

export const cb = {
  menu: (s: Screen) => check(`m:${s}`),
  lang: (l: Locale) => check(`l:${l}`),
  search: (page: number) => check(`s:${page}`),
  cats: (page: number) => check(`cs:${page}`),
  category: (id: string, page: number) => check(`c:${id}:${page}`),
  trending: (page: number) => check(`tr:${page}`),
  library: (page: number) => check(`lib:${page}`),
  prompt: (id: string) => check(`p:${id}`),
  full: (id: string) => check(`pf:${id}`),
  wizard: (id: string) => check(`w:${id}`),
  wizardOption: (i: number) => check(`wo:${i}`),
  wizardSkip: () => "ws",
  run: (id: string) => check(`r:${id}`),
  runSession: () => "rs",
  buy: (kind: ProductKind, refId: string) => check(`b:${KIND_CODE[kind]}:${refId}`),
  supportHuman: () => "sup:h",
  supportEnd: () => "sup:x",
  admin: (op: "st" | "bc" | "rv" | "tk") => `a:${op}`,
  adminApprove: (draftId: string) => check(`a:ap:${draftId}`),
  adminReject: (draftId: string) => check(`a:rj:${draftId}`),
  adminReply: (ticketId: string) => check(`a:rp:${ticketId}`),
  adminClose: (ticketId: string) => check(`a:cl:${ticketId}`),
  bcSegment: (s: BroadcastSegment) => `bc:s:${s}`,
  bcLocale: (l: Locale | "all") => `bc:l:${l}`,
  bcConfirm: () => "bc:ok",
  bcCancel: () => "bc:x",
  noop: () => "noop",
};

export function parseBuyKind(code: string): ProductKind | null {
  return CODE_KIND[code] ?? null;
}

/** True if an id can be embedded in callback_data / deep links without exceeding limits. */
export function fitsCallback(prefix: string, id: string): boolean {
  return Buffer.byteLength(prefix + id, "utf8") <= MAX_CALLBACK_BYTES;
}
