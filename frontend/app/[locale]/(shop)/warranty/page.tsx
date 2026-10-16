"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import api from "@/lib/api";

const MOCK_WARRANTY: Record<string, { product: string; purchased: string; expires: string; status: "active" | "expired" | "processing" }> = {
  "SN-12345": { product: "ThinkPad X1 Carbon Gen 11", purchased: "Jan 15, 2024", expires: "Jan 15, 2025", status: "active" },
  "SN-99999": { product: "ASUS ROG Strix G16", purchased: "Jun 01, 2023", expires: "Jun 01, 2024", status: "expired" },
  "INV-2024001": { product: "NVIDIA RTX 4070 Ti", purchased: "Mar 10, 2024", expires: "Mar 10, 2025", status: "active" },
};

const WARRANTY_TERMS = [
  {
    icon: "🖥️", title: "Laptops & Desktops", period: "3 ទៅ 6 ខែ (3–6 Months)",
    items: ["Hardware defects covered", "Free repair or replacement", "On-site technician visit (Phnom Penh)", "Battery covered for 3 months"],
  },
  {
    icon: "⚙️", title: "PC Components (CPU, GPU, RAM)", period: "3 ទៅ 6 ខែ (3–6 Months)",
    items: ["DOA replacement within 7 days", "Manufacturer defects covered", "No coverage for physical damage", "Requires original invoice"],
  },
  {
    icon: "🖱️", title: "Peripherals & Accessories", period: "6 Months",
    items: ["Keyboards, mice, headsets", "Manufacturing defects only", "Swap replacement policy", "Must be unused / unmodified"],
  },
];

const RETURN_STEPS = [
  { step: "01", title: "Contact Us", desc: "Call or Telegram us at +855 87 986 045 within 7 days of purchase." },
  { step: "02", title: "Prepare Package", desc: "Include original box, accessories, invoice, and describe the defect clearly." },
  { step: "03", title: "Drop-off / Pickup", desc: "Drop the item at our store or schedule a free pickup (Phnom Penh only)." },
  { step: "04", title: "Inspection", desc: "Our technician inspects within 1–2 business days and confirms coverage." },
  { step: "05", title: "Repair / Replace", desc: "Defective units are repaired or replaced within 3–7 business days." },
];

const FAQS = [
  { q: "Does warranty cover accidental damage?", a: "No. Warranty only covers manufacturing defects. Physical damage, liquid damage, and user-caused issues are not covered but can be repaired at cost." },
  { q: "Can I return a product if I changed my mind?", a: "We accept returns within 7 days for unopened, unused products in original packaging. Opened products are non-returnable unless defective." },
  { q: "How do I check my warranty status?", a: "Use the warranty checker above by entering your Serial Number (found on the box), Invoice ID from your receipt, or Repair Ticket (e.g. REP-1007)." },
  { q: "Is software covered under warranty?", a: "No. Warranty covers hardware defects only. Software issues, viruses, or OS problems are handled by our Repair & Service team at a separate fee." },
  { q: "What if my product arrives damaged?", a: "Report damage within 24 hours of delivery with photos. We'll arrange a free swap or full refund immediately." },
];

interface ApiResult {
  type: "repair" | "warranty";
  data: any;
}

function WarrantyContent() {
  const searchParams = useSearchParams();
  const urlTicket = searchParams.get("ticket") || searchParams.get("code") || searchParams.get("q") || "";

  const [query, setQuery] = useState(urlTicket);
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [mockResult, setMockResult] = useState<typeof MOCK_WARRANTY[string] | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCheck = async (codeToSearch?: string) => {
    const raw = (codeToSearch !== undefined ? codeToSearch : query).trim();
    if (!raw) return;

    setLoading(true);
    setIsNotFound(false);
    setApiResult(null);
    setMockResult(null);

    try {
      const res = await api.get("/repairs/track", {
        params: { ticket: raw }
      });

      if (res.data?.success && res.data?.found) {
        if (res.data.type === "repair") {
          setApiResult({ type: "repair", data: res.data.ticket });
          return;
        } else if (res.data.type === "warranty") {
          setApiResult({ type: "warranty", data: res.data.warranty });
          return;
        }
      }

      // Check fallback mock
      const key = raw.toUpperCase();
      const mock = MOCK_WARRANTY[key] ?? MOCK_WARRANTY[raw];
      if (mock) {
        setMockResult(mock);
      } else {
        setIsNotFound(true);
      }
    } catch (err: any) {
      // Check fallback mock even on error
      const key = raw.toUpperCase();
      const mock = MOCK_WARRANTY[key] ?? MOCK_WARRANTY[raw];
      if (mock) {
        setMockResult(mock);
      } else {
        setIsNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlTicket) {
      setQuery(urlTicket);
      handleCheck(urlTicket);
    }
  }, [urlTicket]);

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div style={{ background: "#fff", padding: "48px 0 32px", textAlign: "center", borderBottom: "1px solid #e5e5e5" }}>
        <div className="container">
          <h1 style={{ fontSize: 34, fontWeight: 900, color: "#1a1a1a", marginBottom: 8, letterSpacing: "-0.02em" }}>
            Warranty &amp; Return Policy
          </h1>
          <p className="font-khmer" style={{ fontSize: 16, color: "#1a4fa0", marginBottom: 16 }}>
            គោលការណ៍ធានា និងការប្ដូរទំនិញ / តាមដានការជួសជុល
          </p>
          <div style={{ width: 56, height: 3, background: "linear-gradient(90deg,#8B1A1A,#1a4fa0)", borderRadius: 2, margin: "0 auto" }} />
        </div>
      </div>

      <div className="container" style={{ padding: "32px 24px" }}>

        {/* ── Warranty / Repair Checker ── */}
        <div style={{
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10,
          padding: "24px 28px", marginBottom: 28,
          borderTop: "3px solid",
          borderImage: "linear-gradient(90deg,#8B1A1A,#1a4fa0) 1",
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>
            Check Warranty &amp; Repair Status / <span className="font-khmer" style={{ color: "#1a4fa0", fontWeight: 400 }}>ពិនិត្យការធានា និងសំបុត្រជួសជុល</span>
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCheck()}
                placeholder="Enter Serial Number, Invoice ID, or Repair Ticket (e.g. REP-1007)"
                style={{
                  width: "100%", padding: "11px 14px 11px 40px",
                  border: "1px solid #e0e0e0", borderRadius: 6,
                  fontSize: 14, color: "#1a1a1a", background: "#fafafa",
                  outline: "none", fontFamily: "monospace",
                }}
                onFocus={e => (e.target.style.borderColor = "#8B1A1A")}
                onBlur={e => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>
            <button onClick={() => handleCheck()}
              disabled={loading || !query.trim()}
              style={{
                padding: "11px 22px", background: "#8B1A1A", color: "#fff",
                border: "none", borderRadius: 6, fontSize: 13, fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7,
                letterSpacing: ".03em", whiteSpace: "nowrap", transition: "background 150ms",
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#6B1010"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#8B1A1A"; }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {loading ? "Checking..." : "Check Status"}
            </button>
          </div>

          {/* ── Case 1: Real Repair Ticket Found ── */}
          {apiResult?.type === "repair" && (
            <div style={{
              marginTop: 18, padding: "20px 22px", borderRadius: 10,
              background: "#f0fdf4", border: "1px solid #86efac",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: "2px 8px", background: "#15803d", color: "#fff",
                      borderRadius: 4, fontSize: 11, fontWeight: 800, fontFamily: "monospace"
                    }}>
                      #{apiResult.data.ticket_code}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#166534" }}>
                      Repair Ticket Found / សំបុត្រជួសជុលឧបករណ៍
                    </span>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 900, color: "#1a1a1a", margin: "4px 0" }}>
                    💻 {apiResult.data.device_name}
                  </p>
                  <p style={{ fontSize: 13, color: "#4b5563" }}>
                    បញ្ហារាយការណ៍: <strong>{apiResult.data.issue_description || "ពិនិត្យទូទៅ"}</strong>
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    ជាងទទួលបន្ទុក: <strong>{apiResult.data.technician_name}</strong> · តម្លៃប៉ាន់ស្មាន: <strong style={{ color: "#166534" }}>${apiResult.data.estimated_cost?.toFixed(2)} USD</strong>
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{
                    display: "inline-block", padding: "6px 14px", borderRadius: 20,
                    fontSize: 12, fontWeight: 800, textTransform: "uppercase",
                    background: apiResult.data.status === "Ready" ? "#bbf7d0" : "#dbeafe",
                    color: apiResult.data.status === "Ready" ? "#15803d" : "#1d4ed8",
                    border: "1px solid rgba(0,0,0,0.05)"
                  }}>
                    {apiResult.data.status_kh || apiResult.data.status}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: "1px dashed #bbf7d0", paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <Link
                  href={`/repairs?ticket=${encodeURIComponent(apiResult.data.ticket_code)}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", background: "#15803d", color: "#fff",
                    borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none"
                  }}
                >
                  <span>🔧 បើកមើលដំណើរការជួសជុលពេញលេញ (Repair Tracker)</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          )}

          {/* ── Case 2: Real Warranty / Order Record Found ── */}
          {apiResult?.type === "warranty" && (
            <div style={{
              marginTop: 18, padding: "18px 20px", borderRadius: 10,
              background: apiResult.data.status === "active" ? "#f0fdf4" : "#fff5f5",
              border: `1px solid ${apiResult.data.status === "active" ? "#86efac" : "#fca5a5"}`,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ flexShrink: 0 }}>
                {apiResult.data.status === "active"
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                  : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", marginBottom: 2 }}>{apiResult.data.product}</p>
                <p style={{ fontSize: 12, color: "#555" }}>
                  Invoice: #{apiResult.data.order_id} · Purchased: {apiResult.data.purchased} · Expires: {apiResult.data.expires}
                </p>
                <p style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
                  អតិថិជន: {apiResult.data.customer_name} · រយៈពេលធានា: {apiResult.data.period}
                </p>
              </div>
              <span style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: ".06em",
                background: apiResult.data.status === "active" ? "#dcfce7" : "#fee2e2",
                color: apiResult.data.status === "active" ? "#16a34a" : "#dc2626",
              }}>{apiResult.data.status}</span>
            </div>
          )}

          {/* ── Case 3: Mock Fallback Found ── */}
          {mockResult && (
            <div style={{
              marginTop: 16, padding: "16px 18px", borderRadius: 8,
              background: mockResult.status === "active" ? "#f0fdf4" : "#fff5f5",
              border: `1px solid ${mockResult.status === "active" ? "#86efac" : "#fca5a5"}`,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ flexShrink: 0 }}>
                {mockResult.status === "active"
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                  : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", marginBottom: 2 }}>{mockResult.product}</p>
                <p style={{ fontSize: 12, color: "#777" }}>Purchased: {mockResult.purchased} · Expires: {mockResult.expires}</p>
              </div>
              <span style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: ".06em",
                background: mockResult.status === "active" ? "#dcfce7" : "#fee2e2",
                color: mockResult.status === "active" ? "#16a34a" : "#dc2626",
              }}>{mockResult.status}</span>
            </div>
          )}

          {/* ── Case 4: Not Found ── */}
          {isNotFound && (
            <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#fff8e1", border: "1px solid #fcd34d" }}>
              <p style={{ fontSize: 13, color: "#92400e" }}>⚠️ No warranty or repair record found for <strong>"{query}"</strong>. Please check your invoice or contact us.</p>
            </div>
          )}

          <p style={{ fontSize: 11, color: "#bbb", marginTop: 10 }}>Try: REP-1007 · SN-12345 · INV-2024001 · SN-99999</p>
        </div>

        {/* ── Warranty Terms ── */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 4, height: 22, background: "#8B1A1A", borderRadius: 2 }} />
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>Warranty Coverage</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {WARRANTY_TERMS.map(w => (
              <div key={w.title} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 22, transition: "box-shadow 200ms" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{w.icon}</span>
                    <h3 style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>{w.title}</h3>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 10px", background: "#fff5f5", color: "#8B1A1A", borderRadius: 20, border: "1px solid #fca5a5", whiteSpace: "nowrap" }}>
                    {w.period}
                  </span>
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {w.items.map((item, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#555", lineHeight: 1.5 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── What's NOT Covered ── */}
        <section style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 4, height: 22, background: "#dc2626", borderRadius: 2 }} />
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>What Is NOT Covered</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {[
              "Physical damage (drops, cracks, dents)",
              "Liquid or water damage",
              "Unauthorized repairs or modifications",
              "Normal wear and tear",
              "Software issues, viruses, or OS errors",
              "Missing serial number or tampered seals",
              "Damage from power surges or wrong voltage",
              "Cosmetic damage (scratches, dents)",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#555", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* ── Return Process ── */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 4, height: 22, background: "#1a4fa0", borderRadius: 2 }} />
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>Return / Repair Process</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
            {RETURN_STEPS.map((s, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "18px 14px", textAlign: "center", position: "relative" }}>
                {i < RETURN_STEPS.length - 1 && (
                  <div style={{ position: "absolute", top: "28px", right: "-7px", zIndex: 1, color: "#ccc", fontSize: 16 }}>›</div>
                )}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#8B1A1A", color: "#fff", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                  {s.step}
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>{s.title}</p>
                <p style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 4, height: 22, background: "#d97706", borderRadius: 2 }} />
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", padding: "16px 4px", background: "none", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", textAlign: "left", gap: 12,
                  }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{faq.q}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5"
                    style={{ flexShrink: 0, transition: "transform 200ms", transform: openFaq === i ? "rotate(180deg)" : "none" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <p style={{ fontSize: 13, color: "#666", lineHeight: 1.8, padding: "0 4px 16px", margin: 0 }}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact CTA ── */}
        <div style={{ background: "linear-gradient(135deg,#1a1a1a,#1a4fa0)", borderRadius: 10, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Need help with a warranty claim or repair?</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Contact our support team — we respond within 24 hours.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="tel:+85587986045" style={{ padding: "10px 20px", background: "#8B1A1A", color: "#fff", borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.53 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l.62-.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Call Us
            </a>
            <Link href="/services" style={{ padding: "10px 20px", background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }}>
              Our Services
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function WarrantyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading...</div>}>
      <WarrantyContent />
    </Suspense>
  );
}
