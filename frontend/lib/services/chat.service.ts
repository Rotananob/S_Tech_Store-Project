import { rtdb } from "@/lib/firebase";
import { ref, push, set, update, get, remove, onValue, query, orderByChild } from "firebase/database";
import api from "@/lib/api";

export interface ChatMessage {
  id: string;
  sender: "user" | "admin" | "staff" | "system" | "bot";
  senderName: string;
  text: string;
  timestamp: number;
  sessionId?: string | null;
  productInfo?: {
    name?: string;
    price?: number | string;
    image?: string;
    slug?: string;
  } | null;
  image?: string;
  images?: string[];
}

export interface ChatSession {
  id: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  lastMessage: string;
  lastTimestamp: number;
  unreadAdminCount: number;
  unreadUserCount: number;
  status: "open" | "in_progress" | "resolved" | "active" | "closed" | "archived";
  ai_paused?: boolean;
  paused_by?: string;
  is_archived?: boolean;
  archived_at?: number | null;
  status_updated_at?: number | null;
  status_updated_by?: string | null;
}

/**
 * Returns a stable unique ID for visitors across sessions
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "server_guest";
  const KEY = "stech_chat_visitor_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "visitor_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Resolves the active customer chatId consistently across all components (Mini App & Web)
 */
export function getActiveCustomerChatId(): string {
  if (typeof window === "undefined") return "server_guest";
  try {
    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    if (tgUser?.id) {
      return `tg_${tgUser.id}`;
    }

    const stored = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.id) return String(parsed.id).startsWith("tg_") || String(parsed.id).startsWith("user_") ? String(parsed.id) : `user_${parsed.id}`;
      if (parsed?.uid) return String(parsed.uid).startsWith("tg_") || String(parsed.uid).startsWith("user_") ? String(parsed.uid) : `user_${parsed.uid}`;
      if (parsed?.firebase_uid) return String(parsed.firebase_uid);
    }
  } catch {}
  return getOrCreateVisitorId();
}

/**
 * Send a chat message into Firebase Realtime Database
 */
export async function sendChatMessage(
  chatId: string,
  message: {
    sender: "user" | "admin" | "staff" | "system" | "bot";
    senderName: string;
    text: string;
    sessionId?: string | null;
    productInfo?: ChatMessage["productInfo"];
    image?: string;
    images?: string[];
  },
  meta?: {
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    sessionId?: string;
  }
): Promise<void> {
  if (!rtdb) {
    console.warn("RTDB unavailable, skipping live message send");
    return;
  }
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);
  const now = Date.now();

  const msgPayload: Record<string, any> = {
    sender: message.sender,
    senderName: message.senderName,
    text: message.text,
    timestamp: now,
    sessionId: message.sessionId || meta?.sessionId || null,
    productInfo: message.productInfo || null,
  };

  if (message.image) msgPayload.image = message.image;
  if (message.images && message.images.length > 0) msgPayload.images = message.images;

  await set(newMsgRef, msgPayload);

  // Update session root meta
  const sessionRef = ref(rtdb, `chats/${chatId}/meta`);
  const updates: Record<string, any> = {
    id: chatId,
    lastMessage: message.text,
    lastTimestamp: now,
    status: "active",
  };

  if (meta?.userName) updates.userName = meta.userName;
  if (meta?.userEmail) updates.userEmail = meta.userEmail;
  if (meta?.userPhone) updates.userPhone = meta.userPhone;
  if (meta?.sessionId) updates.activeSessionId = meta.sessionId;

  try {
    const snap = await get(sessionRef);
    const curr = snap.val() || {};
    if (message.sender === "user") {
      updates.unreadAdminCount = (curr.unreadAdminCount || 0) + 1;
      updates.unreadUserCount = 0;
      updates.lastUserSender = message.senderName;
    } else {
      // Admin or staff replied -> increment user's unread count for the website live chat icon badge!
      updates.unreadAdminCount = 0;
      updates.unreadUserCount = (curr.unreadUserCount || 0) + 1;
    }
  } catch (e) {
    if (message.sender === "user") {
      updates.lastUserSender = message.senderName;
    } else {
      updates.unreadAdminCount = 0;
    }
  }

  await update(sessionRef, updates);
}

/**
 * Update activeSessionId in RTDB when user starts or switches sessions
 */
export async function updateChatActiveSession(
  chatId: string,
  sessionId: string
): Promise<void> {
  if (!rtdb) return;
  const sessionRef = ref(rtdb, `chats/${chatId}/meta`);
  await update(sessionRef, {
    activeSessionId: sessionId,
  }).catch(() => {});
}

/**
 * Set AI paused/active status for a chat (Admin Takeover / Leave)
 */
export async function setChatAiStatus(
  chatId: string,
  paused: boolean,
  staffName?: string
): Promise<void> {
  if (!rtdb) return;
  const sessionRef = ref(rtdb, `chats/${chatId}/meta`);
  const now = Date.now();
  await update(sessionRef, {
    ai_paused: paused,
    paused_by: paused ? (staffName || "S Tech Staff") : null,
    paused_at: paused ? now : null,
  });

  // Push audit system message into message thread
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);
  await set(newMsgRef, {
    sender: "system",
    senderName: "System Notice",
    text: paused
      ? `👤 ${staffName || "បុគ្គលិក"} បានចូលឆ្លើយតបផ្ទាល់ (AI ផ្អាកបណ្តោះអាសន្ន)`
      : `🤖 AI Assistant ត្រូវបានបើកដំណើរការឡើងវិញ`,
    timestamp: now,
  });
}

export interface ChatMeta {
  ai_paused?: boolean;
  paused_by?: string;
  status?: "open" | "in_progress" | "resolved" | "active" | "closed" | "archived";
  is_archived?: boolean;
  archived_at?: number | null;
  status_updated_at?: number | null;
  status_updated_by?: string | null;
  unreadAdminCount?: number;
  unreadUserCount?: number;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  lastMessage?: string;
  lastTimestamp?: number;
}

/**
 * Subscribe to chat meta (AI paused status, unread counts, etc.) in real time
 */
export function subscribeToChatMeta(
  chatId: string,
  callback: (meta: ChatMeta | null) => void
): () => void {
  if (!rtdb) {
    callback(null);
    return () => {};
  }
  const sessionRef = ref(rtdb, `chats/${chatId}/meta`);
  const unsubscribe = onValue(
    sessionRef,
    (snapshot) => {
      const val = snapshot.val();
      callback(val || null);
    },
    (err) => {
      console.warn("RTDB meta subscription notice:", err.message);
      callback(null);
    }
  );
  return unsubscribe;
}

/**
 * Listen to messages for a single chat in real-time
 */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  if (!rtdb) {
    callback([]);
    return () => {};
  }
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);

  const unsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }

      const list: ChatMessage[] = Object.keys(val).map((key) => ({
        id: key,
        ...val[key],
      }));

      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      callback(list);
    },
    (err) => {
      console.warn("RTDB chat subscription notice:", err.message);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Listen to all customer chat sessions (for Admin Real-time Chat page)
 */
export function subscribeToAllChats(
  callback: (chats: ChatSession[]) => void
): () => void {
  if (!rtdb) {
    callback([]);
    return () => {};
  }
  const chatsRef = ref(rtdb, "chats");

  const unsubscribe = onValue(
    chatsRef,
    (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }

      const list: ChatSession[] = Object.keys(val).map((key) => {
        const item = val[key];
        const meta = item?.meta || {};

        let resolvedUserName = meta.userName || "";
        // If userName is generic "បង" or empty, try deriving real identity from userEmail or userId
        if ((!resolvedUserName || resolvedUserName === "បង" || resolvedUserName === "អតិថិជន") && meta.userEmail) {
          const emailPrefix = meta.userEmail.split("@")[0];
          resolvedUserName = emailPrefix.replace(/[._-]+/g, " ");
        } else if (!resolvedUserName) {
          resolvedUserName = "ភ្ញៀវ • Visitor";
        }

        return {
          id: key,
          userName: resolvedUserName,
          userEmail: meta.userEmail || "",
          userPhone: meta.userPhone || "",
          lastMessage: meta.lastMessage || "(សារថ្មី)",
          lastTimestamp: meta.lastTimestamp || 0,
          unreadAdminCount: meta.unreadAdminCount || 0,
          unreadUserCount: meta.unreadUserCount || 0,
          status: meta.status || "in_progress",
          ai_paused: !!meta.ai_paused,
          paused_by: meta.paused_by || "",
          is_archived: !!meta.is_archived,
          archived_at: meta.archived_at || null,
          status_updated_at: meta.status_updated_at || null,
          status_updated_by: meta.status_updated_by || null,
        };
      });

      // Sort newest chats first
      list.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
      callback(list);
    },
    (err) => {
      console.warn("RTDB chats subscription notice:", err.message);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Mark chat messages read by Admin
 */
export async function markChatReadByAdmin(chatId: string): Promise<void> {
  if (!rtdb) return;
  const sessionRef = ref(rtdb, `chats/${chatId}/meta`);
  await update(sessionRef, { unreadAdminCount: 0 });
}

/**
 * Mark chat messages read by User (Customer)
 */
export async function markChatReadByUser(chatId: string): Promise<void> {
  if (!rtdb) return;
  const sessionRef = ref(rtdb, `chats/${chatId}/meta`);
  await update(sessionRef, { unreadUserCount: 0 });
}

/**
 * Update chat ticket status (In Progress, Resolved)
 */
export async function setChatTicketStatus(
  chatId: string,
  status: "in_progress" | "resolved",
  staffName?: string
): Promise<void> {
  if (!rtdb) return;
  const sessionRef = ref(rtdb, `chats/${chatId}/meta`);
  const now = Date.now();
  await update(sessionRef, {
    status,
    status_updated_at: now,
    status_updated_by: staffName || "Staff",
  });

  // Push an audit system note into the thread
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);
  await set(newMsgRef, {
    sender: "system",
    senderName: status === "resolved" ? "Ticket Resolved" : "Ticket In Progress",
    text: status === "resolved"
      ? `✅ Ticket ការសន្ទនាត្រូវបានបញ្ចប់ដោយ ${staffName || "Staff"}។ អរគុណសម្រាប់ការទាក់ទងមកកាន់ S Tech Store!`
      : `🔄 Ticket ត្រូវបានបើកដំណើរការឡើងវិញដោយ ${staffName || "Staff"}`,
    timestamp: now,
  });
}

/**
 * Archive or Unarchive a chat session
 */
export async function archiveChatSession(
  chatId: string,
  isArchived: boolean
): Promise<void> {
  if (!rtdb) return;
  const sessionRef = ref(rtdb, `chats/${chatId}/meta`);
  await update(sessionRef, {
    is_archived: isArchived,
    archived_at: isArchived ? Date.now() : null,
  });
}

/**
 * Permanently delete a chat session from Realtime Database
 */
export async function deleteChatSession(chatId: string): Promise<void> {
  if (!rtdb) return;
  const chatRef = ref(rtdb, `chats/${chatId}`);
  await remove(chatRef);
}

/**
 * Notify customer on Telegram Bot when admin/staff replies in Live Chat
 */
export async function notifyCustomerOfAdminReply(data: {
  chat_id: string;
  reply_text: string;
  staff_name?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}): Promise<{ success: boolean; telegram_alerted?: boolean; message?: string }> {
  try {
    const res = await api.post("/chat/admin-reply-alert", data);
    return res.data;
  } catch (err: any) {
    console.warn("Failed to send Telegram alert for admin reply:", err?.message);
    return {
      success: false,
      telegram_alerted: false,
      message: err.response?.data?.message || "Failed to alert Telegram",
    };
  }
}

