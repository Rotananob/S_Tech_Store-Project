"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import api from "@/lib/api";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { isUserAuthenticated, getEffectiveUser } from "@/lib/auth-user";
import OrderReceiptModal, { ReceiptData } from "@/components/orders/OrderReceiptModal";
import { Printer } from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  processing: { bg: "#dbeafe", color: "#1e40af", label: "Processing" },
  shipped: { bg: "#e9d5ff", color: "#6b21a8", label: "Shipped" },
  delivered: { bg: "#dcfce7", color: "#166534", label: "Delivered" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
};

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: { name: string; image?: string };
}

interface Order {
  id: number;
  order_id: string;
  status: string;
  total_amount: number;
  payment_method: string | null;
  delivery_type: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(() => {
    if (typeof window !== "undefined") {
      return isUserAuthenticated() || Boolean(
        localStorage.getItem("stech_user_session") ||
        localStorage.getItem("user_session") ||
        localStorage.getItem("stech_user_token") ||
        localStorage.getItem("customer_token")
      );
    }
    return null;
  });
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleViewReceipt = (order: Order) => {
    const isCOD = (order.payment_method || "").toLowerCase() === "cod";
    const receipt: ReceiptData = {
      orderId: order.order_id,
      customerName: order.customer_name || "Customer",
      customerPhone: order.customer_phone || "",
      shippingAddress: order.shipping_address || "",
      deliveryType: order.delivery_type || "pnompenh",
      paymentMethod: order.payment_method || "cod",
      paymentStatus: order.status === "cancelled" ? "cancelled" : (isCOD ? "cod" : "paid"),
      items: (order.items || []).map((i) => ({
        id: i.id,
        name: i.product?.name || `Tech Item #${i.product_id}`,
        quantity: i.quantity,
        price: i.unit_price,
        image: i.product?.image,
      })),
      subtotal: Number(order.total_amount) > 3 ? Number(order.total_amount) - 2 : Number(order.total_amount),
      deliveryFee: order.delivery_type === "province" ? 3 : 2,
      total: Number(order.total_amount),
      paidAt: fmtDate(order.created_at),
    };
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const hasActiveClientSession = (): boolean => {
    if (typeof window === "undefined") return false;
    if (isUserAuthenticated()) return true;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tg_token") || urlParams.get("token")) return true;
      if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) return true;
      if (
        localStorage.getItem("stech_user_session") ||
        localStorage.getItem("user_session") ||
        localStorage.getItem("stech_user_token") ||
        localStorage.getItem("customer_token")
      ) {
        return true;
      }
    } catch (e) {}
    return false;
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/orders");
      const list = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
      setOrders(list);
      setLoggedIn(true);

      // Auto-open specific order receipt if query param order_id matches
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get("order_id") || window.location.hash.replace("#", "");
        if (targetId) {
          const match = list.find((o: Order) => o.order_id === targetId || String(o.id) === targetId);
          if (match) {
            handleViewReceipt(match);
          }
        }
      }
    } catch (e: any) {
      if (e?.response?.status === 401 && !hasActiveClientSession()) {
        setLoggedIn(false);
      } else {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check for immediate client-side session (Telegram Mini App, 1-Click token, or local storage)
    if (hasActiveClientSession()) {
      setLoggedIn(true);
      fetchOrders();
    }

    // 2. Listen to Firebase auth state with grace period to prevent false logout flash
    const auth = getAuth();
    let timeoutId: NodeJS.Timeout | null = null;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (timeoutId) clearTimeout(timeoutId);
        setLoggedIn(true);
        fetchOrders();
      } else {
        // Firebase reported null initially. Check client session before declaring logged out
        timeoutId = setTimeout(() => {
          if (!hasActiveClientSession() && !auth.currentUser) {
            setLoggedIn(false);
            setLoading(false);
          }
        }, 800);
      }
    });

    // 3. Listen to TelegramAuthBridge 1-click token auto-login events
    const handleSessionUpdated = () => {
      setLoggedIn(true);
      fetchOrders();
    };
    window.addEventListener("user_session_updated", handleSessionUpdated);

    return () => {
      unsub();
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("user_session_updated", handleSessionUpdated);
    };
  }, []);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const fmtUSD = (n: number) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* ── Official Invoice / Receipt Modal ── */}
      <OrderReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={selectedReceipt}
      />

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
          padding: "64px 0 48px",
          textAlign: "center",
        }}
      >
        <div className="container">
          <h1 style={{ fontSize: 42, fontWeight: 900, color: "#fff", marginBottom: 10, letterSpacing: "-0.02em" }}>
            My Orders
          </h1>
          <p className="font-khmer" style={{ fontSize: 16, color: "rgba(255,255,255,0.55)" }}>
            ការបញ្ជាទិញរបស់ខ្ញុំ
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "40px 24px 64px" }}>
        {/* Not logged in */}
        {loggedIn === false && (
          <div
            style={{
              maxWidth: 440,
              margin: "0 auto",
              textAlign: "center",
              padding: 48,
              background: "#f9f9f9",
              borderRadius: 12,
              border: "1px solid #e5e5e5",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>
              Please sign in
            </h2>
            <p style={{ fontSize: 14, color: "#777", marginBottom: 24, lineHeight: 1.7 }}>
              You need to be logged in to view your orders.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                padding: "12px 32px",
                background: "#8B1A1A",
                color: "#fff",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Loading */}
        {loggedIn && loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 120,
                  borderRadius: 10,
                  background: "#f3f3f3",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {loggedIn && !loading && orders.length === 0 && (
          <div
            style={{
              maxWidth: 440,
              margin: "0 auto",
              textAlign: "center",
              padding: 48,
              background: "#f9f9f9",
              borderRadius: 12,
              border: "1px solid #e5e5e5",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛍️</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>
              No orders yet
            </h2>
            <p style={{ fontSize: 14, color: "#777", marginBottom: 24, lineHeight: 1.7 }}>
              You haven&apos;t placed any orders. Start shopping and your orders will appear here.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "12px 32px",
                background: "#8B1A1A",
                color: "#fff",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Start Shopping
            </Link>
          </div>
        )}

        {/* Order list */}
        {loggedIn && !loading && orders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {orders.map((order) => {
              const st = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
              return (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 10,
                    padding: 24,
                    transition: "box-shadow 200ms, transform 200ms",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.08)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLDivElement).style.transform = "none";
                  }}
                >
                  {/* Top row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>
                        {order.order_id}
                      </span>
                      <span style={{ fontSize: 13, color: "#999", marginLeft: 12 }}>
                        {fmtDate(order.created_at)}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: "5px 14px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background: st.bg,
                        color: st.color,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                        Total
                      </p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#8B1A1A" }}>
                        {fmtUSD(order.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                        Items
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
                        {order.items?.length || 0} product{(order.items?.length || 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                        Payment
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>
                        {order.payment_method ? order.payment_method.toUpperCase() : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                        Delivery
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>
                        {order.delivery_type === "pnompenh" ? "Phnom Penh" : order.delivery_type === "province" ? "Province" : order.delivery_type || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: "1px solid #f0f0f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#888" }}>
                      Official Electronic Proof of Purchase
                    </span>
                    <button
                      type="button"
                      onClick={() => handleViewReceipt(order)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        background: "#f3f4f6",
                        color: "#1f2937",
                        border: "1px solid #e5e7eb",
                        cursor: "pointer",
                        transition: "all 150ms",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#8B1A1A";
                        e.currentTarget.style.color = "#fff";
                        e.currentTarget.style.borderColor = "#8B1A1A";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f3f4f6";
                        e.currentTarget.style.color = "#1f2937";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                      }}
                    >
                      <Printer size={13} />
                      <span>View & Print Receipt (វិក្កយបត្រ)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
