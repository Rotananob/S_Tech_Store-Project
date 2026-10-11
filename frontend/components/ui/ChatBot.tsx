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
  MessageSquare
} from "lucide-react";
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

  // ─── Multi-Session State (Gemini App Style) ────────────────────────────────
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");

  // ─── Live Thinking Preview State (Gemini Thinking UI) ─────────────────────
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [showThoughtProcess, setShowThoughtProcess] = useState(true);

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      let detectedName = "បង";
      let activeChatId = getOrCreateVisitorId();
      const userKey = user ? user.uid : "guest";

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

    // Rate Limit Check
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
              <div className="flex flex-col items-end max-w-[85%] sm:max-w-[70%]">
                <div className="p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white rounded-tr-sm">
                  {msg.text}
                </div>
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
                  <div className="p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm bg-white dark:bg-[#151922] text-gray-900 dark:text-white rounded-tl-sm border border-emerald-200/50 dark:border-emerald-800/30">
                    <div className="whitespace-pre-line">{msg.text}</div>
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
                      {thinkingSeconds < 1.8
                        ? "⚡ S Tech AI កំពុងវិភាគសំណួររបស់បង..."
                        : thinkingSeconds < 3.8
                        ? "🔎 ផ្ទៀងផ្ទាត់ទិន្នន័យផលិតផល ស្តុក និងតម្លៃក្នុងហាង..."
                        : "✍️ កំពុងរៀបចំចម្លើយយ៉ាងលម្អិតជូនបង..."}
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
