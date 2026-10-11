"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Copy, Check, ArrowRight, Tag, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/routing";

export default function PromotionPopupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Show popup 1 second after entering the page
    const timer = setTimeout(() => {
      try {
        const dismissed = sessionStorage.getItem("stech_promo_popup_dismissed");
        if (!dismissed) {
          setIsOpen(true);
        }
      } catch (e) {
        setIsOpen(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem("stech_promo_popup_dismissed", "true");
    } catch (e) {}
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText("STECH25");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 30 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-gradient-to-b from-[#1a0f0f] via-[#121318] to-[#0c0d12] text-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(239,68,68,0.3)] border border-red-500/30 overflow-hidden"
        >
          {/* Ambient Lighting Accents */}
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-red-600/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95"
            aria-label="Close Promotion Modal"
          >
            <X size={18} />
          </button>

          {/* Banner Graphic Header */}
          <div className="relative p-6 sm:p-8 pt-8 sm:pt-10 flex flex-col items-center text-center">
            {/* Animated Pulsing Flame Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-600/30 to-amber-600/30 border border-red-500/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-4 shadow-sm">
              <Flame size={14} className="text-red-400 animate-pulse" />
              <span>ប្រូម៉ូសិនពិសេស • LIMITED TIME PROMO</span>
              <Sparkles size={14} className="text-amber-300" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-md">
              បញ្ចុះតម្លៃរហូតដល់ <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-300">២៥% OFF</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-sm leading-relaxed">
              រីករាយជាមួយការបញ្ចុះតម្លៃលើ Laptops, Custom PC Builds និងគ្រឿងបន្លាស់កុំព្យូទ័រទាំងអស់នៅ S Tech Store Cambodia!
            </p>

            {/* Promo Voucher Card */}
            <div className="w-full mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-md">
                  <Tag size={20} />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Coupon Code</div>
                  <div className="text-xl font-black text-white font-mono tracking-wider">STECH25</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-sm ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-white hover:bg-gray-100 text-gray-900 active:scale-95"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    <span>បានចម្លងរួចរាល់! ✓</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Call To Action Buttons */}
            <div className="w-full mt-6 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/category/all"
                onClick={handleClose}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#a62222] hover:to-[#d63031] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 hover:shadow-xl transition-all no-underline active:scale-98"
              >
                <span>ទិញទំនិញឥឡូវនេះ (Shop Now)</span>
                <ArrowRight size={16} />
              </Link>

              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-white/5"
              >
                ទុកពេលក្រោយ (Skip)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
