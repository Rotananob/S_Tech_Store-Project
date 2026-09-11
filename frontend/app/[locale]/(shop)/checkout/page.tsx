"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cartStore";
import { createOrder } from "@/lib/services/order.service";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";

const USD_TO_KHR = 4060;
const fmtUSD = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtKHR = (n: number) => `~ ${(Math.round(n * USD_TO_KHR / 1000) * 1000).toLocaleString()} KHR`;



// ─── Payment options ───────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id: "aba",
    label: "ABA PAY",
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="6" fill="#fff"/>
        <rect x="6" y="6" width="12" height="12" rx="1" fill="#1a4fa0"/>
        <rect x="9" y="9" width="6" height="6" rx="0.5" fill="#fff"/>
        <rect x="22" y="6" width="12" height="12" rx="1" fill="#1a4fa0"/>
        <rect x="25" y="9" width="6" height="6" rx="0.5" fill="#fff"/>
        <rect x="6" y="22" width="12" height="12" rx="1" fill="#1a4fa0"/>
        <rect x="9" y="25" width="6" height="6" rx="0.5" fill="#fff"/>
        <rect x="22" y="22" width="4" height="4" rx="0.5" fill="#1a4fa0"/>
        <rect x="28" y="22" width="4" height="4" rx="0.5" fill="#1a4fa0"/>
        <rect x="22" y="28" width="4" height="4" rx="0.5" fill="#1a4fa0"/>
        <rect x="28" y="28" width="4" height="4" rx="0.5" fill="#1a4fa0"/>
      </svg>
    ),
  },
  {
    id: "wing",
    label: "Wing",
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="6" fill="#fff"/>
        <path d="M8 28 L14 12 L20 24 L26 12 L32 28" stroke="#1a4fa0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="4" y="26" width="32" height="2" rx="1" fill="#8B1A1A"/>
      </svg>
    ),
  },
  {
    id: "bakong",
    label: "Bakong",
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="6" fill="#fff"/>
        <rect x="6" y="6" width="12" height="12" rx="1" fill="#8B1A1A"/>
        <rect x="9" y="9" width="6" height="6" rx="0.5" fill="#fff"/>
        <rect x="22" y="6" width="12" height="12" rx="1" fill="#8B1A1A"/>
        <rect x="25" y="9" width="6" height="6" rx="0.5" fill="#fff"/>
        <rect x="6" y="22" width="12" height="12" rx="1" fill="#8B1A1A"/>
        <rect x="9" y="25" width="6" height="6" rx="0.5" fill="#fff"/>
        <rect x="22" y="25" width="12" height="4" rx="1" fill="#8B1A1A"/>
      </svg>
    ),
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="6" fill="#fff"/>
        <rect x="6" y="13" width="28" height="18" rx="2" stroke="#1a1a1a" strokeWidth="2" fill="none"/>
        <line x1="6" y1="19" x2="34" y2="19" stroke="#1a1a1a" strokeWidth="2"/>
        <rect x="12" y="23" width="8" height="4" rx="1" fill="#1a4fa0"/>
      </svg>
    ),
  },
];

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const t = useTranslations("Checkout");
  const steps = [t("stepCart"), t("stepDeliveryPayment"), t("stepDone")];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 28 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 12,
                fontWeight: 700, flexShrink: 0,
                background: active ? "#8B1A1A" : done ? "#16a34a" : "transparent",
                border: `2px solid ${active ? "#8B1A1A" : done ? "#16a34a" : "#ccc"}`,
                color: active || done ? "#fff" : "#bbb",
              }}>
                {done ? "✓" : idx}
              </div>
              <span style={{
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? "#8B1A1A" : done ? "#16a34a" : "#bbb",
              }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ color: "#ccc", margin: "0 4px", fontSize: 13 }}>/</span>
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
  const [payment, setPayment] = useState("cod");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [step, setStep] = useState(2);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const deliveryFee = delivery === "pnompenh" ? 2 : 3;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + deliveryFee;

  const handleConfirm = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert(t("alertFillFields"));
      return;
    }
    if (items.length === 0) {
      alert(t("alertEmptyCart"));
      return;
    }

    setLoading(true);
    const payload = {
      delivery_type: delivery,
      payment_method: payment,
      name,
      phone,
      address,
      items: items.map(item => ({
        product_id: item.product?.id || (item as any).product_id || item.id,
        quantity: item.quantity,
        price: item.product?.sale_price ?? item.product?.price ?? item.price
      })),
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: total
    };

    const res = await createOrder(payload);
    
    // Artificial delay to simulate secure payment processing and give peace of mind
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);

    if (res.success) {
      await clearCart();
      
      // Send a notification to the user's account
      try {
        const { default: api } = await import("@/lib/api");
        const { useNotificationStore } = await import("@/store/notificationStore");
        await api.post("/user/notifications", {
          title: "Order Placed Successfully! 📦",
          message: `Your order has been received and is now processing. We will contact you at ${phone} for delivery confirmation.`,
          type: "order",
        });
        useNotificationStore.getState().fetchNotifications();
      } catch (e) {
        console.error("Failed to push notification", e);
      }

      setConfirmed(true);
      setStep(3);
    } else {
      alert(res.error || t("alertFailed"));
    }
  };

  // ─── Done Screen ────────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "24px 0" }}>
          <div className="container">
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a" }}>{t("title")}</h1>
            <div style={{ marginTop: 10 }}><StepBar step={3} /></div>
          </div>
        </div>
        <div className="container" style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{
            background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12,
            padding: "56px 40px", maxWidth: 480, margin: "0 auto",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", background: "#f0fdf4",
              border: "2px solid #86efac", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>{t("orderConfirmed")}</h2>
            <p style={{ fontSize: 14, color: "#777", marginBottom: 4 }}>{t("orderPlacedSuccess")}</p>
            <p style={{ fontSize: 13, color: "#aaa", marginBottom: 28 }}>{t("contactConfirm")} <strong style={{ color: "#1a1a1a" }}>{phone}</strong> {t("toConfirmDelivery")}</p>
            <div style={{ background: "#f9f9f9", borderRadius: 8, padding: "16px 20px", marginBottom: 28, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#777" }}>{t("orderTotal")}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#8B1A1A" }}>{fmtUSD(total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#777" }}>{t("payment")}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                  {PAYMENT_METHODS.find(p => p.id === payment)?.label}
                </span>
              </div>
            </div>
            <Link href="/" style={{
              display: "block", padding: "12px", background: "#8B1A1A",
              color: "#fff", borderRadius: 6, fontWeight: 700, fontSize: 14,
              textDecoration: "none", textAlign: "center",
            }}>{t("backToHome")}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "24px 0 0" }}>
        <div className="container">
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a", marginBottom: 12 }}>{t("title")}</h1>
          <StepBar step={step} />
        </div>
      </div>

      <div className="container" style={{ padding: "28px 16px" }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Delivery Details */}
            <section style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a4fa0" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>{t("deliveryDetails")}</h2>
              </div>

              {/* Delivery Type Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {[
                  { id: "pnompenh", label: t("deliveryPhnomPenh"), sub: "Delivered within 2–4 hours", fee: 2 },
                  { id: "province", label: t("deliveryProvince"), sub: "Vireak Buntham / J&T (1–2 Days)", fee: 3 },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setDelivery(opt.id as typeof delivery)}
                    style={{
                      padding: "14px 16px", border: `2px solid ${delivery === opt.id ? "#1a4fa0" : "#e5e5e5"}`,
                      borderRadius: 8, background: delivery === opt.id ? "#f0f5ff" : "#fff",
                      cursor: "pointer", textAlign: "left", transition: "all 150ms", position: "relative",
                    }}>
                    <div style={{
                      position: "absolute", top: 12, right: 12, width: 18, height: 18,
                      borderRadius: "50%", border: `2px solid ${delivery === opt.id ? "#1a4fa0" : "#ccc"}`,
                      background: delivery === opt.id ? "#1a4fa0" : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {delivery === opt.id && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 3, paddingRight: 24 }}>{opt.label}</p>
                    <p style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{opt.sub}</p>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#8B1A1A" }}>
                      ${opt.fee.toFixed(2)} / {(opt.fee * USD_TO_KHR).toLocaleString()} KHR
                    </span>
                  </button>
                ))}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>{t("fullName")}</label>
                  <input
                    id="checkout-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t("fullName")}
                    style={{
                      width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0",
                      borderRadius: 6, fontSize: 14, color: "#1a1a1a", outline: "none",
                      background: "#fafafa", transition: "border-color 150ms",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#1a4fa0")}
                    onBlur={e => (e.target.style.borderColor = "#e0e0e0")}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>{t("phoneNumber")}</label>
                  <input
                    id="checkout-phone"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={t("phoneNumber")}
                    style={{
                      width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0",
                      borderRadius: 6, fontSize: 14, color: "#1a1a1a", outline: "none",
                      background: "#fafafa", transition: "border-color 150ms",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#1a4fa0")}
                    onBlur={e => (e.target.style.borderColor = "#e0e0e0")}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>{t("addressMap")}</label>
                <textarea
                  id="checkout-address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder={t("addressPlaceholder")}
                  rows={3}
                  style={{
                    width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0",
                    borderRadius: 6, fontSize: 14, color: "#1a1a1a", outline: "none",
                    background: "#fafafa", resize: "vertical", fontFamily: "inherit",
                    transition: "border-color 150ms",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#1a4fa0")}
                  onBlur={e => (e.target.style.borderColor = "#e0e0e0")}
                />
              </div>
            </section>

            {/* Payment Method */}
            <section style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a4fa0" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>{t("paymentMethod")}</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.id} onClick={() => setPayment(pm.id)}
                    style={{
                      padding: "16px 10px", border: `2px solid ${payment === pm.id ? "#1a4fa0" : "#e5e5e5"}`,
                      borderRadius: 8, background: payment === pm.id ? "#f0f5ff" : "#fff",
                      cursor: "pointer", textAlign: "center", transition: "all 150ms",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      position: "relative",
                    }}>
                    <div style={{
                      position: "absolute", top: 8, right: 8, width: 16, height: 16,
                      borderRadius: "50%", border: `2px solid ${payment === pm.id ? "#1a4fa0" : "#ccc"}`,
                      background: payment === pm.id ? "#1a4fa0" : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {payment === pm.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    {pm.icon}
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{pm.label}</span>
                  </button>
                ))}
              </div>

              {/* QR hint for digital payment */}
              {payment !== "cod" && (
                <div style={{
                  marginTop: 16, padding: "12px 16px", background: "#f5f8ff",
                  border: "1px solid #bfdbfe", borderRadius: 6,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{ fontSize: 13, color: "#3b82f6" }}>
                    {t("qrHint")}{" "}
                    <strong>{PAYMENT_METHODS.find(p => p.id === payment)?.label}</strong>.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* ── RIGHT COLUMN — Order Summary ─────────────────────────────────── */}
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24, position: "sticky", top: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 18 }}>{t("orderSummary")}</h2>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
              {items.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{item.name}</p>
                    <p style={{ fontSize: 11, color: "#aaa" }}>{t("qty")} {item.quantity}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap" }}>
                    {fmtUSD(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: 14, marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#777" }}>{t("subtotal")}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{fmtUSD(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#777" }}>{t("deliveryFee")}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{fmtUSD(deliveryFee)}</span>
              </div>
            </div>

            {/* Total */}
            <div style={{ borderTop: "2px solid #e5e5e5", paddingTop: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>{t("total")}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#8B1A1A" }}>{fmtUSD(total)}</div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>{fmtKHR(total)}</div>
                </div>
              </div>
            </div>

            {/* Confirm Button (Desktop) */}
            <div className="hidden lg:block">
              <button
                id="confirm-order-btn"
                onClick={handleConfirm}
                disabled={loading || items.length === 0}
                style={{
                  width: "100%", padding: "14px", fontSize: 15, fontWeight: 800,
                  background: loading || items.length === 0 ? "#ccc" : "#8B1A1A", color: "#fff", border: "none", borderRadius: 8,
                  cursor: loading || items.length === 0 ? "not-allowed" : "pointer", letterSpacing: ".03em", transition: "background 150ms",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginBottom: 12,
                }}
                onMouseEnter={e => { if (!loading && items.length > 0) e.currentTarget.style.background = "#6B1010"; }}
                onMouseLeave={e => { if (!loading && items.length > 0) e.currentTarget.style.background = "#8B1A1A"; }}
              >
                {t("confirmOrder")}
                <ShieldCheck size={18} />
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#777" }}>
                <Lock size={14} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t("secureCheckout")} - 256-bit SSL</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Mobile Checkout Bar */}
      {!confirmed && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
          <div>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{t("total")}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#8B1A1A", fontFamily: "monospace", lineHeight: 1 }}>
              {fmtUSD(total)}
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={loading || items.length === 0}
            className="flex-1 max-w-[220px] text-center rounded-xl py-3 px-4 text-white font-bold transition-all border-none flex justify-center items-center gap-2"
            style={{ 
              background: loading || items.length === 0 ? "#ccc" : "#8B1A1A",
              boxShadow: loading || items.length === 0 ? "none" : "0 4px 12px rgba(139,26,26,0.3)"
            }}
          >
            {t("confirmOrder")} <ShieldCheck size={18} />
          </button>
        </div>
      )}

      {/* Processing Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <h3 className="text-xl font-black text-[#1a1a1a] mb-2">Processing Order...</h3>
              <p className="text-sm text-gray-500 mb-6">Please do not close this window. Securing payment and confirming stock.</p>
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-4 py-2 rounded-lg w-full">
                <Lock size={14} /> 256-bit Secure Encryption
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
