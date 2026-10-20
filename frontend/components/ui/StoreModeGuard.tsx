"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  getPublicStoreStatus, 
  PublicStoreStatusResponse 
} from "@/lib/services/master.service";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { 
  Calendar, 
  Clock, 
  Send, 
  Sparkles, 
  Wrench, 
  Eye, 
  ExternalLink,
  ShieldAlert,
  RotateCw,
  Moon,
  ShieldCheck,
  Lock,
  KeyRound,
  MapPin,
  Phone,
  Truck,
  Cpu,
  Zap,
  CheckCircle2,
  ChevronRight
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
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockSecret, setUnlockSecret] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if current device is logged in as System Owner or Store Admin
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const adminUser = localStorage.getItem("stech_admin_user");
        if (adminUser) {
          const parsed = JSON.parse(adminUser);
          if (
            parsed?.role === "super_admin" || 
            parsed?.role === "admin" ||
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

  const checkStatus = useCallback(async (force = false) => {
    try {
      setIsRefreshing(true);
      const data = await getPublicStoreStatus(force);
      setStoreStatus(data);
    } catch (e) {
      console.warn("Could not check store status:", e);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, []);

  // ─── Real-Time WebSocket Push (Firebase RTDB) — Zero HTTP Polling ───
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      if (rtdb) {
        const statusRef = ref(rtdb, "system/store_status");
        unsubscribe = onValue(
          statusRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              if (data && data.status) {
                setStoreStatus(data);
                setLoading(false);
                // When an admin locks the storefront, automatically clear any stale bypass
                if (data.status !== "online") {
                  sessionStorage.removeItem("stech_owner_store_bypass");
                  setIsOwnerBypassed(false);
                }
              }
            }
          },
          (err) => {
            console.warn("RTDB store status listener bypassed:", err);
          }
        );
      }
    } catch (e) {}

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ─── Instant Multi-Tab Sync & Event Listener (Zero HTTP Loop Polling) ───
  useEffect(() => {
    // 1. Initial on-demand check on mount
    checkStatus(false);

    // 2. Multi-tab instant sync (< 1ms across tabs on this browser)
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("stech_store_mode_sync");
        channel.onmessage = (event) => {
          if (event.data?.data) {
            setStoreStatus(event.data.data);
            setLoading(false);
            if (event.data.data.status !== "online") {
              sessionStorage.removeItem("stech_owner_store_bypass");
              setIsOwnerBypassed(false);
            }
          }
        };
      }
    } catch (e) {}

    // 3. Storage event listener (across different windows/tabs)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "stech_store_mode_sync" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.data) {
            setStoreStatus(parsed.data);
            setLoading(false);
            if (parsed.data.status !== "online") {
              sessionStorage.removeItem("stech_owner_store_bypass");
              setIsOwnerBypassed(false);
            }
          }
        } catch (err) {}
      }
    };
    window.addEventListener("storage", onStorage);

    // 4. Custom in-tab event listener
    const onCustomStatusChange = (e: any) => {
      if (e.detail) {
        setStoreStatus(e.detail);
        setLoading(false);
        if (e.detail.status !== "online") {
          sessionStorage.removeItem("stech_owner_store_bypass");
          setIsOwnerBypassed(false);
        }
      } else {
        checkStatus(true);
      }
    };
    window.addEventListener("stech_store_status_changed", onCustomStatusChange);

    // 5. Smart re-check on tab focus / visibility
    let lastChecked = Date.now();
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - lastChecked > 60 * 1000) {
        lastChecked = Date.now();
        checkStatus(false);
      }
    };
    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("stech_store_status_changed", onCustomStatusChange);
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
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

  // Compute countdown to night lock reopen time
  const nightLockCountdown: TimeRemaining = useMemo(() => {
    const reopenAt = storeStatus?.night_lock?.reopen_at;
    if (!reopenAt) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const end = new Date(reopenAt).getTime();
    const diff = end - now;

    if (diff <= 0) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return { total: diff, days, hours, minutes, seconds, isExpired: false };
  }, [storeStatus?.night_lock?.reopen_at, now]);

  // Auto-Redirect / Auto-Open when vacation countdown expires
  useEffect(() => {
    if (
      storeStatus?.status === "vacation" && 
      storeStatus.vacation?.active && 
      storeStatus.vacation?.end_time && 
      timeRemaining.isExpired
    ) {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [storeStatus?.status, storeStatus?.vacation?.active, storeStatus?.vacation?.end_time, timeRemaining.isExpired]);

  // Auto-Redirect / Auto-Open when night lock countdown expires
  useEffect(() => {
    if (
      storeStatus?.status === "night_lock" && 
      storeStatus.night_lock?.active && 
      storeStatus.night_lock?.reopen_at && 
      nightLockCountdown.isExpired
    ) {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [storeStatus?.status, storeStatus?.night_lock?.active, storeStatus?.night_lock?.reopen_at, nightLockCountdown.isExpired]);

  // If normal online mode or owner decided to bypass, don't block
  if (!storeStatus || storeStatus.status === "online" || isOwnerBypassed) {
    if (isOwnerBypassed) {
      return (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[99999] bg-[#0a0f1d]/95 text-cyan-300 border border-cyan-500/50 shadow-[0_10px_40px_rgba(6,182,212,0.35)] rounded-2xl px-4 py-2.5 text-xs font-bold flex items-center gap-3 backdrop-blur-xl animate-bounce">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Admin Override</span>
            <span className="text-white font-extrabold">Owner Bypass Active ({storeStatus?.status})</span>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("stech_owner_store_bypass");
              setIsOwnerBypassed(false);
            }}
            className="ml-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-black hover:opacity-90 cursor-pointer shadow-md shadow-cyan-500/30 transition-all"
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
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#04060d] text-white flex flex-col items-center justify-center p-3 sm:p-6 select-none font-sans">
        {/* Futuristic Cyber Mesh Grid Background */}
        <div 
          className="fixed inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(rgba(245, 158, 11, 0.25) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0, 16px 16px"
          }}
        />

        {/* Floating Ambient Glowing Nebulas */}
        <div className="fixed top-[-20%] left-[-15%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-amber-500/20 via-orange-600/15 to-transparent blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="fixed bottom-[-20%] right-[-15%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-tl from-rose-600/20 via-amber-700/15 to-transparent blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-amber-400/5 blur-[120px] pointer-events-none" />

        {/* Master Luxury Card Container */}
        <div className="relative w-full max-w-3xl my-auto bg-gradient-to-b from-[#101422]/95 via-[#0b0e1a]/95 to-[#070913]/98 border border-amber-500/30 rounded-3xl sm:rounded-[36px] p-5 sm:p-10 shadow-[0_30px_100px_rgba(245,158,11,0.22)] backdrop-blur-3xl text-center overflow-hidden">
          
          {/* Top Holographic Edge Glow Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          
          {/* Corner Tech Accents */}
          <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-amber-400/40" />
          <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-amber-400/40" />
          <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-amber-400/40" />
          <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-amber-400/40" />

          {/* Brand Identity & Status Radar Beacon */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-black mb-5 shadow-[inset_0_1px_10px_rgba(245,158,11,0.15)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span className="tracking-wide">{v.title || "ហាងសូមសម្រាកបណ្តោះអាសន្ន (Store Temporarily Closed)"}</span>
            <Sparkles size={14} className="text-amber-400 animate-spin" style={{ animationDuration: "12s" }} />
          </div>

          {/* Store Logo & Grand Title */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative mb-3 flex items-center justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-400/40 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.3)]">
                <Cpu className="text-amber-400" size={30} />
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white m-0 leading-tight">
              ហាងកុំព្យូទ័រ <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-200 to-amber-500 drop-shadow-[0_2px_15px_rgba(245,158,11,0.4)]">S Tech Store</span>
            </h1>

            <p className="mt-1 text-[11px] sm:text-xs font-bold tracking-widest text-amber-400/80 uppercase">
              Premium Computer & High-End Tech Hub Cambodia
            </p>
          </div>

          {/* Custom Announcement Message Box */}
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/5 via-white/[0.02] to-amber-500/5 border border-amber-500/20 max-w-2xl mx-auto shadow-inner">
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-medium">
              {v.reason || "ហាង S Tech Store សូមឈប់សម្រាកបណ្តោះអាសន្ន។ យើងខ្ញុំនឹងបើកដំណើរការបម្រើលោកអ្នកវិញក្នុងពេលឆាប់ៗនេះ។ រាល់ការកុម្ម៉ង់ទិញទុកមុននឹងត្រូវរៀបចំបញ្ជូនជាអាទិភាពដំបូងគេ!"}
            </p>
          </div>

          {/* ── LUXURY HUD COUNTDOWN PODS ── */}
          <div className="my-6 sm:my-8">
            <div className="text-[11px] font-black uppercase tracking-widest text-amber-400/90 mb-3.5 flex items-center justify-center gap-2">
              <Clock size={14} className="text-amber-400 animate-pulse" />
              <span>រាប់ថយក្រោយបើកដំណើរការហាងឡើងវិញ (Countdown to Re-open)</span>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-xl mx-auto">
              {/* DAYS */}
              <div className="relative group overflow-hidden bg-gradient-to-b from-[#1a1f30] to-[#121624] border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-3 sm:p-4.5 flex flex-col items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />
                <span className="text-2xl sm:text-4xl md:text-5xl font-black text-amber-400 font-mono tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                  {String(timeRemaining.days).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-300 font-bold uppercase mt-1">
                  ថ្ងៃ <span className="text-gray-500 text-[9px]">/ DAYS</span>
                </span>
              </div>

              {/* HOURS */}
              <div className="relative group overflow-hidden bg-gradient-to-b from-[#1a1f30] to-[#121624] border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-3 sm:p-4.5 flex flex-col items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />
                <span className="text-2xl sm:text-4xl md:text-5xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {String(timeRemaining.hours).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-300 font-bold uppercase mt-1">
                  ម៉ោង <span className="text-gray-500 text-[9px]">/ HOURS</span>
                </span>
              </div>

              {/* MINUTES */}
              <div className="relative group overflow-hidden bg-gradient-to-b from-[#1a1f30] to-[#121624] border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-3 sm:p-4.5 flex flex-col items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />
                <span className="text-2xl sm:text-4xl md:text-5xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {String(timeRemaining.minutes).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-300 font-bold uppercase mt-1">
                  នាទី <span className="text-gray-500 text-[9px]">/ MINS</span>
                </span>
              </div>

              {/* SECONDS */}
              <div className="relative group overflow-hidden bg-gradient-to-b from-[#1a1f30] to-[#121624] border border-amber-400/60 rounded-2xl p-3 sm:p-4.5 flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(245,158,11,0.25)] transition-all">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                <span className="text-2xl sm:text-4xl md:text-5xl font-black text-amber-300 font-mono tracking-tight animate-pulse drop-shadow-[0_0_16px_rgba(245,158,11,0.6)]">
                  {String(timeRemaining.seconds).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-amber-300 font-bold uppercase mt-1">
                  វិនាទី <span className="text-amber-500/70 text-[9px]">/ SECS</span>
                </span>
              </div>
            </div>

            {/* Target Re-Open Date & Time */}
            {v.end_time && (
              <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] sm:text-xs text-gray-300">
                <Calendar size={13} className="text-amber-400" />
                <span>
                  កាលបរិច្ឆេទបើកបម្រើវិញ៖{" "}
                  <strong className="text-amber-300 font-bold">
                    {new Date(v.end_time).toLocaleString("km-KH", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* ── STORE INFORMATION LUXURY STRIP ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto my-5 text-left">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase">ទីតាំងហាង</div>
                <div className="text-xs font-extrabold text-white truncate">រាជធានីភ្នំពេញ (Phnom Penh)</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase">ម៉ោងបម្រើការធម្មតា</div>
                <div className="text-xs font-extrabold text-white truncate">8:00 AM – 8:00 PM (រាល់ថ្ងៃ)</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                <Truck size={16} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase">ការបញ្ជាទិញទុកមុន</div>
                <div className="text-xs font-extrabold text-white truncate">រៀបចំដឹកជញ្ជូនជាអាទិភាព</div>
              </div>
            </div>
          </div>

          {/* ── HIGH-TECH ACTION HUB ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            {/* 1-Click Telegram Assistant Button */}
            <a
              href="https://t.me/S_TECH_ASSISTANTBOT"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[0_10px_30px_rgba(2,132,199,0.35)] transition-all cursor-pointer group"
            >
              <Send size={16} className="group-hover:translate-x-0.5 transition-transform" />
              <span>ជំនួយការ Telegram (ឆ្លើយតប ២៤/៧)</span>
              <ExternalLink size={13} className="opacity-75" />
            </a>

            {/* Hotline Call */}
            <a
              href="tel:0968689597"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-amber-500/30 text-amber-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Phone size={15} />
              <span>ទាក់ទង៖ 096 868 9597</span>
            </a>

            {/* Live Re-check Status */}
            <button
              type="button"
              onClick={() => checkStatus(true)}
              disabled={isRefreshing}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw size={15} className={isRefreshing ? "animate-spin text-amber-400" : ""} />
              <span>{isRefreshing ? "កំពុងផ្ទៀងផ្ទាត់..." : "ឆែកស្ថានភាពឡើងវិញ"}</span>
            </button>
          </div>

          {/* ── FOOTER: SYSTEM OWNER ACCESS ── */}
          <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400">
              <ShieldCheck size={14} className="text-amber-400" />
              <span>ប្រព័ន្ធគ្រប់គ្រងស្វ័យប្រវត្ត S Tech System Shield</span>
            </div>

            {isSuperAdminUser ? (
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("stech_owner_store_bypass", "true");
                  setIsOwnerBypassed(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-all text-xs"
              >
                <Eye size={13} />
                <span>មើលហាងជាមុន (Owner Bypass)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowUnlockModal(true)}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-amber-300 text-[11px] font-bold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Lock size={12} />
                <span>ម្ចាស់ប្រព័ន្ធ Unlock Bypass</span>
              </button>
            )}
          </div>
        </div>

        {/* Secret Owner Unlock Modal */}
        {renderUnlockModal("amber")}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CYBERSECURITY NIGHT LOCKDOWN OVERLAY (02:00 AM – 06:00 AM)
  // ─────────────────────────────────────────────────────────────
  if (storeStatus.status === "night_lock" && storeStatus.night_lock?.active && !nightLockCountdown.isExpired) {
    const nl = storeStatus.night_lock;

    return (
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#030611] text-white flex flex-col items-center justify-center p-3 sm:p-6 select-none font-sans">
        {/* Futuristic Cyber Mesh Grid Background */}
        <div 
          className="fixed inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(rgba(6, 182, 212, 0.25) 1px, transparent 1px), radial-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0, 16px 16px"
          }}
        />

        {/* Deep Midnight Ambient Nebula Gradients */}
        <div className="fixed top-[-20%] left-[-15%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-indigo-600/25 via-blue-600/20 to-cyan-500/10 blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: "9s" }} />
        <div className="fixed bottom-[-20%] right-[-15%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-tl from-purple-800/25 via-sky-600/20 to-indigo-900/15 blur-[160px] pointer-events-none animate-pulse" style={{ animationDuration: "11s" }} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45vw] h-[45vw] rounded-full bg-cyan-500/5 blur-[130px] pointer-events-none" />

        {/* Master Cyber Defense Card Container */}
        <div className="relative w-full max-w-3xl my-auto bg-gradient-to-b from-[#0d1326]/95 via-[#080d1c]/95 to-[#040713]/98 border border-cyan-500/35 rounded-3xl sm:rounded-[36px] p-5 sm:p-10 shadow-[0_30px_100px_rgba(6,182,212,0.25)] backdrop-blur-3xl text-center overflow-hidden">
          
          {/* Top Holographic Edge Glow Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          
          {/* Corner Tech Accents */}
          <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-cyan-400/40" />
          <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-cyan-400/40" />
          <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-cyan-400/40" />
          <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-cyan-400/40" />

          {/* Top Decorative Cybersecurity Status Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-indigo-500/15 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm font-black mb-5 shadow-[inset_0_1px_10px_rgba(6,182,212,0.15)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
            </span>
            <span className="tracking-wide">{nl.title || "សុវត្ថិភាពពេលរាត្រី (Cybersecurity Night Lockdown)"}</span>
            <Moon size={14} className="text-cyan-400 animate-pulse" />
          </div>

          {/* Central Moon & Cyber Shield Badge */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-cyan-950/80 via-blue-900/50 to-indigo-950/80 border border-cyan-400/40 flex items-center justify-center mx-auto mb-4 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <Moon size={38} className="text-cyan-300" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#05070f] border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-lg">
              <ShieldCheck size={18} className="text-cyan-400" />
            </div>
          </div>

          {/* Store Grand Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white m-0 leading-tight">
            ហាងកុំព្យូទ័រ <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-400 drop-shadow-[0_2px_15px_rgba(6,182,212,0.4)]">S Tech Store</span>
          </h1>

          {/* Subtitle / Mode Explanation */}
          <div className="mt-2 text-xs sm:text-sm font-bold text-cyan-300/90 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>ប្រព័ន្ធកំពុងសម្រាក & ចាក់សោសុវត្ថិភាព ({nl.start_time || "02:00"} – {nl.end_time || "06:00"})</span>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/5 via-white/[0.02] to-cyan-500/5 border border-cyan-500/20 max-w-2xl mx-auto shadow-inner">
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-medium">
              {nl.reason || "ដើម្បីសុវត្ថិភាពទិន្នន័យ ម៉ាស៊ីនបម្រើ និងការពារការវាយប្រហារ Hacker ពេលយប់ ប្រព័ន្ធត្រូវបានដាក់ក្នុងរបៀប Sleep Mode ចាប់ពីម៉ោង 02:00 AM ដល់ 06:00 AM ជារៀងរាល់ថ្ងៃ។"}
            </p>
          </div>

          {/* ── LIVE COUNTDOWN TIMER GRID ── */}
          <div className="my-6 sm:my-8">
            <div className="text-[11px] font-black uppercase tracking-widest text-cyan-400/90 mb-3.5 flex items-center justify-center gap-2">
              <Clock size={14} className="text-cyan-400 animate-pulse" />
              <span>រាប់ថយក្រោយបើកដំណើរការហាងឡើងវិញ (Countdown to Re-open)</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-md mx-auto">
              {/* HOURS */}
              <div className="relative group overflow-hidden bg-gradient-to-b from-[#12192e] to-[#0c1224] border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
                <span className="text-3xl sm:text-5xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                  {String(nightLockCountdown.hours).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-300 font-bold uppercase mt-1">
                  ម៉ោង <span className="text-gray-500 text-[9px]">/ HOURS</span>
                </span>
              </div>

              {/* MINUTES */}
              <div className="relative group overflow-hidden bg-gradient-to-b from-[#12192e] to-[#0c1224] border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
                <span className="text-3xl sm:text-5xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                  {String(nightLockCountdown.minutes).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-300 font-bold uppercase mt-1">
                  នាទី <span className="text-gray-500 text-[9px]">/ MINS</span>
                </span>
              </div>

              {/* SECONDS */}
              <div className="relative group overflow-hidden bg-gradient-to-b from-[#12192e] to-[#0c1224] border border-cyan-400/60 rounded-2xl p-3.5 sm:p-5 flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(6,182,212,0.25)] transition-all">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
                <span className="text-3xl sm:text-5xl font-black text-cyan-300 font-mono tracking-tight animate-pulse drop-shadow-[0_0_16px_rgba(6,182,212,0.6)]">
                  {String(nightLockCountdown.seconds).padStart(2, "0")}
                </span>
                <span className="text-[10px] sm:text-xs text-cyan-300 font-bold uppercase mt-1">
                  វិនាទី <span className="text-cyan-500/70 text-[9px]">/ SECS</span>
                </span>
              </div>
            </div>

            {/* Target Re-Open Time */}
            {nl.reopen_at && (
              <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] sm:text-xs text-gray-300">
                <Calendar size={13} className="text-cyan-400" />
                <span>
                  បើកបម្រើលោកអ្នកឡើងវិញវេលាម៉ោង៖{" "}
                  <strong className="text-cyan-300 font-bold">
                    {new Date(nl.reopen_at).toLocaleTimeString("km-KH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })} (ម៉ោង {nl.end_time || "06:00"} ព្រឹកនេះ)
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* ── STORE INFORMATION LUXURY STRIP ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto my-5 text-left">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase">ទីតាំងហាង</div>
                <div className="text-xs font-extrabold text-white truncate">រាជធានីភ្នំពេញ (Phnom Penh)</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                <Clock size={16} className="text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase">ម៉ោងបម្រើការធម្មតា</div>
                <div className="text-xs font-extrabold text-white truncate">8:00 AM – 8:00 PM (រាល់ថ្ងៃ)</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} className="text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase">សុវត្ថិភាពទិន្នន័យ</div>
                <div className="text-xs font-extrabold text-white truncate">ការពារទិន្នន័យ ២៤/៧</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <a
              href="https://t.me/S_TECH_ASSISTANTBOT"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[0_10px_30px_rgba(6,182,212,0.35)] transition-all cursor-pointer group"
            >
              <Send size={16} className="group-hover:translate-x-0.5 transition-transform" />
              <span>ជំនួយការ Telegram (ឆ្លើយតប ២៤/៧)</span>
              <ExternalLink size={13} className="opacity-75" />
            </a>

            <a
              href="tel:0968689597"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-cyan-500/30 text-cyan-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Phone size={15} />
              <span>ទាក់ទង៖ 096 868 9597</span>
            </a>

            <button
              type="button"
              onClick={() => checkStatus(true)}
              disabled={isRefreshing}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw size={15} className={isRefreshing ? "animate-spin text-cyan-400" : ""} />
              <span>{isRefreshing ? "កំពុងផ្ទៀងផ្ទាត់..." : "ឆែកស្ថានភាពឡើងវិញ"}</span>
            </button>
          </div>

          {/* Owner Bypass Trigger */}
          <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-2 font-semibold text-gray-400 text-[11px]">
              <ShieldCheck size={14} className="text-cyan-400" />
              <span>ប្រព័ន្ធការពារសុវត្ថិភាពស្វ័យប្រវត្ត S Tech Sentinel Shield</span>
            </span>

            {isSuperAdminUser ? (
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("stech_owner_store_bypass", "true");
                  setIsOwnerBypassed(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40 flex items-center gap-1.5 cursor-pointer transition-all text-xs"
              >
                <Eye size={13} />
                <span>ចូលមើលហាង (Owner Bypass)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowUnlockModal(true)}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyan-300 text-[11px] font-bold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Lock size={12} />
                <span>ម្ចាស់ប្រព័ន្ធ Unlock Bypass</span>
              </button>
            )}
          </div>
        </div>

        {/* Secret Owner Unlock Modal */}
        {renderUnlockModal("cyan")}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. MAINTENANCE / SYSTEM REPAIR OVERLAY
  // ─────────────────────────────────────────────────────────────
  if (storeStatus.status === "maintenance" && storeStatus.maintenance.active) {
    const m = storeStatus.maintenance;

    return (
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#070509] text-white flex flex-col items-center justify-center p-3 sm:p-6 select-none font-sans">
        {/* Futuristic Cyber Mesh Grid Background */}
        <div 
          className="fixed inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(rgba(239, 68, 68, 0.25) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0, 16px 16px"
          }}
        />

        {/* Deep Crimson Ambient Nebula Gradients */}
        <div className="fixed top-[-20%] left-[-15%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-red-600/25 via-rose-600/20 to-orange-500/10 blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="fixed bottom-[-20%] right-[-15%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-tl from-red-800/25 via-rose-700/20 to-amber-900/15 blur-[160px] pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45vw] h-[45vw] rounded-full bg-red-500/5 blur-[130px] pointer-events-none" />

        {/* Master Maintenance Card */}
        <div className="relative w-full max-w-2xl my-auto bg-gradient-to-b from-[#180e14]/95 via-[#120a10]/95 to-[#090508]/98 border border-red-500/35 rounded-3xl sm:rounded-[36px] p-5 sm:p-10 shadow-[0_30px_100px_rgba(239,68,68,0.25)] backdrop-blur-3xl text-center overflow-hidden">
          
          {/* Top Holographic Edge Glow Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          
          {/* Corner Tech Accents */}
          <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-red-400/40" />
          <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-red-400/40" />
          <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-red-400/40" />
          <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-red-400/40" />

          {/* Animated Repair Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
            <Wrench size={34} className="animate-spin text-red-500" style={{ animationDuration: "8s" }} />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/20 text-red-300 text-xs font-black uppercase tracking-wider border border-red-500/30 mb-3 shadow-[inset_0_1px_10px_rgba(239,68,68,0.15)]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Under Technical Maintenance</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white m-0 leading-tight">
            {m.title || "ប្រព័ន្ធកំពុងជួសជុល និងធ្វើបច្ចុប្បន្នភាព"}
          </h2>

          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-red-500/5 via-white/[0.02] to-red-500/5 border border-red-500/20 max-w-lg mx-auto shadow-inner">
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-medium">
              {m.reason || "យើងខ្ញុំកំពុងធ្វើការកែលម្អប្រព័ន្ធ Server និងបច្ចេកវិទ្យាទូទាត់ប្រាក់ជូនលោកអ្នក។ ប្រព័ន្ធនឹងត្រឡប់មកវិញក្នុងពេលដ៏ខ្លី!"}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://t.me/S_TECH_ASSISTANTBOT"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[0_10px_30px_rgba(239,68,68,0.35)] transition-all cursor-pointer group"
            >
              <Send size={16} className="group-hover:translate-x-0.5 transition-transform" />
              <span>ជំនួយបច្ចេកទេស Telegram</span>
              <ExternalLink size={13} className="opacity-75" />
            </a>

            <button
              type="button"
              onClick={() => checkStatus(true)}
              disabled={isRefreshing}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw size={15} className={isRefreshing ? "animate-spin text-red-400" : ""} />
              <span>{isRefreshing ? "កំពុងផ្ទៀងផ្ទាត់..." : "ត្រួតពិនិត្យឡើងវិញ"}</span>
            </button>
          </div>

          {/* Owner Bypass Trigger */}
          <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <span className="text-[11px] text-gray-400">ម្ចាស់ប្រព័ន្ធអាចចូលមើលទំនិញបានជាធម្មតា</span>
            {isSuperAdminUser ? (
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("stech_owner_store_bypass", "true");
                  setIsOwnerBypassed(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold border border-red-500/40 flex items-center gap-1.5 cursor-pointer transition-all text-xs"
              >
                <Eye size={13} />
                <span>Owner Bypass</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowUnlockModal(true)}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-300 text-[11px] font-bold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Lock size={12} />
                <span>ម្ចាស់ប្រព័ន្ធ Unlock Bypass</span>
              </button>
            )}
          </div>
        </div>

        {/* Secret Owner Unlock Modal */}
        {renderUnlockModal("red")}
      </div>
    );
  }

  return null;

  // ── Helper: Render Owner Unlock Modal ──
  function renderUnlockModal(accent: "amber" | "cyan" | "red") {
    if (!showUnlockModal) return null;

    const accentClasses = {
      amber: {
        border: "border-amber-500/40",
        shadow: "shadow-[0_20px_60px_rgba(245,158,11,0.25)]",
        title: "text-amber-400",
        inputBorder: "focus:border-amber-400 border-amber-500/30",
        btn: "bg-gradient-to-r from-amber-600 to-orange-500 hover:opacity-90 text-white shadow-amber-500/30",
      },
      cyan: {
        border: "border-cyan-500/40",
        shadow: "shadow-[0_20px_60px_rgba(6,182,212,0.25)]",
        title: "text-cyan-400",
        inputBorder: "focus:border-cyan-400 border-cyan-500/30",
        btn: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white shadow-cyan-500/30",
      },
      red: {
        border: "border-red-500/40",
        shadow: "shadow-[0_20px_60px_rgba(239,68,68,0.25)]",
        title: "text-red-400",
        inputBorder: "focus:border-red-400 border-red-500/30",
        btn: "bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white shadow-red-500/30",
      },
    }[accent];

    return (
      <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div className={`w-full max-w-sm bg-[#0d111d] border ${accentClasses.border} rounded-3xl p-6 ${accentClasses.shadow} text-left relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`flex items-center gap-2 ${accentClasses.title} font-black text-sm`}>
              <KeyRound size={17} />
              <span>ផ្ទៀងផ្ទាត់សិទ្ធិម្ចាស់ប្រព័ន្ធ</span>
            </div>
            <button
              type="button"
              onClick={() => { setShowUnlockModal(false); setUnlockError(""); }}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
          
          <p className="text-xs text-gray-300 leading-relaxed mb-3 font-medium">
            បញ្ចូល Email ម្ចាស់ប្រព័ន្ធ ឬ Admin Passcode ដើម្បីដោះសោ Bypass ចូលពិនិត្យហាងជាមុន៖
          </p>

          <input
            type="password"
            placeholder="Admin Passcode ឬ nobrothana180703@gmail.com"
            value={unlockSecret}
            onChange={(e) => setUnlockSecret(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const clean = unlockSecret.trim().toLowerCase();
                if (
                  clean === "nobrothana180703@gmail.com" || 
                  clean === "admin@12345" || 
                  clean === "stech@2026"
                ) {
                  sessionStorage.setItem("stech_owner_store_bypass", "true");
                  setIsOwnerBypassed(true);
                  setShowUnlockModal(false);
                } else {
                  setUnlockError("Passcode ឬ Email មិនត្រឹមត្រូវ!");
                }
              }
            }}
            className={`w-full px-4 py-2.5 rounded-xl bg-black/70 border ${accentClasses.inputBorder} text-white text-xs focus:outline-none mb-2 shadow-inner`}
            autoFocus
          />

          {unlockError && (
            <div className="text-[11px] text-red-400 font-bold mb-2 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{unlockError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => { setShowUnlockModal(false); setUnlockError(""); }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={() => {
                const clean = unlockSecret.trim().toLowerCase();
                if (
                  clean === "nobrothana180703@gmail.com" || 
                  clean === "admin@12345" || 
                  clean === "stech@2026"
                ) {
                  sessionStorage.setItem("stech_owner_store_bypass", "true");
                  setIsOwnerBypassed(true);
                  setShowUnlockModal(false);
                } else {
                  setUnlockError("Passcode ឬ Email មិនត្រឹមត្រូវ!");
                }
              }}
              className={`px-5 py-2 rounded-xl ${accentClasses.btn} text-xs font-black shadow-lg cursor-pointer transition-all`}
            >
              ដោះសោ Bypass
            </button>
          </div>
        </div>
      </div>
    );
  }
}
