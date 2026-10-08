import type { Locale } from "@rasa/shared";

/** Short user-facing strings used by invoices and pre-checkout errors (fa is the source). */
const MESSAGES = {
  invoiceTitleMulti: {
    fa: "خرید از رسا پرامپت",
    ar: "شراء من رسا برومبت",
    en: "Rasa Prompt purchase",
  },
  invoiceDescPrefix: {
    fa: "رسا پرامپت",
    ar: "رسا برومبت",
    en: "Rasa Prompt",
  },
  itemsCount: {
    fa: "{n} مورد",
    ar: "{n} عناصر",
    en: "{n} items",
  },
  errNotFound: {
    fa: "سفارش پیدا نشد. لطفاً دوباره خرید را شروع کنید.",
    ar: "الطلب غير موجود. يُرجى بدء الشراء من جديد.",
    en: "Order not found. Please start the purchase again.",
  },
  errExpired: {
    fa: "مهلت این فاکتور تمام شده. لطفاً دوباره خرید کنید.",
    ar: "انتهت صلاحية هذه الفاتورة. يُرجى الشراء من جديد.",
    en: "This invoice has expired. Please buy again.",
  },
  errState: {
    fa: "این سفارش قبلاً پرداخت یا لغو شده است.",
    ar: "تم دفع هذا الطلب أو إلغاؤه مسبقًا.",
    en: "This order was already paid or cancelled.",
  },
  errUser: {
    fa: "این فاکتور متعلق به حساب شما نیست.",
    ar: "هذه الفاتورة لا تخص حسابك.",
    en: "This invoice does not belong to your account.",
  },
  errAmount: {
    fa: "مبلغ پرداخت با سفارش مطابقت ندارد. لطفاً دوباره خرید کنید.",
    ar: "مبلغ الدفع لا يطابق الطلب. يُرجى الشراء من جديد.",
    en: "Payment amount does not match the order. Please buy again.",
  },
  errBanned: {
    fa: "امکان خرید برای این حساب وجود ندارد.",
    ar: "لا يمكن الشراء من هذا الحساب.",
    en: "Purchases are not available for this account.",
  },
  errGeneric: {
    fa: "خطای موقت در پرداخت. لطفاً چند لحظه بعد دوباره تلاش کنید.",
    ar: "خطأ مؤقت في الدفع. يُرجى المحاولة بعد لحظات.",
    en: "Temporary payment error. Please try again shortly.",
  },
  manualRefundNote: {
    fa: "بازپرداخت کیف پول بله خودکار نیست؛ مبلغ باید دستی به کاربر برگردانده شود.",
    ar: "استرداد محفظة بله ليس تلقائيًا؛ يجب إعادة المبلغ يدويًا.",
    en: "Bale wallet refunds are not automatic; return the money to the user manually.",
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type MessageKey = keyof typeof MESSAGES;

export function t(key: MessageKey, locale: Locale, vars?: Record<string, string | number>): string {
  let s: string = MESSAGES[key][locale] ?? MESSAGES[key].fa;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Truncates by Unicode code points (what Telegram counts), appending "…" when cut. */
export function truncate(text: string, max: number): string {
  const chars = Array.from(text.trim());
  if (chars.length <= max) return chars.join("");
  return `${chars
    .slice(0, max - 1)
    .join("")
    .trimEnd()}…`;
}
