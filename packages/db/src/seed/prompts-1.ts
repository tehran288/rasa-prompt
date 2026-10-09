import { type SeedPrompt, v } from "./types";

const TONE_OPTIONS = ["صمیمی", "رسمی", "طنز", "الهام‌بخش", "لوکس"];

export const PROMPTS_1: SeedPrompt[] = [
  {
    slug: "instagram-caption-writer",
    categories: ["social-media", "copywriting"],
    tier: "free",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini"],
    quality: 91,
    trending: 88,
    title: {
      fa: "کپشن‌نویس حرفه‌ای اینستاگرام",
      ar: "كاتب تعليقات إنستغرام الاحترافي",
      en: "Professional Instagram Caption Writer",
    },
    summary: {
      fa: "سه کپشن جذاب با قلاب قوی، دعوت به اقدام و هشتگ‌های هدفمند برای هر پست.",
      ar: "ثلاثة تعليقات جذابة مع خطاف قوي ودعوة لاتخاذ إجراء ووسوم موجّهة لكل منشور.",
      en: "Three scroll-stopping captions with a strong hook, call to action and targeted hashtags for any post.",
    },
    description: {
      fa: "این پرامپت مثل یک کپی‌رایتر باتجربه‌ی اینستاگرام فکر می‌کند: اول قلاب جمله‌ی اول را می‌سازد، بعد ارزش را در دو سه خط می‌گوید و در پایان مخاطب را به کامنت، ذخیره یا خرید دعوت می‌کند. سه نسخه با لحن‌های متفاوت می‌گیرید تا A/B تست کنید.",
      ar: "يفكّر هذا الموجّه كمؤلف محتوى خبير في إنستغرام: يصنع أولًا خطافًا للجملة الأولى، ثم يقدّم القيمة في سطرين أو ثلاثة، ويختم بدعوة الجمهور إلى التعليق أو الحفظ أو الشراء. تحصل على ثلاث نسخ بنبرات مختلفة لاختبارها.",
      en: "This prompt thinks like a seasoned Instagram copywriter: it crafts a first-line hook, delivers the value in two or three lines and closes with a call to comment, save or buy. You get three versions in different tones for A/B testing.",
    },
    body: {
      fa: `تو یک کپی‌رایتر ارشد اینستاگرام هستی که برای برندهای ایرانی محتوا می‌نویسد.
برای پستی درباره‌ی «{{post_topic}}» از برند «{{brand_name}}» سه کپشن بنویس. مخاطب: {{audience}}. لحن: {{tone}}.

قواعد:
۱. خط اول یک قلاب کوتاه (حداکثر ۱۰ کلمه) باشد که کنجکاوی بسازد یا یک درد مخاطب را نام ببرد.
۲. بدنه حداکثر ۴ خط کوتاه؛ یک ارزش مشخص یا نکته‌ی کاربردی بده، نه تعریف کلی از برند.
۳. یک دعوت به اقدام روشن (کامنت، ذخیره، ارسال برای دوست یا خرید) بنویس.
۴. حداکثر ۲ ایموجی مرتبط و طبیعی.
۵. در پایان ۸ هشتگ: ۳ پرطرفدار، ۳ تخصصی، ۲ برندی.
۶. فارسی روان و امروزی بنویس؛ از ترجمه‌ی تحت‌اللفظی و کلیشه‌هایی مثل «بی‌نظیر» پرهیز کن.

خروجی را با عنوان‌های «نسخه‌ی ۱ — قلاب سؤالی»، «نسخه‌ی ۲ — داستانی»، «نسخه‌ی ۳ — فروش مستقیم» بده.`,
      ar: `أنت كاتب محتوى أول لإنستغرام تكتب للعلامات التجارية العربية.
اكتب ثلاثة تعليقات لمنشور عن «{{post_topic}}» لعلامة «{{brand_name}}». الجمهور: {{audience}}. النبرة: {{tone}}.

القواعد:
1. السطر الأول خطاف قصير (10 كلمات كحد أقصى) يثير الفضول أو يسمّي مشكلة لدى الجمهور.
2. المتن 4 أسطر قصيرة كحد أقصى؛ قدّم قيمة محددة أو نصيحة عملية، لا مديحًا عامًا للعلامة.
3. دعوة واضحة لاتخاذ إجراء (تعليق، حفظ، إرسال لصديق أو شراء).
4. رمزان تعبيريان كحد أقصى، مناسبان وطبيعيان.
5. في النهاية 8 وسوم: 3 رائجة، 3 متخصصة، 2 خاصة بالعلامة.
6. اكتب بعربية فصحى سلسة ومعاصرة، وتجنّب العبارات المستهلكة.

قدّم المخرجات بعناوين: «النسخة 1 — خطاف سؤال»، «النسخة 2 — قصصية»، «النسخة 3 — بيع مباشر».`,
      en: `You are a senior Instagram copywriter.
Write three captions for a post about "{{post_topic}}" for the brand "{{brand_name}}". Audience: {{audience}}. Tone: {{tone}}.

Rules:
1. The first line is a short hook (max 10 words) that sparks curiosity or names a pain point.
2. Body: max 4 short lines delivering one concrete value or practical tip — not generic brand praise.
3. One clear call to action (comment, save, share with a friend, or buy).
4. At most 2 relevant, natural emojis.
5. End with 8 hashtags: 3 popular, 3 niche, 2 branded.
6. Write fresh, natural English; avoid clichés like "game-changer".

Label the output "Version 1 — Question hook", "Version 2 — Story", "Version 3 — Direct sell".`,
    },
    example: {
      fa: "نسخه‌ی ۱ — قلاب سؤالی\nچرا قهوه‌ی خانگی‌ات هیچ‌وقت مزه‌ی کافه نمی‌دهد؟ ☕\nراز در آسیاب است، نه دستگاه. دانه را درست قبل از دم کردن آسیاب کن و ۱۵ گرم برای هر ۲۵۰ میلی‌لیتر آب بردار.\nاین پست را ذخیره کن تا فردا صبح امتحانش کنی.\n#قهوه #قهوه_خانگی #باریستا ...",
      ar: "النسخة 1 — خطاف سؤال\nلماذا لا تشبه قهوتك المنزلية قهوة المقهى أبدًا؟ ☕\nالسر في الطحن لا في الآلة. اطحن الحبوب قبل التحضير مباشرة واستخدم 15 غرامًا لكل 250 مل من الماء.\nاحفظ المنشور لتجربه صباح الغد.\n#قهوة #قهوة_مختصة ...",
      en: "Version 1 — Question hook\nWhy does your home coffee never taste like the café's? ☕\nThe secret is the grinder, not the machine. Grind right before brewing and use 15 g per 250 ml of water.\nSave this post and try it tomorrow morning.\n#coffee #homebarista ...",
    },
    variables: [
      v("post_topic", { fa: "موضوع پست", ar: "موضوع المنشور", en: "Post topic" }),
      v("brand_name", { fa: "نام برند", ar: "اسم العلامة", en: "Brand name" }),
      v("audience", { fa: "مخاطب هدف", ar: "الجمهور المستهدف", en: "Target audience" }),
      v(
        "tone",
        { fa: "لحن", ar: "النبرة", en: "Tone" },
        { type: "select", options: TONE_OPTIONS, default: "صمیمی" },
      ),
    ],
  },
  {
    slug: "instagram-content-calendar-30-days",
    categories: ["social-media"],
    tier: "pro",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini"],
    quality: 89,
    trending: 74,
    priceToman: 79_000,
    priceStars: 99,
    title: {
      fa: "تقویم محتوای ۳۰ روزه‌ی اینستاگرام",
      ar: "تقويم محتوى إنستغرام لمدة 30 يومًا",
      en: "30-Day Instagram Content Calendar",
    },
    summary: {
      fa: "برنامه‌ی کامل یک ماه پست، ریلز و استوری با ستون‌های محتوایی و هدف هر روز.",
      ar: "خطة كاملة لشهر من المنشورات والريلز والقصص مع ركائز المحتوى وهدف كل يوم.",
      en: "A full month of posts, Reels and Stories organized by content pillars, with a goal for every day.",
    },
    description: {
      fa: "به‌جای اینکه هر روز به این فکر کنید «امروز چه بگذارم؟»، یک تقویم ۳۰ روزه‌ی جدول‌بندی‌شده می‌گیرید که تعادل بین آموزش، اعتمادسازی، سرگرمی و فروش را رعایت می‌کند و برای هر روز فرمت، ایده، قلاب و دعوت به اقدام دارد.",
      ar: "بدلًا من التفكير يوميًا «ماذا أنشر اليوم؟»، تحصل على تقويم منظّم لثلاثين يومًا يوازن بين التعليم وبناء الثقة والترفيه والبيع، مع صيغة وفكرة وخطاف ودعوة لاتخاذ إجراء لكل يوم.",
      en: 'Instead of asking "what do I post today?" every morning, get a 30-day table that balances education, trust, entertainment and sales — with a format, idea, hook and CTA for each day.',
    },
    body: {
      fa: `نقش: استراتژیست محتوای اینستاگرام با ۸ سال تجربه در رشد پیج‌های کسب‌وکار.
کسب‌وکار: {{business}} | مخاطب: {{audience}} | هدف اصلی این ماه: {{goal}} | تعداد پست در هفته: {{posts_per_week}}

مرحله‌ی ۱: چهار ستون محتوایی متناسب با این کسب‌وکار تعریف کن (آموزشی، اعتمادساز، سرگرمی/ترند، فروش) و برای هر ستون سهم درصدی پیشنهاد بده.
مرحله‌ی ۲: یک جدول ۳۰ روزه با این ستون‌ها بساز: روز | ستون | فرمت (پست/کاروسل/ریلز/استوری) | ایده‌ی دقیق | قلاب جمله‌ی اول | دعوت به اقدام | معیار موفقیت.
مرحله‌ی ۳: مناسبت‌های تقویم ایران در این ماه را اگر مرتبط‌اند وارد کن.
مرحله‌ی ۴: سه ایده‌ی «ذخیره‌شدنی» و دو ایده‌ی «اشتراک‌گذاشتنی» را علامت‌گذاری کن.
مرحله‌ی ۵: در پایان یک چک‌لیست هفتگی برای سنجش عملکرد (نرخ ذخیره، اشتراک، پیام دایرکت) بنویس.

ایده‌ها باید مشخص و قابل اجرا باشند، نه کلی مثل «یک نکته‌ی آموزشی بگذار».`,
      ar: `الدور: استراتيجي محتوى إنستغرام بخبرة 8 سنوات في تنمية حسابات الأعمال.
النشاط: {{business}} | الجمهور: {{audience}} | الهدف الرئيسي لهذا الشهر: {{goal}} | عدد المنشورات أسبوعيًا: {{posts_per_week}}

الخطوة 1: حدّد أربع ركائز محتوى مناسبة لهذا النشاط (تعليمي، بناء الثقة، ترفيه/ترند، بيع) واقترح نسبة لكل ركيزة.
الخطوة 2: أنشئ جدولًا لثلاثين يومًا بالأعمدة: اليوم | الركيزة | الصيغة (منشور/كاروسيل/ريلز/قصة) | الفكرة الدقيقة | خطاف السطر الأول | الدعوة لاتخاذ إجراء | مؤشر النجاح.
الخطوة 3: أدرج المناسبات الموسمية في المنطقة لهذا الشهر إن كانت ذات صلة.
الخطوة 4: ضع علامة على ثلاث أفكار «قابلة للحفظ» وفكرتين «قابلتين للمشاركة».
الخطوة 5: اختم بقائمة تحقق أسبوعية لقياس الأداء (نسبة الحفظ، المشاركة، الرسائل المباشرة).

يجب أن تكون الأفكار محددة وقابلة للتنفيذ، لا عامة مثل «انشر نصيحة تعليمية».`,
      en: `Role: Instagram content strategist with 8 years of experience growing business accounts.
Business: {{business}} | Audience: {{audience}} | Main goal this month: {{goal}} | Posts per week: {{posts_per_week}}

Step 1: Define four content pillars for this business (educational, trust-building, entertainment/trend, sales) and suggest a percentage share for each.
Step 2: Build a 30-day table with columns: Day | Pillar | Format (post/carousel/Reel/Story) | Specific idea | First-line hook | CTA | Success metric.
Step 3: Include relevant seasonal dates for this month.
Step 4: Mark three "save-worthy" ideas and two "share-worthy" ideas.
Step 5: Finish with a weekly checklist to review performance (save rate, shares, DMs).

Ideas must be specific and actionable — never generic like "post an educational tip".`,
    },
    example: {
      fa: "| روز | ستون | فرمت | ایده | قلاب |\n|۱|آموزشی|کاروسل|۵ اشتباه رایج در نگهداری گیاه آپارتمانی|«گیاهت را با محبت زیاد می‌کشی!»|",
      ar: "| اليوم | الركيزة | الصيغة | الفكرة | الخطاف |\n|1|تعليمي|كاروسيل|5 أخطاء شائعة في العناية بالنباتات المنزلية|«قد تقتل نبتتك من فرط الاهتمام!»|",
      en: '| Day | Pillar | Format | Idea | Hook |\n|1|Educational|Carousel|5 common houseplant care mistakes|"You might be killing your plant with too much love!"|',
    },
    variables: [
      v("business", { fa: "کسب‌وکار", ar: "النشاط التجاري", en: "Business" }),
      v("audience", { fa: "مخاطب", ar: "الجمهور", en: "Audience" }),
      v(
        "goal",
        { fa: "هدف ماه", ar: "هدف الشهر", en: "Monthly goal" },
        { type: "select", options: ["افزایش فالوور", "فروش", "آگاهی از برند", "تعامل"] },
      ),
      v(
        "posts_per_week",
        { fa: "تعداد پست در هفته", ar: "عدد المنشورات أسبوعيًا", en: "Posts per week" },
        { type: "number", default: "5" },
      ),
    ],
  },
  {
    slug: "reels-script-hook-retention",
    categories: ["social-media"],
    tier: "pro",
    outputType: "text",
    models: ["ChatGPT", "Claude"],
    quality: 90,
    trending: 92,
    priceToman: 69_000,
    priceStars: 89,
    title: {
      fa: "سناریوی ریلز با قلاب ۳ ثانیه‌ای و حفظ مخاطب",
      ar: "سيناريو ريلز بخطاف 3 ثوانٍ وإبقاء المشاهد",
      en: "Reels Script with a 3-Second Hook & Retention",
    },
    summary: {
      fa: "سناریوی ثانیه‌به‌ثانیه‌ی ریلز ۳۰ تا ۶۰ ثانیه‌ای با متن روی تصویر، نما و موسیقی پیشنهادی.",
      ar: "سيناريو ريلز ثانيةً بثانية لمدة 30–60 ثانية مع نص على الشاشة واللقطات والموسيقى المقترحة.",
      en: "Second-by-second script for a 30–60s Reel with on-screen text, shot list and music suggestion.",
    },
    description: {
      fa: "بیشترین ریزش مخاطب در سه ثانیه‌ی اول رخ می‌دهد. این پرامپت پنج قلاب جایگزین می‌سازد، بهترین را انتخاب می‌کند و سناریو را با «حلقه‌های باز» طوری می‌چیند که مخاطب تا آخر بماند.",
      ar: "يحدث أكبر انسحاب للمشاهدين في الثواني الثلاث الأولى. يصنع هذا الموجّه خمسة خطافات بديلة، ويختار أفضلها، ويرتّب السيناريو بـ«حلقات مفتوحة» تُبقي المشاهد حتى النهاية.",
      en: "Most viewers drop in the first three seconds. This prompt writes five alternative hooks, picks the strongest, and structures the script with open loops so people watch to the end.",
    },
    body: {
      fa: `تو کارگردان و فیلم‌نامه‌نویس ویدیوهای کوتاه هستی که ریلزهای میلیونی ساخته است.
موضوع ریلز: {{topic}} | مدت: {{duration}} ثانیه | هدف: {{goal}} | سبک: {{style}}

۱. پنج قلاب سه‌ثانیه‌ای متفاوت بنویس (سؤال، ادعای غافلگیرکننده، نمایش نتیجه‌ی نهایی، اشتباه رایج، عدد مشخص) و بهترین را با دلیل انتخاب کن.
۲. سناریو را به‌صورت جدول بده: بازه‌ی زمانی | تصویر/نما | متن گفتاری | متن روی صفحه | افکت یا ترنزیشن.
۳. در ثانیه‌ی ۸ تا ۱۲ یک «حلقه‌ی باز» بگذار که پاسخش آخر ویدیو بیاید.
۴. هر جمله‌ی گفتاری حداکثر ۱۲ کلمه باشد.
۵. پایان: دعوت به اقدامی که با هدف هماهنگ است + پیشنهاد کاور و کپشن یک‌خطی.
۶. یک موسیقی یا حس صوتی پیشنهاد بده (بدون نام بردن از آهنگ دارای کپی‌رایت مشخص).`,
      ar: `أنت مخرج وكاتب سيناريو لمقاطع الفيديو القصيرة صنعت ريلز حصدت ملايين المشاهدات.
موضوع الريلز: {{topic}} | المدة: {{duration}} ثانية | الهدف: {{goal}} | الأسلوب: {{style}}

1. اكتب خمسة خطافات مختلفة مدتها 3 ثوانٍ (سؤال، ادعاء مفاجئ، عرض النتيجة النهائية، خطأ شائع، رقم محدد) واختر الأفضل مع التعليل.
2. قدّم السيناريو في جدول: الفترة الزمنية | الصورة/اللقطة | النص المنطوق | النص على الشاشة | المؤثر أو الانتقال.
3. ضع بين الثانية 8 و12 «حلقة مفتوحة» تأتي إجابتها في نهاية الفيديو.
4. كل جملة منطوقة 12 كلمة كحد أقصى.
5. الختام: دعوة لاتخاذ إجراء متوافقة مع الهدف + اقتراح غلاف وتعليق من سطر واحد.
6. اقترح موسيقى أو طابعًا صوتيًا (دون تسمية أغنية محمية بحقوق نشر).`,
      en: `You are a short-form video director and scriptwriter who has made Reels with millions of views.
Reel topic: {{topic}} | Length: {{duration}} seconds | Goal: {{goal}} | Style: {{style}}

1. Write five different 3-second hooks (question, surprising claim, show the end result, common mistake, specific number) and pick the best one with a reason.
2. Give the script as a table: Time range | Visual/shot | Spoken line | On-screen text | Effect or transition.
3. Between seconds 8 and 12, plant an open loop that is resolved at the end.
4. Every spoken sentence is max 12 words.
5. Ending: a CTA aligned with the goal + a cover idea and a one-line caption.
6. Suggest a music mood (do not name a specific copyrighted song).`,
    },
    variables: [
      v("topic", { fa: "موضوع", ar: "الموضوع", en: "Topic" }),
      v(
        "duration",
        { fa: "مدت (ثانیه)", ar: "المدة (ثانية)", en: "Duration (seconds)" },
        { type: "select", options: ["15", "30", "45", "60"], default: "30" },
      ),
      v("goal", { fa: "هدف", ar: "الهدف", en: "Goal" }),
      v(
        "style",
        { fa: "سبک", ar: "الأسلوب", en: "Style" },
        { type: "select", options: ["آموزشی", "طنز", "پشت صحنه", "قبل و بعد"], required: false },
      ),
    ],
  },
  {
    slug: "linkedin-thought-leadership-post",
    categories: ["social-media", "productivity"],
    tier: "free",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini"],
    quality: 84,
    trending: 51,
    title: {
      fa: "پست لینکدین برای برند شخصی",
      ar: "منشور لينكدإن لبناء العلامة الشخصية",
      en: "LinkedIn Thought-Leadership Post",
    },
    summary: {
      fa: "تبدیل یک تجربه‌ی کاری به پست لینکدینی که دیده می‌شود و اعتبار می‌سازد.",
      ar: "حوّل تجربة مهنية إلى منشور لينكدإن يُشاهَد ويبني المصداقية.",
      en: "Turn a work experience into a LinkedIn post that gets seen and builds credibility.",
    },
    description: {
      fa: "ساختار اثبات‌شده‌ی «قلاب، داستان، درس، سؤال» را روی تجربه‌ی واقعی شما پیاده می‌کند؛ بدون اغراق و ادبیات انگیزشی توخالی.",
      ar: "يطبّق البنية المجرّبة «خطاف، قصة، درس، سؤال» على تجربتك الحقيقية، دون مبالغة أو عبارات تحفيزية فارغة.",
      en: "Applies the proven hook–story–lesson–question structure to your real experience, without hype or empty motivational fluff.",
    },
    body: {
      fa: `تو ویراستار محتوای لینکدین برای مدیران و متخصصان هستی.
تجربه‌ی من: {{experience}}
حوزه‌ی کاری: {{field}}

یک پست لینکدین بنویس با این ساختار:
- خط اول: جمله‌ای که خواننده را متوقف کند (بدون کلیک‌بیت).
- ۳ تا ۵ پاراگراف یک‌خطی که داستان را با جزئیات واقعی و عدد روایت کند.
- یک درس روشن که دیگران بتوانند فردا به کار ببرند.
- یک سؤال پایانی برای شروع گفت‌وگو.
طول کل: ۱۲۰۰ تا ۱۸۰۰ کاراکتر. حداکثر ۳ هشتگ. لحن: فروتن ولی مطمئن.
سپس دو قلاب جایگزین برای خط اول پیشنهاد بده.`,
      ar: `أنت محرّر محتوى لينكدإن للمديرين والمتخصصين.
تجربتي: {{experience}}
مجال العمل: {{field}}

اكتب منشور لينكدإن بهذه البنية:
- السطر الأول: جملة توقف القارئ (دون إثارة مضلّلة).
- من 3 إلى 5 فقرات من سطر واحد تروي القصة بتفاصيل حقيقية وأرقام.
- درس واضح يمكن للآخرين تطبيقه غدًا.
- سؤال ختامي يفتح النقاش.
الطول الكلي: 1200 إلى 1800 حرف. 3 وسوم كحد أقصى. النبرة: متواضعة لكن واثقة.
ثم اقترح خطافين بديلين للسطر الأول.`,
      en: `You are a LinkedIn content editor for executives and specialists.
My experience: {{experience}}
Field: {{field}}

Write a LinkedIn post with this structure:
- First line: a sentence that stops the scroll (no clickbait).
- 3–5 one-line paragraphs telling the story with real details and numbers.
- One clear lesson others can apply tomorrow.
- A closing question to start a conversation.
Total length: 1,200–1,800 characters. Max 3 hashtags. Tone: humble but confident.
Then suggest two alternative first-line hooks.`,
    },
    variables: [
      v("experience", {
        fa: "تجربه یا اتفاق کاری",
        ar: "التجربة أو الموقف المهني",
        en: "Work experience or event",
      }),
      v("field", { fa: "حوزه‌ی کاری", ar: "المجال", en: "Field" }),
    ],
  },
  {
    slug: "instagram-ad-copy-variants",
    categories: ["copywriting", "social-media"],
    tier: "pro",
    outputType: "text",
    models: ["ChatGPT", "Claude"],
    quality: 88,
    trending: 70,
    priceToman: 89_000,
    priceStars: 110,
    title: {
      fa: "متن تبلیغ اینستاگرام در ۶ زاویه‌ی روانشناختی",
      ar: "نص إعلان إنستغرام بست زوايا نفسية",
      en: "Instagram Ad Copy in 6 Psychological Angles",
    },
    summary: {
      fa: "شش متن تبلیغاتی آماده‌ی تست بر پایه‌ی ترس از دست دادن، اثبات اجتماعی، کنجکاوی و…",
      ar: "ستة نصوص إعلانية جاهزة للاختبار مبنية على الخوف من الفوات والدليل الاجتماعي والفضول وغيرها.",
      en: "Six test-ready ad copies built on FOMO, social proof, curiosity and more.",
    },
    description: {
      fa: "برای کمپین‌های تبلیغاتی اینستاگرام و تلگرام؛ هر نسخه یک اهرم روانشناختی متفاوت دارد تا با بودجه‌ی کم بفهمید کدام پیام برای مخاطب شما کار می‌کند.",
      ar: "لحملات إعلانات إنستغرام وتيليغرام؛ كل نسخة تستخدم رافعة نفسية مختلفة لتعرف بميزانية صغيرة أي رسالة تنجح مع جمهورك.",
      en: "For Instagram and Telegram ad campaigns; each version pulls a different psychological lever so you learn on a small budget which message works for your audience.",
    },
    body: {
      fa: `تو متخصص تبلیغات پرفورمنس هستی.
محصول: {{product}} | قیمت: {{price}} | مخاطب: {{audience}} | مزیت اصلی: {{usp}}

شش متن تبلیغ بنویس، هر کدام با یک زاویه:
۱. ترس از دست دادن (کمبود یا مهلت واقعی — فقط اگر واقعی است)
۲. اثبات اجتماعی (نظر مشتری یا عدد)
۳. کنجکاوی
۴. درد و راه‌حل
۵. مقایسه‌ی قبل/بعد
۶. هویت («برای کسانی که…»)

برای هر نسخه: تیتر (حداکثر ۴۰ کاراکتر)، متن اصلی (حداکثر ۱۲۵ کاراکتر برای نمایش کامل)، دکمه‌ی دعوت به اقدام، و یک ایده‌ی تصویر.
ادعای غیرقابل‌اثبات یا وعده‌ی غیرواقعی ننویس. در پایان بگو کدام دو نسخه را اول تست کنیم و چرا.`,
      ar: `أنت متخصص في الإعلانات القائمة على الأداء.
المنتج: {{product}} | السعر: {{price}} | الجمهور: {{audience}} | الميزة الأساسية: {{usp}}

اكتب ستة نصوص إعلانية، لكل منها زاوية:
1. الخوف من الفوات (ندرة أو مهلة حقيقية — فقط إن كانت حقيقية)
2. الدليل الاجتماعي (رأي عميل أو رقم)
3. الفضول
4. المشكلة والحل
5. مقارنة قبل/بعد
6. الهوية («لمن…»)

لكل نسخة: عنوان (40 حرفًا كحد أقصى)، نص رئيسي (125 حرفًا كحد أقصى ليظهر كاملًا)، زر دعوة لاتخاذ إجراء، وفكرة للصورة.
لا تكتب ادعاءات غير قابلة للإثبات أو وعودًا غير واقعية. في النهاية حدّد أي نسختين نختبر أولًا ولماذا.`,
      en: `You are a performance advertising specialist.
Product: {{product}} | Price: {{price}} | Audience: {{audience}} | Main benefit: {{usp}}

Write six ad copies, each with a different angle:
1. FOMO (real scarcity or deadline — only if it is real)
2. Social proof (a customer quote or a number)
3. Curiosity
4. Pain and solution
5. Before/after
6. Identity ("for people who…")

For each: headline (max 40 characters), primary text (max 125 characters so it shows in full), CTA button, and an image idea.
No unverifiable claims or unrealistic promises. Finish by recommending which two versions to test first and why.`,
    },
    variables: [
      v("product", { fa: "محصول", ar: "المنتج", en: "Product" }),
      v("price", { fa: "قیمت", ar: "السعر", en: "Price" }, { required: false }),
      v("audience", { fa: "مخاطب", ar: "الجمهور", en: "Audience" }),
      v("usp", { fa: "مزیت اصلی", ar: "الميزة الأساسية", en: "Main benefit" }),
    ],
  },
  {
    slug: "brand-voice-guide",
    categories: ["copywriting", "productivity"],
    tier: "premium",
    outputType: "text",
    models: ["Claude", "ChatGPT"],
    quality: 94,
    trending: 63,
    priceToman: 190_000,
    priceStars: 240,
    title: {
      fa: "راهنمای کامل لحن و صدای برند",
      ar: "دليل متكامل لنبرة العلامة التجارية وصوتها",
      en: "Complete Brand Voice Guide",
    },
    summary: {
      fa: "سند رسمی لحن برند با اصول، واژه‌نامه، بایدها و نبایدها و نمونه‌بازنویسی برای هر کانال.",
      ar: "وثيقة رسمية لنبرة العلامة مع المبادئ والمعجم وما يجب وما لا يجب ونماذج إعادة صياغة لكل قناة.",
      en: "An official brand voice document with principles, glossary, do's and don'ts, and rewrite examples per channel.",
    },
    description: {
      fa: "یک سیستم چندمرحله‌ای: ابتدا از شما مصاحبه می‌کند، سپس شخصیت برند را تعریف می‌کند و در نهایت سندی می‌سازد که هر نویسنده یا هوش مصنوعی دیگری بتواند با آن دقیقاً به زبان برند شما بنویسد. خروجی را می‌توانید به‌عنوان «پرامپت سیستمی» برای تیم محتوا استفاده کنید.",
      ar: "نظام متعدد المراحل: يجري معك مقابلة أولًا، ثم يحدد شخصية العلامة، وأخيرًا يبني وثيقة تمكّن أي كاتب أو نموذج ذكاء اصطناعي من الكتابة بلغة علامتك بدقة. يمكنك استخدام المخرجات «موجّه نظام» لفريق المحتوى.",
      en: "A multi-stage system: it interviews you first, then defines the brand personality, and finally produces a document any writer — or any AI — can use to write exactly in your brand's voice. Use the output as a system prompt for your content team.",
    },
    body: {
      fa: `تو مدیر ارشد برند و زبان‌شناس هستی. وظیفه‌ات ساختن «راهنمای لحن برند» برای {{brand_name}} است.
اطلاعات اولیه: حوزه: {{industry}} | مخاطب: {{audience}} | سه صفتی که برند باید القا کند: {{adjectives}}
نمونه‌ای از متن فعلی برند (اختیاری): {{sample_text}}

فاز ۱ — مصاحبه: پیش از نوشتن، حداکثر ۶ سؤال دقیق از من بپرس (رقبا، چیزی که برند هرگز نمی‌گوید، رابطه با مشتری، …). منتظر پاسخ بمان.
فاز ۲ — شخصیت: برند را به‌صورت یک انسان توصیف کن (سن، شغل، نحوه‌ی حرف زدن) و ۴ اصل لحن بنویس؛ هر اصل با طیف «این هستیم / این نیستیم».
فاز ۳ — زبان: واژه‌نامه‌ی ترجیحی (۲۰ واژه)، واژه‌های ممنوع (۱۵ واژه)، قواعد نگارشی (اعداد، نیم‌فاصله، ایموجی، خطاب «تو/شما»).
فاز ۴ — کانال‌ها: تنظیم لحن برای اینستاگرام، پشتیبانی، ایمیل فروش، شرایط بحران؛ برای هر کدام یک نمونه‌ی «قبل/بعد».
فاز ۵ — خلاصه‌ی اجرایی: یک پاراگراف ۱۵۰ کلمه‌ای که بتوان آن را به‌عنوان پرامپت سیستمی به هر مدل هوش مصنوعی داد.

خروجی نهایی را با تیترهای مشخص و قابل کپی در یک سند بده.`,
      ar: `أنت مدير أول للعلامة التجارية ولغوي. مهمتك بناء «دليل نبرة العلامة» لـ {{brand_name}}.
معلومات أولية: القطاع: {{industry}} | الجمهور: {{audience}} | ثلاث صفات يجب أن توحي بها العلامة: {{adjectives}}
نموذج من نص العلامة الحالي (اختياري): {{sample_text}}

المرحلة 1 — المقابلة: قبل الكتابة اطرح عليّ 6 أسئلة دقيقة كحد أقصى (المنافسون، ما لا تقوله العلامة أبدًا، العلاقة مع العميل…). انتظر إجاباتي.
المرحلة 2 — الشخصية: صِف العلامة كإنسان (العمر، المهنة، طريقة الحديث) واكتب 4 مبادئ للنبرة؛ كل مبدأ بطيف «نحن هكذا / لسنا هكذا».
المرحلة 3 — اللغة: معجم مفضّل (20 كلمة)، كلمات ممنوعة (15 كلمة)، قواعد الكتابة (الأرقام، الرموز التعبيرية، صيغة المخاطبة).
المرحلة 4 — القنوات: ضبط النبرة لإنستغرام والدعم الفني وبريد المبيعات وحالات الأزمات؛ لكل منها مثال «قبل/بعد».
المرحلة 5 — ملخص تنفيذي: فقرة من 150 كلمة يمكن تقديمها «موجّه نظام» لأي نموذج ذكاء اصطناعي.

قدّم المخرجات النهائية في وثيقة واحدة بعناوين واضحة قابلة للنسخ.`,
      en: `You are a senior brand director and linguist. Your task is to build a brand voice guide for {{brand_name}}.
Inputs: Industry: {{industry}} | Audience: {{audience}} | Three adjectives the brand must convey: {{adjectives}}
Sample of current brand copy (optional): {{sample_text}}

Phase 1 — Interview: before writing, ask me up to 6 precise questions (competitors, what the brand would never say, relationship with customers…). Wait for my answers.
Phase 2 — Personality: describe the brand as a person (age, job, way of speaking) and write 4 voice principles, each as a "we are / we are not" spectrum.
Phase 3 — Language: preferred vocabulary (20 words), banned words (15), writing rules (numbers, emoji, formal vs. informal address).
Phase 4 — Channels: tone adjustments for Instagram, customer support, sales email and crisis situations, each with a before/after example.
Phase 5 — Executive summary: a 150-word paragraph that can be given to any AI model as a system prompt.

Deliver the final output as one document with clear, copyable headings.`,
    },
    variables: [
      v("brand_name", { fa: "نام برند", ar: "اسم العلامة", en: "Brand name" }),
      v("industry", { fa: "حوزه", ar: "القطاع", en: "Industry" }),
      v("audience", { fa: "مخاطب", ar: "الجمهور", en: "Audience" }),
      v("adjectives", { fa: "سه صفت برند", ar: "ثلاث صفات للعلامة", en: "Three brand adjectives" }),
      v(
        "sample_text",
        { fa: "نمونه متن فعلی", ar: "نموذج نص حالي", en: "Current copy sample" },
        { required: false },
      ),
    ],
  },
  {
    slug: "landing-page-copy-aida",
    categories: ["copywriting", "sales-email"],
    tier: "pro",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini"],
    quality: 90,
    trending: 58,
    priceToman: 99_000,
    priceStars: 125,
    title: {
      fa: "متن صفحه‌ی فرود با فرمول AIDA",
      ar: "نص صفحة الهبوط بصيغة AIDA",
      en: "Landing Page Copy with the AIDA Formula",
    },
    summary: {
      fa: "متن کامل صفحه‌ی فرود از تیتر تا سؤالات متداول، آماده‌ی طراحی.",
      ar: "نص كامل لصفحة الهبوط من العنوان حتى الأسئلة الشائعة، جاهز للتصميم.",
      en: "Complete landing page copy from headline to FAQ, ready for design.",
    },
    description: {
      fa: "هر بخش صفحه با یک هدف مشخص نوشته می‌شود: جلب توجه، ایجاد علاقه، برانگیختن خواسته و اقدام. اعتراض‌های رایج خریدار در بخش سؤالات پاسخ داده می‌شود.",
      ar: "يُكتب كل قسم من الصفحة بهدف محدد: جذب الانتباه، إثارة الاهتمام، تحفيز الرغبة، ثم الإجراء. وتُعالَج اعتراضات المشتري الشائعة في قسم الأسئلة.",
      en: "Every section is written with one job: attention, interest, desire, action. Common buyer objections are answered in the FAQ.",
    },
    body: {
      fa: `تو کپی‌رایتر تبدیل‌محور هستی و صفحه‌های فرودی نوشته‌ای که نرخ تبدیل بالای ۵٪ داشته‌اند.
محصول/خدمت: {{offer}} | مخاطب: {{audience}} | قیمت: {{price}} | بزرگ‌ترین مشکل مخاطب: {{pain}}

متن کامل صفحه را با این بخش‌ها بنویس:
۱. تیتر اصلی (۳ گزینه) + زیرتیتر
۲. بخش مشکل: درد مخاطب را با زبان خودش توصیف کن
۳. معرفی راه‌حل و ۳ مزیت کلیدی (مزیت، نه ویژگی)
۴. «چطور کار می‌کند» در ۳ قدم
۵. جای اثبات اجتماعی (با راهنمای اینکه چه نظری از مشتری بگیریم)
۶. پیشنهاد و قیمت + ضمانت
۷. سؤالات متداول: ۶ اعتراض رایج خریدار و پاسخ صادقانه
۸. دعوت به اقدام نهایی
برای هر بخش یک یادداشت کوتاه برای طراح بنویس (چه تصویری، کجا دکمه).`,
      ar: `أنت كاتب إعلانات يركّز على التحويل وكتبت صفحات هبوط تجاوز معدل تحويلها 5%.
المنتج/الخدمة: {{offer}} | الجمهور: {{audience}} | السعر: {{price}} | أكبر مشكلة لدى الجمهور: {{pain}}

اكتب نص الصفحة كاملًا بهذه الأقسام:
1. العنوان الرئيسي (3 خيارات) + عنوان فرعي
2. قسم المشكلة: صف ألم الجمهور بلغته
3. تقديم الحل و3 فوائد رئيسية (فوائد لا مواصفات)
4. «كيف يعمل» في 3 خطوات
5. مكان الدليل الاجتماعي (مع إرشاد حول نوع الشهادة المطلوبة من العملاء)
6. العرض والسعر + الضمان
7. الأسئلة الشائعة: 6 اعتراضات شائعة للمشتري مع إجابات صادقة
8. الدعوة النهائية لاتخاذ إجراء
لكل قسم اكتب ملاحظة قصيرة للمصمّم (أي صورة، وأين الزر).`,
      en: `You are a conversion copywriter who has written landing pages converting above 5%.
Offer: {{offer}} | Audience: {{audience}} | Price: {{price}} | Audience's biggest problem: {{pain}}

Write the full page copy with these sections:
1. Main headline (3 options) + subheadline
2. Problem section: describe the pain in the audience's own words
3. Solution intro and 3 key benefits (benefits, not features)
4. "How it works" in 3 steps
5. Social proof placeholder (with guidance on which testimonial to collect)
6. Offer and price + guarantee
7. FAQ: 6 common buyer objections with honest answers
8. Final call to action
Add a short note for the designer under each section (what image, where the button goes).`,
    },
    variables: [
      v("offer", { fa: "محصول یا خدمت", ar: "المنتج أو الخدمة", en: "Product or service" }),
      v("audience", { fa: "مخاطب", ar: "الجمهور", en: "Audience" }),
      v("price", { fa: "قیمت", ar: "السعر", en: "Price" }),
      v("pain", { fa: "مشکل اصلی مخاطب", ar: "المشكلة الأساسية", en: "Main pain point" }),
    ],
  },
  {
    slug: "product-description-ecommerce",
    categories: ["copywriting", "seo-content"],
    tier: "free",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini", "DeepSeek"],
    quality: 86,
    trending: 66,
    title: {
      fa: "توضیحات محصول فروشگاه اینترنتی",
      ar: "وصف منتج للمتجر الإلكتروني",
      en: "E-commerce Product Description",
    },
    summary: {
      fa: "توضیحات محصول فروش‌محور و سئوشده برای دیجی‌کالا، باسلام یا سایت شخصی.",
      ar: "وصف منتج يركّز على البيع ومحسّن لمحركات البحث لمتجرك أو منصات البيع.",
      en: "Sales-focused, SEO-friendly product descriptions for marketplaces or your own store.",
    },
    description: {
      fa: "ویژگی‌های خشک محصول را به مزیت‌هایی تبدیل می‌کند که خریدار را قانع می‌کند، و ساختاری خوانا با تیتر، بولت و مشخصات فنی می‌سازد.",
      ar: "يحوّل المواصفات الجافة إلى فوائد تقنع المشتري، ويبني بنية مقروءة بعناوين ونقاط ومواصفات فنية.",
      en: "Turns dry specs into benefits that convince buyers, in a scannable structure with headings, bullets and a spec table.",
    },
    body: {
      fa: `تو نویسنده‌ی محتوای فروشگاه اینترنتی هستی.
نام محصول: {{product_name}}
ویژگی‌ها و مشخصات: {{features}}
کلمه‌ی کلیدی اصلی: {{keyword}}

توضیحات محصول را بنویس:
- یک پاراگراف آغازین ۲ تا ۳ جمله‌ای که کلمه‌ی کلیدی را طبیعی در خود دارد و می‌گوید این محصول چه مشکلی را حل می‌کند.
- ۵ بولت «ویژگی ← مزیت برای خریدار».
- بخش «مناسب چه کسانی است».
- جدول مشخصات فنی.
- یک جمله‌ی پایانی برای ترغیب به خرید (بدون اغراق).
- یک عنوان سئو (حداکثر ۶۰ کاراکتر) و توضیح متا (حداکثر ۱۵۵ کاراکتر).`,
      ar: `أنت كاتب محتوى للمتاجر الإلكترونية.
اسم المنتج: {{product_name}}
الميزات والمواصفات: {{features}}
الكلمة المفتاحية الرئيسية: {{keyword}}

اكتب وصف المنتج:
- فقرة افتتاحية من جملتين أو ثلاث تتضمن الكلمة المفتاحية بشكل طبيعي وتوضح المشكلة التي يحلها المنتج.
- 5 نقاط «ميزة ← فائدة للمشتري».
- قسم «لمن يناسب».
- جدول المواصفات الفنية.
- جملة ختامية تشجع على الشراء (دون مبالغة).
- عنوان SEO (60 حرفًا كحد أقصى) ووصف ميتا (155 حرفًا كحد أقصى).`,
      en: `You are an e-commerce content writer.
Product name: {{product_name}}
Features and specs: {{features}}
Main keyword: {{keyword}}

Write the product description:
- An opening paragraph of 2–3 sentences that naturally includes the keyword and says what problem the product solves.
- 5 bullets in the form "feature → benefit to the buyer".
- A "Who it's for" section.
- A technical spec table.
- One closing sentence that encourages purchase (no exaggeration).
- An SEO title (max 60 characters) and meta description (max 155 characters).`,
    },
    variables: [
      v("product_name", { fa: "نام محصول", ar: "اسم المنتج", en: "Product name" }),
      v("features", { fa: "ویژگی‌ها", ar: "الميزات", en: "Features" }),
      v("keyword", { fa: "کلمه‌ی کلیدی", ar: "الكلمة المفتاحية", en: "Keyword" }),
    ],
  },
  {
    slug: "seo-blog-article-outline",
    categories: ["seo-content"],
    tier: "free",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini"],
    quality: 85,
    trending: 55,
    title: {
      fa: "سرفصل مقاله‌ی وبلاگ سئوشده",
      ar: "مخطط مقال مدونة محسّن لمحركات البحث",
      en: "SEO Blog Article Outline",
    },
    summary: {
      fa: "ساختار H2/H3 مقاله بر اساس نیت جست‌وجو، به همراه سؤالات کاربران و لینک‌سازی داخلی.",
      ar: "بنية H2/H3 للمقال وفق نية البحث، مع أسئلة المستخدمين والروابط الداخلية.",
      en: "H2/H3 article structure based on search intent, with user questions and internal links.",
    },
    description: {
      fa: "قبل از نوشتن مقاله، اسکلت درست را بسازید: نیت جست‌وجو تحلیل می‌شود، بخش‌ها اولویت‌بندی می‌شوند و جای مناسب برای پاسخ کوتاه (Featured Snippet) مشخص می‌شود.",
      ar: "قبل كتابة المقال ابنِ الهيكل الصحيح: تُحلَّل نية البحث، وتُرتَّب الأقسام، ويُحدَّد مكان الإجابة المختصرة (المقتطف المميّز).",
      en: "Build the right skeleton before writing: search intent is analyzed, sections are prioritized, and a spot for a featured-snippet answer is defined.",
    },
    body: {
      fa: `تو متخصص سئوی محتوا هستی.
کلمه‌ی کلیدی اصلی: {{keyword}} | مخاطب: {{audience}} | طول هدف: {{word_count}} کلمه

۱. نیت جست‌وجو را تشخیص بده (اطلاعاتی، تجاری، تراکنشی) و در یک جمله توضیح بده کاربر دقیقاً دنبال چیست.
۲. ۳ عنوان H1 پیشنهاد بده (حداکثر ۶۰ کاراکتر).
۳. سرفصل کامل H2 و H3 را بنویس و زیر هر H2 در یک خط بگو چه چیزی پوشش داده می‌شود.
۴. یک پاراگراف ۴۰ تا ۵۰ کلمه‌ای برای هدف‌گیری Featured Snippet بنویس.
۵. ۶ سؤال رایج کاربران برای بخش FAQ.
۶. ۸ کلمه‌ی کلیدی مرتبط (LSI) و ۳ ایده برای لینک داخلی.`,
      ar: `أنت متخصص في تحسين المحتوى لمحركات البحث.
الكلمة المفتاحية الرئيسية: {{keyword}} | الجمهور: {{audience}} | الطول المستهدف: {{word_count}} كلمة

1. حدّد نية البحث (معلوماتية، تجارية، معاملاتية) واشرح في جملة ما الذي يبحث عنه المستخدم تحديدًا.
2. اقترح 3 عناوين H1 (60 حرفًا كحد أقصى).
3. اكتب المخطط الكامل H2 وH3 مع سطر تحت كل H2 يوضح ما سيغطيه.
4. اكتب فقرة من 40–50 كلمة تستهدف المقتطف المميّز.
5. 6 أسئلة شائعة للمستخدمين لقسم الأسئلة المتكررة.
6. 8 كلمات مفتاحية مرتبطة و3 أفكار للروابط الداخلية.`,
      en: `You are a content SEO specialist.
Main keyword: {{keyword}} | Audience: {{audience}} | Target length: {{word_count}} words

1. Identify the search intent (informational, commercial, transactional) and explain in one sentence what the user is really looking for.
2. Suggest 3 H1 titles (max 60 characters).
3. Write the full H2/H3 outline with one line under each H2 describing what it covers.
4. Write a 40–50 word paragraph targeting the featured snippet.
5. 6 common user questions for the FAQ section.
6. 8 related (LSI) keywords and 3 internal-linking ideas.`,
    },
    variables: [
      v("keyword", { fa: "کلمه‌ی کلیدی", ar: "الكلمة المفتاحية", en: "Keyword" }),
      v("audience", { fa: "مخاطب", ar: "الجمهور", en: "Audience" }),
      v(
        "word_count",
        { fa: "تعداد کلمات", ar: "عدد الكلمات", en: "Word count" },
        { type: "number", default: "1500" },
      ),
    ],
  },
  {
    slug: "seo-content-brief-pillar",
    categories: ["seo-content"],
    tier: "premium",
    outputType: "text",
    models: ["Claude", "ChatGPT", "Gemini"],
    quality: 93,
    trending: 60,
    priceToman: 249_000,
    priceStars: 310,
    title: {
      fa: "سیستم نگارش مقاله‌ی ستون (Pillar) با استاندارد E-E-A-T",
      ar: "نظام كتابة مقال محوري (Pillar) وفق معيار E-E-A-T",
      en: "Pillar Article Writing System (E-E-A-T)",
    },
    summary: {
      fa: "بریف محتوایی، نگارش بخش‌به‌بخش و بازبینی سئو برای مقاله‌ی جامع ۳۰۰۰ کلمه‌ای.",
      ar: "موجز محتوى وكتابة قسمًا بقسم ومراجعة SEO لمقال شامل من 3000 كلمة.",
      en: "Content brief, section-by-section drafting and SEO review for a comprehensive 3,000-word article.",
    },
    description: {
      fa: "یک خط تولید سه‌مرحله‌ای که مقاله‌ای عمیق، دقیق و قابل اعتماد تولید می‌کند: تحلیل رقبا و شکاف محتوایی، نگارش با تجربه‌ی دست‌اول و مثال‌های بومی، و چک‌لیست نهایی سئو و خوانایی. مناسب صفحاتی که می‌خواهید برای کلمات رقابتی رتبه بگیرند.",
      ar: "خط إنتاج من ثلاث مراحل ينتج مقالًا عميقًا ودقيقًا وموثوقًا: تحليل المنافسين وفجوة المحتوى، والكتابة بتجربة مباشرة وأمثلة محلية، وقائمة تحقق نهائية للـSEO وسهولة القراءة. مناسب للصفحات التي تريدها أن تتصدر كلمات تنافسية.",
      en: "A three-stage production line for deep, accurate, trustworthy articles: competitor and content-gap analysis, drafting with first-hand experience and local examples, and a final SEO and readability checklist. Built for pages you want ranking on competitive keywords.",
    },
    body: {
      fa: `تو سردبیر یک رسانه‌ی تخصصی و متخصص سئو هستی. یک مقاله‌ی ستون درباره‌ی «{{topic}}» تولید می‌کنیم.
کلمه‌ی کلیدی اصلی: {{keyword}} | مخاطب: {{audience}} | تجربه یا داده‌ی اختصاصی ما: {{expertise}}

مرحله‌ی A — بریف (فقط همین را بده و منتظر تأیید من بمان):
- نیت جست‌وجو و مرحله‌ی قیف مخاطب
- ۵ زیرموضوعی که رقبا معمولاً پوشش می‌دهند و ۳ شکاف محتوایی که ما می‌توانیم پر کنیم
- سرفصل H2/H3 با تعداد کلمه‌ی تقریبی هر بخش (جمع حدود ۳۰۰۰)
- جای پیشنهادی برای جدول، چک‌لیست، نمودار و نقل‌قول کارشناس

مرحله‌ی B — نگارش (بعد از تأیید، بخش‌به‌بخش):
- هر بخش با یک جمله‌ی پاسخ مستقیم شروع شود، سپس توضیح و مثال بومی.
- از «تجربه یا داده‌ی اختصاصی ما» حداقل در ۳ جا استفاده کن تا محتوا دست‌اول باشد.
- آمار فقط با ذکر منبع؛ اگر مطمئن نیستی، [نیاز به منبع] بگذار و عدد نساز.
- جمله‌ها کوتاه، پاراگراف‌ها حداکثر ۴ خط، نیم‌فاصله‌ها درست.

مرحله‌ی C — بازبینی:
- چک‌لیست: کلمه‌ی کلیدی در H1، پاراگراف اول، یک H2 و متا؛ تراکم طبیعی؛ لینک‌های داخلی پیشنهادی؛ اسکیما FAQ.
- عنوان سئو، توضیح متا و نامک (slug) انگلیسی.
- ۳ پیشنهاد برای به‌روزرسانی فصلی مقاله.`,
      ar: `أنت رئيس تحرير منصة متخصصة وخبير SEO. سننتج مقالًا محوريًا عن «{{topic}}».
الكلمة المفتاحية الرئيسية: {{keyword}} | الجمهور: {{audience}} | خبرتنا أو بياناتنا الخاصة: {{expertise}}

المرحلة A — الموجز (قدّمه فقط وانتظر موافقتي):
- نية البحث ومرحلة الجمهور في قمع التسويق
- 5 مواضيع فرعية يغطيها المنافسون عادةً و3 فجوات محتوى يمكننا سدّها
- مخطط H2/H3 مع عدد الكلمات التقريبي لكل قسم (المجموع نحو 3000)
- أماكن مقترحة لجدول وقائمة تحقق ورسم بياني واقتباس خبير

المرحلة B — الكتابة (بعد الموافقة، قسمًا بقسم):
- يبدأ كل قسم بجملة إجابة مباشرة، ثم الشرح ومثال من واقع المنطقة.
- استخدم «خبرتنا أو بياناتنا الخاصة» في 3 مواضع على الأقل ليكون المحتوى أصيلًا.
- الإحصاءات مع ذكر المصدر فقط؛ إن لم تكن متأكدًا ضع [بحاجة إلى مصدر] ولا تخترع أرقامًا.
- جمل قصيرة، وفقرات لا تتجاوز 4 أسطر.

المرحلة C — المراجعة:
- قائمة تحقق: الكلمة المفتاحية في H1 والفقرة الأولى وأحد عناوين H2 والميتا؛ كثافة طبيعية؛ روابط داخلية مقترحة؛ مخطط FAQ.
- عنوان SEO ووصف ميتا ورابط (slug) بالإنجليزية.
- 3 اقتراحات لتحديث المقال موسميًا.`,
      en: `You are the editor-in-chief of a specialist publication and an SEO expert. We are producing a pillar article about "{{topic}}".
Main keyword: {{keyword}} | Audience: {{audience}} | Our proprietary experience or data: {{expertise}}

Stage A — Brief (deliver only this and wait for my approval):
- Search intent and funnel stage
- 5 subtopics competitors usually cover and 3 content gaps we can fill
- H2/H3 outline with approximate word counts per section (about 3,000 total)
- Suggested spots for a table, checklist, chart and expert quote

Stage B — Drafting (after approval, section by section):
- Each section opens with a one-sentence direct answer, then explanation and a local example.
- Use "our proprietary experience or data" in at least 3 places so the content is first-hand.
- Statistics only with a cited source; if unsure, write [source needed] — never invent numbers.
- Short sentences; paragraphs max 4 lines.

Stage C — Review:
- Checklist: keyword in H1, first paragraph, one H2 and meta; natural density; suggested internal links; FAQ schema.
- SEO title, meta description and English slug.
- 3 suggestions for a quarterly refresh of the article.`,
    },
    variables: [
      v("topic", { fa: "موضوع", ar: "الموضوع", en: "Topic" }),
      v("keyword", { fa: "کلمه‌ی کلیدی", ar: "الكلمة المفتاحية", en: "Keyword" }),
      v("audience", { fa: "مخاطب", ar: "الجمهور", en: "Audience" }),
      v("expertise", {
        fa: "تجربه یا داده‌ی اختصاصی",
        ar: "الخبرة أو البيانات الخاصة",
        en: "Proprietary experience or data",
      }),
    ],
  },
];
