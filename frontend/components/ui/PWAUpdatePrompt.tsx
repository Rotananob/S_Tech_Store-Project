"use client";

import { useEffect } from "react";
import { useUpdateStore, OFFICIAL_APP_VERSION } from "@/store/updateStore";
import { Sparkles, RefreshCw, X, ArrowRight, CheckCircle2, Zap, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function PWAUpdatePrompt() {
  const {
    currentVersion,
    hasUpdate,
    updateInfo,
    isUpdating,
    dismissed,
    setHasUpdate,
    applyUpdate,
    dismissUpdate,
    checkForUpdates,
  } = useUpdateStore();

  useEffect(() => {
    // 1. Initial check on mount
    checkForUpdates(false);

    // 2. Register Service Worker update event listener
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        // Check if a worker is already waiting
        if (reg.waiting) {
          setHasUpdate(true, null, reg.waiting);
        }

        // Listen for new workers being installed
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New content is available
                setHasUpdate(true, null, newWorker);
              }
            });
          }
        });
      });

      // 3. Service Worker background events handle updates natively.
      // Re-query app-version only if the page has been active for > 6 hours (protects Cloud Free Tier!)
      let lastChecked = Date.now();
      const onFocus = () => {
        if (Date.now() - lastChecked > 6 * 60 * 60 * 1000) {
          lastChecked = Date.now();
          checkForUpdates(false);
        }
      };
      window.addEventListener("focus", onFocus);

      return () => {
        window.removeEventListener("focus", onFocus);
      };
    }
  }, [checkForUpdates, setHasUpdate]);

  if (!hasUpdate || dismissed) return null;

  const targetVersion = updateInfo?.version || OFFICIAL_APP_VERSION;
  const installedVer = currentVersion || OFFICIAL_APP_VERSION;
  const releaseName = updateInfo?.releaseName || "S Tech Store Official Update";
  const changelog = updateInfo?.changelog || [
    "Instant Telegram Webhook & 0ms Local-First Cache optimization",
    "Universal NBC Bakong KHQR, ABA Deep-Link & Card Checkout",
    "Real-Time Coin Reward & Auto-Popup for live product browsing",
    "$5.00 USD Welcome Gift directly credited to S-Tech Wallet",
    "Account Settings Real Gmail Sync & Order Notification Dispatch",
    "Grand Master Command Console with Super-Admin Control & Security Vault",
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#101217] border-2 border-red-500/40 text-white rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(139,26,26,0.35)] overflow-hidden"
        >
          {/* Subtle ambient glows */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-red-600/25 to-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={dismissUpdate}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors border-none cursor-pointer z-10"
            aria-label="Dismiss update"
          >
            <X size={15} />
          </button>

          {/* Header Row */}
          <div className="flex items-start gap-3.5 relative z-10 pr-6">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] via-red-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg border border-red-400/40 p-1">
              <Image
                src="/logo.jpg"
                alt="S Tech Store"
                width={40}
                height={40}
                className="w-full h-full object-contain rounded-xl"
              />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  New Release Available
                </span>
                <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  v{installedVer} ➔ v{targetVersion}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                មានកំណែអាប់ដេតថ្មី v{targetVersion}! 🎉
              </h4>
              <p className="text-xs text-gray-300 mt-1 leading-snug">
                {releaseName}
              </p>
            </div>
          </div>

          {/* Dynamic Changelog Bullets */}
          <div className="mt-4 pt-3 border-t border-white/10 relative z-10 space-y-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              មុខងារថ្មីៗក្នុង Version {targetVersion}:
            </div>
            {changelog.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-gray-200">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{item}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-2.5 relative z-10">
            <button
              type="button"
              onClick={() => applyUpdate()}
              disabled={isUpdating}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-600 to-[#8B1A1A] hover:brightness-110 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-red-950/60 transition-all cursor-pointer border-none disabled:opacity-60"
            >
              {isUpdating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>កំពុងអាប់ដេត...</span>
                </>
              ) : (
                <>
                  <Zap size={16} className="text-amber-300 fill-amber-300" />
                  <span>អាប់ដេតឥឡូវនេះ (Update to v{targetVersion})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={dismissUpdate}
              className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-white/10"
            >
              ទុកពេលក្រោយ
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
