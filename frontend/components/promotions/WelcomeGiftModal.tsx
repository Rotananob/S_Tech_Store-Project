"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gift, Sparkles, X, Share2, Copy, Check, CheckCircle2, 
  ExternalLink, ShoppingBag, ArrowRight, Lock, Award, Heart, ShieldCheck 
} from "lucide-react";
import { getEffectiveUser } from "@/lib/auth-user";
import api from "@/lib/api";
import { playCelebrationSound } from "@/lib/celebration-audio";
import ConfettiShower from "@/components/promotions/ConfettiShower";
import { useRouter } from "@/i18n/routing";

export default function WelcomeGiftModal() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedSuccess, setClaimedSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [shareUrl, setShareUrl] = useState("https://stech-store.tech/?gift=welcome5");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/?gift=welcome5`);
    }

    const checkEligibility = async () => {
      const user = getEffectiveUser();
      if (!user) return;
      setCurrentUser(user);

      const uid = user.uid || user.firebase_uid || user.id || "guest";
      const localShared = localStorage.getItem(`stech_shared_gift_${uid}`) === "true";
      if (localShared) setHasShared(true);

      const localClaimed = localStorage.getItem(`stech_claimed_gift_${uid}`) === "true";
      if (localClaimed) {
        setHasClaimed(true);
        return;
      }

      // Query cloud profile to check if already claimed
      try {
        const res = await api.get("/user/profile");
        const profile = res.data?.profile;
        if (profile?.has_claimed_welcome_gift) {
          setHasClaimed(true);
          localStorage.setItem(`stech_claimed_gift_${uid}`, "true");
        } else {
          // If not claimed yet, show the gift after 1.8 seconds on initial login/visit
          const hasDismissedThisSession = sessionStorage.getItem("stech_dismissed_gift_modal");
          if (!hasDismissedThisSession) {
            const timer = setTimeout(() => {
              setIsOpen(true);
            }, 1800);
            return () => clearTimeout(timer);
          }
        }
      } catch (err) {
        // Fallback: check localStorage
        if (!localClaimed) {
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 1800);
          return () => clearTimeout(timer);
        }
      }
    };

    checkEligibility();

    // Listen to login/logout events
    const handleAuthChange = () => {
      checkEligibility();
    };
    window.addEventListener("user_session_updated", handleAuthChange);
    return () => window.removeEventListener("user_session_updated", handleAuthChange);
  }, []);

  // Action: Trigger share on social networks
  const handleShareClick = (platform: "facebook" | "telegram" | "whatsapp" | "native") => {
    const text = "ទទួលបាន Voucher $5 ឥតគិតថ្លៃលើរាល់ការទិញទំនិញនៅ S Tech Store Cambodia! 🎁 ប្រើកូដ WELCOME5";

    if (platform === "native" && typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "S Tech Store - $5 Gift Voucher",
        text,
        url: shareUrl,
      }).then(() => {
        markAsShared();
      }).catch(() => {});
      return;
    }

    if (platform === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        "_blank",
        "width=600,height=500"
      );
    } else if (platform === "telegram") {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
        "_blank"
      );
    } else if (platform === "whatsapp") {
      window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + shareUrl)}`,
        "_blank"
      );
    }

    markAsShared();
  };

  const markAsShared = () => {
    setHasShared(true);
    if (currentUser) {
      const uid = currentUser.uid || currentUser.firebase_uid || currentUser.id || "guest";
      localStorage.setItem(`stech_shared_gift_${uid}`, "true");
    }
  };

  const handleCopyShareLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        markAsShared();
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleCopyVoucherCode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("WELCOME5").then(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      });
    }
  };

  // Action: Claim the $5 Welcome Gift
  const handleClaimGift = async () => {
    if (!currentUser) {
      router.push("/login?redirect=/?gift=welcome5");
      return;
    }
    if (!hasShared) return;

    setIsClaiming(true);
    try {
      const res = await api.post("/user/claim-welcome-gift");
      const uid = currentUser.uid || currentUser.firebase_uid || currentUser.id || "guest";
      localStorage.setItem(`stech_claimed_gift_${uid}`, "true");
      setHasClaimed(true);

      // Play synthesized celebratory fanfare sound
      playCelebrationSound();

      // Launch full-screen confetti shower
      setShowConfetti(true);
      setClaimedSuccess(true);
      window.dispatchEvent(new Event("user_session_updated"));
    } catch (err: any) {
      // Even if already claimed, show success view
      const uid = currentUser.uid || currentUser.firebase_uid || currentUser.id || "guest";
      localStorage.setItem(`stech_claimed_gift_${uid}`, "true");
      setHasClaimed(true);
      playCelebrationSound();
      setShowConfetti(true);
      setClaimedSuccess(true);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("stech_dismissed_gift_modal", "true");
  };

  // If user has claimed and modal is closed, don't show floating button
  if (hasClaimed && !isOpen) return null;

  return (
    <>
      {/* ── Full Screen Confetti Particle Shower ── */}
      {showConfetti && <ConfettiShower duration={7000} />}

      {/* ── Floating Gift Pill (when modal is closed but user hasn't claimed yet) ── */}
      {!isOpen && !hasClaimed && currentUser && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-red-600 to-rose-600 text-white font-black text-xs sm:text-sm shadow-2xl shadow-red-600/40 border-2 border-amber-300 ring-4 ring-amber-400/25 flex items-center gap-2.5 cursor-pointer animate-bounce hover:brightness-110 active:scale-95"
        >
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Gift size={16} className="text-white" />
          </div>
          <div className="text-left">
            <div className="leading-tight font-black">កាដូស្វាគមន៍ $5</div>
            <div className="text-[10px] text-amber-200 font-medium">ចុច Claim ឥឡូវនេះ!</div>
          </div>
        </motion.button>
      )}

      {/* ── Master Welcome Gift Modal ── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#151922] w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-gray-100 dark:border-white/10 my-auto overflow-hidden text-gray-900 dark:text-white"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
              >
                <X size={20} />
              </button>

              {claimedSuccess ? (
                /* ── SUCCESS CONGRATULATIONS SCREEN ── */
                <div className="text-center py-4 space-y-5">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-red-500 to-rose-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-red-500/30 ring-8 ring-amber-400/20 animate-pulse">
                    <Gift size={42} strokeWidth={2.5} />
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-black mb-2 border border-emerald-300 dark:border-emerald-800/40">
                      <CheckCircle2 size={14} />
                      <span>Claimed Successfully • ទទួលបានជោគជ័យ</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                      🎉 អបអរសាទរ!
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-sm mx-auto">
                      លោកអ្នកទទួលបាន <strong className="text-[#8B1A1A] dark:text-red-400 font-black">Voucher $5.00 OFF</strong> ឥតគិតថ្លៃសម្រាប់ទិញទំនិញគ្រប់មុខក្នុង S Tech Store!
                    </p>
                  </div>

                  {/* Promo Code Coupon Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 dark:from-red-950/30 dark:via-amber-950/20 dark:to-orange-950/30 border-2 border-dashed border-red-300 dark:border-red-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-left">
                      <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        កូដប្រូម៉ូសិនរបស់អ្នក (Your Voucher Code):
                      </div>
                      <div className="text-2xl font-black text-[#8B1A1A] dark:text-red-400 font-mono tracking-widest">
                        WELCOME5
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ បញ្ចុះ $5.00 ភ្លាមៗពេល Checkout
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyVoucherCode}
                      className="px-4 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6B1010] text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                    >
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCode ? "បានចម្លង!" : "ចម្លងកូដ (Copy)"}</span>
                    </button>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyVoucherCode();
                        handleClose();
                        router.push("/checkout");
                      }}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-700 to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white font-black text-sm sm:text-base shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      <ShoppingBag size={18} />
                      <span>យកកូដនេះទៅ Checkout ទិញឥឡូវនេះ</span>
                      <ArrowRight size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      ទុកប្រើពេលក្រោយ (Keep for Later)
                    </button>
                  </div>
                </div>
              ) : (
                /* ── STEP 1 & 2: PREVIEW CARD & SHARE TO CLAIM ── */
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                      <Gift size={24} />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <Sparkles size={12} />
                        <span>Exclusive Welcome Gift • សម្រាប់អតិថិជនថ្មី</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                        កាដូស្វាគមន៍ $5.00 Voucher ឥតគិតថ្លៃ!
                      </h3>
                    </div>
                  </div>

                  {/* ── Luxury Metallic Voucher Preview Card ── */}
                  <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#0c0a09] text-white shadow-2xl border-2 border-amber-400/50 overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-400 text-black flex items-center justify-center font-black text-xs">
                          S
                        </div>
                        <span className="font-black text-xs uppercase tracking-wider text-amber-300 font-mono">
                          S TECH STORE CAMBODIA
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black">
                        100% Genuine
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mb-2">
                      <div>
                        <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 font-mono tracking-tight">
                          $5.00 OFF
                        </div>
                        <div className="text-xs text-gray-300 font-medium">
                          សម្រាប់ទិញកុំព្យូទ័រ, គ្រឿងបន្លាស់ និងសម្ភារ IT គ្រប់ប្រភេទ
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-mono">VOUCHER CODE</span>
                        <span className="text-sm font-black text-amber-400 font-mono tracking-wider">
                          WELCOME5
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                      <span>✓ ប្រើបានភ្លាមៗក្នុង Website</span>
                      <span>✓ គ្មានលក្ខខណ្ឌស្មុគស្មាញ</span>
                    </div>
                  </div>

                  {/* ── Share to Unlock Section ── */}
                  <div className="space-y-3 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Share2 size={14} className="text-[#8B1A1A] dark:text-red-400" />
                        <span>ចែករំលែក Link នេះដើម្បីដោះសោរយកកាដូ $5:</span>
                      </div>
                      {hasShared && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          <span>រួចរាល់!</span>
                        </span>
                      )}
                    </div>

                    {/* Copy Share Link Input Bar */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#12151e] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-600 dark:text-gray-300 outline-none select-all truncate"
                      />
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="px-3.5 py-2 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>{copiedLink ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    {/* 1-Click Social Share Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleShareClick("facebook")}
                        className="py-2.5 px-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>📘 Facebook</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareClick("telegram")}
                        className="py-2.5 px-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>✈️ Telegram</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareClick("whatsapp")}
                        className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>💬 WhatsApp</span>
                      </button>
                    </div>

                    {hasShared ? (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 pt-1">
                        <CheckCircle2 size={13} />
                        <span>ប្រព័ន្ធបានផ្ទៀងផ្ទាត់ការចែករំលែកជោគជ័យ! លោកអ្នកអាចទទួលយកកាដូ $5 បានហើយ។</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1">
                        💡 ចុចប៊ូតុង Share ណាមួយខាងលើ ឬ Copy Link ដើម្បីបើកប៊ូតុង Claim $5 ភ្លាមៗ!
                      </div>
                    )}
                  </div>

                  {/* ── Main Claim Action Button ── */}
                  <div className="pt-2">
                    {hasShared ? (
                      <button
                        type="button"
                        onClick={handleClaimGift}
                        disabled={isClaiming}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-red-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-sm sm:text-base shadow-2xl shadow-red-600/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98] border border-amber-300 animate-pulse"
                      >
                        <Gift size={20} />
                        <span>{isClaiming ? "កំពុងដំណើរការ..." : "🎁 ទទួលយកកាដូ $5 ឥឡូវនេះ (Claim $5 Now)"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleShareClick("facebook")}
                        className="w-full py-4 rounded-2xl bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-300 dark:hover:bg-white/15"
                      >
                        <Lock size={16} />
                        <span>សូមចែករំលែកជាមុនសិន ដើម្បីដោះសោរទទួលកាដូ $5 (Share to Unlock)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
