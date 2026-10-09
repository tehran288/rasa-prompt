/**
 * Persian copy — the SOURCE OF TRUTH for the bot's message keys.
 * ar.ts and en.ts are typed as Record<MessageKey, string>, so a key missing there
 * (or an extra key) is a compile error.
 *
 * Conventions:
 *  - Values are HTML (Telegram parse_mode=HTML). On platforms without HTML the tags are stripped.
 *  - `{param}` placeholders; string params are HTML-escaped by t(), numbers get locale digits.
 *  - Persian digits in static text (۰–۹), ZWNJ (‌) where Persian orthography needs it.
 */
export const fa = {
  // ── common buttons ──
  "btn.back": "🔙 بازگشت",
  "btn.home": "🏠 خانه",
  "btn.prev": "◀️ قبلی",
  "btn.next": "بعدی ▶️",
  "btn.cancel": "✖️ انصراف",
  "btn.newSearch": "🔎 جستجوی جدید",
  "btn.tryBuilder": "✨ ساخت با پرامپت‌ساز",
  "page.indicator": "{page} / {pages}",

  // ── main menu ──
  "menu.search": "🔎 جستجو",
  "menu.categories": "📚 دسته‌ها",
  "menu.trending": "🔥 ترندها",
  "menu.builder": "✨ پرامپت‌ساز هوشمند",
  "menu.library": "🗂 کتابخانه من",
  "menu.account": "💎 اشتراک و اعتبار",
  "menu.invite": "🎁 دعوت دوستان",
  "menu.support": "🆘 پشتیبانی",
  "menu.language": "🌐 زبان",
  "menu.title":
    "از کجا شروع کنیم؟ 👇\nیکی از گزینه‌ها را انتخاب کنید، یا هر چیزی که لازم دارید را همین‌جا برایم بنویسید.",
  "menu.placeholder": "مثلاً: کپشن اینستاگرام برای کافه",

  // ── onboarding ──
  "welcome.new":
    "سلام {name}! 👋\nبه <b>رسا پرامپت</b> خوش آمدید.\n\nاینجا پرامپت‌های حرفه‌ای پیدا می‌کنید که <b>واقعاً کار می‌کنند</b>: روی مدل‌های هوش مصنوعی تست شده‌اند، همیشه به‌روزند و به زبان شما نوشته شده‌اند.",
  "welcome.back": "خوش برگشتید {name} 🌿",
  "welcome.referred": "🎁 با دعوت یک دوست آمده‌اید؛ بعد از اولین خرید، هدیه‌تان فعال می‌شود.",
  "lang.pick": "🌐 زبان را انتخاب کنید\nاختر اللغة\nChoose your language",
  "lang.changed": "✅ زبان ربات روی فارسی تنظیم شد.",
  "help.text":
    "📖 <b>راهنمای رسا پرامپت</b>\n\n• کافی است موضوع کارتان را بنویسید؛ مثلاً «ایمیل پیگیری مشتری» — بهترین پرامپت‌ها را پیدا می‌کنم.\n• با ✨ پرامپت‌ساز، ایده خام را به پرامپت حرفه‌ای تبدیل کنید.\n• پرامپت‌های متغیردار را با 🧩 شخصی‌سازی کنید.\n\nدستورها:\n/start — منوی اصلی\n/search — جستجو\n/build — پرامپت‌ساز هوشمند\n/library — کتابخانه من\n/account — اشتراک و اعتبار\n/invite — دعوت دوستان\n/support — پشتیبانی\n/language — تغییر زبان",

  // ── commands (setMyCommands descriptions) ──
  "cmd.start": "شروع و منوی اصلی",
  "cmd.search": "جستجوی پرامپت",
  "cmd.build": "پرامپت‌ساز هوشمند",
  "cmd.library": "کتابخانه من",
  "cmd.account": "اشتراک و اعتبار",
  "cmd.invite": "دعوت دوستان",
  "cmd.support": "پشتیبانی",
  "cmd.language": "تغییر زبان",
  "cmd.help": "راهنما",

  // ── search & browse ──
  "search.ask":
    "🔎 دنبال چه پرامپتی هستید؟\nموضوع یا کاربرد را بنویسید؛ مثلاً: <i>کپشن اینستاگرام برای فروشگاه لباس</i>",
  "search.results": "🔎 نتایج «{query}» — {total} پرامپت",
  "search.empty":
    "😕 برای «{query}» هنوز پرامپتی نداریم.\nجستجوی شما ثبت شد تا تیم محتوا به‌زودی پرامپت مناسبش را بسازد. تا آن موقع می‌توانید همین حالا با ✨ پرامپت‌ساز هوشمند یکی بسازید.",
  "search.expired": "⌛️ این نتایج منقضی شده‌اند؛ لطفاً دوباره جستجو کنید.",
  "cats.title": "📚 <b>دسته‌بندی‌ها</b>\nیک دسته را انتخاب کنید:",
  "cats.empty": "هنوز دسته‌ای منتشر نشده است.",
  "cat.title": "{emoji} <b>{name}</b> — {total} پرامپت",
  "cat.empty": "این دسته فعلاً خالی است؛ به‌زودی پرامپت‌های تازه اضافه می‌شود.",
  "trending.title": "🔥 <b>ترندهای این روزها</b>\nپرامپت‌هایی که بیشتر از همه استفاده می‌شوند:",
  "trending.empty": "فعلاً موردی برای نمایش نیست.",
  "list.item": "{n}. {badge} <b>{title}</b>\n     🤖 {models} · 🏅 {score}",

  // ── tiers ──
  "tier.free": "🆓 رایگان",
  "tier.pro": "⭐ Pro",
  "tier.premium": "💎 Premium",

  // ── prompt card ──
  "card.models": "🤖 مدل‌ها: {models}",
  "card.tested": "✓ تست‌شده · {date}",
  "card.untested": "⏳ در صف تست",
  "card.quality": "🏅 امتیاز کیفیت: {score}/۱۰۰",
  "card.version": "🏷 نسخه {version}",
  "card.price": "💰 قیمت: {price}",
  "card.preview": "👀 <b>پیش‌نمایش</b>",
  "card.example": "📄 <b>نمونه خروجی</b>",
  "card.locked":
    "🔒 متن کامل این پرامپت برای خریداران و مشترکین Pro در دسترس است. با خرید، برای همیشه در کتابخانه‌تان می‌ماند و به‌روزرسانی‌ها هم رایگان است.",
  "card.owned": "✅ این پرامپت در کتابخانه شماست.",
  "btn.fullPrompt": "📋 متن کامل پرامپت",
  "btn.fill": "🧩 پر کردن متغیرها",
  "btn.run": "⚡ اجرا با هوش مصنوعی ({cost} اعتبار)",
  "btn.buy": "💳 خرید · {price}",
  "btn.inPro": "💎 دسترسی با اشتراک Pro",
  "prompt.notFound": "این پرامپت پیدا نشد یا دیگر در دسترس نیست.",
  "prompt.full": "📋 <b>{title}</b>\nروی متن زیر بزنید تا کپی شود 👇",
  "prompt.part": "بخش {part} از {parts}",
  "prompt.watermarkNote": "🔐 این نسخه مخصوص حساب شماست؛ لطفاً آن را عمومی منتشر نکنید.",
  "prompt.forbidden": "🔒 برای دیدن متن کامل، اول این پرامپت را تهیه کنید.",

  // ── variables wizard ──
  "wizard.start": "🧩 بیایید این پرامپت را برای کار شما شخصی کنیم — {count} سؤال کوتاه.",
  "wizard.ask": "({index}/{count}) <b>{label}</b>",
  "wizard.optional": "(اختیاری)",
  "wizard.default": "پیش‌فرض: {value}",
  "wizard.choose": "یکی از گزینه‌ها را انتخاب کنید یا بنویسید:",
  "wizard.invalidNumber": "🔢 لطفاً یک عدد وارد کنید.",
  "wizard.required": "این مورد لازم است؛ لطفاً مقداری بنویسید.",
  "wizard.done": "✅ <b>پرامپت نهایی شما آماده است</b> — روی متن بزنید تا کپی شود:",
  "wizard.noVars": "این پرامپت متغیری ندارد؛ همان متن کامل را استفاده کنید.",
  "btn.skip": "⏭ رد شدن",
  "btn.useDefault": "↩️ همان پیش‌فرض",

  // ── run with AI ──
  "run.working": "⏳ در حال اجرا… چند ثانیه صبر کنید.",
  "run.result": "⚡ <b>نتیجه اجرا</b>\n({cost} اعتبار کسر شد · موجودی: {balance})",
  "run.failed":
    "متأسفانه اجرا ناموفق بود و اعتبار شما برگردانده شد. لطفاً کمی بعد دوباره امتحان کنید.",
  "run.notRunnable":
    "این پرامپت برای تولید {type} است و باید در ابزار مخصوص همان کار اجرا شود؛ متن کامل را کپی کنید.",
  "ai.refused":
    "🙏 در این درخواست نمی‌توانم کمک کنم؛ اعتباری از شما کسر نشد. لطفاً موضوع دیگری را امتحان کنید.",
  "ai.busy":
    "🤖 دستیار هوشمند الان سرش خیلی شلوغ است؛ اعتباری کسر نشد. لطفاً کمی بعد دوباره امتحان کنید.",
  "run.nothing": "چیزی برای اجرا پیدا نشد؛ لطفاً دوباره از کارت پرامپت شروع کنید.",
  "credits.insufficient":
    "🔋 اعتبار کافی ندارید (لازم: {need} · موجودی: {balance}).\nبا خرید بسته اعتبار یا اشتراک Pro ادامه دهید.",
  "btn.buyCredits": "🔋 خرید اعتبار",
  "btn.plans": "💎 پلن‌های اشتراک",
  "output.text": "متن",
  "output.image": "تصویر",
  "output.video": "ویدیو",
  "output.audio": "صدا",
  "output.code": "کد",
  "output.automation": "اتوماسیون",

  // ── AI prompt builder ──
  "builder.intro":
    "✨ <b>پرامپت‌ساز هوشمند</b>\nایده‌تان را ساده و خودمانی بنویسید؛ من آن را به یک پرامپت حرفه‌ای و ساختاریافته تبدیل می‌کنم.\n\nمثال: <i>برنامه غذایی هفتگی برای یک ورزشکار گیاه‌خوار</i>",
  "builder.quotaFree": "🎁 ساخت رایگان امروز: {left} از {total}",
  "builder.quotaPaid": "🔋 سهمیه رایگان امروز تمام شده؛ هر ساخت {cost} اعتبار (موجودی: {balance})",
  "builder.working": "⏳ دارم پرامپت شما را می‌سازم…",
  "builder.result": "✨ <b>{title}</b>",
  "builder.variables": "🧩 متغیرها: {vars}",
  "builder.tips": "💡 <b>نکته‌ها</b>",
  "builder.footer": "ایده بعدی‌تان را بفرستید یا از منو ادامه دهید.",
  "builder.freeUsed": "🎁 از سهمیه رایگان امروز استفاده شد · باقی‌مانده: {left}",
  "builder.paidUsed": "🔋 {cost} اعتبار کسر شد · موجودی: {balance}",
  "builder.blocked":
    "🙏 این درخواست با سیاست محتوای ما سازگار نیست. لطفاً موضوع دیگری را امتحان کنید.",
  "builder.failed":
    "ساخت پرامپت ناموفق بود؛ اگر اعتباری کسر شده بود برگردانده شد. دوباره تلاش کنید.",
  "builder.tooShort": "کمی بیشتر توضیح دهید (چند کلمه) تا پرامپت دقیق‌تری بسازم.",
  "btn.buildAgain": "✨ ساخت یکی دیگر",

  // ── library & account ──
  "library.title": "🗂 <b>کتابخانه من</b> — {total} پرامپت",
  "library.empty":
    "کتابخانه شما هنوز خالی است.\nپرامپت‌های رایگان را ببینید، یا با اشتراک Pro به همه پرامپت‌های حرفه‌ای دسترسی بگیرید.",
  "account.title": "💎 <b>اشتراک و اعتبار</b>",
  "account.sub": "اشتراک فعال: <b>{plan}</b>\n📅 معتبر تا: {date}",
  "account.subLifetime": "اشتراک فعال: <b>{plan}</b> (مادام‌العمر ♾)",
  "account.noSub": "اشتراک فعالی ندارید.",
  "account.balance": "🔋 موجودی اعتبار: <b>{balance}</b>",
  "account.hint": "با اشتراک Pro همه پرامپت‌های حرفه‌ای باز می‌شوند و هر ماه اعتبار اجرا هم می‌گیرید.",
  "plans.title": "💎 <b>پلن‌های اشتراک</b>",
  "plans.item": "• <b>{title}</b> — {price}\n   🔋 {credits} اعتبار در ماه · ⏳ {duration}",
  "plans.days": "{days} روز",
  "plans.lifetime": "مادام‌العمر",
  "plans.empty": "فعلاً پلنی برای فروش فعال نیست.",
  "packs.title": "🔋 <b>بسته‌های اعتبار</b>\nاعتبار خریداری‌شده منقضی نمی‌شود.",
  "packs.item": "• <b>{title}</b> — {credits} اعتبار · {price}",
  "packs.empty": "فعلاً بسته اعتباری برای فروش فعال نیست.",
  "btn.library": "🗂 کتابخانه من",

  // ── payments ──
  "pay.web":
    "💳 برای پرداخت امن روی دکمه زیر بزنید.\nبعد از پرداخت، خریدتان خودکار به حساب شما اضافه می‌شود.",
  "btn.payWeb": "💳 پرداخت آنلاین",
  "pay.unavailable": "این مورد فعلاً روی این پیام‌رسان قابل خرید نیست.",
  "pay.precheckFailed": "این سفارش منقضی یا نامعتبر است؛ لطفاً دوباره از داخل ربات خرید کنید.",
  "pay.thanks":
    "🎉 <b>پرداخت موفق بود!</b> از اعتمادتان سپاسگزاریم.\nشماره سفارش: <code>{order}</code>",
  "pay.planActive": "💎 اشتراک <b>{plan}</b> برای شما فعال شد. همه پرامپت‌های Pro حالا باز هستند.",
  "pay.creditsAdded": "🔋 اعتبار شما شارژ شد. موجودی فعلی: <b>{balance}</b>",
  "pay.bundleAdded": "📦 «{title}» به کتابخانه شما اضافه شد.",
  "pay.upsellPro":
    "💡 می‌دانستید؟ با اشتراک Pro به همه پرامپت‌های حرفه‌ای دسترسی دارید و هر ماه اعتبار اجرا هم می‌گیرید.",
  "pay.fulfillFailed":
    "✅ پرداخت شما دریافت شد، اما تحویل خودکار با مشکل روبه‌رو شد. تیم پشتیبانی همین حالا مطلع شد و پیگیری می‌کند — نیازی به پرداخت دوباره نیست.",
  "bundle.title": "📦 <b>{title}</b>\n💰 قیمت: {price}",
  "bundle.notFound": "این بسته پیدا نشد یا دیگر فروخته نمی‌شود.",

  // ── referral ──
  "ref.title":
    "🎁 <b>دوستانتان را دعوت کنید</b>\nوقتی دوستی با لینک شما بیاید و اولین خریدش را انجام دهد، هر دو نفر <b>{reward}</b> اعتبار هدیه می‌گیرید.",
  "ref.link": "🔗 لینک اختصاصی شما:\n{link}",
  "ref.stats": "👥 دعوت‌شده: {invited} · 🛍 خریدار: {converted} · 🔋 اعتبار کسب‌شده: {earned}",
  "ref.shareText": "پرامپت‌های حرفه‌ای و تست‌شده هوش مصنوعی، به زبان خودت 👇",
  "btn.share": "📤 ارسال لینک برای دوستان",

  // ── support ──
  "support.intro":
    "🆘 <b>پشتیبانی رسا</b>\nسؤال یا مشکل‌تان را بنویسید. دستیار هوشمند ما فوراً پاسخ می‌دهد و هر جا لازم باشد، گفت‌وگو را به همکاران پشتیبانی می‌سپارد.",
  "support.escalated":
    "🙋 درخواست شما با شماره <code>{ticket}</code> برای همکاران پشتیبانی ارسال شد. پاسخ را همین‌جا دریافت می‌کنید.",
  "support.forwarded": "📨 پیام شما به درخواست <code>{ticket}</code> اضافه شد.",
  "support.closedByUser": "✅ گفت‌وگوی پشتیبانی بسته شد. هر وقت لازم بود، در خدمت شما هستیم.",
  "support.closedByAdmin":
    "✅ درخواست <code>{ticket}</code> توسط پشتیبانی بسته شد. اگر سؤال دیگری دارید، از 🆘 پشتیبانی استفاده کنید.",
  "support.adminReply": "💬 <b>پاسخ پشتیبانی</b> (درخواست <code>{ticket}</code>):\n\n{text}",
  "support.aiUnavailable":
    "دستیار هوشمند فعلاً در دسترس نیست؛ پیام شما مستقیم برای همکاران پشتیبانی فرستاده شد.",
  "support.subject": "درخواست پشتیبانی از ربات",
  "btn.human": "🙋 گفت‌وگو با پشتیبان",
  "btn.endSupport": "✅ مشکلم حل شد",
  "btn.replySupport": "✍️ پاسخ به پشتیبانی",
  "support.replyAsk": "✍️ پیام‌تان را بنویسید تا برای پشتیبانی ارسال شود:",
  "support.humanAsk": "🙋 حتماً! پیام‌تان را بنویسید تا مستقیم به همکاران پشتیبانی برسد.",

  // ── admin ──
  "admin.only": "⛔ این دستور فقط برای مدیران است.",
  "admin.panel":
    "🛠 <b>پنل مدیریت</b>\nبرای مسدودسازی: <code>/ban شناسه</code> · <code>/unban شناسه</code>",
  "btn.admin.stats": "📊 آمار امروز",
  "btn.admin.broadcast": "📣 ارسال همگانی",
  "btn.admin.review": "🧪 صف بررسی",
  "btn.admin.tickets": "🎫 درخواست‌های باز",
  "admin.stats":
    "📊 <b>آمار {date}</b>\n👤 کاربران جدید: {newUsers}\n🔥 کاربران فعال: {activeUsers}\n🔎 جستجو: {searches} (بی‌نتیجه: {zero})\n🛍 سفارش پرداخت‌شده: {orders}\n💰 درآمد: {toman} · {stars}\n🎫 درخواست باز: {tickets}",
  "admin.topQueries": "🔝 <b>جستجوهای پرتکرار</b>",
  "admin.zeroQueries": "🕳 <b>جستجوهای بی‌نتیجه</b>",
  "admin.ticketNew": "🎫 <b>درخواست جدید</b> {tag}\nاز: {user}\nموضوع: {subject}\n\n{text}",
  "admin.ticketMsg": "💬 <b>پیام جدید</b> {tag}\nاز: {user}\n\n{text}",
  "admin.ticketHint": "برای پاسخ، روی همین پیام ریپلای کنید یا دکمه «پاسخ» را بزنید.",
  "btn.admin.reply": "✍️ پاسخ",
  "btn.admin.close": "🔒 بستن",
  "admin.replyAsk": "✍️ پاسخ خود به {tag} را بنویسید:",
  "admin.replySent": "✅ پاسخ برای کاربر ارسال شد.",
  "admin.replyUsage": "استفاده: <code>/reply شناسه‌درخواست متن پاسخ</code>",
  "admin.closeUsage": "استفاده: <code>/close شناسه‌درخواست</code>",
  "admin.ticketNotFound": "درخواست پیدا نشد.",
  "admin.ticketClosed": "🔒 {tag} بسته شد.",
  "admin.tickets.title": "🎫 <b>درخواست‌های باز</b> ({count})",
  "admin.tickets.empty": "هیچ درخواست بازی نداریم 🎉",
  "admin.ticketItem": "• {tag} — {subject} ({status})",
  "admin.banUsage": "استفاده: <code>/ban شناسه‌عددی‌کاربر</code>",
  "admin.banned": "🚫 کاربر {user} مسدود شد.",
  "admin.unbanned": "✅ کاربر {user} از مسدودی خارج شد.",
  "admin.userNotFound": "کاربر پیدا نشد.",
  "admin.review.empty": "صف بررسی خالی است ✨",
  "admin.review.unavailable": "سرویس صف بررسی در دسترس نیست.",
  "admin.review.item":
    "🧪 <b>پیش‌نویس در انتظار بررسی</b> ({count} مورد در صف)\n\n<b>{title}</b>\n{summary}\n\nسطح: {tier} · مدل‌ها: {models}\nامتیاز داور: {judge} · اصالت: {originality}\nقیمت پیشنهادی: {price}",
  "admin.review.approved": "✅ منتشر شد (شناسه: <code>{id}</code>)",
  "admin.review.rejected": "❌ رد شد.",
  "btn.approve": "✅ تأیید و انتشار",
  "btn.reject": "❌ رد",
  "admin.bc.segment": "📣 <b>ارسال همگانی</b>\nمخاطبان را انتخاب کنید:",
  "admin.bc.locale": "زبان مخاطبان را انتخاب کنید:",
  "admin.bc.text": "متن پیام را بفرستید.\n(قالب‌بندی ساده HTML مثل &lt;b&gt; و &lt;i&gt; مجاز است.)",
  "admin.bc.preview":
    "👁 <b>پیش‌نمایش</b> — مخاطبان: {segment} · {locale} · حدود {count} نفر\n────────────\n{text}",
  "admin.bc.queued": "✅ ارسال همگانی در صف قرار گرفت. {id}",
  "admin.bc.noQueue": "⚠️ صف ارسال در دسترس نیست؛ هیچ پیامی ارسال نشد.",
  "admin.bc.cancelled": "ارسال همگانی لغو شد.",
  "seg.all": "همه کاربران",
  "seg.buyers": "خریداران",
  "seg.non_buyers": "کسانی که هنوز خرید نکرده‌اند",
  "seg.subscribers": "مشترکین",
  "btn.allLocales": "🌐 همه زبان‌ها",
  "btn.confirmSend": "🚀 ارسال",

  // ── concierge / misc ──
  "concierge.unsafe":
    "🙏 در این مورد نمی‌توانم کمک کنم. اگر برای کار یا یادگیری دنبال پرامپت هستید، با کمال میل کمک می‌کنم.",
  "concierge.fallback": "موضوع پرامپتی را که لازم دارید بنویسید، یا از منوی زیر استفاده کنید 👇",
  "unknown.media": "فعلاً فقط پیام متنی را می‌فهمم 🙂 موضوع مورد نظرتان را بنویسید.",
  "unknown.command": "این دستور را نمی‌شناسم. /help را ببینید.",

  // ── inline mode ──
  "inline.open": "🔓 باز کردن در ربات",
  "inline.startButton": "✨ رسا پرامپت را باز کنید",
  "inline.message": "{badge} <b>{title}</b>\n{summary}\n\n🤖 {models} · 🏅 {score}",

  // ── errors ──
  "error.generic":
    "😔 مشکلی پیش آمد. لطفاً چند لحظه بعد دوباره امتحان کنید؛ اگر تکرار شد، از 🆘 پشتیبانی کمک بگیرید.",
  "error.rateLimited": "⏳ کمی آهسته‌تر لطفاً! چند ثانیه صبر کنید و دوباره امتحان کنید.",
  "error.notFound": "موردی که دنبالش بودید پیدا نشد.",
  "error.invalidState": "این مرحله دیگر معتبر نیست؛ از منو دوباره شروع کنید.",
} as const satisfies Record<string, string>;

export type MessageKey = keyof typeof fa;
export type Messages = Record<MessageKey, string>;
