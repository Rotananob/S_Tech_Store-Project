"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check, X } from "lucide-react";

interface LanguageConfirmModalProps {
  isOpen: boolean;
  targetLocale: "en" | "km" | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LanguageConfirmModal({
  isOpen,
  targetLocale,
  onConfirm,
  onCancel,
}: LanguageConfirmModalProps) {
  if (!isOpen || !targetLocale) return null;

  const isSwitchingToKhmer = targetLocale === "km";
  const targetName = isSwitchingToKhmer ? "ភាសាខ្មែរ (Khmer)" : "English (អង់គ្លេស)";
  const flag = isSwitchingToKhmer ? "🇰🇭" : "🇺🇸";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm bg-white dark:bg-[#141720] text-gray-900 dark:text-white rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-300 flex items-center justify-center transition-colors cursor-pointer border-none"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>

          {/* Header Icon */}
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center mb-4">
            <Globe size={24} />
          </div>

          <h3 className="text-base sm:text-lg font-black tracking-tight mb-2">
            {isSwitchingToKhmer ? "ប្តូរភាសាគេហទំព័រ?" : "Change Display Language?"}
          </h3>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
            {isSwitchingToKhmer ? (
              <>
                តើអ្នកចង់ប្តូរភាសាបង្ហាញទៅជា <strong className="text-[#8B1A1A] dark:text-red-400 font-bold">{targetName} {flag}</strong> ដែរឬទេ?
              </>
            ) : (
              <>
                Would you like to switch the store language to <strong className="text-[#8B1A1A] dark:text-red-400 font-bold">{targetName} {flag}</strong>?
              </>
            )}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-bold transition-all cursor-pointer border-none"
            >
              {isSwitchingToKhmer ? "បោះបង់" : "Cancel"}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#6B1010] hover:to-[#a62222] text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg cursor-pointer border-none flex items-center justify-center gap-1.5"
            >
              <Check size={16} />
              <span>{isSwitchingToKhmer ? "ប្តូរភាសា" : "Confirm"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
