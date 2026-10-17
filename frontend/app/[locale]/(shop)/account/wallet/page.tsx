"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Sparkles, Plus, RefreshCw, Flame, CheckCircle2,
  Calendar, Award, ArrowUpRight, ArrowDownLeft, ShieldCheck,
  ChevronRight, ChevronLeft, ExternalLink, Share2, Eye, MessageSquare, ShoppingCart,
  CreditCard, ArrowRight, Clock, Check, AlertCircle, History,
  Trash2, Search, X, ChevronDown, ChevronUp, Filter, Loader2
} from "lucide-react";
import {
  getWalletData,
  getCachedWalletData,
  claimDailyCheckin,
  claimActivityReward,
  deleteWalletTransaction,
  clearWalletTransactions,
  WalletData,
  WalletTransaction,
} from "@/lib/services/wallet.service";
import WalletTopupModal from "@/components/wallet/WalletTopupModal";
import ConvertCoinsModal from "@/components/wallet/ConvertCoinsModal";
import ConfettiShower from "@/components/promotions/ConfettiShower";
import { playCelebrationFanfare } from "@/lib/celebration-audio";
import SocialShareModal from "@/components/ui/SocialShareModal";

const USD_TO_KHR = 4060;

export default function WalletAndCoinsPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(() => getCachedWalletData());
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(() => !getCachedWalletData());
  const [refreshing, setRefreshing] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [claimingActivity, setClaimingActivity] = useState<string | null>(null);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc: string } | null>(null);
  const [txFilter, setTxFilter] = useState<"all" | "deposit" | "reward" | "purchase">("all");
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [searchDate, setSearchDate] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "7days" | "30days">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState<boolean>(false);

  const loadData = async (isSilent = false) => {
    if (!isSilent && !wallet) setLoading(true);
    try {
      const data = await getWalletData();
      if (data.wallet) {
        setWallet(data.wallet);
      }
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Error loading wallet:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // 1. If we already have cached wallet, load silently in background (0ms latency to user)
    const hasCache = !!getCachedWalletData();
    loadData(hasCache);

    // 2. Listen to real-time wallet balance sync events across components
    const handleWalletUpdated = (e: any) => {
      if (e?.detail) {
        setWallet(e.detail);
      }
    };
    window.addEventListener("stech_wallet_updated", handleWalletUpdated);
    window.addEventListener("user_session_updated", () => loadData(true));

    return () => {
      window.removeEventListener("stech_wallet_updated", handleWalletUpdated);
      window.removeEventListener("user_session_updated", () => loadData(true));
    };
  }, []);

  const triggerToast = (title: string, desc: string) => {
    setToastMsg({ title, desc });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const handleDailyCheckin = async () => {
    if (!wallet?.daily_checkin?.can_claim || claimingDaily) return;
    setClaimingDaily(true);

    try {
      const res = await claimDailyCheckin();
      playCelebrationFanfare();
      setShowConfetti(true);
      triggerToast("🎁 ទទួលកាក់ប្រចាំថ្ងៃជោគជ័យ!", res.message);
      await loadData(true);
    } catch (err: any) {
      triggerToast("⚠️ បញ្ហា", err.response?.data?.message || "មិនអាចទទួលកាក់បានទេ");
    } finally {
      setClaimingDaily(false);
    }
  };

  const handleClaimActivity = async (type: string, title: string) => {
    if (claimingActivity) return;
    setClaimingActivity(type);

    try {
      const res = await claimActivityReward(type);
      if (res.already_claimed) {
        triggerToast("ℹ️ ដំណឹង", res.message);
      } else {
        playCelebrationFanfare();
        setShowConfetti(true);
        triggerToast("🎉 ទទួលបានកាក់បន្ថែម!", res.message);
      }
      await loadData(true);
    } catch (err: any) {
      triggerToast("⚠️ បញ្ហា", err.response?.data?.message || "មិនអាចទទួលកាក់បានទេ");
    } finally {
      setClaimingActivity(null);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបប្រវត្តិប្រតិបត្តិការនេះចេញពី Ledger មែនទេ? (Delete this transaction record?)")) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteWalletTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      triggerToast("🗑️ បានលុបជោគជ័យ", "បានលុបកំណត់ត្រាប្រតិបត្តិការចេញពីប្រវត្តិរបស់អ្នក។");
    } catch (err: any) {
      triggerToast("⚠️ បរាជ័យ", err.response?.data?.message || "មិនអាចលុបប្រតិបត្តិការបានទេ");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllTransactions = async () => {
    if (!window.confirm("តើអ្នកពិតជាចង់សម្អាតប្រវត្តិប្រតិបត្តិការទាំងអស់មែនទេ? (Clear all transaction history?)")) {
      return;
    }
    setClearing(true);
    try {
      await clearWalletTransactions();
      setTransactions([]);
      triggerToast("🧹 បានសម្អាតជោគជ័យ", "ប្រវត្តិប្រតិបត្តិការត្រូវបានសម្អាតទាំងអស់។");
    } catch (err: any) {
      triggerToast("⚠️ បរាជ័យ", err.response?.data?.message || "មិនអាចសម្អាតបានទេ");
    } finally {
      setClearing(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    // 1. Type filter
    if (txFilter === "deposit" && tx.type !== "deposit") return false;
    if (txFilter === "reward" && tx.type !== "coin_reward" && tx.type !== "coin_redeem") return false;
    if (txFilter === "purchase" && tx.type !== "purchase") return false;

    // 2. Date filter (exact or preset)
    if (searchDate) {
      const txDate = new Date(tx.created_at).toISOString().slice(0, 10);
      if (txDate !== searchDate) return false;
    } else if (datePreset !== "all") {
      const txTime = new Date(tx.created_at).getTime();
      const now = Date.now();
      if (datePreset === "today") {
        const todayStr = new Date().toISOString().slice(0, 10);
        const txDate = new Date(tx.created_at).toISOString().slice(0, 10);
        if (txDate !== todayStr) return false;
      } else if (datePreset === "7days") {
        if (now - txTime > 7 * 24 * 3600 * 1000) return false;
      } else if (datePreset === "30days") {
        if (now - txTime > 30 * 24 * 3600 * 1000) return false;
      }
    }

    // 3. Keyword filter
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const desc = (tx.description || "").toLowerCase();
      const ref = (tx.reference_id || "").toLowerCase();
      const amount = String(tx.amount || "");
      if (!desc.includes(kw) && !ref.includes(kw) && !amount.includes(kw)) {
        return false;
      }
    }

    return true;
  });

  const displayedTransactions = filteredTransactions.slice(0, visibleCount);
  const hasMore = filteredTransactions.length > visibleCount;

  const streak = wallet?.daily_checkin?.streak || 0;
  const canClaimDaily = wallet?.daily_checkin?.can_claim ?? true;

  return (
    <>
      {showConfetti && <ConfettiShower durationMs={5000} />}

      {/* Floating Notification Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-[140] max-w-sm p-4 rounded-2xl bg-[#0f141d]/95 text-white border border-emerald-500/40 shadow-2xl backdrop-blur-md flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">{toastMsg.title}</h4>
              <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">{toastMsg.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full min-h-screen bg-[#07090e] text-gray-100 pb-32 sm:pb-24 pt-4 sm:pt-6 px-3.5 sm:px-6 lg:px-8">
        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.06] p-3 sm:p-4 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                href="/account/profile"
                className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
              >
                <ChevronLeft size={17} />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                    S-Tech Wallet & Coins
                  </h1>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </div>
                <p className="text-[10px] text-gray-400 truncate">
                  កាបូបសាច់ប្រាក់ និងកាក់រង្វាន់សមាជិក
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadData(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 text-xs font-semibold transition-all border border-white/[0.08] shrink-0 cursor-pointer"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin text-red-400" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* ── Main Responsive Grid: 1 Col on Mobile/Tablet, 2 Columns (7 cols + 5 cols) on Desktop ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Balances, Daily Check-in Streak, and Earn More Coins (7 cols on lg:) */}
            <div className="lg:col-span-7 space-y-6">
              {/* ── Section 1: Hero Balances (Cash Wallet & S-Coins Loyalty) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Card 1: Real USD Cash Wallet */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#1c0f11] via-[#120a0c] to-[#090b10] p-4.5 sm:p-6 border border-red-500/25 shadow-xl shadow-red-950/20 flex flex-col justify-between gap-4">
              {/* Subtle ambient light */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-red-950/60 shrink-0">
                    <Wallet size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        Cash Wallet
                      </h2>
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                        USD
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">
                      កាបូបសាច់ប្រាក់សម្រាប់ទិញទំនិញ
                    </p>
                  </div>
                </div>

                <div className="px-2 py-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[9px] font-mono text-gray-400 shrink-0">
                  S-WALLET
                </div>
              </div>

              {/* Balance Amount */}
              <div className="relative z-10 py-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                    ${wallet ? Number(wallet.balance).toFixed(2) : "0.00"}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-400">
                    USD
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-amber-400/90 mt-0.5">
                  ≈ {wallet ? Math.round(Number(wallet.balance) * USD_TO_KHR).toLocaleString() : 0} KHR (រៀល)
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 relative z-10 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(true)}
                  className="flex-1 min-w-0 py-2 sm:py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-red-950/50 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} className="shrink-0" />
                  <span className="truncate">បញ្ចូលលុយ (Top Up)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("transaction-history");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="py-2 sm:py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-xs font-semibold transition-all border border-white/[0.08] flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <History size={13} className="shrink-0" />
                  <span>ប្រវត្តិ</span>
                </button>
              </div>
            </div>

            {/* Card 2: S-Coins Loyalty Balance */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#1c1409] via-[#130e06] to-[#090b10] p-4.5 sm:p-6 border border-amber-500/25 shadow-xl shadow-amber-950/20 flex flex-col justify-between gap-4">
              {/* Subtle ambient light */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black shadow-md shadow-amber-950/60 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        S-Coins
                      </h2>
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-400 text-[9px] font-bold border border-amber-500/30">
                        100 = $1.00
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">
                      កាក់ភក្តីភាពបានពីសកម្មភាព & ការទិញ
                    </p>
                  </div>
                </div>

                <div className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-[9px] font-bold text-amber-400 shrink-0">
                  🔥 Streak: {streak} ថ្ងៃ
                </div>
              </div>

              {/* Balance Amount */}
              <div className="relative z-10 py-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-400 tracking-tight">
                    {wallet ? Number(wallet.coins).toLocaleString() : 0}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-400">
                    Coins
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-emerald-400 mt-0.5">
                  ≈ ${wallet ? Number(wallet.coins_usd_value).toFixed(2) : "0.00"} USD Cash Equivalent
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 relative z-10 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(true)}
                  disabled={(wallet?.coins ?? 0) < 50}
                  className="flex-1 min-w-0 py-2 sm:py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:brightness-105 text-black text-xs font-bold shadow-md shadow-amber-950/40 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={12} className="shrink-0" />
                  <span className="truncate">ប្តូរកាក់ជាលុយ (Redeem)</span>
                </button>

                <Link
                  href="/products"
                  className="py-2 sm:py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-xs font-semibold transition-all border border-white/[0.08] flex items-center gap-1 no-underline shrink-0"
                >
                  <span>ចាយកាក់</span>
                  <ArrowRight size={12} className="shrink-0" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Section 2: Daily Check-in Streak ── */}
          <div className="rounded-2xl sm:rounded-3xl bg-[#0d1017] p-4 sm:p-5.5 border border-white/[0.08] shadow-xl space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
                  <Flame size={15} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    ទទួលកាក់ប្រចាំថ្ងៃ (Daily Check-in)
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    ចូលមកកាន់គេហទំព័ររាល់ថ្ងៃដើម្បីទទួលបាន 1 Coin ឥតគិតថ្លៃ
                  </p>
                </div>
              </div>

              <div className="px-2 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                <Flame size={11} className="animate-pulse" />
                <span>អ្នកបានចូល {streak} ថ្ងៃជាប់គ្នា</span>
              </div>
            </div>

            {/* 7-Day Roadmap Grid - Precision Responsive */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isClaimedDay = streak >= day;
                const isToday = streak === day - 1 && canClaimDaily;
                const isBonusDay = day === 7;

                return (
                  <div
                    key={day}
                    className={`py-2 px-1 sm:py-2.5 sm:px-2 rounded-xl sm:rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1 min-h-[68px] sm:min-h-[82px] min-w-0 ${
                      isClaimedDay
                        ? "bg-emerald-950/25 border-emerald-500/40 text-emerald-400"
                        : isToday
                        ? "bg-red-950/30 border-red-500/70 ring-1 ring-red-500/50 text-white animate-pulse"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400"
                    }`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      ថ្ងៃ {day}
                    </span>

                    <div className="shrink-0">
                      {isClaimedDay ? (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center mx-auto font-black text-[10px] sm:text-xs ${
                          isBonusDay ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white"
                        }`}>
                          {isBonusDay ? "★" : "🪙"}
                        </div>
                      )}
                    </div>

                    <span className={`text-[9px] sm:text-[10px] font-bold tracking-tight truncate w-full ${
                      isClaimedDay ? "text-emerald-400" : isBonusDay ? "text-amber-400" : "text-gray-300"
                    }`}>
                      +{isBonusDay ? 3 : 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* CTA Button */}
            <div>
              {canClaimDaily ? (
                <button
                  type="button"
                  onClick={handleDailyCheckin}
                  disabled={claimingDaily}
                  className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-950/50 hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
                >
                  {claimingDaily ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>កំពុងទទួលកាក់...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>🎁 ចុចទទួលយក +1 Coin ថ្ងៃនេះ (Claim Today)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="py-2.5 px-3 rounded-xl bg-emerald-950/20 border border-emerald-500/25 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>លោកអ្នកបានទទួលកាក់ថ្ងៃនេះរួចរាល់ហើយ! សូមត្រឡប់មកវិញនៅថ្ងៃស្អែក។</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Section 3: Activity Missions ── */}
          <div className="rounded-2xl sm:rounded-3xl bg-[#0d1017] p-4 sm:p-5.5 border border-white/[0.08] shadow-xl space-y-3.5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <Award size={15} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  សកម្មភាពដើម្បីទទួលបានកាក់បន្ថែម (Earn More Coins)
                </h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                បំពេញសកម្មភាពក្នុងវេបសាយដើម្បីទទួលបាន 3 ឬ 5 Coins បន្ថែមភ្លាមៗ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {/* Mission 1 */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                    <Eye size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">ចូលមើលទំនិញថ្មីៗ</h4>
                    <p className="text-[10px] text-gray-400 truncate">ស្វែងរក Laptop ឬគ្រឿងបន្លាស់</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimActivity("browse_products", "ចូលមើលទំនិញថ្មីៗ")}
                  disabled={claimingActivity === "browse_products"}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-all border-none cursor-pointer shrink-0"
                >
                  +3 Coins
                </button>
              </div>

              {/* Mission 2 */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">ពិគ្រោះជាមួយ S Tech AI</h4>
                    <p className="text-[10px] text-gray-400 truncate">សាកសួរតម្លៃ ឬ Specs កុំព្យូទ័រ</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimActivity("chat_ai", "ពិគ្រោះជាមួយ S Tech AI")}
                  disabled={claimingActivity === "chat_ai"}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all border-none cursor-pointer shrink-0"
                >
                  +3 Coins
                </button>
              </div>

              {/* Mission 3 */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                    <ShoppingCart size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">រៀបចំកន្ត្រកទំនិញ</h4>
                    <p className="text-[10px] text-gray-400 truncate">ដាក់ទំនិញចូលក្នុងកន្ត្រកទិញ</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimActivity("cart_milestone", "រៀបចំកន្ត្រកទំនិញ")}
                  disabled={claimingActivity === "cart_milestone"}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all border-none cursor-pointer shrink-0"
                >
                  +3 Coins
                </button>
              </div>

              {/* Mission 4 */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-amber-500/20 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <Share2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <h4 className="text-xs font-bold text-white truncate">ចែករំលែកហាង</h4>
                      <span className="px-1 py-0.1 rounded bg-amber-500/20 text-amber-400 text-[8px] font-black shrink-0">
                        BEST
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">តាម Telegram ឬ Facebook</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  disabled={claimingActivity === "share_store"}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition-all border-none cursor-pointer shrink-0"
                >
                  +5 Coins
                </button>
              </div>
            </div>
          </div>
            </div>
            {/* End Left Column */}

            {/* Right Column: Sticky Transaction History Ledger (5 cols on desktop lg:) */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              {/* ── Section 4: Transactions History (Ledger with Search, Delete & See More) ── */}
              <div id="transaction-history" className="rounded-2xl sm:rounded-3xl bg-[#0d1017] p-4 sm:p-5.5 border border-white/[0.08] shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <span>ប្រវត្តិប្រតិបត្តិការ (Transaction Ledger)</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-gray-300 text-[10px] font-mono font-bold">
                        {filteredTransactions.length}
                      </span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      បង្ហាញត្រឹមតែ ១០ ប្រតិបត្តិការចុងក្រោយ (អាចស្វែងរកតាមកាលបរិច្ឆេទ ឬចុចមើលបន្ថែម)
                    </p>
                  </div>

                  {/* Action: Clear All if transactions exist */}
                  {transactions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllTransactions}
                      disabled={clearing}
                      className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="សម្អាតប្រវត្តិប្រតិបត្តិការទាំងអស់"
                    >
                      {clearing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      <span>សម្អាតប្រវត្តិ (Clear All)</span>
                    </button>
                  )}
                </div>

                {/* Date Search & Preset Chips Bar */}
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                    {/* Date Picker Input */}
                    <div className="relative">
                      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={searchDate}
                        onChange={(e) => {
                          setSearchDate(e.target.value);
                          setDatePreset("all");
                          setVisibleCount(10);
                        }}
                        className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-gray-500 focus:border-red-500 focus:outline-none font-mono"
                        title="ជ្រើសរើសថ្ងៃជាក់លាក់ (Search by exact date)"
                      />
                      {searchDate && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchDate("");
                            setVisibleCount(10);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer bg-transparent border-none"
                          title="សម្អាតថ្ងៃ (Clear date)"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Keyword search input */}
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => {
                          setSearchKeyword(e.target.value);
                          setVisibleCount(10);
                        }}
                        placeholder="ស្វែងរកតាមឈ្មោះ, Ref..."
                        className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                      />
                      {searchKeyword && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchKeyword("");
                            setVisibleCount(10);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer bg-transparent border-none"
                          title="សម្អាតពាក្យស្វែងរក"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Presets & Category Filters */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                    {/* Date Presets */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px] pb-0.5">
                      <span className="text-gray-500 mr-1 text-[10px] shrink-0">កាលបរិច្ឆេទ:</span>
                      {(
                        [
                          { id: "all", label: "ទាំងអស់" },
                          { id: "today", label: "ថ្ងៃនេះ" },
                          { id: "7days", label: "៧ ថ្ងៃ" },
                          { id: "30days", label: "ខែនេះ" },
                        ] as const
                      ).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setDatePreset(p.id);
                            setSearchDate("");
                            setVisibleCount(10);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap border text-[10px] ${
                            datePreset === p.id && !searchDate
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] border-white/[0.04]"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Type Filter Buttons */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px] pb-0.5">
                      <span className="text-gray-500 mr-1 text-[10px] shrink-0">ប្រភេទ:</span>
                      {(["all", "deposit", "reward", "purchase"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => {
                            setTxFilter(f);
                            setVisibleCount(10);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition-all border cursor-pointer whitespace-nowrap text-[10px] ${
                            txFilter === f
                              ? "bg-red-600 text-white border-red-500 shadow-xs"
                              : "bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 border-white/[0.04]"
                          }`}
                        >
                          {f === "all" ? "គ្រប់ប្រភេទ" : f === "deposit" ? "បញ្ចូលលុយ" : f === "reward" ? "កាក់" : "ការទិញ"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

            {/* List */}
            {filteredTransactions.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.04] text-gray-500 flex items-center justify-center mx-auto">
                  <History size={18} />
                </div>
                <div className="text-gray-400 text-xs font-medium">
                  {searchDate || searchKeyword || datePreset !== "all" || txFilter !== "all"
                    ? "មិនមានប្រតិបត្តិការត្រូវនឹងលក្ខខណ្ឌស្វែងរកនេះទេ"
                    : "មិនទាន់មានប្រវត្តិប្រតិបត្តិការនៅឡើយទេ"}
                </div>
                {(searchDate || searchKeyword || datePreset !== "all" || txFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDate("");
                      setSearchKeyword("");
                      setDatePreset("all");
                      setTxFilter("all");
                      setVisibleCount(10);
                    }}
                    className="text-[11px] text-amber-400 hover:underline cursor-pointer bg-transparent border-none font-bold"
                  >
                    សម្អាតការស្វែងរកទាំងអស់ (Reset Filters)
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-white/[0.04] max-h-[560px] lg:max-h-[640px] overflow-y-auto pr-1">
                  {displayedTransactions.map((tx) => {
                    const isDeposit = tx.type === "deposit";
                    const isReward = tx.type === "coin_reward";
                    const isRedeem = tx.type === "coin_redeem";
                    const isPurchase = tx.type === "purchase";
                    const statusLower = (tx.status || "").toLowerCase();
                    const isPending = statusLower === "pending" || statusLower === "processing";
                    const isFailed = ["failed", "cancelled", "rejected", "declined", "error"].includes(statusLower);

                    return (
                      <div key={tx.id} className="py-2.5 sm:py-3 flex items-center justify-between gap-2.5 group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isPending
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              : isFailed
                              ? "bg-red-500/15 text-red-400 border border-red-500/20"
                              : isDeposit
                              ? "bg-emerald-500/15 text-emerald-400"
                              : isReward
                              ? "bg-amber-500/15 text-amber-400"
                              : isRedeem
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-red-500/15 text-red-400"
                          }`}>
                            {isDeposit ? (
                              <ArrowDownLeft size={16} />
                            ) : isReward ? (
                              <Sparkles size={16} />
                            ) : isRedeem ? (
                              <RefreshCw size={14} />
                            ) : (
                              <ArrowUpRight size={16} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h5 className="text-xs font-semibold text-white truncate">{tx.description}</h5>
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-400 mt-0.5">
                              <span>{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              {tx.reference_id && (
                                <span className="truncate">• Ref: {tx.reference_id}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount / Coins change + Delete Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right space-y-0.5">
                            {isReward && (
                              <div className="text-xs font-bold text-amber-400">
                                +{tx.coins} Coins
                              </div>
                            )}
                            {isRedeem && (
                              <div>
                                <div className="text-xs font-bold text-emerald-400">
                                  +${Number(tx.amount).toFixed(2)} USD
                                </div>
                                <div className="text-[9px] text-gray-400">-{tx.coins} Coins</div>
                              </div>
                            )}
                            {isDeposit && (
                              <div className={`text-xs font-bold ${
                                isPending ? "text-amber-400" : isFailed ? "text-red-400/80 line-through" : "text-emerald-400"
                              }`}>
                                +${Number(tx.amount).toFixed(2)} USD
                              </div>
                            )}
                            {isPurchase && (
                              <div className="text-xs font-bold text-red-400">
                                -${Math.abs(Number(tx.amount)).toFixed(2)} USD
                              </div>
                            )}

                            <div>
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  <span>PENDING</span>
                                </span>
                              ) : isFailed ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  <span>FAILED</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>COMPLETED</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delete single transaction record */}
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            disabled={deletingId === tx.id}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors border-none cursor-pointer shrink-0 disabled:opacity-40"
                            title="លុបកំណត់ត្រានេះ (Delete record)"
                          >
                            {deletingId === tx.id ? (
                              <Loader2 size={13} className="animate-spin text-red-400" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* See More / Show Less Controls (Shows 10 by default) */}
                <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-400 font-mono">
                    កំពុងបង្ហាញ {displayedTransactions.length} នៃ {filteredTransactions.length} ប្រតិបត្តិការ
                  </span>

                  <div className="flex items-center gap-2">
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => prev + 10)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold transition-all border border-white/[0.08] cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>មើលបន្ថែម (+10 ទៀត) • See More</span>
                        <ChevronDown size={14} />
                      </button>
                    )}

                    {visibleCount > 10 && (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(10)}
                        className="px-3 py-1.5 rounded-xl bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white text-xs font-medium transition-all border border-white/[0.04] cursor-pointer flex items-center gap-1"
                      >
                        <span>បង្ហាញតែ ១០ វិញ (Show 10 Only)</span>
                        <ChevronUp size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* End Section 4 */}
        </div>
        {/* End Right Column */}
      </div>
      {/* End Main Responsive Grid */}
    </div>
    {/* End max-w-7xl */}
  </div>
  {/* End min-h-screen */}

      {/* Topup Modal */}
      <WalletTopupModal
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        onSuccess={(newBal) => {
          setWallet((prev) => prev ? { ...prev, balance: newBal } : prev);
          loadData(true);
        }}
      />

      {/* Convert Coins Modal */}
      <ConvertCoinsModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        currentCoins={wallet?.coins || 0}
        onSuccess={(newBal, remCoins) => {
          setWallet((prev) => prev ? { ...prev, balance: newBal, coins: remCoins, coins_usd_value: roundTwoDecimals(remCoins / 200) } : prev);
          triggerToast("🔄 ប្តូរកាក់ជោគជ័យ!", `លោកអ្នកទទួលបានសាច់ប្រាក់បញ្ចូលទៅក្នុងកាបូបដោយជោគជ័យ`);
          loadData(true);
        }}
      />

      {/* Universal Direct-to-Post Social Share Modal with Live Preview */}
      <SocialShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="S Tech Store — ហាងលក់ និងជួសជុលកុំព្យូទ័រ Laptops & Gaming PC នៅកម្ពុជា"
        text="ចូលមកមើលទំនិញបច្ចេកវិទ្យា Laptops, Custom Gaming PC & គ្រឿងបន្លាស់គុណភាពខ្ពស់នៅ S Tech Store! ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង"
        url="https://www.s-tech-store.tech"
        imageUrl="https://www.s-tech-store.tech/og-image.png"
        onShareSuccess={() => {
          handleClaimActivity("share_store", "ចែករំលែកហាង");
        }}
      />
    </>
  );
}

function roundTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}
