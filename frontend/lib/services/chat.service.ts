import { rtdb } from "@/lib/firebase";
import { ref, push, set, update, get, onValue, query, orderByChild } from "firebase/database";
import api from "@/lib/api";

export interface ChatMessage {
  id: string;
  sender: "user" | "admin" | "staff" | "system";
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
  status: "active" | "resolved" | "closed";
  ai_paused?: boolean;
  paused_by?: string;
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
 * Send a chat message into Firebase Realtime Database
 */
export async function sendChatMessage(
  chatId: string,
  message: {
    sender: "user" | "admin" | "staff" | "system";
    senderName: string;
    text: string;
    sessionId?: string | null;
    productInfo?: ChatMessage["productInfo"];
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

  const msgPayload = {
    sender: message.sender,
    senderName: message.senderName,
    text: message.text,
    timestamp: now,
    sessionId: message.sessionId || meta?.sessionId || null,
    productInfo: message.productInfo || null,
  };

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
  status?: string;
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
        return {
          id: key,
          userName: meta.userName || "អតិថិជន • Customer",
          userEmail: meta.userEmail || "",
          userPhone: meta.userPhone || "",
          lastMessage: meta.lastMessage || "(សារថ្មី)",
          lastTimestamp: meta.lastTimestamp || 0,
          unreadAdminCount: meta.unreadAdminCount || 0,
          unreadUserCount: meta.unreadUserCount || 0,
          status: meta.status || "active",
          ai_paused: !!meta.ai_paused,
          paused_by: meta.paused_by || "",
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

