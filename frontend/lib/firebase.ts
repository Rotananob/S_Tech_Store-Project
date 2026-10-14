// ─── Firebase Config ─────────────────────────────────────────────────────────
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const DEFAULT_RTDB_URL = "https://fir-tech-store-default-rtdb.asia-southeast1.firebasedatabase.app";

const getAuthDomain = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("s-tech-store.tech")) {
      return host;
    }
  }
  const envDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  if (envDomain && !envDomain.includes("firebaseapp.com")) {
    return envDomain;
  }
  return "www.s-tech-store.tech";
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBojf0zvKV8Wt8vaDS0H4K7DXSgF4D8BRc",
  authDomain: getAuthDomain(),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || DEFAULT_RTDB_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "fir-tech-store",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "fir-tech-store.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "461793268934",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:461793268934:web:a271722e22a9061cfcb3c7",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-PD4CY284NZ",
};

// Initialize Firebase (prevent duplicate initialization in Next.js dev mode)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Safe RTDB initialization: guarantee valid URL and prevent uncaught fatal crashes in production
let rtdbInstance: any = null;
try {
  const dbUrl = (firebaseConfig.databaseURL && firebaseConfig.databaseURL.startsWith("http"))
    ? firebaseConfig.databaseURL
    : DEFAULT_RTDB_URL;
  rtdbInstance = getDatabase(app, dbUrl);
} catch (err) {
  console.warn("RTDB initialization bypassed (safe fallback):", err);
}

// ─── Firebase App Check (Protects RTDB & Auth from third-party websites & bots) ───
if (typeof window !== "undefined") {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (recaptchaSiteKey) {
    import("firebase/app-check")
      .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
        try {
          if (process.env.NODE_ENV !== "production") {
            (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
          }
          initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
            isTokenAutoRefreshEnabled: true,
          });
        } catch (err) {
          console.warn("Firebase App Check initialization notice:", err);
        }
      })
      .catch(() => {});
  }
}

export const rtdb = rtdbInstance;
export default app;
