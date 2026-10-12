"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Sparkles, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { convertCoinsToUSD } from "@/lib/services/wallet.service";
import { playCelebrationFanfare } from "@/lib/celebration-audio";

interface ConvertCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoins: number;
  onSuccess: (newBalance: number, remainingCoins: number) => void;
}

export default function ConvertCoinsModal({
  isOpen,
  onClose,
  currentCoins,
  onSuccess,
}: ConvertCoinsModalProps) {
  const [coinsToConvert, setCoinsToConvert] = useState<number>(Math.min(100, currentCoins));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const usdValue = roundTwoDecimals(coinsToConvert / 100);

  function roundTwoDecimals(num: number): number {
    return Math.round(num * 100) / 100;
  }

  const handleConvert = async () => {
    if (coinsToConvert < 50) {
      setErrorMsg("ចំនួនកាក់អប្បបរមាដើម្បីប្តូរគឺ 50 Coins ($0.50 USD)");
      return;
    }
    if (coinsToConvert > currentCoins) {
      setErrorMsg("លោកអ្នកមិនមានកាក់គ្រប់គ្រាន់ឡើយ!");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await convertCoinsToUSD(coinsToConvert);
      playCelebrationFanfare();
      onSuccess(res.new_wallet_balance, res.remaining_coins);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "មិនអាចប្តូរកាក់បានទេ។ សូមសាកល្បងម្តងទៀត។");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[#0e1118] text-white rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors border-none cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <Sparkles size={24} />
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-black text-white">
            ប្តូរកាក់ S-Coins ទៅជាសាច់ប្រាក់កាបូប
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            អត្រាប្តូរប្រាក់ផ្លូវការ: <strong>100 Coins = $1.00 USD</strong>
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">កាក់បច្ចុប្បន្នរបស់អ្នក:</span>
            <span className="font-black text-amber-400">{currentCoins} Coins</span>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5 font-bold">
              <span className="text-gray-300">ចំនួនកាក់ចង់ប្តូរ:</span>
              <span className="text-amber-400">{coinsToConvert} Coins</span>
            </div>
            <input
              type="range"
              min="50"
              max={Math.max(50, currentCoins)}
              step="10"
              value={coinsToConvert}
              onChange={(e) => setCoinsToConvert(Number(e.target.value))}
              disabled={currentCoins < 50}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Preset Buttons */}
          <div className="flex gap-2 pt-1">
            {[50, 100, 200, 500].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={currentCoins < preset}
                onClick={() => setCoinsToConvert(preset)}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  coinsToConvert === preset
                    ? "bg-amber-500 text-black border-amber-400 font-black"
                    : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Receive Preview */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
          <span className="text-emerald-300 font-bold">សាច់ប្រាក់ទទួលបានក្នុងកាបូប:</span>
          <span className="text-base font-black text-emerald-400">+${usdValue.toFixed(2)} USD</span>
        </div>

        <button
          type="button"
          onClick={handleConvert}
          disabled={loading || currentCoins < 50}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-black text-xs sm:text-sm font-black shadow-lg shadow-amber-950/50 hover:brightness-110 transition-all flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>កំពុងដំណើរការប្តូរ...</span>
            </>
          ) : (
            <>
              <span>ប្តូរជាសាច់ប្រាក់ ${usdValue.toFixed(2)} ភ្លាមៗ</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
