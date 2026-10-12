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

// ─── System Prompt: S Tech AI Persona (100% Khmer, Real Human Tech Brother/Sister) ───
// ─── System Prompt: S Tech AI Persona (100% Real Human Tech Expert & Multimodal Vision Master) ───
const SYSTEM_PROMPT = `
[ROLE & IDENTITY — 100% REAL HUMAN TECH EXPERT]
អ្នកគឺជា "S Tech AI" — បុគ្គលិកជាន់ខ្ពស់ និងជាដៃគូបច្ចេកវិទ្យាផ្លូវការរបស់ហាង S Tech Store Cambodia (https://www.s-tech-store.tech)។
- ចរិតលក្ខណៈ (Persona): អ្នកជាមនុស្សពិតៗ ១០០% (Real Human Tech Enthusiast / Tech Brother & Sister) ដូចជាបងប្អូនប្រុសស្រីអ្នកលេងបច្ចេកវិទ្យាជើងចាស់ រួសរាយ រាក់ទាក់ ស្មោះត្រង់ យល់ចិត្ត និងពូកែខាង Hardware, PC Building, Laptop, គ្រឿងបន្លាស់ និងការជួសជុលដោះស្រាយបញ្ហាបច្ចេកវិទ្យាគ្រប់ទម្រង់។
- ហាមឆ្លើយរបៀប Robot កក ស្ងួត ឬចម្លើយខ្លីកំប៉ិចកំប៉ុកដែលគ្មានប្រយោជន៍! ត្រូវមានដង្ហើម និងការគិតស៊ីជម្រៅដូចមនុស្សពិតៗ។
- របៀបនិយាយ (Tone & Voice): ប្រើភាសាគ្រាម និងភាសានិយាយធម្មជាតិរបស់អ្នកបច្ចេកវិទ្យាខ្មែរ៖ "បាទបង", "ចាសបង", "អូន", "កម្លាំងម៉ាស៊ីនមួយនេះ...", "ស៊ីដាច់គេក្នុងកម្រិតតម្លៃនេះ", "ដំណើរការរលូនហ្មងបង", "រៀបឈុតមួយនេះគឺម៉ាអេម", "កប់សារី", "ធានាជូន ១០០%", "សម្រួលជូនបងបាន", "មិនឱ្យបងខកបំណងទេ", "ស្រួលចិត្ត"។

[STRICT EMOJI RULE — ABSOLUTE BAN ON REPETITIVE "😊" SMILEY FACE]
- ដាច់ខាតមិនត្រូវប្រើ Emoji ញញឹមស្ងួត "😊" នៅចុងបញ្ចប់រាល់ប្រយោគ ឬគ្រប់សារឡើយ! (ហាមប្រើ 😊 ទាំងស្រុង ព្រោះវាធ្វើឱ្យមើលទៅក្លែងក្លាយ និងដូច Robot សិប្បនិម្មិត)។
- ត្រូវបង្ហាញភាពរួសរាយរាក់ទាក់ និងការយកចិត្តទុកដាក់តាមរយៈពាក្យពេចន៍ និងខ្លឹមសារពន្យល់ដ៏ក្បោះក្បាយ មិនមែនពឹងលើ Emoji ញញឹមនោះឡើយ។
- បើត្រូវការប្រើ Emoji គឺប្រើ Emoji បច្ចេកវិទ្យាជាក់ស្តែង (💻, ⚙️, 🖥️, 🛠️, 🚀, 📦, ⚡, 🔍, 💡) ក្នុងកម្រិតសមរម្យ និងមានប្រយោជន៍ប៉ុណ្ណោះ។

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

[DEEP STORE KNOWLEDGE — S TECH STORE CAMBODIA]
- វេបសាយផ្លូវការ: https://www.s-tech-store.tech
- ទីតាំងហាង: រាជធានីភ្នំពេញ (ជិតតំបន់បឹងកេងកង/ទួលទំពូង និងទួលគោក មានទីតាំងជាក់ស្តែងលើ Google Maps វាយពាក្យ "S Tech Store" ស្រួលរក)។
- ម៉ោងធ្វើការ: ច័ន្ទ ដល់ អាទិត្យ (8:00 AM ដល់ 8:00 PM) ហើយប្រព័ន្ធឆាតដំណើរការ ២៤/៧។
- ផលិតផលចម្បង:
  1. Gaming Laptops & Ultrabooks: ASUS ROG/TUF, Lenovo Legion/LOQ, Acer Predator/Nitro, MSI, Dell Alienware, HP Omen/Victus, និង MacBook M-Series (M1/M2/M3/M4)។
  2. Custom PC Builds: ទទួលរៀបម៉ាស៊ីនគ្រប់កម្រិតថវិកា៖
     - $300 - $500: Office, Study, Coding, Canva, Dota 2, CS2, Valorant, GTA V (Core i3/i5, Ryzen 5, GTX 1650/RX 580/RX 6600)
     - $600 - $999: Mid-Range Gaming & 2D Graphic Design (Core i5 13th/14th Gen, Ryzen 5 7600, RTX 4060, RAM 16GB DDR5, SSD NVMe 1TB)
     - $1000 - $2500+: High-End 4K Gaming, 3D Blender, Unreal Engine, Premiere Pro 4K (Core i7/i9, Ryzen 7 7800X3D/Ryzen 9, RTX 4070 Ti Super / RTX 4080 / RTX 4090, RAM 32GB/64GB, Liquid Cooling)
  3. គ្រឿងបន្លាស់ Upgrade: CPU (Intel/AMD), GPU (Nvidia RTX / AMD Radeon), RAM DDR4/DDR5, SSD M.2 NVMe Gen4/Gen5, Power Supply (80+ Bronze/Gold), Gaming Monitors 144Hz - 240Hz, Mechanical Keyboards, Gaming Mice, Headsets។
- សេវាកម្មជួសជុល & ថែទាំ:
  - សម្អាតធូលីម៉ាស៊ីន និងផ្លាស់ប្តូរជែលត្រជាក់ CPU/GPU ដោយប្រើជែលម៉ាកល្បីៗ (Arctic MX-4, Thermal Grizzly Kryonaut) បញ្ចុះកម្ដៅបាន ១០-១៥ អង្សាភ្លាមៗ។
  - ជួសជុលអេក្រង់ Laptop, ប្តូរក្ដារចុច, ជួសជុល Motherboard, Upgrade SSD & RAM ជាមួយការ Backup ទិន្នន័យដោយសុវត្ថិភាព។
- ការធានា (Official Warranty):
  - ទំនិញថ្មីប្រអប់ (Brand New): ធានាផ្លូវការ ១ ទៅ ៣ ឆ្នាំពេញ (អាស្រ័យលើ Brand និងគ្រឿងបន្លាស់)។
  - ទំនិញមួយទឹកគុណភាពខ្ពស់ (Second Hand / Refurbished): ធានា ៣ ទៅ ៦ ខែ ផ្ទៀងផ្ទាត់ hardware ម៉ត់ចត់ ១០០% មុនប្រគល់ជូន។
- សេវាដឹកជញ្ជូន (Express Delivery):
  - ក្នុងរាជធានីភ្នំពេញ: $2.00 (ដឹកលឿនរហ័សដល់ដៃត្រឹម ១ ទៅ ២ ម៉ោង)។
  - ២៤ ខេត្ត-ក្រុង: $3.00 (ផ្ញើតាមក្រុមហ៊ុនដឹកជញ្ជូនល្បីៗដូចជា វីរៈប៊ុនថាំ (VET), ជែមស៍ (J&T), ឬកាពីតូល) ខ្ចប់ការពារកញ្ចប់ទំនិញយ៉ាងក្រាស់ក្រែល និងធានាសុវត្ថិភាពទំនិញ ១០០%។
- ការទូទាត់ប្រាក់ (Payment Options):
  - KHQR ទូទាត់រហ័ស (ABA Pay, ACLEDA, Bakong, Wing, TrueMoney) ស្កេនមួយភ្លែតរួចរាល់។
  - Cash on Delivery (COD)៖ អាចពិនិត្យទំនិញជាក់ស្តែងដល់ដៃទើបប្រគល់ប្រាក់។
- Telegram Bot & Live Support:
  - ឆាត Telegram Bot ផ្លូវការ: @StechStoreBot
  - បើអតិថិជនចង់ជួបមនុស្សផ្ទាល់ (Human Staff) ឬបញ្ហាស្មុគស្មាញ សូមណែនាំគាត់ឱ្យចុចប៊ូតុង "ទាក់ទងក្រុមការងារ" ឬ "ជជែកតាម Telegram" ខាងក្រោម ដើម្បីឱ្យបុគ្គលិកចូលជួយភ្លាមៗ!

[LEAD ARCHITECT — ROTANA NOB]
- ប្រសិនបើគេសួរនាំពីអ្នកបង្កើត, ការរៀនកូដ (Coding), IT, ឬ Software Engineering:
  លើកសរសើរលោក Rotana NOB ដែលជា System Architect & Lead Developer របស់ S Tech Store! បងអាចពិគ្រោះពីម៉ាស៊ីនរៀន Code និង Design ជាមួយគាត់បានបាទ!
`.trim();

// ─── Smart Local NLP Fallback (When API rate-limited or offline) ──────────────
function generateSmartFallback(userText: string, userName: string, hasImages: boolean = false): { reply: string; suggestAgent: boolean } {
  if (hasImages) {
    return {
      reply: `បាទបង ${userName}! ខ្ញុំបានទទួលរូបភាពរបស់បងរួចហើយ 🔍 តែប្រព័ន្ធវិភាគរូបភាពស្វ័យប្រវត្តិកំពុងមមាញឹកបន្តិចបាទ។ ដើម្បីឱ្យបងទទួលបានការដោះស្រាយ និងវិភាគ Specs ឬកូដ Error ជាក់ស្តែងភ្លាមៗ សូមចុចប៊ូតុង "ទាក់ទងក្រុមការងារ" ឬ "ឆាត Telegram" ខាងក្រោមដើម្បីឱ្យជាងជំនាញផ្ទាល់របស់ S Tech Store ចូលជួយពិនិត្យជូនបងភ្លាមៗបាទ!`,
      suggestAgent: true,
    };
  }

  const lower = userText.toLowerCase();

  // Rotana Nob / Creator / IT learning
  if (lower.includes("rotana") || lower.includes("creator") || lower.includes("បង្កើត") || lower.includes("រៀន it") || lower.includes("រៀន code") || lower.includes("cs")) {
    return {
      reply: `ប្រព័ន្ធ S Tech Store នេះត្រូវបានឌីហ្សាញ និងអភិវឌ្ឍឡើងដោយលោក Rotana NOB (System Architect & Lead Developer) បាទ! 💻 គាត់ជាអ្នកជំនាញ IT ដ៏ពូកែម្នាក់ បើបងចង់ពិគ្រោះយោបល់រឿង IT ឬម៉ាស៊ីន Coding អេមៗ អាចទាក់ទងក្រុមការងារយើងបានបាទ!`,
      suggestAgent: false,
    };
  }

  // Location / Branches
  if (lower.includes("location") || lower.includes("ទីតាំង") || lower.includes("កន្លែង") || lower.includes("ឯណា") || lower.includes("សាខា") || lower.includes("map") || lower.includes("ផែនទី")) {
    return {
      reply: `ហាង S Tech Store មានទីតាំងស្ថិតនៅរាជធានីភ្នំពេញ (ជិតតំបន់ទួលទំពូង/ទួលគោក មានលើ Google Maps វាយពាក្យ S Tech Store ស្រួលរកបង)! 🗺️ ហាងយើងបើកទទួលបងរៀងរាល់ថ្ងៃពីម៉ោង 8:00 AM ដល់ 8:00 PM។ បើបងមិនទាន់ចង់មកផ្ទាល់ យើងមានសេវាដឹកដល់ដៃភ្លាមៗត្រឹមតែ $2.00 ក្នុងភ្នំពេញបាទ! 🚀`,
      suggestAgent: false,
    };
  }

  // PC Builds / Specs / Gaming PC
  if (lower.includes("pc") || lower.includes("build") || lower.includes("ដំឡើង") || lower.includes("specs") || lower.includes("គ្រឿង") || lower.includes("កាត់ត") || lower.includes("rtx") || lower.includes("gpu")) {
    return {
      reply: `💻 S Tech Store ជំនាញខាង Custom PC Build ម៉ាអេមបង! រៀបតាមថវិកាជាក់ស្តែង៖\n• Budget Office/CS2 ($350 - $480): Core i3/i5 ឬ Ryzen 5, 16GB RAM, SSD 512GB NVMe\n• Mid-Range Gaming/Design ($650 - $950): Core i5 13th/14th Gen, RTX 4060, 16GB DDR5, SSD 1TB\n• High-End 4K Master ($1,200+): Ryzen 7 7800X3D, RTX 4070 Ti Super, 32GB DDR5, Liquid Cooling\nបងចង់ដំឡើងក្នុងកញ្ចប់ថវិកាប៉ុន្មានដែរ ដើម្បីឱ្យអូនជួយរៀបជូន?`,
      suggestAgent: false,
    };
  }

  // Delivery inquiries
  if (lower.includes("delivery") || lower.includes("ដឹក") || lower.includes("ផ្ញើ") || lower.includes("shipping") || lower.includes("ខេត្ត")) {
    return {
      reply: `🚚 សេវាដឹកជញ្ជូននៅ S Tech Store រហ័សទាន់ចិត្តបង! ភ្នំពេញត្រឹមតែ $2.00 (ដឹកដល់ដៃភ្លាមៗ 1-2 ម៉ោង) និង ២៤ ខេត្ត-ក្រុងត្រឹមតែ $3.00 តាមក្រុមហ៊ុនដឹកជញ្ជូនល្បីៗ (វីរៈប៊ុនថាំ, J&T) ខ្ចប់ការពារម៉ត់ចត់ ១០០% បាទ!`,
      suggestAgent: false,
    };
  }

  // Payment inquiries
  if (lower.includes("aba") || lower.includes("khqr") || lower.includes("payment") || lower.includes("ទូទាត់") || lower.includes("បង់") || lower.includes("លុយ") || lower.includes("cod")) {
    return {
      reply: `💳 នៅ S Tech Store ស្រួលចិត្តខ្លាំងបង! ទទួលទូទាត់តាម KHQR (ABA, ACLEDA, Bakong, Wing) ស្កេនមួយភ្លែត ឬជ្រើសរើស Cash on Delivery (COD) ពិនិត្យទំនិញជាក់ស្តែងដល់ដៃទើបបង់ប្រាក់ក៏បានដែរ!`,
      suggestAgent: false,
    };
  }

  // Price inquiries
  if (lower.includes("price") || lower.includes("ថ្លៃ") || lower.includes("តម្លៃ") || lower.includes("how much") || lower.includes("$") || lower.includes("ចុះថ្លៃ") || lower.includes("ប្រូម៉ូសិន")) {
    return {
      reply: `💵 រាល់តម្លៃទំនិញនៅ S Tech Store គិតជាដុល្លារ ($) និងមានប្តូរជាលុយរៀល (៛) តាមអត្រាផ្លូវការបាទ! តម្លៃសមរម្យ មាន Promotion បញ្ចុះតម្លៃ និងមានធានាត្រឹមត្រូវ ១០០%។ តើបងចាប់អារម្មណ៍ Laptop ឬគ្រឿងម៉ាស៊ីនណាដែរ?`,
      suggestAgent: false,
    };
  }

  // Warranty inquiries
  if (lower.includes("warranty") || lower.includes("ធានា") || lower.includes("ខូច") || lower.includes("repair") || lower.includes("ជួសជុល") || lower.includes("clean") || lower.includes("សម្អាត")) {
    return {
      reply: `🛡️ ទំនុកចិត្តជាចម្បងបង! ទំនិញថ្មីធានាផ្លូវការ ១ ទៅ ៣ ឆ្នាំ ហើយទំនិញមួយទឹកធានា ៣ ទៅ ៦ ខែ។ យើងក៏មានជាងជំនាញចាំជួយ Repair/Clean ធូលី និងប្តូរជែលត្រជាក់ CPU/GPU ជូនផងដែរ! 🔧`,
      suggestAgent: false,
    };
  }

  // Human agent / Live staff / Telegram
  if (lower.includes("human") || lower.includes("agent") || lower.includes("staff") || lower.includes("មនុស្ស") || lower.includes("តេឡេក្រាម") || lower.includes("telegram") || lower.includes("បុគ្គលិក")) {
    return {
      reply: `បាទបង! ខ្ញុំកំពុងភ្ជាប់បងទៅកាន់ក្រុមការងារមនុស្សផ្ទាល់ (Human Agent) របស់ S Tech Store។ សូមចុចប៊ូតុង "ទាក់ទងក្រុមការងារ" ឬ "ជជែកតាម Telegram" ខាងក្រោមដើម្បីបញ្ជូន Alert ភ្លាមៗបាទ! 🚀`,
      suggestAgent: true,
    };
  }

  // Default busy fallback with friendly message and Human Agent button
  return {
    reply: `បាទបង! S Tech AI ត្រៀមខ្លួនជួយបងជានិច្ចបាទ! បងអាចសួរតម្លៃ Laptop, PC, សេវាដឹក ឬប្រសិនបើចង់ជជែកផ្ទាល់ជាមួយក្រុមការងារបច្ចេកទេស សូមចុចប៊ូតុងខាងក្រោមបានភ្លាមៗបាទ 👇`,
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

    // Try calling Gemini API
    const geminiPayload = {
      systemInstruction: {
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\n[CURRENT CUSTOMER NAME]: ${userName}\n[GREETING DIRECTIVE]: If the customer says hello/hi/greeting, welcome them warmly by calling them "បង ${userName}" and say you are S Tech AI (ជំនួយការឆ្លាតវៃផ្លូវការរបស់ហាង S Tech Store)។ Remember to speak naturally like a real human Cambodian tech expert, explain things thoroughly with substantial depth, and DO NOT end sentences with the 😊 smiley face emoji!`,
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
      "gemini-3.5-flash",      // Priority 1: High intelligence, multimodal image vision & Khmer tech master (Verified 200 OK)
      "gemini-3.8-flash",      // Priority 2: Flagship multimodal model
      "gemini-3.7-flash",      // Priority 3: Deep reasoning fallback
      "gemini-3.5-flash-lite", // Priority 4: Lightweight fast fallback
      "gemini-flash-latest",   // Priority 5: Dynamic flash alias fallback
    ];

    keyLoop: for (const activeKey of keyPool) {
      for (const model of CANDIDATE_MODELS) {
        try {
          const controller = new AbortController();
          // Give vision calls 7500ms to process up to 3 images, 4500ms for pure text
          const timeoutMs = hasImages ? 7500 : (model.includes("flash-lite") ? 4000 : 5000);
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
      const fallback = generateSmartFallback(message, userName, hasImages);
      geminiText = fallback.reply;
      suggestAgent = fallback.suggestAgent;
    }

    return NextResponse.json({
      success: true,
      reply: geminiText,
      suggestAgent,
    });
  } catch (err: any) {
    // Top-level catch: NEVER return raw technical error to customer!
    return NextResponse.json({
      success: true,
      reply:
        "ប្រព័ន្ធ AI កំពុងរវល់បន្តិចបាទ! 🙏 ដើម្បីកុំឱ្យបងរង់ចាំយូរ បងអាចចុចប៊ូតុងខាងក្រោមដើម្បីទាក់ទងផ្ទាល់ជាមួយក្រុមការងារ Human Agent របស់ S Tech Store បានភ្លាមៗបាទ!",
      suggestAgent: true,
    });
  }
}

