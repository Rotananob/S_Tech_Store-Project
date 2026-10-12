"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Sparkles, Plus, RefreshCw, Flame, CheckCircle2,
  Calendar, Award, ArrowUpRight, ArrowDownLeft, ShieldCheck,
  ChevronRight, ExternalLink, Share2, Eye, MessageSquare, ShoppingCart,
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

      <div className="min-h-screen bg-[#090b10] text-gray-100 py-6 sm:py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Link href="/account/profile" className="hover:text-white transition-colors">
                គណនីរបស់ខ្ញុំ
              </Link>
              <span>/</span>
              <span className="text-white font-bold">កាបូបលុយ & កាក់ (S-Tech Wallet & Coins)</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadData(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all border border-white/10 cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>

          {/* ── Section 1: Hero Balances (Cash Wallet & Loyalty Coins) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Card 1: Real USD Cash Wallet */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0a0a] via-[#120808] to-[#0d0d12] p-6 sm:p-7 border border-red-900/40 shadow-2xl flex flex-col justify-between min-h-[220px]">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-950/50">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      <span>S-Tech Real Cash Wallet</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        USD Balance
                      </span>
                    </h2>
                    <p className="text-[11px] text-gray-400">កាបូបសាច់ប្រាក់ពិតប្រាកដសម្រាប់ទិញទំនិញ</p>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300">
                  ID: S-WALLET-KH
                </div>
              </div>

              {/* Big Balance Display */}
              <div className="my-5 relative z-10">
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  ${wallet ? Number(wallet.balance).toFixed(2) : "0.00"}{" "}
                  <span className="text-base font-bold text-gray-400">USD</span>
                </div>
                <div className="text-xs font-bold text-amber-400/90 mt-1">
                  ~ {wallet ? Math.round(Number(wallet.balance) * USD_TO_KHR).toLocaleString() : 0} KHR (រៀល)
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 relative z-10">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(true)}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-red-950/60 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  <Plus size={14} strokeWidth={3} />
                  <span>បញ្ចូលលុយពី Bank (Top Up)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("transaction-history");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all border border-white/10 flex items-center gap-1 cursor-pointer"
                >
                  <History size={13} />
                  <span>ប្រវត្តិ</span>
                </button>
              </div>
            </div>

            {/* Card 2: S-Coins Loyalty Balance */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1506] via-[#141005] to-[#0c0d12] p-6 sm:p-7 border border-amber-500/30 shadow-2xl flex flex-col justify-between min-h-[220px]">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black shadow-lg shadow-amber-950/50">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      <span>S-Coins Loyalty Rewards</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                        100 Coins = $1.00
                      </span>
                    </h2>
                    <p className="text-[11px] text-gray-400">កាក់ភក្តីភាពបានពីការចូលមើល & សកម្មភាព</p>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-400">
                  🔥 Streak: ថ្ងៃទី {streak}
                </div>
              </div>

              {/* Big Coins Display */}
              <div className="my-5 relative z-10">
                <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight flex items-baseline gap-2">
                  <span>{wallet ? wallet.coins : 0}</span>
                  <span className="text-base font-bold text-gray-400">S-Coins</span>
                </div>
                <div className="text-xs font-bold text-emerald-400 mt-1">
                  ≈ ${wallet ? Number(wallet.coins_usd_value).toFixed(2) : "0.00"} USD Cash Equivalent
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 relative z-10">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(true)}
                  disabled={(wallet?.coins ?? 0) < 50}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black text-xs font-black shadow-lg shadow-amber-950/60 transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={13} />
                  <span>ប្តូរកាក់ជាលុយកាបូប (Redeem Cash)</span>
                </button>

                <Link
                  href="/products"
                  className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all border border-white/10 flex items-center gap-1 no-underline"
                >
                  <span>ចាយកាក់</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Section 2: Daily Check-in Streak (ចូលមកវេបសាយ១ដងបាន 1 Coin) ── */}
          <div className="rounded-3xl bg-[#11141c] p-6 sm:p-7 border border-white/10 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                    <Flame size={16} />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    ទទួលកាក់ប្រចាំថ្ងៃ (Daily 1 Coin Reward)
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  ចូលមកកាន់គេហទំព័ររាល់ថ្ងៃដើម្បីទទួលបាន 1 Coin ឥតគិតថ្លៃ — មិនបាច់ចាំទិញទំនិញឡើយ!
                </p>
              </div>

              {/* Streak Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold shrink-0">
                <Flame size={14} className="animate-pulse" />
                <span>អ្នកបានចូល {streak} ថ្ងៃជាប់ៗគ្នា</span>
              </div>
            </div>

            {/* 7-Day Roadmap Grid */}
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isClaimedDay = streak >= day;
                const isToday = streak === day - 1 && canClaimDaily;
                const isBonusDay = day === 7;

                return (
                  <div
                    key={day}
                    className={`p-2.5 sm:p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-h-[90px] sm:min-h-[105px] ${
                      isClaimedDay
                        ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-400"
                        : isToday
                        ? "bg-red-950/40 border-red-500/80 ring-2 ring-red-500/40 text-white animate-pulse"
                        : "bg-white/5 border-white/10 text-gray-400"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      ថ្ងៃ {day}
                    </span>

                    <div className="my-1">
                      {isClaimedDay ? (
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto font-black text-xs ${
                          isBonusDay ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white"
                        }`}>
                          {isBonusDay ? "★" : "🪙"}
                        </div>
                      )}
                    </div>

                    <span className={`text-[11px] font-black ${
                      isClaimedDay ? "text-emerald-400" : isBonusDay ? "text-amber-400" : "text-white"
                    }`}>
                      +{isBonusDay ? 3 : 1} Coin
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
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-600 to-[#8B1A1A] text-white text-xs sm:text-sm font-black shadow-lg shadow-red-950/60 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  {claimingDaily ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>កំពុងទទួលកាក់...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>🎁 ចុចទទួលយក +1 Coin ថ្ងៃនេះ (Claim Today)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>លោកអ្នកបានទទួលកាក់រួចរាល់ហើយសម្រាប់ថ្ងៃនេះ! សូមត្រឡប់មកវិញនៅថ្ងៃស្អែក។</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Section 3: Activity Missions (សកម្មភាពច្រើនទទួលបាន 3 ឬ 5 Coins) ── */}
          <div className="rounded-3xl bg-[#11141c] p-6 sm:p-7 border border-white/10 shadow-xl space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Award size={16} />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  សកម្មភាពដើម្បីទទួលបានកាក់បន្ថែម (Earn More Coins)
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                បំពេញសកម្មភាពក្នុងវេបសាយដើម្បីទទួលបាន 3 ឬ 5 Coins បន្ថែមភ្លាមៗ!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Mission 1 */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">ចូលមើលទំនិញថ្មីៗក្នុងហាង</h4>
                    <p className="text-[11px] text-gray-400">ស្វែងរក Laptop ឬគ្រឿងបន្លាស់កុំព្យូទ័រ</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimActivity("browse_products", "ចូលមើលទំនិញថ្មីៗ")}
                  disabled={claimingActivity === "browse_products"}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <span>+3 Coins</span>
                </button>
              </div>

              {/* Mission 2 */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">ពិគ្រោះជាមួយ Gemini AI</h4>
                    <p className="text-[11px] text-gray-400">សាកសួរតម្លៃ ឬពិគ្រោះ Specs កុំព្យូទ័រ</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimActivity("chat_ai", "ពិគ្រោះជាមួយ Gemini AI")}
                  disabled={claimingActivity === "chat_ai"}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <span>+3 Coins</span>
                </button>
              </div>

              {/* Mission 3 */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">រៀបចំកន្ត្រកទំនិញ</h4>
                    <p className="text-[11px] text-gray-400">ដាក់ទំនិញចូលក្នុងកន្ត្រកទិញ</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimActivity("cart_milestone", "រៀបចំកន្ត្រកទំនិញ")}
                  disabled={claimingActivity === "cart_milestone"}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <span>+3 Coins</span>
                </button>
              </div>

              {/* Mission 4: Share Store (Big 5 Coins) */}
              <div className="p-4 rounded-2xl bg-white/5 border border-amber-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-white">ចែករំលែកហាងទៅកាន់មិត្តភក្តិ</h4>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-black">
                        BEST
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">ចែករំលែកតាម Telegram ឬ Facebook</p>
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
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black text-xs font-black transition-all border-none cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Share2 size={12} />
                  <span>+5 Coins</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Section 4: Transactions History ── */}
          <div id="transaction-history" className="rounded-3xl bg-[#11141c] p-6 sm:p-7 border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>ប្រវត្តិប្រតិបត្តិការ (Transaction Ledger)</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-[10px] font-bold">
                    {filteredTransactions.length}
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  រាល់ការបញ្ចូលលុយ ការទិញទំនិញ និងការទទួលបានកាក់
                </p>
              </div>

              {/* Filters */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(["all", "deposit", "reward", "purchase"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTxFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                      txFilter === f
                        ? "bg-[#8B1A1A] text-white border-red-500"
                        : "bg-white/5 hover:bg-white/10 text-gray-400 border-white/10"
                    }`}
                  >
                    {f === "all" ? "ទាំងអស់" : f === "deposit" ? "បញ្ចូលលុយ" : f === "reward" ? "កាក់រង្វាន់" : "ការបញ្ជាទិញ"}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {filteredTransactions.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-xs">
                មិនទាន់មានប្រវត្តិប្រតិបត្តិការនៅឡើយទេ។
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredTransactions.map((tx) => {
                  const isDeposit = tx.type === "deposit";
                  const isReward = tx.type === "coin_reward";
                  const isRedeem = tx.type === "coin_redeem";
                  const isPurchase = tx.type === "purchase";

                  return (
                    <div key={tx.id} className="py-3 sm:py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isDeposit
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isReward
                            ? "bg-amber-500/20 text-amber-400"
                            : isRedeem
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {isDeposit ? (
                            <ArrowDownLeft size={18} />
                          ) : isReward ? (
                            <Sparkles size={18} />
                          ) : isRedeem ? (
                            <RefreshCw size={16} />
                          ) : (
                            <ArrowUpRight size={18} />
                          )}
                        </div>

                        <div>
                          <h5 className="text-xs font-bold text-white">{tx.description}</h5>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                            <span>{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {tx.reference_id && (
                              <span>• Ref: {tx.reference_id}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount / Coins change */}
                      <div className="text-right shrink-0">
                        {isReward && (
                          <div className="text-xs font-black text-amber-400">
                            +{tx.coins} Coins
                          </div>
                        )}
                        {isRedeem && (
                          <div>
                            <div className="text-xs font-black text-emerald-400">
                              +${Number(tx.amount).toFixed(2)} USD
                            </div>
                            <div className="text-[10px] text-gray-400">{tx.coins} Coins</div>
                          </div>
                        )}
                        {isDeposit && (
                          <div className="text-xs font-black text-emerald-400">
                            +${Number(tx.amount).toFixed(2)} USD
                          </div>
                        )}
                        {isPurchase && (
                          <div className="text-xs font-black text-red-400">
                            -${Math.abs(Number(tx.amount)).toFixed(2)} USD
                          </div>
                        )}
                        <span className="text-[10px] text-emerald-400/80 font-bold uppercase">
                          {tx.status}
                        </span>
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
