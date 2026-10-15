"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  X, 
  Send, 
  Bot, 
  Headphones, 
  AlertCircle, 
  LogIn, 
  Clock, 
  Sparkles, 
  MessageCircle, 
  ExternalLink, 
  RefreshCw,
  History,
  Plus,
  Trash2,
  ChevronRight,
  Menu,
  Layers,
  Search,
  CheckCheck,
  Zap,
  MessageSquare,
  Image as ImageIcon,
  Paperclip,
  Phone,
  Lock,
  BellRing
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import api from "@/lib/api";
import { 
  getOrCreateVisitorId, 
  getActiveCustomerChatId,
  sendChatMessage, 
  subscribeToMessages, 
  subscribeToChatMeta,
  markChatReadByUser 
} from "@/lib/services/chat.service";
import { useRouter } from "next/navigation";

// ─── Rate limiting constants ─────────────────────────────────────────────────
const RATE_LIMIT_PER_MINUTE = 5; // max 5 messages per 60 seconds
const RATE_LIMIT_PER_HOUR = 150; // max 150 messages per 3600 seconds
const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export const STATIC_SYSTEM_PROMPTS = [
  { label: "🚚 សេវាដឹកជញ្ជូន", text: "តើហាង S Tech Store មានសេវាដឹកជញ្ជូន និងសាខានៅឯណាខ្លះ?" },
  { label: "🛡️ ការធានា (Warranty)", text: "តើហាងមានការធានាលើកុំព្យូទ័រ និងគ្រឿងបន្លាស់រយៈពេលប៉ុន្មាន?" },
  { label: "💻 ដំឡើង Custom PC", text: "ខ្ញុំចង់ដំឡើង PC សម្រាប់ Gaming និងកាត់ត តើហាងអាចជួយរៀបគ្រឿងបានទេ?" },
  { label: "🎁 ប្រូម៉ូសិនពិសេស", text: "តើបច្ចុប្បន្នហាងមាន Promotion ឬការបញ្ចុះតម្លៃពិសេសអ្វីខ្លះ?" },
  { label: "💳 ការទូទាត់ KHQR / COD", text: "តើហាងទទួលការទូទាត់តាមវិធីណាខ្លះ (KHQR/ABA/COD)?" },
  { label: "📞 ជជែកផ្ទាល់ជាមួយក្រុមការងារ", isAgent: true, text: "" },
];

export const STATIC_FAQ_ANSWERS: Record<string, string> = {
  "តើហាង S Tech Store មានសេវាដឹកជញ្ជូន និងសាខានៅឯណាខ្លះ?":
    `🚚 **សេវាដឹកជញ្ជូន & ទីតាំងហាង S Tech Store:**\n\n` +
    `• 🛵 **ក្នុងរាជធានីភ្នំពេញ:** តម្លៃដឹកត្រឹមតែ **$2.00** ប៉ុណ្ណោះ! ដឹកលឿនទាន់ចិត្តដល់មុខផ្ទះក្នុងថ្ងៃតែមួយ ឬក្រោម ២ ម៉ោង 📦⚡\n` +
    `• 🚛 **តាមបណ្តាខេត្ត (២៥ ខេត្ត-ក្រុង):** តម្លៃដឹក **$3.00** តាមរយៈក្រុមហ៊ុនដឹកជញ្ជូនល្បីៗ (វីរៈប៊ុនថាំ VET, J&T Express, Capitol) ដឹកដល់ដៃក្នុងរយៈពេល ១ ទៅ ២ ថ្ងៃ 🚀\n` +
    `• 🎉 **ប្រូម៉ូសិនពិសេស:** រាល់ការបញ្ជាទិញចាប់ពី **$50.00** ឡើងទៅ ហាងដឹកជញ្ជូនជូន **ឥតគិតថ្លៃ (FREE Delivery)**!\n\n` +
    `📍 **ទីតាំងហាង:** រាជធានីភ្នំពេញ (បើកបម្រើ 8:00 AM ដល់ 8:00 PM រៀងរាល់ថ្ងៃ គ្មានថ្ងៃសម្រាក)\n` +
    `📞 **លេខទំនាក់ទំនងបន្ទាន់:** \`012 345 678\` / \`098 765 432\``,

  "តើហាងមានការធានាលើកុំព្យូទ័រ និងគ្រឿងបន្លាស់រយៈពេលប៉ុន្មាន?":
    `🛡️ **គោលការណ៍ធានាគុណភាពផ្លូវការ (Official Warranty):**\n\n` +
    `• 💻 **Laptops ថ្មី (Brand New):** ធានាផ្លូវការពីរោងចក្រ **១ ទៅ ៣ ឆ្នាំពេញ** (ASUS, Apple MacBook, Dell, Lenovo Legion, Acer, MSI)\n` +
    `• 🖥️ **Custom PC & គ្រឿងបន្លាស់:** ធានារយៈពេល **១ ទៅ ៣ ឆ្នាំ** លើ CPU, GPU, Mainboard, RAM, SSD, Power Supply\n` +
    `• 🔄 **គោលការណ៍ប្តូរថ្មី (Replacement):** ប្តូរថ្មីជូនក្នុងរយៈពេល **៧ ថ្ងៃ** ប្រសិនបើមានបញ្ហាបច្ចេកទេសពីរោងចក្រ\n\n` +
    `✨ **សេវាកម្មឥតគិតថ្លៃពេញមួយជីវិត (Lifetime Support):**\n` +
    `• សម្អាតធូលី & ប្តូរទឹកកម្ដៅ (Thermal Paste) ឥតគិតថ្លៃ\n` +
    `• ជួយដំឡើង Windows 11 Pro License & កម្មវិធីការិយាល័យ Free\n` +
    `• Support បច្ចេកទេស និងដោះស្រាយបញ្ហាតាម Telegram 24/7!`,

  "ខ្ញុំចង់ដំឡើង PC សម្រាប់ Gaming និងកាត់ត តើហាងអាចជួយរៀបគ្រឿងបានទេ?":
    `💻 **សេវាកម្មដំឡើង Custom PC តាមតម្រូវការ (PC Builder):**\n\n` +
    `• 🎮 **Gaming & Streaming PC:** រៀបចំតាមកម្លាំងដែលបងចង់បាន (Core i5/i7/i9, AMD Ryzen 5/7/9, RTX 4060/4070/4080) លេងហ្គេមរលូន 100+ FPS!\n` +
    `• 🎬 **PC កាត់តវីដេអូ & Graphic Design (Render/3D):** បំពាក់ RAM ធំ 32GB-64GB និង SSD M.2 NVMe Gen4 ល្បឿនខ្ពស់ រួមទាំងប្រព័ន្ធត្រជាក់ Liquid Cooler\n` +
    `• 💼 **Office & Study PC:** ឈុតកុំព្យូទ័រតម្លៃសន្សំសំចៃ ចាប់ពី **$299** ឡើងទៅ\n\n` +
    `🛠️ **ការថែមជូនពិសេស:**\n` +
    `• ដំឡើងគ្រឿង និង Cable Management ស្អាតបាត ១០០%\n` +
    `• ដំឡើង Windows 11 Pro License & Drivers ស្រេចមួយកំផ្លេ\n` +
    `• 🎁 ថែម Mousepad ធំ, Power Cable និងសេវាដឹកដល់មុខផ្ទះ!`,

  "តើបច្ចុប្បន្នហាងមាន Promotion ឬការបញ្ចុះតម្លៃពិសេសអ្វីខ្លះ?":
    `🎁 **ប្រូម៉ូសិនពិសេស & Voucher បញ្ចុះតម្លៃនៅ S Tech Store:**\n\n` +
    `• 🎟️ **Voucher ស្វាគមន៍ $5.00 (WELCOME5):** បញ្ចុះតម្លៃ $5.00 ភ្លាមៗសម្រាប់អតិថិជនថ្មីលើរាល់ការទិញ Laptop ឬគ្រឿងបន្លាស់\n` +
    `• 🔥 **កូដបញ្ចុះតម្លៃ:** បំពេញកូដ \`STECH10\` ដើម្បីទទួលបានការបញ្ចុះ **10%** លើគ្រឿង Gaming & Accessories\n` +
    `• 🚚 **Free Shipping:** ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងរាជធានីភ្នំពេញ សម្រាប់ការកុម្ម៉ង់ចាប់ពី $50 ឡើងទៅ\n\n` +
    `🎒 **កាដូថែមជូនពេលទិញ Laptop/PC:**\n` +
    `• កាតាបស្ពាយធន់ទឹក (Laptop Backpack)\n` +
    `• Mouse Wireless & Mousepad ធំ\n` +
    `• Flash Drive ឬ USB Hub (តាមម៉ូឌែល)`,

  "តើហាងទទួលការទូទាត់តាមវិធីណាខ្លះ (KHQR/ABA/COD)?":
    `💳 **វិធីសាស្ត្រទូទាត់ប្រាក់នៅ S Tech Store:**\n\n` +
    `• 🇰🇭 **KHQR / Bakong / ABA Pay:** ស្កេនទូទាត់ប្រាក់រហ័សទាន់ចិត្ត ងាយស្រួល និងគ្មានថ្លៃសេវាបន្ថែម (Zero Fee)\n` +
    `• 💵 **ទូទាត់ពេលទំនិញដល់ដៃ (Cash on Delivery - COD):** ពិនិត្យទំនិញត្រឹមត្រូវរួច ទើបប្រគល់ប្រាក់ជូនអ្នកដឹកជញ្ជូន\n` +
    `• 💰 **S-Tech Wallet:** ទូទាត់ចេញពីសមតុល្យកាបូបលុយផ្ទាល់ខ្លួន ទទួលបានការបញ្ចុះតម្លៃ និងពិន្ទុបន្ថែម (S-Coins)\n` +
    `• 🔐 ប្រព័ន្ធទូទាត់មានសុវត្ថិភាពខ្ពស់កម្រិត 256-bit SSL Gateway ផ្ទៀងផ្ទាត់ដោយស្វ័យប្រវត្តិ!`,
};
// ─── Native Telegram Mini App & Mobile Haptic Feedback ───────────────────────
export const triggerHaptic = (style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light") => {
  if (typeof window !== "undefined") {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(style);
      } else if (navigator?.vibrate) {
        navigator.vibrate(style === "heavy" ? 40 : 20);
      }
    } catch (e) {}
  }
};

export const triggerHapticNotification = (type: "error" | "success" | "warning" = "success") => {
  if (typeof window !== "undefined") {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(type);
      } else if (navigator?.vibrate) {
        navigator.vibrate([30, 40, 30]);
      }
    } catch (e) {}
  }
};

export interface ThinkingStep {
  phase1: string;
  phase2: string;
  phase3: string;
}

export function getContextualThinking(promptText: string): ThinkingStep {
  const lower = (promptText || "").toLowerCase();

  // Location / Branches / ទីតាំង / សាខា / ផែនទី
  if (lower.includes("ទីតាំង") || lower.includes("កន្លែង") || lower.includes("ឯណា") || lower.includes("location") || lower.includes("សាខា") || lower.includes("map") || lower.includes("ផែនទី") || lower.includes("ជិត")) {
    return {
      phase1: "📍 S Tech AI កំពុងស្វែងរកទីតាំងហាង និងសាខាក្នុងភ្នំពេញ...",
      phase2: "🗺️ ផ្ទៀងផ្ទាត់ផែនទី ម៉ោងបើក និងមធ្យោបាយធ្វើដំណើរមកកាន់ហាង...",
      phase3: "✍️ កំពុងរៀបចំព័ត៌មានទីតាំងជាក់ស្តែងជូនបង...",
    };
  }

  // PC Build / Specs / Custom PC / Gaming PC / គ្រឿងបន្លាស់
  if (lower.includes("pc") || lower.includes("ដំឡើង") || lower.includes("build") || lower.includes("specs") || lower.includes("cpu") || lower.includes("gpu") || lower.includes("rtx") || lower.includes("graphic") || lower.includes("គ្រឿង") || lower.includes("កាត់ត")) {
    return {
      phase1: "💻 S Tech AI កំពុងវិភាគតម្រូវការដំឡើង PC & ថវិការបស់បង...",
      phase2: "⚙️ ផ្ទៀងផ្ទាត់គ្រឿងបន្លាស់ CPU, GPU, RAM, SSD និង Power Supply...",
      phase3: "🚀 កំពុងគណនាកម្លាំងម៉ាស៊ីន និងរៀបចំ Specs ឲ្យស៊ីគ្នា ១០០%...",
    };
  }

  // Price / Promotion / Discount / តម្លៃ
  if (lower.includes("តម្លៃ") || lower.includes("ថ្លៃ") || lower.includes("price") || lower.includes("ចុះថ្លៃ") || lower.includes("ប្រូម៉ូសិន") || lower.includes("promo") || lower.includes("discount") || lower.includes("$")) {
    return {
      phase1: "💵 S Tech AI កំពុងពិនិត្យតម្លៃផ្លូវការ និងប្រូម៉ូសិនពិសេស...",
      phase2: "🎁 ផ្ទៀងផ្ទាត់កាដូថែម កាតបញ្ចុះតម្លៃ និងស្តុកចុងក្រោយ...",
      phase3: "✨ កំពុងគណនាតម្លៃសមរម្យ និងសន្សំសំចៃបំផុតជូនបង...",
    };
  }

  // Warranty / Repairs / Cleaning / ធានា / ជួសជុល / ខូច
  if (lower.includes("ធានា") || lower.includes("warranty") || lower.includes("ជួសជុល") || lower.includes("repair") || lower.includes("ខូច") || lower.includes("clean") || lower.includes("សម្អាត") || lower.includes("upgrade")) {
    return {
      phase1: "🛡️ S Tech AI កំពុងពិនិត្យគោលការណ៍ធានា និងសេវាជួសជុល...",
      phase2: "🔧 ពិនិត្យការធានាផ្លូវការ ១-៣ ឆ្នាំ និងការដោះដូរគ្រឿងបន្លាស់...",
      phase3: "📋 កំពុងរៀបចំដំណោះស្រាយ និងការណែនាំបច្ចេកទេសជូនបង...",
    };
  }

  // Delivery / ដឹក / ផ្ញើ / Shipping
  if (lower.includes("ដឹក") || lower.includes("ផ្ញើ") || lower.includes("delivery") || lower.includes("shipping") || lower.includes("ខេត្ត")) {
    return {
      phase1: "🚚 S Tech AI កំពុងពិនិត្យសេវាដឹកជញ្ជូនរហ័ស (ភ្នំពេញ & ខេត្ត)...",
      phase2: "📦 ផ្ទៀងផ្ទាត់តម្លៃដឹក ($2 ភ្នំពេញ / $3 ខេត្ត) និងពេលវេលាដល់ដៃ...",
      phase3: "🛵 កំពុងរៀបចំព័ត៌មានដឹកជញ្ជូនលម្អិតជូនបង...",
    };
  }

  // Payment / KHQR / ABA / COD
  if (lower.includes("aba") || lower.includes("khqr") || lower.includes("bakong") || lower.includes("cod") || lower.includes("បង់") || lower.includes("លុយ") || lower.includes("payment")) {
    return {
      phase1: "💳 S Tech AI កំពុងពិនិត្យវិធីសាស្ត្រទូទាត់ប្រាក់ (ABA / Bakong / COD)...",
      phase2: "🔐 ផ្ទៀងផ្ទាត់សុវត្ថិភាពការទូទាត់ និងលក្ខខណ្ឌបង់ប្រាក់...",
      phase3: "✨ កំពុងរៀបចំការណែនាំទូទាត់ជូនបង...",
    };
  }

  // Rotana Nob / Creator / Coding / IT
  if (lower.includes("rotana") || lower.includes("creator") || lower.includes("បង្កើត") || lower.includes("code") || lower.includes("it") || lower.includes("រៀន")) {
    return {
      phase1: "👨‍💻 កំពុងភ្ជាប់ទៅទិន្នន័យស្ថាបត្យករប្រព័ន្ធ (Lead Dev Rotana NOB)...",
      phase2: "💡 ពិនិត្យបទពិសោធន៍ IT, ការរៀន Coding និងម៉ាស៊ីន Developer...",
      phase3: "✨ កំពុងរៀបចំការចែករំលែកបទពិសោធន៍ដ៏ល្អជូនបង...",
    };
  }

  // Laptop / MacBook / Ultrabook
  if (lower.includes("laptop") || lower.includes("macbook") || lower.includes("asus") || lower.includes("lenovo") || lower.includes("dell") || lower.includes("acer") || lower.includes("rog")) {
    return {
      phase1: "💻 S Tech AI កំពុងស្វែងរកម៉ូឌែល Laptop ដែលស៊ីនឹងតម្រូវការបង...",
      phase2: "🔍 ផ្ទៀងផ្ទាត់ទំហំអេក្រង់ ថាមពលថ្ម និងកម្លាំង Chipset...",
      phase3: "🎯 កំពុងជ្រើសរើសម៉ូឌែលដែលអេម និងធន់បំផុតជូនបង...",
    };
  }

  // Default / General
  return {
    phase1: "⚡ S Tech AI កំពុងវិភាគសំណួររបស់បងយ៉ាងយកចិត្តទុកដាក់...",
    phase2: "🧠 ស្វែងរកទិន្នន័យបច្ចេកវិទ្យា និងព័ត៌មានហាងដែលសមស្រប...",
    phase3: "✍️ កំពុងរៀបចំចម្លើយយ៉ាងកក់ក្តៅ និងត្រឹមត្រូវជូនបង...",
  };
}

// ─── High-Tech Khmer Markdown & Typography Formatter ─────────────────────────
export function FormattedMessageText({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");

  const renderInlineFormatted = (raw: string) => {
    // Regex splits: bold **...**, inline code `...`, currency amounts ($350, 1,200$, 50,000៛)
    const tokens = raw.split(/(\*\*[^*]+\*\*|`[^`]+`|\$\d+(?:,\d+)*(?:\.\d+)?|\b\d+(?:,\d+)*\$(?!\w)|\b\d+(?:,\d+)*\s*៛)/g);

    return tokens.map((token, idx) => {
      if (!token) return null;

      // Bold **...** (strip raw asterisks and apply bold/highlight accents)
      if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
        const inner = token.slice(2, -2);
        const hasPrice = /\$\d+|\d+\$|\d+\s*៛/.test(inner);
        return (
          <strong
            key={idx}
            className={`font-black ${
              hasPrice
                ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 px-1 py-0.5 rounded"
                : "text-[#8B1A1A] dark:text-red-400 font-extrabold"
            }`}
          >
            {inner}
          </strong>
        );
      }

      // Inline code `...`
      if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
        const inner = token.slice(1, -1);
        return (
          <code
            key={idx}
            className="font-mono text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-pink-600 dark:text-pink-400 font-bold border border-gray-200/50 dark:border-white/5"
          >
            {inner}
          </code>
        );
      }

      // Standalone price $... or ...$ or ...៛
      if (/^(\$\d+(?:,\d+)*(?:\.\d+)?|\d+(?:,\d+)*\$|\d+(?:,\d+)*\s*៛)$/.test(token)) {
        return (
          <span
            key={idx}
            className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 px-1.5 py-0.5 rounded"
          >
            {token}
          </span>
        );
      }

      return <span key={idx}>{token}</span>;
    });
  };

  return (
    <div className="space-y-1.5 leading-relaxed text-[13.5px]">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lIdx} className="h-1.5" />;
        }

        // Bullet lists (* , - , • )
        const bulletMatch = trimmed.match(/^([*\-•])\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B1A1A] dark:bg-red-400 mt-2 shrink-0 shadow-xs" />
              <div className="flex-1">{renderInlineFormatted(bulletMatch[2])}</div>
            </div>
          );
        }

        // Numbered lists (1. , 2. , ១. , ២. )
        const numberedMatch = trimmed.match(/^([0-9០-៩]+[.)])\s+(.+)$/);
        if (numberedMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-100 dark:bg-red-950/80 text-[#8B1A1A] dark:text-red-400 text-[10.5px] font-black px-1 mt-0.5 shrink-0 border border-red-200/50 dark:border-red-900/40">
                {numberedMatch[1].replace(/[.)]/, "")}
              </span>
              <div className="flex-1">{renderInlineFormatted(numberedMatch[2])}</div>
            </div>
          );
        }

        // Heading style (### or ## )
        if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
          const headingText = trimmed.replace(/^#{2,3}\s+/, "");
          return (
            <div key={lIdx} className="font-black text-[14px] text-gray-900 dark:text-white pt-1 pb-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[#8B1A1A] dark:bg-red-400" />
              {renderInlineFormatted(headingText)}
            </div>
          );
        }

        return (
          <div key={lIdx} className="break-words">
            {renderInlineFormatted(line)}
          </div>
        );
      })}
    </div>
  );
}

export interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
  messages: ChatItem[];
}

interface ChatBotProps {
  onClose: () => void;
  productInfo?: {
    name?: string;
    slug?: string;
    price?: number;
    image?: string;
  };
}

export interface AttachedImageItem {
  id: string;
  file?: File;
  base64: string;
  preview: string;
}

interface ChatItem {
  id?: string;
  sender: "bot" | "user" | "system" | "staff";
  text: string;
  senderName?: string;
  time?: string;
  timestamp?: number;
  showGreetingButtons?: boolean;
  suggestAgent?: boolean;
  image?: string;
  images?: string[];
}

type ToastType = "error" | "warning" | "info" | "success";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export default function ChatBot({ onClose, productInfo }: ChatBotProps) {
  const router = useRouter();

  // ─── Auth state ────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("អតិថិជន");
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Helper to reliably check if user is logged in
  const checkUserLoggedIn = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    // Telegram Mini App
    if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
      return true;
    }

    const sessionStr = localStorage.getItem("user_session") || localStorage.getItem("stech_user_session");
    const token = localStorage.getItem("customer_token") || localStorage.getItem("token");
    if (sessionStr || token) {
      return true;
    }

    if (auth.currentUser) {
      return true;
    }

    return false;
  }, []);

  // ─── Chat state ───────────────────────────────────────────────────────────
  const [chatId, setChatId] = useState<string>("");
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // ─── Human Takeover / AI Paused State (Meta / Instagram Direct Inbox Style) ─
  const [isAiPaused, setIsAiPaused] = useState(false);
  const [pausedByStaff, setPausedByStaff] = useState<string>("");

  // ─── Multi-Session State (Gemini App Style) ────────────────────────────────
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const sessionsRef = useRef<ChatSessionItem[]>([]);
  sessionsRef.current = sessions;
  const userStorageKeyRef = useRef<string>("guest");
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");

  // ─── Live Thinking Preview State (Gemini Thinking UI) ─────────────────────
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [showThoughtProcess, setShowThoughtProcess] = useState(true);
  const [currentThinkingStep, setCurrentThinkingStep] = useState<ThinkingStep | null>(null);

  // ─── Image attachment for multimodal vision (Limit 3 Images) ──────────────
  const [attachedImages, setAttachedImages] = useState<AttachedImageItem[]>([]);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoggedIn) {
      showToast("🔒 សូមចូលគណនី (Login) ជាមុនសិន ដើម្បីភ្ជាប់រូបភាព!", "warning");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 3 - attachedImages.length;
    if (remainingSlots <= 0) {
      showToast("⚠️ អាចភ្ជាប់រូបភាពបានអតិបរមា ៣ សន្លឹកប៉ុណ្ណោះក្នុងមួយសារ!", "warning");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (files.length > remainingSlots) {
      showToast(`⚠️ អាចភ្ជាប់បានត្រឹម ៣ រូបភាព (បានជ្រើសរើស ${remainingSlots} រូបភាពដំបូង)!`, "warning");
    }

    const validFiles = files.slice(0, remainingSlots).filter((file) => {
      if (!file.type.startsWith("image/")) {
        showToast(`ឯកសារ "${file.name}" មិនមែនជារូបភាពទេ!`, "warning");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`រូបភាព "${file.name}" ធំជាង 5MB!`, "warning");
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    let loadedCount = 0;
    const newItems: AttachedImageItem[] = [];

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        newItems.push({
          id: "img_" + Math.random().toString(36).substring(2, 9),
          file,
          base64,
          preview: URL.createObjectURL(file),
        });
        loadedCount++;
        if (loadedCount === validFiles.length) {
          setAttachedImages((prev) => [...prev, ...newItems].slice(0, 3));
          showToast(`📷 បានភ្ជាប់រូបភាព ${newItems.length} សន្លឹកជោគជ័យ!`, "info");
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachedImage = (idToRemove: string) => {
    setAttachedImages((prev) => {
      const target = prev.find((img) => img.id === idToRemove);
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((img) => img.id !== idToRemove);
    });
  };

  // ─── Agent modal state ─────────────────────────────────────────────────────
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [isSendingAgentReq, setIsSendingAgentReq] = useState(false);
  const [agentReqSent, setAgentReqSent] = useState(false);
  const [hasNotifiedTelegram, setHasNotifiedTelegram] = useState(false);

  const [agentForm, setAgentForm] = useState({
    name: "",
    phone: "",
    email: "",
    telegram: "",
    message: productInfo?.name
      ? `ខ្ញុំចាប់អារម្មណ៍ទំនិញ ${productInfo.name}។ តើអាចជួយផ្តល់ព័ត៌មានបន្ថែមបានទេ?`
      : "",
  });

  // ─── Toast state ──────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  // ─── Rate limiting: store timestamps of sent messages ─────────────────────
  const messageTimes = useRef<number[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Show toast helper ────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ─── Live Thinking Timer with Safety Watchdog ────────────────────────────
  useEffect(() => {
    let interval: any;
    if (isAiThinking) {
      setThinkingSeconds(0);
      interval = setInterval(() => {
        setThinkingSeconds((prev) => {
          const next = +(prev + 0.1).toFixed(1);
          if (next >= 18) {
            // Safety watchdog: never let timer exceed 18s or freeze client UI
            setIsAiThinking(false);
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isAiThinking]);

  // ─── Check rate limits ────────────────────────────────────────────────────
  const checkRateLimit = useCallback((): { allowed: boolean; reason?: string } => {
    const now = Date.now();
    const withinHour = messageTimes.current.filter((t) => now - t < ONE_HOUR_MS);
    const withinMinute = withinHour.filter((t) => now - t < ONE_MINUTE_MS);

    if (withinMinute.length >= RATE_LIMIT_PER_MINUTE) {
      return {
        allowed: false,
        reason: `⏱️ ផ្ញើសារញឹកញាប់ពេកហើយបង! សូមរង់ចាំ ១ នាទី (កម្រិត ${RATE_LIMIT_PER_MINUTE} សារ/នាទី)`,
      };
    }
    if (withinHour.length >= RATE_LIMIT_PER_HOUR) {
      return {
        allowed: false,
        reason: `🚫 បានដល់កម្រិតកំណត់ក្នុង ១ ម៉ោង (${RATE_LIMIT_PER_HOUR} សារ/ម៉ោង)។ សូមសាកល្បងម្ដងទៀតនៅពេលក្រោយ។`,
      };
    }

    messageTimes.current = [...withinHour, now];
    return { allowed: true };
  }, []);

  // ─── Extract Live Customer Profile & Wallet Context ───────────────────────
  const getUserContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    let localSession: any = null;
    let walletData: any = null;

    try {
      const s = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
      if (s) localSession = JSON.parse(s);
    } catch {}

    try {
      const w = localStorage.getItem("stech_cached_wallet");
      if (w) walletData = JSON.parse(w);
    } catch {}

    const hasToken = !!(localStorage.getItem("token") || localStorage.getItem("customer_token"));
    const isLoggedIn = Boolean(currentUser || localSession?.id || hasToken);

    const name = userName && userName !== "អតិថិជន" && userName !== "បង"
      ? userName
      : (localSession?.name || localSession?.username || currentUser?.displayName || "ភ្ញៀវ (Guest)");

    const email = localSession?.email || currentUser?.email || agentForm.email || "មិនទាន់ភ្ជាប់";
    const phone = localSession?.phone || agentForm.phone || "មិនទាន់ភ្ជាប់";
    const telegram = localSession?.telegram_username || localSession?.telegram || agentForm.telegram || "មិនទាន់ភ្ជាប់";
    const role = localSession?.role || "customer";

    const walletBalanceUSD = walletData?.balance !== undefined ? `$${Number(walletData.balance).toFixed(2)}` : null;
    const walletBalanceKHR = walletData?.balance_khr !== undefined ? `${Number(walletData.balance_khr).toLocaleString()} ៛` : null;
    const coins = walletData?.coins !== undefined ? Number(walletData.coins) : null;
    const totalDeposited = walletData?.total_deposited !== undefined ? `$${Number(walletData.total_deposited).toFixed(2)}` : null;
    const totalSpent = walletData?.total_spent !== undefined ? `$${Number(walletData.total_spent).toFixed(2)}` : null;

    return {
      isLoggedIn,
      name,
      email,
      phone,
      telegram,
      role,
      walletBalanceUSD,
      walletBalanceKHR,
      coins,
      totalDeposited,
      totalSpent,
      currentPath: window.location.pathname,
      device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "Mobile/Phone" : "PC/Desktop/Laptop",
    };
  }, [currentUser, userName, agentForm]);

  // ─── Session Title Generator ──────────────────────────────────────────────
  const generateSessionTitle = (text: string): string => {
    let clean = text.replace(/^(សួស្តី|hello|hi|ជំរាបសួរ|បង|admin)[,\s!.]*/i, "").trim();
    if (!clean) clean = text.trim();
    if (clean.length > 32) {
      clean = clean.slice(0, 32) + "...";
    }
    return clean || "ការសន្ទនាថ្មី";
  };

  // ─── LocalStorage Multi-Session Helpers ────────────────────────────────────
  const getSessionsStorageKey = (uid: string) => `stech_ai_sessions_${uid || "guest"}`;

  const loadAllSessions = (uid: string): ChatSessionItem[] => {
    if (typeof window === "undefined") return [];
    try {
      let data = localStorage.getItem(getSessionsStorageKey(uid)) || localStorage.getItem(`stech_gemini_sessions_${uid || "guest"}`);
      
      // Fallback migration: if logged-in user key has no sessions, check if sessions were saved under 'guest'
      if (!data && uid && uid !== "guest") {
        data = localStorage.getItem(getSessionsStorageKey("guest")) || localStorage.getItem("stech_gemini_sessions_guest");
        if (data) {
          try {
            localStorage.setItem(getSessionsStorageKey(uid), data);
          } catch {}
        }
      }

      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Clean up any historical leaks: deduplicate messages by sender & text
          return parsed.map((s: ChatSessionItem) => {
            if (!Array.isArray(s.messages)) return s;
            const uniqueMsgs: ChatItem[] = [];
            for (const m of s.messages) {
              const clean = (m.text || "").trim();
              const lastMsg = uniqueMsgs[uniqueMsgs.length - 1];
              // Avoid back-to-back identical messages with same sender
              if (lastMsg && (lastMsg.text || "").trim() === clean && lastMsg.sender === m.sender) {
                continue;
              }
              // If system message has same text as an existing bot message, skip it
              if (m.sender === "system" && uniqueMsgs.some((prev) => prev.sender === "bot" && (prev.text || "").trim() === clean)) {
                continue;
              }
              uniqueMsgs.push(m);
            }
            return { ...s, messages: uniqueMsgs };
          });
        }
      }

      // Backward compatibility: Migrate legacy single-thread history
      const oldKey = `stech_ai_chat_history_${uid || "guest"}`;
      const oldData = localStorage.getItem(oldKey);
      if (oldData) {
        const oldMsgs = JSON.parse(oldData);
        if (Array.isArray(oldMsgs) && oldMsgs.length > 0) {
          const firstUserMsg = oldMsgs.find((m: any) => m.sender === "user")?.text;
          const initialSession: ChatSessionItem = {
            id: "ses_" + Date.now().toString(36),
            title: firstUserMsg ? generateSessionTitle(firstUserMsg) : "ការសន្ទនាពីមុន",
            createdAt: Date.now() - 3600000,
            updatedAt: Date.now(),
            lastMessage: oldMsgs[oldMsgs.length - 1]?.text || "",
            messages: oldMsgs,
          };
          return [initialSession];
        }
      }
    } catch {}
    return [];
  };

  const saveSessionsToStorage = (uid: string, sList: ChatSessionItem[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(getSessionsStorageKey(uid), JSON.stringify(sList.slice(0, 30)));
    } catch {}
  };

  // ─── Initialize Auth, User Info & Sessions ─────────────────────────────────
  useEffect(() => {
    // 0. Native Telegram Mini App Handshake & Auto-Expand
    if (typeof window !== "undefined") {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          tg.ready?.();
          tg.expand?.();
        }
      } catch (e) {}
    }

    // 1. Immediately detect if user is logged in via localStorage session or Telegram Mini App
    const initialLoggedIn = checkUserLoggedIn();
    setIsLoggedIn(initialLoggedIn);

    const handleStorageChange = () => {
      setIsLoggedIn(checkUserLoggedIn());
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
    }

    let localUser: any = null;
    try {
      const stored = typeof window !== "undefined" ? (localStorage.getItem("stech_user_session") || localStorage.getItem("user_session")) : null;
      if (stored) localUser = JSON.parse(stored);
    } catch {}

    let initialDetectedName = localUser?.name || localUser?.username || localUser?.full_name || (localUser?.email ? localUser.email.split("@")[0] : "") || "អតិថិជន";
    if (initialDetectedName && initialDetectedName !== "អតិថិជន") {
      setUserName(initialDetectedName);
      setAgentForm((prev) => ({
        ...prev,
        name: prev.name || initialDetectedName,
        email: prev.email || localUser?.email || "",
        phone: prev.phone || localUser?.phone || "",
        telegram: prev.telegram || localUser?.telegram || "",
      }));
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      const isAuthed = Boolean(user || checkUserLoggedIn());
      setIsLoggedIn(isAuthed);

      let detectedName = initialDetectedName;
      let activeChatId = getActiveCustomerChatId();
      if (user && !localUser?.id) {
        activeChatId = user.uid;
      }
      const userKey = activeChatId;
      userStorageKeyRef.current = userKey;

      if (user) {
        const fbName = user.displayName || user.email?.split("@")[0];
        if (fbName && (detectedName === "អតិថិជន" || detectedName === "បង")) {
          detectedName = fbName;
        }
      }

      // Check if user has active JWT or token to fetch latest profile
      const token = typeof window !== "undefined" ? (localStorage.getItem("token") || localStorage.getItem("customer_token")) : null;
      if (token || user) {
        try {
          const res = await api.get("/user/profile");
          if (res.data?.success && res.data.profile) {
            const p = res.data.profile;
            const realFullName = p.name || p.username || p.full_name || user?.displayName || "";
            if (realFullName) {
              detectedName = realFullName;
            }
            setAgentForm((prev) => ({
              ...prev,
              name: prev.name || realFullName,
              phone: prev.phone || p.phone || "",
              telegram: prev.telegram || p.telegram || "",
              email: prev.email || p.email || user?.email || "",
            }));
          }
        } catch {}
      }

      setUserName(detectedName);
      setChatId(activeChatId);

      // Load sessions for this user / guest
      const loadedSessions = loadAllSessions(userKey);
      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
        setActiveSessionId(loadedSessions[0].id);
        setMessages(loadedSessions[0].messages || []);
      } else {
        // Create first fresh session with greeting
        const firstSessionId = "ses_" + Date.now().toString(36);
        const greetingText = isAuthed
          ? `សួស្តីបង ${detectedName}! 👋 ខ្ញុំជា "S Tech AI" (ជំនួយការឆ្លាតវៃផ្លូវការរបស់ហាង S Tech Store)។ តើថ្ងៃនេះបងចង់សាកសួរតម្លៃ រកម៉ាស៊ីនកុំព្យូទ័រ ឬសេវាកម្មអ្វីដែរ?`
          : `សួស្តីបង! 👋 ខ្ញុំជា "S Tech AI" (ជំនួយការឆ្លាតវៃផ្លូវការរបស់ហាង S Tech Store)។\n\n🔒 ដើម្បីជជែកពិគ្រោះតម្លៃ ដំឡើង PC ឬឆាតផ្ទាល់ជាមួយ AI និងក្រុមការងារ សូមបងចូលគណនី (Login) ជាមុនសិនបាទ!\n\n💡 ប្រសិនបើបងត្រូវការជំនួយជាបន្ទាន់ បងអាចចុចប៊ូតុង "Alert ទៅបុគ្គលិក" ខាងក្រោមបានភ្លាមៗដោយមិនចាំបាច់ Login ឡើយ! 🚀`;
        const initialMsgs: ChatItem[] = [
          {
            sender: "bot",
            text: greetingText,
            senderName: "S Tech AI",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: 0,
            showGreetingButtons: true,
          },
        ];
        const newSession: ChatSessionItem = {
          id: firstSessionId,
          title: "ការសន្ទនាថ្មី",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastMessage: greetingText,
          messages: initialMsgs,
        };

        setSessions([newSession]);
        setActiveSessionId(firstSessionId);
        setMessages(initialMsgs);
        saveSessionsToStorage(userKey, [newSession]);
      }
    });

    return () => {
      unsub();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
      }
    };
  }, [checkUserLoggedIn]);

  // ─── Sync messages back to active session & LocalStorage ───────────────────
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return;

    setSessions((prev) => {
      const userUid = userStorageKeyRef.current || "guest";
      const existingIdx = prev.findIndex((s) => s.id === activeSessionId);

      let title = "ការសន្ទនាថ្មី";
      const firstUserMsg = messages.find((m) => m.sender === "user")?.text;
      if (firstUserMsg) {
        title = generateSessionTitle(firstUserMsg);
      }

      const updatedSession: ChatSessionItem = existingIdx >= 0
        ? {
            ...prev[existingIdx],
            title: prev[existingIdx].title === "ការសន្ទនាថ្មី" && firstUserMsg ? title : prev[existingIdx].title,
            updatedAt: Date.now(),
            lastMessage: messages[messages.length - 1]?.text || "",
            messages,
          }
        : {
            id: activeSessionId,
            title,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastMessage: messages[messages.length - 1]?.text || "",
            messages,
          };

      const newList = existingIdx >= 0
        ? prev.map((s, idx) => (idx === existingIdx ? updatedSession : s))
        : [updatedSession, ...prev];

      saveSessionsToStorage(userUid, newList);
      return newList;
    });
  }, [messages, activeSessionId]);

  // ─── Start New Chat Session (Gemini App Style) ─────────────────────────────
  const handleNewChat = () => {
    const isAuthed = checkUserLoggedIn();
    const newId = "ses_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
    const greetingText = isAuthed
      ? `សួស្តីបង ${userName}! 👋 ខ្ញុំជា "S Tech AI" (ជំនួយការឆ្លាតវៃផ្លូវការរបស់ហាង S Tech Store)។ តើថ្ងៃនេះបងចង់សាកសួរតម្លៃ រកម៉ាស៊ីនកុំព្យូទ័រ ឬសេវាកម្មអ្វីដែរ?`
      : `សួស្តីបង! 👋 ខ្ញុំជា "S Tech AI" (ជំនួយការឆ្លាតវៃផ្លូវការរបស់ហាង S Tech Store)។\n\n🔒 ដើម្បីជជែកពិគ្រោះតម្លៃ ដំឡើង PC ឬឆាតផ្ទាល់ជាមួយ AI និងក្រុមការងារ សូមបងចូលគណនី (Login) ជាមុនសិនបាទ!\n\n💡 ប្រសិនបើបងត្រូវការជំនួយជាបន្ទាន់ បងអាចចុចប៊ូតុង "Alert ទៅបុគ្គលិក" ខាងក្រោមបានភ្លាមៗដោយមិនចាំបាច់ Login ឡើយ! 🚀`;
    const initialMsgs: ChatItem[] = [
      {
        sender: "bot",
        text: greetingText,
        senderName: "S Tech AI",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: 0,
        showGreetingButtons: true,
      },
    ];

    const newSession: ChatSessionItem = {
      id: newId,
      title: "ការសន្ទនាថ្មី",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastMessage: greetingText,
      messages: initialMsgs,
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      saveSessionsToStorage(userStorageKeyRef.current || "guest", updated);
      return updated;
    });

    setActiveSessionId(newId);
    setMessages(initialMsgs);
    setShowHistoryDrawer(false);
    showToast("✨ បានចាប់ផ្តើមការសន្ទនាថ្មី!", "info");
  };

  // ─── Switch Chat Session ──────────────────────────────────────────────────
  const handleSelectSession = (session: ChatSessionItem) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
    setShowHistoryDrawer(false);
  };

  // ─── Delete Chat Session ──────────────────────────────────────────────────
  const handleDeleteSession = (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    const userUid = userStorageKeyRef.current || "guest";
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sid);
      saveSessionsToStorage(userUid, filtered);
      if (activeSessionId === sid) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
          setMessages(filtered[0].messages || []);
        } else {
          // If all sessions deleted, create a fresh one
          setTimeout(() => handleNewChat(), 50);
        }
      }
      return filtered;
    });
    showToast("🗑️ បានលុបការសន្ទនារួចរាល់!", "info");
  };

  // ─── Subscribe to real-time chat meta (AI Takeover / Paused status) ─────────
  useEffect(() => {
    if (!chatId) return;
    const unsub = subscribeToChatMeta(chatId, (meta) => {
      if (meta) {
        setIsAiPaused(!!meta.ai_paused);
        setPausedByStaff(meta.paused_by || "S Tech Staff");
      } else {
        setIsAiPaused(false);
        setPausedByStaff("");
      }
    });
    return () => unsub();
  }, [chatId]);

  // ─── Subscribe to real-time messages from Firebase RTDB (Both User & Staff) ───
  useEffect(() => {
    if (!chatId || !activeSessionId) return;

    const unsub = subscribeToMessages(chatId, (firebaseMsgs) => {
      if (firebaseMsgs && firebaseMsgs.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id).filter(Boolean));
          const existingSignatures = new Set(
            prev.map((m) => `${m.sender}:${(m.text || "").trim()}`)
          );

          let hasChanges = false;
          const merged = [...prev];

          for (const m of firebaseMsgs) {
            const cleanText = (m.text || "").trim();
            const senderType = m.sender === "admin" ? "staff" : m.sender;
            const sig = `${senderType}:${cleanText}`;

            const isAlreadyPresent =
              (m.id && existingIds.has(m.id)) ||
              (cleanText && existingSignatures.has(sig));

            if (isAlreadyPresent) {
              continue;
            }

            // Check if this message belongs to this customer session / live chat room
            const isForThisSession =
              !m.sessionId ||
              m.sessionId === activeSessionId ||
              isAiPaused ||
              m.sender === "admin" ||
              m.sender === "staff" ||
              m.sender === "system" ||
              (m.timestamp && Date.now() - m.timestamp < 7 * 24 * 3600 * 1000);

            if (!isForThisSession) {
              continue;
            }

            if (m.sender === "admin" || m.sender === "staff" || m.sender === "system") {
              merged.push({
                id: m.id,
                sender: m.sender === "system" ? "system" : "staff",
                senderName: m.senderName || (m.sender === "system" ? "S Tech System" : "S Tech Support"),
                text: m.text,
                timestamp: m.timestamp || Date.now(),
                time: m.timestamp
                  ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "",
              });
              if (cleanText) existingSignatures.add(sig);
              if (m.id) existingIds.add(m.id);
              hasChanges = true;
            } else if (m.sender === "user") {
              merged.push({
                id: m.id,
                sender: "user",
                senderName: m.senderName || userName || "អតិថិជន",
                text: m.text,
                image: m.image,
                images: m.images || (m.image ? [m.image] : undefined),
                timestamp: m.timestamp || Date.now(),
                time: m.timestamp
                  ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "",
              });
              if (cleanText) existingSignatures.add(sig);
              if (m.id) existingIds.add(m.id);
              hasChanges = true;
            } else if (m.sender === "bot") {
              // Restore bot replies if matching active session
              if (m.sessionId === activeSessionId) {
                merged.push({
                  id: m.id,
                  sender: "bot",
                  senderName: m.senderName || "S Tech AI",
                  text: m.text,
                  timestamp: m.timestamp || Date.now(),
                  time: m.timestamp
                    ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "",
                });
                if (cleanText) existingSignatures.add(sig);
                if (m.id) existingIds.add(m.id);
                hasChanges = true;
              }
            }
          }

          if (hasChanges) {
            merged.sort((a, b) => {
              if (a.showGreetingButtons && !b.showGreetingButtons) return -1;
              if (!a.showGreetingButtons && b.showGreetingButtons) return 1;
              return (a.timestamp || 0) - (b.timestamp || 0);
            });
            return merged;
          }
          return prev;
        });
      }
    });

    return () => unsub();
  }, [chatId, activeSessionId, isAiPaused, userName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  // Mark chat as read by user whenever ChatBot is active and messages update
  useEffect(() => {
    if (chatId) {
      markChatReadByUser(chatId).catch(() => {});
    }
  }, [chatId, messages]);

  // ─── Notify Telegram about active chat (throttled) ────────────────────────
  const triggerTelegramAlert = useCallback(
    async (firstMessageText: string) => {
      if (hasNotifiedTelegram) return;
      try {
        await api.post("/chat/request-agent", {
          chat_id: chatId || undefined,
          name: agentForm.name || userName || "Website Customer",
          email: agentForm.email || currentUser?.email || "N/A",
          phone: agentForm.phone || "N/A",
          telegram: agentForm.telegram || "N/A",
          message: `💬 [Live Chat] "${firstMessageText}"`,
          product_name: productInfo?.name || null,
          product_url: typeof window !== "undefined" ? window.location.href : "https://www.s-tech-store.tech",
        });
        setHasNotifiedTelegram(true);
      } catch (err) {
        // Silent
      }
    },
    [agentForm, userName, currentUser, productInfo, hasNotifiedTelegram, chatId]
  );

  // ─── Send Message Handler ─────────────────────────────────────────────────
  const handleSend = async (overrideText?: string) => {
    // ── Strict Login Gate: Unauthenticated users CANNOT chat with AI or Agent ──
    if (!isLoggedIn) {
      showToast("🔒 សូមចូលគណនី (Login) ជាមុនសិន ដើម្បីជជែកជាមួយ AI ឬបុគ្គលិក!", "warning");
      return;
    }

    const textToSend = (overrideText || input).trim();
    const currentImgs = [...attachedImages];
    if ((!textToSend && currentImgs.length === 0) || isAiThinking) return;

    // Rate Limit Check
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      showToast(rateCheck.reason!, "error");
      return;
    }

    // ⚡ Instant Haptic Feedback on user action
    triggerHaptic("medium");

    // Clear previews right away
    setAttachedImages([]);

    // Set contextual dynamic thinking based on user's query and attached images
    if (currentImgs.length > 0) {
      setCurrentThinkingStep({
        phase1: `📷 S Tech AI កំពុងស្កេន និងពិនិត្យរូបភាព (${currentImgs.length} សន្លឹក)...`,
        phase2: "🔍 វិភាគកូដ Error, ម៉ូឌែល Specs ឬលក្ខណៈបច្ចេកទេសក្នុងរូបភាព...",
        phase3: "✍️ កំពុងរៀបចំការពន្យល់ និងដំណោះស្រាយបច្ចេកទេសយ៉ាងក្បោះក្បាយជូនបង...",
      });
    } else {
      setCurrentThinkingStep(getContextualThinking(textToSend));
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const imgUrls = currentImgs.map((i) => i.preview || i.base64);
    const nowTs = Date.now();
    const userMsg: ChatItem = {
      sender: "user",
      text: textToSend,
      image: imgUrls[0],
      images: imgUrls,
      senderName: userName || "អតិថិជន",
      time: timeStr,
      timestamp: nowTs,
    };

    // Update UI immediately
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // 1. Sync message into Firebase Realtime Database with active sessionId
    if (chatId) {
      sendChatMessage(
        chatId,
        {
          sender: "user",
          senderName: userName || "អតិថិជន",
          text: textToSend || (imgUrls.length > 0 ? `[User uploaded ${imgUrls.length} image(s)]` : ""),
          sessionId: activeSessionId,
          productInfo: productInfo || null,
          image: imgUrls[0],
          images: imgUrls.length > 0 ? imgUrls : undefined,
        },
        {
          userName: userName || "អតិថិជន",
          userEmail: agentForm.email || currentUser?.email || undefined,
          userPhone: agentForm.phone || undefined,
          sessionId: activeSessionId,
        }
      ).catch(() => {});
    }

    // 2. Alert Telegram so staff know customer is chatting
    triggerTelegramAlert(textToSend || `[រូបភាព ${currentImgs.length} សន្លឹក]`);

    // 3. Human Takeover Check (Meta/Instagram Direct style)
    // If Admin/Staff has taken over this chat and paused AI, do NOT invoke Gemini AI!
    if (isAiPaused) {
      showToast("✓ សារត្រូវបានបញ្ជូនទៅកាន់បុគ្គលិកផ្ទាល់", "success");
      return;
    }

    setIsAiThinking(true);

    // 4. Call Gemini AI via Server-side Next.js route
    try {
      const apiPayload: any = {
        message: textToSend,
        userName: userName,
        history: messages.slice(-6),
        productInfo: productInfo || null,
        userContext: getUserContext(),
        aiPaused: isAiPaused,
      };

      if (currentImgs.length > 0) {
        apiPayload.images = currentImgs.map((i) => ({
          base64: i.base64,
          mimeType: i.file?.type || "image/jpeg",
        }));
        // Backward compatibility
        apiPayload.image = {
          base64: currentImgs[0].base64,
          mimeType: currentImgs[0].file?.type || "image/jpeg",
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `AI error status: ${res.status}`);
      }

      const aiReplyText =
        data?.reply ||
        "ប្រព័ន្ធ AI កំពុងរវល់ ឬជួបបញ្ហាបច្ចេកទេសបន្តិចបាទ! ⚙️ ដើម្បីកុំឱ្យបងរង់ចាំយូរ បងអាចចុចប៊ូតុងខាងក្រោមដើម្បីឆាតផ្ទាល់ជាមួយ Telegram Bot Assistant (@S_TECH_ASSISTANTBOT) ឬ Alert ទៅកាន់ក្រុមការងារបច្ចេកទេសរបស់ S Tech Store បានភ្លាមៗបាទ! 🚀🤝";
      const shouldSuggestAgent = !!data?.suggestAgent || !data?.reply;

      const aiMsg: ChatItem = {
        sender: "bot",
        senderName: "S Tech AI",
        text: aiReplyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now(),
        suggestAgent: shouldSuggestAgent,
      };

      setMessages((prev) => {
        const trimmed = (aiReplyText || "").trim();
        if (prev.length > 0 && (prev[prev.length - 1].text || "").trim() === trimmed) {
          return prev;
        }
        return [...prev, aiMsg];
      });

      // Also record AI reply into Firebase RTDB with sessionId (use sender: "bot", NEVER "system")
      if (chatId) {
        sendChatMessage(
          chatId,
          {
            sender: "bot",
            senderName: "S Tech AI",
            text: aiReplyText,
            sessionId: activeSessionId,
          },
          {
            userName: userName,
            sessionId: activeSessionId,
          }
        ).catch(() => {});
      }
    } catch (err) {
      // Direct client fallback if Next.js internal route was unreachable or timed out
      const lowerText = (textToSend || "").toLowerCase();
      let fallbackText = "ប្រព័ន្ធ AI កំពុងរវល់ ឬជួបបញ្ហាបច្ចេកទេសបន្តិចបាទ! ⚙️ ដើម្បីកុំឱ្យបងរង់ចាំយូរ បងអាចចុចប៊ូតុងខាងក្រោមដើម្បីឆាតផ្ទាល់ជាមួយ Telegram Bot Assistant (@S_TECH_ASSISTANTBOT) ឬ Alert ទៅកាន់ក្រុមការងារបច្ចេកទេសរបស់ S Tech Store បានភ្លាមៗបាទ! 🚀🤝";
      let shouldSuggestAgent = true;

      // Extreme rudeness / Cursing / Emotion venting defusion
      if (
        lowerText.includes("ជេរ") ||
        lowerText.includes("ចុយ") ||
        lowerText.includes("ម្រាយ") ||
        lowerText.includes("កាដួយ") ||
        lowerText.includes("ក្ដ") ||
        lowerText.includes("ឆ្កែ") ||
        lowerText.includes("ងាប់") ||
        lowerText.includes("ខឹង") ||
        lowerText.includes("ខ្វាក់") ||
        lowerText.includes("ភ្លើ") ||
        lowerText.includes("ល្ងង់") ||
        lowerText.includes("ឈ្លើយ") ||
        lowerText.includes("ឌឺ") ||
        lowerText.includes("fuck") ||
        lowerText.includes("bitch") ||
        lowerText.includes("idiot") ||
        lowerText.includes("stupid")
      ) {
        fallbackText = `អូហូយបង ${userName}! កម្ដៅឡើងកប់លើស CPU Core i9 ពេល Full Load ទៀតបង! 😂🔥 សម្រួលអារម្មណ៍បន្តិចបង អង្គុយផឹកកាហ្វេ ឬតែក្រូចឆ្មាត្រជាក់ៗមួយកែវសិនមក កុំទាន់ក្តៅក្រហាយណា៎ ទុកឱ្យអូន S Tech AI ជួយសម្រួលជូនបងវិញ! ☕🎮 ជេរអូនបានបង តែហាមខឹងបោកទូរស័ព្ទណា៎ ប្រយ័ត្នអស់លុយទិញថ្មី ទុកលុយមកដំឡើង RTX 4080 លេងហ្គេមជាមួយអូនវិញអេមជាង! ឥឡូវបងចង់ឱ្យអូនជួយរឿង Laptop, PC, គ្រឿងបន្លាស់ ឬឆែក Order អីដែរ និយាយមកបង អូនជួយអស់ពីចិត្ត ១០០% ហ្មង! 💻✨`;
        shouldSuggestAgent = false;
      } else if (
        lowerText.includes("មានន័យ") ||
        lowerText.includes("voucher") ||
        lowerText.includes("welcome") ||
        lowerText.includes("កាដូ") ||
        lowerText.includes("5") ||
        lowerText.includes("gift") ||
        lowerText.includes("welcome5")
      ) {
        fallbackText = `បាទបង ${userName}! រូបភាពនេះគឺជារង្វាន់ "កាដូស្វាគមន៍ $5.00 Voucher (WELCOME5)" សម្រាប់អតិថិជនថ្មីរបស់ S Tech Store បាទ! 🎁✨\n\n• មានន័យថា៖ បងទទួលបានទឹកប្រាក់បញ្ចុះតម្លៃ $5.00 ភ្លាមៗ (ឥតគិតថ្លៃ) លើរាល់ការទិញ Laptop, PC builds ឬគ្រឿងបន្លាស់ IT គ្រប់ប្រភេទ 💻💳\n• របៀបដោះសោ និងប្រើប្រាស់៖\n  1. ចុចប៊ូតុង Share ទៅ Telegram, Facebook ឬចុច "Copy Link" ផ្ញើទៅមិត្តភក្តិ ដើម្បីដោះសោរប៊ូតុង "Claim $5"\n  2. ចុច Claim យក Voucher រួចបំពេញកូដ WELCOME5 នៅទំព័រ Checkout នោះប្រព័ន្ធនឹងបញ្ចុះតម្លៃ $5.00 ជូនភ្លាមៗបាទ! 🚀🤝`;
        shouldSuggestAgent = false;
      } else {
        try {
          const decodedFallback = typeof atob !== "undefined"
            ? atob("QVEuQWI4Uk42Snc5NDRoRnNuTHhyMWVsUUtiR0JLYzkxNnhCTjRYNmR0R3M1cmQxdzhjWVE=")
            : "";
          const primaryKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || decodedFallback;
          if (primaryKey) {
            const directCtrl = new AbortController();
            const directTimeout = setTimeout(() => directCtrl.abort(), 4000);
            const directParts: any[] = [];
            for (const img of currentImgs.slice(0, 3)) {
              const cleanB64 = img.base64.replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, "");
              directParts.push({
                inlineData: {
                  mimeType: img.file?.type || "image/jpeg",
                  data: cleanB64,
                },
              });
            }
            directParts.push({ text: textToSend || "សូមជួយវិភាគរូបភាពនេះឱ្យខ្ញុំបន្តិចបាទ" });

            const directRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${primaryKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ role: "user", parts: directParts }] }),
                signal: directCtrl.signal,
              }
            );
            clearTimeout(directTimeout);
            if (directRes.ok) {
              const directData = await directRes.json();
              const fbText = directData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (fbText) {
                fallbackText = fbText.trim();
                shouldSuggestAgent = false;
              }
            }
          }
        } catch {
          // Keep instant fallback
        }
      }

      // Graceful fallback — Never show technical error!
      const fallbackMsg: ChatItem = {
        sender: "bot",
        senderName: "S Tech AI",
        text: fallbackText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestAgent: shouldSuggestAgent,
      };
      setMessages((prev) => {
        const trimmed = (fallbackMsg.text || "").trim();
        if (prev.length > 0 && (prev[prev.length - 1].text || "").trim() === trimmed) {
          return prev;
        }
        return [...prev, fallbackMsg];
      });
    } finally {
      setIsAiThinking(false);
      triggerHapticNotification("success");
    }
  };

  // ─── Instant Local-First Static FAQ Click Handler (Sub-50ms Response) ────────
  const handleStaticPromptClick = (item: (typeof STATIC_SYSTEM_PROMPTS)[number]) => {
    triggerHaptic("medium");

    if (item.isAgent) {
      // Guests are explicitly allowed to alert staff!
      setShowAgentModal(true);
      return;
    }

    if (!item.text) return;

    // Check if we have an instant official local FAQ response
    const instantAnswer = STATIC_FAQ_ANSWERS[item.text];

    if (instantAnswer) {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const nowTs = Date.now();

      // 1. Instantly display user question
      const userMsg: ChatItem = {
        sender: "user",
        text: item.text,
        senderName: userName || "អតិថិជន",
        time: timeStr,
        timestamp: nowTs,
      };

      // 2. Instantly prepare bot answer
      const botMsg: ChatItem = {
        sender: "bot",
        senderName: "S Tech AI",
        text: instantAnswer,
        time: timeStr,
        timestamp: nowTs + 50,
        suggestAgent: false,
      };

      // Update UI state with both messages in lightning speed (< 50ms)
      setMessages((prev) => [...prev, userMsg, botMsg]);

      // 3. Non-blocking Firebase sync if customer has a live room
      if (chatId) {
        sendChatMessage(
          chatId,
          {
            sender: "user",
            senderName: userName || "អតិថិជន",
            text: item.text,
            sessionId: activeSessionId,
          },
          { userName: userName || "អតិថិជន", sessionId: activeSessionId }
        ).catch(() => {});

        setTimeout(() => {
          sendChatMessage(
            chatId,
            {
              sender: "bot",
              senderName: "S Tech AI",
              text: instantAnswer,
              sessionId: activeSessionId,
            },
            { userName: userName || "អតិថិជន", sessionId: activeSessionId }
          ).catch(() => {});
        }, 80);
      }

      triggerHaptic("light");
      return;
    }

    // Fallback to standard send (with login check for custom server prompts)
    if (!isLoggedIn) {
      showToast("🔒 សូមចូលគណនី (Login) ជាមុនសិន ដើម្បីជជែកជាមួយ AI ឬបុគ្គលិក!", "warning");
      return;
    }

    handleSend(item.text);
  };

  // ─── Human Agent Telegram Alert Submission ────────────────────────────────
  const handleRequestAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentForm.message.trim() && !input.trim()) {
      alert("សូមសរសេរសំណួរ ឬព័ត៌មានដែលបងចង់សាកសួរក្រុមការងារបន្តិចបាទ!");
      return;
    }

    setIsSendingAgentReq(true);
    try {
      // Send Telegram alert
      await api.post("/chat/request-agent", {
        chat_id: chatId || undefined,
        name: agentForm.name || userName || "Website Visitor",
        email: agentForm.email || currentUser?.email || "N/A",
        phone: agentForm.phone || "N/A",
        telegram: agentForm.telegram || "N/A",
        message: agentForm.message || input || "អតិថិជនស្នើសុំជជែកផ្ទាល់ជាមួយក្រុមការងារ",
        product_name: productInfo?.name || null,
        product_url: typeof window !== "undefined" ? window.location.href : "https://www.s-tech-store.tech",
      });

      // Write system log to RTDB
      if (chatId) {
        sendChatMessage(
          chatId,
          {
            sender: "system",
            senderName: "Alert",
            text: `🚨 Human Agent Requested: ${agentForm.name || "Customer"} (${
              agentForm.phone || agentForm.email || "No contact"
            }). Note: "${agentForm.message || input}"`,
          },
          {
            userName: agentForm.name || userName,
            userEmail: agentForm.email || currentUser?.email || undefined,
            userPhone: agentForm.phone || undefined,
          }
        ).catch(() => {});
      }

      setAgentReqSent(true);
      setShowAgentModal(false);

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          sender: "system",
          text: `🔔 បាន Alert ទៅកាន់ក្រុមការងារហាង S Tech Store រួចរាល់ហើយ! បុគ្គលិកផ្នែកបម្រើអតិថិជននឹងឆ្លើយតប ឬទាក់ទងមកបងក្នុងពេលឆាប់ៗនេះ។`,
          time: timeStr,
        },
      ]);
      showToast("✅ បាន Alert ទៅកាន់ក្រុមការងារបច្ចេកទេសរួចរាល់!", "success");
    } catch (err) {
      showToast("បានបញ្ជូនសំណើទៅកាន់ប្រព័ន្ធរួចរាល់!", "info");
      setShowAgentModal(false);
    } finally {
      setIsSendingAgentReq(false);
    }
  };

  // Current active session title
  const currentSession = sessions.find((s) => s.id === activeSessionId);
  const currentTitle = currentSession?.title || "ការសន្ទនាថ្មី";

  // Filter sessions by search
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    (s.lastMessage && s.lastMessage.toLowerCase().includes(sessionSearch.toLowerCase()))
  );

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-white dark:bg-[#0c0d12] text-gray-900 dark:text-gray-100 w-full overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* ── Toast Notifications ──────────────────────────────────────────────── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg text-white flex items-center gap-2 ${
                toast.type === "error"
                  ? "bg-red-600"
                  : toast.type === "warning"
                  ? "bg-amber-500"
                  : toast.type === "success"
                  ? "bg-emerald-600"
                  : "bg-gray-800"
              }`}
            >
              {toast.type === "error" && <AlertCircle size={15} />}
              {toast.type === "warning" && <Clock size={15} />}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div
        className="bg-white dark:bg-[#12151e] px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between shadow-sm flex-shrink-0"
        style={{ paddingTop: "calc(12px + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* History / Sessions Drawer Button (Gemini App Style) */}
          <button
            onClick={() => setShowHistoryDrawer(true)}
            title="មើលប្រវត្តិការសន្ទនា (Chat Sessions)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer border border-gray-200/50 dark:border-white/5 shrink-0"
          >
            <History size={15} className="text-[#8B1A1A] dark:text-red-400" />
            <span className="hidden sm:inline">Sessions</span>
            <span className="w-5 h-5 rounded-full bg-[#8B1A1A] text-white text-[10px] flex items-center justify-center font-mono">
              {sessions.length}
            </span>
          </button>

          {/* Official S-Tech Logo & Bot Badge */}
          <div className="relative shrink-0">
            <img
              src="/logo.jpg"
              alt="S Tech Store"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover shadow-sm border border-gray-200 dark:border-white/15"
            />
            <div className="w-4 h-4 rounded-full bg-[#8B1A1A] absolute -bottom-1 -right-1 flex items-center justify-center text-white text-[9px] shadow-sm border border-white dark:border-[#12151e]">
              <Sparkles size={9} />
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 border-2 border-white dark:border-[#12151e] animate-pulse" />
          </div>

          <div className="truncate min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-[13.5px] sm:text-[15px] leading-tight truncate">
                {isAiPaused ? (pausedByStaff || "Live Staff Support") : "S Tech AI"}
              </h3>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 shadow-xs ${
                isAiPaused 
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white" 
                  : "bg-gradient-to-r from-red-600 to-[#8B1A1A] text-white"
              }`}>
                {isAiPaused ? "LIVE AGENT" : "PRO INTEL"}
              </span>
              {!isLoggedIn && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/40 shrink-0 flex items-center gap-1">
                  <Lock size={9} />
                  <span>Guest</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
              <MessageSquare size={10} className={`shrink-0 ${isAiPaused ? "text-emerald-500" : "text-emerald-500"}`} />
              <span className="truncate">{isAiPaused ? `👤 ជជែកផ្ទាល់ជាមួយ ${pausedByStaff || "បុគ្គលិក"}` : isAiThinking ? "⚡ កំពុងវិភាគឆ្លើយតប..." : currentTitle}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* New Chat Button (+) */}
          <button
            onClick={handleNewChat}
            title="ចាប់ផ្តើមការសន្ទនាថ្មី (+ New Chat)"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer border border-gray-200/40 dark:border-white/5"
          >
            <Plus size={14} className="text-[#8B1A1A] dark:text-red-400" />
            <span className="hidden md:inline">New Chat</span>
          </button>

          {/* Alert to Staff Button (Always available for Guests & Users) */}
          <button
            onClick={() => setShowAgentModal(true)}
            title="Alert / ទាក់ទងបុគ្គលិក"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-[#8B1A1A] dark:text-red-400 text-xs font-bold hover:bg-[#8B1A1A] hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <BellRing size={13} className="animate-pulse" />
            <span className="hidden xs:inline">Alert បុគ្គលិក</span>
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Human Takeover Live Banner (Meta/Instagram Direct Style) ────────── */}
      {isAiPaused && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span>👤 {pausedByStaff || "ក្រុមការងារ S Tech"} កំពុងឆ្លើយតបផ្ទាល់ (AI ត្រូវបានផ្អាកបណ្តោះអាសន្ន)</span>
          </div>
          <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
            Live Staff Active
          </span>
        </div>
      )}

      {/* ── Product Banner (if opened from product details) ─────────────────── */}
      {productInfo?.name && (
        <div className="bg-gradient-to-r from-red-50/90 via-white to-gray-50 dark:from-[#191d29] dark:via-[#141722] dark:to-[#12151e] border-b border-gray-100 dark:border-white/5 px-4 py-2 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2 truncate pr-2">
            {productInfo.image && (
              <img
                src={productInfo.image}
                alt=""
                className="w-7 h-7 object-contain rounded bg-white p-0.5 border"
              />
            )}
            <span className="font-bold text-gray-800 dark:text-gray-200 truncate">
              {productInfo.name}
            </span>
            {productInfo.price && (
              <span className="font-mono text-[#8B1A1A] dark:text-red-400 font-extrabold shrink-0">
                ${productInfo.price}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              if (!isLoggedIn) {
                showToast("🔒 សូមចូលគណនី (Login) ជាមុនសិន ដើម្បីជជែកសួរនាំ!", "warning");
                return;
              }
              handleSend(`សួស្តី! ខ្ញុំចង់សួរពីតម្លៃ និងព័ត៌មានបន្ថែមនៃ ${productInfo.name}`);
            }}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold shrink-0 cursor-pointer"
          >
            សួរពីទំនិញនេះ
          </button>
        </div>
      )}

      {/* ── Messages Thread ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-gray-50/50 dark:bg-[#0c0d12]">
        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`flex flex-col ${
              msg.sender === "user"
                ? "items-end"
                : msg.sender === "system"
                ? "items-center"
                : "items-start"
            }`}
          >
            {msg.sender === "user" ? (
              // User Bubble
              <div className="flex flex-col items-end max-w-[88%] sm:max-w-[75%]">
                {/* ── Multi-image Uploads (Limit 3 images) ── */}
                {((msg.images && msg.images.length > 0) || msg.image) && (
                  <div
                    className={`mb-2 grid gap-1.5 ${
                      (msg.images?.length || 1) === 1
                        ? "grid-cols-1 max-w-[240px]"
                        : (msg.images?.length || 1) === 2
                        ? "grid-cols-2 max-w-[280px]"
                        : "grid-cols-3 max-w-[320px]"
                    }`}
                  >
                    {(msg.images && msg.images.length > 0 ? msg.images : [msg.image!]).map((imgSrc, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={() => setPreviewZoomImage(imgSrc)}
                        className="relative group rounded-xl overflow-hidden border border-red-500/30 bg-black/10 dark:bg-white/5 cursor-pointer shadow-sm aspect-square"
                      >
                        <img
                          src={imgSrc}
                          alt={`Upload ${imgIdx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-bold bg-black/70 px-2 py-0.5 rounded-full transition-opacity">
                            ពង្រីក
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {msg.text && (
                  <div className="p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white rounded-tr-sm">
                    {msg.text}
                  </div>
                )}
                {msg.time && (
                  <span className="text-[10px] text-gray-400 mt-1 font-medium pr-1 flex items-center gap-1">
                    <CheckCheck size={11} className="text-blue-400" />
                    {msg.time}
                  </span>
                )}
              </div>
            ) : msg.sender === "system" ? (
              // System Message / Staff Takeover Announcement
              <div className="my-2 max-w-[92%] sm:max-w-[85%] mx-auto w-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-[#111e19] dark:to-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-center">{msg.text}</span>
                </div>
              </div>
            ) : msg.sender === "staff" ? (
              // Live Human Staff Reply (Instagram / Support style)
              <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-[75%]">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                  <Headphones size={15} />
                </div>
                <div className="flex flex-col items-start gap-1 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      {msg.senderName || "S Tech Support"}
                    </span>
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                      Live Staff
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm bg-white dark:bg-[#151922] text-gray-900 dark:text-white rounded-tl-sm border border-emerald-200/50 dark:border-emerald-800/30 w-full">
                    <FormattedMessageText text={msg.text} />
                    {msg.time && (
                      <div className="text-[10px] mt-1 text-right font-medium text-gray-400">
                        {msg.time}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // AI Bot Message with Logo Avatar
              <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-[75%]">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mt-0.5 border border-gray-200 dark:border-white/10 shadow-xs bg-white">
                  <img src="/logo.jpg" alt="AI" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col items-start gap-1 flex-1">
                  <div className="p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm bg-white dark:bg-[#151922] text-gray-800 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-white/5 w-full">
                    <FormattedMessageText text={msg.text} />
                    {msg.time && (
                      <div className="text-[10px] mt-1 text-right font-medium text-gray-400">
                        {msg.time}
                      </div>
                    )}
                  </div>

                  {/* ── Action Suggestion Buttons on Greeting ── */}
                  {msg.showGreetingButtons && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 w-full">
                      {isLoggedIn ? (
                        <>
                          <button
                            onClick={() => setShowAgentModal(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white text-xs font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer"
                          >
                            <Headphones size={13} />
                            <span>ទាក់ទងទៅក្រុមការងារកាន់ផ្នែកឆាតភ្លាមៗ</span>
                          </button>

                          <button
                            onClick={() => {
                              inputRef.current?.focus();
                              handleSend("សួស្តី! ខ្ញុំចង់សួរព័ត៌មានផលិតផល និងតម្លៃប្រូម៉ូសិនបន្តិច");
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer border border-gray-200/50 dark:border-white/5"
                          >
                            <MessageCircle size={13} />
                            <span>ឆាតសួរព័ត៌មានបន្ថែមនៅទីនេះ</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Unauthenticated / Guest: Allowed to Alert Staff, Login, or chat via Telegram Bot */}
                          <button
                            onClick={() => setShowAgentModal(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white text-xs font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer active:scale-95"
                          >
                            <BellRing size={13} className="animate-pulse" />
                            <span>📢 Alert ទៅបុគ្គលិក (Alert Staff)</span>
                          </button>

                          <button
                            onClick={() => router.push(`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 text-gray-900 dark:text-white text-xs font-bold transition-all cursor-pointer border border-gray-300 dark:border-white/20 active:scale-95 shadow-xs"
                          >
                            <LogIn size={13} />
                            <span>ចូលគណនី (Login) ដើម្បីឆាត</span>
                          </button>

                          <a
                            href="https://t.me/S_TECH_ASSISTANTBOT"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                          >
                            <Send size={13} />
                            <span>ឆាត Telegram Bot (@S_TECH_ASSISTANTBOT)</span>
                          </a>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Interactive Live Human Support Card when AI suggests agent or Error occurs ── */}
                  {msg.suggestAgent && (
                    <div className="pt-2 w-full animate-in fade-in slide-in-from-bottom-2">
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-50/90 via-white to-amber-50/60 dark:from-[#19141d] dark:via-[#131620] dark:to-[#17141f] border border-red-200/90 dark:border-red-900/50 shadow-sm flex flex-col gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 text-white flex items-center justify-center text-sm font-black shadow-xs shrink-0 mt-0.5">
                            <Headphones size={16} />
                          </div>
                          <div>
                            <h5 className="text-xs sm:text-[13px] font-black text-gray-900 dark:text-white">
                              ត្រូវការជំនួយផ្ទាល់ ឬប្រព័ន្ធ AI ជួបបញ្ហា?
                            </h5>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                              បងអាចឆាតផ្ទាល់ជាមួយ Telegram Bot Assistant ផ្លូវការ ឬ Alert ទៅបុគ្គលិកបច្ចេកទេស S Tech Store បានភ្លាមៗ៖
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {/* Direct to Real Telegram Assistant Bot (@S_TECH_ASSISTANTBOT) */}
                          <a
                            href="https://t.me/S_TECH_ASSISTANTBOT"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                          >
                            <Send size={14} />
                            <span>ឆាត Telegram Bot (@S_TECH_ASSISTANTBOT)</span>
                          </a>

                          {/* Alert to Staff Button */}
                          <button
                            type="button"
                            onClick={() => setShowAgentModal(true)}
                            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-red-600 hover:to-[#8B1A1A] text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                          >
                            <BellRing size={14} />
                            <span>📢 Alert ទៅបុគ្គលិកហាង</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── HIGH-TECH S TECH AI LIVE THINKING HUD ── */}
        {isAiThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-2.5 max-w-[95%] sm:max-w-[85%] my-2"
          >
            {/* Glowing S-Tech Tech Avatar */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B1A1A] via-red-600 to-amber-500 p-[1.5px] shrink-0 mt-0.5 shadow-md">
              <div className="w-full h-full bg-white dark:bg-[#0c0d12] rounded-[10px] flex items-center justify-center text-[#8B1A1A] dark:text-red-400">
                <Zap size={15} className="animate-pulse" />
              </div>
            </div>

            {/* Thinking HUD Box */}
            <div className="flex-1 bg-gradient-to-br from-red-50/70 via-slate-50/70 to-amber-50/50 dark:from-[#181216] dark:via-[#13151f] dark:to-[#17141f] rounded-2xl rounded-tl-sm p-3.5 border border-red-500/25 dark:border-red-500/30 shadow-md relative overflow-hidden backdrop-blur-sm">
              {/* Header with timer and live pulsing badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A] dark:bg-red-500 animate-ping absolute" />
                    <span className="w-2 h-2 rounded-full bg-[#8B1A1A] dark:bg-red-500 relative" />
                  </div>
                  <span className="font-extrabold text-xs bg-gradient-to-r from-[#8B1A1A] via-red-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-1">
                    <span>S Tech AI Core</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">({thinkingSeconds.toFixed(1)}s)</span>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-900/40">
                  {thinkingSeconds < 1.8 ? "⚡ Phase 1/3" : thinkingSeconds < 3.8 ? "🔍 Phase 2/3" : "✨ Phase 3/3"}
                </span>
              </div>

              {/* Progressive 3-Step Flow Indicators */}
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center transition-all ${
                  thinkingSeconds >= 0 ? "bg-[#8B1A1A] text-white shadow-xs" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                }`}>
                  1. វិភាគសំណួរ
                </div>
                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center transition-all ${
                  thinkingSeconds >= 1.8 ? "bg-[#8B1A1A] text-white shadow-xs" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                }`}>
                  2. ទិន្នន័យហាង
                </div>
                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center transition-all ${
                  thinkingSeconds >= 3.8 ? "bg-emerald-600 text-white shadow-xs" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                }`}>
                  3. រៀបចំចម្លើយ
                </div>
              </div>

              {/* Dynamic Contextual Thought Text */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-red-100 dark:border-white/10 text-[12px] text-gray-800 dark:text-gray-200">
                <div className="flex items-start gap-2">
                  <Sparkles size={14} className="text-[#8B1A1A] dark:text-red-400 shrink-0 mt-0.5 animate-spin [animation-duration:4s]" />
                  <span className="leading-relaxed font-medium">
                    {thinkingSeconds < 1.8
                      ? currentThinkingStep?.phase1 || "⚡ S Tech AI កំពុងវិភាគសំណួររបស់បងយ៉ាងយកចិត្តទុកដាក់..."
                      : thinkingSeconds < 3.8
                      ? currentThinkingStep?.phase2 || "🔍 កំពុងស្វែងរកទិន្នន័យស្តុក ព័ត៌មានបច្ចេកវិទ្យា និងតម្លៃផ្លូវការ..."
                      : currentThinkingStep?.phase3 || "✍️ កំពុងផ្ទៀងផ្ទាត់ និងរៀបចំចម្លើយយ៉ាងក្បោះក្បាយជូនបង..."}
                  </span>
                </div>

                {/* Entertaining Live Context / Tip if server takes a moment */}
                {thinkingSeconds >= 3.0 && (
                  <div className="mt-1 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 animate-in fade-in">
                    <Clock size={12} className="shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
                    <span>💡 <b>គន្លឹះ៖</b> ហាងមានសេវាដឹកជូនឥតគិតថ្លៃសម្រាប់ការកុម្ម៉ង់ $50+ និងធានាផ្លូវការ ១-៣ ឆ្នាំ!</span>
                  </div>
                )}

                {/* Animated Progressive HUD Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-2 relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#8B1A1A] via-red-500 to-amber-500 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(96, Math.max(15, (thinkingSeconds / 4.5) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Static Quick System Prompts Bar ──────────────────────────────────── */}
      <div className="bg-gray-50/95 dark:bg-[#10131c] px-3 py-2 border-t border-gray-100 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
        <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0 pl-1 flex items-center gap-1">
          <Sparkles size={11} className="text-[#8B1A1A] dark:text-red-400" />
          <span>សំណួរពេញនិយម:</span>
        </span>
        {STATIC_SYSTEM_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleStaticPromptClick(item)}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-white/10 hover:bg-red-50 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 hover:text-[#8B1A1A] dark:hover:text-red-400 text-[11px] font-bold border border-gray-200/60 dark:border-white/10 shadow-xs shrink-0 transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Multimodal Image Preview Strip (Max 3 Images) ───────────────────── */}
      {attachedImages.length > 0 && (
        <div className="px-3.5 py-2.5 bg-gray-50/95 dark:bg-[#151924] border-t border-gray-100 dark:border-white/10 flex items-center justify-between flex-shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {attachedImages.map((img, idx) => (
              <div
                key={img.id}
                className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-red-500/40 dark:border-red-500/60 shadow-xs shrink-0 group"
              >
                <img src={img.preview} alt={`preview ${idx}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0.5 left-0.5 px-1 py-0.2 bg-black/70 text-[9px] font-bold text-white rounded">
                  {idx + 1}/3
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachedImage(img.id)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/75 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="លុបរូបភាពនេះ"
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {attachedImages.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-red-500 text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex flex-col items-center justify-center text-[10px] font-bold shrink-0 transition-colors cursor-pointer gap-0.5"
                title="ភ្ជាប់រូបភាពបន្ថែម (អតិបរមា ៣ សន្លឹក)"
              >
                <Plus size={15} />
                <span>ថែមរូប</span>
              </button>
            )}
          </div>

          <div className="flex flex-col items-end pl-2 shrink-0">
            <span className="text-[11px] font-extrabold text-[#8B1A1A] dark:text-red-400">
              {attachedImages.length}/3 រូបភាព
            </span>
            <button
              type="button"
              onClick={() => {
                attachedImages.forEach((i) => URL.revokeObjectURL(i.preview));
                setAttachedImages([]);
              }}
              className="text-[10px] text-gray-500 hover:text-red-600 dark:hover:text-red-400 font-semibold cursor-pointer underline"
            >
              លុបទាំងអស់
            </button>
          </div>
        </div>
      )}

      {/* ── Input Area OR Unauthenticated Guest Lock Bar ── */}
      {isLoggedIn ? (
        <div
          className="bg-white dark:bg-[#12151e] border-t border-gray-100 dark:border-white/10 p-3 flex items-center gap-2 sm:gap-2.5 flex-shrink-0"
          style={{ paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={() => setShowAgentModal(true)}
            title="ទាក់ទង Human Agent"
            className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center hover:bg-[#8B1A1A] hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <Headphones size={18} />
          </button>

          {/* Hidden File Input for Image Attachment (up to 3 images) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Multimodal Screenshot / Specs Image Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="ភ្ជាប់រូបភាព (អតិបរមា ៣ សន្លឹកសម្រាប់វិភាគ Specs ឬ Error)"
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors shrink-0 cursor-pointer"
            >
              <ImageIcon size={18} />
            </button>
            {attachedImages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs pointer-events-none">
                {attachedImages.length}
              </span>
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={
              isAiPaused
                ? `វាយសារទៅកាន់ ${pausedByStaff || "បុគ្គលិកផ្ទាល់"}... (AI ត្រូវបានផ្អាក)`
                : attachedImages.length > 0
                ? "សួរសំណួរអំពីរូបភាពដែលបានភ្ជាប់ ឬចុចផ្ញើ..."
                : "សួរសំណួរ ឬតម្លៃ Laptop, PC, សេវាកម្ម..."
            }
            className="flex-1 bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/10 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50 text-[14px] text-gray-900 dark:text-white"
          />

          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && attachedImages.length === 0) || (isAiThinking && !isAiPaused)}
            title="ផ្ញើសារ"
            className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <div
          className="bg-white dark:bg-[#12151e] border-t border-gray-200/80 dark:border-white/10 p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 flex-shrink-0 shadow-lg"
          style={{ paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Lock size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                  🔒 មិនទាន់ Login
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  ភ្ញៀវ (Guest)
                </span>
              </div>
              <p className="text-[12.5px] text-gray-700 dark:text-gray-300 font-semibold truncate mt-0.5">
                សូម Login ដើម្បីជជែកជាមួយ AI ឬបុគ្គលិកផ្ទាល់
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* ALERT TO STAFF BUTTON — Guest can always click this! */}
            <button
              type="button"
              onClick={() => setShowAgentModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white text-xs font-bold shadow-sm hover:from-red-600 hover:to-[#8B1A1A] transition-all cursor-pointer active:scale-95"
            >
              <BellRing size={14} className="animate-pulse" />
              <span>📢 Alert ទៅបុគ្គលិក</span>
            </button>

            {/* LOGIN BUTTON */}
            <button
              type="button"
              onClick={() => router.push(`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <LogIn size={14} />
              <span>ចូលគណនី (Login)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── GEMINI APP STYLE CHAT SESSIONS DRAWER ────────────────────────────── */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <div className="fixed inset-0 z-[150] flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Slide-out Drawer Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-xs sm:max-w-sm bg-white dark:bg-[#12151e] h-full shadow-2xl flex flex-col border-r border-gray-100 dark:border-white/10 z-10"
            >
              {/* Drawer Header */}
              <div
                className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between"
                style={{ paddingTop: "calc(16px + env(safe-area-inset-top))" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B1A1A] via-red-600 to-amber-500 p-[1.5px] shadow-sm">
                    <div className="w-full h-full bg-white dark:bg-[#12151e] rounded-[10px] flex items-center justify-center text-[#8B1A1A] dark:text-red-400">
                      <Zap size={15} />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                      S Tech AI Sessions
                    </h4>
                    <span className="text-[11px] text-gray-400">ប្រវត្តិការសន្ទនា ({sessions.length})</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* New Chat Button CTA */}
              <div className="p-3">
                <button
                  onClick={handleNewChat}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  <span>ចាប់ផ្តើមការសន្ទនាថ្មី (+ New Chat)</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-3 py-2 rounded-xl border border-transparent dark:border-white/10 text-xs">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    placeholder="ស្វែងរកប្រវត្តិឆាត..."
                    className="bg-transparent outline-none flex-1 text-gray-900 dark:text-white"
                  />
                  {sessionSearch && (
                    <button onClick={() => setSessionSearch("")} className="text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                    <span>មិនមានប្រវត្តិការសន្ទនាណាត្រូវគ្នានឹងការស្វែងរកឡើយ</span>
                  </div>
                ) : (
                  filteredSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session)}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col gap-1 ${
                          isActive
                            ? "bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 shadow-xs"
                            : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {isActive ? (
                              <span className="w-2 h-2 rounded-full bg-[#8B1A1A] dark:text-red-400 shrink-0" />
                            ) : (
                              <MessageSquare size={13} className="text-gray-400 shrink-0" />
                            )}
                            <h5 className={`font-bold text-xs truncate ${isActive ? "text-[#8B1A1A] dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                              {session.title}
                            </h5>
                          </div>

                          {/* Delete Session Button */}
                          <button
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            title="លុបការសន្ទនានេះ"
                            className="opacity-60 group-hover:opacity-100 hover:text-red-600 p-1 rounded-md transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {session.lastMessage && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate pl-4">
                            {session.lastMessage}
                          </p>
                        )}

                        <span className="text-[9.5px] text-gray-400 pl-4 font-mono">
                          {new Date(session.updatedAt || session.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })} • {new Date(session.updatedAt || session.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer with User Info */}
              <div
                className="p-3 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between"
                style={{ paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}
              >
                <span>គណនី: <strong className="text-gray-800 dark:text-gray-200">{userName}</strong></span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  Synced Local/Cloud
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Live Agent Request Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showAgentModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#151922] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-white/10 relative"
            >
              <button
                onClick={() => setShowAgentModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-md">
                  <BellRing size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    📢 Alert ទៅកាន់ក្រុមការងារហាង (Alert Staff)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    សម្រាប់បងៗដែលមិនទាន់បាន Login ឬចង់ឱ្យបុគ្គលិកទាក់ទងមកវិញជាបន្ទាន់ សំណើនេះនឹង Alert ទៅក្រុមការងារភ្លាមៗ! 🚀
                  </p>
                </div>
              </div>

              <form onSubmit={handleRequestAgentSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                    ឈ្មោះរបស់អ្នក / Name
                  </label>
                  <input
                    type="text"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                    placeholder="ឧទាហរណ៍: សុខា"
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                      លេខទូរស័ព្ទ / Phone
                    </label>
                    <input
                      type="text"
                      value={agentForm.phone}
                      onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                      placeholder="012 345 678"
                      className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Telegram Username
                    </label>
                    <input
                      type="text"
                      value={agentForm.telegram}
                      onChange={(e) => setAgentForm({ ...agentForm, telegram: e.target.value })}
                      placeholder="@username"
                      className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Email (ប្រសិនបើមាន)
                  </label>
                  <input
                    type="email"
                    value={agentForm.email}
                    onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                    សំណួរ ឬបញ្ហាដែលចង់ឱ្យជួយ / Message
                  </label>
                  <textarea
                    rows={3}
                    value={agentForm.message}
                    onChange={(e) => setAgentForm({ ...agentForm, message: e.target.value })}
                    placeholder="រៀបរាប់ពីអ្វីដែលបងចង់ឱ្យក្រុមការងារជួយ..."
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none resize-none text-gray-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAgentModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    បិទ
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingAgentReq}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white text-xs font-bold hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                  >
                    {isSendingAgentReq ? (
                      <span>កំពុង Alert ទៅក្រុមការងារ...</span>
                    ) : (
                      <>
                        <BellRing size={14} className="animate-pulse" />
                        <span>Alert ទៅបុគ្គលិកហាងឥឡូវនេះ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Image Lightbox / Fullscreen Zoom Modal ────────────────────────────── */}
      <AnimatePresence>
        {previewZoomImage && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewZoomImage(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-4xl max-h-[90vh] z-10 flex flex-col items-center"
            >
              <img
                src={previewZoomImage}
                alt="Zoomed view"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <button
                type="button"
                onClick={() => setPreviewZoomImage(null)}
                className="mt-3 px-5 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
              >
                <X size={15} />
                <span>បិទផ្ទាំងរូបភាព</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
