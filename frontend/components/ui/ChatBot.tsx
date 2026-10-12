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
  Phone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import api from "@/lib/api";
import { 
  getOrCreateVisitorId, 
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

  // ─── Live Thinking Timer ──────────────────────────────────────────────────
  useEffect(() => {
    let interval: any;
    if (isAiThinking) {
      setThinkingSeconds(0);
      interval = setInterval(() => {
        setThinkingSeconds((prev) => +(prev + 0.1).toFixed(1));
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
      const data = localStorage.getItem(getSessionsStorageKey(uid)) || localStorage.getItem(`stech_gemini_sessions_${uid || "guest"}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Clean up any historical leaks: deduplicate messages by sender & text
          return parsed.map((s: ChatSessionItem) => {
            if (!Array.isArray(s.messages)) return s;
            const seen = new Set<string>();
            const uniqueMsgs = s.messages.filter((m) => {
              const k = `${m.sender}_${m.text}_${m.time || ""}`;
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            });
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
    // 1. Immediately detect if user is logged in via localStorage session
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

      let detectedName = initialDetectedName;
      let activeChatId = localUser?.id ? `user_${localUser.id}` : (user ? user.uid : getOrCreateVisitorId());
      const userKey = localUser?.id ? `user_${localUser.id}` : (user ? user.uid : "guest");

      if (user) {
        activeChatId = user.uid;
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
        const greetingText = `សួស្តីបង ${detectedName}! 👋 ខ្ញុំជា "S Tech AI" (ជំនួយការឆ្លាតវៃផ្លូវការរបស់ហាង S Tech Store)។ តើថ្ងៃនេះបងចង់សាកសួរតម្លៃ រកម៉ាស៊ីនកុំព្យូទ័រ ឬសេវាកម្មអ្វីដែរ?`;
        const initialMsgs: ChatItem[] = [
          {
            sender: "bot",
            text: greetingText,
            senderName: "S Tech AI",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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

    return () => unsub();
  }, []);

  // ─── Sync messages back to active session & LocalStorage ───────────────────
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return;

    setSessions((prev) => {
      const userUid = currentUser?.uid || "guest";
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
  }, [messages, activeSessionId, currentUser]);

  // ─── Start New Chat Session (Gemini App Style) ─────────────────────────────
  const handleNewChat = () => {
    const newId = "ses_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
    const greetingText = `សួស្តីបង ${userName}! 👋 ខ្ញុំជា "S Tech AI" (ជំនួយការឆ្លាតវៃផ្លូវការរបស់ហាង S Tech Store)។ តើថ្ងៃនេះបងចង់សាកសួរតម្លៃ រកម៉ាស៊ីនកុំព្យូទ័រ ឬសេវាកម្មអ្វីដែរ?`;
    const initialMsgs: ChatItem[] = [
      {
        sender: "bot",
        text: greetingText,
        senderName: "S Tech AI",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
      saveSessionsToStorage(currentUser?.uid || "guest", updated);
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
    const userUid = currentUser?.uid || "guest";
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

  // ─── Subscribe to real-time messages from Firebase RTDB (Session Isolated) ───
  useEffect(() => {
    if (!chatId || !activeSessionId) return;

    const currentSession = sessionsRef.current.find((s) => s.id === activeSessionId);
    const sessionCreatedAt = currentSession?.createdAt || Date.now();

    const unsub = subscribeToMessages(chatId, (firebaseMsgs) => {
      if (firebaseMsgs && firebaseMsgs.length > 0) {
        // Merge staff/admin replies from RTDB into local message thread
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id || m.text));
          const newStaffMsgs: ChatItem[] = [];

          for (const m of firebaseMsgs) {
            if (m.sender === "admin" || m.sender === "staff") {
              // Isolation check:
              // 1. If message has a sessionId, it MUST match the active session!
              // 2. If no sessionId (legacy message), it MUST have been sent AFTER this session was created!
              const isForThisSession = m.sessionId
                ? m.sessionId === activeSessionId
                : (m.timestamp && m.timestamp >= (sessionCreatedAt - 15000));

              if (isForThisSession && !existingIds.has(m.id || m.text)) {
                newStaffMsgs.push({
                  id: m.id,
                  sender: "staff",
                  senderName: m.senderName || "S Tech Support",
                  text: m.text,
                  time: m.timestamp
                    ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "",
                });
              }
            }
          }

          if (newStaffMsgs.length > 0) {
            return [...prev, ...newStaffMsgs];
          }
          return prev;
        });
      }
    });

    return () => unsub();
  }, [chatId, activeSessionId]);

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
    const textToSend = (overrideText || input).trim();
    const currentImgs = [...attachedImages];
    if ((!textToSend && currentImgs.length === 0) || isAiThinking) return;

    // Rate Limit Check
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      showToast(rateCheck.reason!, "error");
      return;
    }

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
    const userMsg: ChatItem = {
      sender: "user",
      text: textToSend,
      image: imgUrls[0],
      images: imgUrls,
      senderName: userName || "អតិថិជន",
      time: timeStr,
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

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });

      const data = await res.json();
      const aiReplyText =
        data?.reply ||
        "ប្រព័ន្ធ AI កំពុងរវល់បន្តិចបាទ! 🙏 ដើម្បីកុំឱ្យបងរង់ចាំយូរ បងអាចចុចប៊ូតុងខាងក្រោមដើម្បីទាក់ទងផ្ទាល់ជាមួយក្រុមការងារ Human Agent របស់ S Tech Store បានភ្លាមៗបាទ!";
      const shouldSuggestAgent = !!data?.suggestAgent;

      const aiMsg: ChatItem = {
        sender: "bot",
        senderName: "S Tech AI",
        text: aiReplyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestAgent: shouldSuggestAgent,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Also record AI reply into Firebase RTDB with sessionId
      if (chatId) {
        sendChatMessage(
          chatId,
          {
            sender: "system",
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
      // Direct client fallback to Gemini API if Next.js internal route was unreachable
      try {
        const decodedFallback = typeof atob !== "undefined"
          ? atob("QVEuQWI4Uk42Snc5NDRoRnNuTHhyMWVsUUtiR0JLYzkxNnhCTjRYNmR0R3M1cmQxdzhjWVE=")
          : "";
        const primaryKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || decodedFallback;
        const fallbackKeys = Array.from(new Set([primaryKey, decodedFallback])).filter((k): k is string => Boolean(k && k.trim().length > 10));
        const fallbackModels = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite"];

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

        clientFallback: for (const keyToUse of fallbackKeys) {
          for (const modelToUse of fallbackModels) {
            try {
              const directRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${keyToUse}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ role: "user", parts: directParts }],
                  }),
                }
              );
              if (directRes.ok) {
                const directData = await directRes.json();
                const fallbackText = directData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (fallbackText) {
                  const aiMsg: ChatItem = {
                    sender: "bot",
                    senderName: "S Tech AI",
                    text: fallbackText.trim(),
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  };
                  setMessages((prev) => [...prev, aiMsg]);
                  return;
                }
              }
            } catch {}
          }
        }
      } catch (directErr) {
        // Continue to friendly fallback
      }

      // Graceful fallback — Never show technical error!
      const fallbackMsg: ChatItem = {
        sender: "bot",
        senderName: "S Tech AI",
        text: "ប្រព័ន្ធ AI កំពុងរវល់ខ្លាំងបន្តិចបាទ! 🙏 ដើម្បីកុំឱ្យបងរង់ចាំយូរ បងអាចចុចប៊ូតុងខាងក្រោមដើម្បីទាក់ទងផ្ទាល់ជាមួយក្រុមការងារ Human Agent របស់ S Tech Store បានភ្លាមៗបាទ!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestAgent: true,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsAiThinking(false);
    }
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
          text: `🔔 បានបញ្ជូនសំណើសុំជជែកផ្ទាល់ទៅកាន់ក្រុមការងារកាន់ផ្នែកឆាតរួចរាល់ហើយ! បុគ្គលិកផ្នែកបម្រើអតិថិជននឹងឆ្លើយតបមកបងក្នុងពេលឆាប់ៗនេះ។`,
          time: timeStr,
        },
      ]);
      showToast("✅ បានបញ្ជូនសំណើសុំជជែកផ្ទាល់ទៅកាន់ក្រុមការងាររួចរាល់!", "success");
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
                S Tech AI
              </h3>
              <span className="text-[9px] bg-gradient-to-r from-red-600 to-[#8B1A1A] text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 shadow-xs">
                PRO INTEL
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
              <MessageSquare size={10} className="shrink-0 text-emerald-500" />
              <span className="truncate">{currentTitle}</span>
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

          {/* Connect Live Agent Button */}
          <button
            onClick={() => setShowAgentModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-[#8B1A1A] dark:text-red-400 text-xs font-bold hover:bg-[#8B1A1A] hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Headphones size={13} />
            <span className="hidden xs:inline">ទាក់ទងបុគ្គលិក</span>
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
            onClick={() => handleSend(`សួស្តី! ខ្ញុំចង់សួរពីតម្លៃ និងព័ត៌មានបន្ថែមនៃ ${productInfo.name}`)}
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
              // System Message
              <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40 text-xs px-3.5 py-2 rounded-xl max-w-[90%] text-center my-1 shadow-xs">
                {msg.text}
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

                  {/* ── 2 Action Suggestion Buttons on Greeting ── */}
                  {msg.showGreetingButtons && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 w-full">
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
                    </div>
                  )}

                  {/* ── Interactive Live Human Support Card when AI suggests agent ── */}
                  {msg.suggestAgent && (
                    <div className="pt-2 w-full">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-red-50/80 via-white to-amber-50/50 dark:from-[#19141d] dark:via-[#131620] dark:to-[#17141f] border border-red-200/80 dark:border-red-900/40 shadow-sm flex flex-col gap-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#8B1A1A] text-white flex items-center justify-center text-xs font-black shadow-xs">
                            <Headphones size={14} />
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-gray-900 dark:text-white">
                              ត្រូវការជំនួយផ្ទាល់ពីមនុស្ស (Live Human Support)?
                            </h5>
                            <p className="text-[10.5px] text-gray-500 dark:text-gray-400">
                              បុគ្គលិកបច្ចេកទេស S Tech Store រង់ចាំជួយបងភ្លាមៗ
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setShowAgentModal(true)}
                            className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white text-xs font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer"
                          >
                            <Headphones size={13} />
                            <span>ស្នើសុំជជែកផ្ទាល់</span>
                          </button>

                          <a
                            href="https://t.me/StechStoreBot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                          >
                            <Send size={13} />
                            <span>ឆាត Telegram Bot</span>
                          </a>
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
            <div className="flex-1 bg-gradient-to-br from-red-50/60 via-slate-50/50 to-amber-50/40 dark:from-[#181216] dark:via-[#13151f] dark:to-[#17141f] rounded-2xl rounded-tl-sm p-3.5 border border-red-500/20 dark:border-red-500/25 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8B1A1A] dark:bg-red-500 animate-ping" />
                  <span className="font-extrabold text-xs bg-gradient-to-r from-[#8B1A1A] via-red-600 to-amber-600 bg-clip-text text-transparent">
                    S Tech AI • កំពុងវិភាគ & គិតគូរ ({thinkingSeconds.toFixed(1)}s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowThoughtProcess(!showThoughtProcess)}
                  className="text-[10.5px] text-gray-500 hover:text-gray-800 dark:text-gray-400 font-semibold cursor-pointer underline"
                >
                  {showThoughtProcess ? "បិទដំណើរការគិត" : "មើលដំណើរការគិត"}
                </button>
              </div>

              {showThoughtProcess && (
                <div className="flex flex-col gap-1.5 pt-1.5 border-t border-red-100 dark:border-white/10 text-[12px] text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-gray-700 dark:text-gray-200">
                      {thinkingSeconds < 1.6
                        ? currentThinkingStep?.phase1 || "⚡ S Tech AI កំពុងវិភាគសំណួររបស់បង..."
                        : thinkingSeconds < 3.2
                        ? currentThinkingStep?.phase2 || "🔎 ស្វែងរកទិន្នន័យបច្ចេកវិទ្យា និងព័ត៌មានហាងដែលសមស្រប..."
                        : currentThinkingStep?.phase3 || "✍️ កំពុងរៀបចំចម្លើយយ៉ាងលម្អិតជូនបង..."}
                    </span>
                  </div>

                  {/* Animated Wave Bars */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-1.5 w-8 rounded-full bg-[#8B1A1A] animate-pulse" />
                    <div className="h-1.5 w-14 rounded-full bg-red-500 animate-pulse [animation-delay:0.2s]" />
                    <div className="h-1.5 w-20 rounded-full bg-amber-500 animate-pulse [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
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
            onClick={() => {
              if (item.isAgent) {
                setShowAgentModal(true);
              } else if (item.text) {
                handleSend(item.text);
              }
            }}
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

      {/* ── Input Area ───────────────────────────────────────────────────────── */}
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
          className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
        >
          <Send size={16} />
        </button>
      </div>

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
                  <Headphones size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    ទាក់ទងទៅក្រុមការងារកាន់ផ្នែកឆាតភ្លាមៗ
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    សំណើរបស់បងនឹងត្រូវបញ្ជូនទៅកាន់ក្រុមការងារបម្រើអតិថិជនរបស់ S Tech Store ដើម្បីឆ្លើយតបភ្លាមៗ
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
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white text-xs font-bold hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {isSendingAgentReq ? (
                      <span>កំពុងបញ្ជូនសំណើ...</span>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>ស្នើសុំជជែកផ្ទាល់ជាមួយក្រុមការងារ</span>
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
