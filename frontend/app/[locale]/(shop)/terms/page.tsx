"use client";

import { Link } from "@/i18n/routing";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content: "By accessing and using the S Tech Store website, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.",
  },
  {
    title: "2. Products & Pricing",
    content: "All product descriptions, specifications, and pricing are subject to change without notice. Prices are listed in USD. For payments in Khmer Riel (KHR), the total will be calculated based on the daily market exchange rate. We reserve the right to correct any pricing errors.",
  },
  {
    title: "3. Orders & Payment",
    content: "We accept payments via ABA PAY, Wing, Bakong, and Cash on Delivery (Phnom Penh only). By placing an order, you represent that you are authorized to use the chosen payment method. Orders are subject to verification and acceptance before shipping.",
  },
  {
    title: "4. Shipping & Delivery",
    content: "We offer same-day delivery in Phnom Penh and 1-2 day shipping to provinces via local express services. Delivery times are estimates and may be affected by circumstances beyond our control. The risk of loss passes to you upon delivery.",
  },
  {
    title: "5. Returns & Refunds",
    content: "We accept returns for defective or DOA (Dead on Arrival) items within the specified return window. We do not accept returns for change of mind on opened products. Please refer to our Return Policy for full details.",
  },
  {
    title: "6. Warranty",
    content: "Products are covered by their respective manufacturer warranties. S Tech Store acts as an authorized reseller and will assist with warranty claims. Warranty does not cover physical damage, liquid damage, or unauthorized modifications.",
  },
  {
    title: "7. User Accounts",
    content: "You are responsible for maintaining the confidentiality of your account credentials (managed via Firebase Authentication). You agree to accept responsibility for all activities that occur under your account.",
  },
  {
    title: "8. Limitation of Liability",
    content: "S Tech Store shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our products or services, including data loss.",
  },
  {
    title: "9. Governing Law",
    content: "These Terms of Service shall be governed by and construed in accordance with the laws of the Kingdom of Cambodia, without regard to its conflict of law provisions.",
  },
];

export default function TermsPage() {
  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
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
            Terms of Service
          </h1>
          <p className="font-khmer" style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: 16 }}>
            លក្ខខណ្ឌនៃសេវាកម្ម
          </p>
          <div
            style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.1)",
              padding: "6px 16px",
              borderRadius: 20,
              fontSize: 12,
              color: "rgba(255,255,255,0.8)",
              fontWeight: 600,
            }}
          >
            Effective Date: August 2024
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "48px 24px 64px", maxWidth: 900 }}>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, marginBottom: 40, textAlign: "center" }}>
          Welcome to S Tech Store. Please read these terms carefully before using our website or purchasing our products.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {SECTIONS.map((section, idx) => (
            <div
              key={idx}
              style={{
                background: "#fff",
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: "28px",
                position: "relative",
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  width: 28, 
                  height: 28, 
                  background: "rgba(139, 26, 26, 0.1)", 
                  color: "#8B1A1A", 
                  borderRadius: "50%", 
                  fontSize: 13 
                }}>
                  {idx + 1}
                </span>
                {section.title.substring(section.title.indexOf('.') + 2)}
              </h2>
              <div style={{ fontSize: 14, color: "#555", lineHeight: 1.7, paddingLeft: 38 }}>
                {section.content}
                {idx === 4 && (
                  <div style={{ marginTop: 8 }}>
                    <Link href="/returns" style={{ color: "#1a4fa0", fontWeight: 600, textDecoration: "underline" }}>View Return Policy</Link>
                  </div>
                )}
                {idx === 5 && (
                  <div style={{ marginTop: 8 }}>
                    <Link href="/warranty" style={{ color: "#1a4fa0", fontWeight: 600, textDecoration: "underline" }}>View Warranty Info</Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div style={{ marginTop: 56, textAlign: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 12 }}>Questions about our Terms?</h3>
          <p style={{ fontSize: 14, color: "#777", marginBottom: 20 }}>
            Contact us at <a href="mailto:support@stechstore.com.kh" style={{ color: "#8B1A1A", fontWeight: 600 }}>support@stechstore.com.kh</a> or call <a href="tel:+85512345678" style={{ color: "#8B1A1A", fontWeight: 600 }}>+855 12 345 678</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
