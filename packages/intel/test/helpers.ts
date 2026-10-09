import {
  type AiProvider,
  type AiRouter,
  type AiTask,
  type CatalogService,
  type Category,
  type Config,
  type IntelStore,
  loadConfig,
  type PromptDraft,
  type TrendSignal,
  type TrendTopic,
} from "@rasa/shared";
import type { IntelLogger } from "../src/types";

// ───────────── logger ─────────────
export function silentLogger(): IntelLogger & { lines: { level: string; msg?: string }[] } {
  const lines: { level: string; msg?: string }[] = [];
  const mk = (level: string) => (_obj: object, msg?: string) => {
    lines.push({ level, ...(msg ? { msg } : {}) });
  };
  return { lines, debug: mk("debug"), info: mk("info"), warn: mk("warn"), error: mk("error") };
}

export function testConfig(env: Record<string, string> = {}): Config {
  return loadConfig({ NODE_ENV: "test", ...env });
}

// ───────────── fetch ─────────────
export type Route = {
  match: (url: string, init?: RequestInit) => boolean;
  reply: (url: string, init?: RequestInit) => Response | Promise<Response>;
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function text(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers });
}

/** Fake fetch: first matching route wins; unmatched URLs return 404 (e.g. robots.txt). */
export function fakeFetch(routes: Route[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, ...(init ? { init } : {}) });
    const r = routes.find((x) => x.match(url, init));
    return r ? r.reply(url, init) : text("not found", 404);
  }) as typeof fetch;
  return { fetch: fn, calls };
}

export const has =
  (...parts: string[]) =>
  (url: string) =>
    parts.every((p) => url.includes(p));

// ───────────── AI ─────────────
type CompleteReq = Parameters<AiProvider["complete"]>[0];
export type AiHandler = (
  req: CompleteReq,
) => unknown | { text: string; citations?: { url: string; title: string }[] };

export function fakeAi(handlers: Partial<Record<AiTask, AiHandler>>) {
  const calls: CompleteReq[] = [];
  let spent = 0;
  const run = async (req: CompleteReq) => {
    calls.push(req);
    spent += 0.01;
    const h = handlers[req.task];
    if (!h) throw new Error(`fakeAi: no handler for ${req.task}`);
    return h(req);
  };
  const ai: AiRouter = {
    async complete(req) {
      const out = await run(req);
      const isText = typeof out === "object" && out !== null && "text" in out;
      const t = isText
        ? (out as { text: string }).text
        : typeof out === "string"
          ? out
          : JSON.stringify(out);
      const citations = isText
        ? (out as { citations?: { url: string; title: string }[] }).citations
        : undefined;
      return {
        text: t,
        provider: "fake",
        model: "fake-1",
        inputTokens: 10,
        outputTokens: 10,
        costUsd: 0.01,
        ...(citations ? { citations } : {}),
      };
    },
    async json(req) {
      const out = await run(req);
      return req.parse(typeof out === "string" ? JSON.parse(out) : out);
    },
    async spentTodayUsd() {
      return Math.round(spent * 1000) / 1000;
    },
  };
  return { ai, calls };
}

// ───────────── store ─────────────
export class MemoryIntelStore implements IntelStore {
  signals: (TrendSignal & { id: string })[] = [];
  topics: TrendTopic[] = [];
  drafts: { id: string; draft: PromptDraft; state: string; promptId?: string; createdAt: Date }[] =
    [];
  private seq = 0;

  async saveSignals(signals: TrendSignal[]): Promise<number> {
    let n = 0;
    for (const s of signals) {
      if (this.signals.some((x) => x.source === s.source && x.externalId === s.externalId))
        continue;
      this.signals.push({ ...s, id: `s${++this.seq}` });
      n++;
    }
    return n;
  }
  async recentSignals(sinceHours: number, limit: number) {
    const cutoff = Date.now() - sinceHours * 3600_000;
    return this.signals.filter((s) => s.observedAt.getTime() >= cutoff).slice(0, limit);
  }
  async upsertTopic(
    topic: Omit<TrendTopic, "id" | "firstSeenAt" | "updatedAt"> & { id?: string },
  ): Promise<TrendTopic> {
    const idx = this.topics.findIndex((t) => t.key === topic.key || t.id === topic.id);
    const now = new Date();
    if (idx >= 0) {
      const prev = this.topics[idx] as TrendTopic;
      const next = { ...prev, ...topic, id: prev.id, updatedAt: now };
      this.topics[idx] = next;
      return next;
    }
    const created: TrendTopic = {
      ...topic,
      id: `t${++this.seq}`,
      firstSeenAt: now,
      updatedAt: now,
    };
    this.topics.push(created);
    return created;
  }
  async topTopics(status: TrendTopic["status"], limit: number) {
    return this.topics
      .filter((t) => t.status === status)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);
  }
  async setTopicStatus(id: string, status: TrendTopic["status"]) {
    const t = this.topics.find((x) => x.id === id);
    if (t) t.status = status;
  }
  async saveDraft(
    draft: PromptDraft,
    state: "review" | "published" | "rejected",
    promptId?: string,
  ) {
    const id = `d${++this.seq}`;
    this.drafts.push({
      id,
      draft,
      state,
      ...(promptId ? { promptId } : {}),
      createdAt: new Date(),
    });
    return id;
  }
  async reviewQueue(limit: number) {
    return this.drafts.filter((d) => d.state === "review").slice(0, limit);
  }
  async resolveDraft(id: string, decision: "approve" | "reject") {
    const d = this.drafts.find((x) => x.id === id);
    if (!d) return null;
    d.state = decision === "approve" ? "published" : "rejected";
    return d.draft;
  }
}

// ───────────── catalog ─────────────
export function fakeCatalog(opts: { gap?: number; failCreate?: boolean } = {}) {
  const created: { draft: PromptDraft; publish: boolean }[] = [];
  const gapCalls: { keywords: string[]; locale: string }[] = [];
  const categories: Category[] = [
    { id: "c1", slug: "marketing", name: "بازاریابی", emoji: null, promptCount: 3 },
    { id: "c2", slug: "image", name: "تصویر", emoji: null, promptCount: 5 },
  ];
  const notImpl = () => {
    throw new Error("not implemented in fake");
  };
  const catalog: CatalogService = {
    listCategories: async () => categories,
    search: notImpl,
    listByCategory: notImpl,
    listTrending: notImpl,
    getPrompt: notImpl,
    getPromptBody: notImpl,
    promptOfTheDay: notImpl,
    async createFromDraft(draft, publish) {
      if (opts.failCreate) throw new Error("db down");
      created.push({ draft, publish });
      return `p${created.length}`;
    },
    async coverageGap(keywords, locale) {
      gapCalls.push({ keywords, locale });
      return opts.gap ?? 80;
    },
  };
  return { catalog, created, gapCalls };
}

// ───────────── fixtures ─────────────
export const FA_BODY = `## نقش
تو یک متخصص ارشد عکاسی محصول و طراحی بصری برای فروشگاه‌های اینستاگرامی هستی.

## زمینه
فروشگاه {{shop_name}} محصول {{product}} را برای مخاطبان {{audience}} می‌فروشد و به تصاویر حرفه‌ای نیاز دارد.

## وظیفه
سه پرامپت تصویری متفاوت برای ابزار تولید تصویر بنویس که هر کدام یک سبک نورپردازی و صحنه‌آرایی متمایز داشته باشد.

## قیود
- هر پرامپت حداکثر ۶۰ کلمه باشد.
- از متن، لوگو و واترمارک در تصویر استفاده نشود.
- لحن بصری با {{style}} هماهنگ باشد.

## قالب خروجی
یک جدول با ستون‌های «سبک»، «پرامپت»، «نسبت تصویر».

## مثال
| سبک | پرامپت | نسبت |
| مینیمال | ... | 4:5 |

## معیار توقف
وقتی سه ردیف کامل نوشتی متوقف شو؛ اگر ورودی‌ای خالی بود، اول سؤال کن.`;

export function engineeredFixture(overrides: Record<string, unknown> = {}) {
  return {
    title: "پرامپت عکاسی محصول برای فروشگاه اینستاگرامی",
    summary: "سه پرامپت تصویری حرفه‌ای برای عکس محصول فروشگاه آنلاین شما.",
    description:
      "برای فروشندگان اینستاگرام که بدون عکاس، عکس محصول حرفه‌ای می‌خواهند. خروجی: سه پرامپت آماده برای Midjourney و Flux.",
    body: FA_BODY,
    variables: [
      { name: "shop_name", label: "نام فروشگاه", type: "text", required: true },
      { name: "product", label: "محصول", type: "text", required: true },
      { name: "audience", label: "مخاطب", type: "text", required: true },
      {
        name: "style",
        label: "سبک",
        type: "select",
        options: ["مینیمال", "لوکس", "شاد"],
        required: false,
      },
    ],
    outputType: "image",
    models: ["Midjourney", "Flux"],
    categorySlugs: ["image"],
    tier: "pro",
    exampleOutput: null,
    sampleInputs: [
      {
        values: [
          { name: "shop_name", value: "گلستان" },
          { name: "product", value: "شمع معطر" },
          { name: "audience", value: "زنان ۲۵ تا ۴۰ ساله تهرانی" },
          { name: "style", value: "مینیمال" },
        ],
      },
      {
        values: [
          { name: "shop_name", value: "چرم‌دوز" },
          { name: "product", value: "کیف چرمی دست‌دوز" },
          { name: "audience", value: "مردان شاغل" },
        ],
      },
    ],
    ...overrides,
  };
}

export function topicFixture(over: Partial<TrendTopic> = {}): TrendTopic {
  return {
    id: "t-1",
    key: "instagram-product-photo-prompts",
    title: { fa: "عکس محصول اینستاگرام", ar: "صور المنتجات", en: "Instagram product photos" },
    summary: "Shops want pro product photos without a photographer.",
    outputType: "image",
    models: ["Midjourney", "Flux"],
    regions: ["IR"],
    scores: { velocity: 80, volume: 70, commercialIntent: 85, gap: 80, fit: 90 },
    trendScore: 80.5,
    signalIds: [],
    status: "new",
    firstSeenAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

export function draftFixture(over: Partial<PromptDraft> = {}): PromptDraft {
  return {
    topicId: "t-1",
    sourceLocale: "fa",
    title: { fa: "عنوان", ar: "عنوان", en: "Title" },
    summary: { fa: "خلاصه" },
    description: { fa: "توضیح" },
    body: { fa: FA_BODY },
    variables: [],
    outputType: "image",
    models: ["Midjourney"],
    categorySlugs: ["image"],
    tier: "pro",
    suggestedPriceToman: 79_000,
    suggestedPriceStars: 90,
    research: [],
    exampleOutput: null,
    judge: { score: 88, passed: true, notes: "" },
    compliance: { originality: 97, licenseOk: true, policyOk: true, notes: "" },
    ...over,
  };
}

export const noSleep = async () => {};
