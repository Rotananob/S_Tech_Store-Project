import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USD_TO_KHR = 4060;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderIdParam = searchParams.get("order_id") || searchParams.get("id") || "";
    const cleanId = orderIdParam.replace(/^#/, "").trim();

    let orderData: any = null;

    if (cleanId && cleanId !== "sample") {
      const backendUrl =
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "https://stech-backend-xz6j.onrender.com";

      try {
        const res = await fetch(`${backendUrl}/api/orders/${encodeURIComponent(cleanId)}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.order) {
            orderData = json.order;
          }
        }
      } catch (err) {
        console.error("Failed to fetch order for invoice image:", err);
      }
    }

    // Default / Fallback sample data if order not in DB or for test preview
    const orderId = orderData?.order_id || (cleanId ? `#${cleanId}` : "#ORD-SAMPLE");
    const customerName = orderData?.customer_name || "Valued Customer / អតិថិជន";
    const customerPhone = orderData?.customer_phone || "+855 12 345 678";
    const shippingAddress = orderData?.shipping_address || "Phnom Penh, Cambodia";
    const paymentMethod = (orderData?.payment_method || "Bakong KHQR").toUpperCase();
    const paymentStatus = (orderData?.payment_status || "PAID").toUpperCase();
    const createdAt = orderData?.created_at ? new Date(orderData.created_at) : new Date();
    const formattedDate = createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const items =
      orderData?.items && orderData.items.length > 0
        ? orderData.items.map((it: any) => ({
            name: it.product?.name || it.name || "S Tech Product",
            qty: Number(it.quantity || 1),
            price: Number(it.unit_price || it.price || 0),
            total: Number(it.total_price || (it.quantity || 1) * (it.unit_price || it.price || 0)),
          }))
        : [
            {
              name: "MacBook Pro M3 Max / Laptop Gaming",
              qty: 1,
              price: Number(orderData?.total_amount || 1899.0),
              total: Number(orderData?.total_amount || 1899.0),
            },
          ];

    const subtotal = items.reduce((acc: number, cur: any) => acc + cur.total, 0);
    const deliveryFee = Number(orderData?.delivery_fee || 0);
    const discount = Number(orderData?.discount_amount || 0);
    const grandTotal = Number(orderData?.total_amount || subtotal + deliveryFee - discount);
    const grandTotalKHR = Math.round((grandTotal * USD_TO_KHR) / 1000) * 1000;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=https://www.s-tech-store.tech/orders?verify=${encodeURIComponent(
      orderId
    )}`;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f8fafc",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "36px",
            boxSizing: "border-box",
          }}
        >
          {/* Main Card Container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05)",
              padding: "36px",
              flex: 1,
              justifyContent: "space-between",
            }}
          >
            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #f1f5f9", paddingBottom: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      backgroundColor: "#8B1A1A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: "24px",
                      fontWeight: 900,
                    }}
                  >
                    S
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
                      S TECH STORE
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#8B1A1A", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Official Tech &amp; Gaming Hub
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Phnom Penh, Cambodia • Hotline: 012 345 678 / 087 986 045
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Website: www.s-tech-store.tech
                </span>
              </div>

              {/* Invoice Title & Badge */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
                  INVOICE
                </span>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#8B1A1A", fontFamily: "monospace", marginTop: "2px" }}>
                  {orderId}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "8px",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    backgroundColor: paymentStatus === "PAID" ? "#dcfce7" : "#fef3c7",
                    border: `1px solid ${paymentStatus === "PAID" ? "#86efac" : "#fde047"}`,
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: paymentStatus === "PAID" ? "#16a34a" : "#d97706",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: paymentStatus === "PAID" ? "#15803d" : "#b45309",
                      textTransform: "uppercase",
                    }}
                  >
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Bill To & Info Strip ── */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", marginBottom: "20px", backgroundColor: "#f8fafc", padding: "16px 20px", borderRadius: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", maxWidth: "55%" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Bill To / អតិថិជន
                </span>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b" }}>
                  {customerName}
                </span>
                <span style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                  Tel: {customerPhone}
                </span>
                <span style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  {shippingAddress}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Order Details / ព័ត៌មានកុម្ម៉ង់
                </span>
                <span style={{ fontSize: "12px", color: "#475569" }}>
                  Date: <strong style={{ color: "#0f172a" }}>{formattedDate}</strong>
                </span>
                <span style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                  Payment: <strong style={{ color: "#0f172a" }}>{paymentMethod}</strong>
                </span>
                <span style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                  Delivery: <strong style={{ color: "#0f172a" }}>Express Direct</strong>
                </span>
              </div>
            </div>

            {/* ── Items Table ── */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {/* Table Header */}
              <div style={{ display: "flex", backgroundColor: "#0f172a", color: "#ffffff", padding: "10px 16px", borderRadius: "10px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                <span style={{ flex: 5 }}>Item Description</span>
                <span style={{ flex: 1, textAlign: "center" }}>Qty</span>
                <span style={{ flex: 2, textAlign: "right" }}>Price</span>
                <span style={{ flex: 2, textAlign: "right" }}>Total</span>
              </div>

              {/* Table Rows */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {items.slice(0, 5).map((it: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      padding: "12px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "13px",
                      color: "#334155",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ flex: 5, fontWeight: 700, color: "#0f172a" }}>
                      {it.name}
                    </span>
                    <span style={{ flex: 1, textAlign: "center", fontWeight: 600 }}>
                      {it.qty}
                    </span>
                    <span style={{ flex: 2, textAlign: "right", color: "#64748b" }}>
                      ${it.price.toFixed(2)}
                    </span>
                    <span style={{ flex: 2, textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                      ${it.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Summary & Grand Total ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "2px solid #f1f5f9", paddingTop: "16px", marginTop: "16px" }}>
              {/* QR Verification & Stamp */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="QR"
                  width="84"
                  height="84"
                  style={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#16a34a", textTransform: "uppercase" }}>
                    ✓ 100% Verified Authentic
                  </span>
                  <span style={{ fontSize: "10px", color: "#64748b", maxWidth: "200px", marginTop: "2px" }}>
                    Scan QR to verify authentic invoice &amp; warranty coverage on S Tech Store.
                  </span>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div style={{ display: "flex", flexDirection: "column", minWidth: "260px", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
                  <span>Delivery Fee:</span>
                  <span>{deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : "Free Delivery"}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#16a34a", fontWeight: 700 }}>
                    <span>Discount:</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                {/* Grand Total Box */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "2px dashed #e2e8f0",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a" }}>
                    Grand Total:
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "22px", fontWeight: 900, color: "#8B1A1A" }}>
                      ${grandTotal.toFixed(2)} USD
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                      ≈ {grandTotalKHR.toLocaleString()} KHR
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
              <span>Official S Tech Store Cambodia • Thank you for your business!</span>
              <span>Goods covered by official warranty policy</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 800,
        height: 1050,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate invoice image: ${e?.message || e}`, { status: 500 });
  }
}
