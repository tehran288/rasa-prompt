/**
 * User-facing strings sent by the worker (outside the bot's i18n bundle because the worker
 * bundles independently). Persian is the source; Arabic is MSA; English natural.
 * Admin-facing text (reports/alerts) is Persian only and lives next to each job.
 */
import type { Locale } from "@rasa/shared";

type Dict = Record<Locale, string>;

const t = {
  cartReminder: {
    fa: "🛒 خریدت نیمه‌کاره ماند!\n«{items}» هنوز در سبد توست. اگر مشکلی در پرداخت داشتی، همین‌جا دوباره امتحان کن یا به پشتیبانی پیام بده.",
    ar: "🛒 لم تكتمل عملية الشراء!\nلا يزال «{items}» في سلّتك. إن واجهتَ مشكلة في الدفع، يمكنك المحاولة مجددًا من هنا أو مراسلة الدعم.",
    en: "🛒 Your purchase isn't finished yet!\n“{items}” is still waiting for you. If something went wrong with the payment, try again here or message support.",
  },
  cartButton: {
    fa: "ادامه‌ی خرید",
    ar: "متابعة الشراء",
    en: "Continue purchase",
  },
  promptUpdated: {
    fa: "✨ نسخه‌ی جدید «{title}» (نسخه‌ی {version}) آماده است — رایگان برای شما که قبلاً خریده‌اید.",
    ar: "✨ الإصدار الجديد من «{title}» (الإصدار {version}) جاهز — مجانًا لك لأنك اشتريته سابقًا.",
    en: "✨ A new version of “{title}” (v{version}) is ready — free for you as an existing owner.",
  },
  openPrompt: {
    fa: "مشاهده در ربات",
    ar: "عرض في البوت",
    en: "Open in bot",
  },
  channelCta: {
    fa: "👈 دریافت کامل پرامپت در ربات",
    ar: "👈 احصل على البرومبت كاملًا في البوت",
    en: "👈 Get the full prompt in the bot",
  },
  channelHeader: {
    fa: "🌟 پرامپت روز",
    ar: "🌟 برومبت اليوم",
    en: "🌟 Prompt of the day",
  },
} satisfies Record<string, Dict>;

export type MsgKey = keyof typeof t;

export function msg(key: MsgKey, locale: Locale, vars: Record<string, string> = {}): string {
  const template = t[key][locale] ?? t[key].fa;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}
