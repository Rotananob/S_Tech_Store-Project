import axios from "axios";
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
  const backend = process.env.BACKEND_URL || process.env.INTERNAL_API_URL || "http://127.0.0.1:8000/api";
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
        const adminToken = localStorage.getItem("stech_admin_token");
        if (adminToken) {
          config.headers["Authorization"] = `Bearer ${adminToken}`;
          config.headers["X-Admin-Token"] = adminToken;
          
          const storedUser = localStorage.getItem("stech_admin_user");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed?.role) {
              config.headers["X-Admin-Role"] = parsed.role;
            }
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
          const sessionUserStr = localStorage.getItem("stech_user_session");
          if (sessionUserStr) {
            const sessionUser = JSON.parse(sessionUserStr);
            if (sessionUser?.firebase_uid) {
              config.headers["X-Firebase-UID"] = sessionUser.firebase_uid;
              config.headers["X-Firebase-Email"] = sessionUser.email || "";
              config.headers["X-Firebase-Name"] = sessionUser.display_name || "";
              config.headers["X-Firebase-Photo"] = sessionUser.photo_url || sessionUser.avatar_url || "";
            }
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

// Response interceptor — handle 401 / 403 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // If unauthorized on admin route, we let the admin layout / view handle it
    }
    return Promise.reject(error);
  }
);

export default api;
