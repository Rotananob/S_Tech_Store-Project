"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Bot, Headphones, AlertCircle, LogIn, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import api from "@/lib/api";
import { getOrCreateVisitorId, sendChatMessage, subscribeToMessages } from "@/lib/services/chat.service";
import { useRouter } from "next/navigation";

// ─── Rate limiting constants ─────────────────────────────────────────────────
const RATE_LIMIT_PER_MINUTE = 5;    // max 5 messages per 60 seconds
const RATE_LIMIT_PER_HOUR = 150;    // max 150 messages per 3600 seconds
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
  const [authLoading, setAuthLoading] = useState(true);

  // ─── Chat state ───────────────────────────────────────────────────────────
  const [chatId, setChatId] = useState<string>("");
  const [messages, setMessages] = useState<
    Array<{ sender: "bot" | "user" | "system" | "staff"; text: string; senderName?: string; time?: string }>
  >([
    {
      sender: "bot",
      text: "សួស្តី! Welcome to S Tech Store Cambodia! 🇰🇭 How can we assist you today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");

  // ─── Agent modal state ─────────────────────────────────────────────────────
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [isSendingAgentReq, setIsSendingAgentReq] = useState(false);
  const [agentReqSent, setAgentReqSent] = useState(false);
  const [agentForm, setAgentForm] = useState({
    name: "",
    phone: "",
    email: "",
    telegram: "",
    message: productInfo?.name
      ? `I am interested in ${productInfo.name}. Can you provide more details?`
      : "",
  });

  // ─── Toast state ──────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  // ─── Rate limiting: store timestamps of sent messages ─────────────────────
  const messageTimes = useRef<number[]>([]);

  const endRef = useRef<HTMLDivElement>(null);

  // ─── Show toast helper ────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ─── Check rate limits ────────────────────────────────────────────────────
  const checkRateLimit = useCallback((): { allowed: boolean; reason?: string } => {
    const now = Date.now();
    // Clean old timestamps outside 1-hour window
    const withinHour = messageTimes.current.filter((t) => now - t < ONE_HOUR_MS);
    const withinMinute = withinHour.filter((t) => now - t < ONE_MINUTE_MS);

    if (withinMinute.length >= RATE_LIMIT_PER_MINUTE) {
      return {
        allowed: false,
        reason: `⏱️ Too many messages! Please wait 1 minute. (Max ${RATE_LIMIT_PER_MINUTE} per minute)`,
      };
    }
    if (withinHour.length >= RATE_LIMIT_PER_HOUR) {
      return {
        allowed: false,
        reason: `🚫 Hourly chat limit reached (${RATE_LIMIT_PER_HOUR} messages/hour). Please try again later.`,
      };
    }

    // Record this attempt
    messageTimes.current = [...withinHour, now];
    return { allowed: true };
  }, []);

  // ─── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Authenticated: use Firebase UID as chatId
        setChatId(user.uid);
        setAgentForm((prev) => ({
          ...prev,
          name: prev.name || user.displayName || "",
          email: prev.email || user.email || "",
        }));

        // Try fetching detailed profile
        api
          .get("/user/profile")
          .then((res) => {
            if (res.data?.success && res.data.profile) {
              const p = res.data.profile;
              setAgentForm((prev) => ({
                ...prev,
                name: prev.name || p.full_name || user.displayName || "",
                phone: prev.phone || p.phone || "",
                telegram: prev.telegram || p.telegram || "",
                email: prev.email || user.email || "",
              }));
            }
          })
          .catch(() => {});
      } else {
        // Unauthenticated: use visitor ID for UI only (cannot write to RTDB)
        setChatId(getOrCreateVisitorId());
      }
    });

    return () => unsub();
  }, []);

  // ─── Subscribe to real-time messages (authenticated only) ─────────────────
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const unsub = subscribeToMessages(chatId, (firebaseMsgs) => {
      if (firebaseMsgs && firebaseMsgs.length > 0) {
        setMessages(
          firebaseMsgs.map((m) => ({
            sender:
              m.sender === "admin" || m.sender === "staff"
                ? "staff"
                : m.sender === "user"
                ? "user"
                : "system",
            text: m.text,
            senderName: m.senderName,
            time: m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
          }))
        );
      }
    });

    return () => unsub();
  }, [chatId, currentUser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Send message handler ─────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // ── Auth guard: block Firebase chat for unauthenticated users ────────────
    if (!currentUser) {
      showToast("🔐 Please login to chat with our support team. You can still request an agent below.", "warning");
      // Show login prompt in messages
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "🔐 To start a real-time chat, please login to your account first. You can also click 'Connect Agent' to send us a Telegram alert — no login required!",
          time: timeStr,
        },
      ]);
      setInput("");
      return;
    }

    // ── Rate limit check ──────────────────────────────────────────────────────
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      showToast(rateCheck.reason!, "error");
      return;
    }

    // ── Send to Firebase RTDB ─────────────────────────────────────────────────
    sendChatMessage(
      chatId,
      {
        sender: "user",
        senderName: agentForm.name || currentUser.displayName || "Customer",
        text: userText,
        productInfo: productInfo
          ? {
              name: productInfo.name,
              price: productInfo.price,
              image: productInfo.image,
              slug: productInfo.slug,
            }
          : null,
      },
      {
        userName: agentForm.name || currentUser.displayName || "Customer",
        userEmail: agentForm.email || currentUser.email || undefined,
        userPhone: agentForm.phone || undefined,
      }
    ).catch((err) => {
      console.error("RTDB write error:", err);
      showToast("Failed to send message. Please try again.", "error");
    });

    setMessages((prev) => [...prev, { sender: "user", text: userText, time: timeStr }]);
    setInput("");

    // ── Keyword auto-reply ────────────────────────────────────────────────────
    const lower = userText.toLowerCase();
    setTimeout(() => {
      let reply =
        "I am S Tech Assistant. You can also click 'Live Agent' above to connect directly with our staff on Telegram!";
      if (lower.includes("price") || lower.includes("ថ្លៃ") || lower.includes("តម្លៃ")) {
        reply =
          "All our prices are in USD ($) and converted accurately to Khmer Riel (៛). Official warranties are included!";
      } else if (
        lower.includes("delivery") ||
        lower.includes("ដឹក") ||
        lower.includes("delivery fee")
      ) {
        reply =
          "🚚 Delivery is $2.00 in Phnom Penh (Express same-day) and $3.00 across all 24 provinces via trusted logistics!";
      } else if (lower.includes("warranty") || lower.includes("ធានា")) {
        reply =
          "🛡️ All products come with official warranty: 1-3 years for brand new electronics, and 3-6 months for certified pre-owned devices.";
      } else if (
        lower.includes("human") ||
        lower.includes("agent") ||
        lower.includes("staff") ||
        lower.includes("ឆាត") ||
        lower.includes("telegram")
      ) {
        setShowAgentModal(true);
        reply =
          "Connecting you to our live team! Please confirm your contact info below so our staff can reach you immediately.";
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 600);
  };

  // ─── Live Agent request (works for BOTH authenticated & guests) ────────────
  const handleRequestAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentForm.message.trim() && !input.trim()) {
      alert("Please enter a short message for the agent.");
      return;
    }

    setIsSendingAgentReq(true);
    try {
      // Authenticated users also write to Firebase for real-time tracking
      if (chatId && currentUser) {
        sendChatMessage(
          chatId,
          {
            sender: "system",
            senderName: "Alert",
            text: `🚨 Live Agent Request: ${agentForm.name || "Customer"} (${
              agentForm.phone || agentForm.email || "No contact"
            }). Inquiry: "${agentForm.message || input}"`,
          },
          {
            userName: agentForm.name || "Customer",
            userEmail: agentForm.email || currentUser.email || undefined,
            userPhone: agentForm.phone || undefined,
          }
        ).catch(() => {});
      }

      // Telegram alert works for EVERYONE (no auth required)
      await api.post("/chat/request-agent", {
        name: agentForm.name || currentUser?.displayName || "Website Visitor",
        email: agentForm.email || currentUser?.email || "N/A",
        phone: agentForm.phone || "N/A",
        telegram: agentForm.telegram || "N/A",
        message: agentForm.message || input || "Live chat inquiry from customer",
        product_name: productInfo?.name || null,
        product_url: typeof window !== "undefined" ? window.location.href : null,
      });

      setAgentReqSent(true);
      setShowAgentModal(false);

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          sender: "system",
          text: `🔔 Alert Sent! Our support staff in Telegram & Live Dashboard have been notified. An agent will respond to you shortly!`,
          time: timeStr,
        },
      ]);
    } catch (err) {
      console.error("Failed to send agent request", err);
      alert("Notice: Telegram notification was received by backup queue.");
      setShowAgentModal(false);
    } finally {
      setIsSendingAgentReq(false);
    }
  };

  // ─── Login redirect ───────────────────────────────────────────────────────
  const handleLoginRedirect = () => {
    onClose();
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-white dark:bg-[#0c0d12] text-gray-900 dark:text-gray-100">

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
        className="bg-white dark:bg-[#12151e] px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between shadow-sm flex-shrink-0"
        style={{ paddingTop: "calc(16px + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-md">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-[15px] leading-tight flex items-center gap-1.5">
              <span>S Tech Live Support</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              Online • Fast Response
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Login button — shown only when not authenticated */}
          {!authLoading && !currentUser && (
            <button
              onClick={handleLoginRedirect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <LogIn size={13} />
              Login
            </button>
          )}

          {/* Connect Agent button */}
          <button
            onClick={() => setShowAgentModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-[#8B1A1A] hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Headphones size={13} />
            <span className="hidden sm:inline">Connect</span> Agent
          </button>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <X size={19} />
          </button>
        </div>
      </div>

      {/* ── Auth Banner for unauthenticated users ─────────────────────────────── */}
      {!authLoading && !currentUser && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-blue-100 dark:border-blue-900/30 px-4 py-2.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
            <LogIn size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
              Login to start a real-time chat session
            </p>
            <p className="text-[10.5px] text-blue-600/80 dark:text-blue-400/80">
              Guests can still request an agent via Telegram below
            </p>
          </div>
          <button
            onClick={handleLoginRedirect}
            className="shrink-0 px-3 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </div>
      )}

      {/* ── Product Banner ──────────────────────────────────────────────────── */}
      {productInfo?.name && (
        <div className="bg-gradient-to-r from-red-50/80 via-white to-gray-50 dark:from-[#191d29] dark:via-[#141722] dark:to-[#12151e] border-b border-gray-100 dark:border-white/5 px-4 py-2 flex items-center justify-between text-xs">
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
            onClick={() => setShowAgentModal(true)}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold shrink-0"
          >
            Ask About This
          </button>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-gray-50/50 dark:bg-[#0c0d12]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex w-full ${
              msg.sender === "user"
                ? "justify-end"
                : msg.sender === "system"
                ? "justify-center"
                : "justify-start"
            }`}
          >
            {msg.sender === "system" ? (
              <div className="max-w-[85%] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs rounded-xl px-3.5 py-2 text-center font-medium shadow-sm">
                {msg.text}
              </div>
            ) : msg.sender === "staff" ? (
              <div className="flex flex-col items-start gap-1 max-w-[82%] sm:max-w-[70%]">
                <span className="text-[10.5px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200/60 shadow-xs">
                  🛡️ {msg.senderName || "S Tech Staff"}
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
            ) : (
              <div
                className={`max-w-[78%] sm:max-w-[70%] p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${
                  msg.sender === "user"
                    ? "bg-[#8B1A1A] text-white rounded-tr-sm"
                    : "bg-white dark:bg-[#151922] text-gray-800 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-white/5"
                }`}
              >
                <div>{msg.text}</div>
                {msg.time && (
                  <div
                    className={`text-[10px] mt-1 text-right font-medium ${
                      msg.sender === "user" ? "text-white/70" : "text-gray-400"
                    }`}
                  >
                    {msg.time}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
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
          title="Connect Live Agent"
          className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center hover:bg-[#8B1A1A] hover:text-white transition-colors shrink-0"
        >
          <Headphones size={18} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={
            !currentUser
              ? "Login to chat • or request agent below..."
              : "Ask a question or request staff..."
          }
          className="flex-1 bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/10 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50 text-[14px] text-gray-900 dark:text-white"
        />

        <button
          onClick={handleSend}
          disabled={!input.trim()}
          title={!currentUser ? "Login required for real-time chat" : "Send message"}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0 shadow-sm cursor-pointer"
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
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-md">
                  <Headphones size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Request Live Agent Alert
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Direct notification dispatched to our Telegram team
                    {!currentUser && " • Works without login"}
                  </p>
                </div>
              </div>

              {/* Guest notice */}
              {!currentUser && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2">
                  <LogIn size={14} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-[11.5px] text-blue-700 dark:text-blue-300 font-medium">
                    You are not logged in. The agent will contact you via the details below.{" "}
                    <button
                      onClick={handleLoginRedirect}
                      className="underline font-bold hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      Login for live chat
                    </button>
                  </p>
                </div>
              )}

              <form onSubmit={handleRequestAgentSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Your Name / ឈ្មោះ
                  </label>
                  <input
                    type="text"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Phone Number / ទូរស័ព្ទ
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
                    Email Address
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
                    Question / Inquiry / សំណួរ
                  </label>
                  <textarea
                    rows={3}
                    value={agentForm.message}
                    onChange={(e) => setAgentForm({ ...agentForm, message: e.target.value })}
                    placeholder="Describe what you need help with..."
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none resize-none text-gray-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAgentModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingAgentReq}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white text-xs font-bold hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {isSendingAgentReq ? (
                      <span>Alerting Telegram...</span>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Notify Agent on Telegram</span>
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
