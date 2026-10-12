"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, QrCode, CreditCard, ArrowRight,
  Download, Copy, Check, ExternalLink, Loader2, Sparkles, AlertCircle
} from "lucide-react";
import { createTopupSession, confirmTopup, TopupSessionResponse } from "@/lib/services/wallet.service";
import { playCelebrationFanfare } from "@/lib/celebration-audio";
import ConfettiShower from "@/components/promotions/ConfettiShower";

interface WalletTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  initialAmount?: number;
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100, 200];

const BANK_CHANNELS = [
  {
    id: "bakong",
    name: "Bakong KHQR",
    sub: "All 36+ Cambodian Banks",
    badge: "NBC Universal",
    color: "from-red-600 to-rose-700",
  },
  {
    id: "aba",
    name: "ABA PAY",
    sub: "Direct Deeplink & QR",
    badge: "1-Tap Mobile",
    color: "from-[#004B87] to-blue-800",
  },
  {
    id: "wing",
    name: "Wing Bank",
    sub: "Wing App & KHQR",
    badge: "Fast Scan",
    color: "from-lime-600 to-green-700",
  },
  {
    id: "acleda",
    name: "ACLEDA ToanChet",
    sub: "ACLEDA Mobile QR",
    badge: "Instant Pay",
    color: "from-blue-700 to-cyan-800",
  },
  {
    id: "visa",
    name: "Card (Visa/Master)",
    sub: "Local & International",
    badge: "3D Secure",
    color: "from-indigo-600 to-purple-800",
  },
];

export default function WalletTopupModal({
  isOpen,
  onClose,
  onSuccess,
  initialAmount = 10,
}: WalletTopupModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("bakong");
  const [step, setStep] = useState<"select" | "qr" | "success">("select");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<TopupSessionResponse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const getEffectiveAmount = (): number => {
    if (customAmount && !isNaN(Number(customAmount)) && Number(customAmount) > 0) {
      return Number(customAmount);
    }
    return selectedAmount;
  };

  const handleGenerateQR = async () => {
    const amt = getEffectiveAmount();
    if (amt < 1) {
      setErrorMsg("ចំនួនទឹកប្រាក់អប្បបរមាគឺ $1.00 USD");
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await createTopupSession(amt, selectedChannel);
      setSession(res);
      setStep("qr");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "មិនអាចបង្កើតកូដទូទាត់បានទេ។ សូមព្យាយាមម្តងទៀត។");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!session) return;
    setConfirming(true);
    setErrorMsg(null);

    try {
      const res = await confirmTopup(session.deposit_id);
      playCelebrationFanfare();
      setShowConfetti(true);
      setStep("success");
      onSuccess(res.new_balance);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "ការផ្ទៀងផ្ទាត់មិនទាន់បានជោគជ័យឡើយ។");
    } finally {
      setConfirming(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setStep("select");
    setSession(null);
    setErrorMsg(null);
    setShowConfetti(false);
    onClose();
  };

  if (!isOpen) return null;

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
                  ទូទាត់តាម Bakong KHQR, ABA, Wing, ACLEDA ឬកាតធនាគារ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
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
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: Select Amount and Bank */}
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
                          ${amt}.00
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
                      min="1"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                      }}
                      placeholder="ឬបញ្ចូលចំនួនទឹកប្រាក់ផ្ទាល់ខ្លួន (e.g. 15.50)"
                      className="w-full pl-8 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Bank / Payment Channel Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-2">
                    ជ្រើសរើសធនាគារ ឬវិធីសាស្ត្រទូទាត់
                  </label>
                  <div className="space-y-2">
                    {BANK_CHANNELS.map((ch) => {
                      const isSelected = selectedChannel === ch.id;
                      return (
                        <div
                          key={ch.id}
                          onClick={() => setSelectedChannel(ch.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-white/10 border-red-500/80 shadow-md ring-1 ring-red-500/50"
                              : "bg-white/5 hover:bg-white/[0.08] border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${ch.color} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                              {ch.id === "bakong" ? "KHQR" : ch.id === "aba" ? "ABA" : ch.id === "wing" ? "WING" : ch.id === "acleda" ? "ACL" : "CARD"}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{ch.name}</span>
                                <span className="text-[10px] text-gray-400 font-normal">({ch.badge})</span>
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

                {/* Summary & Generate Button */}
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
                  onClick={handleGenerateQR}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-600 to-[#8B1A1A] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-red-950/60 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>កំពុងបង្កើត KHQR Code...</span>
                    </>
                  ) : (
                    <>
                      <span>បន្តទៅស្កេនទូទាត់ (Generate QR)</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2: KHQR Display & Confirmation */}
            {step === "qr" && session && (
              <div className="space-y-4 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                  <QrCode size={14} />
                  <span>ស្កេនទូទាត់តាម Bakong KHQR</span>
                </div>

                {/* Official EMVCo KHQR Visual Card */}
                <div className="max-w-xs mx-auto p-4 rounded-3xl bg-white text-gray-900 shadow-2xl border-4 border-red-700 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#E1251B] text-white font-black text-[11px] tracking-tight">
                        KHQR
                      </span>
                      <span className="text-[11px] font-black text-gray-800">
                        {session.merchant?.name || "ROTANA NOB"}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      {session.merchant?.bank || "ABA Bank"}
                    </span>
                  </div>

                  {/* QR Image with ABA badge */}
                  <div className="bg-gray-50 p-2.5 rounded-2xl flex items-center justify-center shadow-inner relative">
                    <img
                      src={session.qr_image_url}
                      alt="KHQR Deposit Code"
                      className="w-48 h-48 object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center border-2 border-red-600">
                        <div className="w-full h-full rounded-full bg-[#E1251B] flex items-center justify-center text-white text-[8px] font-black">
                          ABA
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bank Accounts */}
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

                  {/* Amount display */}
                  <div className="text-center pt-1 border-t">
                    <div className="text-lg font-black text-red-700 font-mono">
                      ${session.amount.toFixed(2)} USD
                    </div>
                    <div className="text-[11px] font-bold text-gray-500 font-mono">
                      ~ {session.amount_khr.toLocaleString()} KHR
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Ref: {session.deposit_id}
                    </div>
                  </div>
                </div>

                {/* Quick Deeplink Buttons */}
                <div className="space-y-2 pt-1">
                  {session.deeplinks?.universal && (
                    <a
                      href={session.deeplinks.universal}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-black flex items-center justify-center gap-1.5 no-underline transition-all shadow-md"
                    >
                      <ExternalLink size={14} />
                      <span>Open Banking App (1-Tap Pay)</span>
                    </a>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {session.deeplinks?.aba && (
                      <a
                        href={session.deeplinks?.universal || session.deeplinks.aba}
                        className="px-3 py-2 rounded-xl bg-[#004B87] hover:bg-blue-900 text-white text-[11px] font-bold flex items-center gap-1.5 no-underline transition-all shadow-sm"
                      >
                        <ExternalLink size={12} />
                        <span>Open ABA Mobile</span>
                      </a>
                    )}
                    {session.deeplinks?.bakong && (
                      <a
                        href={session.deeplinks?.universal || session.deeplinks.bakong}
                        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1.5 no-underline transition-all shadow-sm"
                      >
                        <ExternalLink size={12} />
                        <span>Open Bakong App</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(session.khqr_string)}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-[11px] font-bold flex items-center gap-1.5 transition-all border-none cursor-pointer"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied ? "បានចម្លង!" : "Copy KHQR"}</span>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={confirming}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-950/60 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
                  >
                    {confirming ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>កំពុងផ្ទៀងផ្ទាត់ការផ្ទេរប្រាក់...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>ខ្ញុំបានផ្ទេរប្រាក់រួចរាល់ (Verify & Confirm)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("select")}
                    className="w-full py-2.5 text-xs text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                  >
                    ← ត្រឡប់ក្រោយ ដើម្បីប្តូរចំនួនទឹកប្រាក់
                  </button>
                </div>
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
                    ទឹកប្រាក់ចំនួន <strong className="text-emerald-400">${getEffectiveAmount().toFixed(2)} USD</strong> ត្រូវបានបញ្ចូលទៅកាន់កាបូប S-Tech Wallet របស់អ្នករួចរាល់ហើយ។
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-xs mx-auto text-xs space-y-1.5">
                  <div className="flex justify-between text-gray-400">
                    <span>ប្រតិបត្តិការ:</span>
                    <span className="font-bold text-white">{session?.deposit_id}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>ស្ថានភាព:</span>
                    <span className="font-bold text-emerald-400">ជោគជ័យ (Completed)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
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
