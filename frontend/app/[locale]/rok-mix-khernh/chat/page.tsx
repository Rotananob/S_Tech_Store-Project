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
  Crown, 
  Phone, 
  Mail, 
  CheckCheck, 
  Sparkles, 
  ExternalLink, 
  RefreshCw,
  ShoppingBag,
  Bell,
  Zap
} from "lucide-react";
import { 
  subscribeToAllChats, 
  subscribeToMessages, 
  sendChatMessage, 
  markChatReadByAdmin,
  setChatAiStatus,
  subscribeToChatMeta,
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
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [sending, setSending] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const [activeChatMeta, setActiveChatMeta] = useState<{ ai_paused?: boolean; paused_by?: string } | null>(null);
  const [bypassNotice, setBypassNotice] = useState<string | null>(null);
  const [currentStaff, setCurrentStaff] = useState<{ name: string; role: string }>({
    name: "S Tech Support",
    role: "staff",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for Direct Bypass Token from Telegram
  useEffect(() => {
    const bypassToken = searchParams?.get("bypass_token");
    const targetChatId = searchParams?.get("chat_id");

    if (bypassToken) {
      api.post("/admin/verify-bypass-token", { bypass_token: bypassToken })
        .then((res) => {
          if (res.data?.success) {
            const data = res.data;
            if (data.admin_token) {
              localStorage.setItem("stech_admin_token", data.admin_token);
              localStorage.setItem("stech_admin_user", JSON.stringify(data.admin_user));
              document.cookie = `stech_admin_token=${data.admin_token}; path=/; max-age=3600`;
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
            setBypassNotice(`⚡ បានចូលបន្ទប់ឆាតដោយជោគជ័យតាមរយៈ Direct Bypass Token (សល់ ${data.uses_remaining} ដង)!`);
            setTimeout(() => setBypassNotice(null), 8000);
          }
        })
        .catch((err) => {
          const errMsg = err.response?.data?.error || "តំណភ្ជាប់ Bypass មិនត្រឹមត្រូវ ឬផុតកំណត់";
          setBypassNotice(`⚠️ ${errMsg}`);
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

  // Subscribe to all chats in real-time from Firebase RTDB
  useEffect(() => {
    const unsub = subscribeToAllChats((incomingChats) => {
      setChats(incomingChats);
      // Auto select first chat if none selected yet
      if (!selectedChatId && incomingChats.length > 0) {
        setSelectedChatId(incomingChats[0].id);
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
    try {
      await setChatAiStatus(selectedChatId, true, currentStaff.name);
    } catch (err) {
      console.error("Failed to pause AI:", err);
    } finally {
      setTogglingAi(false);
    }
  };

  // Handle Staff Leave Chat (Resume AI)
  const handleResumeAi = async () => {
    if (!selectedChatId || togglingAi) return;
    setTogglingAi(true);
    try {
      await setChatAiStatus(selectedChatId, false, currentStaff.name);
    } catch (err) {
      console.error("Failed to resume AI:", err);
    } finally {
      setTogglingAi(false);
    }
  };

  const filteredChats = chats.filter((c) => {
    const matchSearch =
      c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.userEmail && c.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.userPhone && c.userPhone.includes(searchQuery)) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === "unread") {
      return matchSearch && c.unreadAdminCount > 0;
    }
    return matchSearch;
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
    } catch (err) {
      console.error("Failed to send reply to RTDB:", err);
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
    <div className="space-y-4">
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

      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-md">
              <MessageSquare size={18} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Real-time Customer Chat
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Firebase Realtime Database Connected
                </span>
                <span>•</span>
                <span>{chats.length} សន្ទនាសរុប</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Staff Badge */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
          {currentStaff.role === "admin" ? (
            <Crown size={15} className="text-amber-500" />
          ) : (
            <ShieldCheck size={15} className="text-blue-500" />
          )}
          <span className="text-xs font-bold text-gray-800">
            ឆ្លើយតបជា៖ <span className="text-[#8B1A1A]">{currentStaff.name}</span>
          </span>
        </div>
      </div>

      {/* Main Chat Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-230px)] min-h-[580px]">
        {/* Left Sidebar: Chat List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm flex flex-col overflow-hidden">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-gray-100 space-y-2.5 bg-gray-50/50">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-[#8B1A1A] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-[#8B1A1A] text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                ទាំងអស់ ({chats.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  filter === "unread"
                    ? "bg-red-600 text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                មិនទាន់អាន
                {chats.filter((c) => c.unreadAdminCount > 0).length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {chats.filter((c) => c.unreadAdminCount > 0).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Chat List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center">
                <MessageSquare size={32} className="text-gray-300 mb-2 stroke-1" />
                <p className="text-xs font-medium">មិនមានសារឆាតនៅឡើយទេ</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  នៅពេលអតិថិជនឆាតលើ website វានឹងបង្ហាញនៅទីនេះភ្លាមៗ
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                const isUnread = chat.unreadAdminCount > 0;

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
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                        {chat.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
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

                      {/* Contact Badges & AI Status */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
                        {chat.ai_paused && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[9px] flex items-center gap-0.5">
                            👤 Staff Takeover
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
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/80 shadow-sm flex flex-col overflow-hidden">
          {activeChat ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 sm:p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8B1A1A] to-red-600 text-white font-bold flex items-center justify-center shadow-xs shrink-0">
                    {activeChat.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-gray-900 truncate">
                        {activeChat.userName}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 truncate">
                      {activeChat.userPhone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone size={10} className="text-red-500" /> {activeChat.userPhone}
                        </span>
                      )}
                      {activeChat.userEmail && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail size={10} className="text-blue-500" /> {activeChat.userEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* AI Status & Takeover Toggle (Facebook / Instagram Style) */}
                  {activeChatMeta?.ai_paused ? (
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        AI ត្រូវបានផ្អាក ({activeChatMeta.paused_by || "Staff"} កំពុងឆ្លើយ)
                      </span>
                      <button
                        type="button"
                        onClick={handleResumeAi}
                        disabled={togglingAi}
                        title="ចាកចេញពីឆាត និងបើកដំណើរការ AI ឡើងវិញ"
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles size={14} />
                        <span>ចាកចេញ & បើក AI វិញ (Resume AI)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                        <Sparkles size={12} className="text-blue-600" />
                        AI កំពុងឆ្លើយតប
                      </span>
                      <button
                        type="button"
                        onClick={handleTakeoverChat}
                        disabled={togglingAi}
                        title="ចូលឆ្លើយផ្ទាល់ និងបិទសិទ្ធិ AI កុំឱ្យឆ្លើយជាន់"
                        className="px-3.5 py-1.5 bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:opacity-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Zap size={14} />
                        <span>ចូលឆ្លើយផ្ទាល់ (Take Over / Pause AI)</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-gray-400 hidden lg:inline font-mono">
                    ID: {activeChat.id.substring(0, 10)}...
                  </span>
                </div>
              </div>

              {/* Message History Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-gray-50/40">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                    <Sparkles size={28} className="text-red-300 mb-2" />
                    <p className="text-xs font-bold text-gray-600">សន្ទនាជាមួយ {activeChat.userName}</p>
                    <p className="text-[11px] text-gray-400">
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
                            <div className="mb-2.5 p-2 rounded-xl bg-black/10 dark:bg-white/10 flex items-center gap-2 border border-white/20">
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
              <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
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
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!replyInput.trim() || sending}
                  className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Send size={14} />
                  <span>ផ្ញើ • Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <MessageSquare size={48} className="text-gray-300 mb-3 stroke-1" />
              <h3 className="text-base font-bold text-gray-700">សូមជ្រើសរើសការសន្ទនាណាមួយ</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                ជ្រើសរើសអតិថិជនពីបញ្ជីខាងឆ្វេង ដើម្បីមើលសារ និងឆ្លើយតប Real-time ជាមួយ Firebase RTDB
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
