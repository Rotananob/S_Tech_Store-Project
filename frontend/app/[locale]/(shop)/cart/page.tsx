"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Trash2, Lock, Truck, ArrowRight, Check } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/translations";
import { useTranslations } from "next-intl";
import { getCart, updateCartItem, removeFromCart } from "@/lib/services/cart.service";
import { CartItem } from "@/types";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const { items, fetchCart, updateQuantity, removeItem } = useCartStore();

  useEffect(() => {
    setMounted(true);
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchCart();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateQuantity = async (id: number, quantity: number) => {
    try {
      await updateQuantity(id, quantity);
    } catch (e) {
      console.error("Failed to update quantity", e);
    }
  };

  const handleRemoveItem = async (id: number) => {
    try {
      await removeItem(id);
    } catch (e) {
      console.error("Failed to remove item", e);
    }
  };

  const subtotal = items.reduce((acc, item) => {
    const price = item.product?.sale_price ?? item.product?.price ?? item.price;
    return acc + price * item.quantity;
  }, 0);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  const { lang } = useLangStore();
  const t = useTranslations("Cart");

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#fdfdfd" }} />;
  }

  return (
    <div style={{ background: "#fdfdfd", minHeight: "100vh", color: "#1a1a1a" }}>
      <div className="container" style={{ paddingTop: "24px", paddingBottom: "120px" }}>
        
        {/* ── Checkout Stepper ────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", fontWeight: "600", color: "#888" }}>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a92020" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#a92020", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                1
              </div>
              {t('cartStep')}
            </div>
            
            <span>›</span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                2
              </div>
              {t('deliveryStep')}
            </div>

            <span>›</span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                3
              </div>
              {t('paymentStep')}
            </div>

            <span>›</span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                4
              </div>
              {t('doneStep')}
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">
          
          {/* LEFT — Cart Items */}
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "36px", fontWeight: "700", marginBottom: "32px", color: "#111" }}>
              {t('title')}
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {items.map((item) => {
                const price = item.product?.sale_price ?? item.product?.price ?? item.price;
                const name = item.product?.name ?? item.name;
                const image = item.product?.image ?? item.image_url;
                
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row border border-[#eaeaea] bg-white p-4 rounded-md gap-4 sm:gap-0"
                  >
                    <div style={{ width: "100px", height: "100px", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", flexShrink: 0, marginRight: "20px" }}>
                      <img src={image || ""} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111", marginBottom: "6px" }}>{name}</h3>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#111", fontFamily: "monospace" }}>
                        ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: "3px", overflow: "hidden" }}>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            style={{ width: "28px", height: "28px", background: "white", border: "none", borderRight: "1px solid #ddd", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}
                          >
                            -
                          </button>
                          <div style={{ width: "32px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "600", background: "white" }}>
                            {item.quantity}
                          </div>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            style={{ width: "28px", height: "28px", background: "white", border: "none", borderLeft: "1px solid #ddd", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}
                          >
                            +
                          </button>
                        </div>

                        <button onClick={() => handleRemoveItem(item.id)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div style={{ padding: "48px", textAlign: "center", border: "1px solid #eaeaea", background: "white", borderRadius: "4px" }}>
                  <p style={{ fontSize: "15px", color: "#666", marginBottom: "16px" }}>Your cart is empty.</p>
                  <Link href="/category/laptops" className="btn-outline-blue">
                    Continue Shopping
                  </Link>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT — Order Summary */}
          <div className="bg-[#fafbfd] border border-[#dbe3ed] p-6 rounded-md lg:mt-[78px]">
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>
              {t('orderSummary')}
            </h2>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "14px", color: "#555" }}>
              <span>{t('subtotal')} ({totalItems} items)</span>
              <span style={{ fontWeight: "700", color: "#111" }}>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#555" }}>
              <span>{t('delivery')}</span>
              <span style={{ fontWeight: "700", color: "#111" }}>{t('free')}</span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", color: "#2563eb", fontSize: "12px", fontWeight: "500", marginBottom: "24px" }}>
              <Truck size={14} />
              {t('sameDayPhnomPenh')}
            </div>

            <div style={{ height: "1px", background: "#dbe3ed", marginBottom: "24px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#111", marginTop: "4px" }}>{t('total')}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#a92020", fontFamily: "monospace" }}>
                  ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                  {formatKHR(subtotal)}
                </div>
              </div>
            </div>

            <button
              style={{
                width: "100%",
                background: "#a92020",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "14px",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                marginBottom: "16px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#8b1a1a")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#a92020")}
            >
              {t('proceedToCheckout')}
              <ArrowRight size={16} />
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", color: "#888" }}>
              <Lock size={12} />
              {t('secureCheckout')}
            </div>
          </div>
        </div>

      </div>

      {/* Sticky Mobile Checkout Bar — visible only on mobile */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
          <div>
            <div style={{ fontSize: 11, color: "#888" }}>{totalItems} item(s)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#a92020", fontFamily: "monospace" }}>
              ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <Link href="/checkout" className="btn-red flex-1 max-w-[200px] text-center rounded-full py-3 px-6"
            style={{ fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            {t("proceedToCheckout")}
          </Link>
        </div>
      )}
    </div>
  );
}
