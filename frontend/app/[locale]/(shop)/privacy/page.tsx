"use client";

import { Link } from "@/i18n/routing";

const SECTIONS = [
  {
    icon: "📋",
    title: "1. Information We Collect",
    content: (
      <>
        <p>When you use the S Tech Store website or services, we may collect the following information:</p>
        <ul style={{ marginLeft: 20, marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <li><strong>Personal Details:</strong> Name, phone number, and delivery address when you place an order.</li>
          <li><strong>Account Information:</strong> Email address and Firebase authentication UID when you register an account.</li>
          <li><strong>Order History:</strong> Details of products purchased, warranties, and service history.</li>
          <li><strong>Communication:</strong> Messages sent via our contact form or Telegram support channel.</li>
        </ul>
      </>
    ),
  },
  {
    icon: "🛡️",
    title: "2. How We Use Your Information",
    content: (
      <>
        <p>We use the collected information primarily to provide and improve our services in Cambodia:</p>
        <ul style={{ marginLeft: 20, marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>To process and fulfill your orders, including delivery to Phnom Penh or provinces.</li>
          <li>To communicate with you regarding order status, warranty claims, or repairs.</li>
          <li>To process payments securely via ABA PAY, Wing, or Bakong (we do not store your banking credentials).</li>
          <li>To improve our website functionality and customer experience.</li>
        </ul>
      </>
    ),
  },
  {
    icon: "🤝",
    title: "3. Data Sharing",
    content: (
      <p>
        S Tech Store respects your privacy. We <strong>do not</strong> sell or rent your personal information to third parties. 
        We only share necessary information with trusted partners, such as delivery services (e.g., Vireak Buntham, J&T Express) 
        and official brand service centers (e.g., ASUS, Dell) when processing warranty claims on your behalf.
      </p>
    ),
  },
  {
    icon: "🍪",
    title: "4. Cookies & Analytics",
    content: (
      <p>
        Our website uses cookies to maintain your session (e.g., keeping items in your shopping cart) and to remember your 
        language preference (English or Khmer). We may also use basic analytics to understand website traffic, which helps us 
        stock the right products for our Cambodian customers.
      </p>
    ),
  },
  {
    icon: "🔒",
    title: "5. Data Security",
    content: (
      <p>
        We implement industry-standard security measures to protect your data. Your account is secured by Firebase Authentication. 
        All data transmitted between your browser and our servers is encrypted using HTTPS. While we strive to protect your 
        information, no method of transmission over the internet is 100% secure.
      </p>
    ),
  },
  {
    icon: "👤",
    title: "6. Your Rights",
    content: (
      <p>
        You have the right to access, update, or request deletion of your personal information. You can update your profile 
        details in the "My Account" section. To request account deletion, please contact our support team.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="font-khmer" style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: 16 }}>
            គោលនយោបាយឯកជនភាព
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
          At S Tech Store, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and services in Cambodia.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {SECTIONS.map((section, idx) => (
            <div
              key={idx}
              style={{
                background: "#fff",
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: "32px",
                display: "flex",
                gap: 20,
              }}
            >
              <div style={{ fontSize: 32, flexShrink: 0 }}>{section.icon}</div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 12 }}>
                  {section.title}
                </h2>
                <div style={{ fontSize: 14, color: "#555", lineHeight: 1.7 }}>
                  {section.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div
          style={{
            marginTop: 48,
            padding: 40,
            background: "#1a4fa0",
            color: "#fff",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Contact Us Regarding Privacy</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", marginBottom: 24, maxWidth: 600, margin: "0 auto 24px" }}>
            If you have any questions about this Privacy Policy or how we handle your data, please don't hesitate to reach out.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/contact"
              style={{
                padding: "10px 24px",
                background: "#fff",
                color: "#1a4fa0",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Contact Support
            </Link>
            <a
              href="mailto:privacy@stechstore.com.kh"
              style={{
                padding: "10px 24px",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              privacy@stechstore.com.kh
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
