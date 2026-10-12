"use client";

import { useEffect } from "react";
import api from "@/lib/api";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
            language_code?: string;
          };
        };
      };
    };
  }
}

/**
 * TelegramAuthBridge
 * Handles seamless 1-Click Telegram Authentication:
 * 1. Auto-detects ?tg_token=... from Telegram Bot 1-click links, logs user in silently without page reload.
 * 2. Auto-detects Telegram Mini App environment and auto-authenticates user profile from Telegram WebApp SDK,
 *    eradicating the "Please Sign In" popup inside Telegram!
 */
export default function TelegramAuthBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // A. Check for 1-Click tg_token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tgToken = urlParams.get("tg_token");

    if (tgToken) {
      api.get(`/auth/telegram/token-login?token=${encodeURIComponent(tgToken)}`)
        .then((res) => {
          if (res.data?.success && res.data?.user) {
            const rawUser = res.data.user;
            const userObj = {
              ...rawUser,
              firebase_uid: rawUser.firebase_uid || rawUser.uid || `tg_${rawUser.id || rawUser.telegram_id}`,
              uid: rawUser.uid || rawUser.firebase_uid || `tg_${rawUser.id || rawUser.telegram_id}`,
              display_name: rawUser.display_name || rawUser.name,
              provider: "telegram",
            };
            localStorage.setItem("user_session", JSON.stringify(userObj));
            localStorage.setItem("stech_user_session", JSON.stringify(userObj));
            localStorage.setItem("customer_token", res.data.token);
            document.cookie = `customer_token=${res.data.token}; path=/; max-age=2592000; SameSite=Lax`;
            window.dispatchEvent(new Event("user_session_updated"));

            if (window.location.pathname.includes("/login") || window.location.pathname.includes("/register")) {
              window.location.href = "/";
            } else {
              // Clean URL query params without reloading
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            }
          }
        })
        .catch(() => {});
    }

    // B. Check for Telegram Mini App environment
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch (e) {}

      const tgUser = tg.initDataUnsafe?.user;

      if (tgUser && tgUser.id) {
        const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") 
          || tgUser.username 
          || `Telegram User #${tgUser.id}`;

        const existingRaw = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
        let existing = null;
        try {
          if (existingRaw) existing = JSON.parse(existingRaw);
        } catch (e) {}

        const sessionPayload = {
          ...existing,
          id: `tg_${tgUser.id}`,
          uid: `tg_${tgUser.id}`,
          firebase_uid: `tg_${tgUser.id}`,
          telegram_id: tgUser.id,
          name: displayName,
          display_name: displayName,
          username: tgUser.username ? `@${tgUser.username}` : (existing?.username || null),
          telegram: tgUser.username ? `@${tgUser.username}` : (existing?.telegram || null),
          photo_url: tgUser.photo_url || existing?.photo_url || null,
          avatar: tgUser.photo_url || existing?.avatar || null,
          phone: existing?.phone || null,
          provider: "telegram",
        };

        const clientToken = localStorage.getItem("customer_token") || `tg_miniapp_${tgUser.id}_${Date.now()}`;
        localStorage.setItem("user_session", JSON.stringify(sessionPayload));
        localStorage.setItem("stech_user_session", JSON.stringify(sessionPayload));
        localStorage.setItem("customer_token", clientToken);
        document.cookie = `customer_token=${clientToken}; path=/; max-age=2592000; SameSite=Lax`;
        window.dispatchEvent(new Event("user_session_updated"));

        // If user landed on login or register while inside Telegram Mini App, auto-navigate to home or checkout!
        if (window.location.pathname.includes("/login") || window.location.pathname.includes("/register")) {
          const redirectTarget = new URLSearchParams(window.location.search).get("redirect") || "/";
          window.location.href = redirectTarget;
        }

        // Sync with backend asynchronously
        api.post("/auth/telegram/miniapp-sync", {
          telegram_user: tgUser,
          init_data: tg.initData,
        })
          .then((res) => {
            if (res.data?.success) {
              if (res.data?.token) {
                localStorage.setItem("customer_token", res.data.token);
                document.cookie = `customer_token=${res.data.token}; path=/; max-age=2592000; SameSite=Lax`;
              }
              if (res.data?.user) {
                const updatedObj = { ...sessionPayload, ...res.data.user };
                localStorage.setItem("user_session", JSON.stringify(updatedObj));
                localStorage.setItem("stech_user_session", JSON.stringify(updatedObj));
                window.dispatchEvent(new Event("user_session_updated"));
              }
            }
          })
          .catch(() => {});
      }
    }

    // C. Lock & Resume: Auto-detect pending handshake when user returns from Telegram app
    const checkPendingHandshake = () => {
      try {
        const existing = localStorage.getItem("user_session") || localStorage.getItem("stech_user_session");
        if (existing) {
          localStorage.removeItem("stech_pending_tg_handshake");
          sessionStorage.removeItem("stech_pending_tg_handshake");
          return;
        }

        const rawPending = localStorage.getItem("stech_pending_tg_handshake") || sessionStorage.getItem("stech_pending_tg_handshake");
        if (!rawPending) return;

        const pending = JSON.parse(rawPending);
        if (!pending?.token || (Date.now() - (pending.createdAt || 0)) > 600000) {
          localStorage.removeItem("stech_pending_tg_handshake");
          sessionStorage.removeItem("stech_pending_tg_handshake");
          return;
        }

        api.get(`/auth/telegram/handshake-check?token=${encodeURIComponent(pending.token)}`)
          .then((checkRes) => {
            if (checkRes.data?.success && checkRes.data?.completed && checkRes.data?.user) {
              const rawUser = checkRes.data.user;
              const userObj = {
                ...rawUser,
                firebase_uid: rawUser.firebase_uid || rawUser.uid || `tg_${rawUser.id || rawUser.telegram_id}`,
                uid: rawUser.uid || rawUser.firebase_uid || `tg_${rawUser.id || rawUser.telegram_id}`,
                display_name: rawUser.display_name || rawUser.name,
                provider: "telegram",
              };
              localStorage.setItem("user_session", JSON.stringify(userObj));
              localStorage.setItem("stech_user_session", JSON.stringify(userObj));
              localStorage.setItem("customer_token", checkRes.data.token);
              document.cookie = `customer_token=${checkRes.data.token}; path=/; max-age=2592000; SameSite=Lax`;
              localStorage.removeItem("stech_pending_tg_handshake");
              sessionStorage.removeItem("stech_pending_tg_handshake");
              window.dispatchEvent(new Event("user_session_updated"));
              if (window.location.pathname.includes("/login") || window.location.pathname.includes("/register")) {
                window.location.href = "/";
              }
            }
          })
          .catch(() => {});
      } catch (e) {}
    };

    // Check immediately on load
    checkPendingHandshake();

    // Check on window focus and tab visibility change (e.g. user switched back from Telegram app)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkPendingHandshake();
      }
    };

    window.addEventListener("focus", checkPendingHandshake);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", checkPendingHandshake);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
