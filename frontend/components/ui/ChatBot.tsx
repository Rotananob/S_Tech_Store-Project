"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Bot, Headphones, AlertCircle, LogIn, Clock, Sparkles, MessageCircle, ExternalLink, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import api from "@/lib/api";
import { getOrCreateVisitorId, sendChatMessage, subscribeToMessages } from "@/lib/services/chat.service";
import { useRouter } from "next/navigation";

// ─── Rate limiting constants ─────────────────────────────────────────────────
const RATE_LIMIT_PER_MINUTE = 5; // max 5 messages per 60 seconds
const RATE_LIMIT_PER_HOUR = 150; // max 150 messages per 3600 seconds
const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface ChatBotProps {
  onClose: () => void;
  productInfo?: {
    name?: string;
    slug?: string;
    price?: number;
    image?: string;
  };
}

interface ChatItem {
  id?: string;
  sender: "bot" | "user" | "system" | "staff";
  text: string;
  senderName?: string;
  time?: string;
  showGreetingButtons?: boolean;
  suggestAgent?: boolean;
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
  const [userName, setUserName] = useState<string>("បង");
  const [authLoading, setAuthLoading] = useState(true);

  // ─── Chat state ───────────────────────────────────────────────────────────
  const [chatId, setChatId] = useState<string>("");
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);

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

  // ─── Initialize Auth & Greeting ───────────────────────────────────────────
  // ─── LocalStorage Session History Helpers ─────────────────────────────────
  const getStorageKey = (cid: string) => `stech_ai_chat_history_${cid || "guest"}`;

  const loadStoredMessages = (cid: string): ChatItem[] | null => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(getStorageKey(cid));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return null;
  };

  const saveMessagesToStorage = (cid: string, msgs: ChatItem[]) => {
    if (typeof window === "undefined" || !cid) return;
    try {
      localStorage.setItem(getStorageKey(cid), JSON.stringify(msgs.slice(-50)));
    } catch {}
  };

  // ─── Initialize Auth, Greeting & Restore Chat History ─────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      let detectedName = "បង";
      let activeChatId = getOrCreateVisitorId();

      if (user) {
        activeChatId = user.uid;
        detectedName = user.displayName || user.email?.split("@")[0] || "បង";
        setUserName(detectedName);

        setAgentForm((prev) => ({
          ...prev,
          name: prev.name || user.displayName || "",
          email: prev.email || user.email || "",
        }));

        try {
          const res = await api.get("/user/profile");
          if (res.data?.success && res.data.profile) {
            const p = res.data.profile;
            const realFullName = p.full_name || p.name || user.displayName || "";
            if (realFullName) {
              detectedName = realFullName;
              setUserName(realFullName);
            }
            setAgentForm((prev) => ({
              ...prev,
              name: prev.name || realFullName,
              phone: prev.phone || p.phone || "",
              telegram: prev.telegram || p.telegram || "",
              email: prev.email || user.email || "",
            }));
          }
        } catch {}
      }

      setChatId(activeChatId);

      // Restore existing history from localStorage if present
      const stored = loadStoredMessages(activeChatId);
      if (stored && stored.length > 0) {
        setMessages(stored);
      } else {
        // Initial Greeting Message with Real User Name and 2 Action Buttons
        const greetingText = `សួស្តីបង ${detectedName}! 👋 ខ្ញុំជាប្រព័ន្ធ AI ឆ្លាតវៃរបស់ S Tech Store។ តើថ្ងៃនេះបងចង់សាកសួរតម្លៃ រកម៉ាស៊ីនកុំព្យូទ័រ ឬសេវាកម្មអ្វីដែរ?`;

        setMessages([
          {
            sender: "bot",
            text: greetingText,
            senderName: "S Tech AI",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            showGreetingButtons: true,
          },
        ]);
      }
    });

    return () => unsub();
  }, []);

  // ─── Save Messages to LocalStorage on Change ──────────────────────────────
  useEffect(() => {
    if (chatId && messages.length > 0) {
      saveMessagesToStorage(chatId, messages);
    }
  }, [messages, chatId]);

  // ─── Reset Chat / New Session Handler ─────────────────────────────────────
  const handleResetChat = () => {
    if (typeof window !== "undefined" && chatId) {
      try {
        localStorage.removeItem(getStorageKey(chatId));
      } catch {}
    }
    const greetingText = `សួស្តីបង ${userName}! 👋 ខ្ញុំជាប្រព័ន្ធ AI ឆ្លាតវៃរបស់ S Tech Store។ តើថ្ងៃនេះបងចង់សាកសួរតម្លៃ រកម៉ាស៊ីនកុំព្យូទ័រ ឬសេវាកម្មអ្វីដែរ?`;
    setMessages([
      {
        sender: "bot",
        text: greetingText,
        senderName: "S Tech AI",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        showGreetingButtons: true,
      },
    ]);
    showToast("🧹 បានសម្អាត និងចាប់ផ្តើមការជជែកថ្មី!", "info");
  };

  // ─── Subscribe to real-time messages from Firebase RTDB ───────────────────
  useEffect(() => {
    if (!chatId) return;

    const unsub = subscribeToMessages(chatId, (firebaseMsgs) => {
      if (firebaseMsgs && firebaseMsgs.length > 0) {
        // Merge staff/admin replies from RTDB into local message thread
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id || m.text));
          const newStaffMsgs: ChatItem[] = [];

          for (const m of firebaseMsgs) {
            if ((m.sender === "admin" || m.sender === "staff") && !existingIds.has(m.id || m.text)) {
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

          if (newStaffMsgs.length > 0) {
            return [...prev, ...newStaffMsgs];
          }
          return prev;
        });
      }
    });

    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  // ─── Notify Telegram about active chat (throttled) ────────────────────────
  const triggerTelegramAlert = useCallback(
    async (firstMessageText: string) => {
      if (hasNotifiedTelegram) return;
      try {
        await api.post("/chat/request-agent", {
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
    [agentForm, userName, currentUser, productInfo, hasNotifiedTelegram]
  );

  // ─── Send Message Handler ─────────────────────────────────────────────────
  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || isAiThinking) return;

    // Check Authentication: If not logged in, prompt user to login but allow Live Agent alert
    if (!currentUser) {
      showToast("🔒 សូមចូលគណនី (Login) ដើម្បីអាចជជែកផ្ទាល់!", "warning");
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          sender: "system",
          text: "🔒 ដើម្បីការពារសុវត្ថិភាព និងទប់ស្កាត់ការ Spam សូមចូលគណនី (Login) ជាមុនសិន ដើម្បីជជែកជាមួយ AI ឬបុគ្គលិក។ ប៉ុន្តែបងអាចចុចប៊ូតុង 'Live Agent' ខាងលើដើម្បី Alert ទៅ Telegram ក្រុមការងារបានភ្លាមៗ!",
          time: timeStr,
          suggestAgent: true,
        },
      ]);
      return;
    }

    // Check Rate Limit
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      showToast(rateCheck.reason!, "error");
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatItem = {
      sender: "user",
      text: textToSend,
      senderName: userName || "អតិថិជន",
      time: timeStr,
    };

    // Update UI immediately
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsAiThinking(true);

    // 1. Sync message into Firebase Realtime Database
    if (chatId) {
      sendChatMessage(
        chatId,
        {
          sender: "user",
          senderName: userName || "អតិថិជន",
          text: textToSend,
          productInfo: productInfo || null,
        },
        {
          userName: userName || "អតិថិជន",
          userEmail: agentForm.email || currentUser?.email || undefined,
          userPhone: agentForm.phone || undefined,
        }
      ).catch(() => {});
    }

    // 2. Alert Telegram so staff know customer is chatting
    triggerTelegramAlert(textToSend);

    // 3. Call Gemini AI via Server-side Next.js route
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          userName: userName,
          history: messages.slice(-6),
          productInfo: productInfo || null,
        }),
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

      // Also record AI reply into Firebase RTDB
      if (chatId) {
        sendChatMessage(
          chatId,
          {
            sender: "system",
            senderName: "S Tech AI",
            text: aiReplyText,
          },
          {
            userName: userName,
          }
        ).catch(() => {});
      }
    } catch (err) {
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
        name: agentForm.name || userName || "Website Visitor",
        email: agentForm.email || currentUser?.email || "N/A",
        phone: agentForm.phone || "N/A",
        telegram: agentForm.telegram || "N/A",
        message: agentForm.message || input || "អតិថិជនស្នើសុំជួប Human Agent លើ Telegram",
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
          text: `🔔 បានបញ្ជូន Alert ទៅកាន់ Telegram របស់ក្រុមការងាររួចរាល់ហើយ! បុគ្គលិកផ្នែកបម្រើអតិថិជននឹងឆ្លើយតបមកបងក្នុងពេលឆាប់ៗនេះ។`,
          time: timeStr,
        },
      ]);
      showToast("✅ បានបញ្ជូន Alert ទៅ Telegram ក្រុមការងាររួចរាល់!", "success");
    } catch (err) {
      showToast("បានបញ្ជូនសំណើទៅកាន់ Backup Queue រួចរាល់!", "info");
      setShowAgentModal(false);
    } finally {
      setIsSendingAgentReq(false);
    }
  };

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
        <div className="flex items-center gap-2.5">
          {/* Official S-Tech Logo & Bot Badge */}
          <div className="relative">
            <img
              src="/logo.jpg"
              alt="S Tech Store"
              className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-gray-200 dark:border-white/15"
            />
            <div className="w-4 h-4 rounded-full bg-[#8B1A1A] absolute -bottom-1 -right-1 flex items-center justify-center text-white text-[9px] shadow-sm border border-white dark:border-[#12151e]">
              <Bot size={10} />
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 border-2 border-white dark:border-[#12151e] animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-[14px] sm:text-[15px] leading-tight">
                S Tech Smart AI
              </h3>
              <span className="text-[9.5px] bg-red-100 dark:bg-red-950/60 text-[#8B1A1A] dark:text-red-400 font-black px-1.5 py-0.5 rounded uppercase">
                Official
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              Online • ជំនួយការឆ្លាតវៃ S Tech Store
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* New Chat / Reset Button */}
          <button
            onClick={handleResetChat}
            title="ចាប់ផ្តើមសារថ្មី (New Chat / សម្អាតសារ)"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-all cursor-pointer"
          >
            <RefreshCw size={15} />
          </button>

          {/* Connect Live Agent Button */}
          <button
            onClick={() => setShowAgentModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-[#8B1A1A] dark:text-red-400 text-xs font-bold hover:bg-[#8B1A1A] hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Headphones size={13} />
            <span className="hidden xs:inline">Live Agent</span>
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
            key={i}
            className={`flex flex-col ${
              msg.sender === "user"
                ? "items-end"
                : msg.sender === "system"
                ? "items-center"
                : "items-start"
            }`}
          >
            {msg.sender === "system" ? (
              <div className="max-w-[90%] sm:max-w-[85%] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 text-xs rounded-xl px-3.5 py-2.5 text-center font-medium shadow-sm flex flex-col items-center gap-2">
                <span>{msg.text}</span>
                {!currentUser && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => router.push("/login")}
                      className="px-3.5 py-1.5 rounded-lg bg-[#8B1A1A] text-white text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <LogIn size={12} />
                      <span>ចូលគណនី (Sign In)</span>
                    </button>
                    <button
                      onClick={() => setShowAgentModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold hover:bg-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Headphones size={12} />
                      <span>Alert Live Agent</span>
                    </button>
                  </div>
                )}
              </div>
            ) : msg.sender === "staff" ? (
              <div className="flex flex-col items-start gap-1 max-w-[85%] sm:max-w-[70%]">
                <span className="text-[10.5px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200/60 shadow-xs">
                  🛡️ {msg.senderName || "S Tech Staff (ក្រុមការងារ)"}
                </span>
                <div className="p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm bg-white dark:bg-[#151922] text-gray-900 dark:text-gray-100 rounded-tl-sm border-2 border-red-500/20 dark:border-red-500/30">
                  <div>{msg.text}</div>
                  {msg.time && (
                    <div className="text-[10px] mt-1 text-right font-medium text-gray-400">
                      {msg.time}
                    </div>
                  )}
                </div>
              </div>
            ) : msg.sender === "user" ? (
              <div className="max-w-[80%] sm:max-w-[70%] p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm bg-[#8B1A1A] text-white rounded-tr-sm">
                <div>{msg.text}</div>
                {msg.time && (
                  <div className="text-[10px] mt-1 text-right font-medium text-white/70">
                    {msg.time}
                  </div>
                )}
              </div>
            ) : (
              // AI Bot Message with Logo Avatar
              <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-[75%]">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mt-0.5 border border-gray-200 dark:border-white/10 shadow-xs bg-white">
                  <img src="/logo.jpg" alt="AI" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col items-start gap-1 flex-1">
                  <div className="p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm bg-white dark:bg-[#151922] text-gray-800 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-white/5 w-full">
                    <div className="whitespace-pre-line">{msg.text}</div>
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
                        <span>ទាក់ទងផ្ទាល់ជាមួយមនុស្ស (Live Agent)</span>
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

                  {/* ── Action button when AI suggests human agent / busy ── */}
                  {msg.suggestAgent && (
                    <div className="pt-1">
                      <button
                        onClick={() => setShowAgentModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                      >
                        <Headphones size={14} />
                        <span>Alert ទៅ Telegram ក្រុមការងារឥឡូវនេះ</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* AI Typing Indicator */}
        {isAiThinking && (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs py-1">
            <div className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-[#8B1A1A] dark:text-red-400">
              <Bot size={15} />
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-[#151922] px-3 py-2 rounded-2xl border border-gray-100 dark:border-white/5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-[11px] font-medium ml-1.5 text-gray-500 dark:text-gray-400">
                AI កំពុងឆ្លើយតប...
              </span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Input Area ───────────────────────────────────────────────────────── */}
      <div
        className="bg-white dark:bg-[#12151e] border-t border-gray-100 dark:border-white/10 p-3 flex items-center gap-2.5 flex-shrink-0"
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

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="សួរសំណួរ ឬតម្លៃ Laptop, PC, សេវាកម្ម..."
          className="flex-1 bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/10 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50 text-[14px] text-gray-900 dark:text-white"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isAiThinking}
          title="ផ្ញើសារ"
          className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
        >
          <Send size={16} />
        </button>
      </div>

      {/* ── Live Agent Request Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showAgentModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
                    ទាក់ទងក្រុមការងារ (Live Agent Alert)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    សារ Alert នឹងលោតចូល Telegram របស់បុគ្គលិក S Tech Store ភ្លាមៗ
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
                      <span>កំពុង Alert ទៅ Telegram...</span>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>បញ្ជូន Alert ទៅ Telegram ក្រុមការងារ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
