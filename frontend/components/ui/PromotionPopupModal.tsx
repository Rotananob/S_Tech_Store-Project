"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Sparkles, Copy, Check, ArrowRight, Tag, Flame, Clock, Gift, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/routing";
import api from "@/lib/api";

type ActivePromotion = {
  id: number | string;
  name: string;
  code?: string | null;
  type: string;
  value: string | number;
  description?: string | null;
  image_url?: string | null;
  target_url?: string | null;
  endDate?: string | Date;
};

// Grand Pchum Ben Festival Promotion (ពិធីបុណ្យភ្ជំបិណ្ឌ) 7-day default campaign
const DEFAULT_PCHUM_BEN_PROMO: ActivePromotion = {
  id: "pchum-ben-2026",
  name: "មហាប្រូម៉ូសិន ពិធីបុណ្យភ្ជំបិណ្ឌ",
  code: "PCHUMBEN2026",
  type: "percentage",
  value: "30",
  description: "អបអរសាទរពិធីបុណ្យភ្ជំបិណ្ឌ! បញ្ចុះតម្លៃពិសេសរហូតដល់ 30% លើ Laptops, Custom PC Builds, Gaming Gear និងគ្រឿងបន្លាស់គ្រប់ប្រភេទ ធានា ៣ ទៅ ៦ ខែ ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង!",
  image_url: "/images/pchum-ben-promo.jpg",
  target_url: "/category/all",
};

export default function PromotionPopupModal() {
  const pathname = usePathname();
  const isAdminRoute = Boolean(
    pathname?.includes("/rok-mix-khernh") || 
    (typeof window !== "undefined" && window.location.pathname.includes("/rok-mix-khernh"))
  );

  const [isOpen, setIsOpen] = useState(false);
  const [promo, setPromo] = useState<ActivePromotion>(DEFAULT_PCHUM_BEN_PROMO);
  const [copied, setCopied] = useState(false);

  // 7-day Countdown Timer
  const [timeLeft, setTimeLeft] = useState({
    days: 7,
    hours: 14,
    minutes: 36,
    seconds: 50,
  });

  useEffect(() => {
    // 7-day countdown logic
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      // Calculate end time as 7 days from now or fixed target
      const targetTime = new Date();
      targetTime.setDate(targetTime.getDate() + 7);

      const diff = 7 * 24 * 60 * 60 * 1000 - ((now % (7 * 24 * 60 * 60 * 1000)));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const countdownInterval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(countdownInterval);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkAndFetchPromo = async () => {
      if (isAdminRoute) return;

      // Check query parameter for instant preview (e.g. ?promo=preview or ?test_promo=true)
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const isTestPreview = urlParams?.has("promo") || urlParams?.has("test_promo");

      if (isTestPreview) {
        setIsOpen(true);
        return;
      }

      // Check if dismissed previously in this session
      try {
        const dismissed = sessionStorage.getItem("stech_promo_popup_dismissed");
        if (dismissed) return;
      } catch {}

      try {
        const res = await api.get("/promotions/active-popup");
        if (res.data?.success && res.data?.promo) {
          setPromo(res.data.promo);
        } else {
          setPromo(DEFAULT_PCHUM_BEN_PROMO);
        }
      } catch (err) {
        setPromo(DEFAULT_PCHUM_BEN_PROMO);
      }

      // Exactly 3 seconds (3000ms) delay per user requirement
      timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
    };

    checkAndFetchPromo();

    // Listen for custom trigger event (e.g. from Admin Dashboard or Header preview button)
    const handleTriggerPromo = () => {
      setIsOpen(true);
    };
    window.addEventListener("stech:trigger-promo", handleTriggerPromo);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("stech:trigger-promo", handleTriggerPromo);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem("stech_promo_popup_dismissed", "true");
    } catch {}
  };

  const promoCode = promo.code || "PCHUMBEN2026";

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isAdminRoute || !isOpen) return null;

  const isFixed = (promo.type || "").toLowerCase().includes("fix");
  const discountLabel = isFixed ? `$${promo.value} OFF` : `${promo.value}% OFF`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.86, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.86, y: 30 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-gradient-to-b from-[#1c1212] via-[#14151e] to-[#0c0d12] text-white rounded-3xl shadow-[0_25px_70px_-15px_rgba(220,38,38,0.4)] border border-red-500/30 overflow-hidden"
        >
          {/* Ambient Lighting Orbs */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-red-600/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 active:scale-95 shadow-md"
            aria-label="Close Promotion Modal"
          >
            <X size={18} />
          </button>

          {/* Festival Banner Header with Genuine Pchum Ben Poster */}
          <div className="relative w-full h-48 sm:h-56 bg-[#1a0e0e] overflow-hidden flex items-center justify-center">
            {promo.image_url && (
              <img
                src={promo.image_url}
                alt={promo.name}
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1c1212] via-black/25 to-black/20" />

            {/* Festival Badge */}
            <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-400/40 shadow-lg">
              <span className="text-sm">🇰🇭</span>
              <span className="text-[10.5px] font-black text-amber-300 uppercase tracking-wider">
                បុណ្យភ្ជំបិណ្ឌ • PCHUM BEN SPECIAL
              </span>
            </div>

            {/* Floating Discount Tag */}
            <div className="absolute bottom-3 right-3.5 z-20 flex items-center gap-1.5 bg-gradient-to-r from-[#8B1A1A] to-red-600 px-3.5 py-1.5 rounded-xl border border-amber-400/30 shadow-lg">
              <Flame size={16} className="text-amber-300 fill-amber-300 animate-pulse" />
              <span className="text-sm sm:text-base font-black text-white">{discountLabel}</span>
            </div>
          </div>

          {/* Modal Body */}
          <div className="relative p-5 sm:p-7 pt-4 flex flex-col items-center text-center">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-md">
              {promo.name}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-md leading-relaxed font-khmer">
              {promo.description}
            </p>

            {/* 7-Day Live Countdown Clock */}
            <div className="w-full mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 shrink-0">
                <Clock size={16} className="animate-spin text-amber-400" style={{ animationDuration: "8s" }} />
                <span>ផុតកំណត់ក្នុង៖</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono font-black">
                <div className="px-2 py-1 rounded-lg bg-black/50 text-white border border-white/10">
                  <span className="text-amber-300">{timeLeft.days}</span> <span className="text-[10px] text-gray-400">ថ្ងៃ</span>
                </div>
                <span>:</span>
                <div className="px-2 py-1 rounded-lg bg-black/50 text-white border border-white/10">
                  <span className="text-amber-300">{String(timeLeft.hours).padStart(2, '0')}</span> <span className="text-[10px] text-gray-400">ម៉ោង</span>
                </div>
                <span>:</span>
                <div className="px-2 py-1 rounded-lg bg-black/50 text-white border border-white/10">
                  <span className="text-amber-300">{String(timeLeft.minutes).padStart(2, '0')}</span> <span className="text-[10px] text-gray-400">នាទី</span>
                </div>
                <span>:</span>
                <div className="px-2 py-1 rounded-lg bg-black/50 text-white border border-white/10">
                  <span className="text-amber-300">{String(timeLeft.seconds).padStart(2, '0')}</span> <span className="text-[10px] text-gray-400">វិ</span>
                </div>
              </div>
            </div>

            {/* Promo Voucher Box */}
            <div className="w-full mt-4 p-4 rounded-2xl bg-gradient-to-r from-red-950/60 via-black/40 to-amber-950/60 border border-red-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#8B1A1A] to-amber-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <Tag size={20} />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    កូដប្រូម៉ូសិន • PROMO CODE
                  </div>
                  <div className="text-xl font-black text-amber-300 font-mono tracking-widest">
                    {promoCode}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-sm ${
                  copied
                    ? "bg-emerald-600 text-white scale-105"
                    : "bg-white hover:bg-gray-100 text-gray-900 active:scale-95"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={15} />
                    <span>បានចម្លងកូដរួចរាល់! ✓</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    <span>ចម្លងកូដ (Copy)</span>
                  </>
                )}
              </button>
            </div>

            {/* Perks Strip */}
            <div className="w-full mt-3 flex items-center justify-around text-[11px] text-gray-400 border-t border-white/5 pt-3">
              <span className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-400" /> ធានា ៣ ទៅ ៦ ខែ
              </span>
              <span className="flex items-center gap-1">
                <Gift size={13} className="text-amber-400" /> កាដូបន្ថែមច្រើនមុខ
              </span>
              <span className="flex items-center gap-1">
                <Sparkles size={13} className="text-blue-400" /> ដឹក ២៥ ខេត្ត-ក្រុង
              </span>
            </div>

            {/* Action Buttons */}
            <div className="w-full mt-5 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href={promo.target_url || "/category/all"}
                onClick={handleClose}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-600 to-[#c0392b] hover:from-[#a62222] hover:to-[#d63031] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 hover:shadow-xl transition-all no-underline active:scale-98"
              >
                <span>ចូលទិញទំនិញឥឡូវនេះ (Shop Now)</span>
                <ArrowRight size={16} />
              </Link>

              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-white/10"
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
