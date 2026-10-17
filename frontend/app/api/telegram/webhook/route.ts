import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://stech-backend-xz6j.onrender.com";

const CUSTOMER_BOT_TOKEN =
  process.env.TELEGRAM_CUSTOMER_BOT_TOKEN ||
  process.env.TELEGRAM_AUTH_BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN ||
  "";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: {
      id: number | string;
      type: string;
      title?: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    from?: {
      id: number | string;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    text?: string;
    contact?: any;
    location?: any;
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number | string };
    };
    from: {
      id: number | string;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
}

/**
 * Health check & status endpoint
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "S Tech Telegram Ultra-Fast Edge Webhook",
    timestamp: new Date().toISOString(),
    backend_target: BACKEND_URL,
  });
}

/**
 * High-speed local-first Telegram webhook handler
 * Responds to Telegram in < 30ms using direct webhook response methods!
 */
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const body: TelegramUpdate = await req.json();

    // Asynchronously forward update to Laravel backend (wakes up Render & syncs database in background)
    fetch(`${BACKEND_URL}/api/telegram/webhook${url.search}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.get("x-telegram-bot-api-secret-token")
          ? { "X-Telegram-Bot-Api-Secret-Token": req.headers.get("x-telegram-bot-api-secret-token")! }
          : {}),
      },
      body: JSON.stringify(body),
    }).catch((err) => {
      console.warn("Background webhook forward warning:", err?.message || err);
    });

    // ── 1. FAST PATH: Inline Keyboard Callback Query ─────────────────────────
    if (body.callback_query) {
      const cb = body.callback_query;
      const cbData = cb.data || "";
      const chatId = cb.message?.chat.id || cb.from.id;
      const messageId = cb.message?.message_id;
      const fromName = [cb.from.first_name, cb.from.last_name].filter(Boolean).join(" ") || "អតិថិជន";

      // A. "cust_my_orders" -> Transform instantly into Order Date Options Menu (< 20ms)
      if (cbData === "cust_my_orders" && messageId) {
        const orderMenuText = `📦 <b>ការពិនិត្យមើលប្រវត្តិបញ្ជាទិញ (My Orders Hub):</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `ជម្រាបសួរ <b>${escapeHtml(fromName)}</b>!\n` +
          `សូមជ្រើសរើសជម្រើសចន្លោះកាលបរិច្ឆេទដែលលោកអ្នកចង់ពិនិត្យមើល៖\n\n` +
          `• 📅 <b>«ការ Order ថ្ងៃនេះ»</b> — មើលទំនិញដែលបានកុម្ម៉ង់ក្នុងថ្ងៃនេះ\n` +
          `• 🗓️ <b>«ការ Order សប្ដាហ៍នេះ»</b> — មើលទំនិញ ៧ ថ្ងៃចុងក្រោយ\n` +
          `• 📦 <b>«ការ Order ទាំងអស់»</b> — ប្រវត្តិបញ្ជាទិញសរុប\n` +
          `• 📆 <b>«ជ្រើសរើសថ្ងៃជាក់លាក់»</b> — ម្សិលមិញ ឬកាលបរិច្ឆេទណាមួយ\n\n` +
          `👉 <i>សូមចុចប៊ូតុងជម្រើសខាងក្រោម៖</i>`;

        return NextResponse.json({
          method: "editMessageText",
          chat_id: chatId,
          message_id: messageId,
          text: orderMenuText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📅 ការ Order ថ្ងៃនេះ", callback_data: "cust_orders_filter:today" },
                { text: "🗓️ ការ Order សប្ដាហ៍នេះ", callback_data: "cust_orders_filter:week" },
              ],
              [
                { text: "📦 ការ Order ទាំងអស់", callback_data: "cust_orders_filter:all" },
                { text: "📆 ជ្រើសរើសថ្ងៃជាក់លាក់", callback_data: "cust_orders_filter:picker" },
              ],
              [
                {
                  text: "📱 មើល Orders ក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/orders?tg_token=${chatId}` },
                },
              ],
              [
                {
                  text: "🛍️ ចូលទិញទំនិញក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
                { text: "🔙 មឺនុយមេ", callback_data: "cust_main_menu" },
              ],
            ],
          },
        });
      }

      // B. "cust_main_menu" -> Return to Welcome Dashboard (< 20ms)
      if (cbData === "cust_main_menu" && messageId) {
        const welcomeText = `👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Official Bot!</b>\n\n` +
          `ជម្រាបសួរ <b>${escapeHtml(fromName)}</b>!\n` +
          `🏪 <b>ហាង S Tech Store Cambodia</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n` +
          `✨ <b>គណនី Telegram របស់អ្នកត្រូវបានទទួលស្គាល់ ១០០% (Connected)!</b>\n` +
          `លោកអ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីចូលទិញទំនិញភ្លាមៗ ដោយមិនបាច់វាយលេខសម្ងាត់ឡើយ៖`;

        return NextResponse.json({
          method: "editMessageText",
          chat_id: chatId,
          message_id: messageId,
          text: welcomeText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛍️ បើកទិញទំនិញក្នុង Mini App (Open Store)",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
              ],
              [
                { text: "📦 ការកុម្ម៉ង់របស់ខ្ញុំ", callback_data: "cust_my_orders" },
                { text: "💰 កាបូបលុយ & សមតុល្យ", callback_data: "cust_my_wallet" },
              ],
              [
                { text: "🪙 ពិន្ទុ & VIP (Coins)", callback_data: "cust_my_points" },
                { text: "🔥 ប្រូម៉ូសិនពិសេស", callback_data: "cust_promo" },
              ],
              [
                { text: "💻 ផលិតផល Laptops & PC", callback_data: "cust_shop" },
                { text: "📞 ទំនាក់ទំនង & ទីតាំង", callback_data: "cust_contact" },
              ],
            ],
          },
        });
      }

      // C. "cust_promo" -> Instant Promotions Text (< 20ms)
      if (cbData === "cust_promo" && messageId) {
        const promoMsg = `🔥 <b>កូដបញ្ចុះតម្លៃ & ប្រូម៉ូសិនពិសេសនៅ S Tech Store!</b>\n\n` +
          `🎉 <b>កូដបញ្ចុះតម្លៃសកម្មបច្ចុប្បន្ន (Active Promo Codes):</b>\n` +
          `• 🎟️ <code>STECH10</code> — បញ្ចុះ <b>10% ភ្លាមៗ</b> លើរាល់ការបញ្ជាទិញ\n` +
          `• 🎟️ <code>WELCOME5</code> — បញ្ចុះតម្លៃ <b>$5.00 USD</b> លើ Laptop ឬ PC build\n\n` +
          `🚚 <b>Free Delivery:</b> ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងរាជធានីភ្នំពេញ (ចាប់ពី $50 ឡើងទៅ)\n` +
          `🎁 <b>កាដូថែមជូន:</b> Mouse Wireless, Mousepad, កាតាប និងដំឡើង Windows 11 Free!\n\n` +
          `👉 <b>សូមចុចបើក Mini App ដើម្បីប្រើប្រាស់កូដបញ្ចុះតម្លៃភ្លាមៗ!</b>`;

        return NextResponse.json({
          method: "editMessageText",
          chat_id: chatId,
          message_id: messageId,
          text: promoMsg,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛍️ ប្រើប្រាស់កូដក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
              ],
              [
                { text: "💻 មើលផលិតផល", callback_data: "cust_shop" },
                { text: "🔙 មឺនុយមេ", callback_data: "cust_main_menu" },
              ],
            ],
          },
        });
      }

      // D. "cust_shop" -> Instant Shop Catalog (< 20ms)
      if (cbData === "cust_shop" && messageId) {
        const shopMsg = `💻 <b>ឧបករណ៍បច្ចេកវិទ្យា & Laptops នៅ S Tech Store:</b>\n\n` +
          `🌟 <b>ទំនិញពេញនិយម និងមានក្នុងស្តុកស្រាប់៖</b>\n` +
          `• 💻 <b>Laptops ម៉ាកល្បីៗ:</b> ASUS ROG/TUF, Apple MacBook M2/M3, Dell XPS/Latitude, Lenovo Legion, Acer, MSI Gaming\n` +
          `• 🖥️ <b>Custom PC:</b> ឈុត PC Gaming & Office តម្លៃចាប់ពី $299 ឡើងទៅ\n` +
          `• ⚙️ <b>គ្រឿងបន្លាស់:</b> Core i5/i7/i9, AMD Ryzen, VGA RTX 4060/4070/4080, RAM DDR4/DDR5, SSD M.2 NVMe\n` +
          `• 🎧 <b>Gaming Gears:</b> អេក្រង់ 144Hz-240Hz, Keyboard Mechanical, Mouse Wireless\n\n` +
          `👉 <b>សូមចុចប៊ូតុង Mini App ខាងក្រោមដើម្បីមើលតម្លៃជាក់ស្តែង និងបញ្ជាទិញភ្លាមៗ!</b>`;

        return NextResponse.json({
          method: "editMessageText",
          chat_id: chatId,
          message_id: messageId,
          text: shopMsg,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛍️ បើកទិញក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
              ],
              [
                { text: "🔥 ប្រូម៉ូសិនពិសេស", callback_data: "cust_promo" },
                { text: "🔙 មឺនុយមេ", callback_data: "cust_main_menu" },
              ],
            ],
          },
        });
      }

      // E. "cust_contact" -> Instant Contact & Location (< 20ms)
      if (cbData === "cust_contact" && messageId) {
        const contactMsg = `📍 <b>ទីតាំងហាង & ទំនាក់ទំនង S Tech Store Cambodia:</b>\n\n` +
          `🏪 <b>ហាង S Tech Store</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n` +
          `• 📍 <b>ទីតាំង:</b> រាជធានីភ្នំពេញ, ប្រទេសកម្ពុជា\n` +
          `• ⏰ <b>ម៉ោងបម្រើការងារ:</b> <b>8:00 AM ដល់ 8:00 PM</b> (ចន្ទ ដល់ អាទិត្យ គ្មានថ្ងៃសម្រាក)\n` +
          `• 📞 <b>Hotline:</b> <code>012 345 678</code> | <code>098 765 432</code>\n` +
          `• 🌐 <b>គេហទំព័រ:</b> https://www.s-tech-store.tech\n\n` +
          `🚚 <b>សេវាដឹកជញ្ជូន:</b> រហ័សទាន់ចិត្ត ២៥ ខេត្ត-ក្រុង!`;

        return NextResponse.json({
          method: "editMessageText",
          chat_id: chatId,
          message_id: messageId,
          text: contactMsg,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛍️ បើកមើលក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
              ],
              [{ text: "🔙 មឺនុយមេ", callback_data: "cust_main_menu" }],
            ],
          },
        });
      }

      // F. "cust_my_wallet" -> Instant Wallet Info & Mini App Shortcut (< 20ms)
      if (cbData === "cust_my_wallet" && messageId) {
        const walletMsg = `💰 <b>កាបូបលុយ S-Tech Wallet:</b>\n\n` +
          `សួស្តី <b>${escapeHtml(fromName)}</b>!\n` +
          `• 💳 <b>ទូទាត់រហ័ស:</b> ចុចទូទាត់ទំនិញដោយមិនបាច់ស្កេន KHQR ម្តងហើយម្តងទៀត\n` +
          `• 🪙 <b>S-Coins Cashback:</b> ទទួលបានកាក់ត្រឡប់មកវិញរាល់ការទិញ\n` +
          `• 🎁 <b>Vouchers:</b> គ្រប់គ្រងប័ណ្ណបញ្ចុះតម្លៃទាំងអស់របស់អ្នកនៅទីនេះ\n\n` +
          `👉 <b>សូមចុចប៊ូតុងខាងក្រោមដើម្បីពិនិត្យសមតុល្យ និងបញ្ចូលលុយក្នុង Mini App!</b>`;

        return NextResponse.json({
          method: "editMessageText",
          chat_id: chatId,
          message_id: messageId,
          text: walletMsg,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "💰 បើកកាបូបលុយក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/account?tg_token=${chatId}` },
                },
              ],
              [{ text: "🔙 មឺនុយមេ", callback_data: "cust_main_menu" }],
            ],
          },
        });
      }

      // G. "cust_orders_filter:picker" -> Date Picker Guidance (< 20ms)
      if (cbData === "cust_orders_filter:picker" && messageId) {
        const pickerMsg = `📆 <b>ស្វែងរកការបញ្ជាទិញតាមកាលបរិច្ឆេទជាក់លាក់:</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `លោកអ្នកអាចវាយកាលបរិច្ឆេទដែលចង់ឆែក (ឧទាហរណ៍៖ <code>12/10/2026</code> ឬ <code>2026-10-12</code>) ផ្ញើមកកាន់ Bot នេះផ្ទាល់ ឬចុចបើកផ្ទាំង Mini App ដើម្បីមើលប្រតិទិនបានភ្លាមៗ!`;

        return NextResponse.json({
          method: "editMessageText",
          chat_id: chatId,
          message_id: messageId,
          text: pickerMsg,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📱 បើកមើល Orders ក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/orders?tg_token=${chatId}` },
                },
              ],
              [
                { text: "📅 ថ្ងៃនេះ", callback_data: "cust_orders_filter:today" },
                { text: "🗓️ សប្ដាហ៍នេះ", callback_data: "cust_orders_filter:week" },
              ],
              [{ text: "🔙 ជម្រើស Orders", callback_data: "cust_my_orders" }],
            ],
          },
        });
      }

      // General callback query acknowledgement
      const quickToast = getQuickCallbackToast(cbData);
      return NextResponse.json({
        method: "answerCallbackQuery",
        callback_query_id: cb.id,
        text: quickToast,
        cache_time: 1,
      });
    }

    // ── 2. FAST PATH: Incoming Text Messages ─────────────────────────────────
    const msg = body.message;
    if (msg && typeof msg.text === "string") {
      const chatId = msg.chat.id;
      const text = msg.text.trim();
      const textLower = text.toLowerCase();
      const from = msg.from;
      const fromName = from ? [from.first_name, from.last_name].filter(Boolean).join(" ") : "អតិថិជន";

      // A. /start command
      if (/^\/start(?:@\w+)?(?:\s+(.*))?$/i.test(text)) {
        const match = text.match(/^\/start(?:@\w+)?(?:\s+(.*))?$/i);
        const startParam = match?.[1]?.trim() || "";

        // 1-Click Location Sync (syncloc_...)
        if (startParam.toLowerCase().startsWith("syncloc_")) {
          return NextResponse.json({
            method: "sendMessage",
            chat_id: chatId,
            text: `📍 <b>សូមចែករំលែកទីតាំងសម្រាប់ដឹកជញ្ជូន (Checkout)</b>\n━━━━━━━━━━━━━━━━━━━━\n\n` +
              `សួស្តី <b>${escapeHtml(fromName)}</b>! សូមចុចប៊ូតុង <b>'📍 ចែករំលែកទីតាំង (Share Location)'</b> ខាងក្រោម ដើម្បីឱ្យប្រព័ន្ធ S Tech Store បំពេញទីតាំង និងគណនាតម្លៃដឹកជញ្ជូនចូលផ្ទាំង Checkout ដោយស្វ័យប្រវត្តិ។`,
            parse_mode: "HTML",
            reply_markup: {
              keyboard: [
                [{ text: "📍 ចែករំលែកទីតាំង (Share Location)", request_location: true }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
        }

        // 1-Click Login Handshake (tgauth_...)
        if (startParam.toLowerCase().startsWith("tgauth_")) {
          return NextResponse.json({
            method: "sendMessage",
            chat_id: chatId,
            text: `⚡ <b>កំពុងផ្ទៀងផ្ទាត់គណនី Telegram...</b>\n\nជម្រាបសួរ <b>${escapeHtml(fromName)}</b>! ប្រព័ន្ធកំពុងភ្ជាប់គណនីរបស់អ្នកទៅកាន់ Website ដោយស្វ័យប្រវត្តិ។ សូមរង់ចាំមួយភ្លែត!`,
            parse_mode: "HTML",
          });
        }

        // Standard /start: Instant welcome menu (< 25ms)
        const welcomeText = `👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Official Bot!</b>\n\n` +
          `ជម្រាបសួរ <b>${escapeHtml(fromName)}</b>!\n` +
          `🏪 <b>ហាង S Tech Store Cambodia</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n` +
          `✨ <b>គណនី Telegram របស់អ្នកត្រូវបានទទួលស្គាល់ ១០០% (Connected)!</b>\n` +
          `លោកអ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីចូលទិញទំនិញភ្លាមៗ ដោយមិនបាច់វាយលេខសម្ងាត់ឡើយ៖`;

        return NextResponse.json({
          method: "sendMessage",
          chat_id: chatId,
          text: welcomeText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛍️ បើកទិញទំនិញក្នុង Mini App (Open Store)",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
              ],
              [
                { text: "📦 ការកុម្ម៉ង់របស់ខ្ញុំ", callback_data: "cust_my_orders" },
                { text: "💰 កាបូបលុយ & សមតុល្យ", callback_data: "cust_my_wallet" },
              ],
              [
                { text: "🪙 ពិន្ទុ & VIP (Coins)", callback_data: "cust_my_points" },
                { text: "🔥 ប្រូម៉ូសិនពិសេស", callback_data: "cust_promo" },
              ],
              [
                { text: "💻 ផលិតផល Laptops & PC", callback_data: "cust_shop" },
                { text: "📞 ទំនាក់ទំនង & ទីតាំង", callback_data: "cust_contact" },
              ],
            ],
          },
        });
      }

      // B. Orders Command or Questions
      if (/^\/(?:orders|myorders|track)(?:@\w+)?/i.test(text) || /(my order|orders|ការកុម្ម៉ង់|កុម្ម៉ង់|ទិញទំនិញ|តាមដាន)/u.test(textLower)) {
        const orderMenuText = `📦 <b>ការពិនិត្យមើលប្រវត្តិបញ្ជាទិញ (My Orders Hub):</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `ជម្រាបសួរ <b>${escapeHtml(fromName)}</b>!\n` +
          `សូមជ្រើសរើសជម្រើសចន្លោះកាលបរិច្ឆេទដែលលោកអ្នកចង់ពិនិត្យមើល៖\n\n` +
          `• 📅 <b>«ការ Order ថ្ងៃនេះ»</b> — មើលទំនិញដែលបានកុម្ម៉ង់ក្នុងថ្ងៃនេះ\n` +
          `• 🗓️ <b>«ការ Order សប្ដាហ៍នេះ»</b> — មើលទំនិញ ៧ ថ្ងៃចុងក្រោយ\n` +
          `• 📦 <b>«ការ Order ទាំងអស់»</b> — ប្រវត្តិបញ្ជាទិញសរុប\n` +
          `• 📆 <b>«ជ្រើសរើសថ្ងៃជាក់លាក់»</b> — ម្សិលមិញ ឬកាលបរិច្ឆេទណាមួយ\n\n` +
          `👉 <i>សូមចុចប៊ូតុងជម្រើសខាងក្រោម៖</i>`;

        return NextResponse.json({
          method: "sendMessage",
          chat_id: chatId,
          text: orderMenuText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📅 ការ Order ថ្ងៃនេះ", callback_data: "cust_orders_filter:today" },
                { text: "🗓️ ការ Order សប្ដាហ៍នេះ", callback_data: "cust_orders_filter:week" },
              ],
              [
                { text: "📦 ការ Order ទាំងអស់", callback_data: "cust_orders_filter:all" },
                { text: "📆 ជ្រើសរើសថ្ងៃជាក់លាក់", callback_data: "cust_orders_filter:picker" },
              ],
              [
                {
                  text: "📱 មើល Orders ក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/orders?tg_token=${chatId}` },
                },
              ],
              [
                {
                  text: "🛍️ ចូលទិញទំនិញក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
                { text: "🔙 មឺនុយមេ", callback_data: "cust_main_menu" },
              ],
            ],
          },
        });
      }

      // C. /promo or "voucher" or "កូដ"
      if (/^\/(?:promo|promotions)(?:@\w+)?/i.test(text) || /(voucher|coupon|code|កូដ|បញ្ចុះតម្លៃ|discount)/u.test(textLower)) {
        const promoMsg = `🔥 <b>កូដបញ្ចុះតម្លៃ & ប្រូម៉ូសិនពិសេសនៅ S Tech Store!</b>\n\n` +
          `🎉 <b>កូដបញ្ចុះតម្លៃសកម្មបច្ចុប្បន្ន (Active Promo Codes):</b>\n` +
          `• 🎟️ <code>STECH10</code> — បញ្ចុះ <b>10% ភ្លាមៗ</b> លើរាល់ការបញ្ជាទិញ\n` +
          `• 🎟️ <code>WELCOME5</code> — បញ្ចុះតម្លៃ <b>$5.00 USD</b> លើ Laptop ឬ PC build\n\n` +
          `🚚 <b>Free Delivery:</b> ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងរាជធានីភ្នំពេញ (ចាប់ពី $50 ឡើងទៅ)\n` +
          `🎁 <b>កាដូថែមជូន:</b> Mouse Wireless, Mousepad, កាតាប និងដំឡើង Windows 11 Free!\n\n` +
          `👉 <b>សូមចុចបើក Mini App ដើម្បីប្រើប្រាស់កូដបញ្ចុះតម្លៃភ្លាមៗ!</b>`;

        return NextResponse.json({
          method: "sendMessage",
          chat_id: chatId,
          text: promoMsg,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛍️ ប្រើប្រាស់កូដក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
              ],
              [
                { text: "💻 មើលផលិតផល", callback_data: "cust_shop" },
                { text: "🔙 មឺនុយមេ", callback_data: "cust_main_menu" },
              ],
            ],
          },
        });
      }

      // D. /shop or /products
      if (/^\/(?:shop|products)(?:@\w+)?/i.test(text) || /(laptop|pc|កុំព្យូទ័រ|គ្រឿងបន្លាស់)/u.test(textLower)) {
        const shopMsg = `💻 <b>ឧបករណ៍បច្ចេកវិទ្យា & Laptops នៅ S Tech Store:</b>\n\n` +
          `🌟 <b>ទំនិញពេញនិយម និងមានក្នុងស្តុកស្រាប់៖</b>\n` +
          `• 💻 <b>Laptops ម៉ាកល្បីៗ:</b> ASUS ROG/TUF, Apple MacBook M2/M3, Dell XPS/Latitude, Lenovo Legion, Acer, MSI Gaming\n` +
          `• 🖥️ <b>Custom PC:</b> ឈុត PC Gaming & Office តម្លៃចាប់ពី $299 ឡើងទៅ\n` +
          `• ⚙️ <b>គ្រឿងបន្លាស់:</b> Core i5/i7/i9, AMD Ryzen, VGA RTX 4060/4070/4080, RAM DDR4/DDR5, SSD M.2 NVMe\n` +
          `• 🎧 <b>Gaming Gears:</b> អេក្រង់ 144Hz-240Hz, Keyboard Mechanical, Mouse Wireless\n\n` +
          `👉 <b>សូមចុចប៊ូតុង Mini App ខាងក្រោមដើម្បីមើលតម្លៃជាក់ស្តែង និងបញ្ជាទិញភ្លាមៗ!</b>`;

        return NextResponse.json({
          method: "sendMessage",
          chat_id: chatId,
          text: shopMsg,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛍️ បើកទិញក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
              ],
              [
                { text: "🔥 ប្រូម៉ូសិនពិសេស", callback_data: "cust_promo" },
                { text: "🔙 មឺនុយមេ", callback_data: "cust_main_menu" },
              ],
            ],
          },
        });
      }

      // E. /contact or /about or location
      if (/^\/(?:contact|about)(?:@\w+)?/i.test(text) || /(ទីតាំង|location|address|ហាងនៅណា|ម៉ោងបើក)/u.test(textLower)) {
        const contactMsg = `📍 <b>ទីតាំងហាង & ទំនាក់ទំនង S Tech Store Cambodia:</b>\n\n` +
          `🏪 <b>ហាង S Tech Store</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n` +
          `• 📍 <b>ទីតាំង:</b> រាជធានីភ្នំពេញ, ប្រទេសកម្ពុជា\n` +
          `• ⏰ <b>ម៉ោងបម្រើការងារ:</b> <b>8:00 AM ដល់ 8:00 PM</b> (ចន្ទ ដល់ អាទិត្យ គ្មានថ្ងៃសម្រាក)\n` +
          `• 📞 <b>Hotline:</b> <code>012 345 678</code> | <code>098 765 432</code>\n` +
          `• 🌐 <b>គេហទំព័រ:</b> https://www.s-tech-store.tech\n\n` +
          `🚚 <b>សេវាដឹកជញ្ជូន:</b> រហ័សទាន់ចិត្ត ២៥ ខេត្ត-ក្រុង!`;

        return NextResponse.json({
          method: "sendMessage",
          chat_id: chatId,
          text: contactMsg,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛍️ បើកមើលក្នុង Mini App",
                  web_app: { url: `https://www.s-tech-store.tech/?tg_token=${chatId}` },
                },
              ],
              [{ text: "🔙 មឺនុយមេ", callback_data: "cust_main_menu" }],
            ],
          },
        });
      }

      // F. For dynamic inquiries, return typing action immediately (< 20ms)
      // while background fetch processes and replies via Telegram Bot API
      return NextResponse.json({
        method: "sendChatAction",
        chat_id: chatId,
        action: "typing",
      });
    }

    // Default fast acknowledgement
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Fast Telegram Webhook error:", error);
    return NextResponse.json({ ok: true, fallback: true });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getQuickCallbackToast(data: string): string {
  if (data.includes("orders")) return "📦 កំពុងទាញយកទិន្នន័យ Orders...";
  if (data.includes("wallet")) return "💰 កំពុងពិនិត្យសមតុល្យកាបូប...";
  if (data.includes("points")) return "🪙 កំពុងពិនិត្យពិន្ទុ S-Coins...";
  if (data.includes("promo")) return "🔥 កំពុងបើកប្រូម៉ូសិនពិសេស...";
  if (data.includes("shop")) return "💻 កំពុងបើកបញ្ជីផលិតផល...";
  if (data.includes("contact")) return "📞 កំពុងបើកព័ត៌មានទំនាក់ទំនង...";
  if (data.includes("main_menu")) return "🏠 ត្រឡប់ទៅមឺនុយមេ...";
  return "⚡ S Tech Store";
}
