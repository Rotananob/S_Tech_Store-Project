"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, QrCode, CreditCard, ArrowRight,
  Download, Copy, Check, ExternalLink, Loader2, Sparkles, AlertCircle,
  Clock, RefreshCw, ShieldCheck, Lock, ChevronLeft, Eye, EyeOff
} from "lucide-react";
import {
  createTopupSession,
  confirmTopup,
  processCardTopup,
  TopupSessionResponse
} from "@/lib/services/wallet.service";
import { playCelebrationFanfare } from "@/lib/celebration-audio";
import ConfettiShower from "@/components/promotions/ConfettiShower";

interface WalletTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  initialAmount?: number;
}

interface SuccessReceipt {
  amount: number;
  deposit_id: string;
  method: string;
}

const STORAGE_KEY = "stech_pending_wallet_topup";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes validity
const MAX_VERIFY_ATTEMPTS = 5; // Max 5 verification attempts per generated QR to protect Bakong Open API
const PRESET_AMOUNTS = [0.01, 5, 10, 20, 50, 100];

// Only keep Bakong KHQR, ABA PAY, and Credit / Debit Card (Wing & ACLEDA removed per user request)
const BANK_CHANNELS = [
  {
    id: "bakong",
    name: "Bakong KHQR",
    sub: "All 36+ Cambodian Banks (ABA, Wing, ACLEDA, Canadia...)",
    badge: "NBC National Standard",
    color: "from-[#E1232E] to-[#B01720]",
    iconText: "KHQR",
  },
  {
    id: "aba",
    name: "ABA PAY",
    sub: "Direct Deeplink & QR (ABA Mobile App)",
    badge: "1-Tap ABA Mobile",
    color: "from-[#004B87] to-[#002D5A]",
    iconText: "ABA",
  },
  {
    id: "card",
    name: "Credit / Debit Card",
    sub: "Visa, Mastercard, JCB, UnionPay",
    badge: "3D Secure 2.0",
    color: "from-indigo-600 to-purple-800",
    iconText: "CARD",
  },
];

// Helper to detect card brand
function detectCardBrand(num: string): "visa" | "mastercard" | "jcb" | "amex" | "unionpay" | "card" {
  const clean = num.replace(/\D/g, "");
  if (/^4/.test(clean)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "mastercard";
  if (/^35(2[89]|[3-8][0-9])/.test(clean)) return "jcb";
  if (/^3[47]/.test(clean)) return "amex";
  if (/^62/.test(clean)) return "unionpay";
  return "card";
}

// Luhn Algorithm validation on client
function validateLuhn(num: string): boolean {
  const clean = num.replace(/\D/g, "");
  if (clean.length < 13 || clean.length > 19) return false;
  let sum = 0;
  let flag = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (flag) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    flag = !flag;
  }
  return sum % 10 === 0;
}

export default function WalletTopupModal({
  isOpen,
  onClose,
  onSuccess,
  initialAmount = 10,
}: WalletTopupModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("bakong");
  const [step, setStep] = useState<"select" | "qr" | "card_form" | "success">("select");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<TopupSessionResponse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [checkAttempts, setCheckAttempts] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60);
  const [savingImage, setSavingImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<SuccessReceipt | null>(null);

  // Card form states
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [showCvv, setShowCvv] = useState(false);
  const [cardSubmitting, setCardSubmitting] = useState(false);

  // Restore pending session from localStorage on open / refresh / tab-switch (Never reload!)
  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const now = Date.now();
          if (parsed?.expiresAt && parsed.expiresAt > now && parsed.session) {
            setSession(parsed.session);
            setSelectedChannel(parsed.channel || "bakong");
            setStep("qr");
            setCheckAttempts(parsed.checkAttempts || 0);
            setTimeLeft(Math.max(0, Math.floor((parsed.expiresAt - now) / 1000)));
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [isOpen]);

  // Real-time 30-minute expiration countdown (No auto-polling to save API limits!)
  useEffect(() => {
    if (step !== "qr" || !session) return;
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const rem = Math.max(0, Math.floor((parsed.expiresAt - Date.now()) / 1000));
          setTimeLeft(rem);
          if (rem <= 0) {
            localStorage.removeItem(STORAGE_KEY);
            setErrorMsg("កូដទូទាត់នេះផុតកំណត់រយៈពេល 30 នាទីហើយ។ សូមចុច 'បង្កើតកូដថ្មី'។");
          }
        }
      } catch (e) {}
    }, 1000);
    return () => clearInterval(interval);
  }, [step, session]);

  const getEffectiveAmount = (): number => {
    if (customAmount && !isNaN(Number(customAmount)) && Number(customAmount) > 0) {
      return Number(customAmount);
    }
    return selectedAmount;
  };

  const handleProceedFromSelect = async () => {
    const amt = getEffectiveAmount();
    if (amt < 0.01) {
      setErrorMsg("ចំនួនទឹកប្រាក់អប្បបរមាគឺ $0.01 USD");
      return;
    }
    setErrorMsg(null);

    // If card payment selected, navigate to world-class card checkout form
    if (selectedChannel === "card") {
      setStep("card_form");
      return;
    }

    // Otherwise generate Bank KHQR / ABA session
    setLoading(true);
    try {
      const res = await createTopupSession(amt, selectedChannel);
      setSession(res);
      setStep("qr");
      setCheckAttempts(0);
      const now = Date.now();
      const expiresAt = now + SESSION_TTL_MS;
      setTimeLeft(30 * 60);

      // Persist in localStorage so switching to mobile banking app or switching tabs NEVER reloads/resets!
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          session: res,
          channel: selectedChannel,
          createdAt: now,
          expiresAt,
          checkAttempts: 0,
        })
      );
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "មិនអាចបង្កើតកូដទូទាត់បានទេ។ សូមព្យាយាមម្តងទៀត។");
    } finally {
      setLoading(false);
    }
  };

  // Card Payment Submit Handler
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNum = cardNumber.replace(/\D/g, "");
    if (cleanNum.length < 13 || cleanNum.length > 19) {
      setErrorMsg("លេខកាតត្រូវតែមានចន្លោះពី 13 ដល់ 19 ខ្ទង់");
      return;
    }

    if (!validateLuhn(cleanNum)) {
      setErrorMsg("លេខកាតមិនត្រឹមត្រូវតាមស្ដង់ដារអន្តរជាតិឡើយ (Invalid Card Number)");
      return;
    }

    if (!cardholderName.trim()) {
      setErrorMsg("សូមបញ្ចូលឈ្មោះម្ចាស់កាត (Cardholder Name)");
      return;
    }

    const [expM, expY] = cardExpiry.split("/");
    if (!expM || !expY || Number(expM) < 1 || Number(expM) > 12) {
      setErrorMsg("កាលបរិច្ឆេទផុតកំណត់មិនត្រឹមត្រូវទេ (ទម្រង់: MM/YY)");
      return;
    }

    const cleanCvv = cardCvv.replace(/\D/g, "");
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      setErrorMsg("លេខសម្ងាត់ CVV/CVC ត្រូវតែមាន 3 ឬ 4 ខ្ទង់");
      return;
    }

    setCardSubmitting(true);
    try {
      const res = await processCardTopup({
        amount: getEffectiveAmount(),
        card_number: cleanNum,
        cardholder_name: cardholderName.trim(),
        exp_month: expM,
        exp_year: expY,
        cvv: cleanCvv,
      });

      playCelebrationFanfare();
      setShowConfetti(true);
      setSuccessReceipt({
        amount: res.amount_added,
        deposit_id: res.deposit_id,
        method: `${res.card_brand} (${res.masked_card})`,
      });
      setStep("success");
      onSuccess(res.new_balance);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "ការកាត់ប្រាក់តាមកាតមិនជោគជ័យទេ។ សូមពិនិត្យព័ត៌មានកាតឡើងវិញ។");
    } finally {
      setCardSubmitting(false);
    }
  };

  // Manual payment verification (Strictly limited to 5 clicks max per QR code)
  const handleConfirmPayment = async () => {
    if (!session) return;

    if (checkAttempts >= MAX_VERIFY_ATTEMPTS) {
      setErrorMsg("លោកអ្នកបានចុចផ្ទៀងផ្ទាត់គ្រប់ចំនួនកំណត់ 5 ដងរួចហើយ។ ដើម្បីការពារការ spam ទៅកាន់ប្រព័ន្ធធនាគារ សូមរង់ចាំបន្តិច ឬបង្កើតកូដថ្មី។");
      return;
    }

    const nextAttempts = checkAttempts + 1;
    setCheckAttempts(nextAttempts);

    // Persist attempt count in localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.checkAttempts = nextAttempts;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {}

    setConfirming(true);
    setErrorMsg(null);

    try {
      const res = await confirmTopup(session.deposit_id);
      playCelebrationFanfare();
      setShowConfetti(true);
      setSuccessReceipt({
        amount: session.amount,
        deposit_id: session.deposit_id,
        method: selectedChannel === "aba" ? "ABA PAY" : "Bakong KHQR (All Banks)",
      });
      setStep("success");
      localStorage.removeItem(STORAGE_KEY);
      onSuccess(res.new_balance);
    } catch (err: any) {
      const remaining = MAX_VERIFY_ATTEMPTS - nextAttempts;
      const errMsg = err.response?.data?.message || "មិនទាន់រកឃើញប្រតិបត្តិការផ្ទេរប្រាក់ពីធនាគារ Bakong នៅឡើយទេ (Awaiting Real Bank Payment)។ សូមពិនិត្យមើលកម្មវិធីធនាគាររបស់អ្នក ឬស្កេនទូទាត់ឱ្យបានជោគជ័យជាមុនសិន។";
      setErrorMsg(`${errMsg} (នៅសល់ ${remaining} ដងក្នុងការផ្ទៀងផ្ទាត់)`);
    } finally {
      setConfirming(false);
    }
  };

  // Save QR Code Image directly to device
  const handleSaveQRImage = async () => {
    if (!session?.qr_image_url) return;
    setSavingImage(true);
    try {
      const resp = await fetch(session.qr_image_url);
      const blob = await resp.blob();
      const fileName = `${selectedChannel === "aba" ? "ABA-PAY" : "KHQR"}-${session.deposit_id}.png`;

      // If Mobile Web Share API with files is supported (e.g. iOS Safari / Android Chrome)
      if (navigator.canShare && typeof File !== "undefined") {
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `S-Tech ${selectedChannel === "aba" ? "ABA PAY" : "KHQR"} $${session.amount.toFixed(2)}`,
            text: `ស្កេនទូទាត់ ${selectedChannel === "aba" ? "ABA PAY" : "Bakong KHQR"} $${session.amount.toFixed(2)} USD`,
          });
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
          return;
        }
      }

      // Standard browser download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      // Fallback: Open in new tab
      window.open(session.qr_image_url, "_blank");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSavingImage(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNewTopup = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStep("select");
    setSession(null);
    setErrorMsg(null);
    setCheckAttempts(0);
    setTimeLeft(30 * 60);
    setCardNumber("");
    setCardholderName("");
    setCardExpiry("");
    setCardCvv("");
  };

  const handleClose = () => {
    // Preserve pending session in localStorage so returning within 30 mins restores it
    setErrorMsg(null);
    setShowConfetti(false);
    onClose();
  };

  const formatTimeLeft = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Card formatting helpers
  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 19);
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.substring(i, i + 4));
    }
    setCardNumber(parts.join(" "));
  };

  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 2) {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setCardExpiry(clean);
    }
  };

  if (!isOpen) return null;

  const currentBrand = detectCardBrand(cardNumber);
  const universalDeeplink = session?.deeplinks?.universal || (session?.khqr_string ? `https://bakong-deeplink.nbc.gov.kh/bakong/payment?qr=${encodeURIComponent(session.khqr_string)}` : "#");
  const isAbaChannel = selectedChannel === "aba";

  return (
    <>
      {showConfetti && <ConfettiShower durationMs={6000} />}

      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#0e1118] text-white rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/60 via-black to-[#0e1118] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center shadow-lg shadow-red-950/50">
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>បញ្ចូលទឹកប្រាក់ទៅកាន់ S-Tech Wallet</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    Real Money
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  {step === "card_form"
                    ? "Credit & Debit Card Checkout (Visa • Mastercard • JCB)"
                    : isAbaChannel
                    ? "ABA PAY • 1-Tap Mobile Deeplink & QR"
                    : "Bakong KHQR • ស្កេនបានគ្រប់ 36+ ធនាគារក្នុងប្រទេសកម្ពុជា"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border-none"
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: Select Amount and Payment Channel */}
            {step === "select" && (
              <div className="space-y-5">
                {/* Amount Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-2">
                    ជ្រើសរើសចំនួនទឹកប្រាក់ (USD)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = selectedAmount === amt && !customAmount;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setSelectedAmount(amt);
                            setCustomAmount("");
                          }}
                          className={`py-3 px-3 rounded-2xl font-black text-sm transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white border-red-500 shadow-lg shadow-red-950/50 scale-[1.02]"
                              : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                          }`}
                        >
                          {amt < 1 ? `$${amt.toFixed(2)}` : `$${amt}.00`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amount Input */}
                  <div className="mt-3 relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                      }}
                      placeholder="ឬបញ្ចូលចំនួនទឹកប្រាក់ផ្ទាល់ខ្លួន (e.g. 0.01 ឬ 15.50)"
                      className="w-full pl-8 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Bank / Payment Channel Selection (Only KHQR, ABA, and Card) */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-2">
                    ជ្រើសរើសវិធីសាស្ត្រទូទាត់ (Payment Method)
                  </label>
                  <div className="space-y-2.5">
                    {BANK_CHANNELS.map((ch) => {
                      const isSelected = selectedChannel === ch.id;
                      return (
                        <div
                          key={ch.id}
                          onClick={() => setSelectedChannel(ch.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-white/10 border-red-500/80 shadow-md ring-1 ring-red-500/50"
                              : "bg-white/5 hover:bg-white/[0.08] border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${ch.color} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                              {ch.iconText}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{ch.name}</span>
                                <span className="text-[10px] text-amber-400/90 font-medium">({ch.badge})</span>
                              </div>
                              <p className="text-[11px] text-gray-400">{ch.sub}</p>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected ? "border-red-500 bg-red-600 text-white" : "border-gray-600"
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary & Proceed Button */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-400">សរុបទឹកប្រាក់ត្រូវបញ្ចូល:</span>
                    <div className="text-base font-black text-emerald-400">
                      ${getEffectiveAmount().toFixed(2)} USD
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-gray-400">ប្រាក់រៀលប្រហែល:</span>
                    <div className="text-xs font-bold text-amber-400">
                      ~ {Math.round(getEffectiveAmount() * 4060).toLocaleString()} KHR
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedFromSelect}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-600 to-[#8B1A1A] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-red-950/60 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>កំពុងរៀបចំប្រព័ន្ធទូទាត់...</span>
                    </>
                  ) : selectedChannel === "card" ? (
                    <>
                      <span>បន្តទៅបញ្ចូលព័ត៌មានកាត (Enter Card Details)</span>
                      <ArrowRight size={16} />
                    </>
                  ) : (
                    <>
                      <span>បន្តទៅស្កេនទូទាត់ (Generate {selectedChannel === "aba" ? "ABA QR" : "KHQR"})</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2A: KHQR / ABA Display & Confirmation */}
            {step === "qr" && session && (
              <div className="space-y-4 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                  <QrCode size={14} />
                  <span>
                    {isAbaChannel
                      ? "ABA PAY • 1-Tap Mobile App & QR"
                      : "ស្កេនទូទាត់បានគ្រប់ធនាគារ (Bakong KHQR • All Banks)"}
                  </span>
                </div>

                {/* STANDARDIZED NATIONAL KHQR / ABA STAND-STYLE CARD */}
                <div className={`max-w-xs mx-auto rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden border-4 ${
                  isAbaChannel ? "border-[#004B87]" : "border-[#E1232E]"
                }`}>
                  {/* National Standard Header */}
                  <div className={`px-4 py-3 flex items-center justify-between text-white ${
                    isAbaChannel
                      ? "bg-gradient-to-r from-[#004B87] via-[#003B6D] to-[#002D5A]"
                      : "bg-gradient-to-r from-[#E1232E] to-[#B01720]"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-black text-xs tracking-tight ${
                        isAbaChannel ? "bg-white text-[#004B87]" : "bg-white text-[#E1232E]"
                      }`}>
                        {isAbaChannel ? "ABA PAY" : "KHQR"}
                      </span>
                      <span className="text-[11px] font-bold tracking-wide uppercase opacity-95">
                        {isAbaChannel ? "ABA Bank" : "Bakong National QR"}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                      {isAbaChannel ? "Instant ABA P2P" : "All 36+ Banks"}
                    </span>
                  </div>

                  {/* Merchant Details Bar */}
                  <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between text-left">
                    <div>
                      <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Merchant</div>
                      <div className="text-xs font-black text-gray-800">
                        {session.merchant?.name || "ROTANA NOB"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Currency</div>
                      <div className="text-xs font-bold text-gray-800">USD & KHR</div>
                    </div>
                  </div>

                  {/* QR Image with centered emblem */}
                  <div className="p-3 bg-white flex items-center justify-center relative">
                    <div className="p-2 bg-gray-50 rounded-2xl border shadow-inner flex items-center justify-center relative">
                      <img
                        src={session.qr_image_url}
                        alt="Deposit QR Code"
                        className="w-48 h-48 object-contain rounded-lg"
                      />
                      {/* Centered Emblem Logo */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`w-9 h-9 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center border-2 ${
                          isAbaChannel ? "border-[#004B87]" : "border-[#E1232E]"
                        }`}>
                          <div className={`w-full h-full rounded-full flex items-center justify-center text-white text-[8px] font-black tracking-tighter ${
                            isAbaChannel ? "bg-[#004B87]" : "bg-[#E1232E]"
                          }`}>
                            {isAbaChannel ? "ABA" : "KHQR"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dual Bank Accounts Info */}
                  <div className="px-3 pb-2">
                    <div className="grid grid-cols-2 gap-1.5 text-left bg-gray-50 p-2 rounded-xl text-[10px] border">
                      <div>
                        <span className="text-gray-400">៛ KHR acc:</span>
                        <div className="font-mono font-bold text-gray-800">{session.merchant?.khr_account || "006 822 995"}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">$ USD acc:</span>
                        <div className="font-mono font-bold text-gray-800">{session.merchant?.usd_account || "014 579 634"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Amount display (Locked Amount) */}
                  <div className="px-4 py-2.5 bg-gray-50 border-t text-center">
                    <div className={`text-xl font-black font-mono ${
                      isAbaChannel ? "text-[#004B87]" : "text-red-700"
                    }`}>
                      ${session.amount.toFixed(2)} USD
                    </div>
                    <div className="text-[11px] font-bold text-gray-500 font-mono">
                      ~ {session.amount_khr.toLocaleString()} KHR
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5 font-mono">
                      Ref: {session.deposit_id}
                    </div>
                  </div>
                </div>

                {/* Quick Action & Deeplink Buttons */}
                <div className="space-y-2 pt-1 max-w-xs mx-auto">
                  {/* Direct Mobile Deeplink: Never reloads the page on return! */}
                  <a
                    href={universalDeeplink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2.5 px-3 rounded-xl hover:brightness-110 text-white text-xs font-black flex items-center justify-center gap-2 no-underline transition-all shadow-md ${
                      isAbaChannel
                        ? "bg-gradient-to-r from-[#004B87] to-blue-700 shadow-blue-950/50"
                        : "bg-gradient-to-r from-red-600 to-rose-600 shadow-red-950/50"
                    }`}
                  >
                    <ExternalLink size={14} />
                    <span>
                      {isAbaChannel
                        ? "បើក ABA Mobile (1-Tap Pay)"
                        : "បើកកម្មវិធីធនាគារ (Open Banking App • 1-Tap Pay)"}
                    </span>
                  </a>

                  {/* Save QR Image & Copy KHQR Code */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveQRImage}
                      disabled={savingImage}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border border-white/15 cursor-pointer disabled:opacity-50"
                    >
                      {savingImage ? (
                        <Loader2 size={13} className="animate-spin text-amber-400" />
                      ) : saveSuccess ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Download size={13} />
                      )}
                      <span>{saveSuccess ? "បានរក្សាទុក QR!" : "Save Image QR"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(session.khqr_string)}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border border-white/15 cursor-pointer"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copied ? "បានចម្លង!" : "Copy KHQR"}</span>
                    </button>
                  </div>
                </div>

                {/* Verification Quota & Action Controls */}
                <div className="space-y-2 pt-2 max-w-xs mx-auto">
                  {/* Countdown Timer & 5-Attempt Limit Indicator */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-[11px]">
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Clock size={13} className="text-amber-400" />
                      <span>សុពលភាព៖</span>
                      <span className="font-mono font-bold text-amber-400">{formatTimeLeft(timeLeft)} នាទី</span>
                    </div>
                    <div className="text-gray-400">
                      <span>នៅសល់ </span>
                      <strong className={checkAttempts >= MAX_VERIFY_ATTEMPTS ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                        {Math.max(0, MAX_VERIFY_ATTEMPTS - checkAttempts)}/{MAX_VERIFY_ATTEMPTS}
                      </strong>
                      <span> ដងឆែក</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={confirming || checkAttempts >= MAX_VERIFY_ATTEMPTS || timeLeft <= 0}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-950/60 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {confirming ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>កំពុងផ្ទៀងផ្ទាត់ការផ្ទេរប្រាក់...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>
                          {checkAttempts >= MAX_VERIFY_ATTEMPTS
                            ? "អស់ចំនួនដងឆែក (Max 5 Checks Reached)"
                            : "ខ្ញុំបានផ្ទេរប្រាក់រួចរាល់ (Verify & Confirm)"}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNewTopup}
                    className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    <span>បង្កើតកូដថ្មី ឬប្តូរចំនួនទឹកប្រាក់ (New Topup)</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2B: World-Class Credit / Debit Card Checkout */}
            {step === "card_form" && (
              <div className="space-y-4">
                {/* Back to Amount Selection */}
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
                >
                  <ChevronLeft size={14} />
                  <span>ត្រឡប់ទៅជ្រើសរើសចំនួនទឹកប្រាក់ (Back)</span>
                </button>

                {/* VIRTUAL CREDIT / DEBIT CARD PREVIEW */}
                <div className="relative w-full aspect-[1.586/1] max-w-[360px] mx-auto rounded-2xl p-5 shadow-2xl overflow-hidden border border-white/20 bg-gradient-to-br from-[#1a1f36] via-[#111424] to-[#0a0d18] flex flex-col justify-between">
                  {/* Background Accents */}
                  <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-indigo-500/20 to-purple-500/0 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-rose-500/15 to-transparent rounded-full blur-2xl pointer-events-none" />

                  {/* Top Row: Chip + Contactless + Card Brand Logo */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      {/* EMV Smart Chip */}
                      <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-200 shadow border border-yellow-500/40 relative overflow-hidden flex items-center justify-center">
                        <div className="w-full h-full border border-amber-600/30 rounded flex items-center justify-center">
                          <div className="w-5 h-3 border border-amber-700/30 rounded-sm"></div>
                        </div>
                      </div>
                      {/* Contactless Waves Icon */}
                      <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8.5 10a4 4 0 0 1 0 4" />
                        <path d="M12 7a8 8 0 0 1 0 10" />
                        <path d="M15.5 4a12 12 0 0 1 0 16" />
                      </svg>
                    </div>

                    {/* Brand Logo Display */}
                    <div className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/15">
                      <span className="font-black text-xs tracking-wider text-white uppercase">
                        {currentBrand === "visa"
                          ? "VISA"
                          : currentBrand === "mastercard"
                          ? "Mastercard"
                          : currentBrand === "jcb"
                          ? "JCB"
                          : currentBrand === "amex"
                          ? "AMEX"
                          : currentBrand === "unionpay"
                          ? "UnionPay"
                          : "CARD"}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Formatted Card Number */}
                  <div className="relative z-10 py-1">
                    <div className="font-mono text-base sm:text-lg font-bold tracking-widest text-white/95">
                      {cardNumber ? cardNumber : "•••• •••• •••• ••••"}
                    </div>
                  </div>

                  {/* Bottom Row: Cardholder + Expiry */}
                  <div className="flex items-end justify-between relative z-10 pt-1">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-white/50 font-medium">Cardholder</div>
                      <div className="font-mono text-xs font-bold text-white uppercase tracking-wider truncate max-w-[170px]">
                        {cardholderName || "YOUR NAME"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wider text-white/50 font-medium">Expires</div>
                      <div className="font-mono text-xs font-bold text-white tracking-widest">
                        {cardExpiry || "MM/YY"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD PAYMENT FORM */}
                <form onSubmit={handleCardSubmit} className="space-y-3.5">
                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      ឈ្មោះម្ចាស់កាត (Cardholder Name)
                    </label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                      placeholder="e.g. ROTANA NOB"
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white uppercase placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      លេខកាត (Card Number)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={23}
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        placeholder="4242 •••• •••• ••••"
                        className="w-full pl-3.5 pr-14 py-2.5 bg-white/5 border border-white/10 rounded-2xl font-mono text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 tracking-wider"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
                        {currentBrand}
                      </span>
                    </div>
                  </div>

                  {/* Expiry & CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">
                        កាលបរិច្ឆេទ (MM/YY)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        placeholder="12/28"
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-2xl font-mono text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-center tracking-wider"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center justify-between">
                        <span>CVV / CVC</span>
                        <span className="text-[10px] text-gray-400">3-4 ខ្ទង់</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCvv ? "text" : "password"}
                          required
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                          placeholder="•••"
                          className="w-full pl-3.5 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-2xl font-mono text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-center tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCvv(!showCvv)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white bg-transparent border-none cursor-pointer p-0"
                        >
                          {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Security Certifications */}
                  <div className="grid grid-cols-3 gap-2 py-1 text-[10px] text-gray-400 text-center">
                    <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-1">
                      <Lock size={11} className="text-emerald-400" />
                      <span>256-Bit SSL</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-1">
                      <ShieldCheck size={11} className="text-indigo-400" />
                      <span>PCI-DSS Level 1</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-1">
                      <Sparkles size={11} className="text-amber-400" />
                      <span>3D Secure 2.0</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={cardSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-indigo-950/60 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
                  >
                    {cardSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>កំពុងកាត់ប្រាក់តាមកាត & បញ្ចូលទឹកប្រាក់...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={15} />
                        <span>បង់ប្រាក់ & បញ្ចូល ${getEffectiveAmount().toFixed(2)} USD ឥឡូវនេះ</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 3: Success Screen */}
            {step === "success" && (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white">
                    បញ្ចូលទឹកប្រាក់ជោគជ័យ 100%! 🎉
                  </h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    ទឹកប្រាក់ចំនួន <strong className="text-emerald-400">${(successReceipt?.amount || getEffectiveAmount()).toFixed(2)} USD</strong> ត្រូវបានបញ្ចូលទៅកាន់កាបូប S-Tech Wallet របស់អ្នករួចរាល់ហើយ។
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-xs mx-auto text-xs space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>ប្រតិបត្តិការ:</span>
                    <span className="font-mono font-bold text-white text-[11px]">{successReceipt?.deposit_id || session?.deposit_id}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>វិធីសាស្ត្រ:</span>
                    <span className="font-bold text-white text-[11px]">{successReceipt?.method || selectedChannel.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>ស្ថានភាព:</span>
                    <span className="font-bold text-emerald-400">ជោគជ័យ (Completed)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-red-950/60 hover:brightness-110 transition-all border-none cursor-pointer"
                >
                  រួចរាល់ (Done)
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
