"use client";

import { useState, useEffect, useRef } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cartStore";
import { 
  createOrder, 
  createPaymentSession, 
  processCardPayment, 
  checkPaymentStatus, 
  confirmManualPayment,
  validatePromoCode,
  markOrderFailed
} from "@/lib/services/order.service";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, ShieldCheck, CheckCircle2, Loader2, QrCode, Download,
  ExternalLink, X, Smartphone, ArrowRight, CreditCard, 
  Clock, Check, RefreshCw, AlertCircle, Sparkles, Tag, Ticket, Printer, FileText,
  Truck, MapPin, User, Phone, ChevronRight, ArrowLeft, Shield, Award, HelpCircle,
  Building, CheckSquare, Zap, BadgePercent, Store, Navigation, Crosshair, Send,
  LocateFixed, Globe, Map, Wallet, Plus, ShoppingBag
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getEffectiveUser } from "@/lib/auth-user";
import api from "@/lib/api";
import OrderReceiptModal, { ReceiptData } from "@/components/orders/OrderReceiptModal";
import WalletTopupModal from "@/components/wallet/WalletTopupModal";
import { payOrderWithWallet } from "@/lib/services/wallet.service";

const USD_TO_KHR = 4060;
const fmtUSD = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtKHR = (n: number) => `~ ${(Math.round(Number(n || 0) * USD_TO_KHR / 1000) * 1000).toLocaleString()} KHR`;

// Active KHQR Checkout Session Storage Key (persists across tab reload & page close)
const CHECKOUT_KHQR_STORAGE_KEY = "stech_active_khqr_checkout_session";

// ─── Quick Delivery Note Suggestions ──────────────────────────────────────────
const DELIVERY_NOTE_SUGGESTIONS = [
  { id: "call_before", label: "📞 ខលមកមុន 10 នាទី", text: "សូមខលមកមុនពេលមកដល់ 10 នាទី" },
  { id: "leave_door", label: "📦 ទុកនៅមុខផ្ទះ/បន្ទប់", text: "ទុកទំនិញនៅមុខផ្ទះ ឬមុខបន្ទប់" },
  { id: "security_desk", label: "🏢 ផ្ញើនៅតុសន្តិសុខ/Reception", text: "ផ្ញើនៅតុសន្តិសុខ ឬ Reception" },
  { id: "office_hours", label: "⏰ ដឹកម៉ោងធ្វើការ (8am-5pm)", text: "ដឹកជញ្ជូនក្នុងម៉ោងធ្វើការ (8:00 AM - 5:00 PM)" },
  { id: "clear_gate", label: "🏠 ផ្ទះមានស្លាកលេខច្បាស់", text: "ផ្ទះមានស្លាកលេខ និងរបងច្បាស់លាស់" },
  { id: "express_fast", label: "⚡ ត្រូវការដឹកលឿន Express", text: "ត្រូវការដឹកជញ្ជូនរហ័សទាន់ចិត្ត (Express)" },
  { id: "fragile_wrap", label: "🛡️ ខ្ចប់ការពារក្រាស់ម៉ត់ចត់", text: "សូមខ្ចប់ការពារកញ្ចប់ទំនិញឱ្យក្រាស់" },
  { id: "exact_cash", label: "💵 មានត្រៀមលុយរាយស្រាប់", text: "មានត្រៀមលុយរាយគ្រប់ចំនួនស្រាប់" },
];

// ─── Payment Methods (Aligned with Top-Up: Bakong KHQR, ABA PAY, Credit/Debit Card, COD) ──
const PAYMENT_METHODS = [
  {
    id: "bakong",
    label: "Bakong KHQR • គ្រប់ធនាគារ (All Banks)",
    sub: "ស្កេនបានជាមួយ 36+ ធនាគារក្នុងស្រុក (ABA, ACLEDA, Wing, Canadia...)",
    badge: "NBC KHQR Universal",
    theme: "border-red-500 bg-red-50/40 dark:bg-red-950/20",
    icon: (
      <div className="w-9 h-9 rounded-xl bg-[#E1251B] flex items-center justify-center text-white font-black text-[11px] shadow-sm tracking-tighter shrink-0">
        KHQR
      </div>
    ),
  },
  {
    id: "aba",
    label: "ABA PAY • 1-Tap Mobile Deeplink",
    sub: "បើកកម្មវិធី ABA Mobile ផ្ទាល់ ឬស្កេន QR ជាមួយ ABA Mobile App",
    badge: "1-Tap ABA Mobile",
    theme: "border-[#004B87] bg-blue-50/40 dark:bg-blue-950/20",
    icon: (
      <div className="w-9 h-9 rounded-xl bg-[#004B87] flex items-center justify-center text-white font-black text-[11px] shadow-sm tracking-tighter shrink-0">
        ABA
      </div>
    ),
  },
  {
    id: "visa",
    label: "Credit / Debit Card • Visa & Mastercard",
    sub: "ទូទាត់តាមកាតធនាគារអន្តរជាតិ និងក្នុងស្រុក (3D Secure)",
    badge: "3D Secure 2.0",
    theme: "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20",
    icon: (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-800 to-indigo-950 flex items-center justify-center text-white shadow-sm shrink-0">
        <CreditCard size={18} />
      </div>
    ),
  },
  {
    id: "cod",
    label: "Cash on Delivery • ទូទាត់ពេលទំនិញដល់",
    sub: "ទូទាត់សាច់ប្រាក់សុទ្ធពេលអ្នកដឹកជញ្ជូនប្រគល់ទំនិញដល់ដៃ",
    badge: "Doorstep Cash",
    theme: "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20",
    icon: (
      <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0">
        COD
      </div>
    ),
  },
];

// ─── Step Indicator Component ──────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = [
    { num: 1, label: "Cart", labelKm: "កន្ត្រកទំនិញ" },
    { num: 2, label: "Delivery & Payment", labelKm: "ដឹកជញ្ជូន & ទូទាត់" },
    { num: 3, label: "Order Done", labelKm: "ជោគជ័យ" },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar py-1.5">
      {steps.map((s, idx) => {
        const isActive = s.num === step;
        const isDone = s.num < step;

        return (
          <div key={s.num} className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${
              isActive
                ? "bg-red-500/10 border-red-500/35 text-red-600 dark:text-red-400 shadow-xs"
                : isDone
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                : "bg-gray-100/60 dark:bg-white/[0.03] border-gray-200/60 dark:border-white/[0.06] text-gray-400"
            }`}>
              <div
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-black shrink-0 transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs"
                    : isDone
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                }`}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : s.num}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xs font-bold leading-tight ${
                  isActive ? "text-gray-900 dark:text-white" : isDone ? "text-gray-800 dark:text-gray-200" : "text-gray-400"
                }`}>
                  {s.labelKm}
                </span>
                <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                  • {s.label}
                </span>
              </div>
            </div>

            {idx < steps.length - 1 && (
              <ChevronRight size={13} className="text-gray-300 dark:text-gray-700 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Checkout Page Component ──────────────────────────────────────────────
export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const router = useRouter();
  const { items, fetchCart, clearCart } = useCartStore();

  const [delivery, setDelivery] = useState<"pnompenh" | "province">("pnompenh");
  const [payment, setPayment] = useState("bakong");
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("stech_checkout_name") || "";
    }
    return "";
  });
  const [phone, setPhone] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("stech_checkout_phone") || "";
    }
    return "";
  });
  const [address, setAddress] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [step, setStep] = useState(2);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Processing Order...");
  const [orderId, setOrderId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [profileAutoFilled, setProfileAutoFilled] = useState(false);

  // GPS & Live Location states (1-Click Supreme Location)
  const [activeLocationMode, setActiveLocationMode] = useState<"google" | "telegram">("google");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [locationSuccessMsg, setLocationSuccessMsg] = useState("");
  const [showManualPasteInput, setShowManualPasteInput] = useState(false);
  const [manualLinkInput, setManualLinkInput] = useState("");
  const [manualPasteLoading, setManualPasteLoading] = useState(false);
  const [telegramLocLoading, setTelegramLocLoading] = useState(false);
  const [showTelegramLocModal, setShowTelegramLocModal] = useState(false);
  const [telegramLocSyncCode, setTelegramLocSyncCode] = useState("");
  const [telegramLocBotUrl, setTelegramLocBotUrl] = useState("");
  const [isInsideMiniApp, setIsInsideMiniApp] = useState(false);
  const telegramLocPollRef = useRef<NodeJS.Timeout | null>(null);
  const gpsWatchdogRef = useRef<NodeJS.Timeout | null>(null);

  // Card payment form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardError, setCardError] = useState("");

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    id: number;
    code: string;
    name: string;
    type: "percentage" | "fixed";
    value: number;
    discount_amount: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccessMsg, setPromoSuccessMsg] = useState("");
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);

  // KHQR Payment Session State
  const [showKHQRModal, setShowKHQRModal] = useState(false);
  const [khqrSession, setKhqrSession] = useState<{
    order_id: string;
    khqr_string: string;
    qr_image_url: string;
    deeplinks: {
      universal?: string;
      bakong?: string;
      aba?: string;
      wing?: string;
      acleda?: string;
    };
    merchant?: {
      name?: string;
      bank?: string;
      usd_account?: string;
      khr_account?: string;
      city?: string;
    };
    amount_usd: number;
    amount_khr: number;
  } | null>(null);
  const [pollStatus, setPollStatus] = useState<"checking" | "paid" | "idle">("idle");
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [savingCheckoutQR, setSavingCheckoutQR] = useState(false);
  const [savedCheckoutQR, setSavedCheckoutQR] = useState(false);
  const [showCheckoutQRTip, setShowCheckoutQRTip] = useState(false);
  const [checkingPaymentStatus, setCheckingPaymentStatus] = useState(false);
  const [checkPaymentMessage, setCheckPaymentMessage] = useState<{
    type: "error" | "info" | "success";
    text: string;
  } | null>(null);

  // Telegram Real-time Phone Sync States (Mini App & Web)
  const [phoneSyncLoading, setPhoneSyncLoading] = useState(false);
  const [showPhoneSyncModal, setShowPhoneSyncModal] = useState(false);
  const [phoneSyncCode, setPhoneSyncCode] = useState("");
  const [phoneSyncBotUrl, setPhoneSyncBotUrl] = useState("");
  const [phoneSyncSuccessMsg, setPhoneSyncSuccessMsg] = useState("");
  const phoneSyncPollRef = useRef<NodeJS.Timeout | null>(null);

  // S-Tech Real Wallet & Coins States (Instant 0ms hydration from cache)
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const wRaw = localStorage.getItem("stech_cached_wallet");
        if (wRaw) {
          const w = JSON.parse(wRaw);
          if (w.balance !== undefined) return Number(w.balance);
        }
        const sRaw = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
        if (sRaw) {
          const s = JSON.parse(sRaw);
          if (s.wallet_balance !== undefined) return Number(s.wallet_balance);
        }
      } catch (e) {}
    }
    return 0;
  });
  const [userCoins, setUserCoins] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const wRaw = localStorage.getItem("stech_cached_wallet");
        if (wRaw) {
          const w = JSON.parse(wRaw);
          if (w.coins !== undefined) return Number(w.coins);
        }
        const sRaw = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
        if (sRaw) {
          const s = JSON.parse(sRaw);
          if (s.points !== undefined) return Number(s.points);
        }
      } catch (e) {}
    }
    return 0;
  });
  const [showWalletTopupModal, setShowWalletTopupModal] = useState<boolean>(false);

  // Auto pre-fill from user authentication & cloud profile
  useEffect(() => {
    fetchCart();

    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp;
      const inTg = Boolean(tg?.initData || tg?.initDataUnsafe?.user || (window as any).TelegramWebviewProxy);
      if (inTg) {
        setIsInsideMiniApp(true);
        setActiveLocationMode("telegram");
      }
    }

    const loadCloudProfile = (fallbackUser?: any) => {
      // 1. Check local storage first
      const savedPhone = typeof window !== "undefined" ? localStorage.getItem("stech_checkout_phone") : null;
      if (savedPhone) {
        setPhone(savedPhone);
      } else if (fallbackUser?.phone) {
        setPhone(fallbackUser.phone);
        try { localStorage.setItem("stech_checkout_phone", fallbackUser.phone); } catch (_) {}
      }

      const savedName = typeof window !== "undefined" ? localStorage.getItem("stech_checkout_name") : null;
      if (savedName) {
        setName(savedName);
        setCardHolder(savedName.toUpperCase());
      } else {
        const uName = fallbackUser?.displayName || fallbackUser?.display_name || fallbackUser?.name || "";
        if (uName) {
          setName(uName);
          setCardHolder(uName.toUpperCase());
          try { localStorage.setItem("stech_checkout_name", uName); } catch (_) {}
        }
      }

      // Check telegram_id background phone fetch if still empty
      const tgId = (fallbackUser as any)?.telegram_id || (fallbackUser as any)?.telegram_chat_id;
      if (tgId) {
        api.get(`/auth/telegram/latest-phone?telegram_id=${tgId}`).then((r) => {
          if (r.data?.success && r.data?.phone) {
            setPhone((prev) => prev || r.data.phone);
            try { localStorage.setItem("stech_checkout_phone", r.data.phone); } catch (_) {}
          }
        }).catch(() => {});
      }

      api.get("/user/wallet").then((res) => {
        if (res.data?.wallet) {
          setWalletBalance(Number(res.data.wallet.balance || 0));
          setUserCoins(Number(res.data.wallet.coins || 0));
          try {
            localStorage.setItem("stech_cached_wallet", JSON.stringify(res.data.wallet));
          } catch (e) {}
        }
      }).catch(() => {});

      api.get("/user/profile").then((res) => {
        if (res.data?.profile) {
          const p = res.data.profile;
          if (p.display_name && !localStorage.getItem("stech_checkout_name")) {
            setName(p.display_name);
            try { localStorage.setItem("stech_checkout_name", p.display_name); } catch (_) {}
          }
          if (p.phone) {
            setPhone((prev) => prev || p.phone);
            try { localStorage.setItem("stech_checkout_phone", p.phone); } catch (_) {}
          }
          if (p.address) setAddress(p.address);
          if (p.delivery_notes) setDeliveryNote(p.delivery_notes);
          setProfileAutoFilled(true);
        }
      }).catch(() => {});
    };

    const effective = getEffectiveUser();
    if (effective) {
      loadCloudProfile(effective);
    } else {
      const unsub = onAuthStateChanged(auth, (user) => {
        const u = user || getEffectiveUser();
        if (!u) {
          router.push("/login?redirect=/checkout");
        } else {
          loadCloudProfile(u);
        }
      });
      return () => unsub();
    }
  }, [fetchCart, router]);

  // Dynamic promo codes fetch (only show promos that currently exist in DB and are active)
  useEffect(() => {
    let mounted = true;
    api.get("/promo-codes?active_only=1")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const valid = list.filter((p: any) => p && p.code && p.status === "active");
        setAvailablePromos(valid);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Clean up polling & timers on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (phoneSyncPollRef.current) clearInterval(phoneSyncPollRef.current);
      if (telegramLocPollRef.current) clearInterval(telegramLocPollRef.current);
      if (gpsWatchdogRef.current) clearTimeout(gpsWatchdogRef.current);
    };
  }, []);

  // 1-Click Real-time Phone Auto-Fill from Telegram (Mini App & Website Handshake)
  const handleGetTelegramPhone = async () => {
    const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
    const tgUser = tg?.initDataUnsafe?.user;
    const effective = getEffectiveUser();
    const tgId = tgUser?.id || (effective as any)?.telegram_id || (effective as any)?.telegram_chat_id;

    const applyPhone = (newPhone: string, successMsg = "✅ ទទួលបានលេខទូរស័ព្ទពី Telegram ជោគជ័យ!") => {
      const clean = newPhone.trim();
      setPhone(clean);
      try {
        localStorage.setItem("stech_checkout_phone", clean);
      } catch (_) {}
      setPhoneSyncLoading(false);
      setShowPhoneSyncModal(false);
      setPhoneSyncSuccessMsg(successMsg);
      setTimeout(() => setPhoneSyncSuccessMsg(""), 5000);
      if (tgId) {
        api.post("/auth/telegram/sync-phone", { phone: clean, telegram_id: tgId }).catch(() => {});
      }
    };

    // 1. IN TELEGRAM MINI APP:
    if (tg?.requestContact) {
      setPhoneSyncLoading(true);
      tg.requestContact((ok: boolean, res: any) => {
        if (!ok) {
          setPhoneSyncLoading(false);
          return;
        }

        // Check if phone was directly returned in callback
        const directNum = res?.contact?.phone_number || res?.phone_number;
        if (directNum) {
          const clean = directNum.startsWith("+") ? directNum : `+${directNum}`;
          applyPhone(clean, "✅ ទទួលបានលេខទូរស័ព្ទជោគជ័យ!");
          return;
        }

        // Mobile clients dispatch contact to bot webhook
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const resp = await api.get(`/auth/telegram/latest-phone?telegram_id=${tgId || ""}`);
            if (resp.data?.success && resp.data?.phone) {
              clearInterval(pollInterval);
              applyPhone(resp.data.phone);
              return;
            }
          } catch (e) {}

          if (attempts >= 16) {
            clearInterval(pollInterval);
            setPhoneSyncLoading(false);
          }
        }, 250);
      });
      return;
    }

    // 2. ON WEBSITE (Browser Direct Handshake):
    setPhoneSyncLoading(true);

    // Fast check: if telegram ID is already known and has phone cached in backend
    if (tgId) {
      try {
        const resp = await api.get(`/auth/telegram/latest-phone?telegram_id=${tgId}`);
        if (resp.data?.success && resp.data?.phone) {
          applyPhone(resp.data.phone, "✅ ទទួលបានលេខទូរស័ព្ទពីគណនី Telegram របស់អ្នក!");
          return;
        }
      } catch (e) {}
    }

    // Generate 1-click sync link to trigger handshake with the Bot
    try {
      const genRes = await api.post("/auth/telegram/generate-phone-sync");
      if (genRes.data?.success && genRes.data?.sync_code) {
        const syncCode = genRes.data.sync_code;
        const botUrl = genRes.data.bot_url;
        setPhoneSyncCode(syncCode);
        setPhoneSyncBotUrl(botUrl);
        setShowPhoneSyncModal(true);
        setPhoneSyncLoading(true);

        // Direct Handshake: Open native Telegram app directly via tg:// protocol!
        const appUrl = botUrl.replace("https://t.me/", "tg://resolve?domain=").replace("?start=", "&start=");
        const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
          window.location.href = appUrl;
          setTimeout(() => {
            if (document.visibilityState === "visible") {
              window.location.href = botUrl;
            }
          }, 1200);
        } else {
          window.open(botUrl, "_blank", "noopener,noreferrer");
        }

        // Real-time polling loop (every 600ms) to detect number handshake:
        if (phoneSyncPollRef.current) clearInterval(phoneSyncPollRef.current);
        phoneSyncPollRef.current = setInterval(async () => {
          try {
            const pollRes = await api.get(`/auth/telegram/poll-phone-sync?code=${syncCode}`);
            if (pollRes.data?.success && pollRes.data?.phone) {
              if (phoneSyncPollRef.current) clearInterval(phoneSyncPollRef.current);
              phoneSyncPollRef.current = null;
              applyPhone(pollRes.data.phone);
            }
          } catch (e) {}
        }, 600);

        // Immediate check when user switches focus/tab back to this browser page:
        const handleBackToBrowser = async () => {
          if (document.visibilityState === "visible") {
            try {
              const pollRes = await api.get(`/auth/telegram/poll-phone-sync?code=${syncCode}`);
              if (pollRes.data?.success && pollRes.data?.phone) {
                if (phoneSyncPollRef.current) clearInterval(phoneSyncPollRef.current);
                phoneSyncPollRef.current = null;
                applyPhone(pollRes.data.phone);
              }
            } catch (e) {}
          }
        };

        window.addEventListener("visibilitychange", handleBackToBrowser);
        window.addEventListener("focus", handleBackToBrowser);

        // Safety timeout after 120s
        setTimeout(() => {
          if (phoneSyncPollRef.current) {
            clearInterval(phoneSyncPollRef.current);
            phoneSyncPollRef.current = null;
            setPhoneSyncLoading(false);
          }
          window.removeEventListener("visibilitychange", handleBackToBrowser);
          window.removeEventListener("focus", handleBackToBrowser);
        }, 120000);
      } else {
        setPhoneSyncLoading(false);
      }
    } catch (err) {
      setPhoneSyncLoading(false);
    }
  };

  const deliveryFee = delivery === "pnompenh" ? 2 : 3;
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const discountAmount = appliedPromo ? Number(appliedPromo.discount_amount) : 0;
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

  const handleApplyPromo = async (codeToApply?: string) => {
    const targetCode = (typeof codeToApply === "string" ? codeToApply : promoInput).trim().toUpperCase();
    if (!targetCode) return;
    setPromoInput(targetCode);
    setPromoLoading(true);
    setPromoError("");
    setPromoSuccessMsg("");
    const res = await validatePromoCode(targetCode, subtotal);
    setPromoLoading(false);
    if (res.success && res.data) {
      setAppliedPromo(res.data);
      setPromoSuccessMsg(res.message || `បានអនុវត្តកូដ ${res.data.code} ជោគជ័យ!`);
    } else {
      setPromoError(res.message || "កូដប្រូម៉ូសិនមិនត្រឹមត្រូវ");
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
    setPromoSuccessMsg("");
  };

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, "$1 ").trim();
    setCardNumber(formatted);
    setCardError("");
  };

  // Format expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + "/" + raw.slice(2);
    }
    setCardExpiry(raw);
    setCardError("");
  };

  // Detect card brand
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\s/g, "");
    if (/^4/.test(clean)) return "Visa";
    if (/^(5[1-5]|2[2-7])/.test(clean)) return "Mastercard";
    if (/^3[47]/.test(clean)) return "Amex";
    if (/^35/.test(clean)) return "JCB";
    return "Card";
  };

  // ─── Build Complete Delivery Address with Pin Link ────────────────────────────
  const buildFullAddress = () => {
    const mapLink = gpsCoords ? `https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lng}` : "";
    let full = address.trim();
    if (mapLink && !full.includes(mapLink)) {
      full += ` (📍 Maps Pin: ${mapLink})`;
    }
    if (deliveryNote.trim()) {
      full += ` (Note: ${deliveryNote.trim()})`;
    }
    return full;
  };

  // ─── Extract Coordinates from Link or Text ────────────────────────────────────
  const extractCoordinatesFromText = (raw: string): { lat: number; lng: number } | null => {
    if (!raw) return null;
    const queryMatch = raw.match(/[?&](?:q|ll)=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    const atMatch = raw.match(/@([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    const plainMatch = raw.match(/([+-]?\d{1,2}\.\d+)\s*,\s*([+-]?\d{1,3}\.\d+)/);

    let lat: number | null = null;
    let lng: number | null = null;
    if (queryMatch) {
      lat = parseFloat(queryMatch[1]);
      lng = parseFloat(queryMatch[2]);
    } else if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    } else if (plainMatch) {
      lat = parseFloat(plainMatch[1]);
      lng = parseFloat(plainMatch[2]);
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return null;
  };

  // ─── Central Reverse Geocoding & Address Population ───────────────────────────
  const applyCoordinatesAndReverseGeocode = async (
    lat: number,
    lng: number,
    sourceLabel: string = "Auto-Location"
  ) => {
    if (gpsWatchdogRef.current) clearTimeout(gpsWatchdogRef.current);
    setGpsCoords({ lat, lng });
    const isPhnomPenh = lat >= 11.40 && lat <= 11.75 && lng >= 104.75 && lng <= 105.10;
    setDelivery(isPhnomPenh ? "pnompenh" : "province");

    try {
      const ctrl = new AbortController();
      const fetchTimer = setTimeout(() => ctrl.abort(), 3500);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { 
          headers: { "Accept-Language": "km,en" },
          signal: ctrl.signal
        }
      );
      clearTimeout(fetchTimer);
      const data = await res.json();
      if (data && data.display_name) {
        const addrObj = data.address || {};
        const road = addrObj.road || addrObj.pedestrian || addrObj.suburb || "";
        const neighbourhood = addrObj.neighbourhood || addrObj.village || addrObj.quarter || "";
        const district = addrObj.city_district || addrObj.county || addrObj.district || "";
        const city = addrObj.city || addrObj.state || (isPhnomPenh ? "រាជធានីភ្នំពេញ" : "");

        const parts = [road, neighbourhood, district, city].filter(Boolean);
        const humanAddr = parts.length > 0 ? parts.join(", ") : data.display_name;

        setAddress(humanAddr);
        setLocationSuccessMsg(`✓ បានចាប់យកទីតាំងរួច (${sourceLabel}): ${isPhnomPenh ? "រាជធានីភ្នំពេញ ($2.00)" : (city || "បណ្តាខេត្ត") + " ($3.00)"}`);
      } else {
        setAddress(`ទីតាំង GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setLocationSuccessMsg(`✓ បានចាប់យកទីតាំងរួច (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } catch {
      setAddress(`ទីតាំង GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setLocationSuccessMsg(`✓ បានចាប់យកទីតាំងរួច`);
    } finally {
      if (gpsWatchdogRef.current) clearTimeout(gpsWatchdogRef.current);
      setGpsLoading(false);
      setManualPasteLoading(false);
      setTelegramLocLoading(false);
    }
  };

  // ─── Browser Native GPS Geolocation with Watchdog ──────────────────────────────
  const triggerBrowserGPS = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsLoading(false);
      setGpsError("កម្មវិធីរុករក (Browser) មិនគាំទ្រប្រព័ន្ធ GPS ឡើយ (សូមប្រើ Google Maps ឬ Telegram)");
      return;
    }

    if (gpsWatchdogRef.current) clearTimeout(gpsWatchdogRef.current);
    gpsWatchdogRef.current = setTimeout(() => {
      setGpsLoading(false);
      setGpsError("ការចាប់យក GPS លើសពេលកំណត់! សូមចុចបើក Google Maps ដើម្បីជ្រើសរើស ឬយកពី Telegram");
    }, 6500);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (gpsWatchdogRef.current) clearTimeout(gpsWatchdogRef.current);
        await applyCoordinatesAndReverseGeocode(pos.coords.latitude, pos.coords.longitude, "Google Maps GPS");
      },
      (err) => {
        if (gpsWatchdogRef.current) clearTimeout(gpsWatchdogRef.current);
        setGpsLoading(false);
        let msg = "មិនអាចចាប់យកទីតាំង GPS បានទេ";
        if (err.code === 1) msg = "សូមអនុញ្ញាតសិទ្ធិចូលប្រើទីតាំង (Location Permission) ក្នុង Browser ឬជ្រើសរើស Google Maps Link / Telegram";
        else if (err.code === 2) msg = "សញ្ញា GPS មិនច្បាស់លាស់ សូមសាកល្បងម្ដងទៀត ឬយកពី Telegram";
        else if (err.code === 3) msg = "ការចាប់យកទីតាំងលើសពេលកំណត់ សូមជ្រើសរើស Google Maps Link ឬយកពី Telegram";
        setGpsError(msg);
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 }
    );
  };

  // ─── Telegram Location Sync (Mini App & Website) ───────────────────────────
  const handleGetTelegramLocation = async () => {
    setGpsError("");
    setLocationSuccessMsg("");
    setTelegramLocLoading(true);

    const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
    const isMiniApp = Boolean(
      tg && (tg.initData || tg.initDataUnsafe?.user || (window as any).TelegramWebviewProxy)
    );
    const tgUser = tg?.initDataUnsafe?.user;
    const effective = getEffectiveUser();
    const tgId = tgUser?.id || (effective as any)?.telegram_id || (effective as any)?.telegram_chat_id;

    // Helper: direct GPS request within the in-app webview
    const requestInAppGPS = (): Promise<{ lat: number; lng: number } | null> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !navigator?.geolocation) {
          return resolve(null);
        }
        const timer = setTimeout(() => resolve(null), 8000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {
            clearTimeout(timer);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 }
        );
      });
    };

    // ── 1. In Telegram Mini App: NEVER redirect out or close Mini App! ──
    if (isMiniApp) {
      // Step A: Try native Telegram LocationManager (Telegram Bot API 8.0+)
      const lm = tg?.LocationManager;
      if (lm && typeof lm.init === "function") {
        try {
          const gotLmLoc = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => resolve(false), 3500);
            lm.init(() => {
              if (lm.isInited && lm.isLocationAvailable) {
                lm.getLocation(async (loc: any) => {
                  clearTimeout(timeout);
                  if (loc && loc.latitude && loc.longitude) {
                    await applyCoordinatesAndReverseGeocode(loc.latitude, loc.longitude, "Telegram Live GPS");
                    resolve(true);
                  } else {
                    resolve(false);
                  }
                });
              } else {
                clearTimeout(timeout);
                resolve(false);
              }
            });
          });

          if (gotLmLoc) {
            setTelegramLocLoading(false);
            return;
          }
        } catch (_) {}
      }

      // Step B: Trigger native In-App Browser GPS (triggers standard OS "Allow location" popup inside Telegram)
      const directPos = await requestInAppGPS();
      if (directPos) {
        await applyCoordinatesAndReverseGeocode(directPos.lat, directPos.lng, "Telegram Live GPS");
        setTelegramLocLoading(false);
        return;
      }

      // Step C: Fallback to existing saved location from user's Telegram profile/chat
      try {
        const resp = await api.get(`/auth/telegram/latest-location?telegram_id=${tgId || ""}`);
        if (resp.data?.success && resp.data?.location) {
          const l = resp.data.location;
          if (l.lat && l.lng) {
            await applyCoordinatesAndReverseGeocode(Number(l.lat), Number(l.lng), "Telegram Saved Location");
            setTelegramLocLoading(false);
            return;
          } else if (l.address) {
            setAddress(l.address);
            setLocationSuccessMsg("📍 បានទាញយកអាសយដ្ឋានពីគណនី Telegram របស់អ្នកជោគជ័យ!");
            setTelegramLocLoading(false);
            return;
          }
        }
      } catch (_) {}

      // If user denied permission or GPS is off on phone:
      setTelegramLocLoading(false);
      setGpsError("សូមចុច Allow / អនុញ្ញាតលើផ្ទាំង Telegram ដើម្បីចាប់យកទីតាំងផ្ទាល់ ឬបញ្ចូលអាសយដ្ឋានដោយដៃ");
      return;
    }

    // ── 2. On standard Website / Desktop Browser ──
    await fallbackTelegramLocWebsite(tgId);
  };

  const fallbackTelegramLocWebsite = async (tgId?: string | number) => {
    // Guard: Never perform redirect or sync popup if inside Mini App
    if (typeof window !== "undefined" && Boolean((window as any).Telegram?.WebApp?.initData || (window as any).TelegramWebviewProxy)) {
      setTelegramLocLoading(false);
      return;
    }

    // A. Check if user already has location saved in profile or cache
    try {
      const resp = await api.get(`/auth/telegram/latest-location?telegram_id=${tgId || ""}`);
      if (resp.data?.success && resp.data?.location) {
        const l = resp.data.location;
        if (l.lat && l.lng) {
          await applyCoordinatesAndReverseGeocode(Number(l.lat), Number(l.lng), "Telegram Profile");
        } else if (l.address) {
          setAddress(l.address);
          setLocationSuccessMsg("📍 បានទាញយកអាសយដ្ឋានពីគណនី Telegram របស់អ្នកជោគជ័យ!");
          setTelegramLocLoading(false);
        }
        return;
      }
    } catch (_) {}

    // B. Generate 1-click sync link to open the Customer Bot
    try {
      const genRes = await api.post("/auth/telegram/generate-location-sync");
      if (genRes.data?.success && genRes.data?.sync_code) {
        const syncCode = genRes.data.sync_code;
        const botUrl = genRes.data.bot_url;
        setTelegramLocSyncCode(syncCode);
        setTelegramLocBotUrl(botUrl);
        setShowTelegramLocModal(true);
        setTelegramLocLoading(false);

        // Auto-launch Telegram app
        try {
          const appUrl = botUrl.replace("https://t.me/", "tg://resolve?domain=").replace("?start=", "&start=");
          const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile) {
            window.location.href = appUrl;
            setTimeout(() => {
              if (document.visibilityState === "visible") window.location.href = botUrl;
            }, 800);
          } else {
            const a = document.createElement("a");
            a.href = botUrl;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } catch (_) {}

        // Start polling /auth/telegram/poll-location-sync every 1s
        if (telegramLocPollRef.current) clearInterval(telegramLocPollRef.current);
        telegramLocPollRef.current = setInterval(async () => {
          try {
            const pollRes = await api.get(`/auth/telegram/poll-location-sync?code=${syncCode}`);
            if (pollRes.data?.success && pollRes.data?.location) {
              if (telegramLocPollRef.current) clearInterval(telegramLocPollRef.current);
              setShowTelegramLocModal(false);
              const loc = pollRes.data.location;
              if (loc.lat && loc.lng) {
                await applyCoordinatesAndReverseGeocode(Number(loc.lat), Number(loc.lng), "Telegram Bot Pin");
              } else if (loc.address) {
                setAddress(loc.address);
                setLocationSuccessMsg("📍 បានទទួលទីតាំងពី Telegram ជោគជ័យ!");
                setTelegramLocLoading(false);
              }
            }
          } catch (_) {}
        }, 1000);
      } else {
        setTelegramLocLoading(false);
      }
    } catch (_) {
      setTelegramLocLoading(false);
    }
  };

  // ─── 1-Click Supreme Auto-Locate ──────────────────────────────────────────────
  const handle1ClickAutoLocate = async () => {
    setGpsLoading(true);
    setGpsError("");
    setLocationSuccessMsg("");

    // Check Clipboard for copied Google Maps or Telegram pin link
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.readText === "function") {
        const clipText = await navigator.clipboard.readText();
        const coords = extractCoordinatesFromText(clipText);
        if (coords) {
          await applyCoordinatesAndReverseGeocode(coords.lat, coords.lng, "Copied Maps Link");
          return;
        }
      }
    } catch (_) {}

    // Fallback to Browser GPS
    triggerBrowserGPS();
  };

  // ─── Inline Manual Paste Pin Handler (Optional Non-Intrusive Fallback) ────────
  const handleManualPasteSubmit = async () => {
    const raw = manualLinkInput.trim();
    if (!raw) return;

    setManualPasteLoading(true);
    setGpsError("");

    const coords = extractCoordinatesFromText(raw);
    if (coords) {
      await applyCoordinatesAndReverseGeocode(coords.lat, coords.lng, "Manual Pin Link");
      setShowManualPasteInput(false);
      setManualLinkInput("");
    } else {
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        setAddress((prev) => (prev ? `${prev} (Pin: ${raw})` : `ទីតាំង Pin: ${raw}`));
        setLocationSuccessMsg(`🔗 បានភ្ជាប់តំណភ្ជាប់ទីតាំង (Location Link)`);
      } else {
        setAddress(raw);
        setLocationSuccessMsg(`📝 បានបំពេញអាសយដ្ឋានជោគជ័យ`);
      }
      setManualPasteLoading(false);
      setShowManualPasteInput(false);
      setManualLinkInput("");
    }
  };

  // ─── Toggle Delivery Note Suggestions ─────────────────────────────────────────
  const handleToggleNoteSuggestion = (text: string) => {
    setDeliveryNote((prev) => {
      if (!prev.trim()) {
        return text;
      }
      if (prev.includes(text)) {
        return prev
          .replace(text, "")
          .replace(/,\s*,/g, ",")
          .replace(/^,\s*/, "")
          .replace(/,\s*$/, "")
          .trim();
      } else {
        return `${prev.trim()}, ${text}`;
      }
    });
  };

  // ─── Initiate Order Placement ────────────────────────────────────────────────
  const handlePlaceOrderClick = async () => {
    const hasAuth = Boolean(getEffectiveUser());
    if (!hasAuth) {
      router.push("/login?redirect=/checkout");
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert("សូមបំពេញ ឈ្មោះ, លេខទូរស័ព្ទ និង អាសយដ្ឋានដឹកជញ្ជូន ឱ្យបានពេញលេញ (Please fill recipient details)");
      return;
    }
    if (items.length === 0) {
      alert(t("alertEmptyCart"));
      return;
    }

    // ── Handle S-Tech Real Wallet Flow ──
    if (payment === "wallet") {
      if (walletBalance < Number(total)) {
        const shortage = (Number(total) - walletBalance).toFixed(2);
        alert(`សមតុល្យក្នុងកាបូបមិនគ្រប់គ្រាន់ឡើយ (ខ្វះ $${shortage} USD)! សូមចុច "បញ្ចូលលុយ (Top Up)" មុនពេលបន្តទូទាត់។`);
        setShowWalletTopupModal(true);
        return;
      }
      await executeWalletOrder();
      return;
    }

    // ── Handle Visa/Mastercard Flow ──
    if (payment === "visa") {
      const cleanNum = cardNumber.replace(/\s/g, "");
      if (cleanNum.length < 15) {
        setCardError("សូមបញ្ចូលលេខកាត ១៦ ខ្ទង់ឱ្យបានត្រឹមត្រូវ (Invalid card number)");
        return;
      }
      if (!cardExpiry.includes("/") || cardExpiry.length < 5) {
        setCardError("សូមបញ្ចូលថ្ងៃផុតកំណត់ MM/YY (Invalid expiry date)");
        return;
      }
      if (cardCvv.length < 3) {
        setCardError("សូមបញ្ចូលលេខកូដសម្ងាត់ CVV ៣ ឬ ៤ ខ្ទង់ (Invalid CVV)");
        return;
      }

      await executeCardOrder();
      return;
    }

    // ── Handle KHQR / ABA Flow ──
    if (payment === "aba" || payment === "bakong") {
      await executeKHQROrder();
      return;
    }

    // ── Handle COD ──
    await executeStandardOrder();
  };

  // ─── Execute S-Tech Wallet Payment Order ───────────────────────────────────────
  const executeWalletOrder = async () => {
    setLoading(true);
    setLoadingMsg("កំពុងទូទាត់តាមកាបូប S-Tech Wallet (Deducting Balance)...");

    const fullAddress = buildFullAddress();

    const payload = {
      delivery_type: delivery,
      payment_method: "wallet",
      name: name.trim(),
      phone: phone.trim(),
      email: (getEffectiveUser()?.email || undefined),
      address: fullAddress,
      promo_code: appliedPromo ? appliedPromo.code : undefined,
      discount_amount: discountAmount,
      items: items.map((item) => ({
        product_id: item.product?.id || (item as any).product_id || item.id,
        quantity: item.quantity,
        price: Number(item.product?.sale_price ?? item.product?.price ?? item.price ?? 0),
      })),
      subtotal: Number(subtotal),
      delivery_fee: Number(deliveryFee),
      total_amount: Number(total),
    };

    try {
      const res = await createOrder(payload);

      if (res.success) {
        const newOrderId = res.data?.order?.order_id || `ORD-${Date.now().toString().slice(-6)}`;
        setOrderId(newOrderId);

        try {
          const walletPayRes = await payOrderWithWallet(newOrderId);
          if (walletPayRes.remaining_balance !== undefined) {
            setWalletBalance(Number(walletPayRes.remaining_balance));
          }
          setLoading(false);
          await finishSuccessfulOrder(newOrderId, `WALLET_${Date.now()}`);
        } catch (err: any) {
          setLoading(false);
          const errorMsg = err.response?.data?.message || err.message || "មិនអាចកាត់ប្រាក់ពីកាបូបបានទេ។ សូមពិនិត្យសមតុល្យរបស់អ្នក។";
          markOrderFailed(newOrderId, errorMsg);
          alert(errorMsg);
        }
      } else {
        setLoading(false);
        alert(res.error || t("alertFailed"));
      }
    } catch (err: any) {
      setLoading(false);
      const errorMsg = err.response?.data?.message || err.message || "មានបញ្ហាបច្ចេកទេសក្នុងការកត់ត្រាការបញ្ជាទិញ។ សូមសាកល្បងម្ដងទៀត។";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Execute Standard COD Order ──────────────────────────────────────────────
  const executeStandardOrder = async () => {
    setLoading(true);
    setLoadingMsg("កំពុងបញ្ជូនការបញ្ជាទិញ... (Recording Order)");

    const fullAddress = buildFullAddress();

    const payload = {
      delivery_type: delivery,
      payment_method: payment,
      name: name.trim(),
      phone: phone.trim(),
      email: (getEffectiveUser()?.email || undefined),
      address: fullAddress,
      promo_code: appliedPromo ? appliedPromo.code : undefined,
      discount_amount: discountAmount,
      items: items.map((item) => ({
        product_id: item.product?.id || (item as any).product_id || item.id,
        quantity: item.quantity,
        price: Number(item.product?.sale_price ?? item.product?.price ?? item.price ?? 0),
      })),
      subtotal: Number(subtotal),
      delivery_fee: Number(deliveryFee),
      total_amount: Number(total),
    };

    const res = await createOrder(payload);
    setLoading(false);

    if (res.success) {
      const newOrderId = res.data?.order?.order_id || `ORD-${Date.now().toString().slice(-6)}`;
      setOrderId(newOrderId);
      await finishSuccessfulOrder(newOrderId, "COD_DOORSTEP");
    } else {
      alert(res.error || t("alertFailed"));
    }
  };

  // ─── Execute Visa/Mastercard Order ───────────────────────────────────────────
  const executeCardOrder = async () => {
    setLoading(true);
    setLoadingMsg("កំពុងទូទាត់ជាមួយ Visa/Mastercard Gateway (Processing Card)...");

    const fullAddress = buildFullAddress();

    const payload = {
      delivery_type: delivery,
      payment_method: "visa",
      name: name.trim(),
      phone: phone.trim(),
      email: (getEffectiveUser()?.email || undefined),
      address: fullAddress,
      promo_code: appliedPromo ? appliedPromo.code : undefined,
      discount_amount: discountAmount,
      items: items.map((item) => ({
        product_id: item.product?.id || (item as any).product_id || item.id,
        quantity: item.quantity,
        price: Number(item.product?.sale_price ?? item.product?.price ?? item.price ?? 0),
      })),
      subtotal: Number(subtotal),
      delivery_fee: Number(deliveryFee),
      total_amount: Number(total),
    };

    const res = await createOrder(payload);
    if (!res.success) {
      setLoading(false);
      alert(res.error || "បរាជ័យក្នុងការបង្កើតការបញ្ជាទិញ");
      return;
    }

    const newOrderId = res.data?.order?.order_id || `ORD-${Date.now().toString().slice(-6)}`;
    setOrderId(newOrderId);

    // Call real card processing API
    const [expMonth, expYear] = cardExpiry.split("/");
    const cardRes = await processCardPayment(newOrderId, {
      number: cardNumber.replace(/\s/g, ""),
      exp_month: expMonth,
      exp_year: expYear,
      cvv: cardCvv,
      name: cardHolder.trim() || name.trim(),
    });

    setLoading(false);

    if (cardRes.success) {
      const txn = cardRes.data?.transaction_id || `TXN_${Date.now()}`;
      setTransactionId(txn);
      await finishSuccessfulOrder(newOrderId, txn);
    } else {
      const errMsg = cardRes.error || "ការទូទាត់ត្រូវបានបដិសេធ សូមពិនិត្យកាតឡើងវិញ";
      markOrderFailed(newOrderId, errMsg);
      setCardError(errMsg);
    }
  };

  // ─── Execute Dynamic KHQR / ABA Order ────────────────────────────────────────
  const executeKHQROrder = async () => {
    setLoading(true);
    setLoadingMsg("កំពុងបង្កើត Dynamic KHQR និង Deeplink... (Generating KHQR Session)");

    const fullAddress = buildFullAddress();

    const payload = {
      delivery_type: delivery,
      payment_method: payment,
      name: name.trim(),
      phone: phone.trim(),
      address: fullAddress,
      promo_code: appliedPromo ? appliedPromo.code : undefined,
      discount_amount: discountAmount,
      items: items.map((item) => ({
        product_id: item.product?.id || (item as any).product_id || item.id,
        quantity: item.quantity,
        price: Number(item.product?.sale_price ?? item.product?.price ?? item.price ?? 0),
      })),
      subtotal: Number(subtotal),
      delivery_fee: Number(deliveryFee),
      total_amount: Number(total),
    };

    const res = await createOrder(payload);
    if (!res.success) {
      setLoading(false);
      alert(res.error || "បរាជ័យក្នុងការបង្កើត Order");
      return;
    }

    const newOrderId = res.data?.order?.order_id || `ORD-${Date.now().toString().slice(-6)}`;
    setOrderId(newOrderId);

    // Call payment session API to generate dynamic EMVCo KHQR & Deeplinks
    const sessionRes = await createPaymentSession(newOrderId, payment, "USD");

    if (sessionRes.success && sessionRes.data) {
      const expiresAt = Date.now() + 900 * 1000; // 15 mins timestamp
      setLoading(false);
      setKhqrSession(sessionRes.data);
      setShowKHQRModal(true);
      setTimeLeft(900); // 15 mins
      setPollStatus("idle");
      setCheckPaymentMessage(null);

      // Persist active KHQR session so if user backs out or closes tab and comes back, it resumes with exact countdown!
      try {
        localStorage.setItem(
          CHECKOUT_KHQR_STORAGE_KEY,
          JSON.stringify({
            orderId: newOrderId,
            khqrSession: sessionRes.data,
            payment,
            expiresAt,
          })
        );
      } catch (_) {}

      startPaymentPolling(newOrderId, expiresAt);
    } else {
      setLoading(false);
      const errMsg = sessionRes.error || "បរាជ័យក្នុងការបង្កើត KHQR Code";
      markOrderFailed(newOrderId, errMsg);
      alert(errMsg);
    }
  };

  // ─── Start KHQR 15-Minute Countdown (Client-side Timer Only - No Auto Polling) ──
  const startPaymentPolling = (targetOrderId: string, expiresTimestamp?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollingRef.current) clearInterval(pollingRef.current);

    setPollStatus("idle");

    const targetExpiresAt = expiresTimestamp || (Date.now() + 900 * 1000);
    const initialRem = Math.max(0, Math.floor((targetExpiresAt - Date.now()) / 1000));
    setTimeLeft(initialRem);

    // 15-minute countdown based on exact wall-clock timestamp
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, Math.floor((targetExpiresAt - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        try {
          localStorage.removeItem(CHECKOUT_KHQR_STORAGE_KEY);
        } catch (_) {}
        markOrderFailed(targetOrderId, "KHQR Session Expired (15 minutes)");
      }
    }, 1000);
  };

  // ─── Restore Active KHQR Session on Page Mount / Revisit ──────────────────────
  useEffect(() => {
    try {
      const rawSession = localStorage.getItem(CHECKOUT_KHQR_STORAGE_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        const now = Date.now();
        const remSecs = Math.max(0, Math.floor((Number(parsed.expiresAt) - now) / 1000));
        if (remSecs > 0 && parsed.khqrSession && parsed.orderId) {
          setOrderId(parsed.orderId);
          setKhqrSession(parsed.khqrSession);
          if (parsed.payment) setPayment(parsed.payment);
          setTimeLeft(remSecs);
          setShowKHQRModal(true);
          startPaymentPolling(parsed.orderId, parsed.expiresAt);
        } else {
          localStorage.removeItem(CHECKOUT_KHQR_STORAGE_KEY);
        }
      }
    } catch (_) {}
  }, []);

  // ─── Check Payment Status (On Demand - Only When User Clicks!) ───────────────
  const handleCheckPaymentStatus = async () => {
    const targetOrderId = orderId || khqrSession?.order_id;
    if (!targetOrderId) return;

    setCheckingPaymentStatus(true);
    setCheckPaymentMessage(null);

    try {
      const statusRes = await checkPaymentStatus(targetOrderId);
      if (statusRes.success && statusRes.data?.paid) {
        if (timerRef.current) clearInterval(timerRef.current);
        try {
          localStorage.removeItem(CHECKOUT_KHQR_STORAGE_KEY);
        } catch (_) {}

        setPollStatus("paid");
        setCheckPaymentMessage({
          type: "success",
          text: "ការទូទាត់ទទួលបានជោគជ័យ! (Payment Verified)",
        });

        const txn = statusRes.data.transaction_id || `TXN_${Date.now()}`;
        setTransactionId(txn);

        setTimeout(async () => {
          setShowKHQRModal(false);
          await finishSuccessfulOrder(targetOrderId, txn);
        }, 1000);
      } else {
        setCheckPaymentMessage({
          type: "error",
          text: "មិនទាន់រកឃើញការទូទាត់ពីធនាគារនៅឡើយទេ។ សូមពិនិត្យមើល App ធនាគាររបស់អ្នក រួចចុច \u201cពិនិត្យការទូទាត់\u201d ម្តងទៀត។",
        });
      }
    } catch (e: any) {
      setCheckPaymentMessage({
        type: "error",
        text: "មានបញ្ហាក្នុងការតភ្ជាប់ទៅកាន់ប្រព័ន្ធធនាគារ សូមសាកល្បងម្តងទៀត។",
      });
    } finally {
      setCheckingPaymentStatus(false);
    }
  };

  // ─── Customer Manual Confirmation Handler ────────────────────────────────────
  const handleManualConfirmPayment = async () => {
    if (!orderId) return;
    setLoading(true);
    setLoadingMsg("កំពុងផ្ទៀងផ្ទាត់ប្រតិបត្តិការ... (Verifying Transaction)");

    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      localStorage.removeItem(CHECKOUT_KHQR_STORAGE_KEY);
    } catch (_) {}

    const res = await confirmManualPayment(orderId, payment);
    setLoading(false);
    setShowKHQRModal(false);

    if (res.success) {
      const txn = res.data?.transaction_id || `TXN_CONFIRMED`;
      setTransactionId(txn);
      await finishSuccessfulOrder(orderId, txn);
    } else {
      alert("បរាជ័យក្នុងការផ្ទៀងផ្ទាត់ សូមទាក់ទងមកកាន់ហាង");
    }
  };

  // ─── Save Checkout QR Code Directly to Device (Zero Share Sheet) ───────────
  const handleSaveCheckoutQR = async () => {
    if (!khqrSession?.qr_image_url) return;
    setSavingCheckoutQR(true);
    setShowCheckoutQRTip(true);
    try {
      const fileName = `${payment === "aba" ? "ABA-PAY" : "KHQR"}-${orderId || "ORDER"}.png`;

      // 1. Telegram Mini App native download
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg && typeof tg.downloadFile === "function") {
          tg.downloadFile({ url: khqrSession.qr_image_url, file_name: fileName });
        }
      } catch (_) {}

      // 2. Direct browser download via Blob
      const resp = await fetch(khqrSession.qr_image_url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch (_) {}
      }, 1500);

      setSavedCheckoutQR(true);
      setTimeout(() => setSavedCheckoutQR(false), 4000);
    } catch (e) {
      const link = document.createElement("a");
      link.href = khqrSession.qr_image_url;
      link.download = `${payment === "aba" ? "ABA-PAY" : "KHQR"}-${orderId || "ORDER"}.png`;
      link.target = "_blank";
      link.click();
      setSavedCheckoutQR(true);
      setTimeout(() => setSavedCheckoutQR(false), 4000);
    } finally {
      setSavingCheckoutQR(false);
    }
  };

  // ─── Finish Order & Show Done Screen ─────────────────────────────────────────
  const finishSuccessfulOrder = async (finalOrderId: string, txn: string) => {
    try {
      localStorage.removeItem(CHECKOUT_KHQR_STORAGE_KEY);
    } catch (_) {}

    const currentPayment = payment;
    const isCOD = currentPayment === "cod";
    const fullAddress = deliveryNote.trim() 
      ? `${address.trim()} (Note: ${deliveryNote.trim()})` 
      : address.trim();

    const snapshotReceipt: ReceiptData = {
      orderId: finalOrderId,
      transactionId: txn,
      customerName: name.trim() || "Customer",
      customerPhone: phone.trim(),
      shippingAddress: fullAddress,
      deliveryType: delivery,
      paymentMethod: currentPayment,
      paymentStatus: isCOD ? "cod" : "paid",
      items: items.map((i) => ({
        id: i.id,
        name: (i as any).name || i.product?.name || "Tech Product",
        quantity: i.quantity,
        price: Number(i.product?.sale_price ?? i.product?.price ?? i.price ?? 0),
        image: i.image_url || i.product?.image || (i as any).image,
      })),
      subtotal: Number(subtotal),
      deliveryFee: Number(deliveryFee),
      discountAmount: Number(discountAmount),
      promoCode: appliedPromo?.code,
      total: Number(total),
      paidAt: new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    setReceiptData(snapshotReceipt);
    setShowReceiptModal(true);

    await clearCart();

    try {
      await api.post("/user/notifications", {
        title: "Order Placed Successfully! 📦",
        message: `Order #${finalOrderId} ចំនួន $${total.toFixed(2)} ត្រូវបានទទួលជោគជ័យ។ ក្រុមការងារនឹងទាក់ទងមក ${phone}។`,
        type: "order",
      });
    } catch (e) {}

    setConfirmed(true);
    setStep(3);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ─── Done Screen ────────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0c0d12] text-gray-900 dark:text-gray-100 pb-20">
        <OrderReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          receipt={receiptData}
          onTrackOrder={() => router.push("/orders")}
          onContinueShopping={() => router.push("/")}
        />

        <div className="bg-white dark:bg-[#12151e] border-b border-gray-100 dark:border-white/10 py-6">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl font-black">{t("title")}</h1>
            <div className="mt-3"><StepBar step={3} /></div>
          </div>
        </div>

        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#151922] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden border border-gray-100 dark:border-white/10 my-auto"
          >
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-5 shadow-sm ring-4 ring-emerald-50 dark:ring-white/5">
              <CheckCircle2 size={42} strokeWidth={2.5} />
            </div>

            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t("orderConfirmed")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t("orderPlacedSuccess")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Our delivery team will contact <strong className="text-gray-900 dark:text-white font-bold">{phone}</strong> for instant dispatch.
            </p>

            <div className="bg-gray-50 dark:bg-white/5 w-full rounded-2xl p-4 sm:p-5 mb-5 text-left border border-gray-100 dark:border-white/5 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">Order ID</span>
                <span className="font-black text-[#8B1A1A] dark:text-red-400 font-mono text-sm">{orderId}</span>
              </div>
              {transactionId && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Transaction Ref</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{transactionId}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">{t("orderTotal")}</span>
                <span className="font-black text-base text-gray-900 dark:text-white font-mono">{fmtUSD(total)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">{t("payment")}</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {PAYMENT_METHODS.find((p) => p.id === payment)?.label}
                </span>
              </div>
            </div>

            {/* Receipt Modal Trigger Button */}
            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="w-full mb-3 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer size={15} />
              <span>មើល & បោះពុម្ពវិក្កយបត្រ (View & Print Receipt)</span>
            </button>

            <div className="w-full space-y-2.5">
              <Link
                href="/orders"
                className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white rounded-xl text-xs font-bold shadow-md transition-all no-underline"
              >
                Track Order in My Orders
              </Link>
              <Link
                href="/"
                className="w-full flex items-center justify-center py-2.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all no-underline"
              >
                {t("backToHome")}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#090a0f] min-h-screen text-gray-900 dark:text-gray-100 pb-36 lg:pb-20 font-sans">
      {/* ── Top Header & Trust Banner ── */}
      <div className="bg-white/90 dark:bg-[#12151e]/90 backdrop-blur-xl border-b border-gray-200/80 dark:border-white/10 pt-6 pb-4 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3.5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                <Link href="/cart" className="hover:text-[#8B1A1A] flex items-center gap-1 transition-colors no-underline">
                  <ArrowLeft size={13} />
                  <span>ត្រឡប់ទៅកន្ត្រក (Cart)</span>
                </Link>
                <span>/</span>
                <span className="text-gray-800 dark:text-gray-300">ទូទាត់ប្រាក់ (Checkout)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span>សុវត្ថិភាពការទូទាត់ប្រាក់ • Checkout</span>
              </h1>
            </div>

            {/* Trust Assurance Pill */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 self-start sm:self-auto shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Lock size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>256-Bit SSL Encrypted & Bank Guaranteed</span>
            </div>
          </div>

          <StepBar step={step} />
        </div>
      </div>

      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* ── LEFT COLUMN: Shipping & Payment (7 cols on lg, 8 on xl) ─────────────────────────────── */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">

            {/* 1. DELIVERY OPTIONS SECTION */}
            <section className="bg-white dark:bg-[#12151e] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-950/40 shrink-0">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                      តំបន់ដឹកជញ្ជូន • Delivery Options
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      ជ្រើសរើសទីតាំងដើម្បីទទួលបានរយៈពេល និងថ្លៃដឹកជញ្ជូនច្បាស់លាស់
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-2">
                {[
                  { 
                    id: "pnompenh", 
                    icon: "🛵",
                    label: "រាជធានីភ្នំពេញ (Phnom Penh)", 
                    sub: "ដឹករហ័សដល់មាត់ទ្វារ (2–4 Hours Express)", 
                    fee: 2.00,
                    tag: "Express" 
                  },
                  { 
                    id: "province", 
                    icon: "🚚",
                    label: "បណ្តាខេត្តទាំងអស់ (24 Provinces)", 
                    sub: "ផ្ញើតាមក្រុមហ៊ុនដឹកជញ្ជូនទូទាំងប្រទេស (1–2 Days)", 
                    fee: 3.00,
                    tag: "Nationwide" 
                  },
                ].map((opt) => {
                  const isSelected = delivery === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDelivery(opt.id as typeof delivery)}
                      className={`p-4.5 rounded-2xl text-left transition-all relative border cursor-pointer flex flex-col justify-between gap-3.5 group ${
                        isSelected
                          ? "border-red-500/90 bg-gradient-to-br from-red-500/[0.06] via-red-500/[0.02] to-transparent dark:from-red-950/40 dark:via-red-950/15 dark:to-transparent ring-2 ring-red-500/25 shadow-md shadow-red-950/10"
                          : "border-gray-200/90 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl group-hover:scale-110 transition-transform">{opt.icon}</span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            opt.tag === "Express"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          }`}>
                            {opt.tag}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? "border-red-600 bg-red-600 text-white shadow-xs" : "border-gray-300 dark:border-white/25"
                        }`}>
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white">
                          {opt.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                          {opt.sub}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-semibold">ថ្លៃសេវាដឹកជញ្ជូន Fee</span>
                        <span className="text-sm font-black text-red-600 dark:text-red-400 font-mono px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20">
                          ${opt.fee.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. RECIPIENT INFORMATION FORM */}
            <section className="bg-white dark:bg-[#12151e] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-950/40 shrink-0">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                      ព័ត៌មានអ្នកទទួលទំនិញ • Recipient Details
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      បំពេញឈ្មោះ លេខទូរស័ព្ទ និងអាសយដ្ឋានដឹកជញ្ជូនឱ្យបានច្បាស់លាស់
                    </p>
                  </div>
                </div>
                {profileAutoFilled && (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0 shadow-2xs">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span className="hidden sm:inline">Auto-filled from profile</span>
                    <span className="sm:hidden">Auto-filled</span>
                  </span>
                )}
              </div>

              <div className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      ឈ្មោះអ្នកទទួល (Full Name) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          try {
                            localStorage.setItem("stech_checkout_name", e.target.value);
                          } catch (_) {}
                        }}
                        placeholder="ឧ. សុខា ចាន់ (Sokha Chan)"
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200/90 dark:border-white/10 text-sm focus:border-red-500 focus:bg-white dark:focus:bg-[#151922] focus:ring-4 focus:ring-red-500/10 outline-none text-gray-900 dark:text-white transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <span>លេខទូរស័ព្ទ (Phone Number)</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGetTelegramPhone}
                        disabled={phoneSyncLoading}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 cursor-pointer bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded-xl transition-all active:scale-95 disabled:opacity-60 shrink-0 shadow-xs"
                        title="យកលេខទូរស័ព្ទពី Telegram ដោយស្វ័យប្រវត្តិ"
                      >
                        {phoneSyncLoading ? (
                          <Loader2 size={12} className="animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                        ) : (
                          <Smartphone size={12} className="shrink-0" />
                        )}
                        <span>{phoneSyncLoading ? "កំពុងចាប់..." : (phone ? "ប្តូរលេខពី Telegram" : "យកលេខពី Telegram")}</span>
                      </button>
                    </div>

                    {phoneSyncSuccessMsg && (
                      <div className="mb-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span>{phoneSyncSuccessMsg}</span>
                      </div>
                    )}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                        <Phone size={16} />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          try {
                            localStorage.setItem("stech_checkout_phone", e.target.value);
                          } catch (_) {}
                        }}
                        placeholder="012 345 678"
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200/90 dark:border-white/10 text-sm focus:border-red-500 focus:bg-white dark:focus:bg-[#151922] focus:ring-4 focus:ring-red-500/10 outline-none text-gray-900 dark:text-white transition-all font-mono placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      អាសយដ្ឋានដឹកជញ្ជូនលម្អិត (Delivery Address) *
                    </label>

                    {/* ── 2 Options Selector: Google Maps vs Telegram Location ── */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/80 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveLocationMode("google");
                          setGpsError("");
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeLocationMode === "google"
                            ? "bg-white dark:bg-[#181d28] text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-500/30"
                            : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                        }`}
                      >
                        <Map size={13} className="text-emerald-500" />
                        <span>Google Maps</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveLocationMode("telegram");
                          setGpsError("");
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeLocationMode === "telegram"
                            ? "bg-white dark:bg-[#181d28] text-sky-600 dark:text-sky-400 shadow-xs border border-sky-500/30"
                            : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                        }`}
                      >
                        <Send size={13} className="text-sky-500 rotate-[-20deg]" />
                        <span>Telegram Location</span>
                      </button>
                    </div>
                  </div>

                  {/* ── Option 1: Google Maps Sub-bar ── */}
                  {activeLocationMode === "google" && (
                    <div className="mb-3 p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-wrap items-center justify-between gap-2.5 animate-fadeIn">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Browser GPS button with Watchdog */}
                        <button
                          type="button"
                          onClick={() => {
                            setGpsLoading(true);
                            setGpsError("");
                            setLocationSuccessMsg("");
                            triggerBrowserGPS();
                          }}
                          disabled={gpsLoading}
                          className={`px-3.5 py-2 rounded-xl text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm disabled:opacity-60 ${
                            gpsCoords
                              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-950/40 ring-2 ring-emerald-400/40"
                              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/30"
                          }`}
                          title={gpsCoords ? "បានចាប់យកទីតាំងរួច — ចុចម្តងទៀតដើម្បីចាប់ទីតាំងឡើងវិញ" : "ចាប់យកទីតាំងតាម Browser GPS"}
                        >
                          {gpsLoading ? (
                            <Loader2 size={13} className="animate-spin text-white" />
                          ) : gpsCoords ? (
                            <CheckCircle2 size={14} className="text-white drop-shadow-xs" />
                          ) : (
                            <LocateFixed size={13} className="text-white animate-pulse" />
                          )}
                          <span>
                            {gpsLoading
                              ? "កំពុងចាប់ទីតាំង..."
                              : gpsCoords
                              ? "✓ បានចាប់យកទីតាំងរួច"
                              : "📍 ចាប់យកទីតាំង (GPS 1-Click)"}
                          </span>
                        </button>

                        {/* Open Google Maps in new tab to pick pin */}
                        <a
                          href="https://www.google.com/maps"
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-white dark:bg-[#12151e] border border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer no-underline"
                          title="បើកគេហទំព័រ Google Maps ដើម្បីរើស និងចម្លង Link ទីតាំង"
                        >
                          <Globe size={13} className="text-emerald-600 dark:text-emerald-400" />
                          <span>បើក Google Maps រើសទីតាំង</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>

                      {/* Paste toggle */}
                      <button
                        type="button"
                        onClick={() => setShowManualPasteInput((prev) => !prev)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 underline cursor-pointer px-2 py-1"
                      >
                        {showManualPasteInput ? "បិទ" : "📋 បិទភ្ជាប់ Link Maps"}
                      </button>
                    </div>
                  )}

                  {/* ── Option 2: Telegram Location Sub-bar ── */}
                  {activeLocationMode === "telegram" && (
                    <div className="mb-3 p-2.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40 flex flex-wrap items-center justify-between gap-2.5 animate-fadeIn">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Telegram Sync Button */}
                        <button
                          type="button"
                          onClick={handleGetTelegramLocation}
                          disabled={telegramLocLoading}
                          className={`px-3.5 py-2 rounded-xl text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm disabled:opacity-60 ${
                            gpsCoords
                              ? "bg-gradient-to-r from-sky-600 via-blue-600 to-sky-700 shadow-sky-950/40 ring-2 ring-sky-400/40"
                              : "bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sky-950/30"
                          }`}
                          title={gpsCoords ? "បានចាប់យកទីតាំងរួច — ចុចម្តងទៀតដើម្បីទាញសារជាថ្មី" : isInsideMiniApp ? "ចាប់យកទីតាំងផ្ទាល់ក្នុង Mini App ដោយមិនបាច់បិទកម្មវិធី" : "យកទីតាំងពី Profile Telegram ឬបើក Bot ដើម្បីផ្ញើ Pin ទីតាំង"}
                        >
                          {telegramLocLoading ? (
                            <Loader2 size={13} className="animate-spin text-white" />
                          ) : gpsCoords ? (
                            <CheckCircle2 size={14} className="text-white drop-shadow-xs" />
                          ) : (
                            <Send size={13} className="text-white rotate-[-20deg]" />
                          )}
                          <span>
                            {telegramLocLoading
                              ? "កំពុងចាប់ទីតាំង..."
                              : gpsCoords
                              ? "✓ បានចាប់យកទីតាំងរួច"
                              : isInsideMiniApp
                              ? "📍 ចាប់យកទីតាំងផ្ទាល់ (In-App Live GPS)"
                              : "✈️ យកទីតាំងពី Telegram (1-Click)"}
                          </span>
                        </button>

                        <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:inline">
                          {isInsideMiniApp
                            ? "(Telegram នឹងបង្ហាញផ្ទាំង Allow ដើម្បីចាប់ទីតាំង auto ភ្លាមៗ)"
                            : "(ទាញពី Profile ឬចែករំលែក Pin ក្នុង Bot)"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowManualPasteInput((prev) => !prev)}
                        className="text-[11px] font-bold text-sky-700 hover:text-sky-900 dark:text-sky-300 underline cursor-pointer px-2 py-1"
                      >
                        {showManualPasteInput ? "បិទ" : "📋 បិទភ្ជាប់ Pin Link"}
                      </button>
                    </div>
                  )}

                  {/* Optional Inline Paste Input (Zero Intrusive Popup) */}
                  {showManualPasteInput && (
                    <div className="mb-3 p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-fadeIn">
                      <div className="relative flex-1">
                        <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500" />
                        <input
                          type="text"
                          value={manualLinkInput}
                          onChange={(e) => setManualLinkInput(e.target.value)}
                          placeholder="បិទភ្ជាប់ Link Google Maps ឬ Telegram Pin ឬ Coordinates..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#12151e] border border-sky-200 dark:border-sky-800 text-xs outline-none text-gray-900 dark:text-white font-mono placeholder:text-gray-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleManualPasteSubmit}
                        disabled={manualPasteLoading || !manualLinkInput.trim()}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {manualPasteLoading ? "កំពុងទាញ..." : "បំពេញ"}
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute top-3.5 left-3.5 pointer-events-none text-gray-400 dark:text-gray-500">
                      <MapPin size={16} />
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="ផ្ទះលេខ, ផ្លូវលេខ, សង្កាត់/ឃុំ, ខណ្ឌ/ស្រុក, រាជធានី ឬ ខេត្ត..."
                      className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200/90 dark:border-white/10 text-sm focus:border-red-500 focus:bg-white dark:focus:bg-[#151922] focus:ring-4 focus:ring-red-500/10 outline-none text-gray-900 dark:text-white transition-all resize-none shadow-2xs placeholder:text-gray-400"
                    />
                  </div>

                  {gpsCoords && (
                    <div className="mt-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200 shadow-2xs">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          ✓ បានចាប់យកទីតាំងរួច:
                        </span>
                        <span className="font-mono font-bold">
                          GPS {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                        </span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 hidden sm:inline">
                          (បានផ្ទៀងផ្ទាត់កូអរដោនេសម្រាប់អ្នកដឹក)
                        </span>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 shrink-0 ml-2"
                      >
                        <span>មើលក្នុង Google Maps</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  {gpsError && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5 bg-red-500/10 p-3 rounded-2xl border border-red-500/20">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{gpsError}</span>
                    </div>
                  )}

                  {locationSuccessMsg && !gpsError && (
                    <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>{locationSuccessMsg}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    កំណត់ចំណាំសម្រាប់អ្នកដឹក (Delivery Note / Landmark - Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                      <FileText size={16} />
                    </div>
                    <input
                      type="text"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="ឧ. ផ្ទះរបងពណ៌ស ក្បែរផ្សារ ឬ ហៅទូរស័ព្ទមុនមកដល់..."
                      className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200/90 dark:border-white/10 text-sm focus:border-red-500 focus:bg-white dark:focus:bg-[#151922] focus:ring-4 focus:ring-red-500/10 outline-none text-gray-900 dark:text-white transition-all shadow-2xs placeholder:text-gray-400"
                    />
                  </div>

                  {/* Horizontal Scrollable Clean Chips */}
                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-500 shrink-0" />
                      <span>កំណត់ចំណាំរហ័ស (Quick Tap Suggestions):</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
                      {DELIVERY_NOTE_SUGGESTIONS.map((sug) => {
                        const isSelected = deliveryNote.includes(sug.text);
                        return (
                          <button
                            key={sug.id}
                            type="button"
                            onClick={() => handleToggleNoteSuggestion(sug.text)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 border ${
                              isSelected
                                ? "bg-red-600 text-white border-red-600 shadow-xs"
                                : "bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200/60 dark:border-white/10"
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                            <span>{sug.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. PAYMENT METHOD SELECTOR */}
            <section className="bg-white dark:bg-[#12151e] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-950/40 shrink-0">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                      វិធីសាស្ត្រទូទាត់ប្រាក់ • Payment Method
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      ទូទាត់រហ័សតាមធនាគារក្នុងស្រុក កាតអន្តរជាតិ ឬសាច់ប្រាក់សុទ្ធ
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-bold shadow-2xs">
                  <Lock size={12} className="text-emerald-500" />
                  <span>256-Bit SSL Protected</span>
                </div>
              </div>

              {/* ── 1. S-Tech Real Wallet Highlight / 1-Click Pay Option ── */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setPayment("wallet")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPayment("wallet");
                  }
                }}
                className={`p-4.5 sm:p-5 rounded-2xl mb-5 transition-all border cursor-pointer select-none text-left relative group ${
                  payment === "wallet"
                    ? "border-emerald-500/90 bg-gradient-to-br from-emerald-500/[0.08] via-teal-500/[0.04] to-transparent dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-transparent ring-2 ring-emerald-500/25 shadow-md shadow-emerald-950/20"
                    : "border-gray-200/90 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-all ${
                      payment === "wallet"
                        ? "bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-950/40 scale-105"
                        : "bg-gradient-to-tr from-[#8B1A1A] to-red-600 shadow-red-950/40"
                    }`}>
                      <Wallet size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-gray-900 dark:text-white">
                          កាបូបលុយ S-Tech Real Wallet
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                          payment === "wallet"
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}>
                          <Sparkles size={10} />
                          <span>1-Click Instant Pay</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        សមតុល្យបច្ចុប្បន្ន: <strong className="text-gray-900 dark:text-white font-mono text-sm">${walletBalance.toFixed(2)} USD</strong> (~ {Math.round(walletBalance * USD_TO_KHR).toLocaleString()} KHR)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    {walletBalance < Number(total) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWalletTopupModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-950/30 active:scale-95 transition-all"
                      >
                        <Plus size={13} strokeWidth={3} />
                        <span>បញ្ចូលលុយ (Top Up)</span>
                      </button>
                    )}

                    {/* Radio Check Circle */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${
                        payment === "wallet" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"
                      }`}>
                        {payment === "wallet" ? "✓ បានជ្រើសរើស" : "ជ្រើសរើស"}
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        payment === "wallet" 
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-xs" 
                          : "border-gray-300 dark:border-white/20"
                      }`}>
                        {payment === "wallet" && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                </div>

                {payment === "wallet" && (
                  <div className="mt-3.5 pt-3.5 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      <span>
                        {walletBalance >= Number(total)
                          ? "សមតុល្យគ្រប់គ្រាន់ — ចុច «ទូទាត់ជាមួយ S-Tech Wallet» ខាងក្រោមដើម្បីកាត់ប្រាក់ភ្លាមៗ"
                          : `សមតុល្យខ្វះ $${(Number(total) - walletBalance).toFixed(2)} USD — សូមចុចបញ្ចូលលុយ Top Up ខាងលើ ឬប្តូរវិធីសាស្ត្រ`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPayment("bakong");
                      }}
                      className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline cursor-pointer"
                    >
                      ប្តូរទៅធនាគារវិញ (Switch to Bank)
                    </button>
                  </div>
                )}
                {payment !== "wallet" && walletBalance < Number(total) && (
                  <div className="mt-2.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ សមតុល្យខ្វះ ${(Number(total) - walletBalance).toFixed(2)} USD — ចុចទីនេះដើម្បីជ្រើសរើស ឬចុចបញ្ចូលលុយ Top Up
                  </div>
                )}
              </div>

              <div className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                <span>វិធីសាស្ត្រទូទាត់តាមធនាគារ & កាត (Bank & Card Methods):</span>
              </div>

              {/* Payment Method Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = payment === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPayment(pm.id)}
                      className={`p-4.5 rounded-2xl text-left transition-all relative border cursor-pointer flex flex-col justify-between gap-3.5 group ${
                        isSelected
                          ? "border-red-500/90 bg-gradient-to-br from-red-500/[0.06] via-red-500/[0.02] to-transparent dark:from-red-950/40 dark:via-red-950/15 dark:to-transparent ring-2 ring-red-500/25 shadow-md shadow-red-950/10"
                          : "border-gray-200/90 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {pm.icon}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                            {pm.badge}
                          </span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? "border-red-600 bg-red-600 text-white shadow-xs" : "border-gray-300 dark:border-white/20"
                          }`}>
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white">
                          {pm.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                          {pm.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── Interactive Credit/Debit Card Form (when VISA selected) ── */}
              {payment === "visa" && (
                <div className="mt-5 p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      ព័ត៌មានកាតធនាគារ (Card Details)
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Lock size={12} className="text-emerald-500" />
                      <span>256-bit SSL Protected</span>
                    </div>
                  </div>

                  {/* Khmer Customer Recommendation Note */}
                  <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                    <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">💡 ការណែនាំសម្រាប់ជនជាតិខ្មែរ (Recommended):</strong> ប្រសិនបើលោកអ្នកមានគណនីធនាគារក្នុងស្រុក យើងខ្ញុំសូមណែនាំឱ្យជ្រើសរើសទូទាត់តាម <strong>Bakong KHQR</strong> ឬ <strong>ABA PAY</strong> វិញ — ឥតគិតថ្លៃសេវាបន្ថែម (0% Gateway Fee), មិនបារម្ភរឿងថ្លៃប្តូរប្រាក់អន្តរជាតិ និងមិនទាមទារ OTP ស្មុគស្មាញ!
                    </div>
                  </div>

                  {/* 3D-Styled Metallic Card Visualizer */}
                  <div className="mb-5 p-5 rounded-2xl bg-gradient-to-tr from-[#151824] via-[#0d0f18] to-[#1f2438] text-white shadow-xl relative overflow-hidden border border-white/10 max-w-sm mx-auto">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-10 h-8 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner flex items-center justify-center opacity-90">
                        <div className="w-6 h-5 border border-black/30 rounded-xs" />
                      </div>
                      <span className="text-base font-black tracking-wider text-amber-400 font-mono">
                        {getCardBrand(cardNumber)}
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-mono tracking-widest mb-4 font-bold">
                      {cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-300">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-gray-400">Cardholder</div>
                        <div className="font-bold tracking-wide truncate max-w-[160px]">
                          {cardHolder || (name ? name.toUpperCase() : "YOUR NAME")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wider text-gray-400">Expires</div>
                        <div className="font-bold font-mono">{cardExpiry || "MM/YY"}</div>
                      </div>
                    </div>
                  </div>

                  {cardError && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{cardError}</span>
                    </div>
                  )}

                  {/* Form Inputs */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Card Number (លេខកាត ១៦ ខ្ទង់)
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4000 1234 5678 9010"
                        maxLength={19}
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#12151e] border border-gray-200 dark:border-white/10 text-sm font-mono focus:border-red-500 outline-none text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Cardholder Name (ឈ្មោះម្ចាស់កាត)
                      </label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        placeholder="e.g. SOKHA CHAN"
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#12151e] border border-gray-200 dark:border-white/10 text-sm uppercase focus:border-red-500 outline-none text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Expiry Date (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="12/28"
                          maxLength={5}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#12151e] border border-gray-200 dark:border-white/10 text-sm font-mono focus:border-red-500 outline-none text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          CVV / CVC Code
                        </label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#12151e] border border-gray-200 dark:border-white/10 text-sm font-mono focus:border-red-500 outline-none text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* KHQR Info Note Banner */}
              {(payment === "aba" || payment === "bakong") && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-transparent border border-blue-500/20 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <QrCode size={18} />
                  </div>
                  <div className="text-xs text-blue-950 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">Dynamic NBC KHQR: </span>
                    ប្រព័ន្ធនឹងបង្កើត QR Code សុពលភាព ១៥ នាទីសម្រាប់ស្កេនទូទាត់ជាមួយគ្រប់ App ធនាគារ ឬចុចប៊ូតុង Deeplink បើក ABA Mobile ភ្លាមៗ។
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ── RIGHT COLUMN: Order Summary & Review (5 cols on lg, 4 on xl) ────────────────────────── */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-5">
            <div className="bg-white dark:bg-[#12151e] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <ShoppingBag size={16} />
                  </div>
                  <h2 className="text-base font-black text-gray-900 dark:text-white">
                    បញ្ជីទំនិញកុម្ម៉ង់ • Summary
                  </h2>
                </div>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  {items.length} មុខ
                </span>
              </div>

              {/* Items List with Real Images */}
              <div className="space-y-3.5 max-h-72 overflow-y-auto no-scrollbar mb-5 pr-1">
                {items.map((item) => {
                  const itemImg = item.image_url || item.product?.image || item.product?.image_url || (Array.isArray(item.product?.images) ? item.product?.images[0] : null) || "/logo.jpg";

                  return (
                    <div key={item.id} className="flex items-center gap-3 text-xs py-1 group">
                      <div className="relative w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0 border border-gray-200 dark:border-white/10 group-hover:scale-105 transition-transform">
                        <img 
                          src={itemImg} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                          {item.quantity}
                        </span>
                      </div>

                      <div className="truncate flex-1 min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white truncate text-xs mb-0.5 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-gray-400 font-medium">
                          {fmtUSD(item.price)} × {item.quantity}
                        </div>
                      </div>

                      <div className="font-mono font-black text-gray-900 dark:text-white text-xs shrink-0">
                        {fmtUSD(item.price * item.quantity)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Promo Code Section ── */}
              <div className="border-t border-gray-100 dark:border-white/10 pt-4 pb-4">
                <label className="block text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Ticket size={14} className="text-red-600" />
                    <span>កូដប្រូម៉ូសិន • Promo Code</span>
                  </span>
                  {appliedPromo && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Applied!
                    </span>
                  )}
                </label>

                {appliedPromo ? (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-950 dark:text-emerald-300 font-mono">
                          {appliedPromo.code}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          {appliedPromo.type === "percentage" ? `${appliedPromo.value}% OFF` : `$${appliedPromo.value} OFF`} • ចំណេញ {fmtUSD(appliedPromo.discount_amount)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="p-1.5 rounded-xl text-emerald-700 hover:text-red-600 hover:bg-red-500/10 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                      title="Remove Promo Code"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoError("");
                        }}
                        placeholder="បញ្ចូលកូដប្រូម៉ូសិន (Enter promo)"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200/90 dark:border-white/10 text-xs font-mono font-bold uppercase tracking-wider focus:border-red-500 outline-none text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPromo()}
                        disabled={promoLoading || !promoInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-40 shrink-0 active:scale-95"
                      >
                        {promoLoading ? "..." : "Apply"}
                      </button>
                    </div>

                    {/* 1-Click Interactive Promo Suggestions (Only shown if active promos exist in DB) */}
                    {availablePromos.length > 0 && (
                      <div className="mt-2.5">
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                          <Sparkles size={11} className="text-amber-500" />
                          <span>កូដពិសេសចុចយកភ្លាមៗ (Tap to Apply):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {availablePromos.map((item) => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => handleApplyPromo(item.code)}
                              disabled={promoLoading}
                              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-extrabold border border-red-500/20 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            >
                              <Tag size={10} />
                              <span>{item.code} ({item.type === "percentage" ? `${item.value}%` : `$${item.value}`})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {promoError && (
                      <div className="mt-2 text-[11px] text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle size={12} />
                        <span>{promoError}</span>
                      </div>
                    )}
                    {promoSuccessMsg && (
                      <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>{promoSuccessMsg}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-gray-100 dark:border-white/10 pt-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>តម្លៃទំនិញសរុប (Subtotal)</span>
                  <span className="font-bold text-gray-900 dark:text-white font-mono">{fmtUSD(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>សេវាដឹកជញ្ជូន (Delivery Fee)</span>
                  <span className="font-bold text-gray-900 dark:text-white font-mono">{fmtUSD(deliveryFee)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="flex items-center gap-1">
                      <Tag size={12} />
                      <span>បញ្ចុះតម្លៃ Promo ({appliedPromo?.code})</span>
                    </span>
                    <span className="font-mono">-{fmtUSD(discountAmount)}</span>
                  </div>
                )}
                
                {/* Total Highlighted Card */}
                <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/[0.07] via-red-500/[0.02] to-transparent dark:from-red-950/35 dark:via-red-950/15 dark:to-transparent border border-red-500/20 flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                        ទឹកប្រាក់ត្រូវទូទាត់សរុប
                      </span>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        Total Amount
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 font-mono tracking-tight leading-tight">
                        {fmtUSD(total)}
                      </div>
                      <div className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                        ~ {fmtKHR(total)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Primary Place Order CTA with Glowing Shimmer & 3D Depth ("buttonស្អាតៗ") ── */}
              <button
                type="button"
                onClick={handlePlaceOrderClick}
                disabled={loading || items.length === 0}
                className="mt-6 w-full relative group overflow-hidden rounded-2xl p-[1px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-300 shadow-[0_12px_35px_-5px_rgba(220,38,38,0.45),0_4px_12px_-2px_rgba(220,38,38,0.25)] hover:shadow-[0_18px_45px_-4px_rgba(220,38,38,0.65),0_8px_18px_-2px_rgba(220,38,38,0.35)]"
              >
                {/* Ambient Animated Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity blur-[1px]" />

                {/* Inner Glowing Body */}
                <div className="relative px-4 sm:px-5 py-4 rounded-[15px] bg-gradient-to-r from-red-600 via-[#8B1A1A] to-red-600 bg-[length:200%_auto] group-hover:bg-right transition-all duration-500 flex items-center justify-between gap-3 text-white overflow-hidden">
                  
                  {/* Shimmer Light Beam Effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

                  {/* Left Icon Pill */}
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <ShieldCheck size={22} className="text-white drop-shadow-sm" />
                  </div>

                  {/* Center Content */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-white/80 flex items-center gap-1.5 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>256-Bit SSL Secured</span>
                    </div>
                    <div className="text-sm sm:text-base font-black tracking-tight truncate leading-tight drop-shadow-xs">
                      {payment === "wallet"
                        ? `ទូទាត់ ${fmtUSD(total)} ជាមួយ Wallet`
                        : payment === "aba"
                        ? `ទូទាត់ ${fmtUSD(total)} ជាមួយ ABA PAY`
                        : payment === "bakong"
                        ? `ទូទាត់ ${fmtUSD(total)} ជាមួយ Bakong KHQR`
                        : payment === "visa"
                        ? `ទូទាត់ ${fmtUSD(total)} ជាមួយ Card`
                        : `បញ្ជាក់ការកុម្ម៉ង់ ${fmtUSD(total)} (COD)`}
                    </div>
                  </div>

                  {/* Right Arrow Action */}
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-all">
                    <ArrowRight size={18} className="text-white drop-shadow-sm" />
                  </div>
                </div>
              </button>
            </div>

            {/* Store Assurances Trust Box */}
            <div className="bg-white dark:bg-[#12151e] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-300">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
                  <Shield size={16} />
                </div>
                <span>ធានាផលិតផលសុទ្ធ ១០០% ជាមួយការធានាផ្លូវការ ១ ឆ្នាំពេញ</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-300">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <RefreshCw size={16} />
                </div>
                <span>គោលការណ៍ប្តូរទំនិញថ្មីក្នុង ៧ ថ្ងៃ ប្រសិនបើមានបញ្ហាបច្ចេកទេស</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-300">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Smartphone size={16} />
                </div>
                <span>ទទួលវិក្កយបត្រ & ដំណឹងតាម Telegram និង SMS Real-time</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Dynamic KHQR & Banking Deeplink Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showKHQRModal && khqrSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#151922] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-gray-100 dark:border-white/10 text-center"
            >
              <button
                onClick={() => {
                  setShowKHQRModal(false);
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  if (timerRef.current) clearInterval(timerRef.current);
                  setCheckPaymentMessage(null);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>

              {/* Authentic Header (ABA PAY or NBC Bakong) */}
              {payment === "aba" ? (
                <div className="bg-[#003B6D] text-white py-2.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between mb-3 shadow-md">
                  <div className="flex items-center gap-1.5 shadow-xs">
                    <span className="bg-white text-[#003B6D] px-2 py-0.5 rounded-l font-black text-xs tracking-tight">ABA</span>
                    <span className="bg-[#00A4E4] text-white px-2 py-0.5 rounded-r font-black text-xs tracking-tight">PAY</span>
                    <span className="text-[11px] font-bold text-cyan-200 ml-1">ABA Bank</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-white/20">
                    <CheckCircle2 size={10} className="text-[#00A4E4]" />
                    <span>Verified ABA Merchant</span>
                  </span>
                </div>
              ) : (
                <div className="bg-[#E1251B] text-white py-2 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between mb-3 shadow-md">
                  <div className="flex items-center gap-1.5">
                    <QrCode size={16} />
                    <span>KHQR • NBC BAKONG</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    UNIVERSAL
                  </span>
                </div>
              )}

              {/* Account Holder Name */}
              <div className="text-center mb-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {payment === "aba" ? "ABA Mobile Banking" : (khqrSession.merchant?.bank || "NBC Bakong")}
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-wide flex items-center justify-center gap-1">
                  <span>{khqrSession.merchant?.name || "ROTANA NOB"}</span>
                  <CheckCircle2 size={13} className="text-[#00A4E4] inline shrink-0" />
                </h3>
              </div>

              {/* QR Code Container (100% Clean & Unobstructed for All Banks) */}
              <div className={`p-3 bg-white rounded-2xl border-2 ${
                payment === "aba" ? "border-[#003B6D]" : "border-red-500"
              } inline-block shadow-lg mb-2 relative`}>
                <img
                  src={khqrSession.qr_image_url}
                  alt={payment === "aba" ? "ABA PAY QR" : "KHQR Payment"}
                  style={{ WebkitTouchCallout: "default" }}
                  className="w-48 h-48 object-contain mx-auto rounded-lg select-auto cursor-pointer"
                  title="ចុចសង្កត់ (Touch & Hold) ដើម្បី Save to Photos"
                />
              </div>

              {/* Touch & Hold photo tip for iOS / mobile */}
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 font-medium">
                💡 ចុចសង្កត់លើរូប QR (Touch & Hold) រួចរើស <strong>"Save to Photos"</strong>
              </div>

              {/* Authentic Bank Account Details from Flyer */}
              <div className="grid grid-cols-2 gap-2 text-left bg-gray-50 dark:bg-white/5 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 mb-3 text-[11px]">
                <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">៛</span>
                  <div>
                    <div className="text-[9px] text-gray-400">KHR account:</div>
                    <div className="font-mono font-bold">{khqrSession.merchant?.khr_account || "006 822 995"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">$</span>
                  <div>
                    <div className="text-[9px] text-gray-400">USD account:</div>
                    <div className="font-mono font-bold">{khqrSession.merchant?.usd_account || "014 579 634"}</div>
                  </div>
                </div>
              </div>

              {/* Amount Display */}
              <div className={`rounded-2xl p-3 mb-3 border ${
                payment === "aba"
                  ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/30"
                  : "bg-red-50/60 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/30"
              }`}>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total Payable Amount ទឹកប្រាក់ត្រូវបង់</div>
                <div className={`text-2xl font-black font-mono ${
                  payment === "aba" ? "text-[#003B6D] dark:text-cyan-400" : "text-[#8B1A1A] dark:text-red-400"
                }`}>
                  {fmtUSD(khqrSession.amount_usd)}
                </div>
                <div className="text-xs font-bold text-gray-500 font-mono">
                  ~ {fmtKHR(khqrSession.amount_usd)}
                </div>
                <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                  <Clock size={11} />
                  <span>Expires in: {formatTimer(timeLeft)}</span>
                </div>
              </div>

              {/* 1-Click Mobile Banking Deeplinks */}
              {(() => {
                const isAbaOrder = payment === "aba";
                const abaDeeplink = khqrSession.deeplinks?.aba || khqrSession.deeplinks?.universal || (khqrSession.khqr_string ? `https://bakong-deeplink.nbc.gov.kh/bakong/payment?qr=${encodeURIComponent(khqrSession.khqr_string)}` : "abamobilebank://");
                const bakongDeeplink = khqrSession.deeplinks?.bakong || khqrSession.deeplinks?.universal || (khqrSession.khqr_string ? `https://bakong-deeplink.nbc.gov.kh/bakong/payment?qr=${encodeURIComponent(khqrSession.khqr_string)}` : "#");
                const primaryDeeplink = isAbaOrder ? abaDeeplink : bakongDeeplink;

                return (
                  <div className="space-y-2 mb-3">
                    {/* Primary Channel Deeplink */}
                    <a
                      href={primaryDeeplink}
                      target="_blank"
                      rel="noreferrer"
                      className={`w-full py-2.5 px-3 rounded-xl hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all text-center no-underline shadow-md ${
                        isAbaOrder
                          ? "bg-gradient-to-r from-[#003B6D] via-[#004B87] to-[#00A4E4] shadow-blue-950/40"
                          : "bg-gradient-to-r from-red-600 via-[#E1251B] to-rose-600 shadow-red-950/40"
                      }`}
                    >
                      <Smartphone size={14} />
                      <span>
                        {isAbaOrder
                          ? "បើក ABA Mobile ផ្ទាល់ (1-Tap Pay via ABA App)"
                          : "បើក Bakong App ផ្ទាល់ (1-Tap Pay via Bakong)"}
                      </span>
                    </a>

                    {/* Secondary Direct Switch Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={abaDeeplink}
                        target="_blank"
                        rel="noreferrer"
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center no-underline shadow-xs ${
                          isAbaOrder
                            ? "bg-[#003B6D] text-white hover:bg-[#004B87] ring-1 ring-white/20"
                            : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        <Smartphone size={13} />
                        <span>ABA Mobile</span>
                      </a>

                      <a
                        href={bakongDeeplink}
                        target="_blank"
                        rel="noreferrer"
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center no-underline shadow-xs ${
                          !isAbaOrder
                            ? "bg-[#E1251B] text-white hover:bg-[#b81d15] ring-1 ring-white/20"
                            : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        <Smartphone size={13} />
                        <span>Bakong App</span>
                      </a>
                    </div>

                    {/* Save QR Image Button */}
                    <button
                      type="button"
                      onClick={handleSaveCheckoutQR}
                      disabled={savingCheckoutQR}
                      className="w-full py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {savingCheckoutQR ? (
                        <Loader2 size={13} className="animate-spin text-amber-500" />
                      ) : savedCheckoutQR ? (
                        <Check size={13} className="text-emerald-500" />
                      ) : (
                        <Download size={13} />
                      )}
                      <span>{savedCheckoutQR ? "បានទាញយកកូដ QR!" : "Save Image QR (ទាញយករូបភាព)"}</span>
                    </button>

                    {showCheckoutQRTip && (
                      <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] text-left leading-relaxed">
                        📸 បានទាញយករូប QR! (💡 លើ iPhone: លោកអ្នកក៏អាចចុចសង្កត់លើរូប QR Code ខាងលើ រួចរើសយក &ldquo;Save to Photos&rdquo; បានភ្លាមៗ)
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Payment Instruction / Status Banner */}
              {pollStatus === "paid" ? (
                <div className="py-2.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold">
                    ការទូទាត់ទទួលបានជោគជ័យ! (Payment Verified)
                  </span>
                </div>
              ) : (
                <div className="py-2 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center gap-2 mb-3">
                  <Smartphone size={13} className="text-gray-500 shrink-0" />
                  <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                    សូមស្កេនទូទាត់ក្នុង App ធនាគារ រួចចុច &ldquo;ពិនិត្យការទូទាត់&rdquo; ខាងក្រោម
                  </span>
                </div>
              )}

              {/* Feedback Alert when user clicks check but payment not found yet */}
              {checkPaymentMessage && (
                <div
                  className={`p-2.5 rounded-xl text-xs mb-3 flex items-start gap-2 text-left leading-relaxed ${
                    checkPaymentMessage.type === "error"
                      ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300"
                      : "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {checkPaymentMessage.type === "error" ? (
                    <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <span className="text-[11px] font-medium">{checkPaymentMessage.text}</span>
                </div>
              )}

              {/* Confirmation Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCheckPaymentStatus}
                  disabled={checkingPaymentStatus || pollStatus === "paid"}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {checkingPaymentStatus ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>កំពុងត្រួតពិនិត្យការទូទាត់... (Checking...)</span>
                    </>
                  ) : pollStatus === "paid" ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>ការទូទាត់ជោគជ័យ! (Paid)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>ខ្ញុំបានទូទាត់រួចរាល់ (ពិនិត្យការទូទាត់)</span>
                    </>
                  )}
                </button>

                {checkPaymentMessage?.type === "error" && (
                  <button
                    type="button"
                    onClick={handleManualConfirmPayment}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send size={12} />
                    <span>បានផ្ទេររួចហើយ? ចុចបញ្ជាក់ការផ្ទេរដោយដៃ (Manual Confirmation)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowKHQRModal(false);
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    if (timerRef.current) clearInterval(timerRef.current);
                    setCheckPaymentMessage(null);
                    try {
                      localStorage.removeItem(CHECKOUT_KHQR_STORAGE_KEY);
                    } catch (_) {}
                  }}
                  className="w-full py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  ផ្លាស់ប្តូរវិធីទូទាត់ (Change Method)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ── Telegram Phone Number Sync Modal (For Website Users) ── */}
      <AnimatePresence>
        {showPhoneSyncModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white dark:bg-[#151922] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-gray-100 dark:border-white/10 text-center"
            >
              <button
                type="button"
                onClick={() => {
                  setShowPhoneSyncModal(false);
                  setPhoneSyncLoading(false);
                  if (phoneSyncPollRef.current) clearInterval(phoneSyncPollRef.current);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Smartphone size={24} />
              </div>

              <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
                ភ្ជាប់លេខទូរស័ព្ទពី Telegram
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                សូមចុចបើក Telegram Bot រួចចុច <b>&ldquo;Share Phone&rdquo;</b> នោះប្រព័ន្ធនឹងចាប់យកលេខមកបំពេញលើ Checkout នេះដោយស្វ័យប្រវត្តិតែម្ដង មិនបាច់ Reload ឡើយ!
              </p>

              {/* 1-Tap Deep Link Button */}
              {phoneSyncBotUrl && (
                <div className="space-y-3">
                  <a
                    href={phoneSyncBotUrl.replace("https://t.me/", "tg://resolve?domain=").replace("?start=", "&start=")}
                    onClick={() => {
                      setTimeout(() => {
                        if (document.visibilityState === "visible") {
                          window.open(phoneSyncBotUrl, "_blank");
                        }
                      }, 1000);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-blue-600 hover:from-blue-700 hover:to-sky-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 no-underline active:scale-95 cursor-pointer"
                  >
                    <Send size={14} className="rotate-[-20deg]" />
                    <span>បើក Telegram App ឥឡូវនេះ (1-Tap Open)</span>
                  </a>

                  {/* QR Code preview for desktop scanning */}
                  <div className="p-3 bg-white dark:bg-black/30 rounded-2xl border border-gray-200 dark:border-white/10 inline-block shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(phoneSyncBotUrl)}`}
                      alt="Telegram Bot QR"
                      className="w-36 h-36 mx-auto object-contain"
                    />
                    <div className="text-[10px] text-gray-400 mt-1 font-mono">
                      ស្កេនពីទូរស័ព្ទ (Scan with Phone)
                    </div>
                  </div>
                </div>
              )}

              {/* Radar Polling Status Indicator */}
              <div className="mt-4 py-2 px-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  កំពុងរង់ចាំការចែករំលែកលេខទូរស័ព្ទ (Handshake)...
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Telegram Location Sync Modal (For Website Users) ── */}
      <AnimatePresence>
        {showTelegramLocModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white dark:bg-[#151922] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-gray-100 dark:border-white/10 text-center"
            >
              <button
                onClick={() => {
                  setShowTelegramLocModal(false);
                  if (telegramLocPollRef.current) clearInterval(telegramLocPollRef.current);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <MapPin size={24} />
              </div>

              <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
                ភ្ជាប់ទីតាំងពី Telegram
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                សូមចុចប៊ូតុងខាងក្រោមដើម្បីបើក Telegram Bot រួចចុច &ldquo;Share Location&rdquo; នោះប្រព័ន្ធនឹងបំពេញទីតាំង និងគណនាតម្លៃដឹកជញ្ជូនចូល Checkout នេះភ្លាមៗ!
              </p>

              {/* 1-Tap Deep Link Button */}
              {telegramLocBotUrl && (
                <div className="space-y-3">
                  <a
                    href={telegramLocBotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-sky-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 no-underline active:scale-95"
                  >
                    <Send size={14} className="rotate-[-20deg]" />
                    <span>បើក Telegram Bot ឥឡូវនេះ (1-Tap Open)</span>
                  </a>

                  {/* QR Code preview for desktop scanning */}
                  <div className="p-3 bg-white dark:bg-black/30 rounded-2xl border border-gray-200 dark:border-white/10 inline-block shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(telegramLocBotUrl)}`}
                      alt="Telegram Location QR"
                      className="w-36 h-36 mx-auto object-contain"
                    />
                    <div className="text-[10px] text-gray-400 mt-1 font-mono">
                      ស្កេនពីទូរស័ព្ទ (Scan to Share Location)
                    </div>
                  </div>
                </div>
              )}

              {/* Radar Polling Status Indicator */}
              <div className="mt-4 py-2 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  កំពុងរង់ចាំការចែករំលែកទីតាំង...
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Processing Overlay ── */}
      <AnimatePresence>
        {loading && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#151922] rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-gray-100 dark:border-white/10"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 rounded-full flex items-center justify-center mb-5">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <h3 className="text-base font-black text-gray-900 dark:text-white mb-2">{loadingMsg}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Securing invoice and synchronizing with Telegram delivery queue.
              </p>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg w-full">
                <Lock size={12} /> 256-bit Secure Gateway
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Mobile Sticky Bottom Checkout Bar (Taobao / Amazon standard) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#12151e]/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-white/10 p-3 px-4 shadow-[0_-10px_35px_rgba(0,0,0,0.12)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 leading-none mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ទឹកប្រាក់សរុប</span>
            </div>
            <div className="text-xl font-black text-red-600 dark:text-red-400 font-mono leading-none">
              {fmtUSD(total)}
            </div>
            <div className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">
              ~ {fmtKHR(total)}
            </div>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrderClick}
            disabled={loading || items.length === 0}
            className="relative group overflow-hidden rounded-xl p-[1px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all shadow-[0_8px_25px_-4px_rgba(220,38,38,0.45)] hover:shadow-[0_12px_30px_-3px_rgba(220,38,38,0.6)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-xl opacity-90 blur-[1px]" />
            <div className="relative px-4 py-2.5 rounded-[11px] bg-gradient-to-r from-red-600 via-[#8B1A1A] to-red-600 text-white font-black text-xs sm:text-sm flex items-center gap-2 overflow-hidden">
              <ShieldCheck size={16} className="text-white shrink-0 drop-shadow-sm" />
              <span className="tracking-wide">
                {payment === "wallet"
                  ? `ទូទាត់ ${fmtUSD(total)} (Wallet)`
                  : payment === "aba"
                  ? `ទូទាត់ ${fmtUSD(total)} (ABA)`
                  : payment === "bakong"
                  ? `ទូទាត់ ${fmtUSD(total)} (KHQR)`
                  : payment === "visa"
                  ? `ទូទាត់ ${fmtUSD(total)} (Card)`
                  : "បញ្ជាក់ការកុម្ម៉ង់ (COD)"}
              </span>
              <ArrowRight size={14} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* ── S-Tech Real Wallet Topup Modal ── */}
      <WalletTopupModal
        isOpen={showWalletTopupModal}
        onClose={() => setShowWalletTopupModal(false)}
        initialAmount={Math.max(5, Math.ceil(Number(total) - walletBalance))}
        onSuccess={(newBal) => {
          setWalletBalance(newBal);
          setShowWalletTopupModal(false);
        }}
      />
    </div>
  );
}
