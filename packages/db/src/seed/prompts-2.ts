import { type SeedPrompt, v } from "./types";

export const PROMPTS_2: SeedPrompt[] = [
  {
    slug: "keyword-cluster-topical-map",
    categories: ["seo-content"],
    tier: "pro",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini"],
    quality: 88,
    trending: 57,
    priceToman: 89_000,
    priceStars: 110,
    title: {
      fa: "نقشه‌ی موضوعی و خوشه‌بندی کلمات کلیدی",
      ar: "الخريطة الموضوعية وتجميع الكلمات المفتاحية",
      en: "Topical Map & Keyword Clustering",
    },
    summary: {
      fa: "تبدیل فهرست کلمات کلیدی به خوشه‌های محتوایی، صفحات ستون و برنامه‌ی انتشار.",
      ar: "تحويل قائمة الكلمات المفتاحية إلى مجموعات محتوى وصفحات محورية وخطة نشر.",
      en: "Turn a keyword list into content clusters, pillar pages and a publishing plan.",
    },
    description: {
      fa: "برای سایت‌هایی که می‌خواهند در یک حوزه «مرجع» شوند: کلمات بر اساس نیت جست‌وجو گروه‌بندی، تداخل صفحات (کنیبالیزیشن) شناسایی و ترتیب انتشار پیشنهاد می‌شود.",
      ar: "للمواقع التي تريد أن تصبح «مرجعًا» في مجالها: تُجمَّع الكلمات حسب نية البحث، ويُكشف تنافس الصفحات الداخلي، ويُقترح ترتيب النشر.",
      en: "For sites that want topical authority: keywords are grouped by intent, cannibalization risks are flagged, and a publishing order is proposed.",
    },
    body: {
      fa: `تو استراتژیست سئو هستی و در ساخت «اقتدار موضوعی» تخصص داری.
حوزه‌ی سایت: {{niche}}
فهرست کلمات کلیدی (هر خط یکی): {{keywords}}

۱. کلمات را بر اساس نیت جست‌وجو و موضوع در خوشه‌ها گروه‌بندی کن؛ هر خوشه: نام، کلمه‌ی اصلی، کلمات فرعی، نیت.
۲. برای هر خوشه مشخص کن صفحه‌ی ستون است یا مقاله‌ی پشتیبان و پیشنهاد عنوان بده.
۳. کلماتی که خطر تداخل دارند (دو صفحه برای یک نیت) را علامت بزن و راه‌حل بده.
۴. نقشه‌ی لینک‌سازی داخلی بین ستون و پشتیبان‌ها را ترسیم کن (فهرست «از ← به»).
۵. ترتیب انتشار ۱۲ هفته‌ای بر اساس «سرعت رسیدن به نتیجه» پیشنهاد کن.
اگر کلمه‌ای به این حوزه ربط ندارد، جدا فهرست کن.`,
      ar: `أنت استراتيجي SEO متخصص في بناء «السلطة الموضوعية».
مجال الموقع: {{niche}}
قائمة الكلمات المفتاحية (كلمة في كل سطر): {{keywords}}

1. جمّع الكلمات في مجموعات حسب نية البحث والموضوع؛ لكل مجموعة: الاسم، الكلمة الرئيسية، الكلمات الفرعية، النية.
2. حدّد لكل مجموعة إن كانت صفحة محورية أم مقالًا داعمًا واقترح عنوانًا.
3. ضع علامة على الكلمات المعرّضة للتنافس الداخلي (صفحتان لنية واحدة) واقترح حلًا.
4. ارسم خريطة الروابط الداخلية بين الصفحة المحورية والمقالات الداعمة (قائمة «من ← إلى»).
5. اقترح ترتيب نشر على 12 أسبوعًا حسب «سرعة الوصول إلى النتائج».
إن كانت هناك كلمة لا تتعلق بالمجال فاذكرها منفصلة.`,
      en: `You are an SEO strategist specializing in topical authority.
Site niche: {{niche}}
Keyword list (one per line): {{keywords}}

1. Group the keywords into clusters by intent and topic; for each: name, head keyword, supporting keywords, intent.
2. For each cluster, decide pillar page vs. supporting article and suggest a title.
3. Flag cannibalization risks (two pages for one intent) and propose a fix.
4. Map internal links between pillar and supporting pages ("from → to" list).
5. Propose a 12-week publishing order based on time-to-results.
List any off-topic keywords separately.`,
    },
    variables: [
      v("niche", { fa: "حوزه‌ی سایت", ar: "مجال الموقع", en: "Site niche" }),
      v("keywords", { fa: "فهرست کلمات کلیدی", ar: "قائمة الكلمات المفتاحية", en: "Keyword list" }),
    ],
  },
  {
    slug: "youtube-video-seo-pack",
    categories: ["seo-content", "social-media"],
    tier: "free",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini"],
    quality: 83,
    trending: 62,
    title: {
      fa: "بسته‌ی سئوی ویدیوی یوتیوب و آپارات",
      ar: "حزمة تحسين فيديو يوتيوب",
      en: "YouTube Video SEO Pack",
    },
    summary: {
      fa: "عنوان، توضیحات، تگ، فصل‌بندی و متن کاور برای ویدیوی یوتیوب یا آپارات.",
      ar: "عنوان ووصف ووسوم وفصول ونص الغلاف لفيديو يوتيوب.",
      en: "Title, description, tags, chapters and thumbnail text for a YouTube video.",
    },
    description: {
      fa: "همه‌ی متن‌های اطراف ویدیو را یک‌جا و بهینه برای جست‌وجو و نرخ کلیک تولید می‌کند.",
      ar: "ينتج كل النصوص المحيطة بالفيديو دفعة واحدة، محسّنة للبحث ونسبة النقر.",
      en: "Produces every piece of text around your video at once, optimized for search and click-through rate.",
    },
    body: {
      fa: `تو متخصص رشد کانال یوتیوب هستی.
موضوع ویدیو: {{video_topic}} | نکات اصلی ویدیو: {{key_points}} | مدت: {{length}} دقیقه

بنویس:
۱. ۵ عنوان (حداکثر ۶۰ کاراکتر) با ترکیب کلمه‌ی کلیدی و کنجکاوی.
۲. ۴ متن کوتاه برای کاور (حداکثر ۴ کلمه).
۳. توضیحات: دو خط اول جذاب و حاوی کلمه‌ی کلیدی، سپس خلاصه‌ی ویدیو، فصل‌بندی با زمان تقریبی، و دعوت به عضویت.
۴. ۱۵ تگ از عام به خاص.
۵. یک کامنت سنجاق‌شده که بحث را شروع کند.`,
      ar: `أنت متخصص في تنمية قنوات يوتيوب.
موضوع الفيديو: {{video_topic}} | النقاط الرئيسية: {{key_points}} | المدة: {{length}} دقيقة

اكتب:
1. 5 عناوين (60 حرفًا كحد أقصى) تمزج الكلمة المفتاحية بالفضول.
2. 4 نصوص قصيرة للصورة المصغّرة (4 كلمات كحد أقصى).
3. الوصف: سطران أولان جذابان يتضمنان الكلمة المفتاحية، ثم ملخص الفيديو، وفصول بتوقيت تقريبي، ودعوة للاشتراك.
4. 15 وسمًا من العام إلى الخاص.
5. تعليقًا مثبتًا يفتح النقاش.`,
      en: `You are a YouTube channel growth specialist.
Video topic: {{video_topic}} | Key points: {{key_points}} | Length: {{length}} minutes

Write:
1. 5 titles (max 60 characters) combining the keyword with curiosity.
2. 4 short thumbnail texts (max 4 words).
3. Description: two compelling first lines with the keyword, then a summary, chapters with approximate timestamps, and a subscribe CTA.
4. 15 tags from broad to specific.
5. A pinned comment that starts a discussion.`,
    },
    variables: [
      v("video_topic", { fa: "موضوع ویدیو", ar: "موضوع الفيديو", en: "Video topic" }),
      v("key_points", { fa: "نکات اصلی", ar: "النقاط الرئيسية", en: "Key points" }),
      v("length", { fa: "مدت (دقیقه)", ar: "المدة (دقيقة)", en: "Length (minutes)" }, { type: "number" }),
    ],
  },
  {
    slug: "cold-email-sequence-b2b",
    categories: ["sales-email"],
    tier: "pro",
    outputType: "text",
    models: ["ChatGPT", "Claude"],
    quality: 89,
    trending: 64,
    priceToman: 99_000,
    priceStars: 125,
    title: {
      fa: "توالی ایمیل سرد B2B در ۴ مرحله",
      ar: "سلسلة بريد بارد B2B من 4 مراحل",
      en: "4-Step B2B Cold Email Sequence",
    },
    summary: {
      fa: "چهار ایمیل شخصی‌سازی‌شده با فاصله‌ی زمانی مشخص که پاسخ می‌گیرند، نه اسپم.",
      ar: "أربع رسائل مخصّصة بفواصل زمنية محددة تحصل على ردود لا تُعامل كرسائل مزعجة.",
      en: "Four personalized emails with set intervals that get replies, not spam flags.",
    },
    description: {
      fa: "هر ایمیل کوتاه، مرتبط و با یک درخواست کوچک است. خط موضوع‌ها برای نرخ باز شدن و متن‌ها برای پاسخ بهینه شده‌اند.",
      ar: "كل رسالة قصيرة وذات صلة وتتضمن طلبًا صغيرًا. سطور الموضوع محسّنة لنسبة الفتح والنصوص للحصول على رد.",
      en: "Each email is short, relevant and makes one small ask. Subject lines are tuned for opens and bodies for replies.",
    },
    body: {
      fa: `تو متخصص فروش B2B و نویسنده‌ی ایمیل‌های سرد با نرخ پاسخ بالا هستی.
فرستنده: {{sender_company}} — {{offer}}
گیرنده: سمت {{prospect_role}} در شرکتی در حوزه‌ی {{prospect_industry}}
نکته‌ی شخصی‌سازی (خبر، پست، رشد اخیر): {{personal_hook}}

یک توالی ۴ ایمیلی بنویس:
- ایمیل ۱ (روز ۱): حداکثر ۹۰ کلمه؛ با نکته‌ی شخصی‌سازی شروع کن، یک مشکل محتمل را نام ببر، یک نتیجه‌ی مشخص بگو، درخواست کوچک (تماس ۱۵ دقیقه‌ای).
- ایمیل ۲ (روز ۳): یک ایده‌ی رایگان و کاربردی برای شرکت آن‌ها.
- ایمیل ۳ (روز ۷): یک نمونه‌ی موفق کوتاه (مشتری مشابه، عدد).
- ایمیل ۴ (روز ۱۲): خداحافظی محترمانه که در را باز می‌گذارد.
برای هر ایمیل ۲ خط موضوع (حداکثر ۵ کلمه، بدون حروف تبلیغاتی). از عبارت‌های اسپم‌گونه («رایگان!!»، «فوری») پرهیز کن.`,
      ar: `أنت متخصص مبيعات B2B وكاتب رسائل بريد بارد عالية الاستجابة.
المرسل: {{sender_company}} — {{offer}}
المستلم: بمنصب {{prospect_role}} في شركة بقطاع {{prospect_industry}}
نقطة التخصيص (خبر، منشور، نمو حديث): {{personal_hook}}

اكتب سلسلة من 4 رسائل:
- الرسالة 1 (اليوم 1): 90 كلمة كحد أقصى؛ ابدأ بنقطة التخصيص، سمِّ مشكلة محتملة، اذكر نتيجة محددة، واطلب طلبًا صغيرًا (مكالمة 15 دقيقة).
- الرسالة 2 (اليوم 3): فكرة مجانية وعملية لشركتهم.
- الرسالة 3 (اليوم 7): قصة نجاح قصيرة (عميل مشابه، رقم).
- الرسالة 4 (اليوم 12): وداع مهذب يترك الباب مفتوحًا.
لكل رسالة سطرا موضوع (5 كلمات كحد أقصى). تجنّب العبارات التي تشبه البريد المزعج («مجانًا!!»، «عاجل»).`,
      en: `You are a B2B sales specialist who writes high-reply cold emails.
Sender: {{sender_company}} — {{offer}}
Recipient: {{prospect_role}} at a company in {{prospect_industry}}
Personalization hook (news, post, recent growth): {{personal_hook}}

Write a 4-email sequence:
- Email 1 (day 1): max 90 words; open with the personalization hook, name a likely problem, state one concrete result, make a small ask (15-minute call).
- Email 2 (day 3): one free, practical idea for their company.
- Email 3 (day 7): a short success story (similar customer, a number).
- Email 4 (day 12): a polite break-up that leaves the door open.
Two subject lines per email (max 5 words, no salesy caps). Avoid spammy phrases ("FREE!!", "urgent").`,
    },
    variables: [
      v("sender_company", { fa: "شرکت فرستنده", ar: "الشركة المرسِلة", en: "Sender company" }),
      v("offer", { fa: "پیشنهاد", ar: "العرض", en: "Offer" }),
      v("prospect_role", { fa: "سمت گیرنده", ar: "منصب المستلم", en: "Prospect role" }),
      v("prospect_industry", { fa: "صنعت گیرنده", ar: "قطاع المستلم", en: "Prospect industry" }),
      v(
        "personal_hook",
        { fa: "نکته‌ی شخصی‌سازی", ar: "نقطة التخصيص", en: "Personalization hook" },
        { required: false },
      ),
    ],
  },
  {
    slug: "customer-reply-angry-client",
    categories: ["sales-email", "productivity"],
    tier: "free",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini", "DeepSeek"],
    quality: 87,
    trending: 49,
    title: {
      fa: "پاسخ حرفه‌ای به مشتری ناراضی",
      ar: "رد احترافي على عميل غاضب",
      en: "Professional Reply to an Upset Customer",
    },
    summary: {
      fa: "پاسخی همدلانه و راه‌حل‌محور که مشتری عصبانی را به مشتری وفادار تبدیل می‌کند.",
      ar: "ردّ متعاطف يركّز على الحل يحوّل العميل الغاضب إلى عميل وفيّ.",
      en: "An empathetic, solution-focused reply that turns an angry customer into a loyal one.",
    },
    description: {
      fa: "بر اساس مدل «شنیدن، عذرخواهی، حل، پیگیری». دو نسخه می‌دهد: پیام کوتاه دایرکت و ایمیل رسمی.",
      ar: "مبني على نموذج «الاستماع، الاعتذار، الحل، المتابعة». يقدّم نسختين: رسالة مباشرة قصيرة وبريدًا رسميًا.",
      en: "Built on the listen–apologize–solve–follow up model. Gives two versions: a short DM and a formal email.",
    },
    body: {
      fa: `تو مدیر تجربه‌ی مشتری با مهارت بالا در مدیریت شکایت هستی.
پیام مشتری: {{customer_message}}
واقعیت ماجرا از طرف ما: {{our_side}}
چیزی که می‌توانیم پیشنهاد بدهیم: {{remedy}}

دو پاسخ بنویس:
الف) پیام کوتاه برای دایرکت یا پیام‌رسان (حداکثر ۷۰ کلمه)
ب) ایمیل رسمی‌تر (حداکثر ۱۸۰ کلمه)
اصول: احساس مشتری را با کلمات خودش تأیید کن؛ عذرخواهی صادقانه بدون بهانه؛ راه‌حل مشخص با زمان؛ هیچ تقصیری به مشتری نسبت نده؛ قول غیرواقعی نده؛ با یک قدم پیگیری تمام کن.
در پایان یک جمله بنویس که چه چیزی را نباید در این موقعیت گفت.`,
      ar: `أنت مدير تجربة عملاء بارع في إدارة الشكاوى.
رسالة العميل: {{customer_message}}
حقيقة ما حدث من جهتنا: {{our_side}}
ما يمكننا تقديمه: {{remedy}}

اكتب ردّين:
أ) رسالة قصيرة للرسائل المباشرة أو تطبيقات المراسلة (70 كلمة كحد أقصى)
ب) بريدًا أكثر رسمية (180 كلمة كحد أقصى)
المبادئ: أكّد مشاعر العميل بكلماته؛ اعتذار صادق دون أعذار؛ حل محدد بموعد؛ لا تُلقِ اللوم على العميل؛ لا تقدّم وعودًا غير واقعية؛ اختم بخطوة متابعة.
في النهاية اكتب جملة عمّا يجب تجنّب قوله في هذا الموقف.`,
      en: `You are a customer experience manager skilled at handling complaints.
Customer message: {{customer_message}}
What actually happened on our side: {{our_side}}
What we can offer: {{remedy}}

Write two replies:
a) A short DM/messenger reply (max 70 words)
b) A more formal email (max 180 words)
Principles: acknowledge the customer's feelings in their own words; sincere apology without excuses; a concrete fix with a timeline; never blame the customer; no unrealistic promises; end with a follow-up step.
Finish with one sentence on what NOT to say in this situation.`,
    },
    example: {
      fa: "الف) سلام سارا جان، حق داری ناراحت باشی؛ سفارشی که برای تولد خریده بودی دیر رسید و این اصلاً قابل قبول نیست. از طرف تیم عذر می‌خواهم. امروز تا ساعت ۱۸ هزینه‌ی ارسال به حسابت برمی‌گردد و کد ۲۰٪ تخفیف برای خرید بعدی‌ات فرستادم. فردا خودم پیگیری می‌کنم که همه‌چیز درست شده باشد.",
      ar: "أ) مرحبًا سارة، من حقك أن تنزعجي؛ فالطلب الذي اشتريتِه لعيد الميلاد تأخر وهذا غير مقبول. أعتذر باسم الفريق. سنعيد رسوم الشحن إلى حسابك اليوم قبل الساعة 6 مساءً، وأرسلت لك رمز خصم 20% لطلبك القادم. سأتابع غدًا بنفسي للتأكد من أن كل شيء على ما يرام.",
      en: "a) Hi Sarah, you have every right to be upset — the birthday order arrived late, and that's not acceptable. I'm sorry on behalf of the team. We're refunding the shipping fee today by 6 pm, and I've sent you a 20% code for your next order. I'll personally follow up tomorrow to make sure everything is sorted.",
    },
    variables: [
      v("customer_message", { fa: "پیام مشتری", ar: "رسالة العميل", en: "Customer message" }),
      v("our_side", { fa: "واقعیت از طرف ما", ar: "ما حدث من جهتنا", en: "Our side of the story" }),
      v("remedy", { fa: "جبران پیشنهادی", ar: "التعويض المقترح", en: "Offered remedy" }),
    ],
  },
  {
    slug: "sales-objection-handling",
    categories: ["sales-email"],
    tier: "pro",
    outputType: "text",
    models: ["ChatGPT", "Claude"],
    quality: 87,
    trending: 45,
    priceToman: 79_000,
    priceStars: 99,
    title: {
      fa: "پاسخ به اعتراض‌های خریدار (گران است، فکر می‌کنم…)",
      ar: "الرد على اعتراضات المشتري (غالٍ، سأفكر…)",
      en: "Handling Buyer Objections (\"Too expensive\", \"I'll think about it\"…)",
    },
    summary: {
      fa: "اسکریپت پاسخ به ۱۰ اعتراض رایج فروش برای چت، تلفن و دایرکت.",
      ar: "نص للرد على 10 اعتراضات بيع شائعة للدردشة والهاتف والرسائل المباشرة.",
      en: "Scripts for the 10 most common sales objections, for chat, phone and DMs.",
    },
    description: {
      fa: "برای فروشندگان اینستاگرامی و تیم‌های فروش تلفنی؛ هر اعتراض با تکنیک «تأیید، سؤال، بازتعریف، پیشنهاد» پاسخ داده می‌شود.",
      ar: "لبائعي إنستغرام وفرق المبيعات الهاتفية؛ يُعالَج كل اعتراض بتقنية «التأكيد، السؤال، إعادة التأطير، العرض».",
      en: "For Instagram sellers and phone sales teams; each objection is handled with the acknowledge–ask–reframe–offer technique.",
    },
    body: {
      fa: `تو مربی فروش مشاوره‌ای هستی.
محصول: {{product}} | قیمت: {{price}} | رقیب یا جایگزین اصلی: {{alternative}}

برای این ۱۰ اعتراض پاسخ بنویس: «گران است»، «باید فکر کنم»، «با همسر/شریکم مشورت کنم»، «الان وقتش نیست»، «جای دیگر ارزان‌تر است»، «مطمئن نیستم جواب بدهد»، «قبلاً مشابهش را امتحان کردم»، «پول ندارم»، «بعداً پیام می‌دهم»، «فقط داشتم قیمت می‌گرفتم».
برای هر کدام: (۱) معنای پنهان اعتراض، (۲) پاسخ کوتاه برای چت (حداکثر ۴۰ کلمه)، (۳) پاسخ تلفنی با یک سؤال باز، (۴) کاری که نباید کرد.
لحن محترمانه و بدون فشار؛ هدف کمک به تصمیم درست است، نه اجبار.`,
      ar: `أنت مدرّب في البيع الاستشاري.
المنتج: {{product}} | السعر: {{price}} | المنافس أو البديل الرئيسي: {{alternative}}

اكتب ردودًا على هذه الاعتراضات العشرة: «غالٍ»، «سأفكر»، «سأستشير زوجي/شريكي»، «ليس الوقت مناسبًا»، «أرخص في مكان آخر»، «لست متأكدًا أنه سينجح»، «جربت شيئًا مشابهًا من قبل»، «ليس لدي مال»، «سأراسلك لاحقًا»، «كنت أسأل عن السعر فقط».
لكل اعتراض: (1) المعنى الخفي، (2) ردّ قصير للدردشة (40 كلمة كحد أقصى)، (3) ردّ هاتفي بسؤال مفتوح، (4) ما يجب تجنّبه.
النبرة محترمة ودون ضغط؛ الهدف مساعدة العميل على قرار صحيح لا إجباره.`,
      en: `You are a consultative sales coach.
Product: {{product}} | Price: {{price}} | Main competitor or alternative: {{alternative}}

Write responses to these 10 objections: "It's too expensive", "I need to think about it", "I need to ask my spouse/partner", "Now isn't the right time", "It's cheaper elsewhere", "I'm not sure it will work", "I tried something similar before", "I don't have the money", "I'll message you later", "I was just checking the price".
For each: (1) the hidden meaning, (2) a short chat reply (max 40 words), (3) a phone reply with one open question, (4) what not to do.
Respectful, no-pressure tone — the goal is helping the buyer decide well, not forcing them.`,
    },
    variables: [
      v("product", { fa: "محصول", ar: "المنتج", en: "Product" }),
      v("price", { fa: "قیمت", ar: "السعر", en: "Price" }),
      v("alternative", { fa: "رقیب یا جایگزین", ar: "المنافس أو البديل", en: "Competitor or alternative" }),
    ],
  },
  {
    slug: "newsletter-weekly-writer",
    categories: ["sales-email", "seo-content"],
    tier: "free",
    outputType: "text",
    models: ["ChatGPT", "Claude", "Gemini"],
    quality: 82,
    trending: 40,
    title: {
      fa: "خبرنامه‌ی هفتگی خواندنی",
      ar: "نشرة بريدية أسبوعية تُقرأ فعلًا",
      en: "A Weekly Newsletter People Actually Read",
    },
    summary: {
      fa: "خبرنامه‌ی ایمیلی یا کانال تلگرامی با یک ایده‌ی اصلی، نکات کوتاه و دعوت به پاسخ.",
      ar: "نشرة بريدية أو لقناة تيليغرام بفكرة رئيسية ونصائح قصيرة ودعوة للرد.",
      en: "An email or Telegram-channel newsletter with one big idea, quick tips and a reply prompt.",
    },
    description: {
      fa: "یادداشت‌های پراکنده‌ی هفته را به یک خبرنامه‌ی منسجم و شخصی تبدیل می‌کند که مخاطب منتظرش می‌ماند.",
      ar: "يحوّل ملاحظات الأسبوع المتفرقة إلى نشرة متماسكة وشخصية ينتظرها القرّاء.",
      en: "Turns your scattered notes from the week into a cohesive, personal newsletter readers look forward to.",
    },
    body: {
      fa: `تو نویسنده‌ی خبرنامه با سبک صمیمی و هوشمند هستی.
نام خبرنامه: {{newsletter_name}} | مخاطب: {{audience}}
یادداشت‌ها و لینک‌های این هفته: {{notes}}

ساختار:
۱. سه پیشنهاد برای خط موضوع (کنجکاوی + فایده).
۲. مقدمه‌ی ۲ جمله‌ای شخصی.
۳. «ایده‌ی اصلی هفته» در ۱۵۰ تا ۲۰۰ کلمه با یک مثال.
۴. «سه چیز کوتاه» — هر کدام ۲ خط.
۵. یک سؤال از مخاطب که به آن پاسخ دهد.
فقط از یادداشت‌ها استفاده کن و چیزی از خودت به‌عنوان واقعیت نساز.`,
      ar: `أنت كاتب نشرات بأسلوب ودود وذكي.
اسم النشرة: {{newsletter_name}} | الجمهور: {{audience}}
ملاحظات وروابط هذا الأسبوع: {{notes}}

البنية:
1. ثلاثة اقتراحات لسطر الموضوع (فضول + فائدة).
2. مقدمة شخصية من جملتين.
3. «فكرة الأسبوع» في 150–200 كلمة مع مثال.
4. «ثلاثة أشياء سريعة» — كل منها سطران.
5. سؤال للقارئ ليرد عليه.
استخدم الملاحظات فقط ولا تختلق حقائق من عندك.`,
      en: `You are a newsletter writer with a warm, smart style.
Newsletter name: {{newsletter_name}} | Audience: {{audience}}
This week's notes and links: {{notes}}

Structure:
1. Three subject line options (curiosity + benefit).
2. A personal two-sentence intro.
3. "Big idea of the week" in 150–200 words with one example.
4. "Three quick things" — two lines each.
5. One question for readers to reply to.
Use only the notes; don't invent facts.`,
    },
    variables: [
      v("newsletter_name", { fa: "نام خبرنامه", ar: "اسم النشرة", en: "Newsletter name" }),
      v("audience", { fa: "مخاطب", ar: "الجمهور", en: "Audience" }),
      v("notes", { fa: "یادداشت‌های هفته", ar: "ملاحظات الأسبوع", en: "This week's notes" }),
    ],
  },
  {
    slug: "minimal-logo-concept-midjourney",
    categories: ["image-design"],
    tier: "pro",
    outputType: "image",
    models: ["Midjourney", "Flux", "GPT-Image"],
    quality: 86,
    trending: 71,
    priceToman: 69_000,
    priceStars: 89,
    title: {
      fa: "ایده‌ی لوگوی مینیمال با هوش مصنوعی تصویر",
      ar: "أفكار شعار بسيط بالذكاء الاصطناعي",
      en: "Minimal Logo Concepts with Image AI",
    },
    summary: {
      fa: "پرامپت تصویری برای ۴ سبک لوگو: نشانه، حروف‌نگاره، فضای منفی و نماد هندسی.",
      ar: "موجّه صور لأربعة أساليب شعار: رمز، شعار حرفي، مساحة سلبية، ورمز هندسي.",
      en: "Image prompts for 4 logo styles: emblem, lettermark, negative space and geometric mark.",
    },
    description: {
      fa: "برای طوفان فکری سریع پیش از کار طراح؛ پرامپت‌ها روی زمینه‌ی ساده، وکتوری و بدون جزئیات اضافه تنظیم شده‌اند تا خروجی قابل بازطراحی باشد.",
      ar: "لعصف ذهني سريع قبل عمل المصمم؛ ضُبطت الموجّهات على خلفية بسيطة وأسلوب متجهي دون تفاصيل زائدة لتكون المخرجات قابلة لإعادة التصميم.",
      en: "For fast brainstorming before a designer takes over; prompts are tuned for plain backgrounds, vector style and no clutter so results are easy to redraw.",
    },
    body: {
      fa: `چهار پرامپت تصویری انگلیسی برای ایده‌ی لوگوی برند «{{brand_name}}» بساز. حوزه: {{industry}} | حس برند: {{brand_feeling}} | رنگ اصلی: {{color}}
قالب هر پرامپت:
"minimal vector logo for {{brand_name}}, [style], {{industry}} brand, conveys {{brand_feeling}}, {{color}} on white background, flat design, clean lines, centered, no text artifacts, high contrast, professional brand identity --ar 1:1 --style raw"
سبک‌ها: ۱) emblem/icon mark ۲) lettermark from initials ۳) clever negative space ۴) geometric abstract symbol.
برای هر کدام یک جمله‌ی فارسی بنویس که ایده‌ی پشت آن چیست، و یک «negative prompt» پیشنهادی (gradient, 3d, photo, mockup, watermark).
یادآوری کن خروجی هوش مصنوعی فقط ایده است و باید پیش از ثبت توسط طراح بازطراحی و بررسی شباهت شود.`,
      ar: `أنشئ أربعة موجّهات صور بالإنجليزية لأفكار شعار العلامة «{{brand_name}}». القطاع: {{industry}} | إحساس العلامة: {{brand_feeling}} | اللون الرئيسي: {{color}}
قالب كل موجّه:
"minimal vector logo for {{brand_name}}, [style], {{industry}} brand, conveys {{brand_feeling}}, {{color}} on white background, flat design, clean lines, centered, no text artifacts, high contrast, professional brand identity --ar 1:1 --style raw"
الأساليب: 1) emblem/icon mark 2) lettermark from initials 3) clever negative space 4) geometric abstract symbol.
لكل موجّه اكتب جملة بالعربية تشرح الفكرة، و«موجّهًا سلبيًا» مقترحًا (gradient, 3d, photo, mockup, watermark).
ذكّر بأن مخرجات الذكاء الاصطناعي مجرد أفكار ويجب أن يعيد المصمم رسمها ويتحقق من التشابه قبل التسجيل.`,
      en: `Create four English image prompts for logo concepts for the brand "{{brand_name}}". Industry: {{industry}} | Brand feeling: {{brand_feeling}} | Main color: {{color}}
Template for each prompt:
"minimal vector logo for {{brand_name}}, [style], {{industry}} brand, conveys {{brand_feeling}}, {{color}} on white background, flat design, clean lines, centered, no text artifacts, high contrast, professional brand identity --ar 1:1 --style raw"
Styles: 1) emblem/icon mark 2) lettermark from initials 3) clever negative space 4) geometric abstract symbol.
For each, add one sentence explaining the idea and a suggested negative prompt (gradient, 3d, photo, mockup, watermark).
Remind the user that AI output is only a concept and must be redrawn by a designer and checked for similarity before registration.`,
    },
    variables: [
      v("brand_name", { fa: "نام برند", ar: "اسم العلامة", en: "Brand name" }),
      v("industry", { fa: "حوزه", ar: "القطاع", en: "Industry" }),
      v("brand_feeling", { fa: "حس برند", ar: "إحساس العلامة", en: "Brand feeling" }),
      v("color", { fa: "رنگ اصلی", ar: "اللون الرئيسي", en: "Main color" }, { default: "deep teal" }),
    ],
  },
  {
    slug: "persian-calligraphy-poster",
    categories: ["image-design"],
    tier: "premium",
    outputType: "image",
    models: ["Midjourney", "Flux", "GPT-Image"],
    quality: 92,
    trending: 81,
    priceToman: 149_000,
    priceStars: 190,
    title: {
      fa: "پوستر هنری با الهام از خوشنویسی و نگارگری ایرانی",
      ar: "ملصق فني مستوحى من الخط والمنمنمات الفارسية",
      en: "Art Poster Inspired by Persian Calligraphy & Miniature",
    },
    summary: {
      fa: "سیستم پرامپت تصویری برای پوسترهای مناسبتی (نوروز، یلدا، محرم) با هویت بصری ایرانی.",
      ar: "نظام موجّهات صور لملصقات المناسبات (النوروز، يلدا، رمضان) بهوية بصرية شرقية.",
      en: "An image-prompt system for occasion posters (Nowruz, Yalda, Ramadan) with an Iranian visual identity.",
    },
    description: {
      fa: "ترکیب نقوش اسلیمی، رنگ‌های لاجوردی و فیروزه‌ای، و ترکیب‌بندی نگارگری با زیبایی‌شناسی مدرن. شامل ۶ سبک آزموده، نسبت‌های مناسب استوری و پست، و راهنمای اضافه کردن متن فارسی در فتوشاپ یا کانوا (چون مدل‌های تصویری هنوز خط فارسی را درست نمی‌نویسند).",
      ar: "مزيج من الزخارف الإسلامية والألوان اللازوردية والفيروزية وتكوين المنمنمات مع جمالية حديثة. يتضمن 6 أساليب مجرّبة ونسبًا مناسبة للقصص والمنشورات، ودليلًا لإضافة النص العربي أو الفارسي لاحقًا في برامج التصميم (لأن نماذج الصور لا تكتب الخط العربي بدقة بعد).",
      en: "Arabesque motifs, lapis and turquoise palettes and miniature-style composition with a modern aesthetic. Includes 6 tested styles, story/post aspect ratios, and a guide to adding Persian/Arabic text afterwards in Photoshop or Canva (image models still can't render the script correctly).",
    },
    body: {
      fa: `تو کارگردان هنری متخصص هنرهای ایرانی-اسلامی و پرامپت‌نویس حرفه‌ای Midjourney/Flux هستی.
مناسبت یا موضوع: {{occasion}} | پیام اصلی: {{message}} | قالب: {{format}} | پالت دلخواه: {{palette}}

۱. شش پرامپت انگلیسی کامل بنویس، هر کدام با یکی از این سبک‌ها:
  الف) Persian miniature painting, Safavid era, flat perspective, gold leaf details
  ب) modern minimalist with single arabesque (eslimi) ornament
  ج) tilework pattern of Isfahan mosques, lapis lazuli and turquoise
  د) paper-cut layered illustration
  هـ) cinematic photo-real still life with cultural objects
  و) contemporary gradient poster with geometric girih pattern
۲. ساختار هر پرامپت: [subject + cultural objects of {{occasion}}] + [style] + [composition: leave clean empty space at top third for text] + [palette] + [lighting] + [aspect ratio for {{format}}] + "no text, no letters".
۳. برای هر سبک بگو برای چه مخاطب و کانالی مناسب‌تر است.
۴. راهنمای افزودن متن: پیشنهاد ۳ فونت فارسی آزاد (مثل وزیرمتن)، اندازه و جای متن، و ۳ پیشنهاد جمله‌ی کوتاه فارسی برای پیام.
۵. هشدار فرهنگی: نمادهایی که برای این مناسبت نامناسب‌اند را فهرست کن.`,
      ar: `أنت مدير فني متخصص في الفنون الإيرانية-الإسلامية وكاتب موجّهات محترف لـ Midjourney/Flux.
المناسبة أو الموضوع: {{occasion}} | الرسالة الرئيسية: {{message}} | الصيغة: {{format}} | لوحة الألوان المفضلة: {{palette}}

1. اكتب ستة موجّهات كاملة بالإنجليزية، كل منها بأحد هذه الأساليب:
  أ) Persian miniature painting, Safavid era, flat perspective, gold leaf details
  ب) modern minimalist with single arabesque ornament
  ج) tilework pattern of Isfahan mosques, lapis lazuli and turquoise
  د) paper-cut layered illustration
  هـ) cinematic photo-real still life with cultural objects
  و) contemporary gradient poster with geometric girih pattern
2. بنية كل موجّه: [الموضوع + عناصر ثقافية لـ {{occasion}}] + [الأسلوب] + [التكوين: اترك مساحة فارغة في الثلث العلوي للنص] + [الألوان] + [الإضاءة] + [نسبة الأبعاد لـ {{format}}] + "no text, no letters".
3. وضّح لكل أسلوب الجمهور والقناة الأنسب.
4. دليل إضافة النص: اقترح 3 خطوط عربية مجانية، وحجم النص ومكانه، و3 عبارات قصيرة للرسالة.
5. تنبيه ثقافي: اذكر الرموز غير المناسبة لهذه المناسبة.`,
      en: `You are an art director specializing in Iranian-Islamic art and a professional Midjourney/Flux prompt writer.
Occasion or theme: {{occasion}} | Core message: {{message}} | Format: {{format}} | Preferred palette: {{palette}}

1. Write six complete English prompts, one per style:
  a) Persian miniature painting, Safavid era, flat perspective, gold leaf details
  b) modern minimalist with a single arabesque (eslimi) ornament
  c) Isfahan mosque tilework pattern, lapis lazuli and turquoise
  d) paper-cut layered illustration
  e) cinematic photo-real still life with cultural objects
  f) contemporary gradient poster with geometric girih pattern
2. Structure of each prompt: [subject + cultural objects of {{occasion}}] + [style] + [composition: leave clean empty space in the top third for text] + [palette] + [lighting] + [aspect ratio for {{format}}] + "no text, no letters".
3. For each style, say which audience and channel it suits best.
4. Text guide: suggest 3 free Persian/Arabic fonts (e.g. Vazirmatn), text size and placement, and 3 short message lines.
5. Cultural caution: list symbols that are inappropriate for this occasion.`,
    },
    example: {
      fa: "پرامپت ج: \"Nowruz haft-sin table, goldfish bowl, hyacinths and painted eggs, framed by Isfahan mosque tilework pattern, lapis lazuli and turquoise, soft morning light, clean empty space in top third, 4:5, no text, no letters\"",
      ar: "الموجّه ج: \"Nowruz haft-sin table, goldfish bowl, hyacinths and painted eggs, framed by Isfahan mosque tilework pattern, lapis lazuli and turquoise, soft morning light, clean empty space in top third, 4:5, no text, no letters\"",
      en: "Prompt c: \"Nowruz haft-sin table, goldfish bowl, hyacinths and painted eggs, framed by Isfahan mosque tilework pattern, lapis lazuli and turquoise, soft morning light, clean empty space in top third, 4:5, no text, no letters\"",
    },
    variables: [
      v("occasion", { fa: "مناسبت یا موضوع", ar: "المناسبة أو الموضوع", en: "Occasion or theme" }),
      v("message", { fa: "پیام اصلی", ar: "الرسالة الرئيسية", en: "Core message" }),
      v(
        "format",
        { fa: "قالب", ar: "الصيغة", en: "Format" },
        { type: "select", options: ["story 9:16", "post 4:5", "banner 16:9", "print A3"] },
      ),
      v("palette", { fa: "پالت رنگ", ar: "لوحة الألوان", en: "Palette" }, { required: false }),
    ],
  },
  {
    slug: "children-book-illustration-consistent",
    categories: ["image-design", "education"],
    tier: "premium",
    outputType: "image",
    models: ["Midjourney", "Flux", "GPT-Image"],
    quality: 90,
    trending: 76,
    priceToman: 190_000,
    priceStars: 240,
    title: {
      fa: "تصویرسازی کتاب کودک با شخصیت ثابت",
      ar: "رسوم كتاب أطفال بشخصية ثابتة",
      en: "Children's Book Illustrations with a Consistent Character",
    },
    summary: {
      fa: "برگه‌ی شخصیت، سبک ثابت و پرامپت صفحه‌به‌صفحه برای یک کتاب مصور ۱۲ صفحه‌ای.",
      ar: "ورقة شخصية وأسلوب ثابت وموجّهات صفحة بصفحة لكتاب مصوّر من 12 صفحة.",
      en: "Character sheet, locked style and page-by-page prompts for a 12-page picture book.",
    },
    description: {
      fa: "بزرگ‌ترین مشکل تصویرسازی با هوش مصنوعی، عوض شدن چهره‌ی شخصیت در هر صفحه است. این سیستم با «برگه‌ی شخصیت» دقیق، توکن‌های ثابت سبک و راهنمای استفاده از قابلیت مرجع شخصیت (character reference) این مشکل را حل می‌کند.",
      ar: "أكبر مشكلة في الرسم بالذكاء الاصطناعي هي تغيّر ملامح الشخصية في كل صفحة. يحلّ هذا النظام المشكلة بـ«ورقة شخصية» دقيقة ورموز أسلوب ثابتة ودليل لاستخدام ميزة مرجع الشخصية.",
      en: "The biggest problem with AI illustration is the character's face changing on every page. This system solves it with a precise character sheet, locked style tokens and guidance on using character-reference features.",
    },
    body: {
      fa: `تو تصویرگر کتاب کودک و متخصص ثبات شخصیت در مدل‌های تصویری هستی.
داستان (خلاصه یا متن کامل): {{story}}
شخصیت اصلی: {{character}} | گروه سنی: {{age_group}} | سبک دلخواه: {{art_style}}

گام ۱ — برگه‌ی شخصیت: توصیف ثابت انگلیسی ۴۰ کلمه‌ای (سن، فرم صورت، مو، رنگ لباس با کد رنگ، یک ویژگی شاخص). همین متن عیناً در همه‌ی پرامپت‌ها تکرار شود.
گام ۲ — پرامپت برگه‌ی مرجع: "character turnaround sheet, front, side, back, 3 expressions" با همان توصیف.
گام ۳ — قفل سبک: یک رشته‌ی سبک ثابت (تکنیک، نور، پالت، ضخامت خط) تعریف کن.
گام ۴ — داستان را به ۱۲ صفحه تقسیم کن؛ برای هر صفحه: متن کوتاه صفحه به فارسی، توضیح صحنه، و پرامپت انگلیسی = [صحنه] + [توصیف ثابت شخصیت] + [قفل سبک] + "children's book illustration, space for text at bottom".
گام ۵ — راهنمای ثبات: استفاده از --cref و --cw در Midjourney یا تصویر مرجع در Flux/GPT-Image، و چک‌لیست بررسی هر صفحه.
محتوا باید برای کودکان امن و از نظر فرهنگی مناسب باشد.`,
      ar: `أنت رسّام كتب أطفال ومتخصص في ثبات الشخصيات في نماذج الصور.
القصة (ملخص أو نص كامل): {{story}}
الشخصية الرئيسية: {{character}} | الفئة العمرية: {{age_group}} | الأسلوب المفضل: {{art_style}}

الخطوة 1 — ورقة الشخصية: وصف ثابت بالإنجليزية من 40 كلمة (العمر، شكل الوجه، الشعر، لون الملابس برمز اللون، سمة مميزة). يتكرر هذا النص حرفيًا في كل الموجّهات.
الخطوة 2 — موجّه الورقة المرجعية: "character turnaround sheet, front, side, back, 3 expressions" بالوصف نفسه.
الخطوة 3 — تثبيت الأسلوب: عرّف سلسلة أسلوب ثابتة (التقنية، الإضاءة، الألوان، سماكة الخط).
الخطوة 4 — قسّم القصة إلى 12 صفحة؛ لكل صفحة: نص قصير بالعربية، وصف المشهد، وموجّه إنجليزي = [المشهد] + [وصف الشخصية الثابت] + [تثبيت الأسلوب] + "children's book illustration, space for text at bottom".
الخطوة 5 — دليل الثبات: استخدام --cref و--cw في Midjourney أو صورة مرجعية في Flux/GPT-Image، وقائمة تحقق لكل صفحة.
يجب أن يكون المحتوى آمنًا للأطفال ومناسبًا ثقافيًا.`,
      en: `You are a children's book illustrator and an expert in character consistency with image models.
Story (summary or full text): {{story}}
Main character: {{character}} | Age group: {{age_group}} | Preferred style: {{art_style}}

Step 1 — Character sheet: a fixed 40-word English description (age, face shape, hair, clothing colors with hex codes, one signature trait). Repeat this text verbatim in every prompt.
Step 2 — Reference sheet prompt: "character turnaround sheet, front, side, back, 3 expressions" with the same description.
Step 3 — Style lock: define one fixed style string (technique, lighting, palette, line weight).
Step 4 — Split the story into 12 pages; for each page: short page text, scene description, and an English prompt = [scene] + [fixed character description] + [style lock] + "children's book illustration, space for text at bottom".
Step 5 — Consistency guide: using --cref and --cw in Midjourney or a reference image in Flux/GPT-Image, plus a per-page review checklist.
Content must be child-safe and culturally appropriate.`,
    },
    variables: [
      v("story", { fa: "داستان", ar: "القصة", en: "Story" }),
      v("character", { fa: "شخصیت اصلی", ar: "الشخصية الرئيسية", en: "Main character" }),
      v(
        "age_group",
        { fa: "گروه سنی", ar: "الفئة العمرية", en: "Age group" },
        { type: "select", options: ["3-5", "6-8", "9-12"] },
      ),
      v(
        "art_style",
        { fa: "سبک تصویرسازی", ar: "أسلوب الرسم", en: "Art style" },
        { type: "select", options: ["watercolor", "gouache", "flat vector", "pencil and ink"] },
      ),
    ],
  },
  {
    slug: "social-media-post-visual-flux",
    categories: ["image-design", "social-media"],
    tier: "free",
    outputType: "image",
    models: ["Flux", "Midjourney", "GPT-Image", "Stable Diffusion"],
    quality: 81,
    trending: 68,
    title: {
      fa: "تصویر پست شبکه‌ی اجتماعی با Flux و Midjourney",
      ar: "صورة منشور لوسائل التواصل بـ Flux وMidjourney",
      en: "Social Post Visual with Flux & Midjourney",
    },
    summary: {
      fa: "قالب پرامپت تصویری برای پست‌های چشمگیر با فضای خالی برای متن.",
      ar: "قالب موجّه صور لمنشورات لافتة مع مساحة فارغة للنص.",
      en: "An image prompt template for eye-catching posts with space left for text.",
    },
    description: {
      fa: "ساختار پرامپتی که در مدل‌های مختلف تصویر نتیجه‌ی قابل پیش‌بینی می‌دهد: موضوع، سبک، ترکیب‌بندی، نور، رنگ و نسبت تصویر.",
      ar: "بنية موجّه تعطي نتائج متوقعة عبر نماذج الصور المختلفة: الموضوع، الأسلوب، التكوين، الإضاءة، الألوان ونسبة الأبعاد.",
      en: "A prompt structure that gives predictable results across image models: subject, style, composition, lighting, color and aspect ratio.",
    },
    body: {
      fa: `یک پرامپت تصویری انگلیسی بساز برای پستی درباره‌ی «{{post_idea}}» با حس {{mood}}.
ساختار: [main subject, specific details] + [style: {{visual_style}}] + [composition: subject on the right, clean negative space on the left for headline] + [lighting] + [color palette matching {{brand_colors}}] + [aspect ratio 4:5] + "high detail, no text, no watermark".
سپس:
- دو نسخه‌ی جایگزین با ترکیب‌بندی متفاوت بده.
- برای Midjourney پارامترهای پیشنهادی (--ar 4:5 --style raw --s 150) و برای Flux نسخه‌ی جمله‌ای طبیعی همان پرامپت را بنویس.
- یک تیتر کوتاه فارسی برای قرار دادن روی تصویر پیشنهاد بده.`,
      ar: `أنشئ موجّه صورة بالإنجليزية لمنشور عن «{{post_idea}}» بإحساس {{mood}}.
البنية: [main subject, specific details] + [style: {{visual_style}}] + [composition: subject on the right, clean negative space on the left for headline] + [lighting] + [color palette matching {{brand_colors}}] + [aspect ratio 4:5] + "high detail, no text, no watermark".
ثم:
- قدّم نسختين بديلتين بتكوين مختلف.
- اكتب معاملات مقترحة لـ Midjourney (--ar 4:5 --style raw --s 150) ونسخة بجمل طبيعية من الموجّه نفسه لـ Flux.
- اقترح عنوانًا عربيًا قصيرًا يوضع على الصورة.`,
      en: `Create an English image prompt for a post about "{{post_idea}}" with a {{mood}} feel.
Structure: [main subject, specific details] + [style: {{visual_style}}] + [composition: subject on the right, clean negative space on the left for headline] + [lighting] + [color palette matching {{brand_colors}}] + [aspect ratio 4:5] + "high detail, no text, no watermark".
Then:
- Give two alternatives with different compositions.
- Provide suggested Midjourney parameters (--ar 4:5 --style raw --s 150) and a natural-sentence version of the same prompt for Flux.
- Suggest a short headline to place on the image.`,
    },
    variables: [
      v("post_idea", { fa: "ایده‌ی پست", ar: "فكرة المنشور", en: "Post idea" }),
      v("mood", { fa: "حس و حال", ar: "الإحساس", en: "Mood" }),
      v(
        "visual_style",
        { fa: "سبک بصری", ar: "الأسلوب البصري", en: "Visual style" },
        { type: "select", options: ["3D render", "editorial photo", "flat illustration", "isometric"] },
      ),
      v("brand_colors", { fa: "رنگ‌های برند", ar: "ألوان العلامة", en: "Brand colors" }, { required: false }),
    ],
  },
];
