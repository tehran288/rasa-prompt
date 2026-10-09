/**
 * Local catalog fixture — the website works fully on this alone.
 *
 * Rules:
 *  - Paid (pro/premium) prompts carry ONLY `preview` (first ~25% of the body). Never a body.
 *  - Free prompts carry `body` with {{variables}}.
 *  - All copy is original; example outputs are illustrative.
 */
import type {
  FixtureCategory,
  FixturePrompt,
  FixtureTrend,
  QualityBreakdown,
} from "@/lib/catalog-types";

const q = (
  clarity: number,
  accuracy: number,
  consistency: number,
  localization: number,
  safety: number,
): QualityBreakdown => ({ clarity, accuracy, consistency, localization, safety });

export const FIXTURE_CATEGORIES: FixtureCategory[] = [
  {
    slug: "marketing",
    icon: "megaphone",
    name: { fa: "بازاریابی و فروش", ar: "التسويق والمبيعات", en: "Marketing & sales" },
    blurb: {
      fa: "کپشن، ایمیل فروش، کمپین مناسبتی و توضیح محصول که واقعاً می‌فروشد.",
      ar: "تعليقات ورسائل مبيعات وحملات موسمية وأوصاف منتجات تبيع فعلاً.",
      en: "Captions, sales emails, seasonal campaigns and product copy that sells.",
    },
  },
  {
    slug: "content",
    icon: "pen",
    name: { fa: "تولید محتوا", ar: "صناعة المحتوى", en: "Content & writing" },
    blurb: {
      fa: "مقاله‌ی سئو، لحن برند و پست‌های تخصصی با صدای انسانی.",
      ar: "مقالات SEO ونبرة العلامة ومنشورات متخصصة بصوت بشري.",
      en: "SEO articles, brand voice and expert posts in a human voice.",
    },
  },
  {
    slug: "design",
    icon: "palette",
    name: { fa: "طراحی و تصویر", ar: "التصميم والصور", en: "Design & imagery" },
    blurb: {
      fa: "لوگو، عکس محصول و تصویرسازی با Midjourney، Flux و GPT-Image.",
      ar: "شعارات وصور منتجات ورسوم بـ Midjourney وFlux وGPT-Image.",
      en: "Logos, product shots and illustration with Midjourney, Flux and GPT-Image.",
    },
  },
  {
    slug: "video",
    icon: "clapper",
    name: { fa: "ویدیو", ar: "الفيديو", en: "Video" },
    blurb: {
      fa: "سناریوی ریلز، شات‌لیست و پرامپت مدل‌های ویدیویی.",
      ar: "سيناريوهات ريلز وقوائم لقطات وبرومبتات نماذج الفيديو.",
      en: "Reels scripts, shot lists and prompts for video models.",
    },
  },
  {
    slug: "code",
    icon: "code",
    name: { fa: "برنامه‌نویسی", ar: "البرمجة", en: "Programming" },
    blurb: {
      fa: "بازبینی کد، تولید کامپوننت، SQL و پاک‌سازی داده.",
      ar: "مراجعة الكود وتوليد المكوّنات وSQL وتنظيف البيانات.",
      en: "Code review, component generation, SQL and data cleaning.",
    },
  },
  {
    slug: "automation",
    icon: "workflow",
    name: { fa: "اتوماسیون و ایجنت", ar: "الأتمتة والوكلاء", en: "Automation & agents" },
    blurb: {
      fa: "ورک‌فلوی n8n، ایجنت پشتیبانی و ربات فروشگاهی آماده‌ی اجرا.",
      ar: "سير عمل n8n ووكلاء دعم وبوتات متاجر جاهزة للتشغيل.",
      en: "n8n workflows, support agents and shop bots, ready to run.",
    },
  },
  {
    slug: "business",
    icon: "briefcase",
    name: { fa: "کسب‌وکار و حقوقی", ar: "الأعمال والقانون", en: "Business & legal" },
    blurb: {
      fa: "بیزینس‌پلن، بررسی قرارداد، صورت‌جلسه و رزومه.",
      ar: "خطط أعمال ومراجعة عقود ومحاضر اجتماعات وسير ذاتية.",
      en: "Business plans, contract review, meeting notes and résumés.",
    },
  },
  {
    slug: "education",
    icon: "graduation",
    name: { fa: "آموزش و یادگیری", ar: "التعليم والتعلّم", en: "Learning & education" },
    blurb: {
      fa: "معلم خصوصی سقراطی، برنامه‌ی مطالعه و آزمونک‌ساز.",
      ar: "مدرّس سقراطي وخطط مذاكرة ومولّد اختبارات.",
      en: "A Socratic tutor, study planners and quiz builders.",
    },
  },
];

const HERO_BODY = {
  fa: `نقش: کپی‌رایتر ارشد اینستاگرام برای فروشگاه‌های ایرانی.
وظیفه: برای {{product}} سه کپشن بنویس، مخاطب: {{audience}}.
قیود:
- لحن {{tone}}، حداکثر ۵۰ کلمه
- خط اول قلاب، بعد یک فایده‌ی ملموس
- پیشنهاد را صریح بگو: {{offer}}
- ۵ هشتگ فارسی پرجست‌وجو، بدون هشتگ عمومی
خروجی: جدول با ستون‌های «کپشن»، «قلاب»، «CTA».
توقف: اگر محصول مبهم است، اول یک سؤال بپرس.`,
  ar: `الدور: كاتب إعلانات أول لإنستغرام للمتاجر الخليجية.
المهمة: اكتب ثلاثة تعليقات لـ {{product}}، الجمهور: {{audience}}.
القيود:
- نبرة {{tone}}، ٥٠ كلمة كحد أقصى
- السطر الأول خطّاف، ثم فائدة ملموسة
- اذكر العرض بوضوح: {{offer}}
- ٥ وسوم عربية رائجة، بلا وسوم عامة
المخرجات: جدول بأعمدة «التعليق» و«الخطّاف» و«الدعوة».
التوقف: إن كان المنتج غامضاً فاسأل سؤالاً أولاً.`,
  en: `Role: senior Instagram copywriter for small online shops.
Task: write three captions for {{product}}, audience: {{audience}}.
Constraints:
- {{tone}} tone, 50 words max
- line one is a hook, then one concrete benefit
- state the offer plainly: {{offer}}
- 5 high-intent hashtags, no generic ones
Output: a table with "Caption", "Hook", "CTA" columns.
Stop: if the product is unclear, ask one question first.`,
};

export const HERO_PROMPT_SLUG = "instagram-sales-caption";

export const FIXTURE_PROMPTS: FixturePrompt[] = [
  // ───────────────────────────── FREE ─────────────────────────────
  {
    id: "p-0001",
    slug: "instagram-sales-caption",
    type: "text",
    tier: "free",
    category: "marketing",
    models: ["Claude", "GPT", "Gemini"],
    score: 92,
    breakdown: q(94, 91, 90, 95, 92),
    version: "1.4",
    testedAt: "2026-10-05",
    createdAt: "2026-03-12",
    priceToman: null,
    priceStars: null,
    popularity: 98,
    tags: ["instagram", "caption", "کپشن", "تعليق", "hashtag"],
    title: {
      fa: "کپشن فروش اینستاگرام",
      ar: "تعليق مبيعات إنستغرام",
      en: "Instagram sales caption",
    },
    summary: {
      fa: "کپشن کوتاه با قلاب، فایده، دعوت به اقدام و هشتگ بومی برای هر محصول.",
      ar: "تعليق قصير بخطّاف وفائدة ودعوة لاتخاذ إجراء ووسوم محلية لأي منتج.",
      en: "A short caption with hook, benefit, call to action and local hashtags for any product.",
    },
    description: {
      fa: "این پرامپت برای فروشگاه‌های کوچک اینستاگرامی نوشته شده: سه نسخه‌ی کپشن می‌دهد که هر کدام با یک قلاب شروع می‌شوند، یک فایده‌ی ملموس را برجسته می‌کنند و پیشنهاد شما را بی‌پرده می‌گویند. هشتگ‌ها بر اساس جست‌وجوی واقعی فارسی انتخاب می‌شوند، نه هشتگ‌های عمومی و بی‌اثر.",
      ar: "صُمّم هذا البرومبت للمتاجر الصغيرة على إنستغرام: يقدّم ثلاث نسخ من التعليق تبدأ كلٌّ منها بخطّاف، وتُبرز فائدة ملموسة، وتذكر عرضك بوضوح. تُختار الوسوم بحسب عمليات البحث الفعلية، لا الوسوم العامة عديمة الأثر.",
      en: "Built for small Instagram shops: you get three caption variants, each opening with a hook, landing one concrete benefit and stating your offer plainly. Hashtags are picked from real search demand, not generic tags that do nothing.",
    },
    example: {
      fa: "«این کیف فقط چرم نیست؛ همراه هر روزته.» ✨ دوخت دستی، ۳ سال ضمانت. ارسال رایگان تا جمعه 👇",
      ar: "«ليست مجرد حقيبة جلدية؛ إنها رفيقتك اليومية.» ✨ خياطة يدوية وضمان ٣ سنوات. شحن مجاني حتى الجمعة 👇",
      en: '"Not just leather. Your everyday companion." ✨ Hand-stitched, 3-year warranty. Free shipping until Friday 👇',
    },
    preview: {
      fa: "نقش: کپی‌رایتر ارشد اینستاگرام برای فروشگاه‌های ایرانی.\nوظیفه: برای {{product}} سه کپشن بنویس…",
      ar: "الدور: كاتب إعلانات أول لإنستغرام للمتاجر الخليجية.\nالمهمة: اكتب ثلاثة تعليقات لـ {{product}}…",
      en: "Role: senior Instagram copywriter for small online shops.\nTask: write three captions for {{product}}…",
    },
    body: HERO_BODY,
    variables: [
      {
        name: "product",
        type: "text",
        required: true,
        label: { fa: "محصول", ar: "المنتج", en: "Product" },
        default: { fa: "کیف چرم دست‌دوز", ar: "حقيبة جلدية يدوية", en: "hand-stitched leather bag" },
      },
      {
        name: "audience",
        type: "text",
        required: true,
        label: { fa: "مخاطب", ar: "الجمهور", en: "Audience" },
        default: {
          fa: "زنان شاغل ۲۵ تا ۴۰ سال",
          ar: "نساء عاملات ٢٥–٤٠",
          en: "working women 25–40",
        },
      },
      {
        name: "tone",
        type: "select",
        required: true,
        label: { fa: "لحن", ar: "النبرة", en: "Tone" },
        options: {
          fa: ["صمیمی", "لوکس", "طنز"],
          ar: ["ودّي", "فاخر", "مرح"],
          en: ["friendly", "luxury", "playful"],
        },
      },
      {
        name: "offer",
        type: "text",
        required: false,
        label: { fa: "پیشنهاد", ar: "العرض", en: "Offer" },
        default: {
          fa: "ارسال رایگان تا جمعه",
          ar: "شحن مجاني حتى الجمعة",
          en: "free shipping until Friday",
        },
      },
    ],
  },
  {
    id: "p-0002",
    slug: "socratic-tutor",
    type: "text",
    tier: "free",
    category: "education",
    models: ["Claude", "GPT", "Gemini"],
    score: 90,
    breakdown: q(92, 89, 90, 91, 88),
    version: "1.2",
    testedAt: "2026-10-03",
    createdAt: "2026-04-02",
    priceToman: null,
    priceStars: null,
    popularity: 84,
    tags: ["tutor", "معلم", "مدرس", "konkur", "quiz"],
    title: { fa: "معلم خصوصی سقراطی", ar: "مدرّس سقراطي خاص", en: "Socratic private tutor" },
    summary: {
      fa: "به‌جای جواب مستقیم، با سؤال‌های مرحله‌ای یاد می‌دهد و آخرش آزمونک می‌گیرد.",
      ar: "يعلّم بأسئلة متدرجة بدل الإجابة المباشرة، وينهي باختبار قصير.",
      en: "Teaches through stepwise questions instead of answers, then ends with a quiz.",
    },
    description: {
      fa: "مدل را به یک معلم صبور تبدیل می‌کند که سطح شما را می‌سنجد، مفهوم را با سؤال‌های کوچک می‌شکند و فقط وقتی گیر کردید راهنمایی می‌دهد. برای دانش‌آموز، دانشجو و هر کسی که می‌خواهد واقعاً بفهمد، نه حفظ کند.",
      ar: "يحوّل النموذج إلى معلّم صبور يقيس مستواك، ويفكّك المفهوم بأسئلة صغيرة، ولا يلمّح إلا عندما تتعثّر. مناسب للطلاب ولكل من يريد أن يفهم فعلاً لا أن يحفظ.",
      en: "Turns the model into a patient teacher that gauges your level, breaks the concept into small questions and only hints when you are stuck. For students and anyone who wants to understand, not memorise.",
    },
    example: {
      fa: "«اول بگو فکر می‌کنی چرا آب در ۱۰۰ درجه می‌جوشد؟»",
      ar: "«قل لي أولاً: لماذا تظن أن الماء يغلي عند ١٠٠ درجة؟»",
      en: '"First, why do you think water boils at 100 degrees?"',
    },
    preview: {
      fa: "نقش: معلم خصوصی صبور به روش سقراطی در موضوع {{subject}}…",
      ar: "الدور: مدرّس خاص صبور بالطريقة السقراطية في {{subject}}…",
      en: "Role: a patient Socratic tutor for {{subject}}…",
    },
    body: {
      fa: `نقش: معلم خصوصی صبور به روش سقراطی در موضوع {{subject}}.
سطح یادگیرنده: {{level}}.
روش:
- هرگز جواب نهایی را مستقیم نگو؛ با یک سؤال کوچک شروع کن
- بعد از هر پاسخ من، درستی‌اش را در یک جمله بسنج و سؤال بعدی را بپرس
- اگر دو بار پشت سر هم اشتباه کردم، یک راهنمایی کوتاه بده
- از مثال‌های روزمره‌ی {{context}} استفاده کن
پایان: وقتی مفهوم کامل شد، ۳ سؤال آزمونک چندگزینه‌ای بده و در آخر نمره‌ام را بگو.
زبان: فارسی ساده و دوستانه.`,
      ar: `الدور: مدرّس خاص صبور بالطريقة السقراطية في {{subject}}.
مستوى المتعلّم: {{level}}.
الأسلوب:
- لا تعطِ الإجابة النهائية مباشرة أبداً؛ ابدأ بسؤال صغير
- بعد كل إجابة، قيّم صحتها في جملة واحدة ثم اطرح السؤال التالي
- إن أخطأتُ مرتين متتاليتين، قدّم تلميحاً قصيراً
- استخدم أمثلة يومية من {{context}}
الختام: عند اكتمال المفهوم، قدّم ٣ أسئلة اختيار من متعدد وأخبرني بدرجتي.
اللغة: عربية فصحى بسيطة وودودة.`,
      en: `Role: a patient Socratic tutor for {{subject}}.
Learner level: {{level}}.
Method:
- never give the final answer directly; start with one small question
- after each reply, judge it in one sentence, then ask the next question
- if I am wrong twice in a row, give one short hint
- use everyday examples from {{context}}
Finish: once the concept is complete, give a 3-question multiple-choice quiz and tell me my score.
Language: plain, friendly English.`,
    },
    variables: [
      {
        name: "subject",
        type: "text",
        required: true,
        label: { fa: "موضوع", ar: "الموضوع", en: "Subject" },
        default: {
          fa: "فیزیک: نقطه‌ی جوش",
          ar: "الفيزياء: نقطة الغليان",
          en: "physics: boiling point",
        },
      },
      {
        name: "level",
        type: "select",
        required: true,
        label: { fa: "سطح", ar: "المستوى", en: "Level" },
        options: {
          fa: ["دبیرستان", "کنکوری", "دانشگاه"],
          ar: ["ثانوي", "تحضير للامتحان", "جامعي"],
          en: ["high school", "exam prep", "university"],
        },
      },
      {
        name: "context",
        type: "text",
        required: false,
        label: { fa: "مثال‌ها از", ar: "أمثلة من", en: "Examples from" },
        default: { fa: "آشپزخانه", ar: "المطبخ", en: "the kitchen" },
      },
    ],
  },
  {
    id: "p-0003",
    slug: "code-review-security",
    type: "code",
    tier: "free",
    category: "code",
    models: ["Claude", "GPT"],
    score: 86,
    breakdown: q(88, 87, 84, 82, 90),
    version: "1.1",
    testedAt: "2026-09-30",
    createdAt: "2026-02-20",
    priceToman: null,
    priceStars: null,
    popularity: 77,
    tags: ["code review", "security", "امنیت", "أمان", "owasp"],
    title: {
      fa: "بازبینی کد با چک‌لیست امنیتی",
      ar: "مراجعة الكود بقائمة أمنية",
      en: "Code review with a security checklist",
    },
    summary: {
      fa: "بازبینی ساختاریافته: باگ، امنیت، کارایی و خوانایی با شدت هر مورد.",
      ar: "مراجعة منظمة: أخطاء وأمان وأداء ووضوح مع درجة الخطورة.",
      en: "Structured review: bugs, security, performance, readability, each with severity.",
    },
    description: {
      fa: "کد را مثل یک مهندس ارشد بازبینی می‌کند: اول ریسک‌های امنیتی (تزریق، احراز هویت، نشت داده)، بعد باگ‌ها، کارایی و خوانایی. هر یافته شماره‌ی خط، شدت و پیشنهاد اصلاح دارد.",
      ar: "يراجع الكود كمهندس أول: المخاطر الأمنية أولاً (الحقن، المصادقة، تسرّب البيانات)، ثم الأخطاء والأداء والوضوح. لكل ملاحظة رقم سطر ودرجة خطورة واقتراح إصلاح.",
      en: "Reviews code like a senior engineer: security risks first (injection, auth, data leaks), then bugs, performance and readability. Every finding has a line number, severity and a suggested fix.",
    },
    example: {
      fa: "🔴 تزریق SQL در خط ۴۲ · 🟠 کوئری N+1 · 🟢 نام‌گذاری خوب",
      ar: "🔴 حقن SQL في السطر ٤٢ · 🟠 استعلام N+1 · 🟢 تسمية جيدة",
      en: "🔴 SQL injection on line 42 · 🟠 N+1 query · 🟢 clear naming",
    },
    preview: {
      fa: "نقش: مهندس ارشد {{language}} و متخصص امنیت برنامه‌های وب…",
      ar: "الدور: مهندس {{language}} أول ومتخصص في أمان تطبيقات الويب…",
      en: "Role: senior {{language}} engineer and web application security specialist…",
    },
    body: {
      fa: `نقش: مهندس ارشد {{language}} و متخصص امنیت برنامه‌های وب.
وظیفه: کد زیر را بازبینی کن. زمینه: {{context}}.
ترتیب بررسی:
1. امنیت (تزریق، احراز هویت و مجوز، نشت داده، اسرار در کد)
2. باگ‌ها و حالت‌های مرزی
3. کارایی (کوئری N+1، حلقه‌های تکراری، حافظه)
4. خوانایی و نام‌گذاری
خروجی: جدول با ستون‌های «خط»، «شدت 🔴🟠🟢»، «مشکل»، «اصلاح پیشنهادی».
قانون: چیزی را که مطمئن نیستی با «احتمالی» علامت بزن. کد را بازنویسی کامل نکن.
کد:
{{code}}`,
      ar: `الدور: مهندس {{language}} أول ومتخصص في أمان تطبيقات الويب.
المهمة: راجع الكود التالي. السياق: {{context}}.
ترتيب المراجعة:
1. الأمان (الحقن، المصادقة والصلاحيات، تسرّب البيانات، الأسرار داخل الكود)
2. الأخطاء والحالات الحدّية
3. الأداء (استعلامات N+1، الحلقات المكررة، الذاكرة)
4. الوضوح والتسمية
المخرجات: جدول بأعمدة «السطر» و«الخطورة 🔴🟠🟢» و«المشكلة» و«الإصلاح المقترح».
القاعدة: علّم ما لست متأكداً منه بكلمة «محتمل». لا تُعِد كتابة الكود كاملاً.
الكود:
{{code}}`,
      en: `Role: senior {{language}} engineer and web application security specialist.
Task: review the code below. Context: {{context}}.
Review order:
1. Security (injection, authn/authz, data leaks, secrets in code)
2. Bugs and edge cases
3. Performance (N+1 queries, repeated loops, memory)
4. Readability and naming
Output: a table with "Line", "Severity 🔴🟠🟢", "Issue", "Suggested fix".
Rule: mark anything you are unsure of as "possible". Do not rewrite the whole file.
Code:
{{code}}`,
    },
    variables: [
      {
        name: "language",
        type: "select",
        required: true,
        label: { fa: "زبان", ar: "اللغة", en: "Language" },
        options: {
          fa: ["TypeScript", "Python", "Go", "PHP"],
          ar: ["TypeScript", "Python", "Go", "PHP"],
          en: ["TypeScript", "Python", "Go", "PHP"],
        },
      },
      {
        name: "context",
        type: "text",
        required: false,
        label: { fa: "زمینه", ar: "السياق", en: "Context" },
        default: { fa: "API پرداخت فروشگاه", ar: "واجهة دفع لمتجر", en: "a shop payment API" },
      },
      {
        name: "code",
        type: "text",
        required: true,
        label: { fa: "کد", ar: "الكود", en: "Code" },
        default: {
          fa: "(کد را اینجا بچسبانید)",
          ar: "(الصق الكود هنا)",
          en: "(paste your code here)",
        },
      },
    ],
  },
  {
    id: "p-0004",
    slug: "meeting-notes-summary",
    type: "text",
    tier: "free",
    category: "business",
    models: ["Claude", "GPT", "Gemini", "DeepSeek"],
    score: 88,
    breakdown: q(90, 88, 87, 89, 86),
    version: "1.3",
    testedAt: "2026-10-01",
    createdAt: "2026-01-18",
    priceToman: null,
    priceStars: null,
    popularity: 71,
    tags: ["meeting", "صورت‌جلسه", "محضر", "summary", "action items"],
    title: {
      fa: "صورت‌جلسه و اقدام‌های بعدی",
      ar: "محضر الاجتماع والمهام التالية",
      en: "Meeting minutes and next actions",
    },
    summary: {
      fa: "متن خام جلسه را به تصمیم‌ها، مسئول‌ها و مهلت‌ها تبدیل می‌کند.",
      ar: "يحوّل نص الاجتماع الخام إلى قرارات ومسؤولين ومواعيد نهائية.",
      en: "Turns a raw meeting transcript into decisions, owners and deadlines.",
    },
    description: {
      fa: "متن پیاده‌شده یا یادداشت‌های پراکنده را بدهید؛ خروجی یک صورت‌جلسه‌ی تمیز است با تصمیم‌ها، کارهای باز با نام مسئول و مهلت، و سؤال‌هایی که بی‌جواب ماندند.",
      ar: "أعطه نصاً مفرَّغاً أو ملاحظات متفرقة؛ وستحصل على محضر نظيف بالقرارات والمهام المفتوحة مع المسؤول والموعد، والأسئلة التي بقيت دون إجابة.",
      en: "Give it a transcript or scattered notes; get clean minutes with decisions, open tasks with owner and deadline, and the questions left unanswered.",
    },
    example: {
      fa: "✅ تصمیم: لانچ به ۱۵ آبان منتقل شد · 📌 سارا: نسخه‌ی نهایی قیمت‌ها تا یکشنبه",
      ar: "✅ القرار: تأجيل الإطلاق إلى ٦ نوفمبر · 📌 سارة: الأسعار النهائية قبل الأحد",
      en: "✅ Decision: launch moved to Nov 6 · 📌 Sara: final pricing by Sunday",
    },
    preview: {
      fa: "نقش: دبیر جلسه‌ی دقیق و بی‌طرف…",
      ar: "الدور: أمين اجتماع دقيق ومحايد…",
      en: "Role: a precise, neutral meeting secretary…",
    },
    body: {
      fa: `نقش: دبیر جلسه‌ی دقیق و بی‌طرف.
ورودی: متن جلسه‌ی «{{meeting}}» در ادامه.
خروجی به این ترتیب:
1. خلاصه در ۳ جمله
2. تصمیم‌ها (فقط آنچه صریحاً توافق شد)
3. اقدام‌ها: جدول «کار، مسئول، مهلت» — اگر مهلت گفته نشده بنویس «نامشخص»
4. سؤال‌های باز
قانون: چیزی از خودت اضافه نکن. لحن: {{tone}}.
متن:
{{transcript}}`,
      ar: `الدور: أمين اجتماع دقيق ومحايد.
المدخل: نص اجتماع «{{meeting}}» أدناه.
المخرجات بهذا الترتيب:
1. ملخص في ٣ جمل
2. القرارات (ما اتُّفق عليه صراحة فقط)
3. المهام: جدول «المهمة، المسؤول، الموعد» — إن لم يُذكر موعد فاكتب «غير محدد»
4. الأسئلة المفتوحة
القاعدة: لا تُضف شيئاً من عندك. النبرة: {{tone}}.
النص:
{{transcript}}`,
      en: `Role: a precise, neutral meeting secretary.
Input: the transcript of "{{meeting}}" below.
Output in this order:
1. Summary in 3 sentences
2. Decisions (only what was explicitly agreed)
3. Actions: a "Task, Owner, Deadline" table; write "unspecified" if no deadline was given
4. Open questions
Rule: add nothing of your own. Tone: {{tone}}.
Transcript:
{{transcript}}`,
    },
    variables: [
      {
        name: "meeting",
        type: "text",
        required: true,
        label: { fa: "نام جلسه", ar: "اسم الاجتماع", en: "Meeting" },
        default: {
          fa: "جلسه‌ی هفتگی محصول",
          ar: "اجتماع المنتج الأسبوعي",
          en: "weekly product sync",
        },
      },
      {
        name: "tone",
        type: "select",
        required: true,
        label: { fa: "لحن", ar: "النبرة", en: "Tone" },
        options: {
          fa: ["رسمی", "خودمانی"],
          ar: ["رسمية", "ودّية"],
          en: ["formal", "casual"],
        },
      },
      {
        name: "transcript",
        type: "text",
        required: true,
        label: { fa: "متن جلسه", ar: "نص الاجتماع", en: "Transcript" },
        default: {
          fa: "(متن را اینجا بچسبانید)",
          ar: "(الصق النص هنا)",
          en: "(paste the transcript here)",
        },
      },
    ],
  },
  {
    id: "p-0005",
    slug: "midjourney-prompt-translator",
    type: "image",
    tier: "free",
    category: "design",
    models: ["Midjourney", "Flux", "Claude"],
    score: 89,
    breakdown: q(90, 88, 89, 93, 87),
    version: "2.0",
    testedAt: "2026-10-04",
    createdAt: "2026-05-09",
    priceToman: null,
    priceStars: null,
    popularity: 90,
    tags: ["midjourney", "translate", "ترجمه", "ترجمة", "flux"],
    title: {
      fa: "مترجم ایده‌ی فارسی به پرامپت Midjourney",
      ar: "مترجم الفكرة العربية إلى برومبت Midjourney",
      en: "Idea-to-Midjourney prompt translator",
    },
    summary: {
      fa: "ایده‌ات را فارسی بنویس؛ پرامپت انگلیسی دقیق با سبک، نور، لنز و نسبت تصویر بگیر.",
      ar: "اكتب فكرتك بالعربية؛ واحصل على برومبت إنجليزي دقيق بالأسلوب والإضاءة والعدسة ونسبة الصورة.",
      en: "Describe an idea in any language; get a precise English prompt with style, light, lens and aspect ratio.",
    },
    description: {
      fa: "مدل‌های تصویری انگلیسی را بهتر می‌فهمند. این پرامپت توصیف فارسی شما را به ساختار استاندارد «سوژه، محیط، سبک، نور، دوربین، پارامتر» تبدیل می‌کند و سه نسخه با شدت خلاقیت متفاوت می‌دهد.",
      ar: "تفهم نماذج الصور الإنجليزية بشكل أفضل. يحوّل هذا البرومبت وصفك إلى البنية القياسية «الموضوع، البيئة، الأسلوب، الإضاءة، الكاميرا، المعاملات» ويعطيك ثلاث نسخ بدرجات إبداع مختلفة.",
      en: "Image models understand English best. This converts your description into the standard subject, setting, style, light, camera, parameters structure and returns three variants at different creativity levels.",
    },
    example: {
      fa: "a lone tea house on a misty Gilan hillside, dawn, cinematic, 35mm, soft rim light --ar 4:5 --style raw",
      ar: "a lone tea house on a misty hillside, dawn, cinematic, 35mm, soft rim light --ar 4:5 --style raw",
      en: "a lone tea house on a misty hillside, dawn, cinematic, 35mm, soft rim light --ar 4:5 --style raw",
    },
    preview: {
      fa: "نقش: کارگردان هنری و متخصص پرامپت مدل‌های تصویری…",
      ar: "الدور: مدير فني ومتخصص في برومبتات نماذج الصور…",
      en: "Role: art director and image-model prompt specialist…",
    },
    body: {
      fa: `نقش: کارگردان هنری و متخصص پرامپت مدل‌های تصویری.
ایده‌ی من (فارسی): {{idea}}
سبک دلخواه: {{style}} · نسبت تصویر: {{ratio}}
وظیفه: سه پرامپت انگلیسی بنویس با ساختار:
subject, setting, style, lighting, camera/lens, mood, parameters
- نسخه‌ی ۱ وفادار، نسخه‌ی ۲ سینمایی، نسخه‌ی ۳ جسورانه
- از نام هنرمندان زنده استفاده نکن
- پارامترهای Midjourney را آخر هر خط بیاور
خروجی: فقط سه خط پرامپت، بدون توضیح.`,
      ar: `الدور: مدير فني ومتخصص في برومبتات نماذج الصور.
فكرتي (بالعربية): {{idea}}
الأسلوب المطلوب: {{style}} · نسبة الصورة: {{ratio}}
المهمة: اكتب ثلاثة برومبتات بالإنجليزية بالبنية:
subject, setting, style, lighting, camera/lens, mood, parameters
- النسخة ١ وفيّة، النسخة ٢ سينمائية، النسخة ٣ جريئة
- لا تستخدم أسماء فنانين أحياء
- ضع معاملات Midjourney في نهاية كل سطر
المخرجات: ثلاثة أسطر برومبت فقط، بلا شرح.`,
      en: `Role: art director and image-model prompt specialist.
My idea: {{idea}}
Preferred style: {{style}} · aspect ratio: {{ratio}}
Task: write three English prompts structured as:
subject, setting, style, lighting, camera/lens, mood, parameters
- variant 1 faithful, variant 2 cinematic, variant 3 bold
- never use the names of living artists
- put Midjourney parameters at the end of each line
Output: only the three prompt lines, no commentary.`,
    },
    variables: [
      {
        name: "idea",
        type: "text",
        required: true,
        label: { fa: "ایده", ar: "الفكرة", en: "Idea" },
        default: {
          fa: "چایخانه‌ای تنها روی تپه‌ای مه‌آلود در گیلان، سپیده‌دم",
          ar: "مقهى شاي وحيد على تلّة يكسوها الضباب عند الفجر",
          en: "a lone tea house on a misty hillside at dawn",
        },
      },
      {
        name: "style",
        type: "select",
        required: true,
        label: { fa: "سبک", ar: "الأسلوب", en: "Style" },
        options: {
          fa: ["عکاسی سینمایی", "مینیاتور ایرانی", "تصویرسازی تخت"],
          ar: ["تصوير سينمائي", "منمنمات شرقية", "رسم مسطّح"],
          en: ["cinematic photo", "Persian miniature", "flat illustration"],
        },
      },
      {
        name: "ratio",
        type: "select",
        required: true,
        label: { fa: "نسبت", ar: "النسبة", en: "Ratio" },
        options: {
          fa: ["4:5", "16:9", "1:1"],
          ar: ["4:5", "16:9", "1:1"],
          en: ["4:5", "16:9", "1:1"],
        },
      },
    ],
  },
  {
    id: "p-0006",
    slug: "resume-bullet-rewriter",
    type: "text",
    tier: "free",
    category: "business",
    models: ["Claude", "GPT"],
    score: 87,
    breakdown: q(89, 86, 88, 85, 90),
    version: "1.0",
    testedAt: "2026-09-27",
    createdAt: "2026-06-14",
    priceToman: null,
    priceStars: null,
    popularity: 66,
    tags: ["resume", "رزومه", "السيرة الذاتية", "cv", "linkedin"],
    title: {
      fa: "بازنویسی رزومه با عدد و نتیجه",
      ar: "إعادة كتابة السيرة الذاتية بالأرقام والنتائج",
      en: "Résumé bullets with numbers and results",
    },
    summary: {
      fa: "شرح وظایف را به دستاوردهای قابل‌اندازه‌گیری با فعل قوی تبدیل می‌کند.",
      ar: "يحوّل وصف المهام إلى إنجازات قابلة للقياس بأفعال قوية.",
      en: "Turns duty lists into measurable achievements with strong verbs.",
    },
    description: {
      fa: "هر خط رزومه را با فرمول «فعل + کار + عدد + نتیجه» بازنویسی می‌کند، برای آگهی شغلی هدف کلیدواژه می‌گذارد و جاهایی که عدد ندارید سؤال می‌پرسد تا چیزی ساختگی ننویسد.",
      ar: "يعيد كتابة كل سطر بصيغة «فعل + مهمة + رقم + نتيجة»، ويضيف الكلمات المفتاحية للوظيفة المستهدفة، ويسأل حين تغيب الأرقام كي لا يختلق شيئاً.",
      en: "Rewrites each line as verb + task + number + result, adds keywords for the target job ad, and asks where numbers are missing instead of inventing them.",
    },
    example: {
      fa: "«زمان پاسخ پشتیبانی را با بازطراحی صف تیکت از ۶ ساعت به ۴۰ دقیقه رساندم.»",
      ar: "«خفّضت زمن الرد في الدعم من ٦ ساعات إلى ٤٠ دقيقة بإعادة تصميم طابور التذاكر.»",
      en: '"Cut support response time from 6 hours to 40 minutes by redesigning the ticket queue."',
    },
    preview: {
      fa: "نقش: مشاور استخدام و نویسنده‌ی رزومه برای موقعیت {{role}}…",
      ar: "الدور: مستشار توظيف وكاتب سير ذاتية لوظيفة {{role}}…",
      en: "Role: recruiter and résumé writer for a {{role}} position…",
    },
    body: {
      fa: `نقش: مشاور استخدام و نویسنده‌ی رزومه برای موقعیت {{role}}.
ورودی: خط‌های فعلی رزومه‌ی من در ادامه.
وظیفه: هر خط را با فرمول «فعل قوی + کار + عدد + نتیجه» بازنویسی کن.
- اگر عدد ندارم، یک سؤال مشخص بپرس؛ عدد نساز
- کلیدواژه‌های مهم آگهی را طبیعی وارد کن: {{keywords}}
- هر خط حداکثر ۲۵ کلمه
خروجی: جدول «قبل، بعد، سؤال (در صورت نیاز)».
خط‌ها:
{{bullets}}`,
      ar: `الدور: مستشار توظيف وكاتب سير ذاتية لوظيفة {{role}}.
المدخل: أسطر سيرتي الحالية أدناه.
المهمة: أعد كتابة كل سطر بصيغة «فعل قوي + مهمة + رقم + نتيجة».
- إن لم يكن لديّ رقم فاطرح سؤالاً محدداً؛ لا تختلق أرقاماً
- أدرج الكلمات المفتاحية للإعلان بشكل طبيعي: {{keywords}}
- ٢٥ كلمة كحد أقصى لكل سطر
المخرجات: جدول «قبل، بعد، سؤال (عند الحاجة)».
الأسطر:
{{bullets}}`,
      en: `Role: recruiter and résumé writer for a {{role}} position.
Input: my current résumé lines below.
Task: rewrite each line as strong verb + task + number + result.
- if I have no number, ask one specific question; never invent numbers
- weave in the key terms from the job ad naturally: {{keywords}}
- 25 words max per line
Output: a "Before, After, Question (if needed)" table.
Lines:
{{bullets}}`,
    },
    variables: [
      {
        name: "role",
        type: "text",
        required: true,
        label: { fa: "موقعیت شغلی", ar: "الوظيفة", en: "Role" },
        default: { fa: "مدیر محصول", ar: "مدير منتج", en: "product manager" },
      },
      {
        name: "keywords",
        type: "text",
        required: false,
        label: { fa: "کلیدواژه‌ها", ar: "الكلمات المفتاحية", en: "Keywords" },
        default: {
          fa: "رشد، داده‌محور، OKR",
          ar: "النمو، البيانات، OKR",
          en: "growth, data-driven, OKRs",
        },
      },
      {
        name: "bullets",
        type: "text",
        required: true,
        label: { fa: "خط‌های رزومه", ar: "أسطر السيرة", en: "Résumé lines" },
        default: {
          fa: "(خط‌ها را اینجا بچسبانید)",
          ar: "(الصق الأسطر هنا)",
          en: "(paste your lines here)",
        },
      },
    ],
  },
  {
    id: "p-0007",
    slug: "sql-query-explainer",
    type: "code",
    tier: "free",
    category: "code",
    models: ["Claude", "GPT", "DeepSeek"],
    score: 85,
    breakdown: q(87, 86, 84, 80, 89),
    version: "1.0",
    testedAt: "2026-09-25",
    createdAt: "2026-07-01",
    priceToman: null,
    priceStars: null,
    popularity: 58,
    tags: ["sql", "postgres", "query", "index"],
    title: {
      fa: "توضیح و بهینه‌سازی کوئری SQL",
      ar: "شرح استعلامات SQL وتحسينها",
      en: "Explain and optimise a SQL query",
    },
    summary: {
      fa: "کوئری را خط‌به‌خط توضیح می‌دهد، گلوگاه را پیدا می‌کند و ایندکس پیشنهاد می‌دهد.",
      ar: "يشرح الاستعلام سطراً بسطر، ويحدد الاختناق ويقترح الفهارس.",
      en: "Explains a query line by line, finds the bottleneck and proposes indexes.",
    },
    description: {
      fa: "برای توسعه‌دهنده‌ها و تحلیلگرهایی که با PostgreSQL یا MySQL کار می‌کنند: توضیح ساده، ریسک‌های عملکردی، نسخه‌ی بهینه و ایندکس‌های لازم — همه با فرض اندازه‌ی جدولی که شما می‌دهید.",
      ar: "للمطورين والمحللين على PostgreSQL أو MySQL: شرح مبسّط ومخاطر الأداء ونسخة محسّنة والفهارس اللازمة، وفق حجم الجداول الذي تحدده.",
      en: "For developers and analysts on PostgreSQL or MySQL: a plain explanation, performance risks, an optimised version and the indexes needed, all sized to the table volumes you give.",
    },
    example: {
      fa: "گلوگاه: Seq Scan روی orders (۱۲M ردیف) ← ایندکس (user_id, created_at DESC)",
      ar: "الاختناق: Seq Scan على orders (١٢ مليون صف) ← فهرس (user_id, created_at DESC)",
      en: "Bottleneck: Seq Scan on orders (12M rows) → index (user_id, created_at DESC)",
    },
    preview: {
      fa: "نقش: DBA ارشد {{engine}}…",
      ar: "الدور: مسؤول قواعد بيانات أول لـ {{engine}}…",
      en: "Role: senior {{engine}} DBA…",
    },
    body: {
      fa: `نقش: DBA ارشد {{engine}}.
اندازه‌ی تقریبی جدول‌ها: {{volume}}
وظیفه برای کوئری زیر:
1. توضیح خط‌به‌خط به زبان ساده
2. گلوگاه‌های احتمالی (اسکن کامل، join پرهزینه، sort روی دیسک)
3. نسخه‌ی بازنویسی‌شده با همان خروجی
4. ایندکس‌های پیشنهادی با دستور CREATE INDEX
قانون: اگر برای قضاوت به EXPLAIN نیاز داری، بگو دقیقاً چه چیزی را اجرا کنم.
کوئری:
{{query}}`,
      ar: `الدور: مسؤول قواعد بيانات أول لـ {{engine}}.
الحجم التقريبي للجداول: {{volume}}
المهمة للاستعلام التالي:
1. شرح سطراً بسطر بلغة بسيطة
2. الاختناقات المحتملة (مسح كامل، ربط مكلف، فرز على القرص)
3. نسخة معاد كتابتها بالنتيجة نفسها
4. الفهارس المقترحة مع أوامر CREATE INDEX
القاعدة: إن احتجت EXPLAIN للحكم، فأخبرني بالضبط بما أشغّله.
الاستعلام:
{{query}}`,
      en: `Role: senior {{engine}} DBA.
Approximate table sizes: {{volume}}
Task for the query below:
1. Line-by-line explanation in plain language
2. Likely bottlenecks (full scans, costly joins, on-disk sorts)
3. A rewritten version with identical output
4. Suggested indexes as CREATE INDEX statements
Rule: if you need EXPLAIN to judge, tell me exactly what to run.
Query:
{{query}}`,
    },
    variables: [
      {
        name: "engine",
        type: "select",
        required: true,
        label: { fa: "پایگاه‌داده", ar: "قاعدة البيانات", en: "Database" },
        options: {
          fa: ["PostgreSQL", "MySQL", "SQL Server"],
          ar: ["PostgreSQL", "MySQL", "SQL Server"],
          en: ["PostgreSQL", "MySQL", "SQL Server"],
        },
      },
      {
        name: "volume",
        type: "text",
        required: false,
        label: { fa: "حجم داده", ar: "حجم البيانات", en: "Data volume" },
        default: {
          fa: "orders حدود ۱۲ میلیون ردیف",
          ar: "orders نحو ١٢ مليون صف",
          en: "orders ~12M rows",
        },
      },
      {
        name: "query",
        type: "text",
        required: true,
        label: { fa: "کوئری", ar: "الاستعلام", en: "Query" },
        default: {
          fa: "(کوئری را اینجا بچسبانید)",
          ar: "(الصق الاستعلام هنا)",
          en: "(paste your query here)",
        },
      },
    ],
  },

  // ───────────────────────────── PRO ─────────────────────────────
  {
    id: "p-0101",
    slug: "minimal-logo-persian-motifs",
    type: "image",
    tier: "pro",
    category: "design",
    models: ["Midjourney", "Flux"],
    score: 89,
    breakdown: q(90, 88, 87, 94, 90),
    version: "2.1",
    testedAt: "2026-10-02",
    createdAt: "2026-03-30",
    priceToman: 79000,
    priceStars: 90,
    popularity: 88,
    tags: ["logo", "لوگو", "شعار", "girih", "branding"],
    title: {
      fa: "لوگوی مینیمال با هویت ایرانی",
      ar: "شعار بسيط بهوية شرقية",
      en: "Minimal logo with Persian motifs",
    },
    summary: {
      fa: "لوگوی برداری با الهام از گره‌چینی و خوشنویسی، در سه سبک قابل انتخاب.",
      ar: "شعار متجهي مستوحى من الزخارف الهندسية والخط، بثلاثة أنماط.",
      en: "Vector logo inspired by girih patterns and calligraphy, in three selectable styles.",
    },
    description: {
      fa: "یک سیستم پرامپت برای ساخت نشان برند با ریشه‌ی ایرانی و اجرای مدرن: گره‌چینی ساده‌شده، حروف‌نگاری الهام‌گرفته از کوفی بنایی و پالت محدود. خروجی‌ها روی پس‌زمینه‌ی تخت و آماده‌ی بردارسازی‌اند.",
      ar: "منظومة برومبت لصناعة شعار بجذور شرقية وتنفيذ حديث: زخرفة هندسية مبسّطة وحروف مستوحاة من الكوفي المعماري ولوحة ألوان محدودة. النتائج على خلفية مسطحة وجاهزة للتحويل المتجهي.",
      en: "A prompt system for brand marks with Persian roots and modern execution: simplified girih, lettering inspired by square Kufic, and a restrained palette. Outputs sit on flat backgrounds, ready to vectorise.",
    },
    example: {
      fa: "سه نسخه: خطی طلایی روی لاجوردی، تک‌رنگ، و نشان مربعی برای آیکون اپ.",
      ar: "ثلاث نسخ: خطي ذهبي على لازوردي، أحادي اللون، وأيقونة مربعة للتطبيق.",
      en: "Three versions: gold line on lapis, monochrome, and a square app-icon mark.",
    },
    preview: {
      fa: "نقش: طراح هویت بصری با تخصص نقوش ایرانی.\nبرند: {{brand}} · حوزه: {{industry}}\nاصول: نشان باید در ۱۶ پیکسل هم خوانا بماند…",
      ar: "الدور: مصمم هوية بصرية متخصص في الزخارف الشرقية.\nالعلامة: {{brand}} · المجال: {{industry}}\nالمبادئ: يجب أن يبقى الشعار مقروءاً حتى بحجم ١٦ بكسل…",
      en: "Role: identity designer specialising in Persian motifs.\nBrand: {{brand}} · field: {{industry}}\nPrinciples: the mark must stay legible at 16px…",
    },
    variables: [
      {
        name: "brand",
        type: "text",
        required: true,
        label: { fa: "نام برند", ar: "اسم العلامة", en: "Brand name" },
      },
      {
        name: "industry",
        type: "text",
        required: true,
        label: { fa: "حوزه", ar: "المجال", en: "Industry" },
      },
      {
        name: "style",
        type: "select",
        required: true,
        label: { fa: "سبک", ar: "الأسلوب", en: "Style" },
      },
    ],
  },
  {
    id: "p-0102",
    slug: "cold-b2b-sales-email",
    type: "text",
    tier: "pro",
    category: "marketing",
    models: ["Claude", "GPT"],
    score: 90,
    breakdown: q(92, 90, 89, 88, 91),
    version: "1.2",
    testedAt: "2026-09-28",
    createdAt: "2026-02-11",
    priceToman: 59000,
    priceStars: 70,
    popularity: 80,
    tags: ["email", "ایمیل", "بريد", "b2b", "outreach"],
    title: { fa: "ایمیل فروش سرد B2B", ar: "بريد مبيعات بارد B2B", en: "Cold B2B sales email" },
    summary: {
      fa: "دنباله‌ی ۳ ایمیلی شخصی‌سازی‌شده با موضوع، شخصی‌سازی و پیگیری.",
      ar: "سلسلة من ٣ رسائل مخصّصة مع عنوان وتخصيص ومتابعة.",
      en: "A personalised 3-email sequence with subject lines and follow-ups.",
    },
    description: {
      fa: "دنباله‌ای سه‌مرحله‌ای که از یک مشاهده‌ی واقعی درباره‌ی شرکت مخاطب شروع می‌کند، یک مسئله‌ی مشخص را نام می‌برد و فقط یک درخواست کوچک دارد. شامل ۵ موضوع ایمیل برای تست A/B.",
      ar: "سلسلة من ثلاث مراحل تبدأ بملاحظة حقيقية عن شركة المستلم، وتسمّي مشكلة محددة، ولا تطلب إلا طلباً صغيراً واحداً. تتضمن ٥ عناوين لاختبار A/B.",
      en: "A three-step sequence that opens with a real observation about the prospect's company, names one specific problem and makes one small ask. Includes 5 subject lines for A/B testing.",
    },
    example: {
      fa: "موضوع: «۱۵ دقیقه برای کاهش ۲۰٪ هزینه‌ی انبار شما؟»",
      ar: "الموضوع: «١٥ دقيقة لخفض تكلفة مستودعك ٢٠٪؟»",
      en: 'Subject: "15 minutes to cut your warehouse costs by 20%?"',
    },
    preview: {
      fa: "نقش: SDR ارشد با نرخ پاسخ بالای ۱۲٪.\nمحصول ما: {{product}} · مخاطب: {{persona}}…",
      ar: "الدور: مندوب تطوير مبيعات أول بمعدل ردود يفوق ١٢٪.\nمنتجنا: {{product}} · المستلم: {{persona}}…",
      en: "Role: senior SDR with a 12%+ reply rate.\nOur product: {{product}} · prospect: {{persona}}…",
    },
    variables: [
      {
        name: "product",
        type: "text",
        required: true,
        label: { fa: "محصول", ar: "المنتج", en: "Product" },
      },
      {
        name: "persona",
        type: "text",
        required: true,
        label: { fa: "مخاطب", ar: "المستلم", en: "Persona" },
      },
      {
        name: "proof",
        type: "text",
        required: false,
        label: { fa: "شاهد موفقیت", ar: "دليل نجاح", en: "Proof point" },
      },
    ],
  },
  {
    id: "p-0103",
    slug: "reels-30s-script",
    type: "video",
    tier: "pro",
    category: "video",
    models: ["Claude", "GPT", "Gemini"],
    score: 87,
    breakdown: q(88, 86, 85, 90, 88),
    version: "1.3",
    testedAt: "2026-10-01",
    createdAt: "2026-04-21",
    priceToman: 69000,
    priceStars: 80,
    popularity: 86,
    tags: ["reels", "ریلز", "ريلز", "tiktok", "shorts"],
    title: {
      fa: "سناریوی ریلز ۳۰ ثانیه‌ای",
      ar: "سيناريو ريلز ٣٠ ثانية",
      en: "30-second Reels script",
    },
    summary: {
      fa: "قلاب ۳ ثانیه‌ی اول، شات‌لیست، متن روی تصویر و موزیک پیشنهادی.",
      ar: "خطّاف أول ٣ ثوانٍ، قائمة لقطات، نص على الشاشة وموسيقى مقترحة.",
      en: "3-second hook, shot list, on-screen text and a suggested track.",
    },
    description: {
      fa: "سناریوی کامل یک ریلز فروش: سه قلاب جایگزین، شات‌لیست ثانیه‌به‌ثانیه، متن روی تصویر کوتاه، صداگذاری و CTA پایانی. برای فیلم‌برداری با موبایل طراحی شده.",
      ar: "سيناريو كامل لريلز بيعي: ثلاثة خطّافات بديلة، قائمة لقطات بالثانية، نص قصير على الشاشة، تعليق صوتي ودعوة ختامية. مصمم للتصوير بالهاتف.",
      en: "A complete sales Reel: three alternative hooks, a second-by-second shot list, short on-screen text, voice-over and a closing CTA. Designed for phone shooting.",
    },
    example: {
      fa: "شات ۱: دست‌ها قهوه را می‌ریزند — متن: «صبحت را جدی بگیر»",
      ar: "اللقطة ١: يدان تسكبان القهوة — النص: «خذ صباحك بجدية»",
      en: 'Shot 1: hands pour coffee. Text: "Take your morning seriously"',
    },
    preview: {
      fa: "نقش: کارگردان محتوای کوتاه با تجربه‌ی برندهای مصرفی.\nمحصول: {{product}} · هدف: {{goal}}…",
      ar: "الدور: مخرج محتوى قصير بخبرة في العلامات الاستهلاكية.\nالمنتج: {{product}} · الهدف: {{goal}}…",
      en: "Role: short-form director with consumer-brand experience.\nProduct: {{product}} · goal: {{goal}}…",
    },
    variables: [
      {
        name: "product",
        type: "text",
        required: true,
        label: { fa: "محصول", ar: "المنتج", en: "Product" },
      },
      { name: "goal", type: "text", required: true, label: { fa: "هدف", ar: "الهدف", en: "Goal" } },
    ],
  },
  {
    id: "p-0104",
    slug: "seasonal-campaign-planner",
    type: "text",
    tier: "pro",
    category: "marketing",
    models: ["Claude", "GPT"],
    score: 88,
    breakdown: q(89, 87, 86, 93, 88),
    version: "1.0",
    testedAt: "2026-10-07",
    createdAt: "2026-10-01",
    priceToman: 49000,
    priceStars: 60,
    popularity: 92,
    tags: ["yalda", "یلدا", "رمضان", "black friday", "campaign"],
    title: {
      fa: "کمپین مناسبتی (یلدا، نوروز، بلک‌فرایدی)",
      ar: "حملة موسمية (رمضان، اليوم الوطني، الجمعة البيضاء)",
      en: "Seasonal campaign (Black Friday, New Year)",
    },
    summary: {
      fa: "برنامه‌ی ۷ روزه‌ی محتوا و تخفیف، بومی‌شده برای هر مناسبت.",
      ar: "خطة محتوى وخصومات لـ٧ أيام، مُكيّفة لكل مناسبة.",
      en: "A 7-day content and discount plan adapted to each occasion.",
    },
    description: {
      fa: "تقویم هفت‌روزه‌ی کمپین با محتوای هر روز، کانال، پیشنهاد و پیام اضطرار — با رعایت حال‌وهوای فرهنگی هر مناسبت تا لحن تبلیغ با فضای آن روز جور باشد.",
      ar: "تقويم حملة لسبعة أيام بمحتوى كل يوم وقناته وعرضه ورسالة الإلحاح، مع مراعاة الأجواء الثقافية لكل مناسبة كي تنسجم النبرة مع روح اليوم.",
      en: "A seven-day campaign calendar with each day's content, channel, offer and urgency message, tuned to the cultural mood of each occasion so the tone fits the day.",
    },
    example: {
      fa: "روز ۱: شمارش معکوس · روز ۴: پیشنهاد ۲۴ ساعته · روز ۷: آخرین فرصت",
      ar: "اليوم ١: عدّ تنازلي · اليوم ٤: عرض ٢٤ ساعة · اليوم ٧: الفرصة الأخيرة",
      en: "Day 1: countdown · Day 4: 24-hour offer · Day 7: last chance",
    },
    preview: {
      fa: "نقش: مدیر کمپین با شناخت تقویم فرهنگی ایران.\nمناسبت: {{occasion}} · فروشگاه: {{shop}}…",
      ar: "الدور: مدير حملات يعرف التقويم الثقافي الخليجي.\nالمناسبة: {{occasion}} · المتجر: {{shop}}…",
      en: "Role: campaign manager who knows the retail calendar.\nOccasion: {{occasion}} · shop: {{shop}}…",
    },
    variables: [
      {
        name: "occasion",
        type: "select",
        required: true,
        label: { fa: "مناسبت", ar: "المناسبة", en: "Occasion" },
      },
      {
        name: "shop",
        type: "text",
        required: true,
        label: { fa: "فروشگاه", ar: "المتجر", en: "Shop" },
      },
      {
        name: "discount",
        type: "number",
        required: false,
        label: { fa: "سقف تخفیف", ar: "سقف الخصم", en: "Max discount" },
      },
    ],
  },
  {
    id: "p-0105",
    slug: "seo-article-eeat",
    type: "text",
    tier: "pro",
    category: "content",
    models: ["Claude", "GPT"],
    score: 89,
    breakdown: q(90, 89, 88, 90, 89),
    version: "2.0",
    testedAt: "2026-10-04",
    createdAt: "2026-01-09",
    priceToman: 79000,
    priceStars: 90,
    popularity: 83,
    tags: ["seo", "سئو", "article", "مقاله", "مقال"],
    title: {
      fa: "مقاله‌ی سئو با ساختار E-E-A-T",
      ar: "مقال SEO بهيكل E-E-A-T",
      en: "SEO article with E-E-A-T structure",
    },
    summary: {
      fa: "تحقیق کلیدواژه، سرفصل‌ها، FAQ و اسکیما، با لحن انسانی.",
      ar: "بحث الكلمات المفتاحية والعناوين والأسئلة الشائعة والمخطط بنبرة بشرية.",
      en: "Keyword research, outline, FAQ and schema, in a human tone.",
    },
    description: {
      fa: "از نیت جست‌وجو شروع می‌کند، ساختار H1 تا H3 می‌سازد، جای تجربه‌ی شخصی و منبع را مشخص می‌کند و FAQ و JSON-LD تحویل می‌دهد — بدون پرکردن صفحه با کلیدواژه.",
      ar: "يبدأ من نية البحث، ويبني هيكل H1 إلى H3، ويحدد مواضع التجربة الشخصية والمصادر، ويسلّم الأسئلة الشائعة وJSON-LD، دون حشو الكلمات المفتاحية.",
      en: "Starts from search intent, builds the H1–H3 structure, marks where first-hand experience and sources go, and delivers FAQ and JSON-LD, without keyword stuffing.",
    },
    example: {
      fa: "H1 + ۶ H2 + جدول مقایسه + ۵ سؤال پرتکرار + JSON-LD",
      ar: "H1 + ٦ H2 + جدول مقارنة + ٥ أسئلة شائعة + JSON-LD",
      en: "H1 + 6 H2s + comparison table + 5 FAQs + JSON-LD",
    },
    preview: {
      fa: "نقش: سردبیر سئو با تجربه‌ی بازار فارسی‌زبان.\nکلیدواژه‌ی اصلی: {{keyword}} · نیت: {{intent}}…",
      ar: "الدور: محرر SEO بخبرة في السوق العربية.\nالكلمة الرئيسية: {{keyword}} · النية: {{intent}}…",
      en: "Role: SEO editor with real market experience.\nPrimary keyword: {{keyword}} · intent: {{intent}}…",
    },
    variables: [
      {
        name: "keyword",
        type: "text",
        required: true,
        label: { fa: "کلیدواژه", ar: "الكلمة المفتاحية", en: "Keyword" },
      },
      {
        name: "intent",
        type: "select",
        required: true,
        label: { fa: "نیت جست‌وجو", ar: "نية البحث", en: "Search intent" },
      },
    ],
  },
  {
    id: "p-0106",
    slug: "youtube-video-outline",
    type: "video",
    tier: "pro",
    category: "video",
    models: ["Claude", "Gemini"],
    score: 86,
    breakdown: q(87, 85, 86, 88, 87),
    version: "1.1",
    testedAt: "2026-09-29",
    createdAt: "2026-05-22",
    priceToman: 59000,
    priceStars: 70,
    popularity: 62,
    tags: ["youtube", "یوتیوب", "يوتيوب", "aparat", "outline"],
    title: {
      fa: "ساختار ویدیوی آموزشی یوتیوب",
      ar: "هيكل فيديو تعليمي على يوتيوب",
      en: "YouTube tutorial outline",
    },
    summary: {
      fa: "عنوان، تامبنیل، قلاب، فصل‌بندی و متن توضیحات برای ویدیوی ۸ تا ۱۲ دقیقه‌ای.",
      ar: "عنوان وصورة مصغّرة وخطّاف وفصول ووصف لفيديو من ٨ إلى ١٢ دقيقة.",
      en: "Title, thumbnail, hook, chapters and description for an 8–12 minute video.",
    },
    description: {
      fa: "برای یوتیوب و آپارات: پنج عنوان رقیب، ایده‌ی تامبنیل، قلاب ۲۰ ثانیه‌ای، فصل‌بندی با زمان و توضیحات سئوشده. مناسب کانال‌های آموزشی و بررسی محصول.",
      ar: "ليوتيوب: خمسة عناوين متنافسة، وفكرة صورة مصغّرة، وخطّاف من ٢٠ ثانية، وفصول بتوقيتات، ووصف محسّن للبحث. مناسب للقنوات التعليمية ومراجعات المنتجات.",
      en: "Five competing titles, a thumbnail idea, a 20-second hook, timestamped chapters and an SEO description. Built for tutorial and review channels.",
    },
    example: {
      fa: "۰۰:۰۰ قلاب · ۰۰:۲۰ مشکل · ۰۲:۱۰ راه‌حل قدم‌به‌قدم · ۰۸:۳۰ جمع‌بندی",
      ar: "٠٠:٠٠ الخطّاف · ٠٠:٢٠ المشكلة · ٠٢:١٠ الحل خطوة بخطوة · ٠٨:٣٠ الخلاصة",
      en: "00:00 hook · 00:20 problem · 02:10 step-by-step fix · 08:30 recap",
    },
    preview: {
      fa: "نقش: استراتژیست محتوای یوتیوب.\nموضوع: {{topic}} · مخاطب: {{audience}}…",
      ar: "الدور: استراتيجي محتوى يوتيوب.\nالموضوع: {{topic}} · الجمهور: {{audience}}…",
      en: "Role: YouTube content strategist.\nTopic: {{topic}} · audience: {{audience}}…",
    },
    variables: [
      {
        name: "topic",
        type: "text",
        required: true,
        label: { fa: "موضوع", ar: "الموضوع", en: "Topic" },
      },
      {
        name: "audience",
        type: "text",
        required: true,
        label: { fa: "مخاطب", ar: "الجمهور", en: "Audience" },
      },
    ],
  },
  {
    id: "p-0107",
    slug: "ecommerce-product-description",
    type: "text",
    tier: "pro",
    category: "marketing",
    models: ["Claude", "GPT", "Gemini"],
    score: 88,
    breakdown: q(89, 88, 88, 90, 86),
    version: "1.5",
    testedAt: "2026-10-02",
    createdAt: "2026-02-02",
    priceToman: 39000,
    priceStars: 50,
    popularity: 79,
    tags: ["product description", "توضیحات محصول", "وصف المنتج", "digikala", "shop"],
    title: {
      fa: "توضیحات محصول فروشگاه اینترنتی",
      ar: "وصف منتج للمتجر الإلكتروني",
      en: "E-commerce product description",
    },
    summary: {
      fa: "توضیحات محصول با فایده‌محوری، جدول مشخصات و پاسخ به تردیدهای خریدار.",
      ar: "وصف منتج يركّز على الفوائد مع جدول مواصفات وردود على تردد المشتري.",
      en: "Benefit-led product copy with a spec table and answers to buyer doubts.",
    },
    description: {
      fa: "برای صفحه‌ی محصول فروشگاه‌های ایرانی و مارکت‌پلیس‌ها: عنوان سئوشده، پاراگراف فایده‌محور، بولت‌های کوتاه، جدول مشخصات و سه پاسخ به رایج‌ترین تردیدهای خرید.",
      ar: "لصفحات المنتجات في المتاجر والأسواق الإلكترونية: عنوان محسّن، فقرة تركّز على الفائدة، نقاط قصيرة، جدول مواصفات، وثلاث إجابات لأكثر مخاوف الشراء شيوعاً.",
      en: "For shop and marketplace product pages: an SEO title, a benefit-led paragraph, short bullets, a spec table and answers to the three most common purchase doubts.",
    },
    example: {
      fa: "«تا ۱۲ ساعت گرم نگه می‌دارد؛ از جلسه‌ی صبح تا کلاس عصر.»",
      ar: "«يحافظ على الحرارة حتى ١٢ ساعة؛ من اجتماع الصباح حتى درس المساء.»",
      en: '"Keeps drinks hot for 12 hours, from the morning meeting to the evening class."',
    },
    preview: {
      fa: "نقش: کپی‌رایتر تجارت الکترونیک.\nمحصول: {{product}} · ویژگی‌ها: {{specs}}…",
      ar: "الدور: كاتب محتوى للتجارة الإلكترونية.\nالمنتج: {{product}} · المواصفات: {{specs}}…",
      en: "Role: e-commerce copywriter.\nProduct: {{product}} · specs: {{specs}}…",
    },
    variables: [
      {
        name: "product",
        type: "text",
        required: true,
        label: { fa: "محصول", ar: "المنتج", en: "Product" },
      },
      {
        name: "specs",
        type: "text",
        required: true,
        label: { fa: "مشخصات", ar: "المواصفات", en: "Specs" },
      },
    ],
  },
  {
    id: "p-0108",
    slug: "react-component-generator",
    type: "code",
    tier: "pro",
    category: "code",
    models: ["Claude", "GPT"],
    score: 91,
    breakdown: q(92, 92, 90, 86, 93),
    version: "2.2",
    testedAt: "2026-10-06",
    createdAt: "2026-03-03",
    priceToman: 69000,
    priceStars: 80,
    popularity: 75,
    tags: ["react", "nextjs", "tailwind", "rtl", "component"],
    title: {
      fa: "تولید کامپوننت React با پشتیبانی RTL",
      ar: "توليد مكوّن React بدعم RTL",
      en: "RTL-ready React component generator",
    },
    summary: {
      fa: "کامپوننت تایپ‌اسکریپتی دسترس‌پذیر با Tailwind و ویژگی‌های منطقی برای فارسی و عربی.",
      ar: "مكوّن TypeScript سهل الوصول مع Tailwind وخصائص منطقية للعربية والفارسية.",
      en: "Accessible TypeScript components with Tailwind and logical properties for RTL.",
    },
    description: {
      fa: "کامپوننت‌هایی می‌سازد که از روز اول راست‌به‌چپ درست کار می‌کنند: فقط ویژگی‌های منطقی (ms/me/ps/pe)، نقش‌های ARIA، کنترل کیبورد، حالت تاریک و تست نمونه.",
      ar: "يبني مكوّنات تعمل من اليمين إلى اليسار من اليوم الأول: خصائص منطقية فقط، وأدوار ARIA، والتحكم بلوحة المفاتيح، والوضع الداكن، واختبار نموذجي.",
      en: "Builds components that work right-to-left from day one: logical properties only, ARIA roles, keyboard control, dark mode and a sample test.",
    },
    example: {
      fa: '<Stepper dir="rtl"> با aria-current، کلید‌های جهت‌دار معکوس در RTL و ۴ تست',
      ar: '<Stepper dir="rtl"> مع aria-current ومفاتيح أسهم معكوسة في RTL و٤ اختبارات',
      en: '<Stepper dir="rtl"> with aria-current, mirrored arrow keys in RTL and 4 tests',
    },
    preview: {
      fa: "نقش: مهندس ارشد فرانت‌اند و متخصص دسترس‌پذیری.\nکامپوننت: {{component}} · پشته: {{stack}}…",
      ar: "الدور: مهندس واجهات أول ومتخصص في سهولة الوصول.\nالمكوّن: {{component}} · التقنيات: {{stack}}…",
      en: "Role: senior front-end engineer and accessibility specialist.\nComponent: {{component}} · stack: {{stack}}…",
    },
    variables: [
      {
        name: "component",
        type: "text",
        required: true,
        label: { fa: "کامپوننت", ar: "المكوّن", en: "Component" },
      },
      {
        name: "stack",
        type: "select",
        required: true,
        label: { fa: "پشته", ar: "التقنيات", en: "Stack" },
      },
    ],
  },
  {
    id: "p-0109",
    slug: "brand-voice-guide",
    type: "text",
    tier: "pro",
    category: "content",
    models: ["Claude", "GPT"],
    score: 88,
    breakdown: q(90, 87, 89, 87, 87),
    version: "1.0",
    testedAt: "2026-09-24",
    createdAt: "2026-08-10",
    priceToman: 89000,
    priceStars: 100,
    popularity: 54,
    tags: ["brand voice", "لحن برند", "نبرة العلامة", "tone"],
    title: { fa: "راهنمای لحن برند", ar: "دليل نبرة العلامة التجارية", en: "Brand voice guide" },
    summary: {
      fa: "شخصیت برند، کلمات مجاز و ممنوع و نمونه‌ی «این‌طور بنویس، این‌طور ننویس».",
      ar: "شخصية العلامة والكلمات المسموحة والممنوعة وأمثلة «اكتب هكذا لا هكذا».",
      en: "Brand personality, do/don't words and 'write this, not that' examples.",
    },
    description: {
      fa: "از چند نمونه متن فعلی شما، لحن برند را استخراج می‌کند و یک راهنمای یک‌صفحه‌ای می‌سازد که تیم و هوش مصنوعی هر دو بتوانند از آن پیروی کنند.",
      ar: "يستخلص نبرة علامتك من نماذج نصوصك الحالية ويبني دليلاً من صفحة واحدة يستطيع الفريق والذكاء الاصطناعي اتباعه.",
      en: "Extracts your brand voice from a few existing texts and builds a one-page guide both your team and your AI tools can follow.",
    },
    example: {
      fa: "✅ «با هم درستش می‌کنیم» · ❌ «مشکل از سمت شماست»",
      ar: "✅ «سنصلحها معاً» · ❌ «المشكلة من جهتك»",
      en: '✅ "We\'ll fix it together" · ❌ "The issue is on your end"',
    },
    preview: {
      fa: "نقش: استراتژیست برند و ویراستار ارشد.\nبرند: {{brand}} · نمونه‌متن‌ها در ادامه…",
      ar: "الدور: استراتيجي علامة تجارية ومحرر أول.\nالعلامة: {{brand}} · النماذج أدناه…",
      en: "Role: brand strategist and senior editor.\nBrand: {{brand}} · samples below…",
    },
    variables: [
      {
        name: "brand",
        type: "text",
        required: true,
        label: { fa: "برند", ar: "العلامة", en: "Brand" },
      },
      {
        name: "samples",
        type: "text",
        required: true,
        label: { fa: "نمونه‌متن", ar: "نماذج", en: "Samples" },
      },
    ],
  },
  {
    id: "p-0110",
    slug: "linkedin-thought-leadership",
    type: "text",
    tier: "pro",
    category: "content",
    models: ["Claude", "GPT"],
    score: 86,
    breakdown: q(88, 85, 86, 85, 86),
    version: "1.1",
    testedAt: "2026-09-23",
    createdAt: "2026-06-03",
    priceToman: 49000,
    priceStars: 60,
    popularity: 57,
    tags: ["linkedin", "لینکدین", "لينكدإن", "post"],
    title: {
      fa: "پست تخصصی لینکدین",
      ar: "منشور خبرة على لينكدإن",
      en: "LinkedIn thought-leadership post",
    },
    summary: {
      fa: "از یک تجربه‌ی واقعی، پستی با قلاب، درس و سؤال پایانی می‌سازد.",
      ar: "يحوّل تجربة حقيقية إلى منشور بخطّاف ودرس وسؤال ختامي.",
      en: "Turns a real experience into a post with a hook, a lesson and a closing question.",
    },
    description: {
      fa: "پستی که شبیه انسان است نه ربات: داستان کوتاه، یک درس مشخص، بدون کلیشه‌های «هیجان‌زده‌ام که اعلام کنم» و با سؤالی که بحث راه بیندازد.",
      ar: "منشور يشبه الإنسان لا الآلة: قصة قصيرة ودرس واحد واضح، بلا عبارات مستهلكة، وسؤال يفتح النقاش.",
      en: "A post that reads human: a short story, one clear lesson, no 'thrilled to announce' clichés, and a question that starts a discussion.",
    },
    example: {
      fa: "«سه بار لانچ را عقب انداختیم. بار چهارم فهمیدیم مشکل محصول نبود.»",
      ar: "«أجّلنا الإطلاق ثلاث مرات. في الرابعة فهمنا أن المشكلة لم تكن في المنتج.»",
      en: '"We delayed the launch three times. The fourth time we realised the product wasn\'t the problem."',
    },
    preview: {
      fa: "نقش: گوست‌رایتر مدیران.\nتجربه: {{story}} · درس: {{lesson}}…",
      ar: "الدور: كاتب ظلّ للمديرين.\nالتجربة: {{story}} · الدرس: {{lesson}}…",
      en: "Role: executive ghostwriter.\nExperience: {{story}} · lesson: {{lesson}}…",
    },
    variables: [
      {
        name: "story",
        type: "text",
        required: true,
        label: { fa: "تجربه", ar: "التجربة", en: "Story" },
      },
      {
        name: "lesson",
        type: "text",
        required: true,
        label: { fa: "درس", ar: "الدرس", en: "Lesson" },
      },
    ],
  },
  {
    id: "p-0111",
    slug: "python-data-cleaning",
    type: "code",
    tier: "pro",
    category: "code",
    models: ["Claude", "GPT", "DeepSeek"],
    score: 87,
    breakdown: q(88, 89, 86, 82, 90),
    version: "1.2",
    testedAt: "2026-09-26",
    createdAt: "2026-04-15",
    priceToman: 59000,
    priceStars: 70,
    popularity: 52,
    tags: ["python", "pandas", "data", "excel", "csv"],
    title: {
      fa: "پاک‌سازی داده با Python و pandas",
      ar: "تنظيف البيانات بـ Python وpandas",
      en: "Data cleaning with Python and pandas",
    },
    summary: {
      fa: "اسکریپت قابل اجرا برای اکسل‌های شلوغ: تاریخ شمسی، ارقام فارسی، تکراری‌ها.",
      ar: "سكربت قابل للتشغيل لملفات Excel المزدحمة: التواريخ والأرقام العربية والتكرارات.",
      en: "A runnable script for messy spreadsheets: mixed dates, non-Latin digits, duplicates.",
    },
    description: {
      fa: "یک اسکریپت pandas مستند می‌سازد که ستون‌ها را پروفایل می‌کند، ارقام فارسی و عربی را یکسان می‌کند، تاریخ شمسی را تبدیل می‌کند و گزارش تغییرات می‌دهد.",
      ar: "يبني سكربت pandas موثّقاً يحلّل الأعمدة، ويوحّد الأرقام العربية والفارسية، ويحوّل التواريخ، ويقدّم تقريراً بالتغييرات.",
      en: "Builds a documented pandas script that profiles columns, unifies Persian and Arabic digits, converts Jalali dates and reports every change.",
    },
    example: {
      fa: "۱۲٬۴۸۰ ردیف · ۳۱۲ تکراری حذف شد · ستون تاریخ: ۱۴۰۵/۰۷/۱۲ → 2026-10-04",
      ar: "١٢٬٤٨٠ صفاً · حُذف ٣١٢ مكرراً · عمود التاريخ موحَّد بصيغة ISO",
      en: "12,480 rows · 312 duplicates removed · date column normalised to ISO",
    },
    preview: {
      fa: "نقش: مهندس داده‌ی Python.\nفایل: {{file}} · ستون‌ها: {{columns}}…",
      ar: "الدور: مهندس بيانات Python.\nالملف: {{file}} · الأعمدة: {{columns}}…",
      en: "Role: Python data engineer.\nFile: {{file}} · columns: {{columns}}…",
    },
    variables: [
      {
        name: "file",
        type: "text",
        required: true,
        label: { fa: "فایل", ar: "الملف", en: "File" },
      },
      {
        name: "columns",
        type: "text",
        required: true,
        label: { fa: "ستون‌ها", ar: "الأعمدة", en: "Columns" },
      },
    ],
  },
  {
    id: "p-0112",
    slug: "exam-study-planner",
    type: "text",
    tier: "pro",
    category: "education",
    models: ["Claude", "GPT", "Gemini"],
    score: 88,
    breakdown: q(89, 87, 88, 92, 88),
    version: "1.1",
    testedAt: "2026-10-03",
    createdAt: "2026-07-20",
    priceToman: 39000,
    priceStars: 50,
    popularity: 73,
    tags: ["konkur", "کنکور", "exam", "امتحان", "study plan"],
    title: {
      fa: "برنامه‌ی مطالعه‌ی کنکور",
      ar: "خطة مذاكرة للامتحانات",
      en: "Exam study planner",
    },
    summary: {
      fa: "برنامه‌ی هفتگی با مرور فاصله‌دار، آزمون‌های جامع و زمان استراحت.",
      ar: "خطة أسبوعية بالمراجعة المتباعدة والاختبارات الشاملة وأوقات الراحة.",
      en: "A weekly plan with spaced repetition, mock exams and rest time.",
    },
    description: {
      fa: "بر اساس روزهای باقی‌مانده، درس‌های ضعیف و ساعت آزاد شما، برنامه‌ای واقع‌بینانه با مرور فاصله‌دار و آزمون جامع هفتگی می‌سازد و هر هفته قابل بازتنظیم است.",
      ar: "بناءً على الأيام المتبقية والمواد الضعيفة ووقتك المتاح، يبني خطة واقعية بمراجعة متباعدة واختبار شامل أسبوعي، قابلة لإعادة الضبط كل أسبوع.",
      en: "From days left, weak subjects and free hours, it builds a realistic plan with spaced repetition and a weekly mock exam, re-tunable every week.",
    },
    example: {
      fa: "شنبه: ریاضی (۹۰ دقیقه، مبحث جدید) · مرور فاصله‌دار زیست · ۲۰ تست زمان‌دار",
      ar: "السبت: رياضيات (٩٠ دقيقة، درس جديد) · مراجعة متباعدة للأحياء · ٢٠ سؤالاً موقّتاً",
      en: "Sat: maths (90 min, new topic) · spaced review of biology · 20 timed questions",
    },
    preview: {
      fa: "نقش: مشاور تحصیلی با رویکرد علوم یادگیری.\nروزهای باقی‌مانده: {{days}}…",
      ar: "الدور: مرشد دراسي يعتمد علوم التعلّم.\nالأيام المتبقية: {{days}}…",
      en: "Role: study coach grounded in learning science.\nDays left: {{days}}…",
    },
    variables: [
      {
        name: "days",
        type: "number",
        required: true,
        label: { fa: "روزهای باقی‌مانده", ar: "الأيام المتبقية", en: "Days left" },
      },
      {
        name: "weak",
        type: "text",
        required: true,
        label: { fa: "درس‌های ضعیف", ar: "المواد الضعيفة", en: "Weak subjects" },
      },
    ],
  },

  // ───────────────────────────── PREMIUM ─────────────────────────────
  {
    id: "p-0201",
    slug: "n8n-instagram-lead-capture",
    type: "automation",
    tier: "premium",
    category: "automation",
    models: ["Claude", "GPT"],
    score: 88,
    breakdown: q(88, 90, 86, 87, 89),
    version: "1.0",
    testedAt: "2026-10-06",
    createdAt: "2026-09-30",
    priceToman: 249000,
    priceStars: 300,
    popularity: 95,
    tags: ["n8n", "instagram", "lead", "crm", "dm"],
    title: {
      fa: "اتوماسیون n8n جذب سرنخ از اینستاگرام",
      ar: "أتمتة n8n لجمع العملاء من إنستغرام",
      en: "n8n lead capture from Instagram DMs",
    },
    summary: {
      fa: "ورک‌فلو کامل: دایرکت ← دسته‌بندی با AI ← CRM ← پاسخ خودکار. همراه با JSON آماده.",
      ar: "سير عمل كامل: الرسائل ← تصنيف بالذكاء الاصطناعي ← CRM ← رد تلقائي. مع JSON جاهز.",
      en: "Full workflow: DMs → AI triage → CRM → auto-reply. Ships with ready JSON.",
    },
    description: {
      fa: "پرامپت‌های سیستمی و ورک‌فلوی کامل n8n برای اینکه هیچ دایرکتی بی‌جواب نماند: نیت پیام تشخیص داده می‌شود، سرنخ‌های داغ برچسب می‌خورند و به CRM می‌روند و پاسخ اول در کمتر از دو دقیقه ارسال می‌شود.",
      ar: "برومبتات نظام وسير عمل n8n كامل كي لا تبقى رسالة بلا رد: تُكتشف نية الرسالة، ويُوسم العملاء الساخنون ويُرسلون إلى CRM، ويصل الرد الأول في أقل من دقيقتين.",
      en: "System prompts plus a complete n8n workflow so no DM goes unanswered: intent is detected, hot leads are tagged and pushed to your CRM, and the first reply goes out in under two minutes.",
    },
    example: {
      fa: "۷ نود، نرخ پاسخ زیر ۲ دقیقه، برچسب‌گذاری «داغ/گرم/سرد».",
      ar: "٧ عقد، زمن رد أقل من دقيقتين، وسم «ساخن/دافئ/بارد».",
      en: "7 nodes, sub-2-minute replies, hot/warm/cold tagging.",
    },
    preview: {
      fa: "نقش: دستیار فروش دایرکت برای {{business}}.\nوظیفه‌ی ۱: نیت پیام را در یکی از این دسته‌ها بگذار: خرید، قیمت، پشتیبانی، همکاری، اسپم…",
      ar: "الدور: مساعد مبيعات الرسائل لـ {{business}}.\nالمهمة ١: صنّف نية الرسالة: شراء، سعر، دعم، شراكة، رسائل مزعجة…",
      en: "Role: DM sales assistant for {{business}}.\nStep 1: classify intent as one of: purchase, price, support, partnership, spam…",
    },
    variables: [
      {
        name: "business",
        type: "text",
        required: true,
        label: { fa: "کسب‌وکار", ar: "النشاط", en: "Business" },
      },
      { name: "crm", type: "select", required: true, label: { fa: "CRM", ar: "CRM", en: "CRM" } },
      {
        name: "hours",
        type: "text",
        required: false,
        label: { fa: "ساعت کاری", ar: "ساعات العمل", en: "Working hours" },
      },
    ],
  },
  {
    id: "p-0202",
    slug: "studio-product-photos",
    type: "image",
    tier: "premium",
    category: "design",
    models: ["Flux", "Midjourney", "GPT-Image"],
    score: 91,
    breakdown: q(92, 91, 93, 88, 91),
    version: "3.0",
    testedAt: "2026-10-07",
    createdAt: "2026-02-25",
    priceToman: 189000,
    priceStars: 230,
    popularity: 97,
    tags: ["product photo", "عکس محصول", "تصوير المنتجات", "flux", "catalog"],
    title: {
      fa: "عکس محصول استودیویی بدون عکاس",
      ar: "تصوير منتجات احترافي بلا مصوّر",
      en: "Studio product photos without a photographer",
    },
    summary: {
      fa: "۱۲ صحنه‌ی آماده با نورپردازی و زاویه‌ی ثابت برای کاتالوگ یکدست.",
      ar: "١٢ مشهداً جاهزاً بإضاءة وزوايا ثابتة لكتالوج متناسق.",
      en: "12 ready scenes with consistent lighting and angles for a uniform catalog.",
    },
    description: {
      fa: "یک کیت کامل برای فروشگاه‌هایی که عکاس ندارند: ۱۲ صحنه (سفید، لایف‌استایل، فلت‌لی، ماکرو و…) با نور و زاویه‌ی قفل‌شده تا همه‌ی محصولات کاتالوگ یکدست باشند. شامل راهنمای ثبات سوژه با عکس مرجع.",
      ar: "عدّة كاملة للمتاجر التي لا تملك مصوّراً: ١٢ مشهداً (أبيض، نمط حياة، تصوير علوي، ماكرو…) بإضاءة وزوايا مثبّتة كي تبدو منتجات الكتالوج متناسقة. تتضمن دليلاً لثبات المنتج بصورة مرجعية.",
      en: "A complete kit for shops without a photographer: 12 scenes (white, lifestyle, flat-lay, macro…) with locked lighting and angles so the whole catalog looks consistent. Includes a reference-image consistency guide.",
    },
    example: {
      fa: "پس‌زمینه‌ی کرم، نور نرم از سمت پنجره، سایه‌ی کوتاه، ۴:۵ برای اینستاگرام.",
      ar: "خلفية كريمية، إضاءة ناعمة من جهة النافذة، ظل قصير، ٤:٥ لإنستغرام.",
      en: "Cream backdrop, soft window key light, short shadow, 4:5 for Instagram.",
    },
    preview: {
      fa: "نقش: عکاس تبلیغاتی محصول و مدیر نور.\nمحصول: {{product}} · جنس: {{material}}\nقانون ثبات: همه‌ی صحنه‌ها با یک لنز ۸۵ میلی‌متری…",
      ar: "الدور: مصوّر منتجات إعلاني ومدير إضاءة.\nالمنتج: {{product}} · الخامة: {{material}}\nقاعدة الثبات: كل المشاهد بعدسة ٨٥ ملم…",
      en: "Role: commercial product photographer and lighting director.\nProduct: {{product}} · material: {{material}}\nConsistency rule: every scene uses one 85mm lens…",
    },
    variables: [
      {
        name: "product",
        type: "text",
        required: true,
        label: { fa: "محصول", ar: "المنتج", en: "Product" },
      },
      {
        name: "material",
        type: "text",
        required: true,
        label: { fa: "جنس", ar: "الخامة", en: "Material" },
      },
      {
        name: "scene",
        type: "select",
        required: true,
        label: { fa: "صحنه", ar: "المشهد", en: "Scene" },
      },
    ],
  },
  {
    id: "p-0203",
    slug: "contract-risk-review",
    type: "text",
    tier: "premium",
    category: "business",
    models: ["Claude"],
    score: 85,
    breakdown: q(87, 84, 85, 86, 92),
    version: "1.0",
    testedAt: "2026-09-26",
    createdAt: "2026-09-15",
    priceToman: 149000,
    priceStars: 180,
    popularity: 81,
    tags: ["contract", "قرارداد", "عقد", "legal", "risk"],
    title: {
      fa: "بررسی قرارداد و ریسک‌یابی",
      ar: "مراجعة العقود واكتشاف المخاطر",
      en: "Contract review and risk spotting",
    },
    summary: {
      fa: "بندهای پرریسک، موارد مبهم و پیشنهاد اصلاح؛ با هشدار «جایگزین وکیل نیست».",
      ar: "البنود عالية المخاطر والغموض واقتراحات التعديل؛ مع تنبيه أنه لا يغني عن محامٍ.",
      en: "High-risk clauses, ambiguities and suggested edits, with a not-a-lawyer notice.",
    },
    description: {
      fa: "قرارداد را از دید طرف شما می‌خواند: بندهای یک‌طرفه، جریمه‌ها، فسخ، مالکیت فکری و ابهام‌ها را با سطح ریسک علامت می‌زند و متن جایگزین پیشنهاد می‌دهد. خروجی برای گفت‌وگو با وکیل آماده است، نه جایگزین آن.",
      ar: "يقرأ العقد من منظورك: يعلّم البنود أحادية الجانب والغرامات والفسخ والملكية الفكرية والغموض بمستوى خطورة، ويقترح صياغة بديلة. النتيجة جاهزة للنقاش مع محاميك، لا بديلاً عنه.",
      en: "Reads the contract from your side: flags one-sided clauses, penalties, termination, IP and ambiguities by risk level and proposes alternative wording. The output prepares you for your lawyer; it does not replace one.",
    },
    example: {
      fa: "بند ۷: جریمه‌ی تأخیر یک‌طرفه است — پیشنهاد: سقف ۱۰٪ و دوطرفه.",
      ar: "البند ٧: غرامة التأخير من طرف واحد — الاقتراح: سقف ١٠٪ ومتبادلة.",
      en: "Clause 7: late penalty is one-sided. Suggest a 10% cap, mutual.",
    },
    preview: {
      fa: "نقش: مشاور قراردادهای تجاری (نه وکیل).\nطرف ما: {{party}} · نوع قرارداد: {{type}}…",
      ar: "الدور: مستشار عقود تجارية (ليس محامياً).\nطرفنا: {{party}} · نوع العقد: {{type}}…",
      en: "Role: commercial contracts advisor (not a lawyer).\nOur side: {{party}} · contract type: {{type}}…",
    },
    variables: [
      {
        name: "party",
        type: "text",
        required: true,
        label: { fa: "طرف ما", ar: "طرفنا", en: "Our side" },
      },
      {
        name: "type",
        type: "select",
        required: true,
        label: { fa: "نوع قرارداد", ar: "نوع العقد", en: "Contract type" },
      },
    ],
  },
  {
    id: "p-0204",
    slug: "support-agent-knowledge-base",
    type: "automation",
    tier: "premium",
    category: "automation",
    models: ["Claude"],
    score: 87,
    breakdown: q(88, 87, 86, 88, 93),
    version: "1.1",
    testedAt: "2026-10-06",
    createdAt: "2026-06-28",
    priceToman: 290000,
    priceStars: 350,
    popularity: 78,
    tags: ["support", "پشتیبانی", "دعم", "agent", "rag"],
    title: {
      fa: "ایجنت پشتیبانی با پایگاه دانش",
      ar: "وكيل دعم بقاعدة معرفة",
      en: "Support agent with a knowledge base",
    },
    summary: {
      fa: "پرامپت سیستمی، ابزارها و قوانین ارجاع به انسان برای پشتیبانی ۲۴ ساعته.",
      ar: "موجّه نظام وأدوات وقواعد التحويل لموظف لدعم على مدار الساعة.",
      en: "System prompt, tools and human-handoff rules for 24/7 support.",
    },
    description: {
      fa: "معماری کامل یک ایجنت پشتیبانی: پرامپت سیستمی با مرزهای روشن، تعریف ابزارها (پیگیری سفارش، بازگشت وجه، FAQ)، قوانین ارجاع به اپراتور و مجموعه‌ی تست ۳۰ سناریویی.",
      ar: "بنية كاملة لوكيل دعم: موجّه نظام بحدود واضحة، وتعريف الأدوات (تتبع الطلب، الاسترداد، الأسئلة الشائعة)، وقواعد التحويل إلى موظف، ومجموعة اختبار من ٣٠ سيناريو.",
      en: "The full architecture of a support agent: a system prompt with clear boundaries, tool definitions (order lookup, refunds, FAQ), human-handoff rules and a 30-scenario test set.",
    },
    example: {
      fa: "اگر کاربر ۲ بار ناراضی بود یا درخواست بازپرداخت داشت ← ارجاع به اپراتور.",
      ar: "إذا تكرر عدم رضا العميل أو طلب استرداداً ← تحويل لموظف.",
      en: "If the user is unhappy twice or asks for a refund → hand off to a human.",
    },
    preview: {
      fa: "نقش: کارشناس پشتیبانی {{company}}، مؤدب و دقیق.\nمرزها: فقط از پایگاه دانش پاسخ بده؛ اگر نمی‌دانی بگو…",
      ar: "الدور: أخصائي دعم لدى {{company}}، مهذّب ودقيق.\nالحدود: أجب من قاعدة المعرفة فقط؛ وإن لم تعرف فقل ذلك…",
      en: "Role: support specialist at {{company}}, courteous and precise.\nBoundaries: answer only from the knowledge base; say so when you don't know…",
    },
    variables: [
      {
        name: "company",
        type: "text",
        required: true,
        label: { fa: "شرکت", ar: "الشركة", en: "Company" },
      },
      {
        name: "policies",
        type: "text",
        required: true,
        label: { fa: "سیاست‌ها", ar: "السياسات", en: "Policies" },
      },
    ],
  },
  {
    id: "p-0205",
    slug: "product-video-shots",
    type: "video",
    tier: "premium",
    category: "video",
    models: ["Veo", "Kling", "Runway"],
    score: 86,
    breakdown: q(87, 85, 84, 88, 90),
    version: "1.2",
    testedAt: "2026-10-05",
    createdAt: "2026-08-22",
    priceToman: 199000,
    priceStars: 240,
    popularity: 85,
    tags: ["video", "veo", "kling", "runway", "product"],
    title: {
      fa: "ویدیوی کوتاه محصول با مدل‌های ویدیویی",
      ar: "فيديو منتج قصير بنماذج الفيديو",
      en: "Short product video with video models",
    },
    summary: {
      fa: "۸ شات ۵ ثانیه‌ای با حرکت دوربین کنترل‌شده برای Veo، Kling و Runway.",
      ar: "٨ لقطات من ٥ ثوانٍ بحركة كاميرا مضبوطة لـ Veo وKling وRunway.",
      en: "8 five-second shots with controlled camera moves for Veo, Kling and Runway.",
    },
    description: {
      fa: "پرامپت‌های شات‌به‌شات برای ساخت ویدیوی تبلیغاتی محصول بدون استودیو: حرکت دوربین، نور، سرعت و تداوم بین شات‌ها؛ با نسخه‌ی مخصوص هر مدل ویدیویی.",
      ar: "برومبتات لقطة بلقطة لصنع فيديو إعلاني للمنتج بلا استوديو: حركة الكاميرا والإضاءة والسرعة والاستمرارية بين اللقطات، مع نسخة خاصة لكل نموذج.",
      en: "Shot-by-shot prompts for a product ad with no studio: camera movement, light, pacing and continuity between shots, with a version tuned for each video model.",
    },
    example: {
      fa: "شات ۳: دالی آهسته به جلو، بخار از فنجان، نور گرم پشت سوژه، ۲۴fps",
      ar: "اللقطة ٣: تقدّم بطيء للكاميرا، بخار من الفنجان، ضوء دافئ خلف المنتج، ٢٤ إطاراً",
      en: "Shot 3: slow dolly-in, steam rising from the cup, warm backlight, 24fps",
    },
    preview: {
      fa: "نقش: کارگردان تبلیغات و فیلم‌بردار.\nمحصول: {{product}} · حس: {{mood}}\nقانون تداوم: رنگ پس‌زمینه و جهت نور در همه‌ی شات‌ها ثابت…",
      ar: "الدور: مخرج إعلانات ومدير تصوير.\nالمنتج: {{product}} · الإحساس: {{mood}}\nقاعدة الاستمرارية: لون الخلفية واتجاه الضوء ثابتان في كل اللقطات…",
      en: "Role: commercial director and cinematographer.\nProduct: {{product}} · mood: {{mood}}\nContinuity rule: backdrop colour and light direction stay fixed across shots…",
    },
    variables: [
      {
        name: "product",
        type: "text",
        required: true,
        label: { fa: "محصول", ar: "المنتج", en: "Product" },
      },
      {
        name: "mood",
        type: "text",
        required: true,
        label: { fa: "حس", ar: "الإحساس", en: "Mood" },
      },
      {
        name: "model",
        type: "select",
        required: true,
        label: { fa: "مدل", ar: "النموذج", en: "Model" },
      },
    ],
  },
  {
    id: "p-0206",
    slug: "investor-business-plan",
    type: "text",
    tier: "premium",
    category: "business",
    models: ["Claude", "GPT"],
    score: 89,
    breakdown: q(90, 88, 89, 87, 90),
    version: "1.3",
    testedAt: "2026-10-02",
    createdAt: "2026-05-05",
    priceToman: 219000,
    priceStars: 260,
    popularity: 69,
    tags: ["business plan", "بیزینس پلن", "خطة عمل", "pitch", "investor"],
    title: {
      fa: "بیزینس‌پلن برای جذب سرمایه",
      ar: "خطة عمل لجذب المستثمرين",
      en: "Investor-ready business plan",
    },
    summary: {
      fa: "از مسئله تا مدل مالی ۳ ساله، با سؤال‌هایی که سرمایه‌گذار حتماً می‌پرسد.",
      ar: "من المشكلة إلى نموذج مالي لثلاث سنوات، مع الأسئلة التي سيطرحها المستثمر حتماً.",
      en: "From problem to a 3-year financial model, with the questions investors always ask.",
    },
    description: {
      fa: "یک فرایند مصاحبه‌ای ۱۲ مرحله‌ای که اطلاعات را از شما بیرون می‌کشد و بیزینس‌پلنی با اندازه‌ی بازار، رقبا، مدل درآمد، فرضیات مالی و ریسک‌ها می‌سازد — همراه با ۱۰ سؤال سخت سرمایه‌گذار و پاسخ پیشنهادی.",
      ar: "عملية مقابلة من ١٢ مرحلة تستخرج المعلومات منك وتبني خطة عمل بحجم السوق والمنافسين ونموذج الإيراد والافتراضات المالية والمخاطر، مع ١٠ أسئلة صعبة من المستثمر وإجابات مقترحة.",
      en: "A 12-step interview that draws the facts out of you and builds a plan with market size, competitors, revenue model, financial assumptions and risks, plus 10 hard investor questions with suggested answers.",
    },
    example: {
      fa: "TAM: ۴٫۲ هزار میلیارد تومان · CAC هدف: ۸۵ هزار · نقطه‌ی سربه‌سر: ماه ۱۹",
      ar: "حجم السوق الكلي: ١٫٢ مليار دولار · تكلفة الاكتساب المستهدفة: ١٨ دولاراً · نقطة التعادل: الشهر ١٩",
      en: "TAM: $1.2B · target CAC: $18 · break-even: month 19",
    },
    preview: {
      fa: "نقش: تحلیلگر سرمایه‌گذاری خطرپذیر.\nروش: قبل از نوشتن، ۱۲ سؤال را یکی‌یکی بپرس…",
      ar: "الدور: محلل استثمار جريء.\nالأسلوب: قبل الكتابة، اطرح ١٢ سؤالاً واحداً تلو الآخر…",
      en: "Role: venture capital analyst.\nMethod: before writing, ask 12 questions one at a time…",
    },
    variables: [
      {
        name: "startup",
        type: "text",
        required: true,
        label: { fa: "استارتاپ", ar: "الشركة الناشئة", en: "Startup" },
      },
      {
        name: "stage",
        type: "select",
        required: true,
        label: { fa: "مرحله", ar: "المرحلة", en: "Stage" },
      },
    ],
  },
  {
    id: "p-0207",
    slug: "telegram-shop-bot-flow",
    type: "automation",
    tier: "premium",
    category: "automation",
    models: ["Claude", "GPT"],
    score: 86,
    breakdown: q(87, 86, 85, 90, 88),
    version: "1.0",
    testedAt: "2026-09-29",
    createdAt: "2026-09-02",
    priceToman: 179000,
    priceStars: 210,
    popularity: 72,
    tags: ["telegram", "bale", "bot", "ربات", "بوت", "shop"],
    title: {
      fa: "طراحی ربات فروشگاهی تلگرام و بله",
      ar: "تصميم بوت متجر لتيليجرام وبله",
      en: "Telegram & Bale shop bot design",
    },
    summary: {
      fa: "جریان گفتگو، منوها، پیام‌ها و سناریوهای پرداخت برای ربات فروش.",
      ar: "تدفق المحادثة والقوائم والرسائل وسيناريوهات الدفع لبوت المبيعات.",
      en: "Conversation flow, menus, copy and payment scenarios for a sales bot.",
    },
    description: {
      fa: "نقشه‌ی کامل یک ربات فروش: منوی اصلی، جست‌وجو، کارت محصول، سبد، پرداخت با استارز یا کیف پول بله، پیگیری سفارش و پیام‌های خطا — به سه زبان و آماده‌ی پیاده‌سازی.",
      ar: "خريطة كاملة لبوت مبيعات: القائمة الرئيسية، البحث، بطاقة المنتج، السلة، الدفع بالنجوم أو محفظة بله، تتبع الطلب ورسائل الخطأ، بثلاث لغات وجاهزة للتنفيذ.",
      en: "A complete sales-bot map: main menu, search, product card, cart, payment with Stars or the Bale wallet, order tracking and error messages, in three languages and ready to build.",
    },
    example: {
      fa: "/start ← منوی ۴ دکمه‌ای ← کارت محصول با «⭐ خرید» ← رسید و لینک دانلود",
      ar: "/start ← قائمة من ٤ أزرار ← بطاقة منتج مع «⭐ شراء» ← إيصال ورابط تنزيل",
      en: "/start → 4-button menu → product card with ⭐ Buy → receipt and download link",
    },
    preview: {
      fa: "نقش: طراح تجربه‌ی گفتگو برای ربات‌های پیام‌رسان.\nفروشگاه: {{shop}} · پلتفرم: {{platform}}…",
      ar: "الدور: مصمم تجربة محادثة لبوتات المراسلة.\nالمتجر: {{shop}} · المنصة: {{platform}}…",
      en: "Role: conversation designer for messenger bots.\nShop: {{shop}} · platform: {{platform}}…",
    },
    variables: [
      {
        name: "shop",
        type: "text",
        required: true,
        label: { fa: "فروشگاه", ar: "المتجر", en: "Shop" },
      },
      {
        name: "platform",
        type: "select",
        required: true,
        label: { fa: "پلتفرم", ar: "المنصة", en: "Platform" },
      },
    ],
  },
  {
    id: "p-0208",
    slug: "ad-creative-system",
    type: "image",
    tier: "premium",
    category: "marketing",
    models: ["GPT-Image", "Flux", "Claude"],
    score: 88,
    breakdown: q(89, 87, 90, 86, 88),
    version: "1.1",
    testedAt: "2026-10-04",
    createdAt: "2026-07-07",
    priceToman: 169000,
    priceStars: 200,
    popularity: 74,
    tags: ["ads", "تبلیغ", "إعلان", "banner", "creative"],
    title: {
      fa: "سیستم طراحی بنر تبلیغاتی",
      ar: "نظام تصميم إعلانات البانر",
      en: "Ad creative system",
    },
    summary: {
      fa: "از پیام تبلیغ تا ۶ بنر هم‌خانواده در اندازه‌های استوری، پست و وب.",
      ar: "من رسالة الإعلان إلى ٦ بانرات متناسقة بمقاسات القصة والمنشور والويب.",
      en: "From ad message to six matching banners in story, post and web sizes.",
    },
    description: {
      fa: "دو مرحله: Claude پیام و سلسله‌مراتب متن را می‌سازد، سپس پرامپت‌های تصویر با فضای خالی کنترل‌شده برای تیتر فارسی تولید می‌شوند تا متن را خودتان دقیق روی تصویر بگذارید.",
      ar: "مرحلتان: يصوغ Claude الرسالة وتسلسل النص، ثم تُولَّد برومبتات الصور بمساحة فارغة مضبوطة للعنوان العربي كي تضع النص بدقة بنفسك.",
      en: "Two stages: Claude shapes the message and text hierarchy, then image prompts are generated with controlled negative space for your headline, so you set the type precisely yourself.",
    },
    example: {
      fa: "استوری ۹:۱۶ · فضای خالی بالا برای تیتر · محصول در یک‌سوم پایین · پالت برند",
      ar: "قصة ٩:١٦ · مساحة علوية للعنوان · المنتج في الثلث السفلي · ألوان العلامة",
      en: "Story 9:16 · top negative space for the headline · product in the lower third · brand palette",
    },
    preview: {
      fa: "نقش: مدیر هنری تبلیغات دیجیتال.\nپیام: {{message}} · پالت: {{palette}}…",
      ar: "الدور: مدير فني للإعلانات الرقمية.\nالرسالة: {{message}} · الألوان: {{palette}}…",
      en: "Role: digital advertising art director.\nMessage: {{message}} · palette: {{palette}}…",
    },
    variables: [
      {
        name: "message",
        type: "text",
        required: true,
        label: { fa: "پیام", ar: "الرسالة", en: "Message" },
      },
      {
        name: "palette",
        type: "text",
        required: false,
        label: { fa: "پالت", ar: "الألوان", en: "Palette" },
      },
    ],
  },
  {
    id: "p-0209",
    slug: "persian-calligraphy-poster",
    type: "image",
    tier: "pro",
    category: "design",
    models: ["GPT-Image", "Midjourney"],
    score: 84,
    breakdown: q(86, 82, 83, 90, 89),
    version: "1.0",
    testedAt: "2026-09-21",
    createdAt: "2026-09-10",
    priceToman: 49000,
    priceStars: 60,
    popularity: 60,
    tags: ["poster", "پوستر", "calligraphy", "خوشنویسی", "خط"],
    title: {
      fa: "پوستر با الهام از خوشنویسی",
      ar: "ملصق مستوحى من فن الخط",
      en: "Calligraphy-inspired poster",
    },
    summary: {
      fa: "ترکیب‌بندی پوستر با فرم‌های نستعلیق و فضای منفی؛ متن واقعی را خودتان می‌گذارید.",
      ar: "تكوين ملصق بأشكال خطية ومساحة سلبية؛ وتضع النص الحقيقي بنفسك.",
      en: "Poster compositions with calligraphic forms and negative space; you set the real text.",
    },
    description: {
      fa: "مدل‌های تصویری هنوز خط فارسی را درست نمی‌نویسند؛ این پرامپت فرم و حرکت خوشنویسی را به‌عنوان عنصر بصری می‌سازد و جای تیتر واقعی را خالی نگه می‌دارد.",
      ar: "لا تكتب نماذج الصور الخط العربي بدقة بعد؛ يبني هذا البرومبت شكل الخط وحركته كعنصر بصري ويترك مكان العنوان الحقيقي فارغاً.",
      en: "Image models still can't write Persian script correctly, so this builds calligraphic form and motion as a visual element and leaves space for your real headline.",
    },
    example: {
      fa: "حرکت قلم طلایی روی کاغذ کاهی، فضای خالی سمت راست برای تیتر، دانه‌ی کاغذ",
      ar: "حركة قلم ذهبية على ورق عتيق، مساحة فارغة يميناً للعنوان، ملمس الورق",
      en: "Gold reed-pen strokes on aged paper, empty space for the headline, paper grain",
    },
    preview: {
      fa: "نقش: طراح پوستر با تجربه‌ی هنرهای ایرانی.\nمناسبت: {{event}}…",
      ar: "الدور: مصمم ملصقات بخبرة في الفنون الشرقية.\nالمناسبة: {{event}}…",
      en: "Role: poster designer versed in Persian arts.\nEvent: {{event}}…",
    },
    variables: [
      {
        name: "event",
        type: "text",
        required: true,
        label: { fa: "مناسبت", ar: "المناسبة", en: "Event" },
      },
    ],
  },
];

export const FIXTURE_TRENDS: FixtureTrend[] = [
  {
    key: "flux-product-photos",
    title: {
      fa: "عکس محصول با Flux برای فروشگاه‌های اینستاگرامی",
      ar: "صور منتجات بـ Flux لمتاجر إنستغرام",
      en: "Flux product photos for Instagram shops",
    },
    summary: {
      fa: "فروشگاه‌های کوچک به‌جای عکاسی استودیویی سراغ مدل‌های تصویری با نور ثابت رفته‌اند.",
      ar: "تتجه المتاجر الصغيرة إلى نماذج الصور بإضاءة ثابتة بدل التصوير في الاستوديو.",
      en: "Small shops are swapping studio shoots for image models with locked lighting.",
    },
    growth: 182,
    score: 82,
    sources: ["Google Trends IR", "Reddit r/StableDiffusion"],
    regions: ["IR", "AE"],
    series: [3, 4, 4, 6, 9, 13, 18],
    type: "image",
    promptSlugs: ["studio-product-photos", "ad-creative-system"],
  },
  {
    key: "n8n-dm-agents",
    title: {
      fa: "ایجنت‌های n8n برای پاسخ خودکار دایرکت",
      ar: "وكلاء n8n للرد التلقائي على الرسائل",
      en: "n8n agents for DM auto-replies",
    },
    summary: {
      fa: "پاسخ‌گویی سریع به دایرکت به مهم‌ترین عامل تبدیل در فروش اینستاگرامی تبدیل شده.",
      ar: "أصبح الرد السريع على الرسائل أهم عامل تحويل في مبيعات إنستغرام.",
      en: "Fast DM replies have become the top conversion lever for Instagram sellers.",
    },
    growth: 141,
    score: 78,
    sources: ["GitHub", "YouTube AE"],
    regions: ["IR", "AE", "SA"],
    series: [5, 5, 6, 8, 9, 11, 14],
    type: "automation",
    promptSlugs: ["n8n-instagram-lead-capture", "support-agent-knowledge-base"],
  },
  {
    key: "seasonal-business-prompts",
    title: {
      fa: "پرامپت‌های مناسبتی برای کسب‌وکار (یلدا، رمضان)",
      ar: "برومبتات رمضان والعيد للأعمال",
      en: "Ramadan, Eid & Yalda prompts for business",
    },
    summary: {
      fa: "پیش از فصل مناسبت‌ها، جست‌وجوی برنامه‌ی کمپین و متن تبریک رشد سریعی دارد.",
      ar: "قبل موسم المناسبات ترتفع عمليات البحث عن خطط الحملات ورسائل التهنئة بسرعة.",
      en: "Ahead of the holiday season, searches for campaign plans and greetings climb fast.",
    },
    growth: 126,
    score: 74,
    sources: ["Google Trends SA", "X"],
    regions: ["SA", "IR", "EG"],
    series: [2, 2, 3, 3, 5, 8, 10],
    type: "text",
    promptSlugs: ["seasonal-campaign-planner", "instagram-sales-caption"],
  },
  {
    key: "claude-contract-analysis",
    title: {
      fa: "Claude برای تحلیل قرارداد فارسی",
      ar: "Claude لتحليل العقود",
      en: "Claude for contract analysis",
    },
    summary: {
      fa: "کسب‌وکارهای کوچک برای آمادگی پیش از جلسه با وکیل، قراردادها را با AI مرور می‌کنند.",
      ar: "تراجع الشركات الصغيرة عقودها بالذكاء الاصطناعي استعداداً للقاء المحامي.",
      en: "Small businesses pre-screen contracts with AI before meeting their lawyer.",
    },
    growth: 97,
    score: 69,
    sources: ["Hacker News", "Internal zero-result searches"],
    regions: ["IR", "GLOBAL"],
    series: [4, 5, 5, 6, 7, 8, 9],
    type: "text",
    promptSlugs: ["contract-risk-review"],
  },
  {
    key: "short-product-video",
    title: {
      fa: "ویدیوی کوتاه محصول با مدل‌های ویدیویی",
      ar: "فيديو منتج قصير بنماذج الفيديو",
      en: "Short product video with video models",
    },
    summary: {
      fa: "با بهتر شدن Veo و Kling، ویدیوی تبلیغاتی بدون استودیو برای همه در دسترس شده.",
      ar: "مع تحسّن Veo وKling أصبح الفيديو الإعلاني بلا استوديو في متناول الجميع.",
      en: "As Veo and Kling improve, studio-free product video is within everyone's reach.",
    },
    growth: 88,
    score: 66,
    sources: ["Product Hunt", "YouTube US"],
    regions: ["GLOBAL", "AE"],
    series: [6, 6, 7, 7, 8, 10, 11],
    type: "video",
    promptSlugs: ["product-video-shots", "reels-30s-script"],
  },
  {
    key: "ai-exam-tutor",
    title: {
      fa: "معلم خصوصی هوش مصنوعی برای کنکور",
      ar: "مدرّس ذكاء اصطناعي للامتحانات",
      en: "AI tutor for exam prep",
    },
    summary: {
      fa: "دانش‌آموزان به‌جای جواب آماده، دنبال روش یادگیری مرحله‌به‌مرحله هستند.",
      ar: "يبحث الطلاب عن تعلّم خطوة بخطوة بدل الإجابات الجاهزة.",
      en: "Students want step-by-step learning rather than ready-made answers.",
    },
    growth: 74,
    score: 63,
    sources: ["Google Trends IR", "arXiv"],
    regions: ["IR", "EG"],
    series: [5, 6, 6, 7, 7, 8, 9],
    type: "text",
    promptSlugs: ["socratic-tutor", "exam-study-planner"],
  },
];
