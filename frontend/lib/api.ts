import axios from "axios";
import { getAuth } from "firebase/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 60000,
});

// Request interceptor — attach Firebase UID + user info for user isolation
api.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          config.headers["X-Firebase-UID"] = user.uid;
          config.headers["X-Firebase-Email"] = user.email || "";
          config.headers["X-Firebase-Name"] = user.displayName || "";
          config.headers["X-Firebase-Photo"] = user.photoURL || "";
        }
      } catch (e) {
        // Firebase not initialized yet — skip
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Optionally redirect to login
    }
    return Promise.reject(error);
  }
);

export default api;
