"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import api from "@/lib/api";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user);
      if (user) {
        api
          .get("/user/orders")
          .then((res) => setOrders(res.data || []))
          .catch(() => setOrders([]))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const fmtUSD = (n: number) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
