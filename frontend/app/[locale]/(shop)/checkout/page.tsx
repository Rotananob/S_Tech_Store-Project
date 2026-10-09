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
  confirmManualPayment 
} from "@/lib/services/order.service";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, ShieldCheck, CheckCircle2, Loader2, QrCode, 
  ExternalLink, X, Smartphone, ArrowRight, CreditCard, 
  Clock, Check, RefreshCw, AlertCircle, Sparkles
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import api from "@/lib/api";

const USD_TO_KHR = 4060;
const fmtUSD = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtKHR = (n: number) => `~ ${(Math.round(Number(n || 0) * USD_TO_KHR / 1000) * 1000).toLocaleString()} KHR`;

// ─── Payment Methods ────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id: "bakong",
    label: "Bakong KHQR • All Banks",
    sub: "Scan with ABA, Wing, ACLEDA, or any 36+ Cambodian banks",
    badge: "Universal QR",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#E1251B] flex items-center justify-center text-white font-black text-[10px] shadow-sm tracking-tighter">
        KHQR
      </div>
    ),
  },
  {
    id: "aba",
    label: "ABA PAY • Direct Deeplink",
    sub: "Scan QR or launch ABA Mobile directly on your phone",
    badge: "Direct Deeplink",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#004B87] flex items-center justify-center text-white font-black text-[11px] shadow-sm tracking-tighter">
        ABA
      </div>
    ),
  },
  {
    id: "visa",
    label: "Visa & Mastercard • Credit/Debit",
    sub: "Pay securely with international or local bank card",
    badge: "Card Gateway",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-900 flex items-center justify-center text-white shadow-sm">
        <CreditCard size={17} />
      </div>
    ),
  },
  {
    id: "cod",
    label: "Cash on Delivery • ទូទាត់ពេលទំនិញដល់",
    sub: "Pay in cash upon doorstep delivery by courier",
    badge: "Doorstep",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
        COD
      </div>
    ),
  },
];

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const t = useTranslations("Checkout");
  const steps = [t("stepCart"), t("stepDeliveryPayment"), t("stepDone")];
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  active
                    ? "bg-[#8B1A1A] text-white ring-2 ring-red-200 dark:ring-red-900/40"
                    : done
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500"
                }`}
              >
                {done ? "✓" : idx}
              </div>
              <span
                className={`text-xs font-bold transition-colors ${
                  active
                    ? "text-[#8B1A1A] dark:text-red-400"
                    : done
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="text-gray-300 dark:text-gray-700 mx-1 text-xs">/</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Checkout Page ────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const router = useRouter();
  const { items, fetchCart, clearCart } = useCartStore();

  const [delivery, setDelivery] = useState<"pnompenh" | "province">("pnompenh");
  const [payment, setPayment] = useState("bakong");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [step, setStep] = useState(2);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Processing Order...");
  const [orderId, setOrderId] = useState("");
  const [transactionId, setTransactionId] = useState("");

  // Card payment form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardError, setCardError] = useState("");

  // KHQR Payment Session State
  const [showKHQRModal, setShowKHQRModal] = useState(false);
  const [khqrSession, setKhqrSession] = useState<{
    order_id: string;
    khqr_string: string;
    qr_image_url: string;
    deeplinks: {
      bakong?: string;
      aba?: string;
      wing?: string;
      acleda?: string;
    };
    amount_usd: number;
    amount_khr: number;
  } | null>(null);
  const [pollStatus, setPollStatus] = useState<"checking" | "paid" | "idle">("idle");
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto pre-fill from user authentication & cloud profile
  useEffect(() => {
    fetchCart();
    const unsub = onAuthStateChanged(auth, (user) => {
      const sessionStr = typeof window !== "undefined" ? localStorage.getItem("stech_user_session") : null;
      if (!user && !sessionStr) {
        router.push("/login?redirect=/checkout");
      } else {
        const u = user || (sessionStr ? JSON.parse(sessionStr) : null);
        setName((prev) => prev || u?.displayName || u?.display_name || "");
        if (u?.email) {
          setCardHolder((prev) => prev || (u.displayName || u.display_name || "").toUpperCase());
        }
        api.get("/user/profile").then((res) => {
          if (res.data?.profile) {
            const p = res.data.profile;
            if (p.display_name) setName(p.display_name);
            if (p.phone) setPhone(p.phone);
            if (p.address) setAddress(p.address);
          }
        }).catch(() => {});
      }
    });
    return () => unsub();
  }, [fetchCart, router]);

  // Clean up polling & timers
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const deliveryFee = delivery === "pnompenh" ? 2 : 3;
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const total = subtotal + deliveryFee;

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

  // ─── Initiate Order Placement ────────────────────────────────────────────────
  const handlePlaceOrderClick = async () => {
    const hasAuth = auth.currentUser || (typeof window !== "undefined" && localStorage.getItem("stech_user_session"));
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

    // ── Handle COD ──
    await executeStandardOrder();
  };

  // ─── Execute Standard COD Order ──────────────────────────────────────────────
  const executeStandardOrder = async () => {
    setLoading(true);
    setLoadingMsg("កំពុងបញ្ជូនការបញ្ជាទិញ... (Recording Order)");

    const payload = {
      delivery_type: delivery,
      payment_method: payment,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
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

    const payload = {
      delivery_type: delivery,
      payment_method: "visa",
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
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

    const payload = {
      delivery_type: delivery,
      payment_method: payment,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
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
        <div className="bg-white dark:bg-[#12151e] border-b border-gray-100 dark:border-white/10 py-6">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl font-black">{t("title")}</h1>
            <div className="mt-3"><StepBar step={3} /></div>
          </div>
        </div>

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#151922] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden border border-gray-100 dark:border-white/10"
          >
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-5 shadow-sm ring-4 ring-emerald-50 dark:ring-white/5">
              <CheckCircle2 size={42} strokeWidth={2.5} />
            </div>

            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t("orderConfirmed")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t("orderPlacedSuccess")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Our delivery team will contact <strong className="text-gray-900 dark:text-white font-bold">{phone}</strong> for instant dispatch.
            </p>

            <div className="bg-gray-50 dark:bg-white/5 w-full rounded-2xl p-4 sm:p-5 mb-6 text-left border border-gray-100 dark:border-white/5 space-y-2.5">
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

            <div className="w-full space-y-3">
              <Link
                href="/account/profile"
                className="w-full flex items-center justify-center py-3.5 bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white rounded-xl text-sm font-bold shadow-md transition-all no-underline"
              >
                View Order in Profile
              </Link>
              <Link
                href="/"
                className="w-full flex items-center justify-center py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition-all no-underline"
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
    <div className="bg-gray-50 dark:bg-[#0c0d12] min-h-screen text-gray-900 dark:text-gray-100 pb-36 lg:pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-[#12151e] border-b border-gray-200 dark:border-white/10 pt-6 pb-2">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">{t("title")}</h1>
          <StepBar step={step} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-6 items-start">
          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Delivery Details */}
            <section className="bg-white dark:bg-[#151922] border border-gray-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  🚚
                </div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{t("deliveryDetails")}</h2>
              </div>

              {/* Delivery Type Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {[
                  { id: "pnompenh", label: t("deliveryPhnomPenh"), sub: "Express same-day (2–4 hours)", fee: 2 },
                  { id: "province", label: t("deliveryProvince"), sub: "All 24 Provinces via Logistics (1–2 Days)", fee: 3 },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDelivery(opt.id as typeof delivery)}
                    className={`p-4 rounded-xl text-left transition-all relative border-2 cursor-pointer ${
                      delivery === opt.id
                        ? "border-[#8B1A1A] bg-red-50/50 dark:bg-red-950/20 dark:border-red-500"
                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{opt.label}</p>
                      <span className="text-xs font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                        ${opt.fee.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{opt.sub}</p>
                  </button>
                ))}
              </div>

              {/* Recipient Form Fields */}
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      {t("fullName")} *
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Sokha Chan"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      {t("phoneNumber")} *
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="012 345 678"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    {t("addressMap")} *
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, House number, Khan/Sangkat, City or Province..."
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:border-red-500 outline-none text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Payment Method Selector */}
            <section className="bg-white dark:bg-[#151922] border border-gray-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                    💳
                  </div>
                  <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{t("paymentMethod")}</h2>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                  Real Bank Gateways
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPayment(pm.id)}
                    className={`p-4 rounded-xl text-left transition-all relative border-2 cursor-pointer flex flex-col justify-between ${
                      payment === pm.id
                        ? "border-[#8B1A1A] bg-red-50/50 dark:bg-red-950/20 dark:border-red-500 shadow-sm"
                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      {pm.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                        {pm.badge}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{pm.label}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{pm.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* ── Visa / Mastercard Interactive Card Form ───────────────────────── */}
              {payment === "visa" && (
                <div className="mt-5 p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Credit / Debit Card Details
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Lock size={12} className="text-emerald-500" />
                      <span>256-bit SSL Protected</span>
                    </div>
                  </div>

                  {/* Interactive Card Visualizer */}
                  <div className="mb-5 p-5 rounded-2xl bg-gradient-to-tr from-[#1a1c29] via-[#11131c] to-[#252839] text-white shadow-xl relative overflow-hidden border border-white/10 max-w-sm mx-auto">
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

                  {/* Card Form Inputs */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Card Number (លេខកាត)
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

              {/* Digital Payment Note */}
              {(payment === "aba" || payment === "bakong") && (
                <div className="mt-4 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center gap-3">
                  <QrCode size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">Dynamic KHQR & Deeplink: </span>
                    Scan with any banking app or click direct mobile launcher. Total: <b>{fmtUSD(total)}</b> ({fmtKHR(total)}).
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ── RIGHT COLUMN — Sticky Order Summary ─────────────────────────────────── */}
          <div className="bg-white dark:bg-[#151922] border border-gray-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm sticky top-24">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-4">
              {t("orderSummary")} ({items.length})
            </h2>

            {/* Item list */}
            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="truncate pr-3 flex-1">
                    <div className="font-bold text-gray-900 dark:text-white truncate">{item.name}</div>
                    <div className="text-gray-400">Qty: {item.quantity} × {fmtUSD(item.price)}</div>
                  </div>
                  <div className="font-mono font-bold text-gray-900 dark:text-white shrink-0">
                    {fmtUSD(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 dark:border-white/10 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>{t("subtotal")}</span>
                <span className="font-bold text-gray-900 dark:text-white font-mono">{fmtUSD(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>{t("deliveryFee")}</span>
                <span className="font-bold text-gray-900 dark:text-white font-mono">{fmtUSD(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-white/10">
                <span>{t("orderTotal")}</span>
                <span className="text-[#8B1A1A] dark:text-red-400 font-mono">{fmtUSD(total)}</span>
              </div>
              <div className="text-right text-[11px] text-gray-400">{fmtKHR(total)}</div>
            </div>

            {/* Checkout CTA */}
            <button
              type="button"
              onClick={handlePlaceOrderClick}
              disabled={loading || items.length === 0}
              className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck size={18} />
              <span>
                {payment === "cod" 
                  ? "Place Order • បញ្ជាទិញ" 
                  : payment === "visa" 
                  ? `Pay ${fmtUSD(total)} with Card` 
                  : `Pay ${fmtUSD(total)} with KHQR`}
              </span>
            </button>
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
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* KHQR Header Banner */}
              <div className="bg-[#E1251B] text-white py-1.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider inline-flex items-center gap-1.5 mb-3 shadow-sm">
                <QrCode size={16} />
                <span>NBC BAKONG KHQR</span>
              </div>

              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                S TECH STORE CAMBODIA
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                Scan with ABA Mobile, Bakong, Wing, ACLEDA, or any Cambodian banking app
              </p>

              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl border-2 border-red-500 inline-block shadow-md mb-3 relative">
                <img
                  src={khqrSession.qr_image_url}
                  alt="KHQR Payment"
                  className="w-44 h-44 object-contain mx-auto"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-white p-1 shadow-md flex items-center justify-center border">
                    <img src="/logo.jpg" alt="" className="w-full h-full object-contain rounded-full" />
                  </div>
                </div>
              </div>

              {/* Amount Display */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 mb-4 border border-gray-100 dark:border-white/5">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Total Payable Amount</div>
                <div className="text-2xl font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                  {fmtUSD(khqrSession.amount_usd)}
                </div>
                <div className="text-[11px] text-gray-400 font-medium">{fmtKHR(khqrSession.amount_usd)}</div>
                <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                  <Clock size={11} />
                  <span>Expires in: {formatTimer(timeLeft)}</span>
                </div>
              </div>

              {/* ── 1-Click Mobile Banking Deeplinks ── */}
              <div className="space-y-2 mb-4">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-left pl-1">
                  Or Pay Directly on Mobile:
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* ABA Mobile Deeplink */}
                  <a
                    href={khqrSession.deeplinks.aba || `aba://pay?tran_id=${khqrSession.order_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-[#004B87] hover:bg-[#003866] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center no-underline shadow-sm"
                  >
                    <Smartphone size={13} />
                    <span>ABA Mobile</span>
                  </a>

                  {/* Bakong App Deeplink */}
                  <a
                    href={khqrSession.deeplinks.bakong || `bakong://qr?data=${encodeURIComponent(khqrSession.khqr_string)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-[#E1251B] hover:bg-[#b81d15] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center no-underline shadow-sm"
                  >
                    <Smartphone size={13} />
                    <span>Bakong App</span>
                  </a>
                </div>
              </div>

              {/* Polling Radar Indicator */}
              <div className="py-2 px-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  Waiting for your bank settlement...
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
                  <span>I Have Completed Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowKHQRModal(false);
                    if (pollingRef.current) clearInterval(pollingRef.current);
                  }}
                  className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  Change Payment Method
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
    </div>
  );
}
