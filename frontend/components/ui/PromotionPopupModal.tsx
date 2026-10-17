"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X, Sparkles, Copy, Check, ArrowRight, Tag, Flame, Clock, Gift, ShieldCheck, ChevronUp } from "lucide-react";
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

// 22 Festive confetti particle presets for celebratory shower (🎉 ធ្លាក់តិចៗ)
const CONFETTI_PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i * 4.6 + (i % 3) * 2) % 100}%`,
  delay: (i % 7) * 0.18,
  duration: 2.2 + (i % 4) * 0.4,
  size: 6 + (i % 5) * 2,
  color: [
    "#F59E0B", // Gold
    "#EF4444", // Crimson Red
    "#10B981", // Emerald
    "#3B82F6", // Sapphire
    "#EC4899", // Festive Pink
    "#8B5CF6", // Purple
    "#FCD34D", // Amber Sparkle
  ][i % 7],
  isCircle: i % 3 === 0,
}));

export default function PromotionPopupModal() {
  const pathname = usePathname();
  const isAdminRoute = Boolean(
    pathname?.includes("/rok-mix-khernh") || 
    (typeof window !== "undefined" && window.location.pathname.includes("/rok-mix-khernh"))
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [promo, setPromo] = useState<ActivePromotion | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const autoGlideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Real-data Countdown Timer
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!promo) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      let targetTime: number;

      const rawEnd = (promo as any)?.valid_until || promo?.endDate;
      if (rawEnd) {
        targetTime = new Date(rawEnd).getTime();
      } else {
        const d = new Date();
        targetTime = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      }

      const diff = Math.max(0, targetTime - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const countdownInterval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(countdownInterval);
  }, [promo]);

  useEffect(() => {
    let initialTimer: NodeJS.Timeout;

    const checkAndFetchPromo = async () => {
      if (isAdminRoute) return;

      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const isTestPreview = urlParams?.has("promo") || urlParams?.has("test_promo");

      try {
        const dismissed = sessionStorage.getItem("stech_promo_popup_dismissed");
        if (dismissed && !isTestPreview) return;

        const cachedStr = sessionStorage.getItem("stech_cached_active_promo");
        if (cachedStr && !isTestPreview) {
          const parsed = JSON.parse(cachedStr);
          if (parsed && (Date.now() - (parsed.time || 0)) < 10 * 60 * 1000 && parsed.promo) {
            setPromo(parsed.promo);
            initialTimer = setTimeout(() => {
              setIsOpen(true);
            }, 2500);
            return;
          }
        }
      } catch {}

      try {
        const res = await api.get("/promotions/active-popup");
        const activePromo = (res.data?.success && res.data?.promo) ? res.data.promo : null;
        if (activePromo) {
          setPromo(activePromo);
          try {
            sessionStorage.setItem("stech_cached_active_promo", JSON.stringify({ promo: activePromo, time: Date.now() }));
          } catch (_) {}
          initialTimer = setTimeout(() => {
            setIsOpen(true);
          }, 2500);
        } else {
          setPromo(null);
          setIsOpen(false);
          try {
            sessionStorage.removeItem("stech_cached_active_promo");
          } catch (_) {}
        }
      } catch {
        setPromo(null);
        setIsOpen(false);
      }
    };

    checkAndFetchPromo();

    const handleTriggerPromo = () => {
      if (promo) {
        setIsOpen(true);
        setIsMinimized(false);
      }
    };
    window.addEventListener("stech:trigger-promo", handleTriggerPromo);

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      window.removeEventListener("stech:trigger-promo", handleTriggerPromo);
    };
  }, [isAdminRoute]);

  // 3-Second Celebration Spotlight & Smooth Auto-Glide to Hero Slider
  useEffect(() => {
    if (!isOpen || isHovered) {
      if (autoGlideTimerRef.current) clearTimeout(autoGlideTimerRef.current);
      return;
    }

    // Auto-glide into hero slider after exactly 3.2s of celebration spotlight
    autoGlideTimerRef.current = setTimeout(() => {
      handleAutoGlideToHero();
    }, 3200);

    return () => {
      if (autoGlideTimerRef.current) clearTimeout(autoGlideTimerRef.current);
    };
  }, [isOpen, isHovered]);

  const handleAutoGlideToHero = () => {
    setIsOpen(false);
    setIsMinimized(true);
    // Notify hero slider or page to illuminate promo card
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stech:hero-promo-illuminated"));
    }
  };

  const handleManualClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    try {
      sessionStorage.setItem("stech_promo_popup_dismissed", "true");
    } catch {}
  };

  const handleReopen = () => {
    setIsMinimized(false);
    setIsOpen(true);
  };

  if (isAdminRoute || !promo) return null;

  const promoCode = promo.code || "";

  const handleCopyCode = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (promoCode) {
      navigator.clipboard?.writeText(promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isFixed = (promo.type || "").toLowerCase().includes("fix");
  const discountLabel = isFixed ? `$${promo.value} OFF` : `${promo.value}% OFF`;

  return (
    <>
      {/* ── Main Festive Celebration Reveal ── */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/35 backdrop-blur-[2.5px] transition-colors">
            {/* Soft Ambient Vignette Glow (Replaces intrusive opaque black wall) */}
            <div 
              className="absolute inset-0 cursor-pointer"
              onClick={handleAutoGlideToHero}
              aria-label="Click to minimize"
            />

            {/* Falling Festive Confetti Ribbons (🎉 ធ្លាក់តិចៗ) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {CONFETTI_PARTICLES.map((particle) => (
                <motion.div
                  key={particle.id}
                  initial={{ y: -40, opacity: 0, rotate: 0 }}
                  animate={{
                    y: ["0%", "110%"],
                    opacity: [0, 1, 1, 0],
                    rotate: [0, 180, 360, 540],
                    x: [(particle.id % 2 === 0 ? -12 : 12), (particle.id % 2 === 0 ? 12 : -12)],
                  }}
                  transition={{
                    duration: particle.duration,
                    delay: particle.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    position: "absolute",
                    left: particle.left,
                    top: 0,
                    width: particle.size,
                    height: particle.isCircle ? particle.size : particle.size * 1.8,
                    backgroundColor: particle.color,
                    borderRadius: particle.isCircle ? "50%" : "2px",
                    boxShadow: `0 0 6px ${particle.color}88`,
                  }}
                />
              ))}
            </div>

            {/* ── Unique Entrance (Sprouting from tiny to full) & Exit (Gliding to Hero Slider) ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.15, y: 70, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ 
                opacity: 0, 
                scale: 0.18, 
                y: -240, 
                x: 60,
                filter: "blur(4px)",
                transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } 
              }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 22,
                mass: 0.8
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="relative z-20 w-full max-w-lg bg-gradient-to-b from-[#1c1212] via-[#14151e] to-[#0c0d12] text-white rounded-3xl shadow-[0_25px_80px_-15px_rgba(220,38,38,0.45)] border border-red-500/35 overflow-hidden"
            >
              {/* 3-Second Spotlight Progress Strip */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30 overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: isHovered ? "100%" : "0%" }}
                  transition={{ duration: 3.2, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-amber-400 via-red-500 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                />
              </div>

              {/* Ambient Lighting Orbs */}
              <div className="absolute -top-20 -left-20 w-60 h-60 bg-red-600/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />

              {/* Top Controls (Glide to Hero button & Close button) */}
              <div className="absolute top-3.5 right-3.5 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoGlideToHero}
                  title="បង្រួមទៅកាន់ Hero Slider (Minimize to Hero)"
                  className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/90 text-[11px] font-bold text-amber-300 hover:text-white flex items-center gap-1 border border-amber-400/30 transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <span>រត់ទៅ Hero ⚡</span>
                </button>

                <button
                  onClick={handleManualClose}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 active:scale-95 shadow-md"
                  aria-label="Close Promotion Modal"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Festival Banner Header with Genuine Pchum Ben Poster */}
              <div className="relative w-full h-44 sm:h-52 bg-[#1a0e0e] overflow-hidden flex items-center justify-center">
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
                <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-400/40 shadow-lg">
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-white shrink-0 border border-amber-300/40">
                    <img src="/logo.jpg" alt="S Tech Store" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm">🇰🇭</span>
                  <span className="text-[10px] sm:text-[11px] font-black text-amber-300 uppercase tracking-wider truncate max-w-[200px]">
                    S Tech • {promo.name || "SPECIAL OFFER"}
                  </span>
                </div>

                {/* Floating Discount Tag */}
                <div className="absolute bottom-3 right-3.5 z-20 flex items-center gap-1.5 bg-gradient-to-r from-[#8B1A1A] to-red-600 px-3.5 py-1.5 rounded-xl border border-amber-400/35 shadow-lg">
                  <Flame size={15} className="text-amber-300 fill-amber-300 animate-pulse" />
                  <span className="text-sm sm:text-base font-black text-white">{discountLabel}</span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="relative p-5 sm:p-6 pt-3.5 flex flex-col items-center text-center">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
                  <Sparkles size={14} className="animate-spin text-amber-400" style={{ animationDuration: "6s" }} />
                  <span>ការផ្តល់ជូនពិសេសពី S Tech Store</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                  {promo.name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 mt-1.5 max-w-md leading-relaxed font-khmer">
                  {promo.description}
                </p>

                {/* 7-Day Live Countdown Clock */}
                <div className="w-full mt-3.5 p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 shadow-inner">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 shrink-0">
                    <Clock size={15} className="animate-spin text-amber-400" style={{ animationDuration: "8s" }} />
                    <span>ផុតកំណត់ក្នុង៖</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-mono font-black">
                    <div className="px-2 py-1 rounded-lg bg-black/60 text-white border border-white/10">
                      <span className="text-amber-300">{timeLeft.days}</span> <span className="text-[10px] text-gray-400">ថ្ងៃ</span>
                    </div>
                    <span>:</span>
                    <div className="px-2 py-1 rounded-lg bg-black/60 text-white border border-white/10">
                      <span className="text-amber-300">{String(timeLeft.hours).padStart(2, '0')}</span> <span className="text-[10px] text-gray-400">ម៉ោង</span>
                    </div>
                    <span>:</span>
                    <div className="px-2 py-1 rounded-lg bg-black/60 text-white border border-white/10">
                      <span className="text-amber-300">{String(timeLeft.minutes).padStart(2, '0')}</span> <span className="text-[10px] text-gray-400">នាទី</span>
                    </div>
                    <span>:</span>
                    <div className="px-2 py-1 rounded-lg bg-black/60 text-white border border-white/10">
                      <span className="text-amber-300">{String(timeLeft.seconds).padStart(2, '0')}</span> <span className="text-[10px] text-gray-400">វិ</span>
                    </div>
                  </div>
                </div>

                {/* Promo Voucher Box */}
                <div className="w-full mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-red-950/60 via-black/50 to-amber-950/60 border border-red-500/35 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B1A1A] to-amber-600 flex items-center justify-center text-white shadow-md shrink-0">
                      <Tag size={18} />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        កូដប្រូម៉ូសិន • PROMO CODE
                      </div>
                      <div className="text-lg sm:text-xl font-black text-amber-300 font-mono tracking-widest">
                        {promoCode}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`w-full sm:w-auto px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none shadow-sm ${
                      copied
                        ? "bg-emerald-600 text-white scale-105"
                        : "bg-white hover:bg-gray-100 text-gray-900 active:scale-95"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        <span>បានចម្លងកូដរួចរាល់! ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>ចម្លងកូដ (Copy)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Perks Strip */}
                <div className="w-full mt-3 flex items-center justify-around text-[10.5px] sm:text-[11px] text-gray-400 border-t border-white/5 pt-2.5">
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
                <div className="w-full mt-4 flex flex-col sm:flex-row items-center gap-2.5">
                  <Link
                    href={resolvePromoTargetUrl(promo.target_url)}
                    onClick={handleManualClose}
                    className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-600 to-[#c0392b] hover:from-[#a62222] hover:to-[#d63031] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 hover:shadow-xl transition-all no-underline active:scale-98"
                  >
                    <span>ចូលទិញទំនិញឥឡូវនេះ (Shop Now)</span>
                    <ArrowRight size={15} />
                  </Link>

                  <button
                    type="button"
                    onClick={handleAutoGlideToHero}
                    className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-white/10"
                  >
                    រត់ទៅ Hero Slider ➔
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Compact Floating Festive Voucher Pill (Re-open anytime after gliding to hero) ── */}
      <AnimatePresence>
        {isMinimized && !isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 z-[9999] flex items-center gap-2 bg-gradient-to-r from-[#1c1212] via-[#2a1313] to-[#14151e] text-white pl-3.5 pr-2 py-2 rounded-full border border-red-500/40 shadow-[0_10px_35px_-5px_rgba(220,38,38,0.5)] backdrop-blur-md cursor-pointer hover:border-amber-400/60 transition-all group"
            onClick={handleReopen}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden bg-white shrink-0 border border-amber-300/40">
                <img src="/logo.jpg" alt="S Tech Store" className="w-full h-full object-cover" />
              </div>
              <span className="text-sm">🎉</span>
              <div className="text-left pr-1">
                <div className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <span>{discountLabel}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-xs font-mono font-black text-white/90">
                  {promoCode}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              title="Copy Promo Code"
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold text-amber-300 flex items-center gap-1 transition-all cursor-pointer border border-white/10"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? "បានចម្លង" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleManualClose();
              }}
              title="បិទ (Dismiss)"
              className="w-6 h-6 rounded-full bg-black/40 hover:bg-black/80 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function resolvePromoTargetUrl(url?: string | null): string {
  if (!url) return "/category/all";
  let clean = url.trim();
  if (!clean || clean === "#") return "/category/all";
  if (/^https?:\/\//i.test(clean)) return clean;
  if (!clean.startsWith("/")) clean = `/${clean}`;
  if (clean === "/category" || clean === "/category/" || clean === "/all" || clean === "/all/") {
    return "/category/all";
  }
  return clean;
}

