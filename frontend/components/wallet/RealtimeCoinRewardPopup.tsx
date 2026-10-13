"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Sparkles, X, Wallet, ArrowRight, CheckCircle2 } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/routing";
import { getEffectiveUser } from "@/lib/auth-user";
import { claimActivityReward, updateCachedWallet } from "@/lib/services/wallet.service";
import { playCelebrationFanfare } from "@/lib/celebration-audio";
import ConfettiShower from "@/components/promotions/ConfettiShower";

interface RewardInfo {
  coins: number;
  message: string;
  totalCoins: number;
  activityType: string;
}

export default function RealtimeCoinRewardPopup() {
  const pathname = usePathname();
  const router = useRouter();

  const [reward, setReward] = useState<RewardInfo | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [progress, setProgress] = useState(100);

  // References to prevent duplicate trigger during same session/mount
  const timerBrowseRef = useRef<NodeJS.Timeout | null>(null);
  const timerSpecsRef = useRef<NodeJS.Timeout | null>(null);
  const isClaimingRef = useRef(false);

  // Auto-dismiss countdown timer
  useEffect(() => {
    if (!reward) return;

    setProgress(100);
    const durationMs = 6000;
    const intervalMs = 100;
    const step = (intervalMs / durationMs) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(interval);
          setReward(null);
          return 0;
        }
        return prev - step;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [reward]);

  // Real-time tracking of product browsing
  useEffect(() => {
    if (!pathname) return;

    // Check if user is browsing real products:
    // e.g. /products/something (product detail page) or /category/something or /products (catalog)
    const isProductDetail = /\/products\/[^/]+/i.test(pathname);
    const isCatalog = pathname.includes("/products") || pathname.includes("/category/");

    if (!isProductDetail && !isCatalog) {
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const user = getEffectiveUser();
    if (!user) return; // Only claim automatically when user is logged in

    const uid = user.uid || user.firebase_uid || user.id || "guest";
    const browseKey = `stech_claimed_act_browse_${uid}_${today}`;
    const specsKey = `stech_claimed_act_specs_${uid}_${today}`;

    // Milestone 1: Browsing real products (Triggers after 4 seconds of genuine engagement)
    if (localStorage.getItem(browseKey) !== "true") {
      timerBrowseRef.current = setTimeout(async () => {
        if (isClaimingRef.current) return;
        isClaimingRef.current = true;

        try {
          const res = await claimActivityReward("browse_products");
          if (res.success && res.coins_earned > 0) {
            localStorage.setItem(browseKey, "true");
            playCelebrationFanfare();
            setShowConfetti(true);
            setReward({
              coins: res.coins_earned,
              message: res.message,
              totalCoins: res.total_coins,
              activityType: "browse_products",
            });

            // Update wallet cached data and dispatch live event
            updateCachedWallet({
              coins: res.total_coins,
              coins_usd_value: Number((res.total_coins / 100).toFixed(2)),
            });
            window.dispatchEvent(
              new CustomEvent("stech_wallet_updated", {
                detail: { coins: res.total_coins, coins_usd_value: Number((res.total_coins / 100).toFixed(2)) },
              })
            );
          } else if (res.already_claimed) {
            localStorage.setItem(browseKey, "true");
          }
        } catch (e) {
          // Graceful fallback
        } finally {
          isClaimingRef.current = false;
        }
      }, 4000); // 4 seconds of genuine product browsing
    }

    // Milestone 2: Detailed Specs Exploration (Triggers on product detail page after 11 seconds)
    if (isProductDetail && localStorage.getItem(specsKey) !== "true") {
      timerSpecsRef.current = setTimeout(async () => {
        if (isClaimingRef.current) return;
        isClaimingRef.current = true;

        try {
          const res = await claimActivityReward("explore_specs");
          if (res.success && res.coins_earned > 0) {
            localStorage.setItem(specsKey, "true");
            playCelebrationFanfare();
            setShowConfetti(true);
            setReward({
              coins: res.coins_earned,
              message: res.message,
              totalCoins: res.total_coins,
              activityType: "explore_specs",
            });

            updateCachedWallet({
              coins: res.total_coins,
              coins_usd_value: Number((res.total_coins / 100).toFixed(2)),
            });
            window.dispatchEvent(
              new CustomEvent("stech_wallet_updated", {
                detail: { coins: res.total_coins, coins_usd_value: Number((res.total_coins / 100).toFixed(2)) },
              })
            );
          } else if (res.already_claimed) {
            localStorage.setItem(specsKey, "true");
          }
        } catch (e) {
          // Graceful fallback
        } finally {
          isClaimingRef.current = false;
        }
      }, 11000); // 11 seconds of deep reading/specs exploration
    }

    return () => {
      if (timerBrowseRef.current) clearTimeout(timerBrowseRef.current);
      if (timerSpecsRef.current) clearTimeout(timerSpecsRef.current);
    };
  }, [pathname]);

  const handleClose = () => {
    setReward(null);
  };

  const handleGoToWallet = () => {
    setReward(null);
    router.push("/account/wallet");
  };

  return (
    <>
      {showConfetti && <ConfettiShower durationMs={5000} />}

      <AnimatePresence>
        {reward && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 25 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 25 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1c1917] via-[#12151e] to-[#0a0d14] text-white p-6 shadow-2xl border-2 border-amber-400/60 ring-4 ring-amber-400/20 overflow-hidden text-center"
            >
              {/* Background Glows */}
              <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border-none z-10"
              >
                <X size={16} />
              </button>

              {/* 3D Animated Gold Coin Graphic */}
              <div className="relative w-20 h-20 mx-auto mb-3 flex items-center justify-center">
                {/* Outer Pulsing Ring */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-amber-400/25 blur-md"
                />

                {/* Spinning Gold Coin */}
                <motion.div
                  animate={{ rotateY: [0, 180, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 p-1 shadow-xl shadow-amber-500/40 border-2 border-yellow-200 flex items-center justify-center"
                >
                  <div className="w-full h-full rounded-full border border-amber-600/40 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-600">
                    <Coins size={28} className="text-yellow-100 drop-shadow" />
                  </div>
                </motion.div>

                {/* Sparkle Icons */}
                <Sparkles size={16} className="absolute -top-1 -right-1 text-amber-300 animate-bounce" />
                <Sparkles size={14} className="absolute -bottom-1 -left-1 text-yellow-200 animate-pulse" />
              </div>

              {/* Big Coin Gain Callout */}
              <div className="inline-block px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black mb-1">
                +{reward.coins} S-Tech Coins Earned!
              </div>

              {/* Title & Description */}
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mt-1 mb-1.5">
                🎉 អបអរសាទរ! ទទួលបានកាក់!
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-4 max-w-xs mx-auto">
                {reward.activityType === "explore_specs"
                  ? "លោកអ្នកទទួលបានកាក់សម្រាប់ការពិនិត្យមើលលក្ខណៈបច្ចេកទេសទំនិញ!"
                  : "លោកអ្នកទទួលបានកាក់សម្រាប់ការចូលទស្សនា និងពិនិត្យមើលទំនិញពិតៗ!"}
              </p>

              {/* Total Balance Card */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-4 text-left flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    សមតុល្យកាក់សរុប (Total Coins):
                  </div>
                  <div className="text-lg font-black text-amber-400 font-mono">
                    {reward.totalCoins} Coins{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      (~${(reward.totalCoins / 100).toFixed(2)} USD)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 justify-end">
                    <CheckCircle2 size={12} />
                    <span>Real-Time</span>
                  </div>
                  <span className="text-[9px] text-gray-400">ស្វ័យប្រវត្តិ</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoToWallet}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-lg shadow-amber-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  <Wallet size={16} />
                  <span>មើលកាបូប & ប្តូរកាក់ជាលុយ (View Wallet)</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >
                  បន្តមើលទំនិញ (Continue Browsing)
                </button>
              </div>

              {/* Smooth Progress Countdown Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
