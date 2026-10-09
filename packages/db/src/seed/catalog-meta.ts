import type { L3, SeedCategory } from "./types";

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    slug: "social-media",
    emoji: "📱",
    name: { fa: "شبکه‌های اجتماعی", ar: "وسائل التواصل الاجتماعي", en: "Social Media" },
  },
  {
    slug: "copywriting",
    emoji: "✍️",
    name: { fa: "کپی‌رایتینگ و تبلیغات", ar: "كتابة الإعلانات والتسويق", en: "Copywriting & Ads" },
  },
  {
    slug: "seo-content",
    emoji: "🔎",
    name: { fa: "سئو و تولید محتوا", ar: "تحسين محركات البحث والمحتوى", en: "SEO & Content" },
  },
  {
    slug: "sales-email",
    emoji: "📧",
    name: { fa: "فروش و ایمیل", ar: "المبيعات والبريد الإلكتروني", en: "Sales & Email" },
  },
  {
    slug: "image-design",
    emoji: "🎨",
    name: { fa: "طراحی و تصویرسازی", ar: "التصميم وتوليد الصور", en: "Image & Design" },
  },
  {
    slug: "product-photo",
    emoji: "📸",
    name: { fa: "عکاسی محصول", ar: "تصوير المنتجات", en: "Product Photography" },
  },
  {
    slug: "programming",
    emoji: "💻",
    name: { fa: "برنامه‌نویسی", ar: "البرمجة", en: "Programming" },
  },
  {
    slug: "automation",
    emoji: "⚙️",
    name: { fa: "اتوماسیون و ایجنت", ar: "الأتمتة والوكلاء الأذكياء", en: "Automation & Agents" },
  },
  {
    slug: "education",
    emoji: "🎓",
    name: { fa: "آموزش و یادگیری", ar: "التعليم والتعلّم", en: "Education & Learning" },
  },
  {
    slug: "productivity",
    emoji: "🚀",
    name: { fa: "بهره‌وری و کسب‌وکار", ar: "الإنتاجية والأعمال", en: "Productivity & Business" },
  },
];

export interface SeedPlan {
  code: "pro_monthly" | "pro_yearly" | "lifetime";
  title: L3;
  monthlyCredits: number;
  durationDays: number | null;
  priceToman: number;
  priceStars: number;
  includesPremium: boolean;
  sort: number;
}

export const SEED_PLANS: SeedPlan[] = [
  {
    code: "pro_monthly",
    title: { fa: "اشتراک ماهانه Pro", ar: "اشتراك Pro الشهري", en: "Pro Monthly" },
    monthlyCredits: 200,
    durationDays: 30,
    priceToman: 199_000,
    priceStars: 250,
    includesPremium: false,
    sort: 1,
  },
  {
    code: "pro_yearly",
    title: {
      fa: "اشتراک سالانه Pro (۵ ماه رایگان)",
      ar: "اشتراك Pro السنوي (5 أشهر مجانًا)",
      en: "Pro Yearly (5 months free)",
    },
    monthlyCredits: 250,
    durationDays: 365,
    priceToman: 1_490_000,
    priceStars: 1_800,
    includesPremium: true,
    sort: 2,
  },
  {
    code: "lifetime",
    title: {
      fa: "دسترسی مادام‌العمر (ظرفیت محدود)",
      ar: "وصول مدى الحياة (عدد محدود)",
      en: "Lifetime Access (limited seats)",
    },
    monthlyCredits: 300,
    durationDays: null,
    priceToman: 3_900_000,
    priceStars: 4_500,
    includesPremium: true,
    sort: 3,
  },
];

export interface SeedPack {
  code: string;
  title: L3;
  credits: number;
  priceToman: number;
  priceStars: number;
  sort: number;
}

export const SEED_CREDIT_PACKS: SeedPack[] = [
  {
    code: "credits_100",
    title: { fa: "بسته‌ی ۱۰۰ کردیت", ar: "باقة 100 رصيد", en: "100 credits" },
    credits: 100,
    priceToman: 79_000,
    priceStars: 100,
    sort: 1,
  },
  {
    code: "credits_300",
    title: {
      fa: "بسته‌ی ۳۰۰ کردیت (۱۵٪ تخفیف)",
      ar: "باقة 300 رصيد (خصم 15%)",
      en: "300 credits (15% off)",
    },
    credits: 300,
    priceToman: 199_000,
    priceStars: 250,
    sort: 2,
  },
  {
    code: "credits_1000",
    title: {
      fa: "بسته‌ی ۱۰۰۰ کردیت (۳۰٪ تخفیف)",
      ar: "باقة 1000 رصيد (خصم 30%)",
      en: "1,000 credits (30% off)",
    },
    credits: 1000,
    priceToman: 549_000,
    priceStars: 690,
    sort: 3,
  },
];

export interface SeedBundle {
  slug: string;
  title: L3;
  description: L3;
  priceToman: number;
  priceStars: number;
  /** Prompt slugs. */
  prompts: string[];
}

export const SEED_BUNDLES: SeedBundle[] = [
  {
    slug: "instagram-growth-kit",
    title: {
      fa: "پکیج رشد اینستاگرام",
      ar: "حزمة نمو إنستغرام",
      en: "Instagram Growth Kit",
    },
    description: {
      fa: "همه‌ی پرامپت‌های حرفه‌ای ما برای تقویم محتوا، کپشن، ریلز و تبلیغات اینستاگرام در یک بسته.",
      ar: "كل موجّهاتنا الاحترافية لتقويم المحتوى والتعليقات والريلز وإعلانات إنستغرام في حزمة واحدة.",
      en: "All our professional prompts for Instagram content calendars, captions, Reels and ads in one bundle.",
    },
    priceToman: 390_000,
    priceStars: 490,
    prompts: [
      "instagram-content-calendar-30-days",
      "reels-script-hook-retention",
      "instagram-ad-copy-variants",
      "brand-voice-guide",
    ],
  },
  {
    slug: "developer-power-pack",
    title: {
      fa: "پکیج قدرتی برنامه‌نویس",
      ar: "حزمة المطوّر الاحترافية",
      en: "Developer Power Pack",
    },
    description: {
      fa: "بازبینی کد، طراحی API، نوشتن تست و دیباگ سیستماتیک — ابزار روزمره‌ی یک تیم مهندسی جدی.",
      ar: "مراجعة الشيفرة وتصميم واجهات API وكتابة الاختبارات وتصحيح الأخطاء المنهجي — أدوات يومية لفريق هندسي جاد.",
      en: "Code review, API design, test writing and systematic debugging — the daily toolkit of a serious engineering team.",
    },
    priceToman: 490_000,
    priceStars: 610,
    prompts: [
      "senior-code-review",
      "rest-api-design-spec",
      "unit-test-generator",
      "systematic-debugging-partner",
    ],
  },
];
