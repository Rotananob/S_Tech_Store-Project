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
  validatePromoCode
} from "@/lib/services/order.service";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, ShieldCheck, CheckCircle2, Loader2, QrCode, 
  ExternalLink, X, Smartphone, ArrowRight, CreditCard, 
  Clock, Check, RefreshCw, AlertCircle, Sparkles, Tag, Ticket, Printer, FileText,
  Truck, MapPin, User, Phone, ChevronRight, ArrowLeft, Shield, Award, HelpCircle,
  Building, CheckSquare, Zap, BadgePercent, Store, Navigation, Crosshair, Send,
  LocateFixed, Globe, Map, Wallet, Plus
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

// ─── Payment Methods ────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id: "wallet",
    label: "S-Tech Real Wallet • កាបូបលុយ S-Tech",
    sub: "Pay instantly from your S-Tech Cash Wallet with 1-click",
    badge: "Instant 1-Click Pay",
    theme: "border-[#8B1A1A] bg-red-50/50 dark:bg-red-950/20",
    icon: (
      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
        <Wallet size={18} />
      </div>
    ),
  },
  {
    id: "bakong",
    label: "Bakong KHQR • All Banks",
    sub: "Scan with ABA, Wing, ACLEDA, or any 36+ Cambodian banks",
    badge: "NBC Universal",
    theme: "border-red-500 bg-red-50/40 dark:bg-red-950/20",
    icon: (
      <div className="w-9 h-9 rounded-xl bg-[#E1251B] flex items-center justify-center text-white font-black text-[11px] shadow-sm tracking-tighter shrink-0">
        KHQR
      </div>
    ),
  },
  {
    id: "aba",
    label: "ABA PAY • Direct Deeplink",
    sub: "Scan QR or launch ABA Mobile directly on your phone",
    badge: "1-Tap Mobile Pay",
    theme: "border-[#004B87] bg-blue-50/40 dark:bg-blue-950/20",
    icon: (
      <div className="w-9 h-9 rounded-xl bg-[#004B87] flex items-center justify-center text-white font-black text-[11px] shadow-sm tracking-tighter shrink-0">
        ABA
      </div>
    ),
  },
  {
    id: "visa",
    label: "Visa & Mastercard • Credit/Debit",
    sub: "Pay securely with international or local bank card",
    badge: "3D Secure",
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
    sub: "Pay in cash upon doorstep delivery by courier",
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
    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-1">
      {steps.map((s, idx) => {
        const isActive = s.num === step;
        const isDone = s.num < step;

        return (
          <div key={s.num} className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all shadow-xs ${
                  isActive
                    ? "bg-[#8B1A1A] text-white ring-4 ring-red-100 dark:ring-red-950/60 scale-105"
                    : isDone
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500"
                }`}
              >
                {isDone ? <Check size={14} strokeWidth={3} /> : s.num}
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xs font-extrabold transition-colors leading-tight ${
                    isActive
                      ? "text-[#8B1A1A] dark:text-red-400"
                      : isDone
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {s.labelKm}
                </span>
                <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                  {s.label}
                </span>
              </div>
            </div>

            {idx < steps.length - 1 && (
              <ChevronRight size={14} className="text-gray-300 dark:text-gray-700 shrink-0 mx-1" />
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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

  // GPS & Live Location states
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [locationSuccessMsg, setLocationSuccessMsg] = useState("");
  const [showTelegramPinModal, setShowTelegramPinModal] = useState(false);
  const [telegramPinInput, setTelegramPinInput] = useState("");
  const [pinParsingLoading, setPinParsingLoading] = useState(false);

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

  // S-Tech Real Wallet & Coins States
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [showWalletTopupModal, setShowWalletTopupModal] = useState<boolean>(false);

  // Auto pre-fill from user authentication & cloud profile
  useEffect(() => {
    fetchCart();

    const loadCloudProfile = (fallbackUser?: any) => {
      const uName = fallbackUser?.displayName || fallbackUser?.display_name || fallbackUser?.name || "";
      if (uName) {
        setName(uName);
        setCardHolder(uName.toUpperCase());
      }
      if (fallbackUser?.phone) {
        setPhone(fallbackUser.phone);
      }

      api.get("/user/wallet").then((res) => {
        if (res.data?.wallet) {
          setWalletBalance(Number(res.data.wallet.balance || 0));
          setUserCoins(Number(res.data.wallet.coins || 0));
        }
      }).catch(() => {});

      api.get("/user/profile").then((res) => {
        if (res.data?.profile) {
          const p = res.data.profile;
          if (p.display_name) setName(p.display_name);
          if (p.phone) setPhone(p.phone);
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

  // Clean up polling & timers on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  // ─── Live GPS Auto-Locate Handler ─────────────────────────────────────────────
  const handleGetLiveGPS = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("កម្មវិធីរុករក (Browser) មិនគាំទ្រប្រព័ន្ធ GPS ទេ");
      return;
    }

    setGpsLoading(true);
    setGpsError("");
    setLocationSuccessMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsCoords({ lat, lng });

        // Auto-detect Phnom Penh vs Province
        const isPhnomPenh = lat >= 11.40 && lat <= 11.75 && lng >= 104.75 && lng <= 105.10;
        setDelivery(isPhnomPenh ? "pnompenh" : "province");

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "km,en" } }
          );
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
            setLocationSuccessMsg(`📍 បានចាប់យកទីតាំងផ្ទាល់ជោគជ័យ: ${isPhnomPenh ? "រាជធានីភ្នំពេញ" : city || "បណ្តាខេត្ត"}`);
          } else {
            setAddress(`ទីតាំង GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            setLocationSuccessMsg(`📍 បានចាប់យកកូអរដោនេ GPS (${lat.toFixed(4)}, ${lng.toFixed(4)}) ជោគជ័យ`);
          }
        } catch {
          setAddress(`ទីតាំង GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setLocationSuccessMsg(`📍 បានចាប់យកកូអរដោនេ GPS ជោគជ័យ`);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        let msg = "មិនអាចចាប់យកទីតាំង GPS បានទេ";
        if (err.code === 1) msg = "សូមអនុញ្ញាតសិទ្ធិចូលប្រើទីតាំង (Location Permission) ក្នុង Browser";
        else if (err.code === 2) msg = "សញ្ញា GPS មិនច្បាស់លាស់ សូមសាកល្បងម្ដងទៀត";
        else if (err.code === 3) msg = "ការចាប់យកទីតាំងលើសពេលកំណត់ (GPS Timeout)";
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ─── Parse Telegram Pin / Shared Location Link ────────────────────────────────
  const handleParseTelegramOrMapLink = async (inputStr: string) => {
    const raw = inputStr.trim();
    if (!raw) return;

    setPinParsingLoading(true);
    setGpsError("");

    let lat: number | null = null;
    let lng: number | null = null;

    // Check for @lat,lng or q=lat,lng or ll=lat,lng
    const queryMatch = raw.match(/[?&](?:q|ll)=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    const atMatch = raw.match(/@([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    const plainMatch = raw.match(/([+-]?\d{1,2}\.\d+)\s*,\s*([+-]?\d{1,3}\.\d+)/);

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
      setGpsCoords({ lat, lng });
      const isPhnomPenh = lat >= 11.40 && lat <= 11.75 && lng >= 104.75 && lng <= 105.10;
      setDelivery(isPhnomPenh ? "pnompenh" : "province");

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "km,en" } }
        );
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
          setLocationSuccessMsg(`📍 បានកំណត់ទីតាំងពី Telegram Pin / Maps ជោគជ័យ`);
        } else {
          setAddress(`ទីតាំង Pin: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setLocationSuccessMsg(`📍 បានកំណត់ទីតាំងពី Telegram Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      } catch {
        setAddress(`ទីតាំង Pin: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setLocationSuccessMsg(`📍 បានកំណត់ទីតាំងពី Telegram Pin ជោគជ័យ`);
      }
      setShowTelegramPinModal(false);
      setTelegramPinInput("");
    } else {
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        setAddress((prev) => (prev ? `${prev} (Pin: ${raw})` : `ទីតាំង Pin: ${raw}`));
        setLocationSuccessMsg(`🔗 បានភ្ជាប់តំណភ្ជាប់ទីតាំង (Location Pin Link)`);
      } else {
        setAddress(raw);
        setLocationSuccessMsg(`📝 បានបំពេញអាសយដ្ឋានជោគជ័យ`);
      }
      setShowTelegramPinModal(false);
      setTelegramPinInput("");
    }
    setPinParsingLoading(false);
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

    if (res.success) {
      const newOrderId = res.data?.order?.order_id || `ORD-${Date.now().toString().slice(-6)}`;
      setOrderId(newOrderId);

      try {
        const walletPayRes = await payOrderWithWallet(newOrderId);
        setWalletBalance(walletPayRes.remaining_balance);
        setLoading(false);
        await finishSuccessfulOrder(newOrderId, `WALLET_${Date.now()}`);
      } catch (err: any) {
        setLoading(false);
        alert(err.response?.data?.message || "មិនអាចកាត់ប្រាក់ពីកាបូបបានទេ។ សូមពិនិត្យសមតុល្យរបស់អ្នក។");
      }
    } else {
      setLoading(false);
      alert(res.error || t("alertFailed"));
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
      setCardError(cardRes.error || "ការទូទាត់ត្រូវបានបដិសេធ សូមពិនិត្យកាតឡើងវិញ");
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
    setLoading(false);

    if (sessionRes.success && sessionRes.data) {
      setKhqrSession(sessionRes.data);
      setShowKHQRModal(true);
      setTimeLeft(900); // 15 mins
      startPaymentPolling(newOrderId);
    } else {
      alert(sessionRes.error || "បរាជ័យក្នុងការបង្កើត KHQR Code");
    }
  };

  // ─── Start Real-time Bank Settlement Polling ──────────────────────────────────
  const startPaymentPolling = (targetOrderId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setPollStatus("checking");

    // 15-minute countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (pollingRef.current) clearInterval(pollingRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll every 3 seconds
    pollingRef.current = setInterval(async () => {
      const statusRes = await checkPaymentStatus(targetOrderId);
      if (statusRes.success && statusRes.data?.paid) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);

        setPollStatus("paid");
        setTransactionId(statusRes.data.transaction_id || `TXN_${Date.now()}`);

        setTimeout(async () => {
          setShowKHQRModal(false);
          await finishSuccessfulOrder(targetOrderId, statusRes.data.transaction_id || "BKG_VERIFIED");
        }, 1200);
      }
    }, 3000);
  };

  // ─── Customer Manual Confirmation Handler ────────────────────────────────────
  const handleManualConfirmPayment = async () => {
    if (!orderId) return;
    setLoading(true);
    setLoadingMsg("កំពុងផ្ទៀងផ្ទាត់ប្រតិបត្តិការ... (Verifying Transaction)");

    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

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

  // ─── Finish Order & Show Done Screen ─────────────────────────────────────────
  const finishSuccessfulOrder = async (finalOrderId: string, txn: string) => {
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
      <div className="bg-white dark:bg-[#12151e] border-b border-gray-200/80 dark:border-white/10 pt-6 pb-4 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
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
            <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-800 dark:text-emerald-300 self-start sm:self-auto shadow-2xs">
              <Lock size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>256-Bit SSL Encrypted & Bank Guaranteed</span>
            </div>
          </div>

          <StepBar step={step} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_430px] gap-8 items-start">
          
          {/* ── LEFT COLUMN: Shipping & Payment ─────────────────────────────── */}
          <div className="space-y-6">

            {/* 1. DELIVERY OPTIONS SECTION */}
            <section className="bg-white dark:bg-[#151922] border border-gray-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center font-bold shadow-2xs">
                    <Truck size={19} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-gray-900 dark:text-white">
                      វិធីសាស្ត្រដឹកជញ្ជូន • Delivery Options
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ជ្រើសរើសតំបន់ទទួលទំនិញរបស់អ្នក ដើម្បីទទួលបានសេវាកម្មរហ័ស
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                {[
                  { 
                    id: "pnompenh", 
                    icon: "🛵",
                    label: "រាជធានីភ្នំពេញ (Phnom Penh)", 
                    sub: "ដឹកជញ្ជូនរហ័សក្នុងថ្ងៃតែមួយ (2–4 Hours Express)", 
                    fee: 2.00,
                    tag: "Fast Express" 
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
                      className={`p-4 rounded-xl text-left transition-all relative border-2 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-[#8B1A1A] bg-red-50/40 dark:bg-red-950/20 dark:border-red-500 shadow-xs"
                          : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{opt.icon}</span>
                          <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                            {opt.tag}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-[#8B1A1A] bg-[#8B1A1A] text-white" : "border-gray-300"
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white mb-0.5">
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {opt.sub}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 font-medium">តម្លៃដឹកជញ្ជូន Fee</span>
                        <span className="text-sm font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                          ${opt.fee.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 2. RECIPIENT INFORMATION FORM */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <User size={14} className="text-[#8B1A1A]" />
                    <span>ព័ត៌មានអ្នកទទួលទំនិញ • Recipient Details</span>
                  </span>
                  {profileAutoFilled && (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>Auto-filled from profile</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      ឈ្មោះអ្នកទទួល (Full Name) *
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ឧ. សុខា ចាន់ (Sokha Chan)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 focus:bg-white outline-none text-gray-900 dark:text-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        លេខទូរស័ព្ទ (Phone Number) *
                      </label>
                      {typeof window !== "undefined" && (window as any).Telegram?.WebApp?.requestContact && (
                        <button
                          type="button"
                          onClick={() => {
                            const tg = (window as any).Telegram?.WebApp;
                            if (tg?.requestContact) {
                              tg.requestContact((ok: boolean, res: any) => {
                                if (ok && (res?.contact?.phone_number || res?.phone_number)) {
                                  const num = res?.contact?.phone_number || res?.phone_number;
                                  setPhone(num);
                                  api.post("/auth/telegram/sync-phone", { phone: num }).catch(() => {});
                                }
                              });
                            }
                          }}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md"
                        >
                          <Smartphone size={11} />
                          <span>យកពី Telegram</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="012 345 678"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 focus:bg-white outline-none text-gray-900 dark:text-white transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      អាសយដ្ឋានដឹកជញ្ជូនលម្អិត (Delivery Address) *
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Live GPS Auto-Locate Button */}
                      <button
                        type="button"
                        onClick={handleGetLiveGPS}
                        disabled={gpsLoading}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs disabled:opacity-60"
                        title="ចាប់យកទីតាំងផ្ទាល់ (Live GPS)"
                      >
                        {gpsLoading ? (
                          <Loader2 size={13} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <LocateFixed size={13} className="text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span>{gpsLoading ? "កំពុងចាប់ទីតាំង..." : "📍 ចាប់យកទីតាំងផ្ទាល់ (Live GPS)"}</span>
                      </button>

                      {/* Telegram Pin Sync Button */}
                      <button
                        type="button"
                        onClick={() => setShowTelegramPinModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-300 text-xs font-bold border border-sky-300 dark:border-sky-800/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                        title="យកពី Telegram Pin / Google Maps"
                      >
                        <Send size={12} className="text-sky-600 dark:text-sky-400 rotate-[-20deg]" />
                        <span>✈️ យកពី Telegram Pin</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <textarea
                      rows={2}
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="ផ្ទះលេខ, ផ្លូវលេខ, សង្កាត់/ឃុំ, ខណ្ឌ/ស្រុក, រាជធានី ឬ ខេត្ត..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 focus:bg-white outline-none text-gray-900 dark:text-white transition-all resize-none shadow-2xs"
                    />
                  </div>

                  {/* GPS & Pin Verified Map Link Pill */}
                  {gpsCoords && (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200 shadow-2xs">
                      <div className="flex items-center gap-2 truncate">
                        <Crosshair size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-mono font-bold">
                          GPS: {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
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

                  {/* Error Notification */}
                  {gpsError && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{gpsError}</span>
                    </div>
                  )}

                  {/* Success Notification */}
                  {locationSuccessMsg && !gpsError && (
                    <div className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>{locationSuccessMsg}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    កំណត់ចំណាំសម្រាប់អ្នកដឹក (Delivery Note / Landmark - Optional)
                  </label>
                  <div className="relative">
                    <FileText size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="ឧ. ផ្ទះរបងពណ៌ស ក្បែរផ្សារទួលទំពូង ឬ ហៅទូរស័ព្ទមុនមកដល់..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 focus:bg-white outline-none text-gray-900 dark:text-white transition-all shadow-2xs"
                    />
                  </div>

                  {/* 1-Click Smart Delivery Note Suggestions Chips */}
                  <div className="mt-2.5">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-500" />
                      <span>កំណត់ចំណាំរហ័ស (Quick Tap Suggestions):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DELIVERY_NOTE_SUGGESTIONS.map((sug) => {
                        const isSelected = deliveryNote.includes(sug.text);
                        return (
                          <button
                            key={sug.id}
                            type="button"
                            onClick={() => handleToggleNoteSuggestion(sug.text)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95 border ${
                              isSelected
                                ? "bg-[#8B1A1A] text-white border-[#8B1A1A] shadow-xs"
                                : "bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10"
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
            <section className="bg-white dark:bg-[#151922] border border-gray-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center font-bold shadow-2xs">
                    <CreditCard size={19} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-gray-900 dark:text-white">
                      វិធីសាស្ត្រទូទាត់ប្រាក់ • Payment Method
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ទូទាត់រហ័សតាមធនាគារក្នុងស្រុក កាតអន្តរជាតិ ឬសាច់ប្រាក់សុទ្ធ
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/50">
                  Real Bank Gateways
                </span>
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
                      className={`p-4 rounded-xl text-left transition-all relative border-2 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? `${pm.theme} shadow-xs border-opacity-100`
                          : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        {pm.icon}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                            {pm.badge}
                          </span>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-[#8B1A1A] bg-[#8B1A1A] text-white" : "border-gray-300"
                          }`}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white">
                          {pm.label}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                          {pm.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── S-Tech Real Wallet Information & Balance Card (when Wallet selected) ── */}
              {payment === "wallet" && (
                <div className="mt-5 p-5 rounded-2xl bg-gradient-to-br from-red-950/20 via-[#11131a] to-[#151922] border border-red-900/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center text-white shadow-md shadow-red-950/50">
                        <Wallet size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <span>កាបូបលុយ S-Tech Real Wallet</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            Direct Balance Pay
                          </span>
                        </h4>
                        <p className="text-[11px] text-gray-400">ទូទាត់ភ្លាមៗដោយគ្មានការរង់ចាំ 100% ស្វ័យប្រវត្តិ</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowWalletTopupModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:brightness-110 text-white text-xs font-black border-none cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-red-950/50"
                    >
                      <Plus size={13} strokeWidth={3} />
                      <span>បញ្ចូលលុយ (Top Up from Bank)</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-gray-400">សមតុល្យកាបូបបច្ចុប្បន្ន:</span>
                      <div className="text-2xl font-black text-white">
                        ${walletBalance.toFixed(2)} USD
                      </div>
                      <div className="text-[11px] text-gray-400">
                        ~ {Math.round(walletBalance * USD_TO_KHR).toLocaleString()} KHR
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      {walletBalance >= Number(total) ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                          <CheckCircle2 size={15} />
                          <span>សមតុល្យគ្រប់គ្រាន់ — អាចចុចបញ្ជាក់ទូទាត់បាន</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                          <AlertCircle size={15} />
                          <span>សមតុល្យខ្វះ ${(Number(total) - walletBalance).toFixed(2)} USD • សូមចុចបញ្ចូលលុយ</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                <div className="mt-4 p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
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

          {/* ── RIGHT COLUMN: Order Summary & Review ────────────────────────── */}
          <div className="space-y-4 sticky top-24">
            <div className="bg-white dark:bg-[#151922] border border-gray-200/90 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-white/5">
                <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span>បញ្ជីទំនិញកុម្ម៉ង់ • Summary</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400">
                    {items.length} មុខ
                  </span>
                </h2>
              </div>

              {/* Items List with Real Images */}
              <div className="space-y-3.5 max-h-72 overflow-y-auto no-scrollbar mb-5 pr-1">
                {items.map((item) => {
                  const itemImg = item.image_url || item.product?.image || item.product?.image_url || (Array.isArray(item.product?.images) ? item.product?.images[0] : null) || "/logo.jpg";

                  return (
                    <div key={item.id} className="flex items-center gap-3 text-xs py-1">
                      <div className="relative w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0 border border-gray-200 dark:border-white/10">
                        <img 
                          src={itemImg} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#8B1A1A] text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                          {item.quantity}
                        </span>
                      </div>

                      <div className="truncate flex-1 min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white truncate text-xs mb-0.5">
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
                    <Ticket size={14} className="text-[#8B1A1A]" />
                    <span>កូដប្រូម៉ូសិន • Promo Code</span>
                  </span>
                  {appliedPromo && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      Applied!
                    </span>
                  )}
                </label>

                {appliedPromo ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
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
                      className="p-1.5 rounded-lg text-emerald-700 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
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
                        placeholder="e.g. STECH20, PROMO"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono font-bold uppercase tracking-wider focus:border-red-500 outline-none text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPromo()}
                        disabled={promoLoading || !promoInput.trim()}
                        className="px-4 py-2 rounded-xl bg-[#8B1A1A] hover:bg-[#6B1010] text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-40 shrink-0"
                      >
                        {promoLoading ? "..." : "Apply"}
                      </button>
                    </div>

                    {/* 1-Click Interactive Promo Suggestions */}
                    <div className="mt-2.5">
                      <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-500" />
                        <span>កូដពិសេសចុចយកភ្លាមៗ (Tap to Apply):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { code: "WELCOME5", label: "🎁 WELCOME5 ($5 Gift)" },
                          { code: "STECH20", label: "STECH20 (20%)" },
                          { code: "PROMO", label: "PROMO (20%)" },
                          { code: "PCHUM", label: "PCHUM (30%)" },
                          { code: "WELCOME", label: "WELCOME ($10)" },
                        ].map((item) => (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => handleApplyPromo(item.code)}
                            disabled={promoLoading}
                            className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-[#8B1A1A] dark:text-red-400 text-[10px] font-extrabold border border-red-200 dark:border-red-800/40 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                          >
                            <Tag size={10} />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

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
                
                <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-black text-gray-900 dark:text-white">ទឹកប្រាក់ត្រូវទូទាត់សរុប</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#8B1A1A] dark:text-red-400 font-mono tracking-tight">
                        {fmtUSD(total)}
                      </div>
                      <div className="text-xs font-bold text-gray-500 font-mono mt-0.5">
                        {fmtKHR(total)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Place Order CTA */}
              <button
                type="button"
                onClick={handlePlaceOrderClick}
                disabled={loading || items.length === 0}
                className="mt-6 w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-700 to-red-600 hover:from-[#721515] hover:to-[#9E2020] text-white font-black text-sm sm:text-base shadow-xl shadow-red-600/25 hover:shadow-2xl hover:shadow-red-600/35 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 active:scale-[0.98] border border-red-500/30 group"
              >
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={18} className="text-white" />
                </div>
                <span className="tracking-wide">
                  {payment === "cod" 
                    ? "បញ្ជាក់ការបញ្ជាទិញ • Place Order COD" 
                    : payment === "visa" 
                    ? `ទូទាត់ ${fmtUSD(total)} ជាមួយ Card` 
                    : `ទូទាត់ ${fmtUSD(total)} ជាមួយ KHQR`}
                </span>
                <ArrowRight size={18} className="shrink-0 group-hover:translate-x-1 transition-transform opacity-90" />
              </button>
            </div>

            {/* Store Assurances Trust Box */}
            <div className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-2xl p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                <Shield size={16} className="text-[#8B1A1A] shrink-0" />
                <span>ធានាផលិតផលសុទ្ធ ១០០% ជាមួយការធានាផ្លូវការ ១ ឆ្នាំពេញ</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                <RefreshCw size={16} className="text-blue-600 shrink-0" />
                <span>គោលការណ៍ប្តូរទំនិញថ្មីក្នុង ៧ ថ្ងៃ ប្រសិនបើមានបញ្ហាបច្ចេកទេស</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                <Smartphone size={16} className="text-emerald-600 shrink-0" />
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
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>

              {/* Authentic ABA KHQR Card Header */}
              <div className="bg-[#E1251B] text-white py-2 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between mb-3 shadow-md">
                <div className="flex items-center gap-1.5">
                  <QrCode size={16} />
                  <span>KHQR • NBC BAKONG</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  UNIVERSAL
                </span>
              </div>

              {/* Account Holder Name */}
              <div className="text-center mb-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {khqrSession.merchant?.bank || "ABA Bank"}
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-wide">
                  {khqrSession.merchant?.name || "ROTANA NOB"}
                </h3>
              </div>

              {/* QR Code Container with ABA/Bakong Emblem */}
              <div className="p-3 bg-white rounded-2xl border-2 border-red-500 inline-block shadow-lg mb-3 relative">
                <img
                  src={khqrSession.qr_image_url}
                  alt="ABA KHQR Payment"
                  className="w-48 h-48 object-contain mx-auto rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white p-1 shadow-lg flex items-center justify-center border-2 border-red-600">
                    <div className="w-full h-full rounded-full bg-[#E1251B] flex items-center justify-center text-white text-[9px] font-black">
                      ABA
                    </div>
                  </div>
                </div>
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
              <div className="bg-red-50/60 dark:bg-red-950/20 rounded-2xl p-3 mb-3 border border-red-200/60 dark:border-red-900/30">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total Payable Amount ទឹកប្រាក់ត្រូវបង់</div>
                <div className="text-2xl font-black text-[#8B1A1A] dark:text-red-400 font-mono">
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
              <div className="space-y-2 mb-3">
                {khqrSession.deeplinks?.universal && (
                  <a
                    href={khqrSession.deeplinks.universal}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 via-[#E1251B] to-rose-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all text-center no-underline shadow-md"
                  >
                    <Smartphone size={14} />
                    <span>Open Bank App ស្កេនស្វ័យប្រវត្ត (1-Tap Pay)</span>
                  </a>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={khqrSession.deeplinks?.universal || khqrSession.deeplinks?.aba || `aba://qr?data=${encodeURIComponent(khqrSession.khqr_string)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-xl bg-[#004B87] hover:bg-[#003866] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center no-underline shadow-xs"
                  >
                    <Smartphone size={13} />
                    <span>ABA Mobile</span>
                  </a>

                  <a
                    href={khqrSession.deeplinks?.universal || khqrSession.deeplinks?.bakong || `bakong://qr?data=${encodeURIComponent(khqrSession.khqr_string)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-xl bg-[#E1251B] hover:bg-[#b81d15] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center no-underline shadow-xs"
                  >
                    <Smartphone size={13} />
                    <span>Bakong App</span>
                  </a>
                </div>
              </div>

              {/* Polling Radar Indicator */}
              <div className="py-2 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  {pollStatus === "checking" ? "កំពុងរង់ចាំការទូទាត់ពីធនាគារ Real-time..." : "ការទូទាត់ទទួលបានជោគជ័យ!"}
                </span>
              </div>

              {/* Confirmation Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleManualConfirmPayment}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>ខ្ញុំបានទូទាត់រួចរាល់ (I Have Paid)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowKHQRModal(false);
                    if (pollingRef.current) clearInterval(pollingRef.current);
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

      {/* ── Telegram Pin / Maps Link Input Modal ── */}
      <AnimatePresence>
        {showTelegramPinModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white dark:bg-[#151922] w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative border border-gray-100 dark:border-white/10"
            >
              <button
                onClick={() => setShowTelegramPinModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <X size={19} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                  <Send size={20} className="rotate-[-20deg]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    យកទីតាំងពី Telegram Pin / Maps
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Paste Shared Pin Link ឬ Coordinates
                  </p>
                </div>
              </div>

              <div className="bg-sky-50/60 dark:bg-sky-950/30 rounded-2xl p-3.5 mb-4 border border-sky-100 dark:border-sky-900/40 text-xs text-sky-950 dark:text-sky-200 leading-relaxed">
                💡 <strong>របៀបប្រើ:</strong> នៅក្នុង Telegram ចុច Share Location &gt; Copy Link ឬ Copy Google Maps Link រួចបិទភ្ជាប់ (Paste) ក្នុងប្រអប់ខាងក្រោម ដើម្បីឱ្យប្រព័ន្ធទាញយកអាសយដ្ឋានដោយស្វ័យប្រវត្តិ។
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Link ទីតាំង ឬ កូអរដោនេ (Coordinates)
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={telegramPinInput}
                      onChange={(e) => setTelegramPinInput(e.target.value)}
                      placeholder="ឧ. https://maps.app.goo.gl/... ឬ 11.5564, 104.9282"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono focus:border-red-500 focus:bg-white outline-none text-gray-900 dark:text-white transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTelegramPinModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="button"
                  onClick={() => handleParseTelegramOrMapLink(telegramPinInput)}
                  disabled={pinParsingLoading || !telegramPinInput.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {pinParsingLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Navigation size={14} />
                  )}
                  <span>{pinParsingLoading ? "កំពុងទាញយក..." : "ផ្ទៀងផ្ទាត់ & បំពេញ"}</span>
                </button>
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
