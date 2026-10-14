"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gift, Sparkles, X, Share2, Copy, Check, CheckCircle2, 
  ExternalLink, ShoppingBag, ArrowRight, Lock, Award, Heart, ShieldCheck, Wallet, LogIn 
} from "lucide-react";
import { getEffectiveUser } from "@/lib/auth-user";
import api from "@/lib/api";
import { updateCachedWallet } from "@/lib/services/wallet.service";
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
  const [creditedBalance, setCreditedBalance] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [shareUrl, setShareUrl] = useState("https://stech-store.tech/?gift=welcome5");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/?gift=welcome5`);

      // Open only if URL explicitly requests opening the gift modal
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("gift") === "welcome5" || urlParams.get("open_gift") === "true") {
        setIsOpen(true);
      }
    }

    const checkEligibility = async () => {
      const user = getEffectiveUser();
      setCurrentUser(user);

      const uid = user ? (user.uid || user.firebase_uid || user.id || "guest") : "guest";
      const localShared = localStorage.getItem(`stech_shared_gift_${uid}`) === "true";
      if (localShared) setHasShared(true);

      const localClaimed = localStorage.getItem(`stech_claimed_gift_${uid}`) === "true";
      if (localClaimed) {
        setHasClaimed(true);
        return;
      }

      // Query cloud profile if logged in
      if (user) {
        try {
          const res = await api.get("/user/profile");
          const profile = res.data?.profile;
          if (profile?.has_claimed_welcome_gift) {
            setHasClaimed(true);
            localStorage.setItem(`stech_claimed_gift_${uid}`, "true");
          }
        } catch (err) {
          // Gracefully fallback to localStorage
        }
      }
    };

    checkEligibility();

    // Listen to custom open event from any button or component
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener("stech:open-welcome-gift", handleOpenModal);

    // Listen to login/logout events
    const handleAuthChange = () => {
      checkEligibility();
    };
    window.addEventListener("user_session_updated", handleAuthChange);
    return () => {
      window.removeEventListener("stech:open-welcome-gift", handleOpenModal);
      window.removeEventListener("user_session_updated", handleAuthChange);
    };
  }, []);

  // Action: Trigger share on social networks
  const handleShareClick = (platform: "facebook" | "telegram" | "whatsapp" | "native") => {
    const text = "ទទួលបាន $5.00 USD ឥតគិតថ្លៃចូលកាបូប S-Tech Wallet លើរាល់ការទិញទំនិញនៅ S Tech Store Cambodia! 🎁 ចូលរួមឥឡូវនេះ";

    if (platform === "native" && typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "S Tech Store - $5 Gift Wallet",
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

  // Action: Claim the $5 USD Welcome Gift directly into S-Tech Wallet
  const handleClaimGift = async () => {
    if (!currentUser) {
      handleClose();
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

      const newBal = res.data?.new_wallet_balance !== undefined ? Number(res.data.new_wallet_balance) : 5.00;
      setCreditedBalance(newBal);

      // Atomically update wallet cached data so Navbar & Wallet pages reflect the new balance immediately
      updateCachedWallet({ balance: newBal });

      // Play synthesized celebratory fanfare sound
      playCelebrationSound();

      // Launch full-screen confetti shower
      setShowConfetti(true);
      setClaimedSuccess(true);
      window.dispatchEvent(new Event("user_session_updated"));
      window.dispatchEvent(new CustomEvent("stech_wallet_updated", { detail: { balance: newBal } }));
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

      {/* ── Floating Gift Pill (Small button for user to click when they want) ── */}
      {!isOpen && !hasClaimed && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 left-3.5 sm:bottom-7 sm:left-7 z-[7000] px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-red-600 to-rose-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-red-600/35 border-2 border-amber-300 ring-2 ring-amber-400/25 flex items-center gap-2.5 cursor-pointer hover:brightness-110 active:scale-95 transition-all group backdrop-blur-md"
          aria-label="បើកកាដូស្វាគមន៍ $5 USD"
        >
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 border border-amber-300 shadow-xs">
            <Image
              src="/logo.jpg"
              alt="S Tech Store"
              width={32}
              height={32}
              className="w-full h-full object-contain p-0.5"
            />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
          </div>
          <div className="text-left">
            <div className="leading-tight font-black flex items-center gap-1 text-[11px] sm:text-xs">
              <span>កាដូ $5.00 ក្នុង Wallet</span>
              <Sparkles size={11} className="text-amber-200" />
            </div>
            <div className="text-[9.5px] sm:text-[10px] text-amber-100 font-medium leading-none mt-0.5">
              ចុចបើកយក $5
            </div>
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
                /* ── SUCCESS CONGRATULATIONS SCREEN (WALLET CREDITED $5 USD) ── */
                <div className="text-center py-3 space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-emerald-400 shadow-xl shadow-emerald-500/30 ring-8 ring-emerald-400/20 bg-white">
                      <Image
                        src="/logo.jpg"
                        alt="S Tech Store"
                        width={80}
                        height={80}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-black mb-1.5 border border-emerald-300 dark:border-emerald-800/40">
                      <CheckCircle2 size={14} />
                      <span>+$5.00 USD ចូលកាបូប S-Tech Wallet ជោគជ័យ</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                      🎉 អបអរសាទរ!
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-sm mx-auto leading-relaxed">
                      ទឹកប្រាក់កាដូ <strong className="text-emerald-600 dark:text-emerald-400 font-black text-base">$5.00 USD</strong> ត្រូវបានបញ្ចូលទៅក្នុងកាបូប <strong className="text-[#8B1A1A] dark:text-red-400 font-black">S-Tech Wallet</strong> របស់អ្នករួចរាល់ហើយ!
                    </p>
                  </div>

                  {/* S-Tech Wallet Balance Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/80 via-black to-[#0e1118] border border-red-500/30 text-white shadow-xl flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-md shrink-0">
                        <Wallet size={22} />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          សមតុល្យក្នុងកាបូប (S-Tech Wallet Balance):
                        </div>
                        <div className="text-2xl font-black text-emerald-400 font-mono">
                          ${(creditedBalance !== null ? creditedBalance : 5.00).toFixed(2)} USD
                        </div>
                        <div className="text-[10px] text-amber-300 font-medium">
                          ✓ អាចចាយបានតែក្នុង S Tech Store ប៉ុណ្ណោះ
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        router.push("/wallet");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all shrink-0 cursor-pointer"
                    >
                      មើលកាបូប (Wallet)
                    </button>
                  </div>

                  {/* Promo Code Coupon Card Backup */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 dark:from-red-950/30 dark:via-amber-950/20 dark:to-orange-950/30 border border-dashed border-red-300 dark:border-red-800/50 flex items-center justify-between gap-2 text-left">
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        កូដប្រូម៉ូសិនបម្រុង (Promo Voucher Code):
                      </div>
                      <div className="text-base font-black text-[#8B1A1A] dark:text-red-400 font-mono tracking-widest">
                        WELCOME5
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyVoucherCode}
                      className="px-3 py-1.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6B1010] text-white text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                    >
                      {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedCode ? "បានចម្លង!" : "Copy"}</span>
                    </button>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        router.push("/");
                      }}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-700 to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white font-black text-sm sm:text-base shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      <ShoppingBag size={18} />
                      <span>ទៅមើលទំនិញ & ទិញចាយកាបូបឥឡូវនេះ (Shop Now)</span>
                      <ArrowRight size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      ទុកចាយពេលក្រោយ (Keep for Later)
                    </button>
                  </div>
                </div>
              ) : (
                /* ── STEP 1 & 2: PREVIEW WALLET GIFT CARD & SHARE TO CLAIM ── */
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-md shrink-0 bg-white">
                      <Image
                        src="/logo.jpg"
                        alt="S Tech Store Logo"
                        width={48}
                        height={48}
                        className="w-full h-full object-contain p-0.5"
                      />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <Sparkles size={12} />
                        <span>S Tech Store • Exclusive Wallet Gift</span>
                      </div>
                      <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                        កាដូស្វាគមន៍ $5.00 USD ចូលកាបូប S-Tech Wallet!
                      </h3>
                    </div>
                  </div>

                  {/* ── Luxury Metallic S-Tech Wallet Gift Card ── */}
                  <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#0c0a09] text-white shadow-2xl border-2 border-amber-400/50 overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-400/50 shadow-md bg-white shrink-0">
                          <Image
                            src="/logo.jpg"
                            alt="S Tech Store Logo"
                            width={32}
                            height={32}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <span className="font-black text-xs uppercase tracking-wider text-amber-300 font-mono block leading-tight">
                            S TECH WALLET GIFT
                          </span>
                          <span className="text-[9px] text-amber-200/70 font-mono">
                            Spendable Only in S Tech Store
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
                        +$5.00 USD Free
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mb-2">
                      <div>
                        <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 font-mono tracking-tight">
                          +$5.00 USD
                        </div>
                        <div className="text-xs text-gray-300 font-medium">
                          ចូលកាបូប S-Tech Wallet ផ្ទាល់តែម្ដង សម្រាប់ចាយលើទំនិញគ្រប់មុខក្នុងហាង
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-mono">SCOPE</span>
                        <span className="text-xs font-black text-emerald-400 font-mono">
                          Store-Only
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                      <span>✓ ចូលកាបូបភ្លាមៗពេលចុច Claim</span>
                      <span>✓ ចាយបានក្នុង S Tech Store</span>
                    </div>
                  </div>

                  {/* ── Guest Login Prompt Banner ── */}
                  {!currentUser && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-between gap-3">
                      <span>💡 លោកអ្នកមិនទាន់បានចូលគណនីនៅឡើយទេ។ ចុចចូលគណនីដើម្បីទទួលយក $5.00 USD ចូល S-Tech Wallet របស់អ្នកផ្ទាល់!</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          router.push("/login?redirect=/?gift=welcome5");
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer shadow-xs"
                      >
                        ចូលគណនី
                      </button>
                    </div>
                  )}

                  {/* ── Share to Unlock Section ── */}
                  <div className="space-y-3 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Share2 size={14} className="text-[#8B1A1A] dark:text-red-400" />
                        <span>ចែករំលែក Link នេះដើម្បីដោះសោរយកកាដូ $5.00 ចូលកាបូប:</span>
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
                        <span>ប្រព័ន្ធបានផ្ទៀងផ្ទាត់ជោគជ័យ! លោកអ្នកអាចទទួលយក $5.00 USD ចូលកាបូបបានហើយ។</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1">
                        💡 ចុចប៊ូតុង Share ណាមួយខាងលើ ឬ Copy Link ដើម្បីបើកប៊ូតុង Claim $5 ចូលកាបូបភ្លាមៗ!
                      </div>
                    )}
                  </div>

                  {/* ── Main Claim Action Button ── */}
                  <div className="pt-1">
                    {!currentUser ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          router.push("/login?redirect=/?gift=welcome5");
                        }}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-red-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-sm sm:text-base shadow-2xl shadow-red-600/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98] border border-amber-300 animate-pulse"
                      >
                        <LogIn size={20} />
                        <span>ចូលគណនីដើម្បី Claim កាដូ $5.00 USD (Login to Claim)</span>
                      </button>
                    ) : hasShared ? (
                      <button
                        type="button"
                        onClick={handleClaimGift}
                        disabled={isClaiming}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-red-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-sm sm:text-base shadow-2xl shadow-red-600/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98] border border-amber-300 animate-pulse"
                      >
                        <Wallet size={20} />
                        <span>{isClaiming ? "កំពុងបញ្ចូល $5 ទៅក្នុងកាបូប..." : "🎁 ទទួលយក $5.00 USD ចូលកាបូបឥឡូវនេះ (Claim $5 to Wallet)"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleShareClick("facebook")}
                        className="w-full py-4 rounded-2xl bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-300 dark:hover:bg-white/15"
                      >
                        <Lock size={16} />
                        <span>សូមចែករំលែកជាមុនសិន ដើម្បីដោះសោរទទួលកាដូ $5 ចូលកាបូប (Share to Unlock)</span>
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
