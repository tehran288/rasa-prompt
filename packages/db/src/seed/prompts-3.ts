import { type SeedPrompt, v } from "./types";

export const PROMPTS_3: SeedPrompt[] = [
  {
    slug: "ecommerce-white-background-product",
    categories: ["product-photo", "image-design"],
    tier: "free",
    outputType: "image",
    models: ["Flux", "Midjourney", "GPT-Image"],
    quality: 84,
    trending: 79,
    title: {
      fa: "عکس محصول با پس‌زمینه‌ی سفید برای فروشگاه",
      ar: "صورة منتج بخلفية بيضاء للمتجر",
      en: "White-Background Product Shot for Your Store",
    },
    summary: {
      fa: "عکس استودیویی تمیز با نور نرم و سایه‌ی طبیعی، مناسب دیجی‌کالا و مارکت‌پلیس‌ها.",
      ar: "صورة استوديو نظيفة بإضاءة ناعمة وظل طبيعي، مناسبة لمنصات البيع.",
      en: "A clean studio shot with soft light and a natural shadow, ready for marketplaces.",
    },
    description: {
      fa: "برای فروشندگانی که هنوز استودیو ندارند: پرامپت استاندارد پکشات با زاویه‌ی ۴۵ درجه، نور سافت‌باکس و پس‌زمینه‌ی سفید خالص.",
      ar: "للبائعين الذين لا يملكون استوديو بعد: موجّه قياسي لصورة المنتج بزاوية 45 درجة وإضاءة softbox وخلفية بيضاء نقية.",
      en: "For sellers without a studio yet: a standard packshot prompt with a 45-degree angle, softbox lighting and pure white background.",
    },
    body: {
      fa: `یک پرامپت انگلیسی برای عکس محصول بساز:
محصول: {{product}} | جنس و رنگ: {{material}} | ویژگی که باید دیده شود: {{highlight}}

قالب:
"professional e-commerce packshot of {{product}}, {{material}}, 3/4 angle at 45 degrees, centered, pure white seamless background #FFFFFF, large softbox key light from top-left, subtle fill light, soft natural contact shadow, sharp focus across the product, 100mm macro lens, f/8, true-to-life colors, highlight {{highlight}}, 1:1, no props, no text, no reflections artifacts"

سپس سه زاویه‌ی تکمیلی (روبه‌رو، از بالا، جزئیات نزدیک) با تغییر کمینه در همان پرامپت بده.
یادآوری: اگر محصول واقعی می‌فروشید، تصویر تولیدی باید دقیقاً شبیه کالای واقعی باشد تا مشتری گمراه نشود.`,
      ar: `أنشئ موجّهًا بالإنجليزية لصورة منتج:
المنتج: {{product}} | المادة واللون: {{material}} | الميزة التي يجب إظهارها: {{highlight}}

القالب:
"professional e-commerce packshot of {{product}}, {{material}}, 3/4 angle at 45 degrees, centered, pure white seamless background #FFFFFF, large softbox key light from top-left, subtle fill light, soft natural contact shadow, sharp focus across the product, 100mm macro lens, f/8, true-to-life colors, highlight {{highlight}}, 1:1, no props, no text, no reflections artifacts"

ثم قدّم ثلاث زوايا مكمّلة (أمامية، من الأعلى، لقطة تفاصيل قريبة) بأقل تعديل على الموجّه نفسه.
تذكير: إن كنت تبيع منتجًا حقيقيًا فيجب أن تطابق الصورة المولّدة المنتج الفعلي تمامًا كي لا يُضلَّل العميل.`,
      en: `Create an English product photo prompt:
Product: {{product}} | Material and color: {{material}} | Feature to highlight: {{highlight}}

Template:
"professional e-commerce packshot of {{product}}, {{material}}, 3/4 angle at 45 degrees, centered, pure white seamless background #FFFFFF, large softbox key light from top-left, subtle fill light, soft natural contact shadow, sharp focus across the product, 100mm macro lens, f/8, true-to-life colors, highlight {{highlight}}, 1:1, no props, no text, no reflections artifacts"

Then give three complementary angles (front, top-down, close-up detail) with minimal changes to the same prompt.
Reminder: if you sell a real product, the generated image must match the actual item exactly so customers aren't misled.`,
    },
    variables: [
      v("product", { fa: "محصول", ar: "المنتج", en: "Product" }),
      v("material", { fa: "جنس و رنگ", ar: "المادة واللون", en: "Material and color" }),
      v(
        "highlight",
        { fa: "ویژگی برجسته", ar: "الميزة البارزة", en: "Highlight" },
        { required: false },
      ),
    ],
  },
  {
    slug: "lifestyle-product-scene",
    categories: ["product-photo"],
    tier: "pro",
    outputType: "image",
    models: ["Flux", "Midjourney", "GPT-Image"],
    quality: 88,
    trending: 83,
    priceToman: 79_000,
    priceStars: 99,
    title: {
      fa: "صحنه‌ی لایف‌استایل محصول برای تبلیغات",
      ar: "مشهد أسلوب حياة للمنتج للإعلانات",
      en: "Lifestyle Product Scene for Ads",
    },
    summary: {
      fa: "محصول شما در یک صحنه‌ی واقعی زندگی، با نور و حس متناسب با مخاطب هدف.",
      ar: "منتجك في مشهد حياتي واقعي بإضاءة وإحساس يناسبان الجمهور المستهدف.",
      en: "Your product in a real-life scene, with light and mood matched to your target audience.",
    },
    description: {
      fa: "شش صحنه‌ی آماده (صبحانه، میز کار، طبیعت، کافه، سفر، شب) که هر کدام داستان استفاده از محصول را تعریف می‌کند و برای کمپین‌های تبلیغاتی و بنر سایت مناسب است.",
      ar: "ستة مشاهد جاهزة (الفطور، مكتب العمل، الطبيعة، المقهى، السفر، المساء) يروي كل منها قصة استخدام المنتج، ومناسبة للحملات الإعلانية ولافتات الموقع.",
      en: "Six ready scenes (breakfast, desk, outdoors, café, travel, evening), each telling a story of the product in use — great for ad campaigns and website banners.",
    },
    body: {
      fa: `تو عکاس تبلیغاتی و کارگردان هنری هستی.
محصول: {{product}} | مخاطب هدف: {{audience}} | حس برند: {{mood}} | کانال: {{channel}}

۱. شش ایده‌ی صحنه بده که در آن مخاطب هدف واقعاً از محصول استفاده می‌کند؛ هر ایده یک جمله‌ی داستانی.
۲. برای هر صحنه یک پرامپت انگلیسی کامل بنویس: [product placement and scale] + [scene and props] + [human element: hands only or person from behind, natural pose] + [lighting: golden hour / window light / …] + [camera: 35mm or 50mm, shallow depth of field] + [color grading] + [aspect ratio for {{channel}}] + "photorealistic, editorial, no text, no logo distortion".
۳. محصول باید قهرمان قاب باشد: در یک‌سوم طلایی، فوکوس کامل، بدون تغییر شکل.
۴. برای هر صحنه یک تیتر تبلیغاتی ۵ کلمه‌ای پیشنهاد بده.
۵. بگو کدام دو صحنه برای تست A/B اول بهترند.`,
      ar: `أنت مصوّر إعلاني ومدير فني.
المنتج: {{product}} | الجمهور المستهدف: {{audience}} | إحساس العلامة: {{mood}} | القناة: {{channel}}

1. قدّم ست أفكار لمشاهد يستخدم فيها الجمهور المستهدف المنتج فعلًا؛ كل فكرة بجملة قصصية.
2. لكل مشهد اكتب موجّهًا إنجليزيًا كاملًا: [product placement and scale] + [scene and props] + [human element: hands only or person from behind, natural pose] + [lighting: golden hour / window light / …] + [camera: 35mm or 50mm, shallow depth of field] + [color grading] + [aspect ratio for {{channel}}] + "photorealistic, editorial, no text, no logo distortion".
3. يجب أن يكون المنتج بطل الكادر: في الثلث الذهبي، بتركيز كامل، ودون تشوّه.
4. اقترح لكل مشهد عنوانًا إعلانيًا من 5 كلمات.
5. حدّد أي مشهدين الأفضل لاختبار A/B أولًا.`,
      en: `You are an advertising photographer and art director.
Product: {{product}} | Target audience: {{audience}} | Brand mood: {{mood}} | Channel: {{channel}}

1. Give six scene ideas where the target audience genuinely uses the product; one story sentence each.
2. For each scene write a complete English prompt: [product placement and scale] + [scene and props] + [human element: hands only or person from behind, natural pose] + [lighting: golden hour / window light / …] + [camera: 35mm or 50mm, shallow depth of field] + [color grading] + [aspect ratio for {{channel}}] + "photorealistic, editorial, no text, no logo distortion".
3. The product is the hero of the frame: on a third, in full focus, undistorted.
4. Suggest a 5-word ad headline for each scene.
5. Say which two scenes to A/B test first.`,
    },
    variables: [
      v("product", { fa: "محصول", ar: "المنتج", en: "Product" }),
      v("audience", { fa: "مخاطب هدف", ar: "الجمهور المستهدف", en: "Target audience" }),
      v("mood", { fa: "حس برند", ar: "إحساس العلامة", en: "Brand mood" }),
      v(
        "channel",
        { fa: "کانال", ar: "القناة", en: "Channel" },
        { type: "select", options: ["Instagram 4:5", "Story 9:16", "Website 16:9"] },
      ),
    ],
  },
  {
    slug: "cosmetics-luxury-macro",
    categories: ["product-photo"],
    tier: "premium",
    outputType: "image",
    models: ["Midjourney", "Flux"],
    quality: 91,
    trending: 72,
    priceToman: 149_000,
    priceStars: 190,
    title: {
      fa: "عکاسی لوکس محصولات آرایشی و بهداشتی",
      ar: "تصوير فاخر لمستحضرات التجميل والعناية",
      en: "Luxury Cosmetics & Skincare Photography",
    },
    summary: {
      fa: "سیستم کامل برای کمپین لوکس: بافت ماکرو، اسپلش مایع، سنگ و آب، با کنترل دقیق نور.",
      ar: "نظام كامل لحملة فاخرة: قوام ماكرو ورذاذ سائل وحجر وماء مع تحكّم دقيق بالإضاءة.",
      en: "A full system for a luxury campaign: macro textures, liquid splash, stone and water, with precise lighting control.",
    },
    description: {
      fa: "شامل ۸ سبک استودیویی آزموده (ماکروی بافت کرم، اسپلش، سطح مرمر، آب و قطره، گل خشک، سایه‌ی سخت، نئون ملایم، پودر پاشیده)، پالت‌های رنگی متناسب با نوع پوست هدف، و نسخه‌های مخصوص بنر و استوری.",
      ar: "يشمل 8 أساليب استوديو مجرّبة (ماكرو قوام الكريم، الرذاذ، سطح الرخام، الماء والقطرات، الزهور المجففة، الظل الحاد، النيون الهادئ، البودرة المتناثرة)، ولوحات ألوان تناسب نوع البشرة المستهدف، ونسخًا للافتات والقصص.",
      en: "Includes 8 tested studio styles (cream-texture macro, splash, marble surface, water and droplets, dried flowers, hard shadow, soft neon, scattered powder), palettes matched to the target skin type, and banner/story variants.",
    },
    body: {
      fa: `تو عکاس کمپین‌های برندهای لوکس آرایشی هستی.
محصول: {{product}} (نوع ظرف: {{packaging}}) | ماده‌ی کلیدی: {{key_ingredient}} | جایگاه برند: {{positioning}}

۱. «قفل نور» برند را تعریف کن: نوع نور اصلی، جهت، سختی، دمای رنگ، و یک رشته‌ی انگلیسی ثابت برای تکرار در همه‌ی پرامپت‌ها.
۲. هشت پرامپت انگلیسی کامل با این سبک‌ها بنویس: cream texture macro swatch | liquid splash frozen in motion | travertine/marble pedestal | water ripple with droplets | dried botanicals related to {{key_ingredient}} | hard sunlight shadow play | soft pastel neon rim light | scattered powder explosion.
ساختار هر پرامپت: [{{product}} with exact packaging description] + [scene] + [قفل نور] + [lens: 90mm macro / 50mm] + [palette] + "high-end beauty campaign, crisp label edges, photoreal, no text distortion".
۳. برای هر سبک بگو در کدام نقطه‌ی سفر مشتری (آگاهی، معرفی محصول، صفحه‌ی خرید) استفاده شود.
۴. نسخه‌ی ۹:۱۶ و ۱۶:۹ دو پرامپت برتر را با جابه‌جایی محصول برای جای متن بده.
۵. هشدار: لیبل و نوشته‌ها را بعداً با تصویر واقعی بسته‌بندی جایگزین کنید؛ ادعای درمانی روی تصویر ننویسید.`,
      ar: `أنت مصوّر حملات لعلامات تجميل فاخرة.
المنتج: {{product}} (نوع العبوة: {{packaging}}) | المكوّن الأساسي: {{key_ingredient}} | تموضع العلامة: {{positioning}}

1. عرّف «قفل الإضاءة» للعلامة: نوع الضوء الرئيسي، الاتجاه، الحدّة، حرارة اللون، وسلسلة إنجليزية ثابتة تتكرر في كل الموجّهات.
2. اكتب ثمانية موجّهات إنجليزية كاملة بهذه الأساليب: cream texture macro swatch | liquid splash frozen in motion | travertine/marble pedestal | water ripple with droplets | dried botanicals related to {{key_ingredient}} | hard sunlight shadow play | soft pastel neon rim light | scattered powder explosion.
بنية كل موجّه: [{{product}} with exact packaging description] + [scene] + [قفل الإضاءة] + [lens: 90mm macro / 50mm] + [palette] + "high-end beauty campaign, crisp label edges, photoreal, no text distortion".
3. حدّد لكل أسلوب موضعه في رحلة العميل (الوعي، تقديم المنتج، صفحة الشراء).
4. قدّم نسخة 9:16 و16:9 لأفضل موجّهين مع إزاحة المنتج لترك مكان للنص.
5. تنبيه: استبدلوا الملصق والنصوص لاحقًا بصورة العبوة الحقيقية؛ ولا تكتبوا ادعاءات علاجية على الصورة.`,
      en: `You are a campaign photographer for luxury beauty brands.
Product: {{product}} (packaging: {{packaging}}) | Key ingredient: {{key_ingredient}} | Brand positioning: {{positioning}}

1. Define the brand's "light lock": key light type, direction, hardness, color temperature, and one fixed English string to repeat in every prompt.
2. Write eight complete English prompts in these styles: cream texture macro swatch | liquid splash frozen in motion | travertine/marble pedestal | water ripple with droplets | dried botanicals related to {{key_ingredient}} | hard sunlight shadow play | soft pastel neon rim light | scattered powder explosion.
Structure: [{{product}} with exact packaging description] + [scene] + [light lock] + [lens: 90mm macro / 50mm] + [palette] + "high-end beauty campaign, crisp label edges, photoreal, no text distortion".
3. For each style, say where it fits in the customer journey (awareness, product intro, checkout page).
4. Give 9:16 and 16:9 versions of the top two prompts, shifting the product to leave room for copy.
5. Caution: replace labels and lettering later with the real packaging photo; never put medical claims on the image.`,
    },
    variables: [
      v("product", { fa: "محصول", ar: "المنتج", en: "Product" }),
      v("packaging", { fa: "نوع ظرف", ar: "نوع العبوة", en: "Packaging" }),
      v("key_ingredient", { fa: "ماده‌ی کلیدی", ar: "المكوّن الأساسي", en: "Key ingredient" }),
      v(
        "positioning",
        { fa: "جایگاه برند", ar: "تموضع العلامة", en: "Positioning" },
        { type: "select", options: ["luxury", "clean beauty", "clinical", "youthful"] },
      ),
    ],
  },
  {
    slug: "food-menu-photography",
    categories: ["product-photo", "image-design"],
    tier: "pro",
    outputType: "image",
    models: ["Midjourney", "Flux", "GPT-Image"],
    quality: 86,
    trending: 65,
    priceToman: 69_000,
    priceStars: 89,
    title: {
      fa: "عکس غذا برای منوی رستوران و کافه",
      ar: "تصوير الطعام لقائمة المطعم والمقهى",
      en: "Food Photography for Restaurant & Café Menus",
    },
    summary: {
      fa: "تصاویر اشتهاآور یکدست برای کل منو، از چلوکباب تا لاته.",
      ar: "صور شهية متناسقة للقائمة كاملة، من المشاوي إلى اللاتيه.",
      en: "Consistent, mouth-watering images for an entire menu, from kebab to latte.",
    },
    description: {
      fa: "یک سبک ثابت (زاویه، ظرف، پس‌زمینه و نور) برای همه‌ی آیتم‌های منو تعریف می‌کند تا منوی دیجیتال یا چاپی شما حرفه‌ای و هماهنگ دیده شود.",
      ar: "يعرّف أسلوبًا ثابتًا (الزاوية، الأطباق، الخلفية والإضاءة) لكل أصناف القائمة لتبدو قائمتك الرقمية أو المطبوعة احترافية ومتناسقة.",
      en: "Defines one fixed style (angle, plates, background and light) for every menu item, so your digital or printed menu looks professional and consistent.",
    },
    body: {
      fa: `تو فود استایلیست و عکاس منو هستی.
نوع رستوران: {{restaurant_type}} | آیتم‌های منو (هر خط یکی): {{menu_items}} | حس فضا: {{ambience}}

۱. یک «سبک منو» ثابت تعریف کن: زاویه (۴۵ درجه برای بشقاب، روبه‌رو برای نوشیدنی و برگر، از بالا برای سینی)، رنگ و جنس ظرف، سطح میز، نور، و یک رشته‌ی انگلیسی ثابت.
۲. برای هر آیتم منو یک پرامپت انگلیسی بنویس: [dish with authentic ingredients and garnish] + [plating] + [سبک منو] + "appetizing, steam rising if hot, fresh texture, shallow depth of field, food magazine quality, no text".
۳. برای غذاهای ایرانی جزئیات اصیل را رعایت کن (مثلاً ته‌دیگ، زعفران روی برنج، سبزی خوردن، نان سنگک) و از ترکیب‌های نادرست پرهیز کن.
۴. دو پیشنهاد برای عکس کاور منو و بنر تحویل آنلاین بده.
یادآوری: تصویر باید به غذای واقعی سرو شده نزدیک باشد.`,
      ar: `أنت منسّق طعام ومصوّر قوائم.
نوع المطعم: {{restaurant_type}} | أصناف القائمة (صنف في كل سطر): {{menu_items}} | أجواء المكان: {{ambience}}

1. عرّف «أسلوب قائمة» ثابتًا: الزاوية (45 درجة للأطباق، أمامية للمشروبات والبرغر، من الأعلى للصواني)، لون الأطباق ومادتها، سطح الطاولة، الإضاءة، وسلسلة إنجليزية ثابتة.
2. لكل صنف اكتب موجّهًا إنجليزيًا: [dish with authentic ingredients and garnish] + [plating] + [أسلوب القائمة] + "appetizing, steam rising if hot, fresh texture, shallow depth of field, food magazine quality, no text".
3. راعِ التفاصيل الأصيلة للمطبخ المحلي وتجنّب التركيبات غير الصحيحة.
4. قدّم اقتراحين لصورة غلاف القائمة ولافتة التوصيل عبر الإنترنت.
تذكير: يجب أن تكون الصورة قريبة من الطبق الحقيقي الذي يُقدَّم.`,
      en: `You are a food stylist and menu photographer.
Restaurant type: {{restaurant_type}} | Menu items (one per line): {{menu_items}} | Ambience: {{ambience}}

1. Define a fixed "menu style": angle (45° for plates, straight-on for drinks and burgers, top-down for platters), plate color and material, table surface, lighting, and one fixed English string.
2. For each menu item write an English prompt: [dish with authentic ingredients and garnish] + [plating] + [menu style] + "appetizing, steam rising if hot, fresh texture, shallow depth of field, food magazine quality, no text".
3. Respect authentic details of the cuisine (e.g., tahdig and saffron rice for Persian dishes) and avoid incorrect combinations.
4. Give two ideas for the menu cover shot and the online-delivery banner.
Reminder: images should be close to the dish actually served.`,
    },
    variables: [
      v("restaurant_type", { fa: "نوع رستوران", ar: "نوع المطعم", en: "Restaurant type" }),
      v("menu_items", { fa: "آیتم‌های منو", ar: "أصناف القائمة", en: "Menu items" }),
      v("ambience", { fa: "حس فضا", ar: "الأجواء", en: "Ambience" }, { required: false }),
    ],
  },
  {
    slug: "senior-code-review",
    categories: ["programming"],
    tier: "pro",
    outputType: "code",
    models: ["Claude", "ChatGPT", "Gemini", "DeepSeek"],
    quality: 92,
    trending: 69,
    priceToman: 89_000,
    priceStars: 110,
    title: {
      fa: "بازبینی کد در سطح مهندس ارشد",
      ar: "مراجعة الشيفرة بمستوى مهندس أول",
      en: "Senior-Level Code Review",
    },
    summary: {
      fa: "بازبینی ساختارمند کد: باگ، امنیت، کارایی، خوانایی — با اولویت‌بندی و پیشنهاد اصلاح.",
      ar: "مراجعة منظّمة للشيفرة: الأخطاء، الأمان، الأداء، القابلية للقراءة — مع ترتيب الأولويات واقتراح الإصلاح.",
      en: "Structured code review: bugs, security, performance, readability — prioritized, with suggested fixes.",
    },
    description: {
      fa: "به‌جای «کد خوبی است»، یافته‌های مشخص با شدت (بحرانی/مهم/جزئی)، شماره‌ی خط و کد اصلاح‌شده می‌گیرید. مناسب برای Pull Request و آماده‌سازی برای مصاحبه.",
      ar: "بدلًا من «الشيفرة جيدة»، تحصل على ملاحظات محددة مع درجة الخطورة (حرجة/مهمة/طفيفة) ورقم السطر والشيفرة المصحّحة. مناسب لطلبات الدمج والتحضير للمقابلات.",
      en: 'Instead of "looks good", you get specific findings with severity (critical/major/minor), line numbers and corrected code. Great for pull requests and interview prep.',
    },
    body: {
      fa: `تو یک مهندس نرم‌افزار ارشد با ۱۵ سال تجربه هستی که بازبینی کد دقیق و محترمانه انجام می‌دهد.
زبان/فریم‌ورک: {{language}} | هدف این کد: {{purpose}}
کد:
{{code}}

بازبینی را در این ترتیب انجام بده:
۱. خلاصه‌ی یک‌پاراگرافی: کد چه می‌کند و کیفیت کلی.
۲. یافته‌ها در جدول: شدت (🔴 بحرانی، 🟠 مهم، 🟡 جزئی) | خط | دسته (درستی، امنیت، کارایی، همزمانی، خوانایی، تست‌پذیری) | توضیح | پیشنهاد.
۳. برای هر یافته‌ی بحرانی و مهم، کد اصلاح‌شده را نشان بده.
۴. موارد مرزی (edge cases) که تست نشده‌اند را فهرست کن.
۵. سه نقطه‌ی قوت واقعی کد را هم بگو.
فقط درباره‌ی چیزی نظر بده که در کد هست؛ اگر بخشی از زمینه را نمی‌دانی، صریحاً فرضت را بنویس.`,
      ar: `أنت مهندس برمجيات أول بخبرة 15 عامًا تجري مراجعات شيفرة دقيقة ومحترمة.
اللغة/الإطار: {{language}} | هدف هذه الشيفرة: {{purpose}}
الشيفرة:
{{code}}

نفّذ المراجعة بهذا الترتيب:
1. ملخص من فقرة: ماذا تفعل الشيفرة والجودة العامة.
2. الملاحظات في جدول: الخطورة (🔴 حرجة، 🟠 مهمة، 🟡 طفيفة) | السطر | الفئة (الصحة، الأمان، الأداء، التزامن، القابلية للقراءة، قابلية الاختبار) | الشرح | الاقتراح.
3. لكل ملاحظة حرجة أو مهمة اعرض الشيفرة المصحّحة.
4. اذكر الحالات الحدّية غير المختبرة.
5. اذكر أيضًا ثلاث نقاط قوة حقيقية في الشيفرة.
علّق فقط على ما هو موجود في الشيفرة؛ وإن جهلت جزءًا من السياق فاكتب افتراضك صراحة.`,
      en: `You are a senior software engineer with 15 years of experience who gives precise, respectful code reviews.
Language/framework: {{language}} | Purpose of this code: {{purpose}}
Code:
{{code}}

Review in this order:
1. One-paragraph summary: what the code does and overall quality.
2. Findings table: Severity (🔴 critical, 🟠 major, 🟡 minor) | Line | Category (correctness, security, performance, concurrency, readability, testability) | Explanation | Suggestion.
3. Show corrected code for every critical and major finding.
4. List untested edge cases.
5. Name three genuine strengths of the code.
Only comment on what is in the code; if you lack context, state your assumption explicitly.`,
    },
    variables: [
      v("language", { fa: "زبان یا فریم‌ورک", ar: "اللغة أو الإطار", en: "Language or framework" }),
      v("purpose", { fa: "هدف کد", ar: "هدف الشيفرة", en: "Purpose of the code" }),
      v("code", { fa: "کد", ar: "الشيفرة", en: "Code" }),
    ],
  },
  {
    slug: "rest-api-design-spec",
    categories: ["programming"],
    tier: "premium",
    outputType: "code",
    models: ["Claude", "ChatGPT"],
    quality: 93,
    trending: 54,
    priceToman: 249_000,
    priceStars: 310,
    title: {
      fa: "طراحی API و تولید مشخصات OpenAPI",
      ar: "تصميم واجهة API وإنشاء مواصفات OpenAPI",
      en: "API Design & OpenAPI Spec Generator",
    },
    summary: {
      fa: "از نیازمندی تا مشخصات OpenAPI 3.1 کامل: منابع، خطاها، صفحه‌بندی، امنیت و نسخه‌بندی.",
      ar: "من المتطلبات إلى مواصفات OpenAPI 3.1 كاملة: الموارد، الأخطاء، الترقيم، الأمان والإصدارات.",
      en: "From requirements to a complete OpenAPI 3.1 spec: resources, errors, pagination, security and versioning.",
    },
    description: {
      fa: "یک فرایند طراحی مثل تیم‌های پلتفرم حرفه‌ای: مدل‌سازی دامنه، تصمیم‌های طراحی با دلیل، قراردادهای خطا و idempotency، و در نهایت فایل YAML آماده‌ی استفاده در Swagger و تولید کلاینت.",
      ar: "عملية تصميم كفرق المنصات المحترفة: نمذجة المجال، وقرارات تصميم مع التعليل، وعقود الأخطاء وidempotency، وأخيرًا ملف YAML جاهز للاستخدام في Swagger وتوليد العملاء.",
      en: "A design process like professional platform teams use: domain modeling, reasoned design decisions, error and idempotency contracts, and finally a YAML file ready for Swagger and client generation.",
    },
    body: {
      fa: `تو معمار API در یک تیم پلتفرم هستی.
محصول: {{product}} | کاربران API: {{consumers}} | نیازمندی‌ها: {{requirements}} | محدودیت‌ها: {{constraints}}

فاز ۱ — مدل دامنه: موجودیت‌ها، روابط و چرخه‌ی وضعیت‌ها (state machine) را فهرست کن. اگر ابهامی هست حداکثر ۵ سؤال بپرس و منتظر بمان.
فاز ۲ — تصمیم‌های طراحی (هر کدام با دلیل و جایگزین ردشده): نام‌گذاری منابع، نسخه‌بندی، صفحه‌بندی (cursor در برابر offset)، فیلتر و مرتب‌سازی، احراز هویت و سطح دسترسی، محدودیت نرخ، idempotency key برای POST، قالب خطا (RFC 9457 problem+json).
فاز ۳ — جدول endpointها: متد | مسیر | توضیح | کدهای پاسخ.
فاز ۴ — فایل کامل OpenAPI 3.1 به YAML با schemaها، مثال‌ها، securitySchemes و پاسخ‌های خطای مشترک.
فاز ۵ — چک‌لیست بازبینی: سازگاری رو به عقب، داده‌های حساس در لاگ، N+1، و سه سناریوی تست قرارداد.`,
      ar: `أنت مهندس معماري لواجهات API في فريق منصة.
المنتج: {{product}} | مستخدمو الواجهة: {{consumers}} | المتطلبات: {{requirements}} | القيود: {{constraints}}

المرحلة 1 — نموذج المجال: اذكر الكيانات والعلاقات ودورة الحالات (state machine). إن وُجد غموض فاطرح 5 أسئلة كحد أقصى وانتظر.
المرحلة 2 — قرارات التصميم (كل منها مع التعليل والبديل المرفوض): تسمية الموارد، الإصدارات، الترقيم (cursor مقابل offset)، التصفية والترتيب، المصادقة والصلاحيات، تحديد المعدل، مفتاح idempotency لطلبات POST، صيغة الأخطاء (RFC 9457 problem+json).
المرحلة 3 — جدول نقاط النهاية: الطريقة | المسار | الوصف | رموز الاستجابة.
المرحلة 4 — ملف OpenAPI 3.1 كامل بصيغة YAML مع المخططات والأمثلة وsecuritySchemes واستجابات الأخطاء المشتركة.
المرحلة 5 — قائمة مراجعة: التوافق مع الإصدارات السابقة، البيانات الحساسة في السجلات، مشكلة N+1، وثلاثة سيناريوهات لاختبار العقد.`,
      en: `You are an API architect on a platform team.
Product: {{product}} | API consumers: {{consumers}} | Requirements: {{requirements}} | Constraints: {{constraints}}

Phase 1 — Domain model: list entities, relationships and state machines. If anything is ambiguous, ask up to 5 questions and wait.
Phase 2 — Design decisions (each with rationale and the rejected alternative): resource naming, versioning, pagination (cursor vs. offset), filtering and sorting, authentication and authorization, rate limiting, idempotency keys for POST, error format (RFC 9457 problem+json).
Phase 3 — Endpoint table: Method | Path | Description | Response codes.
Phase 4 — A complete OpenAPI 3.1 file in YAML with schemas, examples, securitySchemes and shared error responses.
Phase 5 — Review checklist: backward compatibility, sensitive data in logs, N+1 risks, and three contract-test scenarios.`,
    },
    variables: [
      v("product", { fa: "محصول", ar: "المنتج", en: "Product" }),
      v("consumers", { fa: "کاربران API", ar: "مستخدمو الواجهة", en: "API consumers" }),
      v("requirements", { fa: "نیازمندی‌ها", ar: "المتطلبات", en: "Requirements" }),
      v("constraints", { fa: "محدودیت‌ها", ar: "القيود", en: "Constraints" }, { required: false }),
    ],
  },
  {
    slug: "unit-test-generator",
    categories: ["programming"],
    tier: "pro",
    outputType: "code",
    models: ["Claude", "ChatGPT", "DeepSeek"],
    quality: 89,
    trending: 52,
    priceToman: 69_000,
    priceStars: 89,
    title: {
      fa: "تولید تست واحد با پوشش موارد مرزی",
      ar: "توليد اختبارات الوحدة مع تغطية الحالات الحدّية",
      en: "Unit Test Generator with Edge-Case Coverage",
    },
    summary: {
      fa: "تست‌های خوانا و مستقل برای Jest، Vitest، PyTest یا JUnit با جدول موارد آزمون.",
      ar: "اختبارات مقروءة ومستقلة لـ Jest أو Vitest أو PyTest أو JUnit مع جدول حالات الاختبار.",
      en: "Readable, independent tests for Jest, Vitest, PyTest or JUnit, with a test-case table.",
    },
    description: {
      fa: "اول رفتار تابع را تحلیل می‌کند، بعد جدول موارد آزمون (مسیر عادی، مرزی، خطا) می‌سازد و سپس کد تست را با نام‌گذاری توصیفی می‌نویسد.",
      ar: "يحلّل سلوك الدالة أولًا، ثم يبني جدول حالات الاختبار (المسار العادي، الحدّي، الأخطاء)، ثم يكتب شيفرة الاختبار بأسماء وصفية.",
      en: "Analyzes the function's behavior first, builds a test-case table (happy path, edge, error), then writes the test code with descriptive names.",
    },
    body: {
      fa: `تو مهندس کیفیت نرم‌افزار هستی که تست‌های قابل نگهداری می‌نویسد.
فریم‌ورک تست: {{test_framework}}
کد مورد آزمون:
{{code}}

۱. رفتار مورد انتظار را در ۳ تا ۵ بولت بنویس (قرارداد ورودی/خروجی، خطاها، اثرات جانبی).
۲. جدول موارد آزمون: نام | ورودی | خروجی مورد انتظار | دسته (عادی/مرزی/خطا).
۳. کد کامل تست با الگوی Arrange-Act-Assert، هر تست مستقل، بدون وابستگی به ترتیب اجرا؛ وابستگی‌های بیرونی (شبکه، زمان، پایگاه داده) را mock کن.
۴. اگر در کد باگ احتمالی دیدی، یک تست شکست‌خورنده برایش بنویس و توضیح بده.
۵. دستور اجرای تست‌ها.`,
      ar: `أنت مهندس جودة برمجيات يكتب اختبارات سهلة الصيانة.
إطار الاختبار: {{test_framework}}
الشيفرة المختبرة:
{{code}}

1. اكتب السلوك المتوقع في 3–5 نقاط (عقد المدخلات/المخرجات، الأخطاء، الآثار الجانبية).
2. جدول حالات الاختبار: الاسم | المدخلات | المخرجات المتوقعة | الفئة (عادي/حدّي/خطأ).
3. شيفرة الاختبار كاملة بنمط Arrange-Act-Assert، كل اختبار مستقل ولا يعتمد على ترتيب التنفيذ؛ استخدم mock للاعتماديات الخارجية (الشبكة، الوقت، قاعدة البيانات).
4. إن لاحظت خطأً محتملًا فاكتب له اختبارًا فاشلًا واشرحه.
5. أمر تشغيل الاختبارات.`,
      en: `You are a software quality engineer who writes maintainable tests.
Test framework: {{test_framework}}
Code under test:
{{code}}

1. State the expected behavior in 3–5 bullets (input/output contract, errors, side effects).
2. Test-case table: Name | Input | Expected output | Category (happy/edge/error).
3. Full test code using Arrange-Act-Assert; each test independent and order-agnostic; mock external dependencies (network, time, database).
4. If you spot a likely bug, write a failing test for it and explain.
5. The command to run the tests.`,
    },
    variables: [
      v(
        "test_framework",
        { fa: "فریم‌ورک تست", ar: "إطار الاختبار", en: "Test framework" },
        { type: "select", options: ["Vitest", "Jest", "PyTest", "JUnit 5", "Go testing"] },
      ),
      v("code", { fa: "کد", ar: "الشيفرة", en: "Code" }),
    ],
  },
  {
    slug: "systematic-debugging-partner",
    categories: ["programming"],
    tier: "pro",
    outputType: "code",
    models: ["Claude", "ChatGPT", "Gemini"],
    quality: 88,
    trending: 47,
    priceToman: 59_000,
    priceStars: 75,
    title: {
      fa: "همراه دیباگ سیستماتیک",
      ar: "شريك تصحيح الأخطاء المنهجي",
      en: "Systematic Debugging Partner",
    },
    summary: {
      fa: "پیدا کردن علت ریشه‌ای باگ با فرضیه‌سازی و آزمایش، نه حدس زدن.",
      ar: "إيجاد السبب الجذري للخطأ بصياغة الفرضيات واختبارها، لا بالتخمين.",
      en: "Find a bug's root cause through hypotheses and experiments, not guesswork.",
    },
    description: {
      fa: "روش علمی دیباگ: بازتولید، محدود کردن، فرضیه، آزمایش و اصلاح؛ همراه با تست جلوگیری از بازگشت باگ.",
      ar: "المنهج العلمي لتصحيح الأخطاء: إعادة الإنتاج، التضييق، الفرضية، التجربة والإصلاح؛ مع اختبار يمنع عودة الخطأ.",
      en: "The scientific method for debugging: reproduce, narrow down, hypothesize, test and fix — plus a regression test.",
    },
    body: {
      fa: `تو یک مهندس باتجربه‌ی دیباگ هستی و مرحله‌به‌مرحله با من کار می‌کنی، نه یک‌باره.
شرح مشکل: {{problem}}
پیام خطا یا لاگ: {{error_log}}
کد مرتبط: {{code}}
محیط: {{environment}}

۱. مشکل را با کلمات خودت بازگو کن و بگو «رفتار مورد انتظار» در برابر «رفتار واقعی» چیست.
۲. سه فرضیه‌ی محتمل بده، به ترتیب احتمال، با دلیل.
۳. برای فرضیه‌ی اول کوچک‌ترین آزمایش ممکن را پیشنهاد بده (لاگ، breakpoint، ورودی خاص) و بگو هر نتیجه چه معنایی دارد.
۴. منتظر نتیجه‌ی من بمان و سپس ادامه بده.
۵. پس از یافتن علت ریشه‌ای: اصلاح حداقلی، توضیح چرا کار می‌کند، و یک تست رگرسیون.`,
      ar: `أنت مهندس متمرس في تصحيح الأخطاء وتعمل معي خطوة بخطوة، لا دفعة واحدة.
وصف المشكلة: {{problem}}
رسالة الخطأ أو السجل: {{error_log}}
الشيفرة ذات الصلة: {{code}}
البيئة: {{environment}}

1. أعد صياغة المشكلة بكلماتك ووضّح «السلوك المتوقع» مقابل «السلوك الفعلي».
2. قدّم ثلاث فرضيات محتملة مرتبة حسب الاحتمال مع التعليل.
3. للفرضية الأولى اقترح أصغر تجربة ممكنة (سجل، نقطة توقف، مدخل محدد) ووضّح دلالة كل نتيجة.
4. انتظر نتيجتي ثم تابع.
5. بعد إيجاد السبب الجذري: إصلاح بأقل تغيير، وشرح سبب نجاحه، واختبار انحدار.`,
      en: `You are an experienced debugging engineer working with me step by step, not all at once.
Problem description: {{problem}}
Error message or log: {{error_log}}
Relevant code: {{code}}
Environment: {{environment}}

1. Restate the problem in your own words: expected vs. actual behavior.
2. Give three likely hypotheses, ranked by probability, with reasoning.
3. For the top hypothesis, propose the smallest possible experiment (log line, breakpoint, specific input) and what each outcome would mean.
4. Wait for my result, then continue.
5. Once the root cause is found: a minimal fix, why it works, and a regression test.`,
    },
    variables: [
      v("problem", { fa: "شرح مشکل", ar: "وصف المشكلة", en: "Problem description" }),
      v(
        "error_log",
        { fa: "پیام خطا", ar: "رسالة الخطأ", en: "Error message" },
        { required: false },
      ),
      v(
        "code",
        { fa: "کد مرتبط", ar: "الشيفرة ذات الصلة", en: "Relevant code" },
        { required: false },
      ),
      v("environment", { fa: "محیط اجرا", ar: "البيئة", en: "Environment" }, { required: false }),
    ],
  },
  {
    slug: "sql-query-from-plain-language",
    categories: ["programming", "productivity"],
    tier: "free",
    outputType: "code",
    models: ["ChatGPT", "Claude", "Gemini", "DeepSeek"],
    quality: 85,
    trending: 50,
    title: {
      fa: "نوشتن کوئری SQL از زبان ساده",
      ar: "كتابة استعلام SQL من لغة بسيطة",
      en: "SQL Query from Plain Language",
    },
    summary: {
      fa: "سؤال کسب‌وکاری‌تان را بنویسید؛ کوئری درست، توضیح خط‌به‌خط و نکات کارایی بگیرید.",
      ar: "اكتب سؤالك التجاري واحصل على استعلام صحيح وشرح سطرًا بسطر ونصائح للأداء.",
      en: "Write your business question; get a correct query, a line-by-line explanation and performance tips.",
    },
    description: {
      fa: "برای مدیران محصول، تحلیل‌گران و برنامه‌نویسان تازه‌کار. با گرفتن ساختار جدول‌ها، کوئری دقیق برای PostgreSQL یا MySQL می‌نویسد و فرض‌هایش را اعلام می‌کند.",
      ar: "لمديري المنتجات والمحللين والمبرمجين المبتدئين. يكتب استعلامًا دقيقًا لـ PostgreSQL أو MySQL بناءً على بنية الجداول ويعلن افتراضاته.",
      en: "For product managers, analysts and junior developers. Given your table structure, it writes an exact PostgreSQL or MySQL query and states its assumptions.",
    },
    body: {
      fa: `تو متخصص پایگاه داده و تحلیل داده هستی.
پایگاه داده: {{dialect}}
ساختار جدول‌ها: {{schema}}
سؤال: {{question}}

۱. فرض‌هایت درباره‌ی داده را فهرست کن (مثلاً منطقه‌ی زمانی، مقادیر NULL، رکوردهای حذف‌شده).
۲. کوئری را با فرمت خوانا و نام مستعار معنادار بنویس.
۳. هر بخش کوئری را در یک خط ساده توضیح بده.
۴. اگر جدول بزرگ است، ایندکس پیشنهادی بده.
۵. یک کوئری کوچک برای اعتبارسنجی نتیجه پیشنهاد بده.
فقط کوئری خواندنی (SELECT) بنویس مگر اینکه صریحاً تغییر داده خواسته شود.`,
      ar: `أنت متخصص في قواعد البيانات وتحليل البيانات.
قاعدة البيانات: {{dialect}}
بنية الجداول: {{schema}}
السؤال: {{question}}

1. اذكر افتراضاتك عن البيانات (مثل المنطقة الزمنية، القيم الفارغة، السجلات المحذوفة).
2. اكتب الاستعلام بتنسيق مقروء وأسماء مستعارة ذات معنى.
3. اشرح كل جزء من الاستعلام بسطر بسيط.
4. إن كان الجدول كبيرًا فاقترح فهرسًا.
5. اقترح استعلامًا صغيرًا للتحقق من النتيجة.
اكتب استعلامات قراءة فقط (SELECT) ما لم يُطلب تعديل البيانات صراحة.`,
      en: `You are a database and data analysis specialist.
Database: {{dialect}}
Table structure: {{schema}}
Question: {{question}}

1. List your assumptions about the data (time zone, NULLs, soft-deleted rows, etc.).
2. Write the query with readable formatting and meaningful aliases.
3. Explain each part of the query in one plain line.
4. If the tables are large, suggest an index.
5. Suggest a small query to sanity-check the result.
Write read-only queries (SELECT) unless data changes are explicitly requested.`,
    },
    example: {
      fa: "SELECT date_trunc('month', o.paid_at) AS month, count(*) AS orders, sum(o.total) AS revenue\nFROM orders o\nWHERE o.status = 'paid' AND o.paid_at >= now() - interval '6 months'\nGROUP BY 1 ORDER BY 1;",
      ar: "SELECT date_trunc('month', o.paid_at) AS month, count(*) AS orders, sum(o.total) AS revenue\nFROM orders o\nWHERE o.status = 'paid' AND o.paid_at >= now() - interval '6 months'\nGROUP BY 1 ORDER BY 1;",
      en: "SELECT date_trunc('month', o.paid_at) AS month, count(*) AS orders, sum(o.total) AS revenue\nFROM orders o\nWHERE o.status = 'paid' AND o.paid_at >= now() - interval '6 months'\nGROUP BY 1 ORDER BY 1;",
    },
    variables: [
      v(
        "dialect",
        { fa: "پایگاه داده", ar: "قاعدة البيانات", en: "Database" },
        {
          type: "select",
          options: ["PostgreSQL", "MySQL", "SQLite", "SQL Server"],
          default: "PostgreSQL",
        },
      ),
      v("schema", { fa: "ساختار جدول‌ها", ar: "بنية الجداول", en: "Table structure" }),
      v("question", { fa: "سؤال", ar: "السؤال", en: "Question" }),
    ],
  },
  {
    slug: "n8n-telegram-lead-bot",
    categories: ["automation"],
    tier: "premium",
    outputType: "automation",
    models: ["Claude", "ChatGPT"],
    quality: 90,
    trending: 86,
    priceToman: 290_000,
    priceStars: 360,
    title: {
      fa: "طراحی ورک‌فلوی n8n: جذب و پیگیری سرنخ از تلگرام",
      ar: "تصميم سير عمل n8n: جذب العملاء المحتملين ومتابعتهم من تيليغرام",
      en: "n8n Workflow: Capture & Nurture Leads from Telegram",
    },
    summary: {
      fa: "نقشه‌ی کامل ورک‌فلو با نودها، تنظیمات، پرامپت دسته‌بندی سرنخ با هوش مصنوعی و JSON قابل import.",
      ar: "مخطط كامل لسير العمل مع العُقد والإعدادات وموجّه تصنيف العملاء بالذكاء الاصطناعي وملف JSON قابل للاستيراد.",
      en: "A full workflow blueprint with nodes, settings, an AI lead-scoring prompt and importable JSON.",
    },
    description: {
      fa: "سیستمی که پیام‌های ورودی ربات تلگرام یا بله را می‌گیرد، با هوش مصنوعی نیت و کیفیت سرنخ را امتیاز می‌دهد، در گوگل‌شیت یا CRM ثبت می‌کند و پیام پیگیری زمان‌بندی‌شده می‌فرستد. شامل مدیریت خطا، جلوگیری از رکورد تکراری و نکات امنیتی توکن‌ها.",
      ar: "نظام يستقبل رسائل بوت تيليغرام الواردة، ويقيّم نية العميل وجودته بالذكاء الاصطناعي، ويسجّله في Google Sheets أو نظام CRM، ويرسل رسائل متابعة مجدولة. يتضمن معالجة الأخطاء ومنع السجلات المكررة ونصائح أمان الرموز.",
      en: "A system that takes incoming Telegram (or Bale) bot messages, scores intent and lead quality with AI, logs to Google Sheets or a CRM, and sends scheduled follow-ups. Includes error handling, de-duplication and token-security tips.",
    },
    body: {
      fa: `تو مهندس اتوماسیون با تخصص n8n هستی.
کسب‌وکار: {{business}} | محصول/خدمت: {{offer}} | مقصد ثبت سرنخ: {{destination}} | زمان پیگیری: {{followup_delay}}

خروجی‌ها:
۱. نمودار متنی جریان: Telegram Trigger → نرمال‌سازی پیام → AI (دسته‌بندی) → Switch بر اساس امتیاز → ثبت در {{destination}} → پاسخ فوری → Wait → پیام پیگیری.
۲. برای هر نود: نوع نود n8n، تنظیمات کلیدی، عبارت‌های expression، و خروجی نمونه.
۳. پرامپت سیستمی نود هوش مصنوعی که خروجی JSON ساختارمند بدهد: {"intent": "buy|question|support|spam", "score": 0-100, "product_interest": "...", "summary": "..."} با ۴ مثال few-shot فارسی.
۴. منطق جلوگیری از رکورد تکراری (بر اساس chat_id) و مدیریت خطا (Error Trigger + اعلان به ادمین).
۵. متن پاسخ فوری و پیام پیگیری برای هر دسته، کوتاه و انسانی.
۶. JSON قابل import ورک‌فلو (با placeholder برای credentialها — هرگز توکن واقعی در JSON نگذار).
۷. چک‌لیست تست قبل از فعال‌سازی و رعایت حریم خصوصی کاربران (فقط داده‌ی لازم ذخیره شود).`,
      ar: `أنت مهندس أتمتة متخصص في n8n.
النشاط: {{business}} | المنتج/الخدمة: {{offer}} | وجهة تسجيل العملاء: {{destination}} | توقيت المتابعة: {{followup_delay}}

المخرجات:
1. مخطط نصي للتدفق: Telegram Trigger → تطبيع الرسالة → AI (تصنيف) → Switch حسب الدرجة → التسجيل في {{destination}} → رد فوري → Wait → رسالة متابعة.
2. لكل عقدة: نوع عقدة n8n، الإعدادات الأساسية، التعبيرات (expressions)، ومخرجات نموذجية.
3. موجّه النظام لعقدة الذكاء الاصطناعي ليعطي JSON منظّمًا: {"intent": "buy|question|support|spam", "score": 0-100, "product_interest": "...", "summary": "..."} مع 4 أمثلة few-shot بالعربية.
4. منطق منع السجلات المكررة (حسب chat_id) ومعالجة الأخطاء (Error Trigger + تنبيه للمسؤول).
5. نص الرد الفوري ورسالة المتابعة لكل فئة، قصير وإنساني.
6. ملف JSON لسير العمل قابل للاستيراد (مع عناصر نائبة لبيانات الاعتماد — لا تضع رمزًا حقيقيًا أبدًا).
7. قائمة اختبار قبل التفعيل واحترام خصوصية المستخدمين (تخزين البيانات الضرورية فقط).`,
      en: `You are an automation engineer specializing in n8n.
Business: {{business}} | Offer: {{offer}} | Lead destination: {{destination}} | Follow-up delay: {{followup_delay}}

Deliverables:
1. A text flow diagram: Telegram Trigger → normalize message → AI (classify) → Switch on score → write to {{destination}} → instant reply → Wait → follow-up message.
2. For each node: n8n node type, key settings, expressions, and sample output.
3. A system prompt for the AI node that returns structured JSON: {"intent": "buy|question|support|spam", "score": 0-100, "product_interest": "...", "summary": "..."} with 4 few-shot examples.
4. De-duplication logic (by chat_id) and error handling (Error Trigger + admin alert).
5. Instant-reply and follow-up copy for each category — short and human.
6. Importable workflow JSON (with credential placeholders — never put a real token in the JSON).
7. A pre-launch test checklist and user-privacy rules (store only what you need).`,
    },
    variables: [
      v("business", { fa: "کسب‌وکار", ar: "النشاط", en: "Business" }),
      v("offer", { fa: "محصول یا خدمت", ar: "المنتج أو الخدمة", en: "Offer" }),
      v(
        "destination",
        { fa: "مقصد ثبت سرنخ", ar: "وجهة التسجيل", en: "Lead destination" },
        { type: "select", options: ["Google Sheets", "Airtable", "HubSpot", "Notion"] },
      ),
      v(
        "followup_delay",
        { fa: "زمان پیگیری", ar: "توقيت المتابعة", en: "Follow-up delay" },
        { default: "24h" },
      ),
    ],
  },
];
