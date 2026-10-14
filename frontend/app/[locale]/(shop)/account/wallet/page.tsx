"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Sparkles, Plus, RefreshCw, Flame, CheckCircle2,
  Calendar, Award, ArrowUpRight, ArrowDownLeft, ShieldCheck,
  ChevronRight, ChevronLeft, ExternalLink, Share2, Eye, MessageSquare, ShoppingCart,
  CreditCard, ArrowRight, Clock, Check, AlertCircle, History
} from "lucide-react";
import {
  getWalletData,
  getCachedWalletData,
  claimDailyCheckin,
  claimActivityReward,
  WalletData,
  WalletTransaction,
} from "@/lib/services/wallet.service";
import WalletTopupModal from "@/components/wallet/WalletTopupModal";
import ConvertCoinsModal from "@/components/wallet/ConvertCoinsModal";
import ConfettiShower from "@/components/promotions/ConfettiShower";
import { playCelebrationFanfare } from "@/lib/celebration-audio";

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
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc: string } | null>(null);
  const [txFilter, setTxFilter] = useState<"all" | "deposit" | "reward" | "purchase">("all");

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

  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === "all") return true;
    if (txFilter === "deposit") return tx.type === "deposit";
    if (txFilter === "reward") return tx.type === "coin_reward" || tx.type === "coin_redeem";
    if (txFilter === "purchase") return tx.type === "purchase";
    return true;
  });

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

      <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#07090e] text-gray-100 pb-32 sm:pb-24 pt-3 sm:pt-6 px-3.5 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.06] p-2.5 sm:p-3 rounded-2xl backdrop-blur-md">
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

          {/* ── Section 1: Hero Balances (Cash Wallet & S-Coins Loyalty) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
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
                  className="flex-1 py-2 sm:py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-red-950/50 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>បញ្ចូលលុយ (Top Up)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("transaction-history");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="py-2 sm:py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-xs font-semibold transition-all border border-white/[0.08] flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <History size={13} />
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
                  className="flex-1 py-2 sm:py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:brightness-105 text-black text-xs font-bold shadow-md shadow-amber-950/40 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={12} />
                  <span>ប្តូរកាក់ជាលុយ (Redeem)</span>
                </button>

                <Link
                  href="/products"
                  className="py-2 sm:py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-xs font-semibold transition-all border border-white/[0.08] flex items-center gap-1 no-underline shrink-0"
                >
                  <span>ចាយកាក់</span>
                  <ArrowRight size={12} />
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
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: "S Tech Store Cambodia",
                        text: "ចូលមកមើលទំនិញកុំព្យូទ័រ Laptop & PC Build គុណភាពខ្ពស់នៅ S Tech Store!",
                        url: window.location.origin,
                      }).catch(() => {});
                    }
                    handleClaimActivity("share_store", "ចែករំលែកហាង");
                  }}
                  disabled={claimingActivity === "share_store"}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition-all border-none cursor-pointer shrink-0"
                >
                  +5 Coins
                </button>
              </div>
            </div>
          </div>

          {/* ── Section 4: Transactions History ── */}
          <div id="transaction-history" className="rounded-2xl sm:rounded-3xl bg-[#0d1017] p-4 sm:p-5.5 border border-white/[0.08] shadow-xl space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>ប្រវត្តិប្រតិបត្តិការ (Transaction Ledger)</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-white/[0.08] text-gray-300 text-[10px] font-mono">
                    {filteredTransactions.length}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-400">
                  រាល់ការបញ្ចូលលុយ ការទិញទំនិញ និងការទទួលបានកាក់
                </p>
              </div>

              {/* Filters */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 max-w-full">
                {(["all", "deposit", "reward", "purchase"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTxFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer whitespace-nowrap ${
                      txFilter === f
                        ? "bg-red-600 text-white border-red-500 shadow-sm"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 border-white/[0.06]"
                    }`}
                  >
                    {f === "all" ? "ទាំងអស់" : f === "deposit" ? "បញ្ចូលលុយ" : f === "reward" ? "កាក់" : "ការទិញ"}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                មិនទាន់មានប្រវត្តិប្រតិបត្តិការនៅឡើយទេ។
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filteredTransactions.map((tx) => {
                  const isDeposit = tx.type === "deposit";
                  const isReward = tx.type === "coin_reward";
                  const isRedeem = tx.type === "coin_redeem";
                  const isPurchase = tx.type === "purchase";
                  const statusLower = (tx.status || "").toLowerCase();
                  const isPending = statusLower === "pending" || statusLower === "processing";
                  const isFailed = ["failed", "cancelled", "rejected", "declined", "error"].includes(statusLower);

                  return (
                    <div key={tx.id} className="py-2.5 sm:py-3 flex items-center justify-between gap-2.5">
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

                      {/* Amount / Coins change */}
                      <div className="text-right shrink-0 space-y-0.5">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

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
          setWallet((prev) => prev ? { ...prev, balance: newBal, coins: remCoins, coins_usd_value: roundTwoDecimals(remCoins / 100) } : prev);
          triggerToast("🔄 ប្តូរកាក់ជោគជ័យ!", `លោកអ្នកទទួលបានសាច់ប្រាក់បញ្ចូលទៅក្នុងកាបូបដោយជោគជ័យ`);
          loadData(true);
        }}
      />
    </>
  );
}

function roundTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}
