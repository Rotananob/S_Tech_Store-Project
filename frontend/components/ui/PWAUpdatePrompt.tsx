"use client";

import { useEffect } from "react";
import { useUpdateStore } from "@/store/updateStore";
import { Sparkles, RefreshCw, X, ArrowUpRight, CheckCircle2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PWAUpdatePrompt() {
  const {
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
                // New content is available; please refresh.
                setHasUpdate(true, null, newWorker);
              }
            });
          }
        });
      });

      // 3. Periodic check every 3 minutes or when page refocuses
      const interval = setInterval(() => {
        checkForUpdates(false);
      }, 180000);

      const onFocus = () => {
        checkForUpdates(false);
      };
      window.addEventListener("focus", onFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", onFocus);
      };
    }
  }, [checkForUpdates, setHasUpdate]);

  if (!hasUpdate || dismissed) return null;

  const version = updateInfo?.version || "2.4.2";
  const changelog = updateInfo?.changelog || [
    "Taobao visual camera search scanner",
    "Edge 50ms instant loading speed",
    "VIP Profile settings & hardware hub",
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed z-50 bottom-24 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-[420px]"
      >
        <div className="relative bg-[#111317]/95 backdrop-blur-xl border border-red-500/30 text-white rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(139,26,26,0.25)] overflow-hidden">
          {/* Subtle ambient corner glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-red-600/20 to-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-600/10 rounded-full blur-xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={dismissUpdate}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors border-none cursor-pointer"
            aria-label="Dismiss update"
          >
            <X size={14} />
          </button>

          {/* Header Row */}
          <div className="flex items-start gap-3 relative z-10 pr-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-[#e74c3c] flex items-center justify-center text-white shrink-0 shadow-lg border border-red-400/30">
              <Sparkles size={20} className="animate-spin text-amber-200" style={{ animationDuration: "6s" }} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-wider">
                  Update Available
                </span>
                <span className="text-[11px] font-bold text-gray-400">
                  v{version}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                កំណែទម្រង់ថ្មីមានរួចរាល់ហើយ! 🎉
              </h4>
              <p className="text-[11px] text-gray-300 mt-1 leading-snug">
                S Tech Store បានបន្ថែមមុខងារថ្មីៗ និងបង្កើនល្បឿនកាន់តែលឿន។
              </p>
            </div>
          </div>

          {/* Quick Changelog Pills */}
          <div className="mt-3.5 pt-3 border-t border-white/10 relative z-10 space-y-1.5">
            {changelog.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-300">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span className="line-clamp-1">{item}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-4 pt-2 flex items-center gap-2.5 relative z-10">
            <button
              type="button"
              onClick={applyUpdate}
              disabled={isUpdating}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#a62222] hover:to-[#d64537] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-red-900/40 transition-all cursor-pointer border-none disabled:opacity-60"
            >
              {isUpdating ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Updating... (កំពុងដំឡើង)</span>
                </>
              ) : (
                <>
                  <Zap size={15} className="text-amber-300 fill-amber-300" />
                  <span>Update Now (ធ្វើបច្ចុប្បន្នភាព)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={dismissUpdate}
              className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10"
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
