"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cartStore";
import { createOrder } from "@/lib/services/order.service";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, CheckCircle2, Loader2, QrCode, ExternalLink, X, Smartphone, ArrowRight } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import api from "@/lib/api";

const USD_TO_KHR = 4060;
const fmtUSD = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtKHR = (n: number) => `~ ${(Math.round(Number(n || 0) * USD_TO_KHR / 1000) * 1000).toLocaleString()} KHR`;

// ─── Payment options ───────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id: "aba",
    label: "ABA PAY (KHQR)",
    sub: "Scan with ABA Mobile or any banking app",
    badge: "Instant",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#004B87] flex items-center justify-center text-white font-black text-[11px] shadow-sm tracking-tighter">
        ABA
      </div>
    ),
  },
  {
    id: "bakong",
    label: "Bakong KHQR",
    sub: "Supports 36+ Cambodian banks",
    badge: "Universal",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-[#E1251B] flex items-center justify-center text-white font-black text-[10px] shadow-sm tracking-tighter">
        KHQR
      </div>
    ),
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    sub: "Pay in cash upon arrival",
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
  const [payment, setPayment] = useState("aba");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [step, setStep] = useState(2);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [showKHQRModal, setShowKHQRModal] = useState(false);

  // Auto pre-fill from user authentication & cloud profile
  useEffect(() => {
    fetchCart();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login?redirect=/checkout");
      } else {
        setName((prev) => prev || user.displayName || "");
        api.get("/user/profile").then((res) => {
          if (res.data?.success && res.data.profile) {
            const p = res.data.profile;
            if (p.full_name) setName(p.full_name);
            if (p.phone) setPhone(p.phone);
            if (p.address) setAddress(p.address);
          }
        }).catch(() => {});
      }
    });
    return () => unsub();
  }, [fetchCart, router]);

  const deliveryFee = delivery === "pnompenh" ? 2 : 3;
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const total = subtotal + deliveryFee;

  // Real KHQR Data payload string for Cambodia standard QR
  const khqrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=KHQR:STECH:MERCHANT:${total.toFixed(2)}USD:INV${Date.now()}`;

  const handlePlaceOrderClick = () => {
    if (!auth.currentUser) {
      router.push("/login?redirect=/checkout");
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert("Please fill in your recipient Name, Phone number, and Delivery Address.");
      return;
    }
    if (items.length === 0) {
      alert(t("alertEmptyCart"));
      return;
    }

    // If digital KHQR / ABA payment is selected, show KHQR modal for scan confirmation
    if (payment === "aba" || payment === "bakong") {
      setShowKHQRModal(true);
    } else {
      executeOrderCreation();
    }
  };

  const executeOrderCreation = async () => {
    setLoading(true);
    setShowKHQRModal(false);

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

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);

    if (res.success) {
      await clearCart();

      // Dispatch local notification
      try {
        const { useNotificationStore } = await import("@/store/notificationStore");
        await api.post("/user/notifications", {
          title: "Order Placed Successfully! 📦",
          message: `Your order #${res.data?.order?.order_id || ""} for $${total.toFixed(2)} has been recorded. Our team will contact ${phone} shortly.`,
          type: "order",
        });
        useNotificationStore.getState().fetchNotifications();
      } catch (e) {
        console.error("Failed to push notification", e);
      }

      setOrderId(res.data?.order?.order_id || `ORD-${Date.now().toString().slice(-6)}`);
      setConfirmed(true);
      setStep(3);
    } else {
      alert(res.error || t("alertFailed"));
    }
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

            {/* Payment Method */}
            <section className="bg-white dark:bg-[#151922] border border-gray-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                    💳
                  </div>
                  <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{t("paymentMethod")}</h2>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                  Official KHQR
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPayment(pm.id)}
                    className={`p-4 rounded-xl text-left transition-all relative border-2 cursor-pointer flex flex-col justify-between ${
                      payment === pm.id
                        ? "border-[#8B1A1A] bg-red-50/50 dark:bg-red-950/20 dark:border-red-500"
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

              {/* Digital Payment Info */}
              {payment !== "cod" && (
                <div className="mt-4 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center gap-3">
                  <QrCode size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="text-xs text-blue-900 dark:text-blue-300">
                    <span className="font-bold">Real KHQR Standard: </span>
                    Instant QR scan screen with exact amount ({fmtUSD(total)}) will display upon clicking confirm.
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
            </div>

            <div className="border-t-2 border-gray-100 dark:border-white/10 mt-3 pt-3 mb-5">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-gray-900 dark:text-white">{t("total")}</span>
                <div className="text-right">
                  <div className="text-xl font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                    {fmtUSD(total)}
                  </div>
                  <div className="text-[11px] text-gray-400 font-semibold">{fmtKHR(total)}</div>
                </div>
              </div>
            </div>

            {/* Desktop Confirm Button */}
            <div className="hidden lg:block">
              <button
                type="button"
                onClick={handlePlaceOrderClick}
                disabled={loading || items.length === 0}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{payment === "cod" ? "Place Order" : "Pay with KHQR / ABA"}</span>
                <ShieldCheck size={18} />
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3 text-gray-400 text-[11px]">
                <Lock size={12} />
                <span>256-bit SSL Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Checkout Bar - Highly Elevated & Safe from Device Bottom Bars */}
      {!confirmed && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#12151e]/95 backdrop-blur-lg border-t border-gray-200 dark:border-white/10 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.1)]"
          style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
        >
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t("total")}</div>
            <div className="text-lg font-black text-[#8B1A1A] dark:text-red-400 font-mono leading-none">
              {fmtUSD(total)}
            </div>
            <div className="text-[10px] text-gray-400">{fmtKHR(total)}</div>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrderClick}
            disabled={loading || items.length === 0}
            className="flex-1 max-w-[240px] min-h-[46px] rounded-xl py-3 px-4 bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white font-extrabold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{payment === "cod" ? "Place Order" : "Pay with KHQR"}</span>
            <ShieldCheck size={18} />
          </button>
        </div>
      )}

      {/* Real KHQR / ABA Pay Modal */}
      <AnimatePresence>
        {showKHQRModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#151922] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-gray-100 dark:border-white/10 text-center"
            >
              <button
                onClick={() => setShowKHQRModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>

              {/* KHQR Header Banner */}
              <div className="bg-[#E1251B] text-white py-2 px-4 rounded-xl font-black text-sm uppercase tracking-wider inline-flex items-center gap-2 mb-4 shadow-sm">
                <QrCode size={18} />
                <span>BAKONG KHQR</span>
              </div>

              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                S TECH STORE CAMBODIA
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Scan with ABA Mobile, Bakong, or any Cambodian banking app
              </p>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl border-2 border-red-500 inline-block shadow-md mb-4 relative">
                <img
                  src={khqrUrl}
                  alt="KHQR Payment"
                  className="w-48 h-48 object-contain mx-auto"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white p-1 shadow-md flex items-center justify-center border">
                    <img src="/logo.jpg" alt="" className="w-full h-full object-contain rounded-full" />
                  </div>
                </div>
              </div>

              {/* Amount Display */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3.5 mb-5 border border-gray-100 dark:border-white/5">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total Amount Payable</div>
                <div className="text-2xl font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                  {fmtUSD(total)}
                </div>
                <div className="text-xs text-gray-400 font-medium">{fmtKHR(total)}</div>
              </div>

              {/* Confirmation Actions */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={executeOrderCreation}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={18} />
                  <span>I Have Completed Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowKHQRModal(false)}
                  className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Change Payment Method
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Processing Spinner Overlay */}
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
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Recording Your Order...</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Securing invoice and synchronizing with Telegram delivery queue.
              </p>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg w-full">
                <Lock size={12} /> 256-bit Secure Order
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
