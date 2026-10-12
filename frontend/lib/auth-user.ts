import { getAuth } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface EffectiveUser {
  id: string | number;
  uid: string;
  firebase_uid: string;
  name: string;
  display_name: string;
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  photoURL?: string | null;
  username?: string | null;
  telegram?: string | null;
  telegram_id?: number | string | null;
  provider: "telegram" | "google" | "tiktok" | "email" | "anonymous";
  isTelegram?: boolean;
  [key: string]: any;
}

/**
 * getEffectiveUser
 * Unified, high-reliability authentication reader:
 * 1. Immediately detects Telegram Mini App context (`window.Telegram.WebApp.initDataUnsafe.user`)
 *    - 0ms latency, never kicks to login page inside Telegram!
 * 2. Checks local persistent session (`stech_user_session` / `user_session`)
 * 3. Checks Firebase Auth client (`auth.currentUser`)
 */
export function getEffectiveUser(): EffectiveUser | null {
  if (typeof window === "undefined") return null;

  // 1. Telegram Mini App Environment (Instantaneous First-Party Auth)
  try {
    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    if (tgUser && tgUser.id) {
      const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ")
        || tgUser.username
        || `Telegram User #${tgUser.id}`;

      const sessionObj: EffectiveUser = {
        id: `tg_${tgUser.id}`,
        uid: `tg_${tgUser.id}`,
        firebase_uid: `tg_${tgUser.id}`,
        telegram_id: tgUser.id,
        name: displayName,
        display_name: displayName,
        displayName: displayName,
        username: tgUser.username ? `@${tgUser.username}` : null,
        telegram: tgUser.username ? `@${tgUser.username}` : null,
        photo_url: tgUser.photo_url || null,
        photoURL: tgUser.photo_url || null,
        provider: "telegram",
        isTelegram: true,
      };

      // Ensure cached in localStorage for secondary checks
      try {
        if (!localStorage.getItem("stech_user_session")) {
          localStorage.setItem("stech_user_session", JSON.stringify(sessionObj));
          localStorage.setItem("user_session", JSON.stringify(sessionObj));
        }
      } catch (e) {}

      return sessionObj;
    }
  } catch (e) {}

  // 2. Local persistent customer session (Telegram 1-Click, TikTok, Google, or Email)
  try {
    const sessionStr = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      const uid = parsed?.firebase_uid || parsed?.uid || parsed?.id;
      if (uid) {
        const displayName = parsed.display_name || parsed.name || parsed.displayName || "Customer";
        return {
          id: parsed.id || uid,
          uid: String(uid),
          firebase_uid: String(uid),
          name: displayName,
          display_name: displayName,
          displayName: displayName,
          email: parsed.email || null,
          phone: parsed.phone || null,
          username: parsed.username || null,
          telegram: parsed.telegram || null,
          telegram_id: parsed.telegram_id || null,
          photo_url: parsed.photo_url || parsed.avatar || parsed.photoURL || null,
          photoURL: parsed.photo_url || parsed.avatar || parsed.photoURL || null,
          provider: parsed.provider || (String(uid).startsWith("tg_") ? "telegram" : "email"),
          isTelegram: String(uid).startsWith("tg_"),
          ...parsed,
        };
      }
    }
  } catch (e) {}

  // 3. Firebase Auth Client Session
  try {
    const fbUser = auth.currentUser;
    if (fbUser) {
      return {
        id: fbUser.uid,
        uid: fbUser.uid,
        firebase_uid: fbUser.uid,
        name: fbUser.displayName || "Customer",
        display_name: fbUser.displayName || "Customer",
        displayName: fbUser.displayName || "Customer",
        email: fbUser.email || null,
        phone: fbUser.phoneNumber || null,
        photo_url: fbUser.photoURL || null,
        photoURL: fbUser.photoURL || null,
        provider: "google",
      };
    }
  } catch (e) {}

  return null;
}

export function isUserAuthenticated(): boolean {
  return Boolean(getEffectiveUser());
}
