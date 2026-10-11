import { rtdb } from "@/lib/firebase";
import { ref, push, set, update, onValue, query, orderByChild } from "firebase/database";

export interface ChatMessage {
  id: string;
  sender: "user" | "admin" | "staff" | "system";
  senderName: string;
  text: string;
  timestamp: number;
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
    productInfo?: ChatMessage["productInfo"];
  },
  meta?: {
    userName?: string;
    userEmail?: string;
    userPhone?: string;
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

  if (message.sender === "user") {
    // Increment admin unread count
    updates.lastUserSender = message.senderName;
  } else {
    // Admin replied, reset unreadAdminCount
    updates.unreadAdminCount = 0;
  }

  await update(sessionRef, updates);
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
