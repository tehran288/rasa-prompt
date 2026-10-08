import type { Locale } from "@rasa/shared";

export const FAQ_TOPICS = [
  "payments",
  "refunds",
  "variables",
  "subscriptions",
  "credits",
  "contact",
] as const;
export type FaqTopic = (typeof FAQ_TOPICS)[number];

/**
 * Official support knowledge base used by the support agent's `get_faq` tool.
 * Keep it factual; the agent is instructed to quote it rather than improvise policy.
 */
export const FAQ: Record<Locale, Record<FaqTopic, string>> = {
  fa: {
    payments:
      "پرداخت داخل خود پیام‌رسان انجام می‌شود: در تلگرام با «استارز» (Telegram Stars) و در بله با «کیف پول بله». روی دکمه‌ی خرید بزنید، فاکتور را تأیید کنید؛ بلافاصله بعد از پرداخت موفق، پرامپت به «کتابخانه‌ی من» اضافه می‌شود. اگر پرداخت داخل پیام‌رسان برایتان ممکن نیست، لینک پرداخت از طریق سایت rasa-prompt.ir هم ارائه می‌شود. هیچ‌وقت اطلاعات کارت یا رمز خود را در چت نفرستید.",
    refunds:
      "سیاست بازگشت وجه ۷ روزه است: تا ۷ روز پس از خرید، اگر پرامپت با توضیحاتش مطابقت نداشته باشد یا مشکل فنی داشته باشد، می‌توانید درخواست بازگشت وجه بدهید. درخواست را با شماره‌ی سفارش در پشتیبانی ثبت کنید؛ بررسی و تأیید نهایی توسط همکاران پشتیبانی انجام می‌شود. پرداخت‌های استارز به موجودی استارز تلگرام برمی‌گردد و پرداخت‌های کیف پول بله پس از تأیید، توسط پشتیبانی بازگردانده می‌شود. با بازگشت وجه، دسترسی به آن پرامپت لغو می‌شود. اشتراک‌ها و بسته‌های اعتباری مصرف‌شده قابل بازگشت نیستند مگر در صورت خطای فنی.",
    variables:
      "متغیرها بخش‌هایی از پرامپت هستند که داخل {{ }} نوشته شده‌اند، مثل {{نام_محصول}} یا {{مخاطب_هدف}}. بعد از باز کردن پرامپت، دکمه‌ی «پر کردن متغیرها» را بزنید؛ ربات یکی‌یکی مقدار هر متغیر را می‌پرسد و نسخه‌ی آماده را تحویل می‌دهد. می‌توانید پرامپت را کپی کنید و خودتان مقدارها را جایگزین کنید. متن آماده را در ChatGPT، Claude، Gemini یا ابزار تصویری مربوطه بچسبانید.",
    subscriptions:
      "اشتراک «پرو» (ماهانه یا سالانه) و اشتراک «مادام‌العمر» دسترسی به پرامپت‌های سطح پرو را باز می‌کند و هر ماه مقداری اعتبار برای ساخت و اجرای پرامپت با هوش مصنوعی می‌دهد. قیمت‌ها و جزئیات به‌روز همیشه در منوی «اشتراک» ربات نمایش داده می‌شود. اشتراک پس از پایان دوره خودکار تمدید نمی‌شود و برای ادامه باید دوباره خریداری شود. پرامپت‌هایی که جداگانه خریده‌اید برای همیشه در کتابخانه‌ی شما می‌مانند.",
    credits:
      "اعتبار (کردیت) برای استفاده از ابزارهای هوش مصنوعی ربات است: «ساخت پرامپت اختصاصی» از روی ایده‌ی شما و «اجرای پرامپت» برای گرفتن خروجی آماده. هر روز چند ساخت رایگان دارید؛ بیشتر از آن از اعتبار کم می‌شود. اعتبار را می‌توانید با خرید بسته‌ی اعتباری، اشتراک پرو یا دعوت دوستان (پس از اولین خرید دوستتان، به هر دو نفر اعتبار هدیه داده می‌شود) به دست بیاورید. موجودی را در «حساب من» ببینید.",
    contact:
      "برای ارتباط با پشتیبانی از دستور /support یا دکمه‌ی «پشتیبانی» در ربات استفاده کنید؛ پیام شما به‌صورت تیکت ثبت می‌شود و همکاران ما در همین چت پاسخ می‌دهند. وب‌سایت: rasa-prompt.ir",
  },
  ar: {
    payments:
      "يتم الدفع داخل تطبيق المراسلة نفسه: في تيليجرام عبر «نجوم تيليجرام» (Telegram Stars)، وفي «بله» عبر «محفظة بله». اضغط زر الشراء وأكّد الفاتورة؛ وفور نجاح الدفع يُضاف البرومبت إلى «مكتبتي». إذا تعذّر الدفع داخل التطبيق، نوفّر رابط دفع عبر موقع rasa-prompt.ir. لا ترسل أبدًا بيانات بطاقتك أو كلمات المرور في المحادثة.",
    refunds:
      "سياسة الاسترداد خلال ٧ أيام: يمكنك طلب استرداد المبلغ خلال ٧ أيام من الشراء إذا لم يطابق البرومبت وصفه أو كانت به مشكلة تقنية. سجّل الطلب لدى الدعم مع رقم الطلب؛ ويتولى فريق الدعم المراجعة والموافقة النهائية. تُعاد مدفوعات النجوم إلى رصيد نجوم تيليجرام، وتُعاد مدفوعات محفظة بله يدويًا بعد الموافقة. عند الاسترداد يُلغى الوصول إلى ذلك البرومبت. الاشتراكات وحزم الرصيد المستهلكة غير قابلة للاسترداد إلا في حال وجود خطأ تقني.",
    variables:
      "المتغيرات هي أجزاء من البرومبت مكتوبة بين {{ }}، مثل {{اسم_المنتج}} أو {{الجمهور_المستهدف}}. بعد فتح البرومبت اضغط «تعبئة المتغيرات»، وسيسألك البوت عن قيمة كل متغير ثم يسلّمك النسخة الجاهزة. ويمكنك أيضًا نسخ البرومبت واستبدال القيم بنفسك، ثم لصقه في ChatGPT أو Claude أو Gemini أو أداة الصور المناسبة.",
    subscriptions:
      "اشتراك «برو» (شهري أو سنوي) واشتراك «مدى الحياة» يفتحان الوصول إلى برومبتات مستوى برو، ويمنحان رصيدًا شهريًا لاستخدام أدوات الذكاء الاصطناعي في البوت. الأسعار والتفاصيل المحدّثة تظهر دائمًا في قائمة «الاشتراك». لا يتجدد الاشتراك تلقائيًا؛ للاستمرار يجب شراؤه مجددًا. البرومبتات التي اشتريتها منفردة تبقى في مكتبتك دائمًا.",
    credits:
      "الرصيد (الكريدت) مخصّص لأدوات الذكاء الاصطناعي في البوت: «بناء برومبت مخصص» من فكرتك و«تشغيل البرومبت» للحصول على نتيجة جاهزة. لديك عدد من الاستخدامات المجانية يوميًا، وبعدها يُخصم من الرصيد. يمكنك الحصول على رصيد بشراء حزمة رصيد أو اشتراك برو أو بدعوة الأصدقاء (بعد أول عملية شراء لصديقك يحصل كلاكما على رصيد هدية). راجع رصيدك في «حسابي».",
    contact:
      "للتواصل مع الدعم استخدم الأمر /support أو زر «الدعم» في البوت؛ تُسجَّل رسالتك كتذكرة ويرد عليك فريقنا في هذه المحادثة نفسها. الموقع: rasa-prompt.ir",
  },
  en: {
    payments:
      "Payment happens inside the messenger: Telegram Stars on Telegram, and the Bale wallet on Bale. Tap Buy and confirm the invoice; right after a successful payment the prompt is added to “My library”. If in-app payment isn't available to you, we also provide a checkout link on rasa-prompt.ir. Never send card details or passwords in the chat.",
    refunds:
      "We have a 7-day refund policy: within 7 days of purchase you can request a refund if a prompt doesn't match its description or has a technical problem. Open a support request with your order id; our support team reviews and makes the final decision. Stars payments are returned to your Telegram Stars balance; Bale wallet payments are refunded manually by support after approval. A refund removes access to that prompt. Subscriptions and used credit packs are non-refundable except in case of a technical error.",
    variables:
      "Variables are the parts of a prompt written inside {{ }}, like {{product_name}} or {{target_audience}}. After opening a prompt, tap “Fill variables”: the bot asks for each value and gives you the ready-to-use version. You can also copy the prompt and replace the values yourself, then paste it into ChatGPT, Claude, Gemini or the relevant image tool.",
    subscriptions:
      "The Pro subscription (monthly or yearly) and the Lifetime plan unlock Pro-tier prompts and add monthly credits for the bot's AI tools. Current prices and details are always shown in the bot's “Subscription” menu. Subscriptions don't auto-renew; buy again to continue. Prompts you bought individually stay in your library forever.",
    credits:
      "Credits pay for the bot's AI tools: “Build a custom prompt” from your idea and “Run prompt” to get a finished result. You get a few free builds every day; beyond that, credits are deducted. Get credits by buying a credit pack, subscribing to Pro, or inviting friends (after your friend's first purchase, you both receive bonus credits). Check your balance under “My account”.",
    contact:
      "To reach support, use the /support command or the “Support” button in the bot; your message becomes a ticket and our team replies right here in this chat. Website: rasa-prompt.ir",
  },
};

export function faqText(locale: Locale, topic: FaqTopic | "all"): string {
  const book = FAQ[locale];
  if (topic === "all") return FAQ_TOPICS.map((t) => `## ${t}\n${book[t]}`).join("\n\n");
  return book[topic];
}
