/**
 * Hero "Prompt Studio" demos. Tab 1 uses the real FREE caption prompt from the catalog;
 * tabs 2–3 are short showcase templates written for the hero (NOT the paid prompt bodies).
 */
import type { L3, L3List } from "@/lib/catalog-types";

export interface StudioVar {
  name: string;
  label: L3;
  default?: L3;
  options?: L3List;
}

export interface StudioDemo {
  slug: string;
  version: string;
  score: number;
  models: [string, number][];
  demo: boolean;
  vars: StudioVar[];
  tpl?: L3; // when absent, the catalog body of `slug` is used
}

export const STUDIO: StudioDemo[] = [
  {
    slug: "instagram-sales-caption",
    version: "1.4",
    score: 92,
    demo: false,
    models: [
      ["Claude", 94],
      ["GPT", 91],
      ["Gemini", 89],
    ],
    vars: [],
  },
  {
    slug: "minimal-logo-persian-motifs",
    version: "2.1",
    score: 89,
    demo: true,
    models: [
      ["Midjourney", 91],
      ["Flux", 88],
      ["GPT-Image", 86],
    ],
    vars: [
      {
        name: "brand",
        label: { fa: "نام برند", ar: "اسم العلامة", en: "Brand" },
        default: { fa: "کافه نارنج", ar: "مقهى نارنج", en: "Naranj Café" },
      },
      {
        name: "style",
        label: { fa: "سبک", ar: "النمط", en: "Style" },
        options: {
          fa: ["گره‌چینی", "خوشنویسی", "مینیمال"],
          ar: ["زخرفة هندسية", "خط عربي", "بسيط"],
          en: ["girih", "calligraphy", "minimal"],
        },
      },
      {
        name: "colors",
        label: { fa: "رنگ‌ها", ar: "الألوان", en: "Colors" },
        default: { fa: "لاجوردی و طلایی", ar: "لازوردي وذهبي", en: "lapis and gold" },
      },
      {
        name: "use",
        label: { fa: "کاربرد", ar: "الاستخدام", en: "Use" },
        default: { fa: "تابلو و آیکون اپ", ar: "لافتة وأيقونة تطبيق", en: "signage and app icon" },
      },
    ],
    tpl: {
      fa: `نقش: طراح هویت بصری با تجربه در نقش‌مایه‌های ایرانی.
وظیفه: لوگوی برداری برای «{{brand}}» به سبک {{style}}.
قیود:
- پالت: {{colors}}؛ حداکثر ۲ رنگ + سفید
- خوانا در ۱۶ پیکسل؛ بدون گرادیان
- مناسب برای {{use}}
خروجی: ۳ گزینه + نسخه‌ی تک‌رنگ، پس‌زمینه‌ی ساده، 1:1
پارامترها: --style raw --ar 1:1`,
      ar: `الدور: مصمم هوية بصرية متمرّس في الزخارف الشرقية.
المهمة: شعار متجهي لـ «{{brand}}» بنمط {{style}}.
القيود:
- الألوان: {{colors}}؛ لونان كحد أقصى + الأبيض
- مقروء بحجم ١٦ بكسل؛ بلا تدرجات
- مناسب لـ {{use}}
المخرجات: ٣ خيارات + نسخة أحادية، خلفية بسيطة، 1:1
المعاملات: --style raw --ar 1:1`,
      en: `Role: identity designer fluent in Persian ornament.
Task: a vector logo for "{{brand}}" in a {{style}} style.
Constraints:
- palette: {{colors}}; max 2 colors + white
- legible at 16px; no gradients
- works for {{use}}
Output: 3 options + a monochrome version, plain background, 1:1
Params: --style raw --ar 1:1`,
    },
  },
  {
    slug: "n8n-instagram-lead-capture",
    version: "1.0",
    score: 88,
    demo: true,
    models: [
      ["Claude", 90],
      ["GPT", 87],
      ["n8n", 86],
    ],
    vars: [
      {
        name: "channel",
        label: { fa: "کانال", ar: "القناة", en: "Channel" },
        options: {
          fa: ["دایرکت اینستاگرام", "تلگرام", "واتساپ"],
          ar: ["رسائل إنستغرام", "تيليجرام", "واتساب"],
          en: ["Instagram DMs", "Telegram", "WhatsApp"],
        },
      },
      {
        name: "crm",
        label: { fa: "CRM", ar: "CRM", en: "CRM" },
        default: { fa: "گوگل‌شیت", ar: "جداول جوجل", en: "Google Sheets" },
      },
      {
        name: "tone",
        label: { fa: "لحن پاسخ", ar: "نبرة الرد", en: "Reply tone" },
        default: { fa: "مؤدب و کوتاه", ar: "مهذّب وقصير", en: "polite and brief" },
      },
      {
        name: "sla",
        label: { fa: "زمان پاسخ", ar: "زمن الرد", en: "Reply SLA" },
        default: { fa: "زیر ۲ دقیقه", ar: "أقل من دقيقتين", en: "under 2 minutes" },
      },
    ],
    tpl: {
      fa: `نقش: معمار اتوماسیون n8n برای کسب‌وکارهای کوچک.
وظیفه: ورک‌فلو جذب سرنخ از {{channel}} طراحی کن.
مراحل:
1. تریگر پیام جدید ← 2. دسته‌بندی با AI (داغ/گرم/سرد)
3. ثبت در {{crm}} ← 4. پاسخ خودکار با لحن {{tone}}
5. اگر «داغ» بود، اعلان فوری به فروشنده
قیود: زمان پاسخ {{sla}}؛ بدون ذخیره‌ی داده‌ی حساس
خروجی: JSON قابل import در n8n + توضیح هر نود`,
      ar: `الدور: مهندس أتمتة n8n للأعمال الصغيرة.
المهمة: صمّم سير عمل لجمع العملاء من {{channel}}.
الخطوات:
1. مُشغّل رسالة جديدة ← 2. تصنيف بالذكاء الاصطناعي (ساخن/دافئ/بارد)
3. التسجيل في {{crm}} ← 4. رد تلقائي بنبرة {{tone}}
5. إن كان «ساخناً» فتنبيه فوري للبائع
القيود: زمن الرد {{sla}}؛ بلا تخزين بيانات حساسة
المخرجات: JSON قابل للاستيراد في n8n + شرح لكل عقدة`,
      en: `Role: n8n automation architect for small businesses.
Task: design a lead-capture workflow from {{channel}}.
Steps:
1. new-message trigger → 2. AI triage (hot/warm/cold)
3. log to {{crm}} → 4. auto-reply in a {{tone}} tone
5. if "hot", ping the salesperson instantly
Constraints: reply SLA {{sla}}; store no sensitive data
Output: n8n-importable JSON + a note per node`,
    },
  },
];
