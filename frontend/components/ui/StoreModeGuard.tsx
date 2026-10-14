"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  getPublicStoreStatus, 
  PublicStoreStatusResponse 
} from "@/lib/services/master.service";
import { 
  Calendar, 
  Clock, 
  Send, 
  Sparkles, 
  Wrench, 
  Eye, 
  EyeOff, 
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  RotateCw,
  PartyPopper
} from "lucide-react";

interface TimeRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export default function StoreModeGuard() {
  const [storeStatus, setStoreStatus] = useState<PublicStoreStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [isOwnerBypassed, setIsOwnerBypassed] = useState(false);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);

  // Check if current device is logged in as System Owner
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const adminUser = localStorage.getItem("stech_admin_user");
        if (adminUser) {
          const parsed = JSON.parse(adminUser);
          if (
            parsed?.role === "super_admin" || 
            (parsed?.email || "").toLowerCase().trim() === "nobrothana180703@gmail.com"
          ) {
            setIsSuperAdminUser(true);
          }
        }
        // Check local bypass preference for previewing
        const bypass = sessionStorage.getItem("stech_owner_store_bypass");
        if (bypass === "true") {
          setIsOwnerBypassed(true);
        }
      } catch (e) {}
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const data = await getPublicStoreStatus();
      setStoreStatus(data);
    } catch (e) {
      console.warn("Could not check store status:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Smart Check on Mount & Window Focus (15-Minute Cooldown, zero wasteful loop polling)
  useEffect(() => {
    let lastChecked = Date.now();
    checkStatus();

    // Re-check only if tab was inactive for > 15 minutes (protects Cloud Free Tier!)
    const onVisibilityOrFocus = () => {
      if (Date.now() - lastChecked > 15 * 60 * 1000) {
        lastChecked = Date.now();
        checkStatus();
      }
    };

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("stech_store_status_changed", () => checkStatus());

    return () => {
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("stech_store_status_changed", () => checkStatus());
    };
  }, [checkStatus]);

  // Live 1-second ticker for precise countdown
  useEffect(() => {
    const ticker = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Compute countdown to vacation end time
  const timeRemaining: TimeRemaining = useMemo(() => {
    if (!storeStatus?.vacation?.end_time) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const end = new Date(storeStatus.vacation.end_time).getTime();
    const diff = end - now;

    if (diff <= 0) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return { total: diff, days, hours, minutes, seconds, isExpired: false };
  }, [storeStatus?.vacation?.end_time, now]);

  // Auto-Redirect / Auto-Open when countdown expires
  useEffect(() => {
    if (
      storeStatus?.status === "vacation" && 
      storeStatus.vacation.active && 
      storeStatus.vacation.end_time && 
      timeRemaining.isExpired
    ) {
      // Countdown completed! Reload storefront to open automatically
      const timer = setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [storeStatus?.status, storeStatus?.vacation?.active, storeStatus?.vacation?.end_time, timeRemaining.isExpired]);

  // If normal online mode or owner decided to bypass, don't block
  if (!storeStatus || storeStatus.status === "online" || isOwnerBypassed) {
    if (isOwnerBypassed && isSuperAdminUser) {
      return (
        <div className="fixed bottom-24 right-4 z-[9999] bg-black/90 text-amber-300 border border-amber-500/50 shadow-2xl rounded-2xl px-3.5 py-2 text-xs font-bold flex items-center gap-2 backdrop-blur-md">
          <Eye size={14} className="text-amber-400" />
          <span>Owner Bypass Mode (Active: {storeStatus?.status})</span>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("stech_owner_store_bypass");
              setIsOwnerBypassed(false);
            }}
            className="ml-2 px-2 py-0.5 rounded-lg bg-amber-500 text-black text-[10px] font-black hover:bg-amber-400 cursor-pointer"
          >
            បិទ Bypass
          </button>
        </div>
      );
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. VACATION / TEMPORARY CLOSURE OVERLAY WITH LIVE COUNTDOWN
  // ─────────────────────────────────────────────────────────────
  if (storeStatus.status === "vacation" && storeStatus.vacation.active && !timeRemaining.isExpired) {
    const v = storeStatus.vacation;

    return (
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#0b0c10] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none">
        {/* Subtle Ambient Background Gradients */}
        <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-amber-600/20 to-orange-500/10 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tl from-red-600/20 to-rose-700/10 blur-[130px] pointer-events-none" />

        <div className="relative w-full max-w-2xl bg-[#14161d]/90 border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-[0_30px_90px_rgba(217,119,6,0.25)] backdrop-blur-2xl text-center overflow-hidden">
          
          {/* Top Decorative Holiday Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-black mb-5 shadow-inner">
            <Sparkles size={15} className="animate-spin text-amber-400" />
            <span>{v.title || "ហាងសូមសម្រាកបណ្តោះអាសន្ន (Store Temporarily Closed)"}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white m-0 leading-tight">
            ហាងកុំព្យូទ័រ <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500">S Tech Store</span>
          </h1>

          {/* Custom Announcement Message */}
          <p className="mt-4 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl mx-auto font-medium">
            {v.reason || "ហាង S Tech Store សូមឈប់សម្រាកបណ្តោះអាសន្ន។ យើងខ្ញុំនឹងបើកដំណើរការបម្រើលោកអ្នកវិញក្នុងពេលឆាប់ៗនេះ។ សូមអរគុណសម្រាប់ការយោគយល់!"}
          </p>

          {/* ── LIVE COUNTDOWN TIMER GRID ── */}
          <div className="my-7 sm:my-9">
            <div className="text-[11px] font-black uppercase tracking-widest text-amber-400/90 mb-3 flex items-center justify-center gap-1.5">
              <Clock size={13} className="animate-pulse" />
              <span>រាប់ថយក្រោយបើកដំណើរការហាងឡើងវិញ (Countdown to Re-open)</span>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3.5 max-w-lg mx-auto">
              {/* DAYS */}
              <div className="bg-[#1b1e28] border border-amber-500/25 rounded-2xl p-3 sm:p-4.5 flex flex-col items-center justify-center shadow-lg shadow-black/40">
                <span className="text-2xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight">
                  {String(timeRemaining.days).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mt-1">
                  ថ្ងៃ (Days)
                </span>
              </div>

              {/* HOURS */}
              <div className="bg-[#1b1e28] border border-amber-500/25 rounded-2xl p-3 sm:p-4.5 flex flex-col items-center justify-center shadow-lg shadow-black/40">
                <span className="text-2xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {String(timeRemaining.hours).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mt-1">
                  ម៉ោង (Hours)
                </span>
              </div>

              {/* MINUTES */}
              <div className="bg-[#1b1e28] border border-amber-500/25 rounded-2xl p-3 sm:p-4.5 flex flex-col items-center justify-center shadow-lg shadow-black/40">
                <span className="text-2xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {String(timeRemaining.minutes).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase mt-1">
                  នាទី (Mins)
                </span>
              </div>

              {/* SECONDS */}
              <div className="bg-[#1b1e28] border border-amber-500/40 rounded-2xl p-3 sm:p-4.5 flex flex-col items-center justify-center shadow-lg shadow-amber-500/10">
                <span className="text-2xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight animate-pulse">
                  {String(timeRemaining.seconds).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-amber-400 font-bold uppercase mt-1">
                  វិនាទី (Secs)
                </span>
              </div>
            </div>

            {/* Target Re-Open Time */}
            {v.end_time && (
              <p className="text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1.5 font-medium">
                <Calendar size={12} className="text-amber-400" />
                <span>
                  កាលបរិច្ឆេទបើកវិញ៖{" "}
                  <strong className="text-gray-200">
                    {new Date(v.end_time).toLocaleString("km-KH", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </strong>
                </span>
              </p>
            )}
          </div>

          {/* Action Call to Action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="https://t.me/S_TECH_ASSISTANTBOT"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
            >
              <Send size={15} />
              <span>ជជែកជាមួយ Telegram Bot</span>
              <ExternalLink size={13} className="opacity-70" />
            </a>

            <button
              type="button"
              onClick={() => checkStatus()}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              <RotateCw size={14} className={loading ? "animate-spin" : ""} />
              <span>ឆែកស្ថានភាពឡើងវិញ</span>
            </button>
          </div>

          {/* Owner Bypass Trigger (Only visible to System Owner) */}
          {isSuperAdminUser && (
            <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-amber-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert size={14} />
                <span>លោកអ្នកជាម្ចាស់ប្រព័ន្ធ (System Owner)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("stech_owner_store_bypass", "true");
                  setIsOwnerBypassed(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Eye size={13} />
                <span>មើលហាងជាមុន (Owner Bypass)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MAINTENANCE / SYSTEM REPAIR OVERLAY
  // ─────────────────────────────────────────────────────────────
  if (storeStatus.status === "maintenance" && storeStatus.maintenance.active) {
    const m = storeStatus.maintenance;

    return (
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#090a0f] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none">
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] rounded-full bg-red-600/15 blur-[140px] pointer-events-none" />

        <div className="relative w-full max-w-xl bg-[#11131a]/95 border-2 border-red-500/40 rounded-3xl p-6 sm:p-9 shadow-[0_30px_90px_rgba(220,38,38,0.3)] backdrop-blur-2xl text-center overflow-hidden">
          
          {/* Animated Repair Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Wrench size={34} className="animate-spin text-red-500" style={{ animationDuration: "8s" }} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-[11px] font-black uppercase tracking-wider border border-red-500/30 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Under Technical Maintenance</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white m-0">
            {m.title || "ប្រព័ន្ធកំពុងជួសជុល និងធ្វើបច្ចុប្បន្នភាព"}
          </h2>

          <p className="mt-3.5 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
            {m.reason || "យើងខ្ញុំកំពុងធ្វើការកែលម្អប្រព័ន្ធ Server និងបច្ចេកវិទ្យាទូទាត់ប្រាក់ជូនលោកអ្នក។ ប្រព័ន្ធនឹងត្រឡប់មកវិញក្នុងពេលដ៏ខ្លី!"}
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://t.me/S_TECH_ASSISTANTBOT"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <Send size={15} />
              <span>ជំនួយបច្ចេកទេស Telegram</span>
              <ExternalLink size={13} className="opacity-70" />
            </a>

            <button
              type="button"
              onClick={() => checkStatus()}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              <RotateCw size={14} className={loading ? "animate-spin" : ""} />
              <span>ត្រួតពិនិត្យឡើងវិញ</span>
            </button>
          </div>

          {/* Owner Bypass Trigger */}
          {isSuperAdminUser && (
            <div className="mt-7 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-amber-400">
              <span className="text-[11px] text-gray-400">ម្ចាស់ប្រព័ន្ធអាចចូលមើលទំនិញបាន</span>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("stech_owner_store_bypass", "true");
                  setIsOwnerBypassed(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-all text-xs"
              >
                <Eye size={13} />
                <span>Owner Bypass</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
