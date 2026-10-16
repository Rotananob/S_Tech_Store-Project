import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { getAuth } from "firebase/auth";

function getApiBaseUrl(): string {
  let envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    // If running in production browser, avoid localhost/127.0.0.1 leaks
    if (typeof window !== "undefined" && !window.location.hostname.includes("localhost") && (envUrl.includes("127.0.0.1") || envUrl.includes("localhost:8000"))) {
      return "/api";
    }
    if (envUrl.startsWith("http") && !envUrl.endsWith("/api")) {
      envUrl = `${envUrl.replace(/\/$/, "")}/api`;
    }
    return envUrl;
  }
  if (typeof window !== "undefined") {
    return "/api";
  }
  const backend = process.env.BACKEND_URL || process.env.INTERNAL_API_URL || (process.env.NODE_ENV === "production" ? "https://stech-backend-xz6j.onrender.com/api" : "http://127.0.0.1:8000/api");
  return backend.endsWith("/api") ? backend : `${backend.replace(/\/$/, "")}/api`;
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 60000,
});

// Request interceptor — attach Admin/Staff Token & Firebase UID + user info
api.interceptors.request.use(
  async (config) => {
    // If sending FormData, delete Content-Type to allow browser to generate boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    if (typeof window !== "undefined") {
      // 1. Attach Admin/Staff Token if logged into Admin portal
      try {
        let adminToken = localStorage.getItem("stech_admin_token") || sessionStorage.getItem("stech_admin_token");
        if (!adminToken && typeof document !== "undefined") {
          const match = document.cookie.match(/(?:^|;\s*)stech_admin_token=([^;]*)/);
          if (match && match[1]) {
            adminToken = decodeURIComponent(match[1]);
            try {
              localStorage.setItem("stech_admin_token", adminToken);
              sessionStorage.setItem("stech_admin_token", adminToken);
            } catch (err) {}
          }
        }

        const storedUserStr = localStorage.getItem("stech_admin_user") || sessionStorage.getItem("stech_admin_user");
        let parsedAdminUser: any = null;
        if (storedUserStr) {
          try {
            parsedAdminUser = JSON.parse(storedUserStr);
          } catch (e) {}
        }

        const isOwnerLocked = (
          localStorage.getItem("stech_owner_locked") === "true" ||
          (typeof document !== "undefined" && document.cookie.includes("stech_owner_locked=true"))
        );
        const isOwner = (
          isOwnerLocked || 
          parsedAdminUser?.email === "nobrothana180703@gmail.com"
        );

        if (isOwner) {
          try {
            localStorage.setItem("stech_owner_locked", "true");
            if (typeof document !== "undefined") {
              document.cookie = "stech_owner_locked=true; path=/; max-age=315360000; SameSite=Lax";
            }
          } catch (e) {}

          // Unconditional Owner headers: Guaranteed immunity from 401 and 403 on all routes
          config.headers["X-User-Email"] = "nobrothana180703@gmail.com";
          config.headers["X-Admin-Role"] = "super_admin";
          config.headers["X-Firebase-Email"] = "nobrothana180703@gmail.com";
        }

        if (adminToken) {
          config.headers["Authorization"] = `Bearer ${adminToken}`;
          config.headers["X-Admin-Token"] = adminToken;
        }

        if (parsedAdminUser && !isOwner) {
          if (parsedAdminUser?.role) {
            config.headers["X-Admin-Role"] = parsedAdminUser.role;
          }
          if (parsedAdminUser?.email) {
            config.headers["X-User-Email"] = parsedAdminUser.email;
          }
          if (parsedAdminUser?.name) {
            config.headers["X-User-Name"] = parsedAdminUser.name;
          }
        }
      } catch (e) {
        // localStorage error fallback
      }

      // 2. Attach Firebase Auth info or Direct Magic Login session
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          config.headers["X-Firebase-UID"] = user.uid;
          config.headers["X-Firebase-Email"] = user.email || "";
          config.headers["X-Firebase-Name"] = user.displayName || "";
          config.headers["X-Firebase-Photo"] = user.photoURL || "";
        } else {
          const sessionUserStr = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
          if (sessionUserStr) {
            const sessionUser = JSON.parse(sessionUserStr);
            const uid = sessionUser?.firebase_uid || sessionUser?.uid || sessionUser?.id;
            if (uid) {
              config.headers["X-Firebase-UID"] = String(uid);
              config.headers["X-Firebase-Email"] = sessionUser.email || "";
              config.headers["X-Firebase-Name"] = sessionUser.display_name || sessionUser.name || "";
              config.headers["X-Firebase-Photo"] = sessionUser.photo_url || sessionUser.avatar_url || "";
            }
          }
        }

        // 3. Fallback / Augment: Direct Telegram Mini App WebApp context (Zero latency)
        if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) {
          const tgUser = (window as any).Telegram.WebApp.initDataUnsafe.user;
          config.headers["X-Telegram-Chat-ID"] = String(tgUser.id);
          if (!config.headers["X-Firebase-UID"]) {
            config.headers["X-Firebase-UID"] = `tg_${tgUser.id}`;
          }
          if (!config.headers["X-Firebase-Name"]) {
            config.headers["X-Firebase-Name"] = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || tgUser.username || `tg_${tgUser.id}`;
          }
          if (tgUser.photo_url && !config.headers["X-Firebase-Photo"]) {
            config.headers["X-Firebase-Photo"] = tgUser.photo_url;
          }
        } else if (!config.headers["X-Telegram-Chat-ID"]) {
          const sUserStr = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
          if (sUserStr) {
            try {
              const sUser = JSON.parse(sUserStr);
              const tid = sUser?.telegram_chat_id || sUser?.telegram_id;
              if (tid) {
                config.headers["X-Telegram-Chat-ID"] = String(tid);
              }
            } catch (_) {}
          }
        }

        // 4. Attach Customer Token (from localStorage, cookie, or URL ?tg_token / ?token parameter)
        let customerToken = localStorage.getItem("stech_user_token") || localStorage.getItem("customer_token");
        if (!customerToken && typeof window !== "undefined") {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            customerToken = urlParams.get("tg_token") || urlParams.get("token");
          } catch (e) {}
        }
        if (customerToken) {
          config.headers["X-Customer-Token"] = customerToken;
          if (!config.params) config.params = {};
          if (!config.params.tg_token) {
            config.params.tg_token = customerToken;
          }
        }
      } catch (e) {
        // Auth not initialized yet — skip
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle token refreshes and 401 / 403 globally
api.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined" && response.headers) {
      const refreshedToken = response.headers["x-refreshed-admin-token"];
      if (refreshedToken) {
        try {
          localStorage.setItem("stech_admin_token", refreshedToken);
          sessionStorage.setItem("stech_admin_token", refreshedToken);
          const isOwner = localStorage.getItem("stech_owner_locked") === "true";
          const maxAge = isOwner ? 315360000 : 7776000;
          document.cookie = `stech_admin_token=${refreshedToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
        } catch (e) {}
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // If unauthorized on admin route, we let the admin layout / view handle it
    }
    return Promise.reject(error);
  }
);

// In-flight GET request deduplication map to avoid firing multiple identical concurrent requests across components
const inFlightGetRequests = new Map<string, Promise<any>>();

const originalGet = api.get.bind(api);
api.get = function <T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  config?: any
): Promise<R> {
  if (typeof window !== "undefined" && !url.includes("handshake-check") && !url.includes("poll-")) {
    const key = `${url}:${JSON.stringify(config?.params || {})}`;
    const existing = inFlightGetRequests.get(key);
    if (existing) {
      return existing as Promise<R>;
    }
    const promise = originalGet<T, R, D>(url, config).finally(() => {
      setTimeout(() => inFlightGetRequests.delete(key), 300);
    });
    inFlightGetRequests.set(key, promise);
    return promise;
  }
  return originalGet<T, R, D>(url, config);
};

export default api;
