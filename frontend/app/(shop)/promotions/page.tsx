"use client";
import { useState, useEffect } from "react";

const USD_TO_KHR = 4060;
const fmtKHR = (n: number) => `≈ ${(Math.round(n * USD_TO_KHR / 1000) * 1000).toLocaleString()}`;

// ─── Deal Products ─────────────────────────────────────────────────────────────
const FLASH_DEALS = [
  { id: 1, name: "S-Pro Gaming Laptop RTX 4070, 32GB RAM", model: "SP-GL407B", price: 1499, original: 1899, image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&q=80", stock: 3 },
  { id: 2, name: "NVD-Ultra Graphics Card 16GB GDDR6X", model: "NVD-U16G", price: 799, original: 949, image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80", stock: 5 },
  { id: 3, name: "Vision-Pro 32\" 4K IPS Monitor 144Hz", model: "VP-324K144", price: 450, original: 599, image: "https://images.unsplash.com/photo-1527443224154-c4a573d3b9e5?w=400&q=80", stock: 8 },
  { id: 4, name: "Mech-Tactile Pro Keyboard & Mouse Bundle", model: "MT-PROBNDL", price: 129, original: 189, image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80", stock: 12 },
];

const BUNDLE_DEALS = [
  { id: 5, name: "Creator Workstation Bundle", items: "i9-14900K + RTX 4080 + 64GB RAM + 2TB SSD", price: 3299, original: 4299, image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&q=80", badge: "BUNDLE" },
  { id: 6, name: "Gaming Starter Pack", items: "RTX 4060 + 16GB RAM + 500GB SSD + Keyboard & Mouse", price: 749, original: 999, image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&q=80", badge: "BUNDLE" },
  { id: 7, name: "Home Office Setup", items: "ThinkPad + 24\" Monitor + Wireless Keyboard & Mouse", price: 1599, original: 1999, image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500&q=80", badge: "BUNDLE" },
];

const COUPON_CODES = [
  { code: "TECH10", desc: "10% off any laptop", min: "$500", color: "#8B1A1A" },
  { code: "BUILD15", desc: "15% off custom PC builds", min: "$1,500", color: "#1a4fa0" },
  { code: "NEWUSER", desc: "$20 off for new accounts", min: "$100", color: "#16a34a" },
];

// ─── Countdown Timer ───────────────────────────────────────────────────────────
function useCountdown(targetMs: number) {
  const [diff, setDiff] = useState(targetMs - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(targetMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  const d = Math.max(0, diff);
  return {
    days: Math.floor(d / 86400000),
    hours: Math.floor((d % 86400000) / 3600000),
    mins: Math.floor((d % 3600000) / 60000),
    secs: Math.floor((d % 60000) / 1000),
  };
}

function Digit({ val, label }: { val: number; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "8px 14px", minWidth: 54 }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>
          {String(val).padStart(2, "0")}
        </span>
      </div>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</p>
    </div>
  );
}

// ─── Flash Deal Card ───────────────────────────────────────────────────────────
function DealCard({ item }: { item: typeof FLASH_DEALS[0] }) {
  const discount = Math.round((1 - item.price / item.original) * 100);
  return (
    <div style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow 200ms, transform 200ms" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}>
      <div style={{ position: "relative", height: 180, overflow: "hidden", background: "#f5f5f5" }}>
        <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 400ms" }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
        <div style={{ position: "absolute", top: 10, left: 10, background: "#8B1A1A", color: "#fff", fontSize: 10, fontWeight: 900, padding: "3px 9px", borderRadius: 2, letterSpacing: ".05em" }}>SALE</div>
        <div style={{ position: "absolute", top: 10, right: 10, background: "#1a1a1a", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 9px", borderRadius: 20 }}>-{discount}%</div>
        {item.stock <= 5 && (
          <div style={{ position: "absolute", bottom: 8, left: 10, background: "#d97706", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>Only {item.stock} left!</div>
        )}
      </div>
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a", marginBottom: 2, lineHeight: 1.4 }}>{item.name}</p>
        <p style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>Model: {item.model}</p>
        <div style={{ marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#8B1A1A" }}>${item.price.toFixed(2)}</span>
            <span style={{ fontSize: 13, color: "#bbb", textDecoration: "line-through" }}>${item.original.toFixed(2)}</span>
          </div>
          <p style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>₭ {fmtKHR(item.price)}</p>
          <button style={{
            width: "100%", padding: "10px", background: "#1a1a1a", color: "#fff",
            border: "none", borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, letterSpacing: ".03em",
            transition: "background 150ms",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#333")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const target = Date.now() + (3 * 86400 + 14 * 3600 + 45 * 60) * 1000;
  const { days, hours, mins, secs } = useCountdown(target);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>

      {/* ── Hero Banner ── */}
      <section style={{ position: "relative", overflow: "hidden", minHeight: 440 }}>
        <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1400&q=85" alt="Tech Deals"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.35) 100%)" }} />

        <div className="container" style={{ position: "relative", padding: "64px 24px" }}>
          <span style={{ display: "inline-block", background: "#8B1A1A", color: "#fff", fontSize: 11, fontWeight: 900, padding: "4px 12px", borderRadius: 2, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>
            Limited Time Offer
          </span>
          <h1 style={{ fontSize: 46, fontWeight: 900, color: "#fff", marginBottom: 14, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Tech Mega Sale
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", maxWidth: 420, marginBottom: 28, lineHeight: 1.8 }}>
            Upgrade your setup with unprecedented discounts on premium hardware. High-performance gaming, professional workstations, and essential peripherals.
          </p>

          {/* Countdown */}
          <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
            <Digit val={days} label="Days" />
            <Digit val={hours} label="Hours" />
            <Digit val={mins} label="Mins" />
            <Digit val={secs} label="Secs" />
          </div>

          <a href="/products" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", background: "#8B1A1A", color: "#fff", borderRadius: 8, fontWeight: 800, fontSize: 15, textDecoration: "none", transition: "background 150ms" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#6B1010")}
            onMouseLeave={e => (e.currentTarget.style.background = "#8B1A1A")}>
            Shop Now
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
      </section>

      {/* ── Red divider ── */}
      <div style={{ height: 4, background: "linear-gradient(90deg,#8B1A1A,#1a4fa0)" }} />

      <div className="container" style={{ padding: "36px 24px" }}>

        {/* ── Flash Deals ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1a1a1a" }}>Flash Deals</h2>
          </div>
          <a href="/products" style={{ fontSize: 13, fontWeight: 600, color: "#1a4fa0", textDecoration: "none" }}>View All →</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 36 }}>
          {FLASH_DEALS.map(d => <DealCard key={d.id} item={d} />)}
        </div>

        {/* ── Bundle Deals ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 20 }}>📦</span>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1a1a1a" }}>Bundle Deals</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 36 }}>
          {BUNDLE_DEALS.map(b => {
            const disc = Math.round((1 - b.price / b.original) * 100);
            return (
              <div key={b.id} style={{ background: "#fff", border: "1px solid #eaeaea", borderRadius: 10, overflow: "hidden", transition: "box-shadow 200ms, transform 200ms" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}>
                <div style={{ position: "relative", height: 200, overflow: "hidden", background: "#f0f0f0" }}>
                  <img src={b.image} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
                  <div style={{ position: "absolute", top: 12, left: 12, background: "#1a4fa0", color: "#fff", fontSize: 10, fontWeight: 900, padding: "3px 10px", borderRadius: 2 }}>{b.badge}</div>
                  <div style={{ position: "absolute", top: 12, right: 12, background: "#8B1A1A", color: "#fff", fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 20 }}>-{disc}%</div>
                  <div style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
                    <p style={{ fontSize: 15, fontWeight: 900, color: "#fff", marginBottom: 2 }}>{b.name}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{b.items}</p>
                  </div>
                </div>
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: "#8B1A1A" }}>${b.price.toLocaleString()}</span>
                      <span style={{ fontSize: 13, color: "#bbb", textDecoration: "line-through" }}>${b.original.toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#aaa" }}>₭ {fmtKHR(b.price)}</p>
                  </div>
                  <button style={{ padding: "9px 18px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add to Cart</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Coupon Codes ── */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24, marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span style={{ fontSize: 20 }}>🏷️</span>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1a1a1a" }}>Promo Codes</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {COUPON_CODES.map(c => (
              <div key={c.code} style={{ border: `2px dashed ${c.color}40`, borderRadius: 10, padding: "18px 20px", background: `${c.color}08` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: c.color, fontFamily: "monospace", letterSpacing: ".04em" }}>{c.code}</span>
                  <button onClick={() => copyCode(c.code)}
                    style={{ padding: "5px 12px", background: copied === c.code ? "#16a34a" : c.color, color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "background 200ms" }}>
                    {copied === c.code ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>{c.desc}</p>
                <p style={{ fontSize: 11, color: "#aaa" }}>Min. order: {c.min}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Newsletter ── */}
        <div style={{ background: "linear-gradient(135deg,#1a1a1a,#1a4fa0)", borderRadius: 10, padding: "32px", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Never Miss a Deal</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Subscribe for Exclusive Offers</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginBottom: 24 }}>Get flash deals, promo codes & new arrivals straight to your inbox.</p>
          <div style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto" }}>
            <input placeholder="your@email.com" type="email"
              style={{ flex: 1, padding: "11px 16px", borderRadius: 6, border: "none", fontSize: 14, outline: "none" }} />
            <button style={{ padding: "11px 22px", background: "#8B1A1A", color: "#fff", border: "none", borderRadius: 6, fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "background 150ms" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#6B1010")}
              onMouseLeave={e => (e.currentTarget.style.background = "#8B1A1A")}>
              Subscribe
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
