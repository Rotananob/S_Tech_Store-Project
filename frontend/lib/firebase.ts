// ─── Firebase Config ─────────────────────────────────────────────────────────
// Replace these values with your Firebase project credentials
// You can find them at: https://console.firebase.google.com → Project Settings

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "fir-tech-store.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://fir-tech-store-default-rtdb.asia-southeast1.firebasedatabase.app",
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
export const rtdb = getDatabase(app);
export default app;
