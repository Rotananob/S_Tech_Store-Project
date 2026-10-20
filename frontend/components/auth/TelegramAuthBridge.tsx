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

    const purgeUserSession = () => {
      localStorage.removeItem("customer_token");
      localStorage.removeItem("user_session");
      localStorage.removeItem("stech_user_session");
      localStorage.removeItem("stech_cached_user_profile");
      localStorage.removeItem("stech_cached_wallet");
      localStorage.removeItem("stech_cached_orders");
      localStorage.removeItem("stech_telegram_connected");
      document.cookie = "customer_token=; path=/; max-age=0; SameSite=Lax";
      window.dispatchEvent(new Event("user_session_updated"));
    };

    const applyUserSession = (rawUser: any, token?: string) => {
      // Invalidate stale caches so switching accounts shows 100% accurate profile immediately
      localStorage.removeItem("stech_cached_user_profile");
      localStorage.removeItem("stech_cached_wallet");
      localStorage.removeItem("stech_cached_orders");

      const cleanTgId = rawUser.telegram_id || rawUser.telegram_chat_id || (typeof rawUser.uid === "string" && rawUser.uid.startsWith("tg_") ? rawUser.uid.replace("tg_", "") : null);
      const resolvedUid = rawUser.firebase_uid || rawUser.uid || (cleanTgId ? `tg_${cleanTgId}` : `stech_u_${rawUser.id}`);

      const userObj = {
        ...rawUser,
        firebase_uid: resolvedUid,
        uid: resolvedUid,
        display_name: rawUser.display_name || rawUser.name || "Customer",
        provider: rawUser.provider || "telegram",
      };
      localStorage.setItem("user_session", JSON.stringify(userObj));
      localStorage.setItem("stech_user_session", JSON.stringify(userObj));
      localStorage.setItem("stech_telegram_connected", "true");

      localStorage.setItem("stech_cached_user_profile", JSON.stringify({
        ...userObj,
        points: Number(rawUser.points || 0),
        wallet_balance: Number(rawUser.wallet_balance || 0),
      }));

      if (token) {
        localStorage.setItem("customer_token", token);
        document.cookie = `customer_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
      }
      window.dispatchEvent(new Event("user_session_updated"));
    };

    // A. Check for 1-Click tg_token in URL (Top Authority from Bot Link)
    const urlParams = new URLSearchParams(window.location.search);
    const tgToken = urlParams.get("tg_token");
    const isChatRequest = urlParams.get("open_chat") === "1" || 
                          urlParams.get("open_chat") === "true" ||
                          urlParams.get("chat") === "open" ||
                          urlParams.get("chat") === "1" ||
                          window.location.hash === "#chat";

    if (isChatRequest) {
      try {
        sessionStorage.setItem("stech_auto_open_chat", "1");
      } catch (e) {}
      window.dispatchEvent(new CustomEvent("stech_trigger_open_chat"));
    }

    const getResolvedTarget = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const fromQuery = urlParams.get("redirect") || urlParams.get("return_to");
      if (fromQuery && fromQuery.startsWith("/")) return fromQuery;
      const fromStorage = sessionStorage.getItem("stech_auth_redirect");
      if (fromStorage && fromStorage.startsWith("/")) return fromStorage;
      return "/";
    };

    if (tgToken) {
      api.get(`/auth/telegram/token-login?token=${encodeURIComponent(tgToken)}`)
        .then((res) => {
          if (res.data?.success && res.data?.user) {
            applyUserSession(res.data.user, res.data.token);

            if (isChatRequest) {
              window.dispatchEvent(new CustomEvent("stech_trigger_open_chat"));
            }

            if (window.location.pathname.includes("/login") || window.location.pathname.includes("/register")) {
              const target = getResolvedTarget();
              sessionStorage.removeItem("stech_auth_redirect");
              window.location.href = target;
            } else {
              // Clean URL query params without reloading
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
              if (isChatRequest) {
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("stech_trigger_open_chat"));
                }, 150);
              }
            }
          }
        })
        .catch(() => {});
      return; // Prioritize tg_token, do not run concurrent miniapp-sync
    }

    // B. Check for Telegram Mini App environment (No tg_token in URL)
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch (e) {}

      const tgUser = tg.initDataUnsafe?.user;

      if (tgUser && tgUser.id) {
        const existingRaw = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
        let existing: any = null;
        try {
          if (existingRaw) existing = JSON.parse(existingRaw);
        } catch (e) {}

        // Multi-Telegram Account Isolation: If stored account is from a different Telegram ID, purge immediately!
        const existingTgId = existing?.telegram_id || (typeof existing?.uid === "string" && existing.uid.startsWith("tg_") ? existing.uid.replace("tg_", "") : null);
        if (existingTgId && String(existingTgId) !== String(tgUser.id)) {
          purgeUserSession();
          try { sessionStorage.removeItem("stech_tg_synced_" + tgUser.id); } catch (_) {}
        }

        // Sync with backend to check if actively connected or disconnected (Cached for 5 minutes to avoid spamming every page transition)
        const lastSyncTimeStr = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("stech_tg_synced_" + tgUser.id) : null;
        const isFresh = lastSyncTimeStr && (Date.now() - Number(lastSyncTimeStr) < 5 * 60 * 1000);

        if (!isFresh) {
          api.post("/auth/telegram/miniapp-sync", {
            telegram_user: tgUser,
            init_data: tg.initData,
          })
            .then((res) => {
              if (res.data?.success) {
                try { sessionStorage.setItem("stech_tg_synced_" + tgUser.id, String(Date.now())); } catch (_) {}
                if (res.data.linked === false || !res.data.user) {
                  // AUTO-LOGOUT IN MINI APP! User disconnected Telegram or has no active link
                  purgeUserSession();
                } else if (res.data.user) {
                  // AUTO-LOGIN TO ACTIVE NEW ACCOUNT!
                  applyUserSession(res.data.user, res.data.token);

                  if (window.location.pathname.includes("/login") || window.location.pathname.includes("/register")) {
                    const redirectTarget = getResolvedTarget();
                    sessionStorage.removeItem("stech_auth_redirect");
                    window.location.href = redirectTarget;
                  }
                }
              }
            })
            .catch((err) => {
              if (err?.response?.status === 403) {
                // Account has been suspended by Admin
                purgeUserSession();
                alert(err?.response?.data?.error || "គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការ (Account disabled)។");
              }
            });
        }
      }
    }

    // C. Lock & Resume: Auto-detect pending handshake when user returns from Telegram app
    // Note: If user is on /login or /register, the dedicated page controllers handle their own polling & UI!
    const isAuthPage = typeof window !== "undefined" && (
      window.location.pathname.includes("/login") || 
      window.location.pathname.includes("/register")
    );
    if (isAuthPage) {
      return;
    }

    let lastHandshakeCheck = 0;
    const checkPendingHandshake = () => {
      if (Date.now() - lastHandshakeCheck < 3500) return;
      lastHandshakeCheck = Date.now();

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
              localStorage.setItem("stech_telegram_connected", "true");
              localStorage.setItem("customer_token", checkRes.data.token);
              document.cookie = `customer_token=${checkRes.data.token}; path=/; max-age=2592000; SameSite=Lax`;
              localStorage.removeItem("stech_pending_tg_handshake");
              sessionStorage.removeItem("stech_pending_tg_handshake");
              window.dispatchEvent(new Event("user_session_updated"));
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
