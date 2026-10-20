"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { 
  MessageSquare, 
  Send, 
  User, 
  Search, 
  Check, 
  CheckCheck, 
  Clock, 
  Phone, 
  Mail, 
  ShieldAlert, 
  Sparkles, 
  Bot, 
  UserCheck, 
  RefreshCw, 
  ExternalLink, 
  Image as ImageIcon, 
  X, 
  ChevronLeft, 
  ArrowLeft,
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Trash2,
  Archive,
  Zap,
  MoreVertical,
  Paperclip,
  Radio,
  Eye,
  SlidersHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { 
  subscribeToAllChats, 
  subscribeToMessages, 
  sendChatMessage, 
  setChatAiStatus, 
  setChatTicketStatus, 
  archiveChatSession, 
  deleteChatSession, 
  markChatReadByAdmin, 
  notifyCustomerOfAdminReply,
  ChatMessage, 
  ChatSession 
} from "@/lib/services/chat.service";

// Khmer quick response presets for instant 1-click staff answers
const QUICK_RESPONSES = [
  "👋 សួស្តីបង! តើខ្ញុំអាចជួយអ្វីបងបានដែរ?",
  "📦 ទំនិញនេះមានក្នុងស្តុកស្រាប់បង អាចកម្ម៉ង់បានភ្លាមៗបាទ!",
  "🚚 សេវាដឹកភ្នំពេញ $2.00 (ក្រោម ២ ម៉ោងដល់ដៃ) | ខេត្ត $3.00 (១-២ ថ្ងៃ)",
  "🛡️ ទំនិញ Brand New មានការធានាផ្លូវការ ១ ឆ្នាំពេញពីក្រុមហ៊ុនបង!",
  "💻 បងចង់បាន PC សម្រាប់ Gaming, Graphic Design ឬ Office ដែរ?",
  "📞 លេខទូរស័ព្ទ Hotline ហាង: 012 345 678 / 098 765 432",
  "🙏 អរគុណច្រើនបងសម្រាប់ការទាក់ទងមកកាន់ S Tech Store!",
];

export default function AdminLiveChatPage() {
  const searchParams = useSearchParams();
  const directToken = searchParams.get("token") || searchParams.get("bypass_token");
  const queryChatId = searchParams.get("chat_id") || searchParams.get("session_id");

  // Authentication State
  const [currentAdmin, setCurrentAdmin] = useState<{
    id?: number;
    name?: string;
    email?: string;
    role?: string;
  } | null>(null);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Chat Data State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "takeover" | "resolved">("all");

  // Message Composition State
  const [replyInput, setReplyInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [audioAlerts, setAudioAlerts] = useState(true);

  // Mobile / Telegram WebApp view toggle
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [copiedId, setCopiedId] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  const showToast = (msg: string, type: "success" | "info" | "error" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Play subtle incoming message chime (Web Audio API synthesis)
  const playChime = useCallback(() => {
    if (!audioAlerts || typeof window === "undefined") return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, [audioAlerts]);

  // ─── 1. Telegram WebApp & 1-Click Bypass Auth Verification ─────────────────
  useEffect(() => {
    // Detect and expand Telegram Mini App window
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        try {
          tg.ready();
          tg.expand();
          if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
        } catch {}
      }
    }

    // Auto verify 1-Click bypass token from Telegram notification button
    if (directToken) {
      api.post("/admin/verify-bypass-token", { token: directToken })
        .then((res) => {
          if (res.data?.success) {
            const apiToken = res.data.token || res.data.admin_token;
            const user = res.data.admin_user;
            if (apiToken) {
              localStorage.setItem("stech_admin_token", apiToken);
              sessionStorage.setItem("stech_admin_token", apiToken);
              document.cookie = `stech_admin_token=${encodeURIComponent(apiToken)}; path=/; max-age=604800; SameSite=Lax`;
            }
            if (user) {
              localStorage.setItem("stech_admin_user", JSON.stringify(user));
              sessionStorage.setItem("stech_admin_user", JSON.stringify(user));
              setCurrentAdmin(user);
            }
            window.dispatchEvent(new Event("stech_admin_auth_updated"));
            setTokenVerified(true);
            showToast("⚡ បានផ្ទៀងផ្ទាត់សិទ្ធិបុគ្គលិកដោយជោគជ័យ (1-Click Auto-Login)!", "success");

            if (res.data?.chat_id) {
              setSelectedChatId(res.data.chat_id);
              setMobileView("chat");
            }
          }
        })
        .catch((err) => {
          console.warn("Bypass token error:", err.response?.data?.error || err.message);
          setAuthError(err.response?.data?.error || "Token has expired or was invalid.");
        });
    } else {
      // Check existing local admin session
      try {
        const u = localStorage.getItem("stech_admin_user") || sessionStorage.getItem("stech_admin_user");
        if (u) setCurrentAdmin(JSON.parse(u));
      } catch {}
    }

    if (queryChatId) {
      setSelectedChatId(queryChatId);
      setMobileView("chat");
    }
  }, [directToken, queryChatId]);

  // ─── 2. Subscribe to All Chat Sessions in Real-Time ────────────────────────
  useEffect(() => {
    const unsub = subscribeToAllChats((allSessions) => {
      setSessions(allSessions);

      // Auto select the first chat if none selected yet on desktop
      if (!selectedChatId && allSessions.length > 0 && typeof window !== "undefined" && window.innerWidth >= 1024) {
        setSelectedChatId(allSessions[0].id);
      }
    });

    return () => unsub();
  }, [selectedChatId]);

  // ─── 3. Subscribe to Real-Time Messages for Active Conversation ───────────
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    // Mark as read immediately when admin opens chat
    markChatReadByAdmin(selectedChatId).catch(() => {});

    const unsub = subscribeToMessages(selectedChatId, (msgs) => {
      setLoadingMessages(false);
      setMessages(msgs);

      // Play audio chime if a new user message arrives while admin is on page
      if (msgs.length > prevMessagesCountRef.current && prevMessagesCountRef.current > 0) {
        const latest = msgs[msgs.length - 1];
        if (latest && latest.sender === "user") {
          playChime();
        }
      }
      prevMessagesCountRef.current = msgs.length;
    });

    return () => unsub();
  }, [selectedChatId, playChime]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Telegram Mini App native back button
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.BackButton) {
      if (mobileView === "chat") {
        tg.BackButton.show();
        const handleBack = () => setMobileView("list");
        tg.BackButton.onClick(handleBack);
        return () => {
          tg.BackButton.offClick(handleBack);
          tg.BackButton.hide();
        };
      } else {
        tg.BackButton.hide();
      }
    }
  }, [mobileView]);

  // Selected chat metadata
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedChatId) || null;
  }, [sessions, selectedChatId]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Status tab filter
      if (statusFilter === "unread" && (!s.unreadAdminCount || s.unreadAdminCount <= 0)) return false;
      if (statusFilter === "takeover" && !s.ai_paused) return false;
      if (statusFilter === "resolved" && s.status !== "resolved") return false;
      if (statusFilter === "all" && s.is_archived) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.userName.toLowerCase().includes(q) ||
        (s.userEmail && s.userEmail.toLowerCase().includes(q)) ||
        (s.userPhone && s.userPhone.includes(q)) ||
        (s.lastMessage && s.lastMessage.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [sessions, statusFilter, searchQuery]);

  // Statistics
  const totalUnread = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.unreadAdminCount || 0), 0);
  }, [sessions]);

  const totalTakeovers = useMemo(() => {
    return sessions.filter((s) => s.ai_paused).length;
  }, [sessions]);

  // ─── Actions: Send Staff Reply ─────────────────────────────────────────────
  const handleSendReply = async (textOverride?: string) => {
    const textToSend = (textOverride || replyInput).trim();
    if ((!textToSend && !attachedImage) || !selectedChatId || isSending) return;

    setIsSending(true);
    const staffName = currentAdmin?.name || "S Tech Staff (បុគ្គលិក)";

    try {
      await sendChatMessage(
        selectedChatId,
        {
          sender: "admin",
          senderName: staffName,
          text: textToSend || "[រូបភាពពីបុគ្គលិក]",
          image: attachedImage || undefined,
        },
        {
          userName: activeSession?.userName,
          userEmail: activeSession?.userEmail,
          userPhone: activeSession?.userPhone,
        }
      );

      // Notify customer via Telegram Bot companion or email
      notifyCustomerOfAdminReply({
        chat_id: selectedChatId,
        reply_text: textToSend || "បុគ្គលិកបានផ្ញើរូបភាពជូនលោកអ្នក",
        staff_name: staffName,
        customer_name: activeSession?.userName,
        customer_email: activeSession?.userEmail,
        customer_phone: activeSession?.userPhone,
      }).catch(() => {});

      setReplyInput("");
      setAttachedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      markChatReadByAdmin(selectedChatId).catch(() => {});
    } catch (err: any) {
      showToast("❌ បរាជ័យក្នុងការផ្ញើសារ: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsSending(false);
    }
  };

  // Toggle Human Takeover (Pause AI / Resume AI)
  const handleToggleAiStatus = async () => {
    if (!selectedChatId) return;
    const newPaused = !activeSession?.ai_paused;
    const staffName = currentAdmin?.name || "S Tech Staff";

    try {
      await setChatAiStatus(selectedChatId, newPaused, staffName);
      showToast(
        newPaused
          ? "👤 បានដណ្តើមឆ្លើយផ្ទាល់ (AI ត្រូវបានផ្អាកបណ្តោះអាសន្ន)!"
          : "🤖 បានបើកដំណើរការ AI Assistant ឡើងវិញជោគជ័យ!",
        "success"
      );
    } catch (e: any) {
      showToast("❌ បរាជ័យក្នុងការកែប្រែស្ថានភាព AI", "error");
    }
  };

  // Toggle Ticket Status (Resolved / In Progress)
  const handleToggleTicketStatus = async () => {
    if (!selectedChatId) return;
    const isResolved = activeSession?.status === "resolved";
    const newStatus = isResolved ? "in_progress" : "resolved";
    const staffName = currentAdmin?.name || "Staff";

    try {
      await setChatTicketStatus(selectedChatId, newStatus, staffName);
      showToast(
        newStatus === "resolved"
          ? "✅ បានបញ្ចប់ Ticket ការសន្ទនានេះជោគជ័យ!"
          : "🔄 បានបើកដំណើរការ Ticket ឡើងវិញ!",
        "success"
      );
    } catch (e) {
      showToast("❌ បរាជ័យក្នុងការកែប្រែ Ticket", "error");
    }
  };

  // Handle staff image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("⚠️ សូមជ្រើសរើសឯកសាររូបភាព!", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("⚠️ រូបភាពត្រូវតែតូចជាង 5MB!", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
      showToast("📷 បានភ្ជាប់រូបភាពរួចរាល់!", "info");
    };
    reader.readAsDataURL(file);
  };

  // Copy Chat ID to clipboard
  const handleCopyChatId = () => {
    if (!selectedChatId) return;
    navigator.clipboard.writeText(selectedChatId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    showToast("📋 បានចម្លង Chat ID ចូល Clipboard!", "success");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-100px)] max-w-7xl mx-auto w-full bg-[#0c0e14] text-gray-100 rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* ─── Top Control Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3 bg-[#11141f] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {mobileView === "chat" && (
            <button
              onClick={() => setMobileView("list")}
              className="lg:hidden p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white active:scale-95 transition-all"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B1A1A] to-rose-600 text-white shadow-md shadow-red-950/40">
            <MessageSquare size={19} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#11141f]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Live Chat Support</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-bold">
                  RTDB Real-Time
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-gray-400 font-medium hidden sm:block">
              ឆ្លើយតបអតិថិជនផ្ទាល់ ២៤/៧ • Support Telegram Mini App & Web
            </p>
          </div>
        </div>

        {/* Quick Badges & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {totalUnread > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>{totalUnread} មិនទាន់អាន</span>
            </div>
          )}

          {totalTakeovers > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
              <Zap size={12} className="text-amber-400" />
              <span>{totalTakeovers} Takeover</span>
            </div>
          )}

          <button
            onClick={() => setAudioAlerts(!audioAlerts)}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
              audioAlerts
                ? "bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/[0.1]"
                : "bg-neutral-800 text-gray-500 border-neutral-700"
            }`}
            title={audioAlerts ? "បិទសំឡេង Notification" : "បើកសំឡេង Notification"}
          >
            {audioAlerts ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* ─── Main Content Split Workspace ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Pane: Customer Sessions List ── */}
        <div
          className={`${
            mobileView === "chat" ? "hidden" : "flex"
          } lg:flex flex-col w-full lg:w-[350px] shrink-0 border-r border-white/[0.08] bg-[#0f121b]`}
        >
          {/* Search Box */}
          <div className="p-3 border-b border-white/[0.06] space-y-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ស្វែងរកឈ្មោះ, លេខ, Email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181d2a] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B1A1A] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-xl border border-white/[0.04] text-[10.5px] font-bold">
              <button
                onClick={() => setStatusFilter("all")}
                className={`py-1 rounded-lg transition-all ${
                  statusFilter === "all" ? "bg-[#8B1A1A] text-white shadow-xs" : "text-gray-400 hover:text-white"
                }`}
              >
                ទាំងអស់ ({sessions.length})
              </button>
              <button
                onClick={() => setStatusFilter("unread")}
                className={`py-1 rounded-lg transition-all ${
                  statusFilter === "unread" ? "bg-[#8B1A1A] text-white shadow-xs" : "text-gray-400 hover:text-white"
                }`}
              >
                ថ្មី ({totalUnread})
              </button>
              <button
                onClick={() => setStatusFilter("takeover")}
                className={`py-1 rounded-lg transition-all ${
                  statusFilter === "takeover" ? "bg-[#8B1A1A] text-white shadow-xs" : "text-gray-400 hover:text-white"
                }`}
              >
                ឆ្លើយផ្ទាល់
              </button>
              <button
                onClick={() => setStatusFilter("resolved")}
                className={`py-1 rounded-lg transition-all ${
                  statusFilter === "resolved" ? "bg-[#8B1A1A] text-white shadow-xs" : "text-gray-400 hover:text-white"
                }`}
              >
                ដោះស្រាយរួច
              </button>
            </div>
          </div>

          {/* Sessions Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
                <MessageSquare size={36} className="text-gray-600 mb-2 stroke-1" />
                <p className="text-xs font-medium">មិនមានការសន្ទនាក្នុងលក្ខខណ្ឌនេះទេ</p>
                <span className="text-[10px] text-gray-600 mt-1">រង់ចាំសារថ្មីពីអតិថិជន...</span>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isSelected = selectedChatId === session.id;
                const isTelegramUser = session.id.startsWith("tg_");
                const isRegisteredUser = session.id.startsWith("user_");
                const hasUnread = (session.unreadAdminCount || 0) > 0;

                const timeStr = session.lastTimestamp
                  ? new Date(session.lastTimestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      setSelectedChatId(session.id);
                      setMobileView("chat");
                    }}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-[#8B1A1A]/30 via-red-950/20 to-transparent border-l-4 border-l-[#8B1A1A]"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* User Avatar with Channel Icon */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 flex items-center justify-center font-bold text-white text-xs border border-white/[0.1] shadow-inner">
                        {session.userName.charAt(0).toUpperCase()}
                      </div>
                      {isTelegramUser && (
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0088cc] flex items-center justify-center text-[9px] text-white font-bold border border-[#0f121b]"
                          title="Telegram User"
                        >
                          ✈
                        </span>
                      )}
                      {isRegisteredUser && (
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] text-white font-bold border border-[#0f121b]"
                          title="Registered Member"
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Meta & Last Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-white truncate max-w-[140px]">
                          {session.userName}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono shrink-0">{timeStr}</span>
                      </div>

                      <p
                        className={`text-[11.5px] truncate line-clamp-1 leading-relaxed ${
                          hasUnread ? "text-white font-bold" : "text-gray-400"
                        }`}
                      >
                        {session.lastMessage || "សារថ្មី"}
                      </p>

                      {/* Status Badges Row */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {session.ai_paused ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Zap size={9} />
                            <span>Staff Takeover</span>
                          </span>
                        ) : session.status === "resolved" ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✓ Resolved
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                            <Bot size={9} />
                            <span>AI Active</span>
                          </span>
                        )}

                        {hasUnread && (
                          <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
                            {session.unreadAdminCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Pane: Active Chat Conversation ── */}
        <div
          className={`${
            mobileView === "list" ? "hidden" : "flex"
          } lg:flex flex-col flex-1 bg-[#0a0c12] overflow-hidden`}
        >
          {selectedChatId && activeSession ? (
            <>
              {/* ── Chat Header ── */}
              <div className="px-4 py-3 bg-[#11141f] border-b border-white/[0.08] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8B1A1A] to-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-white/20">
                    {activeSession.userName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white truncate">
                        {activeSession.userName}
                      </h2>

                      {/* Chat ID Copy Button */}
                      <button
                        onClick={handleCopyChatId}
                        className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white transition-all"
                        title="Copy Chat ID"
                      >
                        <span>{activeSession.id.slice(0, 14)}...</span>
                        {copiedId ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>

                    {/* Contact Info Row */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                      {activeSession.userPhone && (
                        <a
                          href={`tel:${activeSession.userPhone}`}
                          className="hover:text-red-400 flex items-center gap-1 text-inherit no-underline"
                        >
                          <Phone size={11} />
                          <span>{activeSession.userPhone}</span>
                        </a>
                      )}
                      {activeSession.userEmail && (
                        <span className="flex items-center gap-1 truncate max-w-[160px]">
                          <Mail size={11} />
                          <span className="truncate">{activeSession.userEmail}</span>
                        </span>
                      )}
                      {activeSession.id.startsWith("tg_") && (
                        <span className="text-[#0088cc] font-semibold flex items-center gap-1">
                          ✈ Telegram Connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Takeover / Resume AI Toggle Button */}
                  <button
                    onClick={handleToggleAiStatus}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      activeSession.ai_paused
                        ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                        : "bg-amber-600 hover:bg-amber-500 text-white"
                    }`}
                    title={activeSession.ai_paused ? "បើក AI ឆ្លើយឡើងវិញ" : "ដណ្តើមឆ្លើយផ្ទាល់ (Pause AI)"}
                  >
                    {activeSession.ai_paused ? (
                      <>
                        <Bot size={14} />
                        <span className="hidden sm:inline">បើក AI ឆ្លើយឡើងវិញ</span>
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        <span className="hidden sm:inline">ឆ្លើយផ្ទាល់ (Pause AI)</span>
                      </>
                    )}
                  </button>

                  {/* Ticket Status Button */}
                  <button
                    onClick={handleToggleTicketStatus}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      activeSession.status === "resolved"
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60"
                        : "bg-white/[0.06] text-gray-300 border-white/[0.1] hover:bg-white/[0.12]"
                    }`}
                  >
                    <CheckCircle2 size={14} className={activeSession.status === "resolved" ? "text-emerald-400" : "text-gray-400"} />
                    <span className="hidden sm:inline">
                      {activeSession.status === "resolved" ? "បានបញ្ចប់" : "បញ្ចប់ Ticket"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Takeover Notice Banner */}
              {activeSession.ai_paused && (
                <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400 shrink-0" />
                    <span>
                      បុគ្គលិកកំពុងឆ្លើយតបផ្ទាល់ (AI ផ្អាកបណ្តោះអាសន្ន) ដោយ <strong>{activeSession.paused_by || "Staff"}</strong>
                    </span>
                  </div>
                  <button
                    onClick={handleToggleAiStatus}
                    className="text-[11px] underline font-bold text-amber-300 hover:text-white"
                  >
                    បើក AI វិញ
                  </button>
                </div>
              )}

              {/* ── Messages Stream ── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-radial from-[#131622] to-[#0a0c12]">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="w-8 h-8 border-2 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs">កំពុងទាញយកសារសន្ទនា...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <MessageSquare size={44} className="text-gray-700 mb-2 stroke-1" />
                    <p className="text-xs font-semibold text-gray-400">ការសន្ទនាទទេ</p>
                    <span className="text-[11px] text-gray-600 mt-0.5">
                      អតិថិជនមិនទាន់បានផ្ញើសារ ឬសារកំពុងរង់ចាំ...
                    </span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.sender === "admin" || msg.sender === "staff";
                    const isBot = msg.sender === "bot";
                    const isSystem = msg.sender === "system";

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="text-[10.5px] font-medium px-3 py-1 rounded-full bg-white/[0.05] text-gray-400 border border-white/[0.08]">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    const time = msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "";

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${
                          isStaff ? "ml-auto flex-row-reverse" : "mr-auto"
                        }`}
                      >
                        {/* Sender Avatar */}
                        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                          {isStaff ? (
                            <div className="w-full h-full rounded-full bg-[#8B1A1A] flex items-center justify-center">
                              🛡️
                            </div>
                          ) : isBot ? (
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center">
                              🤖
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-full bg-neutral-700 flex items-center justify-center">
                              {msg.senderName?.charAt(0) || "U"}
                            </div>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div className="space-y-1">
                          <div className={`flex items-center gap-1.5 text-[10px] ${isStaff ? "justify-end text-rose-300" : isBot ? "text-cyan-400" : "text-gray-400"}`}>
                            <span className="font-bold">{msg.senderName || (isStaff ? "Staff" : isBot ? "S Tech AI" : "Customer")}</span>
                            <span className="text-[9px] text-gray-500 font-mono">{time}</span>
                          </div>

                          <div
                            className={`p-3 rounded-2xl text-[13px] leading-relaxed break-words shadow-sm ${
                              isStaff
                                ? "bg-gradient-to-tr from-[#8B1A1A] to-[#b91c1c] text-white rounded-tr-none"
                                : isBot
                                ? "bg-[#181d2a] border border-cyan-500/20 text-gray-200 rounded-tl-none"
                                : "bg-[#1a1f2e] border border-white/[0.08] text-gray-100 rounded-tl-none"
                            }`}
                          >
                            {/* Attached Image if any */}
                            {msg.image && (
                              <div className="mb-2 rounded-xl overflow-hidden cursor-pointer" onClick={() => setZoomImage(msg.image || null)}>
                                <img
                                  src={msg.image}
                                  alt="Attached"
                                  className="max-h-56 w-auto object-cover rounded-xl border border-white/10 hover:opacity-90 transition-opacity"
                                />
                              </div>
                            )}

                            {/* Multiple Images if any */}
                            {msg.images && msg.images.length > 1 && (
                              <div className="grid grid-cols-2 gap-1.5 mb-2">
                                {msg.images.map((imgUrl, iIdx) => (
                                  <img
                                    key={iIdx}
                                    src={imgUrl}
                                    alt={`Attachment ${iIdx + 1}`}
                                    onClick={() => setZoomImage(imgUrl)}
                                    className="h-28 w-full object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-90"
                                  />
                                ))}
                              </div>
                            )}

                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Quick Responses Canned Bar ── */}
              <div className="px-3 py-2 bg-[#0e111a] border-t border-white/[0.06] overflow-x-auto flex items-center gap-2 scrollbar-none">
                <span className="text-[10px] font-bold text-gray-500 shrink-0 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" />
                  <span>ឆ្លើយរហ័ស:</span>
                </span>
                {QUICK_RESPONSES.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendReply(qr)}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-gray-300 hover:text-white border border-white/[0.08] transition-all active:scale-95 cursor-pointer truncate max-w-[240px]"
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Attached Preview */}
              {attachedImage && (
                <div className="px-4 py-2 bg-[#121622] border-t border-white/[0.06] flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={attachedImage}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-white/20"
                    />
                    <button
                      onClick={() => setAttachedImage(null)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">រូបភាពត្រៀមផ្ញើជូនអតិថិជន...</span>
                </div>
              )}

              {/* ── Input Box & Send Button ── */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReply();
                }}
                className="p-3 bg-[#11141f] border-t border-white/[0.08] flex items-center gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white transition-all active:scale-95"
                  title="ភ្ជាប់រូបភាព (Attach Image)"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  placeholder="វាយសារឆ្លើយតបទៅកាន់អតិថិជន... (Enter to send)"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  className="flex-1 bg-[#181d2a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8B1A1A] transition-all"
                />

                <button
                  type="submit"
                  disabled={(!replyInput.trim() && !attachedImage) || isSending}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#a11e1e] hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-red-950/40 active:scale-95 cursor-pointer"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={15} />
                      <span className="hidden sm:inline">ផ្ញើ</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-600 mb-4">
                <MessageSquare size={32} className="stroke-1" />
              </div>
              <h3 className="text-sm font-bold text-gray-300">សូមជ្រើសរើសការសន្ទនា</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                ជ្រើសរើសអតិថិជនពីបញ្ជីខាងឆ្វេង ដើម្បីមើលប្រវត្តិឆាត ឆ្លើយតបផ្ទាល់ ឬគ្រប់គ្រង Ticket។
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Image Zoom Preview Modal ── */}
      <AnimatePresence>
        {zoomImage && (
          <div
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setZoomImage(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh]">
              <img
                src={zoomImage}
                alt="Zoomed"
                className="max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain border border-white/20"
              />
              <button
                onClick={() => setZoomImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold shadow-lg"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Toast Alerts ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-[99999] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold border flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
                : toast.type === "error"
                ? "bg-red-950/90 text-red-200 border-red-500/40"
                : "bg-neutral-900/90 text-white border-white/20"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
