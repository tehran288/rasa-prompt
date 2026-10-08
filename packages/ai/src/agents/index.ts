import {
  type AiMessage,
  type AiRouter,
  type AiTextResult,
  type AssistantAgents,
  type CatalogService,
  type ConciergeResult,
  type CreditService,
  type DailyStats,
  type EntitlementService,
  LOCALES,
  type Locale,
  type Order,
  type OrderService,
  type Platform,
  type PromptDetail,
  type TicketService,
} from "@rasa/shared";
import { z } from "zod";
import { zodJson } from "../json";
import { type AiLogger, AiRefusalError, isToolCapable, type ToolDef } from "../types";
import { FAQ_TOPICS, type FaqTopic, faqText } from "./faq";
import { extractVariables, sanitizeTelegramHtml, toPlainText } from "./format";
import {
  buildPromptSystem,
  channelPostSystem,
  conciergeSystem,
  dailyReportSystem,
  moderationSystem,
  runPromptSystem,
  supportSystem,
} from "./prompts";

/** Optional extension the db package may implement; used by `get_my_orders` when present. */
export type OrderServiceWithHistory = OrderService & {
  listForUser?(userId: string, limit: number): Promise<Order[]>;
};

export interface AssistantAgentDeps {
  catalog: CatalogService;
  orders: OrderServiceWithHistory;
  entitlements: EntitlementService;
  credits: CreditService;
  tickets: TicketService;
  logger: AiLogger;
}

// ───────────────────────────── schemas ─────────────────────────────
const INTENTS = [
  "search",
  "build_prompt",
  "support",
  "buy",
  "account",
  "smalltalk",
  "unsafe",
  "other",
] as const;

const ConciergeSchema = z.object({
  intent: z.enum(INTENTS),
  query: z.string().nullable(),
  locale: z.enum(LOCALES),
  reply: z.string().nullable(),
});

const BuildPromptSchema = z.object({
  title: z.string(),
  prompt: z.string(),
  variables: z.array(z.string()),
  tips: z.array(z.string()),
  refused: z.boolean(),
});

export const MODERATION_CATEGORIES = [
  "sexual_minors",
  "sexual",
  "violence",
  "weapons",
  "self_harm",
  "hate",
  "harassment",
  "illegal_drugs",
  "malware_hacking",
  "fraud_scam",
  "privacy",
  "extremism",
  "disinformation",
  "jailbreak",
  "other",
] as const;

const ModerationSchema = z.object({
  allowed: z.boolean(),
  category: z.enum(MODERATION_CATEGORIES).nullable(),
});

const SupportFallbackSchema = z.object({
  answer: z.string(),
  escalate: z.boolean(),
  reason: z.string().nullable(),
});

// ───────────────────────────── localized fallbacks ─────────────────────────────
const UNSAFE_REPLY: Record<Locale, string> = {
  fa: "متأسفم، در این مورد نمی‌توانم کمکی کنم. اگر دنبال پرامپت برای کار، آموزش یا تولید محتوا هستید، با کمال میل راهنمایی‌تان می‌کنم 🌱",
  ar: "عذرًا، لا يمكنني المساعدة في هذا الطلب. إن كنت تبحث عن برومبت للعمل أو التعلّم أو صناعة المحتوى فيسعدني مساعدتك 🌱",
  en: "Sorry, I can't help with that. If you're looking for a prompt for work, learning or content creation, I'd be glad to help 🌱",
};

const HANDOFF: Record<Locale, string> = {
  fa: "پیامتان را برای همکاران پشتیبانی فرستادم؛ به‌زودی در همین چت پاسخ می‌دهند 🙏",
  ar: "أرسلت رسالتك إلى فريق الدعم، وسيردّون عليك قريبًا في هذه المحادثة 🙏",
  en: "I've passed your message to our support team — they'll reply here in this chat soon 🙏",
};

const CTA: Record<Locale, string> = {
  fa: "👇 دریافت پرامپت در ربات:",
  ar: "👇 احصل على البرومبت من البوت:",
  en: "👇 Get the prompt in our bot:",
};

// Obvious jailbreak phrasing — classified without spending a model call.
const JAILBREAK_RE =
  /ignore (?:all |any )?(?:the )?(?:previous|prior|above) (?:instructions|rules)|(?:reveal|show|print) (?:me )?(?:your|the) system prompt|\bDAN mode\b|developer mode|دستورات(?:\s|‌)*قبلی(?:\s|‌)*را(?:\s|‌)*نادیده|تعليمات(?:ك)? السابقة/i;

// Refunds and payment disputes always go to a human, whatever the model decides.
const ESCALATE_RE =
  /refund|money back|chargeback|dispute|charged twice|double[- ]charged|scam|fraud|lawyer|بازپرداخت|استرداد|ریفاند|برگشت(?:\s|‌)*(?:پول|وجه)|پولم(?:و)?(?:\s|‌)*(?:پس|برگردون)|دو(?:\s)?بار(?:\s|‌)*(?:کسر|کم)(?:\s|‌)*شد|کلاهبرداری|شکایت|استرجاع|إرجاع المبلغ|ارجاع المبلغ|احتيال|شكوى|خصم مرتين/i;

const MAX_HISTORY = 12;

export function createAssistantAgents(router: AiRouter, deps: AssistantAgentDeps): AssistantAgents {
  const { logger } = deps;

  return {
    async concierge(text: string, locale: Locale): Promise<ConciergeResult> {
      const trimmed = text.trim();
      if (!trimmed) return { intent: "other", query: null, locale, reply: null };
      if (JAILBREAK_RE.test(trimmed)) {
        return { intent: "unsafe", query: null, locale, reply: UNSAFE_REPLY[locale] };
      }
      try {
        const r = await router.json({
          task: "concierge",
          system: conciergeSystem(),
          messages: [
            {
              role: "user",
              content: `<hint_locale>${locale}</hint_locale>\n<user_message>\n${trimmed.slice(0, 2000)}\n</user_message>`,
            },
          ],
          ...zodJson(ConciergeSchema),
        });
        const query = r.intent === "search" ? r.query?.trim() || trimmed.slice(0, 100) : null;
        const reply = r.reply?.trim() || (r.intent === "unsafe" ? UNSAFE_REPLY[r.locale] : null);
        return { intent: r.intent, query, locale: r.locale, reply };
      } catch (e) {
        if (e instanceof AiRefusalError) {
          return { intent: "unsafe", query: null, locale, reply: UNSAFE_REPLY[locale] };
        }
        throw e;
      }
    },

    async buildPrompt(idea: string, locale: Locale) {
      const r = await router.json({
        task: "build_prompt",
        system: buildPromptSystem(locale),
        messages: [
          {
            role: "user",
            content: `<user_message>\n${idea.trim().slice(0, 4000)}\n</user_message>`,
          },
        ],
        ...zodJson(BuildPromptSchema),
      });
      if (r.refused || !r.prompt.trim()) {
        throw new AiRefusalError("unsafe_request", r.tips[0] ?? UNSAFE_REPLY[locale]);
      }
      const found = extractVariables(r.prompt);
      return {
        title: r.title.trim(),
        prompt: r.prompt.trim(),
        variables: found.length ? found : r.variables.filter(Boolean),
        tips: r.tips.map((t) => t.trim()).filter(Boolean),
      };
    },

    async runPrompt(prompt: string, locale: Locale): Promise<AiTextResult> {
      const { citations: _none, ...res } = await router.complete({
        task: "run_prompt",
        system: runPromptSystem(locale),
        messages: [{ role: "user", content: prompt }],
      });
      return res;
    },

    async support({ userId, locale, history, message }) {
      const forcedReason = ESCALATE_RE.test(message) ? "refund_or_payment_dispute" : null;
      let escalation: { reason: string; summary: string } | null = null;
      const tools = buildSupportTools(userId, locale, deps, (e) => {
        escalation = e;
      });
      const context = await supportContext(userId, deps).catch((e: unknown) => {
        logger.warn({ err: (e as Error).message }, "support context unavailable");
        return "(unavailable)";
      });
      const messages = trimHistory(history, message);
      const system = supportSystem(locale, context);

      let answer = "";
      let modelEscalate = false;
      let modelReason: string | null = null;
      try {
        if (isToolCapable(router)) {
          const res = await router.completeWithTools({
            task: "support",
            system,
            messages,
            tools,
            maxIterations: 6,
          });
          answer = res.text.trim();
        } else {
          // Router without tool support (third-party AiRouter): one structured call with the FAQ inline.
          const r = await router.json({
            task: "support",
            system: `${system}\n\nTools are unavailable in this mode. Official FAQ:\n${faqText(locale, "all")}\n\nReturn JSON: answer, escalate (true when the rules above say to escalate), reason (short English reason or null).`,
            messages,
            ...zodJson(SupportFallbackSchema),
          });
          answer = r.answer.trim();
          modelEscalate = r.escalate;
          modelReason = r.reason;
        }
      } catch (e) {
        if (!(e instanceof AiRefusalError)) throw e;
        return { answer: HANDOFF[locale], escalate: true, reason: "ai_refusal" };
      }

      const esc = escalation as { reason: string; summary: string } | null;
      const reason = esc?.reason ?? forcedReason ?? modelReason ?? (answer ? null : "no_answer");
      const escalate = !!esc || !!forcedReason || modelEscalate || !answer;
      return {
        answer: answer || HANDOFF[locale],
        escalate,
        ...(escalate && reason
          ? { reason: esc?.summary ? `${reason}: ${esc.summary}` : reason }
          : {}),
      };
    },

    async moderate(text: string) {
      if (JAILBREAK_RE.test(text)) return { allowed: false, category: "jailbreak" };
      try {
        const r = await router.json({
          task: "moderate",
          system: moderationSystem(),
          messages: [
            {
              role: "user",
              content: `<text_to_classify>\n${text.slice(0, 8000)}\n</text_to_classify>`,
            },
          ],
          ...zodJson(ModerationSchema),
        });
        return r.allowed
          ? { allowed: true, category: null }
          : { allowed: false, category: r.category ?? "other" };
      } catch (e) {
        if (e instanceof AiRefusalError) return { allowed: false, category: e.category ?? "other" };
        throw e;
      }
    },

    async writeChannelPost(
      prompt: PromptDetail,
      locale: Locale,
      platform: Platform,
    ): Promise<string> {
      // Public fields only — the paid body is never passed to the model.
      const info = {
        title: prompt.title,
        summary: prompt.summary,
        description: clip(prompt.description, 800),
        preview: clip(prompt.preview, 400),
        exampleOutput: prompt.exampleOutput ? clip(prompt.exampleOutput, 400) : null,
        models: prompt.models,
        outputType: prompt.outputType,
        tier: prompt.tier,
        variables: prompt.variables.map((v) => v.label),
        price:
          platform === "telegram"
            ? prompt.priceStars != null
              ? `${prompt.priceStars} Stars`
              : null
            : prompt.priceToman != null
              ? `${prompt.priceToman.toLocaleString("en-US")} toman`
              : null,
        free: prompt.tier === "free",
      };
      const res = await router.complete({
        task: "write_post",
        system: channelPostSystem(locale, platform),
        messages: [
          {
            role: "user",
            content: `<prompt_info>\n${JSON.stringify(info, null, 2)}\n</prompt_info>`,
          },
        ],
      });
      let text = platform === "telegram" ? sanitizeTelegramHtml(res.text) : toPlainText(res.text);
      if (!text.includes("{{DEEPLINK}}")) text = `${text.trim()}\n\n${CTA[locale]}\n{{DEEPLINK}}`;
      return text;
    },

    async writeDailyReport(stats: DailyStats, extra: Record<string, unknown>): Promise<string> {
      const res = await router.complete({
        task: "report",
        system: dailyReportSystem(),
        messages: [
          {
            role: "user",
            content: `<data>\n${JSON.stringify({ stats, extra }, null, 2)}\n</data>`,
          },
        ],
      });
      return toPlainText(res.text);
    },
  };
}

// ───────────────────────────── support tools ─────────────────────────────
const ESCALATION_REASONS = [
  "refund",
  "payment_dispute",
  "angry_user",
  "account_security",
  "bug",
  "legal_privacy",
  "unsure",
  "other",
] as const;

/**
 * Tools are closures over the authenticated `userId`; none of them accepts a user id from the
 * model, so the model cannot read another user's data.
 */
export function buildSupportTools(
  userId: string,
  locale: Locale,
  deps: Pick<AssistantAgentDeps, "orders" | "entitlements" | "credits">,
  onEscalate: (e: { reason: string; summary: string }) => void,
): ToolDef[] {
  return [
    {
      name: "get_my_orders",
      description:
        "Get the current user's orders (most recent first), or one specific order of theirs when order_id is given. Only returns orders that belong to the current user.",
      inputSchema: {
        type: "object",
        properties: {
          order_id: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Full order id (or null to list recent orders).",
          },
        },
        required: ["order_id"],
        additionalProperties: false,
      },
      async run(input) {
        const orderId = typeof input.order_id === "string" ? input.order_id.trim() : "";
        if (orderId) {
          const order = await deps.orders.get(orderId).catch(() => null);
          // Ownership check: an order of another user is indistinguishable from a missing one.
          if (!order || order.userId !== userId)
            return "No order with this id was found on the user's account.";
          return formatOrder(order);
        }
        if (typeof deps.orders.listForUser === "function") {
          const list = await deps.orders.listForUser(userId, 10);
          const own = list.filter((o) => o.userId === userId);
          return own.length ? own.map(formatOrder).join("\n") : "The user has no orders.";
        }
        return "Order history listing is not available. Ask the user for the order id shown on their invoice/receipt, then call get_my_orders with it.";
      },
    },
    {
      name: "get_my_library",
      description:
        "List the prompts the current user owns or can access (purchased, free, or via subscription).",
      inputSchema: {
        type: "object",
        properties: {
          page: {
            anyOf: [{ type: "integer" }, { type: "null" }],
            description: "1-based page, null for the first page.",
          },
        },
        required: ["page"],
        additionalProperties: false,
      },
      async run(input) {
        const page = typeof input.page === "number" && input.page > 0 ? Math.floor(input.page) : 1;
        const lib = await deps.entitlements.library(userId, locale, page);
        if (lib.total === 0) return "The user's library is empty.";
        const lines = lib.items.map((p) => `- ${p.title} [${p.tier}]`);
        return `Library: ${lib.total} prompt(s), page ${lib.page}.\n${lines.join("\n")}`;
      },
    },
    {
      name: "get_credit_balance",
      description: "Get the current user's AI credit balance and active subscription (if any).",
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      async run() {
        const [balance, sub] = await Promise.all([
          deps.credits.balance(userId),
          deps.entitlements.activeSubscription(userId),
        ]);
        const subText = sub
          ? `Active subscription: ${sub.plan.title} (${sub.plan.code}), ${sub.expiresAt ? `expires ${sub.expiresAt.toISOString().slice(0, 10)}` : "lifetime"}.`
          : "No active subscription.";
        return `Credit balance: ${balance}. ${subText}`;
      },
    },
    {
      name: "get_faq",
      description: "Official Rasa Prompt policy and help text in the user's language.",
      inputSchema: {
        type: "object",
        properties: { topic: { type: "string", enum: [...FAQ_TOPICS, "all"] } },
        required: ["topic"],
        additionalProperties: false,
      },
      async run(input) {
        const topic = (FAQ_TOPICS as readonly string[]).includes(String(input.topic))
          ? (input.topic as FaqTopic)
          : "all";
        return faqText(locale, topic);
      },
    },
    {
      name: "escalate_to_human",
      description:
        "Hand this conversation to a human support teammate. Use for refunds, payment disputes, angry users, security/legal issues, unresolved bugs, or whenever you are unsure.",
      inputSchema: {
        type: "object",
        properties: {
          reason: { type: "string", enum: [...ESCALATION_REASONS] },
          summary: {
            type: "string",
            description: "One-sentence English summary for the human agent.",
          },
        },
        required: ["reason", "summary"],
        additionalProperties: false,
      },
      async run(input) {
        onEscalate({
          reason: String(input.reason ?? "other"),
          summary: String(input.summary ?? "").slice(0, 300),
        });
        return "Escalation registered. Tell the user a support teammate will follow up in this chat; do not promise outcomes or timelines.";
      },
    },
  ];
}

function formatOrder(o: Order): string {
  const amount =
    o.currency === "XTR"
      ? `${o.total} Stars`
      : `${Math.round(o.total / 10).toLocaleString("en-US")} toman`;
  const items = o.items.map((i) => i.title).join(", ");
  const paid = o.paidAt ? `, paid ${o.paidAt.toISOString().slice(0, 10)}` : "";
  return `Order ${o.id.slice(0, 8)} — ${o.status}, ${amount} via ${o.provider}, items: ${items}, created ${o.createdAt.toISOString().slice(0, 10)}${paid}`;
}

async function supportContext(
  userId: string,
  deps: Pick<AssistantAgentDeps, "tickets">,
): Promise<string> {
  const ticket = await deps.tickets.activeForUser(userId);
  return ticket
    ? `Open support ticket: "${ticket.subject}" (status ${ticket.status}, updated ${ticket.updatedAt.toISOString().slice(0, 10)}).`
    : "No open support ticket.";
}

function trimHistory(history: AiMessage[], message: string): AiMessage[] {
  const msgs = [...history.slice(-MAX_HISTORY), { role: "user" as const, content: message }];
  while (msgs.length > 1 && msgs[0]?.role !== "user") msgs.shift();
  return msgs.filter((m) => m.content.trim().length > 0);
}

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
