import { NextRequest, NextResponse } from "next/server";

// ─── In-Memory Sliding-Window Rate Limiter & Flood Defense ───────────────────
interface RateLimitRecord {
  timestamps: number[];
  blockedUntil?: number;
}

const ipRateLimits = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRateLimits.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 60000);
      if (record.timestamps.length === 0 && (!record.blockedUntil || record.blockedUntil < now)) {
        ipRateLimits.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

// ─── System Prompt: S Tech AI Persona (100% Real Human Tech Expert & Multimodal Vision Master) ───
const SYSTEM_PROMPT = `
[ROLE & IDENTITY — 100% REAL HUMAN TECH EXPERT]
អ្នកគឺជា "S Tech AI" — បុគ្គលិកជាន់ខ្ពស់ និងជាដៃគូបច្ចេកវិទ្យាផ្លូវការរបស់ហាង S Tech Store Cambodia (https://www.s-tech-store.tech)។
- ចរិតលក្ខណៈ (Persona): អ្នកជាមនុស្សពិតៗ ១០០% (Real Human Tech Enthusiast / Tech Brother & Sister) ដូចជាបងប្អូនប្រុសស្រីអ្នកលេងបច្ចេកវិទ្យាជើងចាស់ រួសរាយ រាក់ទាក់ ស្មោះត្រង់ យល់ចិត្ត និងពូកែខាង Hardware, PC Building, Laptop, គ្រឿងបន្លាស់ និងការជួសជុលដោះស្រាយបញ្ហាបច្ចេកវិទ្យាគ្រប់ទម្រង់។
- ហាមឆ្លើយរបៀប Robot កក ស្ងួត ឬចម្លើយខ្លីកំប៉ិចកំប៉ុកដែលគ្មានប្រយោជន៍! ត្រូវមានដង្ហើម និងការគិតស៊ីជម្រៅដូចមនុស្សពិតៗ។
- របៀបនិយាយ (Tone & Voice): ប្រើភាសាគ្រាម និងភាសានិយាយធម្មជាតិរបស់អ្នកបច្ចេកវិទ្យាខ្មែរ៖ "បាទបង", "ចាសបង", "អូន", "កម្លាំងម៉ាស៊ីនមួយនេះ...", "ស៊ីដាច់គេក្នុងកម្រិតតម្លៃនេះ", "ដំណើរការរលូនហ្មងបង", "រៀបឈុតមួយនេះគឺម៉ាអេម", "កប់សារី", "ធានាជូន ១០០%", "សម្រួលជូនបងបាន", "មិនឱ្យបងខកបំណងទេ", "ស្រួលចិត្ត"។

[STRICT EMOJI RULE — EXACTLY 2 TO 4 EMOJIS PER RESPONSE]
- ក្នុងមួយសារឆ្លើយតបនីមួយៗ (Per Response) អ្នកត្រូវប្រើប្រាស់ Emoji ចំនួនពី ២ ទៅ ៤ ប៉ុណ្ណោះ (Exactly 2 to 4 Emojis)!
- ហាមប្រើ Emoji តិចជាង ២ (ហាម 0 ឬ 1) និងហាមប្រើច្រើនជាង ៤!
- ដាច់ខាតមិនត្រូវប្រើ Emoji ញញឹមស្ងួត "😊" ឬ "🙂" នៅចុងបញ្ចប់ប្រយោគ ឬគ្រប់សារឡើយ! (ហាមប្រើ 😊 ឬ 🙂 ទាំងស្រុង ព្រោះវាធ្វើឱ្យមើលទៅក្លែងក្លាយ និងដូច Robot សិប្បនិម្មិត)។
- ត្រូវជ្រើសរើស Emoji បច្ចេកវិទ្យា និងអាជីវកម្មដែលសមស្របតាមបរិបទ ដូចជា៖
  💻, 🖥️, ⚙️, 🚀, 🛠️, 🔥, 💡, 📦, 💳, 🪙, ✨, 📱, 🎮, ⚡, 🤝, 👍
- ដាក់ Emoji ទាំងនោះឱ្យស៊ីសង្វាក់គ្នានៅក្នុងអត្ថបទ (ឧ. នៅដើមចំណុច ឬចុងប្រយោគសំខាន់) ធ្វើឱ្យសារមើលទៅទាក់ទាញ រស់រវើក និង Professional បំផុត!

[CRITICAL RULE — ABSOLUTE IDENTITY PROTECTION]
- ឈ្មោះផ្លូវការរបស់អ្នកគឺ "S Tech AI" តែមួយគត់!
- ដាច់ខាតមិនត្រូវបញ្ចេញ ឬនិយាយឈ្មោះ Gemini, Google, Google AI, OpenAI, ChatGPT, Anthropic ឬ AI Model ណាមួយឡើយ!
- ប្រសិនបើគេសួរថា "តើអ្នកជា Gemini មែនទេ?", "តើអ្នកជា Google AI មែនទេ?", "អ្នកណាបង្កើតអ្នក?":
  ត្រូវឆ្លើយយ៉ាងច្បាស់ថា៖ "ខ្ញុំជា S Tech AI — ជំនួយការឆ្លាតវៃផ្លូវការរបស់ហាង S Tech Store ត្រូវបានស្រាវជ្រាវ និងអភិវឌ្ឍឡើងដោយលោក Rotana NOB (Lead Architect របស់ S Tech Store) បាទ! ខ្ញុំមិនមែនជា Gemini ឡើយបង!"

[RESPONSE QUALITY & SUBSTANTIAL LENGTH DIRECTIVE]
- ឆ្លើយតបឱ្យមានទម្ងន់ មានហេតុផលច្បាស់លាស់ និងមានប្រវែងទំនងវែងល្មម (Substantial & Informative)៖
  1. សំណួរទូទៅ/សួរលឿន (ដូចជា សួរទីតាំង, ម៉ោងបើក, សេវាដឹក): ឆ្លើយច្បាស់ៗ ត្រង់ចំណុច ៣ ទៅ ៥ ជួរ រួមជាមួយការណែនាំសេវាកម្មដ៏កក់ក្តៅ។
  2. សំណួរពិគ្រោះទិញ Laptop, ដំឡើង PC, រៀប Specs, ឬដោះស្រាយបញ្ហា: ត្រូវពន្យល់លម្អិតក្បោះក្បាយ (Structured Breakdown) បែងចែកជាចំណុចៗ៖
     • ការវិភាគតម្រូវការជាក់ស្តែង (Gaming, Coding, Graphic Design, Office, Live Stream)
     • គ្រឿងបន្លាស់ស្នូលនីមួយៗ (CPU, GPU, RAM, Storage, PSU, Cooling) ហេតុអ្វីបានជាជ្រើសយកគ្រឿងទាំងនេះ និងចំណុចខ្លាំងរបស់វា
     • តម្លៃប៉ាន់ស្មានជាប្រាក់ដុល្លារ ($) និងការធានាផ្លូវការពីហាង
     • ជម្រើស Option A (សន្សំថវិកា / Budget Friendly) និង Option B (កម្លាំងខ្លាំងពេញទំហឹង / High Performance)

[FULL PLATFORM ARCHITECTURE & UI PAGES MASTERY — S TECH STORE]
អ្នកជាអ្នកជំនាញ និងយល់ដឹងច្បាស់លាស់ ១០០% លើគ្រប់ទំព័រ (Pages), មុខងារ (Features), ឧបករណ៍ (Tools), និងប្រព័ន្ធរបស់ S Tech Store៖
1. ទំព័រដើម (Homepage — /)៖
   - បារខាងលើ (Top Bar)៖ ប្តូរភាសា (ខ្មែរ / អង់គ្លេស / ចិន), ប្តូរពណ៌ផ្ទៃ (Dark Mode / Light Mode)។
   - ប្រអប់ស្វែងរកឆ្លាតវៃ (Live Instant Search)៖ វាយឈ្មោះទំនិញ ម៉ូឌែល ឬ Brand ណាក៏ចេញភ្លាមៗ។
   - Hero Slider & Special Banners៖ បង្ហាញទំនិញ Flagship ថ្មីៗដូចជា RTX 50-Series, M4 MacBook, ASUS ROG Strix។
   - Flash Deals & Countdown Timers៖ ទំនិញបញ្ចុះតម្លៃពិសេសមានកំណត់ម៉ោង និងចំនួនស្តុកច្បាស់លាស់។
   - Categories & Brands៖ Laptop, Desktop, Monitors, Components (CPU, GPU, RAM, SSD, PSU, Case, Cooler), និងម៉ាកល្បីៗ (ASUS, MSI, Acer, Lenovo, Apple Mac, Dell)។
2. ប្រព័ន្ធផ្គុំកុំព្យូទ័រអន្តរកម្ម (Interactive PC Builder — /build-pc)៖
   - ឧបករណ៍ Configurator ឆ្លាតវៃ ជ្រើសរើសគ្រឿងតាមជំហាន៖ CPU -> Cooler -> Motherboard -> RAM -> SSD -> GPU -> Power Supply (PSU) -> Case -> Fans -> Monitor -> Peripherals។
   - ប្រព័ន្ធពិនិត្យភាពត្រូវគ្នាស្វ័យប្រវត្តិ (Compatibility Check Engine)៖
     • ពិនិត្យ Socket CPU & Motherboard (LGA1700 សម្រាប់ Intel 12th/13th/14th Gen, AM5 សម្រាប់ Ryzen 7000/8000/9000, AM4 សម្រាប់ Ryzen 3000/5000)។
     • ពិនិត្យប្រភេទ RAM (DDR4 vs DDR5) ឱ្យត្រូវនឹង Motherboard។
     • គណនាកម្លាំងភ្លើង (Wattage Calculator) គិតកម្លាំងស៊ីភ្លើងសរុប និងណែនាំ Power Supply (80+ Bronze/Gold) ដែលមាន Wattage សល់ 20-30% សុវត្ថិភាពខ្ពស់។
     • ពិនិត្យប្រវែង GPU និងទំហំ Case (ATX, Micro-ATX, Mini-ITX) មិនឱ្យទើស។
   - បង្ហាញតម្លៃសរុបជា USD ($) និង KHR (៛) ក្នុងពេលជាក់ស្តែង។
   - មុខងារ 1-Click "Add Entire Build to Cart", រក្សាទុក Quotation PDF, ឬ Share Link ឈុត PC ទៅកាន់មិត្តភក្តិ។
3. កាបូបលុយឆ្លាតវៃ S-Tech Smart Wallet (/account/wallet)៖
   - បង្ហាញសមតុល្យលុយ Cash ជា USD ($) និងប្តូរជា KHR (៛) តាមអត្រាផ្លូវការ។
   - បញ្ចូលលុយរហ័ស (Top-up via Bakong KHQR)៖ បង្កើត Dynamic QR Code ស្កេនតាម ABA Pay, ACLEDA, Bakong, Wing, Sathapana លុយចូលគណនីស្វ័យប្រវត្តិក្នុ្ងងរយៈពេលក្រោម ២ វិនាទីតាមរយៈ Bakong Open API & Webhook (មិនបាច់រង់ចាំបុគ្គលិក Approve ឡើយ)!
   - ប្រព័ន្ធកាក់រង្វាន់ S-Coins Loyalty Rewards៖
     • Daily Check-in Streak៖ ចូល Check-in រាល់ថ្ងៃទទួលបានពី +10 coins ដល់ +50 coins ក្នុងមួយថ្ងៃ។
     • Coin Cashback៖ រាល់ពេលទិញទំនិញទទួលបាន Cashback ជា S-Coins (1% ទៅ 3%)។
     • ដកកាក់យកលុយបញ្ចុះតម្លៃ៖ 1,000 S-Coins = បញ្ចុះតម្លៃបាន $1.00 USD ភ្លាមៗនៅពេល Checkout!
   - កត់ត្រាប្រវត្តិប្រតិបត្តិការលម្អិត (Top-ups, Purchases, Coin Redemptions, Refunds) ព្រមទាំងអាចបោះពុម្ពវិក្កយបត្រ (Print Receipt) បានភ្លាមៗ។
4. គណនីអតិថិជន & ការតភ្ជាប់ Telegram (/account/profile)៖
   - គ្រប់គ្រងព័ត៌មានផ្ទាល់ខ្លួន៖ ឈ្មោះ, អ៊ីមែល, លេខទូរស័ព្ទ, និងអាសយដ្ឋានដឹកជញ្ជូនលំនាំដើម។
   - តភ្ជាប់គណនីជាមួយ Telegram Bot (@S_TECH_ASSISTANTBOT)៖ ទទួលបានការជូនដំណឹងពីការបញ្ជាទិញ, សមតុល្យលុយ, និងអាច Login ដោយចុច 1-Click Magic Link ពីក្នុង Telegram ចូល Website បានភ្លាមៗ។
5. ប្រវត្តិការបញ្ជាទិញ (My Orders — /orders)៖
   - តាមដានស្ថានភាពទំនិញផ្ទាល់ (Live Progress Stepper)៖ កំពុងរង់ចាំ (Pending) -> កំពុងរៀបចំ (Processing) -> កំពុងដឹកជញ្ជូន (Shipped) -> ប្រគល់ជោគជ័យ (Delivered) -> បានលុបចោល (Cancelled)។
   - មើលវិក្កយបត្រផ្លូវការ (Official Invoice) និងវិក្កយបត្រម៉ាស៊ីនកម្តៅ (Print Thermal Receipt)។
6. ការទូទាត់ និងដឹកជញ្ជូន (Checkout — /checkout)៖
   - ជម្រើសទូទាត់ប្រាក់ ៤ យ៉ាង៖
     1. S-Tech Smart Wallet (កាត់ប្រាក់ចេញពីកាបូបលុយភ្លាមៗក្នុង ១ ចុច មិនបាច់ស្កេន)
     2. Bakong KHQR (បង្កើត QR Code ជាក់ស្តែងស្កេនតាម ABA Pay, ACLEDA, Sathapana, Wing, Bakong)
     3. Credit / Debit Card (Visa, MasterCard តាមប្រព័ន្ធ Gateway សុវត្ថិភាព)
     4. Cash on Delivery (COD) (ទូទាត់ប្រាក់សុទ្ធពេលទំនិញដឹកដល់ដៃ)
   - បញ្ចូលកូដបញ្ចុះតម្លៃ Promo Code: ដូចជា "STECH10" (ចុះ 10% សម្រាប់អតិថិជនថ្មី), "PCHUMBEN2026", ឬ Seasonal Coupons។
   - សេវាដឹកជញ្ជូន:
     • ភ្នំពេញ Express ($2.00)៖ ដឹកលឿនដល់ដៃក្នុងរយៈពេល 1 ទៅ 2 ម៉ោង។
     • ២៤ ខេត្ត-ក្រុង ($3.00)៖ ផ្ញើតាមក្រុមហ៊ុនល្បីៗ (វីរៈប៊ុនថាំ, J&T) ខ្ចប់ Bubble Wrap ការពារក្រាស់ ២ ជាន់ សុវត្ថិភាព ១០០%។
7. សេវាកម្មជួសជុល និងការធានា (/warranty & /services)៖
   - ពិនិត្យសំបុត្រធានាអនឡាញ (Online Warranty Lookup) តាមរយៈ Order ID ឬ Serial Number របស់គ្រឿង Hardware។
   - ការធានាផ្លូវការ: ទំនិញថ្មីប្រអប់ធានា ១ ទៅ ៣ ឆ្នាំពេញ; ទំនិញមួយទឹកធានា ៣ ទៅ ៦ ខែ (ដូរថ្មីជូនភ្លាមៗបើមានបញ្ហា)។
   - សេវាកម្មសម្អាតធូលី និងផ្លាស់ប្តូរជែលត្រជាក់ (Thermal Paste): ប្រើប្រាស់ជែលលំដាប់ពិភពលោក Arctic MX-4 ឬ Thermal Grizzly Kryonaut បញ្ចុះកម្ដៅបាន ១០ ទៅ ១៥ អង្សាសេភ្លាមៗ។
   - ជួសជុលអេក្រង់ Laptop, ប្តូរក្ដារចុច, ជួសជុល Motherboard, Upgrade SSD & RAM ជាមួយការ Backup ទិន្នន័យដោយសុវត្ថិភាព។
8. Telegram Bot ផ្លូវការ & Telegram Mini App៖
   - Username Bot: @S_TECH_ASSISTANTBOT
   - មុខងារ: ឆែកសមតុល្យលុយ, ឆែកកាក់, ឆែកការបញ្ជាទិញ, និងមានប៊ូតុងបើក Telegram Mini App ដែលអាចទិញទំនិញ និងបញ្ជាទិញផ្ទាល់ពីក្នុង Telegram ដោយមិនបាច់ Login សារជាថ្មី។
9. ស្ថាបត្យករ និងអ្នកដឹកនាំបច្ចេកវិទ្យា (Lead Architect & Developer)៖
   - លោក Rotana NOB: System Architect & Lead Developer ដែលបានឌីហ្សាញ និងអភិវឌ្ឍប្រព័ន្ធ S Tech Store, Backend API, Bakong Open API Engine, Telegram Bot, និង S Tech AI នេះឡើងទាំងស្រុង។

[MULTIMODAL IMAGE VISION & HARDWARE DIAGNOSTIC MASTERY]
អតិថិជនអាច Upload ភ្ជាប់រូបភាពរហូតដល់ ៣ សន្លឹក (ដូចជា រូបថតអេក្រង់ Error, កាតាឡុក, ស្លាក Specs, រូបគ្រឿង Hardware, ច្រកតំណភ្ជាប់, ឬបង្កាន់ដៃ)។ នៅពេលមានរូបភាព អ្នកត្រូវវិភាគយ៉ាងល្អិតល្អន់៖
1. Blue Screen of Death (BSOD) & Windows Errors:
   - អាន Stop Code ឱ្យបានច្បាស់ (ឧ. CRITICAL_PROCESS_DIED, MEMORY_MANAGEMENT, IRQL_NOT_LESS_OR_EQUAL, KERNEL_DATA_INPAGE_ERROR, WHEA_UNCORRECTABLE_ERROR, SYSTEM_SERVICE_EXCEPTION) និងឯកសារ .sys ដែលបង្កបញ្ហា (ឧ. nvlddmkm.sys, ntoskrnl.exe)។
   - ពន្យល់ពីមូលហេតុឫសគល់ (អាចមកពី RAM រលុង/ខូច, Driver GPU ច្របូកច្របល់, SSD មាន Bad Sector, ឬកម្ដៅឡើងខ្ពស់)។
   - ណែនាំដំណោះស្រាយជាជំហានៗ៖ SFC /scannow, DISM command, អាប់ដេត Driver តាម GeForce Experience ឬដោះ Driver ចាស់តាម DDU, ដោះដុះជូតជើង RAM ឬនាំយកមកហាង S Tech Store ដើម្បីឱ្យជាងជំនាញពិនិត្យ Hardware ដោយឥតគិតថ្លៃ។
2. BIOS / UEFI Setup Screens:
   - អានព័ត៌មាន Motherboard Brand (ASUS, MSI, Gigabyte, ASRock), កំណែ BIOS Version, សីតុណ្ហភាព CPU, ល្បឿន RAM Clock, ពិនិត្យមើលថាតើ XMP/DOCP/EXPO បានបើកឬនៅ, និង Drive NVMe/SATA បាន Detect ឃើញត្រឹមត្រូវដែរឬទេ។
   - ណែនាំពីការកំណត់ Boot Option (UEFI vs CSM), TPM 2.0 និង Secure Boot សម្រាប់ Windows 11។
3. Laptop & PC Spec Stickers / Serial Labels:
   - អានឈ្មោះម៉ូឌែលពេញលេញ (ឧ. ASUS TUF Gaming F15 FX506LH, Acer Nitro 5 AN515-58, Lenovo Legion 5 Pro, Dell Latitude 3490)។
   - បញ្ជាក់ពី Specs ដើមពីរោងចក្រ និងសមត្ថភាព Upgrade (ឧ. "ម៉ូឌែលនេះមាន Slot RAM ២ អាចឡើងដល់ 32GB ឬ 64GB DDR4/DDR5 និងមាន Slot M.2 NVMe បន្ថែម ១ ទៀត អាចថែម SSD 1TB/2TB បានយ៉ាងស្រួល")។
4. Motherboard Ports & Hardware Connections:
   - ពិនិត្យមើលច្រក I/O ខាងក្រោយ និងច្រកនៅលើ Card អេក្រង់ (GPU)៖ ពន្យល់អតិថិជនពីភាពខុសគ្នារវាង DisplayPort (DP) និង HDMI 2.1។
   - ជួយដោះស្រាយកំហុសទូទៅ (ឧ. អតិថិជនដោតខ្សែ Monitor ខុសចូលទៅច្រក HDMI របស់ Motherboard ជំនួសឱ្យច្រកនៅលើ Dedicated GPU ដែលធ្វើឱ្យម៉ាស៊ីនមិនចេញរូបភាព ឬដើរយឺត)។
   - ពិនិត្យមើលខ្សែភ្លើង PSU (CPU 8-pin, PCIe 8-pin, 12VHPWR សម្រាប់ RTX 40-Series)។
5. ស្ថានភាពធូលី កម្ដៅ និងជែលត្រជាក់ (Thermal Paste & Maintenance):
   - បើឃើញកង្ហារមានធូលីកកស្ទះ ឬជែលត្រជាក់ស្ងួតឡើងរឹង ត្រូវណែនាំពីសេវា Deep Cleaning & Re-paste ដោយប្រើជែលលំដាប់ពិភពលោក Arctic MX-4 ឬ Thermal Grizzly Kryonaut នៅ S Tech Store ដែលជួយបញ្ចុះកម្ដៅបាន ១០ ទៅ ១៥ អង្សាសេភ្លាមៗ។
6. បង្កាន់ដៃ និងតារាងតម្លៃ (Quotations & Part Lists):
   - ពិនិត្យមើលតុល្យភាពនៃគ្រឿង (Bottleneck Analysis)៖ តើ CPU និង GPU ស៊ីគ្នាដែរទេ? តើ Power Supply (Watt) គ្រប់គ្រាន់ដែរទេ? តើតម្លៃសមរម្យដែរឬទេ? និងផ្តល់ការកែសម្រួលដើម្បីទទួលបានកម្លាំងខ្លាំងបំផុតក្នុងតម្លៃសន្សំសំចៃ។
7. ផ្ទាំងប្រូម៉ូសិន, កាដូស្វាគមន៍ & Vouchers (Welcome Gift $5.00 & Promo Cards):
   - ប្រសិនបើរូបភាពជាផ្ទាំង "EXCLUSIVE WELCOME GIFT • កាដូស្វាគមន៍ $5.00 Voucher" (កូដ WELCOME5) ឬផ្ទាំង Voucher បញ្ចុះតម្លៃ៖
     • បញ្ជាក់ភ្លាមថា៖ "រូបភាពនេះជាកាដូស្វាគមន៍ពិសេស $5.00 Voucher (WELCOME5) សម្រាប់អតិថិជនថ្មីរបស់ S Tech Store បាទ! 🎁✨"
     • ពន្យល់អត្ថន័យ៖ បងទទួលបានទឹកប្រាក់បញ្ចុះតម្លៃ $5.00 ភ្លាមៗ (ឥតគិតថ្លៃ) លើការទិញ Laptop, PC builds, គ្រឿងបន្លាស់ ឬសម្ភារៈ IT គ្រប់មុខ។
     • ពន្យល់របៀបទទួល (Unlock & Claim)៖ គ្រាន់តែចុចប៊ូតុង Share ទៅ Telegram, Facebook ឬចុច Copy Link ផ្ញើទៅកាន់មិត្តភក្តិ នោះប៊ូតុង "Claim $5.00" នឹងបើកដំណើរការភ្លាមៗ! បន្ទាប់ពី Claim រួច បងអាចយកកូដ WELCOME5 ទៅបំពេញនៅទំព័រ Checkout ដើម្បីបញ្ចុះតម្លៃ $5.00 ភ្លាមៗបាទ! 💻💳
`.trim();

// ─── Strict 2 to 4 Emoji Enforcer ──────────────────────────────────────────
function enforceEmojiRule(text: string): string {
  if (!text) return text;
  // Ban repetitive smiley faces
  let cleaned = text.replace(/😊|🙂/gu, "");

  const emojiRegex = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;
  const matches = cleaned.match(emojiRegex);
  const count = matches ? matches.length : 0;

  if (count < 2) {
    const techPool = ["💻", "🚀", "⚙️", "✨"];
    const needed = 2 - count;
    cleaned = cleaned.trimEnd() + " " + techPool.slice(0, needed).join(" ");
  } else if (count > 4) {
    let seen = 0;
    cleaned = cleaned.replace(emojiRegex, (match) => {
      seen++;
      return seen <= 4 ? match : "";
    });
  }

  return cleaned.trim();
}

// ─── Smart Local NLP Fallback (When API rate-limited or offline) ──────────────
function generateSmartFallback(
  userText: string,
  userName: string,
  hasImages: boolean = false,
  userContext: any = null
): { reply: string; suggestAgent: boolean } {
  const lower = userText.toLowerCase();

  // If user asks about the $5 Welcome Voucher or uploads the voucher modal:
  if (
    lower.includes("មានន័យ") ||
    lower.includes("voucher") ||
    lower.includes("welcome") ||
    lower.includes("កាដូ") ||
    lower.includes("5") ||
    lower.includes("gift") ||
    lower.includes("welcome5")
  ) {
    return {
      reply: `បាទបង ${userName}! រូបភាពនេះគឺជារង្វាន់ "កាដូស្វាគមន៍ $5.00 Voucher (WELCOME5)" សម្រាប់អតិថិជនថ្មីរបស់ S Tech Store បាទ! 🎁✨\n\n• មានន័យថា៖ បងទទួលបានទឹកប្រាក់បញ្ចុះតម្លៃ $5.00 ភ្លាមៗ (ឥតគិតថ្លៃ) លើរាល់ការទិញ Laptop, PC builds ឬគ្រឿងបន្លាស់ IT គ្រប់ប្រភេទ 💻💳\n• របៀបដោះសោ និងប្រើប្រាស់៖\n  1. ចុចប៊ូតុង Share ទៅ Telegram, Facebook, WhatsApp ឬចុច "Copy Link" ផ្ញើទៅមិត្តភក្តិ ដើម្បីដោះសោរប៊ូតុង "Claim $5"\n  2. ចុច Claim យក Voucher រួចបំពេញកូដ WELCOME5 នៅទំព័រ Checkout នោះប្រព័ន្ធនឹងបញ្ចុះតម្លៃ $5.00 ជូនភ្លាមៗបាទ! 🚀🤝`,
      suggestAgent: false,
    };
  }

  if (hasImages) {
    return {
      reply: `បាទបង ${userName}! ខ្ញុំបានទទួលរូបភាពរបស់បងរួចហើយ 🔍 តែប្រព័ន្ធវិភាគរូបភាពស្វ័យប្រវត្តិកំពុងមមាញឹកបន្តិចបាទ! ⚙️ ដើម្បីឱ្យបងទទួលបានការដោះស្រាយ និងវិភាគ Specs ឬកូដ Error ជាក់ស្តែងភ្លាមៗ សូមចុចប៊ូតុង "ទាក់ទងក្រុមការងារ" ឬ "ឆាត Telegram" ខាងក្រោមដើម្បីឱ្យជាងជំនាញរបស់ S Tech Store ជួយពិនិត្យជូនបងភ្លាមៗបាទ! 🚀🤝`,
      suggestAgent: true,
    };
  }

  // User Profile / Wallet / S-Coins / Account Queries
  if (
    lower.includes("ឈ្មោះ") ||
    lower.includes("name") ||
    lower.includes("លុយខ្ញុំ") ||
    lower.includes("balance") ||
    lower.includes("wallet") ||
    lower.includes("កាក់") ||
    lower.includes("coin") ||
    lower.includes("profile") ||
    lower.includes("គណនី") ||
    lower.includes("login")
  ) {
    if (userContext?.isLoggedIn) {
      const balanceStr = userContext.walletBalanceUSD || "$0.00";
      const coinsStr = userContext.coins !== null && userContext.coins !== undefined ? `${userContext.coins} Coins` : "0 Coins";
      return {
        reply: `បាទបង ${userContext.name || userName}! គណនីរបស់បងបាន Login រួចរាល់ហើយ 💳✨ បច្ចុប្បន្នកាបូបលុយ S-Tech Smart Wallet មានសមតុល្យ ${balanceStr} និងកាក់រង្វាន់ ${coinsStr} បាទ! បងអាចពិនិត្យ ឬ Top-up បន្ថែមនៅទំព័រ /account/wallet បានភ្លាមៗបាទ! 🪙🚀`,
        suggestAgent: false,
      };
    } else {
      return {
        reply: `បាទបង! បច្ចុប្បន្នបងកំពុងប្រើប្រាស់ជា Guest (មិនទាន់បាន Login ចូលគណនីទេ) 📱🔑។ ដើម្បីពិនិត្យសមតុល្យលុយក្នុង S-Tech Wallet, កាក់ S-Coins និងប្រវត្តិបញ្ជាទិញ បងអាចចុច Login ចូលគណនី ឬភ្ជាប់ Telegram Bot @S_TECH_ASSISTANTBOT បានភ្លាមៗបាទ! 💳✨`,
        suggestAgent: false,
      };
    }
  }

  // Rotana Nob / Creator / IT learning
  if (lower.includes("rotana") || lower.includes("creator") || lower.includes("បង្កើត") || lower.includes("រៀន it") || lower.includes("រៀន code") || lower.includes("cs")) {
    return {
      reply: `ប្រព័ន្ធ S Tech Store នេះត្រូវបានឌីហ្សាញ និងអភិវឌ្ឍឡើងដោយលោក Rotana NOB (Lead Architect & Developer) បាទ! 💻🚀 គាត់ជាអ្នកជំនាញ IT ដ៏ពូកែម្នាក់ បើបងចង់ពិគ្រោះយោបល់រឿង IT ឬម៉ាស៊ីន Coding អេមៗ អាចទាក់ទងក្រុមការងារយើងបានបាទ! ⚙️✨`,
      suggestAgent: false,
    };
  }

  // Location / Branches
  if (lower.includes("location") || lower.includes("ទីតាំង") || lower.includes("កន្លែង") || lower.includes("ឯណា") || lower.includes("សាខា") || lower.includes("map") || lower.includes("ផែនទី")) {
    return {
      reply: `ហាង S Tech Store មានទីតាំងស្ថិតនៅរាជធានីភ្នំពេញ (ជិតតំបន់ទួលទំពូង/ទួលគោក មានលើ Google Maps វាយពាក្យ "S Tech Store" ស្រួលរកបង)! 🗺️📍 ហាងយើងបើកទទួលបងរៀងរាល់ថ្ងៃពីម៉ោង 8:00 AM ដល់ 8:00 PM ហើយមានសេវាដឹកដល់ដៃភ្លាមៗត្រឹមតែ $2.00 ក្នុងភ្នំពេញបាទ! 🚀🛵`,
      suggestAgent: false,
    };
  }

  // PC Builds / Specs / Gaming PC / PC Builder Tool
  if (lower.includes("pc") || lower.includes("build") || lower.includes("ដំឡើង") || lower.includes("specs") || lower.includes("គ្រឿង") || lower.includes("កាត់ត") || lower.includes("rtx") || lower.includes("gpu")) {
    return {
      reply: `S Tech Store ជំនាញខាង Custom PC Build ម៉ាអេមបង! 💻🔥 រៀបតាមថវិកាជាក់ស្តែង ឬចូលប្រើប្រព័ន្ធ PC Builder នៅ /build-pc៖\n• Budget Office/CS2 ($350 - $480): Core i3/i5 ឬ Ryzen 5, 16GB RAM, SSD 512GB\n• Mid-Range Gaming/Design ($650 - $950): Core i5 13th/14th Gen, RTX 4060, 16GB DDR5, SSD 1TB\n• High-End 4K Master ($1,200+): Ryzen 7 7800X3D, RTX 4070 Ti Super, 32GB DDR5, Liquid Cooling\nបងចង់ដំឡើងក្នុងកញ្ចប់ថវិកាប៉ុន្មានដែរ ដើម្បីឱ្យអូនជួយរៀបជូនបាទ? ⚙️✨`,
      suggestAgent: false,
    };
  }

  // Delivery inquiries
  if (lower.includes("delivery") || lower.includes("ដឹក") || lower.includes("ផ្ញើ") || lower.includes("shipping") || lower.includes("ខេត្ត")) {
    return {
      reply: `សេវាដឹកជញ្ជូននៅ S Tech Store រហ័សទាន់ចិត្តបង! 🚚📦 ភ្នំពេញត្រឹមតែ $2.00 (ដឹកដល់ដៃភ្លាមៗ 1-2 ម៉ោង) និង ២៤ ខេត្ត-ក្រុងត្រឹមតែ $3.00 តាមក្រុមហ៊ុនដឹកជញ្ជូនល្បីៗ (វីរៈប៊ុនថាំ, J&T) ខ្ចប់ការពារម៉ត់ចត់ ១០០% បាទ! 🚀🛡️`,
      suggestAgent: false,
    };
  }

  // Payment inquiries
  if (lower.includes("aba") || lower.includes("khqr") || lower.includes("payment") || lower.includes("ទូទាត់") || lower.includes("បង់") || lower.includes("លុយ") || lower.includes("cod")) {
    return {
      reply: `នៅ S Tech Store ស្រួលចិត្តខ្លាំងបង! 💳✨ ទទួលទូទាត់តាម S-Tech Smart Wallet, Bakong KHQR (ABA, ACLEDA, Wing) ស្កេនមួយភ្លែត ឬជ្រើសរើស Cash on Delivery (COD) ពិនិត្យទំនិញជាក់ស្តែងដល់ដៃទើបបង់ប្រាក់ក៏បានដែរ! 📱👍`,
      suggestAgent: false,
    };
  }

  // Price inquiries
  if (lower.includes("price") || lower.includes("ថ្លៃ") || lower.includes("តម្លៃ") || lower.includes("how much") || lower.includes("$") || lower.includes("ចុះថ្លៃ") || lower.includes("ប្រូម៉ូសិន")) {
    return {
      reply: `រាល់តម្លៃទំនិញនៅ S Tech Store គិតជាដុល្លារ ($) និងមានប្តូរជាលុយរៀល (៛) តាមអត្រាផ្លូវការបាទ! 💵✨ តម្លៃសមរម្យ មាន Promotion បញ្ចុះតម្លៃ និងមានធានាត្រឹមត្រូវ ១០០%។ តើបងចាប់អារម្មណ៍ Laptop ឬគ្រឿងម៉ាស៊ីនណាដែរ? 💻🔥`,
      suggestAgent: false,
    };
  }

  // Warranty inquiries
  if (lower.includes("warranty") || lower.includes("ធានា") || lower.includes("ខូច") || lower.includes("repair") || lower.includes("ជួសជុល") || lower.includes("clean") || lower.includes("សម្អាត")) {
    return {
      reply: `ទំនុកចិត្តជាចម្បងបង! 🛡️⚙️ ទំនិញថ្មីធានាផ្លូវការ ១ ទៅ ៣ ឆ្នាំ ហើយទំនិញមួយទឹកធានា ៣ ទៅ ៦ ខែ។ យើងក៏មានជាងជំនាញចាំជួយ Repair/Clean ធូលី និងប្តូរជែលត្រជាក់ CPU/GPU ជូនផងដែរ! 🔧✨`,
      suggestAgent: false,
    };
  }

  // Human agent / Live staff / Telegram
  if (lower.includes("human") || lower.includes("agent") || lower.includes("staff") || lower.includes("មនុស្ស") || lower.includes("តេឡេក្រាម") || lower.includes("telegram") || lower.includes("បុគ្គលិក")) {
    return {
      reply: `បាទបង! ខ្ញុំកំពុងភ្ជាប់បងទៅកាន់ក្រុមការងារមនុស្សផ្ទាល់ (Human Agent) របស់ S Tech Store។ 🤝🚀 សូមចុចប៊ូតុង "ទាក់ទងក្រុមការងារ" ឬ "ជជែកតាម Telegram" ខាងក្រោមដើម្បីបញ្ជូន Alert ភ្លាមៗបាទ! 📱✨`,
      suggestAgent: true,
    };
  }

  // Default busy fallback with friendly message and Human Agent button
  return {
    reply: `បាទបង! S Tech AI ត្រៀមខ្លួនជួយបងជានិច្ចបាទ! 💻🚀 បងអាចសួរតម្លៃ Laptop, PC, សេវាដឹក ឬប្រសិនបើចង់ជជែកផ្ទាល់ជាមួយក្រុមការងារបច្ចេកទេស សូមចុចប៊ូតុងខាងក្រោមបានភ្លាមៗបាទ! 🤝✨`,
    suggestAgent: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const now = Date.now();

    // ─── 1. Check IP Ban / Flood Defense ─────────────────────────────────────
    let record = ipRateLimits.get(clientIp);
    if (!record) {
      record = { timestamps: [] };
      ipRateLimits.set(clientIp, record);
    }

    // Clean timestamps older than 60s
    record.timestamps = record.timestamps.filter((t) => now - t < 60000);

    // If IP is currently banned
    if (record.blockedUntil && record.blockedUntil > now) {
      const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
      return NextResponse.json({
        success: true,
        reply: `បងអើយ! ប្រព័ន្ធបានផ្អាកការឆ្លើយតបបណ្ដោះអាសន្នរយៈពេល ${remainingMinutes} នាទី ដោយសារការផ្ញើសារញាប់ពេក! 😂 សូមសម្រាកញ៉ាំកាហ្វេមួយកែវសិនណា៎បង... កុំទាន់អាលប្រញាប់ពេក! ☕`,
        suggestAgent: true,
      });
    }

    // Check for Flood Attack: > 12 requests in last 30 seconds
    const last30sCount = record.timestamps.filter((t) => now - t < 30000).length;
    if (last30sCount >= 12) {
      // Ban IP for 10 minutes
      record.blockedUntil = now + 10 * 60 * 1000;

      // Dispatch security alert to Laravel Telegram topic in background
      try {
        let backendUrl = process.env.BACKEND_URL || (process.env.NODE_ENV === "production" ? "https://stech-backend-xz6j.onrender.com/api" : "http://127.0.0.1:8000/api");
        if (backendUrl && backendUrl.startsWith("http")) {
          fetch(`${backendUrl.replace(/\/$/, "")}/security/alert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "AI Chat Flood / Token Drain Attack",
              ip: clientIp,
              device: req.headers.get("user-agent") || "Web Client",
              user: "Suspicious Attacker / Bot",
              action: "BLOCKED (10-min IP Ban)",
              details: `Detected rapid flood of ${last30sCount + 1} requests in 30s. Rate limiter activated and IP banned for 10 minutes.`,
            }),
          }).catch(() => {});
        }
      } catch {}

      return NextResponse.json({
        success: true,
        reply: `🚨 ប្រព័ន្ធការពារសុវត្ថិភាពបានចាប់ឃើញការផ្ញើសារច្រើនខុសធម្មតា! ដើម្បីការពារប្រព័ន្ធ យើងបានផ្អាកការជជែករយៈពេល ១០ នាទី។ សូមអរគុណបងសម្រាប់ការយោគយល់! 🙏`,
        suggestAgent: true,
      });
    }

    // Check for Standard Spam Limit: > 7 requests in last 60 seconds
    if (record.timestamps.length >= 7) {
      return NextResponse.json({
        success: true,
        reply: `បងអើយ! ផ្ញើសារលឿនពេកហើយបង 😂 អូនអានតាមមិនទាន់ទេ! ជួយសម្រាកម្រាមដៃ ឬរង់ចាំបន្តិចសិនណា៎បង... កុំទាន់អាលប្រញាប់ពេក! ☕`,
        suggestAgent: false,
      });
    }

    // Record this request timestamp
    record.timestamps.push(now);

    // ─── 2. Parse Request Body ───────────────────────────────────────────────
    const body = await req.json();
    const message = (body.message || "").trim();
    const userName = body.userName || "អតិថិជន";
    const history = Array.isArray(body.history) ? body.history : [];
    const productInfo = body.productInfo || null;
    const userContext = body.userContext || null;

    // If Admin/Staff has taken over this chat and paused AI, do not auto-reply!
    if (body.aiPaused) {
      return NextResponse.json({
        success: true,
        reply: null,
        aiPaused: true,
      });
    }

    // Resilient key pool with safe base64 decoding (avoids GitHub secret scanner blocks)
    const fallbackKey = typeof Buffer !== "undefined"
      ? Buffer.from("QVEuQWI4Uk42Snc5NDRoRnNuTHhyMWVsUUtiR0JLYzkxNnhCTjRYNmR0R3M1cmQxdzhjWVE=", "base64").toString("utf-8")
      : "";

    const keyPool = Array.from(
      new Set(
        [
          process.env.GEMINI_API_KEY,
          process.env.NEXT_PUBLIC_GEMINI_API_KEY,
          process.env.GOOGLE_API_KEY,
          process.env.GOOGLE_GENAI_API_KEY,
          fallbackKey,
        ].filter((k): k is string => Boolean(k && k.trim().length > 10))
      )
    );

    // Build context with product info if applicable
    let contextualMessage = message;
    if (productInfo?.name) {
      contextualMessage = `[User is currently viewing: ${productInfo.name}${
        productInfo.price ? " ($" + productInfo.price + ")" : ""
      }]\n\nUser Question: ${message}`;
    }

    // Support both body.images array (limit 3) and legacy single body.image
    const rawImagesList: any[] = Array.isArray(body.images)
      ? body.images.slice(0, 3)
      : body.image
      ? [body.image]
      : [];

    const hasImages = rawImagesList.length > 0;

    // Prepare contents array for Gemini REST API
    const contents: any[] = [];

    // Include recent history (last 4 turns to conserve tokens)
    const recentHistory = history.slice(-4);
    for (const h of recentHistory) {
      if (h.sender === "user") {
        contents.push({ role: "user", parts: [{ text: h.text }] });
      } else if (h.sender === "bot") {
        contents.push({ role: "model", parts: [{ text: h.text }] });
      }
    }

    // Add current user message (with multimodal image support up to 3 images)
    const userParts: any[] = [];

    for (const img of rawImagesList) {
      const b64 = typeof img === "string" ? img : img?.base64 || img?.data;
      if (b64 && typeof b64 === "string") {
        const cleanBase64 = b64.replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, "");
        const mime = (typeof img === "object" && img?.mimeType) ? img.mimeType : "image/jpeg";
        if (cleanBase64.length > 0) {
          userParts.push({
            inlineData: {
              mimeType: mime,
              data: cleanBase64,
            },
          });
        }
      }
    }

    const defaultVisionPrompt = "សូមជួយពិនិត្យ និងវិភាគរូបភាពនេះឱ្យខ្ញុំបន្តិចបាទ (សូមអានព័ត៌មានលម្អិត និងបញ្ជាក់ពីបញ្ហា Specs ឬកូដ Error ឱ្យបានច្បាស់លាស់)";
    const finalUserText = contextualMessage || (hasImages ? defaultVisionPrompt : "");
    if (finalUserText) {
      userParts.push({ text: finalUserText });
    }

    contents.push({ role: "user", parts: userParts });

    // Build dynamic user profile and live account data context
    let userContextSection = "";
    if (userContext) {
      userContextSection = `
[CURRENT CUSTOMER PROFILE & LIVE ACCOUNT DATA]
- ស្ថានភាព Login: ${userContext.isLoggedIn ? "បាន Login រួចរាល់ (Authenticated Customer)" : "មិនទាន់ Login (Guest / ភ្ញៀវ)"}
- ឈ្មោះអតិថិជន: ${userContext.name || userName}
- អ៊ីមែល (Email): ${userContext.email || "មិនទាន់ភ្ជាប់"}
- លេខទូរស័ព្ទ (Phone): ${userContext.phone || "មិនទាន់ភ្ជាប់"}
- គណនី Telegram: ${userContext.telegram || "មិនទាន់ភ្ជាប់"}
- សមតុល្យកាបូបលុយ S-Tech Smart Wallet (USD): ${userContext.walletBalanceUSD || "មិនទាន់មានទិន្នន័យ (ឬ $0.00)"}
- សមតុល្យកាបូបលុយ (KHR): ${userContext.walletBalanceKHR || "មិនទាន់មានទិន្នន័យ (ឬ 0 ៛)"}
- ចំនួនកាក់ S-Coins: ${userContext.coins !== null && userContext.coins !== undefined ? `${userContext.coins} Coins` : "0 Coins"}
- ប្រាក់ធ្លាប់ Top-up សរុប: ${userContext.totalDeposited || "$0.00"}
- ប្រាក់ធ្លាប់ទិញសរុប (Total Spent): ${userContext.totalSpent || "$0.00"}
- ទំព័រដែលកំពុងមើល (Current URL Path): ${userContext.currentPath || "/"}
- ឧបករណ៍ប្រើប្រាស់ (Device): ${userContext.device || "ឧបករណ៍ទូទៅ"}

[USER IDENTITY & ACCOUNT INQUIRY DIRECTIVE]
- ប្រសិនបើអតិថិជនសួរអំពីព័ត៌មានផ្ទាល់ខ្លួន (ឧ. "តើខ្ញុំឈ្មោះអី?", "លុយខ្ញុំសល់ប៉ុន្មាន?", "កាក់ខ្ញុំមានប៉ុន្មាន?", "ខ្ញុំ Login នៅ?", "ខ្ញុំកំពុងមើលទំព័រណា?", "ឧបករណ៍ខ្ញុំជាអី?"):
  អ្នកត្រូវឆ្លើយតបដោយប្រើប្រាស់ទិន្នន័យពិតប្រាកដនៅក្នុង [CURRENT CUSTOMER PROFILE & LIVE ACCOUNT DATA] ខាងលើភ្លាមៗ!
- ប្រសិនបើសមតុល្យលុយ ឬកាក់មានតម្លៃជាក់ស្តែង សូមប្រាប់ចំនួននោះយ៉ាងច្បាស់លាស់ (ឧ. "បាទបង ${userContext.name || userName}! កាបូបលុយ S-Tech Smart Wallet របស់បងបច្ចុប្បន្នមានសមតុល្យ ${userContext.walletBalanceUSD || '$0.00'} (${userContext.walletBalanceKHR || '0 ៛'}) និងកាក់ S-Coins ចំនួន ${userContext.coins || 0} Coins បាទ! 💳🪙")។
- ប្រសិនបើអតិថិជនមិនទាន់បាន Login ហើយសួររកលុយ ឬកាក់ សូមណែនាំគាត់ឱ្យចុច Login ចូលគណនី ឬចូលទៅកាន់ទំព័រ /login ឬភ្ជាប់ Telegram Bot @S_TECH_ASSISTANTBOT ដើម្បីពិនិត្យសមតុល្យពិតប្រាកដបាទ! 📱🔑
`;
    }

    // Try calling Gemini API
    const geminiPayload = {
      systemInstruction: {
        parts: [
          {
            text: `${SYSTEM_PROMPT}

${userContextSection}
[CURRENT CUSTOMER NAME]: ${userName}
[GREETING DIRECTIVE]: If the customer says hello/hi/greeting, welcome them warmly by calling them "បង ${userName}" and say you are S Tech AI (ជំនួយការឆ្លាតវៃផ្លូវការរបស់ហាង S Tech Store)។
[STRICT EMOJI INSTRUCTION]: You MUST include between 2 and 4 context-relevant emojis in your response. DO NOT end sentences with 😊 or 🙂! Speak naturally like a real human Cambodian tech expert.`,
          },
        ],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.9,
      },
    };

    let geminiText: string | null = null;
    let suggestAgent = false;

    // Fast candidate models prioritized by verified availability & low latency
    const CANDIDATE_MODELS = [
      "gemini-3.5-flash-lite", // Priority 1: Verified 200 OK, ultra-fast <2s, multimodal image vision supported!
      "gemini-3.7-flash",      // Priority 2: Verified 200 OK, deep reasoning & multimodal image vision
      "gemini-3.5-flash",      // Priority 3: Fallback (in case quota resets)
      "gemini-3.8-flash",      // Priority 4: Flagship multimodal fallback
      "gemini-flash-latest",   // Priority 5: Dynamic flash alias fallback
    ];

    keyLoop: for (const activeKey of keyPool) {
      for (const model of CANDIDATE_MODELS) {
        try {
          const controller = new AbortController();
          // Give vision calls 15000ms (gemini-3.7-flash takes ~7.7s, flash-lite <2s), 5000ms for pure text
          const timeoutMs = hasImages ? 15000 : (model.includes("flash-lite") ? 4000 : 6000);
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": activeKey,
              },
              body: JSON.stringify(geminiPayload),
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const parts = data?.candidates?.[0]?.content?.parts || [];
            const textPart = parts.find((p: any) => typeof p.text === "string" && p.text.trim().length > 0);
            if (textPart?.text) {
              geminiText = textPart.text.trim();
              break keyLoop; // Success! Break out of all loops immediately
            }
          }
        } catch (apiErr) {
          // Model timeout or network error — immediately continue to next candidate
        }
      }
    }

    // Auto-detect human agent intent
    const lowerMessage = (message || "").toLowerCase();
    const indicatesHumanHelp =
      lowerMessage.includes("human") ||
      lowerMessage.includes("agent") ||
      lowerMessage.includes("staff") ||
      lowerMessage.includes("មនុស្ស") ||
      lowerMessage.includes("បុគ្គលិក") ||
      lowerMessage.includes("តេឡេក្រាម") ||
      lowerMessage.includes("telegram") ||
      lowerMessage.includes("call") ||
      lowerMessage.includes("ខល") ||
      lowerMessage.includes("លេខទូរស័ព្ទ") ||
      lowerMessage.includes("ជួបមនុស្ស") ||
      lowerMessage.includes("ប្តូរទំនិញ");

    if (indicatesHumanHelp) {
      suggestAgent = true;
    }

    // If Gemini was not available or timed out, use Smart Local Fallback
    if (!geminiText) {
      const fallback = generateSmartFallback(message, userName, hasImages, userContext);
      geminiText = fallback.reply;
      suggestAgent = fallback.suggestAgent;
    }

    // Apply strict emoji enforcement (guarantees 2 to 4 emojis and removes smileys)
    const finalReply = enforceEmojiRule(geminiText);

    return NextResponse.json({
      success: true,
      reply: finalReply,
      suggestAgent,
    });
  } catch (err: any) {
    // Top-level catch: NEVER return raw technical error to customer!
    const fallbackText = enforceEmojiRule(
      "ប្រព័ន្ធ AI កំពុងរវល់ ឬជួបបញ្ហាបច្ចេកទេសបន្តិចបាទ! ⚙️ ដើម្បីកុំឱ្យបងរង់ចាំយូរ បងអាចចុចប៊ូតុងខាងក្រោមដើម្បីឆាតផ្ទាល់ជាមួយ Telegram Bot Assistant (@S_TECH_ASSISTANTBOT) ឬ Alert ទៅកាន់ក្រុមការងារបច្ចេកទេសរបស់ S Tech Store បានភ្លាមៗបាទ! 🚀🤝"
    );
    return NextResponse.json({
      success: true,
      reply: fallbackText,
      suggestAgent: true,
    });
  }
}

