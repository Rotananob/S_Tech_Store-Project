"use client";

import { Link } from "@/i18n/routing";

const RETURN_STEPS = [
  {
    num: "1",
    title: "Contact Us",
    desc: "Reach out via phone, email, or Telegram within the return window to initiate your return request.",
  },
  {
    num: "2",
    title: "Get Approval",
    desc: "Our team will review your request and provide a Return Authorization number within 24 hours.",
  },
  {
    num: "3",
    title: "Ship or Drop Off",
    desc: "Pack the item securely in original packaging and either ship it back or drop off at our store in Phnom Penh.",
  },
  {
    num: "4",
    title: "Refund or Exchange",
    desc: "Once we inspect and verify the item, your refund or exchange will be processed within 3–5 business days.",
  },
];

const CONDITIONS = [
  {
    icon: "📦",
    title: "Original Packaging",
    desc: "Item must be returned in its original box with all accessories, manuals, and protective materials included.",
  },
  {
    icon: "🧾",
    title: "Proof of Purchase",
    desc: "Original receipt or order confirmation email is required for all returns and exchanges.",
  },
  {
    icon: "⏰",
    title: "Return Window",
    desc: "Defective items: 7 days. Dead-on-arrival (DOA): 3 days. Change-of-mind returns are not accepted on opened items.",
  },
  {
    icon: "🚫",
    title: "Non-Returnable Items",
    desc: "Opened software, consumables (ink, toner), custom-built PCs, and items with physical damage from misuse.",
  },
  {
    icon: "💰",
    title: "Refund Method",
    desc: "Refunds are processed to the original payment method — ABA, Wing, Bakong, or cash refund at store.",
  },
  {
    icon: "🔄",
    title: "Exchange Option",
    desc: "You may choose to exchange for the same product or an equivalent model, subject to availability.",
  },
];

export default function ReturnPolicyPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          position: "relative",
          height: 340,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
        }}
      >
        <div style={{ position: "relative", textAlign: "center", padding: "0 24px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(139, 26, 26, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 28,
            }}
          >
            🔄
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: "#fff", marginBottom: 10, letterSpacing: "-0.02em" }}>
            Return Policy
          </h1>
          <p className="font-khmer" style={{ fontSize: 16, color: "rgba(255,255,255,0.55)" }}>
            គោលនយោបាយប្រគល់ទំនិញវិញ
          </p>
        </div>
      </section>

      {/* Eligibility Overview */}
      <section style={{ padding: "56px 0", background: "#fff", borderBottom: "1px solid #f0f0f0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8B1A1A", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
              Return Eligibility
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a" }}>When Can You Return?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { period: "3 Days", type: "Dead on Arrival (DOA)", desc: "Product is completely non-functional out of the box. Full replacement or refund guaranteed.", color: "#ef4444" },
              { period: "7 Days", type: "Defective Product", desc: "Product has a manufacturing defect discovered during normal use within the first week.", color: "#f59e0b" },
              { period: "No Return", type: "Change of Mind", desc: "We do not accept returns for opened products due to change of mind. Please verify before purchasing.", color: "#6b7280" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 10,
                  padding: 28,
                  borderTop: `3px solid ${item.color}`,
                  transition: "box-shadow 200ms, transform 200ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.transform = "none";
                }}
              >
                <p style={{ fontSize: 32, fontWeight: 900, color: item.color, marginBottom: 4 }}>{item.period}</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", marginBottom: 10 }}>{item.type}</p>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Return Process */}
      <section style={{ padding: "56px 0", background: "#f9f9f9" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8B1A1A", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
              How It Works
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a" }}>Return Process</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {RETURN_STEPS.map((step) => (
              <div key={step.num} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#8B1A1A",
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  {step.num}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conditions */}
      <section style={{ padding: "56px 0", background: "#fff" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8B1A1A", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
              Important Information
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a" }}>Conditions & Requirements</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CONDITIONS.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: 24,
                  border: "1px solid #e5e5e5",
                  borderRadius: 10,
                  background: "#fff",
                  transition: "box-shadow 200ms, transform 200ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.transform = "none";
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{c.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.7 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #1a4fa0 100%)", padding: "56px 0" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 10 }}>
            Need to return a product?
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 28 }}>
            Contact our support team and we&apos;ll guide you through the process.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/contact"
              style={{
                padding: "12px 28px",
                background: "#8B1A1A",
                color: "#fff",
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Contact Support
            </Link>
            <Link
              href="/warranty"
              style={{
                padding: "12px 28px",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              Warranty Info
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
