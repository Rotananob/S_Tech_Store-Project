"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Clock, 
  ShieldCheck, 
  Phone, 
  Mail, 
  CheckCheck, 
  Sparkles, 
  ExternalLink, 
  RefreshCw,
  ShoppingBag,
  Bell,
  Zap,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  X,
  Tag,
  Inbox,
  ChevronLeft,
  Bot
} from "lucide-react";
import { 
  subscribeToAllChats, 
  subscribeToMessages, 
  sendChatMessage, 
  markChatReadByAdmin,
  setChatAiStatus,
  subscribeToChatMeta,
  notifyCustomerOfAdminReply,
  setChatTicketStatus,
  archiveChatSession,
  deleteChatSession,
  ChatSession, 
  ChatMessage 
} from "@/lib/services/chat.service";

const QUICK_REPLIES = [
  "👋 សួស្តីបាទ! តើ S Tech Store អាចជួយអ្វីបានដែរ?",
  "📦 ទំនិញនេះមានក្នុងស្តុកស្រាប់ អាចកម្ម៉ង់បានភ្លាមៗបាទ!",
  "🚚 យើងមានសេវាដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត-ក្រុងបាទ!",
  "💵 តម្លៃនេះមានការធានាផ្លូវការជូនត្រឹមត្រូវបាទ!",
  "📍 សូមជួយផ្ញើលេខទូរស័ព្ទ និងទីតាំងដឹកជញ្ជូនមកបាទ!",
];

export default function AdminRealtimeChatPage() {
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyInput, setReplyInput] = useState("");
  const [filter, setFilter] = useState<"active" | "unread" | "resolved" | "all" | "archived">("active");
  const [sending, setSending] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeChatMeta, setActiveChatMeta] = useState<{ ai_paused?: boolean; paused_by?: string; status?: string } | null>(null);
  const [bypassNotice, setBypassNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [currentStaff, setCurrentStaff] = useState<{ name: string; role: string }>({
    name: "S Tech Support",
    role: "staff",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for Direct 1-Click Access Token from Telegram
  useEffect(() => {
    const directToken = searchParams?.get("token") || searchParams?.get("bypass_token");
    const targetChatId = searchParams?.get("chat_id");

    if (directToken) {
      api.post("/admin/verify-bypass-token", { bypass_token: directToken, token: directToken })
        .then((res) => {
          if (res.data?.success) {
            const data = res.data;
            const authToken = data.token || data.admin_token;
            if (authToken) {
              localStorage.setItem("stech_admin_token", authToken);
              localStorage.setItem("token", authToken);
              localStorage.setItem("stech_admin_user", JSON.stringify(data.admin_user));
              document.cookie = `stech_admin_token=${authToken}; path=/; max-age=86400`;
              api.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;
              window.dispatchEvent(new Event("stech_admin_auth_updated"));
            }
            if (data.admin_user) {
              setCurrentStaff({
                name: data.admin_user.name,
                role: data.admin_user.role,
              });
            }
            if (targetChatId || data.chat_id) {
              setSelectedChatId(targetChatId || data.chat_id);
            }
            setBypassNotice(`បានចូលបន្ទប់ឆាតដោយជោគជ័យតាមរយៈ 1-Click Direct Token (សល់ ${data.uses_remaining} ដង)`);
            setTimeout(() => setBypassNotice(null), 8000);
          }
        })
        .catch((err) => {
          const errMsg = err.response?.data?.error || "តំណភ្ជាប់ Token មិនត្រឹមត្រូវ ឬផុតកំណត់";
          setBypassNotice(errMsg);
          setTimeout(() => setBypassNotice(null), 8000);
        });
    }
  }, [searchParams]);

  // Fetch logged in admin / staff info
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("stech_admin_user");
      if (userStr) {
        const u = JSON.parse(userStr);
        setCurrentStaff({
          name: u.name || "S Tech Staff",
          role: u.role || "staff",
        });
      }
    } catch (e) {}
  }, []);

  // Subscribe to all chats in real-time
  useEffect(() => {
    const unsub = subscribeToAllChats((incomingChats) => {
      setChats(incomingChats);
      // Auto select first chat on desktop only (keep list view default on phones)
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
      if (!selectedChatId && incomingChats.length > 0 && isDesktop) {
        const firstActive = incomingChats.find(c => !c.is_archived) || incomingChats[0];
        setSelectedChatId(firstActive.id);
      }
    });

    return () => unsub();
  }, [selectedChatId]);

  // Subscribe to active chat messages in real-time
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    // Mark as read by admin
    markChatReadByAdmin(selectedChatId).catch(() => {});

    const unsub = subscribeToMessages(selectedChatId, (incomingMsgs) => {
      setMessages(incomingMsgs);
    });

    const unsubMeta = subscribeToChatMeta(selectedChatId, (meta) => {
      setActiveChatMeta(meta);
    });

    return () => {
      unsub();
      unsubMeta();
    };
  }, [selectedChatId]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeChat = chats.find((c) => c.id === selectedChatId) || null;

  // Handle Staff Take Over Chat (Pause AI)
  const handleTakeoverChat = async () => {
    if (!selectedChatId || togglingAi) return;
    setTogglingAi(true);
    showToast("កំពុងផ្អាក AI Bot...", "info");
    try {
      await setChatAiStatus(selectedChatId, true, currentStaff.name);
      showToast("✅ បានផ្អាក AI Bot ជោគជ័យ! អ្នកអាចជជែកផ្ទាល់ជាមួយអតិថិជន", "success");
    } catch (err) {
      console.error("Failed to pause AI:", err);
      showToast("❌ មិនអាចផ្អាក AI បានទេ", "error");
    } finally {
      setTogglingAi(false);
    }
  };

  // Handle Staff Leave Chat (Resume AI)
  const handleResumeAi = async () => {
    if (!selectedChatId || togglingAi) return;
    setTogglingAi(true);
    showToast("កំពុងបើកដំណើរការ AI Bot ឡើងវិញ...", "info");
    try {
      await setChatAiStatus(selectedChatId, false, currentStaff.name);
      showToast("✅ បានបើកដំណើរការ AI Bot ឡើងវិញជោគជ័យ", "success");
    } catch (err) {
      console.error("Failed to resume AI:", err);
      showToast("❌ មិនអាចបើកដំណើរការ AI ឡើងវិញបានទេ", "error");
    } finally {
      setTogglingAi(false);
    }
  };

  // Resolve Ticket
  const handleResolveTicket = async () => {
    if (!selectedChatId || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await setChatTicketStatus(selectedChatId, "resolved", currentStaff.name);
      showToast("✅ Ticket ការសន្ទនាត្រូវបានបញ្ចប់ជោគជ័យ!", "success");
    } catch (err) {
      showToast("❌ មិនអាចបញ្ចប់ Ticket បានទេ", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Reopen Ticket
  const handleReopenTicket = async () => {
    if (!selectedChatId || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await setChatTicketStatus(selectedChatId, "in_progress", currentStaff.name);
      showToast("🔄 Ticket ត្រូវបានបើកដំណើរការឡើងវិញ", "success");
    } catch (err) {
      showToast("❌ មិនអាចបើក Ticket បានទេ", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Archive / Unarchive
  const handleToggleArchive = async () => {
    if (!selectedChatId || !activeChat) return;
    const nextState = !activeChat.is_archived;
    try {
      await archiveChatSession(selectedChatId, nextState);
      showToast(nextState ? "🗄️ បានដាក់ក្នុងបណ្ណសារ (Archived)" : "📂 បានដកចេញពីបណ្ណសារ (Unarchived)", "info");
    } catch {
      showToast("❌ មិនអាចផ្លាស់ប្តូរបណ្ណសារបានទេ", "error");
    }
  };

  // Delete Chat Session
  const handleDeleteChat = async () => {
    if (!selectedChatId || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteChatSession(selectedChatId);
      showToast("🗑️ បានលុបការសន្ទនាចេញពីប្រព័ន្ធដោយជោគជ័យ", "success");
      setDeleteConfirmOpen(false);
      const remaining = chats.filter((c) => c.id !== selectedChatId);
      setSelectedChatId(remaining.length > 0 ? remaining[0].id : null);
    } catch (err) {
      showToast("❌ បរាជ័យក្នុងការលុបការសន្ទនា", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(`📋 បានចម្លង ${field}`, "info");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Metrics for tabs
  const activeCount = chats.filter((c) => !c.is_archived && c.status !== "resolved").length;
  const resolvedCount = chats.filter((c) => !c.is_archived && c.status === "resolved").length;
  const unreadCount = chats.filter((c) => !c.is_archived && c.unreadAdminCount > 0).length;
  const archivedCount = chats.filter((c) => !!c.is_archived).length;
  const allNonArchivedCount = chats.filter((c) => !c.is_archived).length;

  const filteredChats = chats.filter((c) => {
    const matchSearch =
      c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.userEmail && c.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.userPhone && c.userPhone.includes(searchQuery)) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (filter === "active") {
      return !c.is_archived && c.status !== "resolved";
    }
    if (filter === "resolved") {
      return !c.is_archived && c.status === "resolved";
    }
    if (filter === "unread") {
      return !c.is_archived && c.unreadAdminCount > 0;
    }
    if (filter === "archived") {
      return !!c.is_archived;
    }
    // "all" tab shows all non-archived
    return !c.is_archived;
  });

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || replyInput).trim();
    if (!textToSend || !selectedChatId) return;

    setSending(true);
    try {
      // Auto-pause AI if not already paused when staff sends a message to prevent simultaneous replies
      if (!activeChatMeta?.ai_paused) {
        setChatAiStatus(selectedChatId, true, currentStaff.name).catch(() => {});
      }

      await sendChatMessage(
        selectedChatId,
        {
          sender: currentStaff.role === "admin" ? "admin" : "staff",
          senderName: currentStaff.name,
          text: textToSend,
        },
        activeChat
          ? {
              userName: activeChat.userName,
              userEmail: activeChat.userEmail,
              userPhone: activeChat.userPhone,
            }
          : undefined
      );

      if (!customText) {
        setReplyInput("");
      }

      // Notify customer via Telegram if connected
      const alertRes = await notifyCustomerOfAdminReply({
        chat_id: selectedChatId,
        customer_email: activeChat?.userEmail,
        customer_phone: activeChat?.userPhone,
        customer_name: activeChat?.userName,
        reply_text: textToSend,
        staff_name: currentStaff.name,
      });

      if (alertRes.telegram_alerted) {
        showToast("✅ បានឆ្លើយតប និងបាញ់ Alert ទៅ Telegram របស់អតិថិជនជោគជ័យ!", "success");
      }
    } catch (err) {
      console.error("Failed to send reply:", err);
      showToast("❌ បរាជ័យក្នុងការផ្ញើសារ! សូមព្យាយាមម្តងទៀត", "error");
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Direct Bypass Access Notification Banner */}
      {bypassNotice && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white px-4 py-3 rounded-2xl shadow-md font-bold text-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Zap size={18} className="animate-bounce" />
            <span>{bypassNotice}</span>
          </div>
          <button
            onClick={() => setBypassNotice(null)}
            className="text-white/80 hover:text-white text-xs px-2 py-1 rounded bg-black/20 cursor-pointer"
          >
            បិទ
          </button>
        </div>
      )}

      {/* Real-time Action Toast Banner */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl shadow-md font-bold text-sm flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
              : toast.type === "error"
              ? "bg-gradient-to-r from-red-600 to-rose-600 text-white"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell size={18} className="animate-pulse shrink-0" />
            <span>{toast.msg}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/80 hover:text-white text-xs px-2 py-1 rounded bg-black/20 cursor-pointer ml-3"
          >
            បិទ
          </button>
        </div>
      )}

      {/* Page Title & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-md">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Real-time Customer Chat & Support Hub
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-0.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Support Active (ប្រព័ន្ធឆាតផ្ទាល់ដំណើរការ)
                </span>
                <span>•</span>
                <span>{chats.length} សន្ទនាសរុប</span>
                <span>•</span>
                <span className="text-blue-600 font-bold">{activeCount} កំពុងសន្ទនា</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">{resolvedCount} បានបញ្ចប់</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Staff Badge */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl self-start sm:self-auto shadow-xs">
          {currentStaff.role === "admin" ? (
            <ShieldCheck size={16} className="text-amber-500" />
          ) : (
            <ShieldCheck size={16} className="text-blue-500" />
          )}
          <span className="text-xs font-bold text-gray-800">
            ឆ្លើយតបជា៖ <span className="text-[#8B1A1A]">{currentStaff.name}</span>
          </span>
        </div>
      </div>

      {/* Main Chat Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100dvh-200px)] min-h-[500px] lg:h-[calc(100vh-230px)] lg:min-h-[580px]">
        {/* Left Sidebar: Chat List (4 cols) */}
        <div className={`lg:col-span-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col overflow-hidden ${selectedChatId ? "hidden lg:flex" : "flex h-full"}`}>
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-gray-100 space-y-2.5 bg-gray-50/60">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកតាមឈ្មោះ, Email, លេខទូរស័ព្ទ..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-[#8B1A1A] focus:ring-2 focus:ring-red-100 transition-all"
              />
            </div>

            {/* Ticket & Status Filters */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setFilter("active")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  filter === "active"
                    ? "bg-[#8B1A1A] text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span>កំពុងឆាត</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "active" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  filter === "unread"
                    ? "bg-red-600 text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span>មិនទាន់អាន</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFilter("resolved")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  filter === "resolved"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span>បានបញ្ចប់</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "resolved" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                  {resolvedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  filter === "all"
                    ? "bg-gray-800 text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span>ទាំងអស់</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                  {allNonArchivedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("archived")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  filter === "archived"
                    ? "bg-amber-700 text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Archive size={12} />
                <span>បណ្ណសារ</span>
                {archivedCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "archived" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                    {archivedCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Chat List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center">
                <Inbox size={34} className="text-gray-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-gray-600">មិនមានការសន្ទនាក្នុងថតនេះទេ</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  ជ្រើសរើសផ្ទាំង &quot;ទាំងអស់&quot; ឬរង់ចាំអតិថិជនផ្ញើសារថ្មីមកកាន់ហាង
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                const isUnread = chat.unreadAdminCount > 0;
                const isResolved = chat.status === "resolved";

                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-red-50/70 border-l-4 border-l-[#8B1A1A]"
                        : "hover:bg-gray-50/80"
                    }`}
                  >
                    {/* User Avatar with Initials */}
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full text-white font-bold text-sm flex items-center justify-center shadow-xs ${
                        isResolved 
                          ? "bg-gradient-to-br from-emerald-600 to-teal-700" 
                          : "bg-gradient-to-br from-gray-700 to-gray-900"
                      }`}>
                        {chat.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        isResolved ? "bg-gray-400" : "bg-emerald-500"
                      }`} />
                    </div>

                    {/* Chat Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs truncate ${isUnread ? "font-black text-gray-950" : "font-bold text-gray-800"}`}>
                          {chat.userName}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                          {formatTimestamp(chat.lastTimestamp)}
                        </span>
                      </div>

                      <p className={`text-xs truncate ${isUnread ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
                        {chat.lastMessage || "(សារថ្មី)"}
                      </p>

                      {/* Contact Badges & Ticket Status */}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[10px]">
                        {isResolved ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[9px] flex items-center gap-1">
                            <CheckCircle2 size={10} /> បានបញ្ចប់
                          </span>
                        ) : chat.ai_paused ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[9px] flex items-center gap-1">
                            <User size={9} /> <span>Staff Takeover</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[9px] flex items-center gap-1">
                            <Bot size={9} /> <span>AI Assistant</span>
                          </span>
                        )}

                        {chat.is_archived && (
                          <span className="px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-700 font-bold text-[9px] flex items-center gap-1">
                            <Archive size={9} /> បណ្ណសារ
                          </span>
                        )}

                        {(chat.userPhone || chat.userEmail) && (
                          <span className="text-gray-400 flex items-center gap-1.5 truncate">
                            {chat.userPhone && (
                              <span className="flex items-center gap-0.5">
                                <Phone size={9} /> {chat.userPhone}
                              </span>
                            )}
                            {chat.userEmail && !chat.userPhone && (
                              <span className="flex items-center gap-0.5 truncate">
                                <Mail size={9} /> {chat.userEmail}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {isUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 self-center animate-pulse" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Conversation (8 cols) */}
        <div className={`lg:col-span-8 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col overflow-hidden relative ${!selectedChatId ? "hidden lg:flex" : "flex h-full"}`}>
          {activeChat ? (
            <>
              {/* Active Chat Header with Ticket Controls */}
              <div className="p-3.5 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Mobile Back Button to Chat List */}
                  <button
                    type="button"
                    onClick={() => setSelectedChatId(null)}
                    className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="ត្រឡប់ទៅបញ្ជីការសន្ទនា (Back to chat list)"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full text-white font-black text-sm sm:text-base flex items-center justify-center shadow-xs shrink-0 ${
                    activeChat.status === "resolved"
                      ? "bg-gradient-to-tr from-emerald-600 to-teal-700"
                      : "bg-gradient-to-tr from-[#8B1A1A] to-red-600"
                  }`}>
                    {activeChat.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm sm:text-base font-black text-gray-900 truncate">
                        {activeChat.userName}
                      </h2>
                      {activeChat.status === "resolved" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                          <CheckCircle2 size={11} /> Ticket Closed (បានបញ្ចប់)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Support
                        </span>
                      )}
                      {activeChat.is_archived && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold border border-gray-200">
                          <Archive size={10} /> Archived
                        </span>
                      )}
                    </div>

                    {/* Customer Real Contact Bar */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                      {activeChat.userPhone && (
                        <button
                          type="button"
                          onClick={() => handleCopy(activeChat.userPhone!, "លេខទូរស័ព្ទ")}
                          className="flex items-center gap-1 font-mono text-gray-700 hover:text-red-600 transition-colors cursor-pointer border-none bg-transparent"
                          title="ចុចដើម្បីចម្លងលេខទូរស័ព្ទ"
                        >
                          <Phone size={11} className="text-red-500" />
                          <span>{activeChat.userPhone}</span>
                          {copiedField === "លេខទូរស័ព្ទ" ? <Check size={11} className="text-emerald-600" /> : <Copy size={10} className="text-gray-400" />}
                        </button>
                      )}
                      {activeChat.userEmail && (
                        <button
                          type="button"
                          onClick={() => handleCopy(activeChat.userEmail!, "Email")}
                          className="flex items-center gap-1 text-gray-700 hover:text-blue-600 transition-colors cursor-pointer border-none bg-transparent truncate max-w-[220px]"
                          title="ចុចដើម្បីចម្លង Email"
                        >
                          <Mail size={11} className="text-blue-500 shrink-0" />
                          <span className="truncate">{activeChat.userEmail}</span>
                          {copiedField === "Email" ? <Check size={11} className="text-emerald-600 shrink-0" /> : <Copy size={10} className="text-gray-400 shrink-0" />}
                        </button>
                      )}
                      <span className="text-[10px] text-gray-400 font-mono">
                        Session: {activeChat.id.substring(0, 10)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ticket Controls & AI Takeover Action Group */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {/* AI Status & Takeover Toggle */}
                  {activeChatMeta?.ai_paused ? (
                    <button
                      type="button"
                      onClick={handleResumeAi}
                      disabled={togglingAi}
                      title="ចាកចេញពីឆាត និងបើកដំណើរការ AI ឡើងវិញ"
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles size={13} />
                      <span>បើក AI វិញ (Resume)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTakeoverChat}
                      disabled={togglingAi}
                      title="ចូលឆ្លើយផ្ទាល់ និងបិទសិទ្ធិ AI កុំឱ្យឆ្លើយជាន់"
                      className="px-3 py-1.5 bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Zap size={13} />
                      <span>ឆ្លើយផ្ទាល់ (Pause AI)</span>
                    </button>
                  )}

                  {/* Resolve / Reopen Ticket */}
                  {activeChat.status !== "resolved" ? (
                    <button
                      type="button"
                      onClick={handleResolveTicket}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      title="បញ្ចប់ Ticket សន្ទនានេះ"
                    >
                      <CheckCircle2 size={13} />
                      <span>បញ្ចប់ Ticket</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReopenTicket}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      title="បើក Ticket ឡើងវិញ"
                    >
                      <RotateCcw size={13} />
                      <span>បើក Ticket វិញ</span>
                    </button>
                  )}

                  {/* Archive / Unarchive */}
                  <button
                    type="button"
                    onClick={handleToggleArchive}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-gray-200"
                    title={activeChat.is_archived ? "ដកចេញពីបណ្ណសារ (Unarchive)" : "ដាក់ក្នុងបណ្ណសារ (Archive)"}
                  >
                    {activeChat.is_archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                  </button>

                  {/* Delete Conversation */}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-red-200"
                    title="លុបប្រវត្តិសន្ទនានេះជាស្ថាពរ"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Message History Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-gray-50/40">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                    <Sparkles size={30} className="text-red-300 mb-2" />
                    <p className="text-xs font-bold text-gray-700">សន្ទនាជាមួយ {activeChat.userName}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      ផ្ញើសារខាងក្រោមដើម្បីជួយឆ្លើយតបសំណួរជូនអតិថិជន
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.sender === "admin" || msg.sender === "staff";
                    const isSystem = msg.sender === "system";

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="bg-amber-50 border border-amber-200/80 text-amber-900 text-xs px-3.5 py-1.5 rounded-full shadow-xs flex items-center gap-2 max-w-md">
                            <Bell size={13} className="text-amber-600 shrink-0" />
                            <span>{msg.text}</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                      >
                        {/* Sender Label */}
                        <span className="text-[10px] font-bold text-gray-400 mb-1 px-1">
                          {isStaff ? `🛡️ ${msg.senderName} (Staff)` : activeChat.userName}
                        </span>

                        {/* Message Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-xs ${
                            isStaff
                              ? "bg-gradient-to-r from-[#8B1A1A] to-red-700 text-white rounded-tr-xs"
                              : "bg-white text-gray-900 border border-gray-200 rounded-tl-xs shadow-xs"
                          }`}
                        >
                          {/* Attached Product Preview */}
                          {msg.productInfo?.name && (
                            <div className="mb-2.5 p-2 rounded-xl bg-black/10 flex items-center gap-2 border border-white/20">
                              {msg.productInfo.image && (
                                <img
                                  src={msg.productInfo.image}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-contain bg-white p-0.5"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-bold truncate">
                                  {msg.productInfo.name}
                                </div>
                                {msg.productInfo.price && (
                                  <div className="text-[10px] font-mono font-bold">
                                    ${msg.productInfo.price}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="whitespace-pre-wrap">{msg.text}</div>

                          <div
                            className={`text-[9.5px] mt-1.5 text-right font-medium ${
                              isStaff ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            {formatTimestamp(msg.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies Carousel */}
              <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-black uppercase text-gray-400 shrink-0 mr-1">
                  ឆ្លើយរហ័ស:
                </span>
                {QUICK_REPLIES.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(qr)}
                    className="shrink-0 px-2.5 py-1 bg-gray-100 hover:bg-red-50 hover:text-[#8B1A1A] text-gray-700 rounded-full text-[11px] font-medium transition-colors border border-gray-200 hover:border-red-200 cursor-pointer"
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-gray-100 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder="វាយសារឆ្លើយតបទៅកាន់អតិថិជន... (Type message and press Enter)"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] focus:bg-white focus:ring-2 focus:ring-red-100 transition-all"
                />
                <button
                  type="submit"
                  disabled={!replyInput.trim() || sending}
                  className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Send size={14} />
                  <span>ផ្ញើ • Send</span>
                </button>
              </form>

              {/* Delete Confirmation Popup Modal */}
              {deleteConfirmOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-gray-900">
                          លុបប្រវត្តិសន្ទនានេះ?
                        </h3>
                        <p className="text-xs text-gray-500">
                          ការសន្ទនាជាមួយ <b className="text-gray-800">{activeChat.userName}</b>
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed mb-6 bg-red-50/50 p-3 rounded-xl border border-red-100">
                      សកម្មភាពនេះនឹងលុបសារ និងប្រវត្តិសន្ទនាទាំងអស់ចេញពី Database ជាស្ថាពរ ហើយមិនអាចត្រឡប់មកវិញបានទេ។
                    </p>

                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmOpen(false)}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border-none"
                      >
                        បោះបង់
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteChat}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-none flex items-center gap-1.5 shadow-sm"
                      >
                        <Trash2 size={13} />
                        <span>{isDeleting ? "កំពុងលុប..." : "លុបជាស្ថាពរ"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <MessageSquare size={48} className="text-gray-300 mb-3 stroke-1" />
              <h3 className="text-base font-bold text-gray-700">សូមជ្រើសរើសការសន្ទនាណាមួយ</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                ជ្រើសរើសអតិថិជនពីបញ្ជីខាងឆ្វេង ដើម្បីមើលសារ និងឆ្លើយតបភ្លាមៗជូនអតិថិជន
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
