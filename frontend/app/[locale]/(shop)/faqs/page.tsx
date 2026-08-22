"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";

const FAQ_CATEGORIES = ["General", "Orders & Shipping", "Payment", "Warranty & Returns", "Technical"];

const FAQS = [
  // General
  {
    category: "General",
    q: "Is S Tech Store an authorized reseller?",
    a: "Yes, we are a 100% authorized reseller for all major brands we carry, including ASUS, Dell, Lenovo, HP, and MSI. All products are genuine and sourced directly from official distributors.",
  },
  {
    category: "General",
    q: "Where is your physical store located?",
    a: "We are located at St. 271, Phnom Penh, Cambodia. You can find our exact location on Google Maps or by contacting our support team.",
  },
  {
    category: "General",
    q: "Do you offer wholesale or bulk purchases for businesses?",
    a: "Yes, we have a dedicated B2B team for corporate clients, schools, and internet cafes. Please contact us via email or Telegram for a customized quotation.",
  },

  // Orders & Shipping
  {
    category: "Orders & Shipping",
    q: "How long does delivery take in Phnom Penh?",
    a: "We offer same-day delivery within Phnom Penh for all orders placed before 4:00 PM. Orders placed after 4:00 PM will be delivered the next morning.",
  },
  {
    category: "Orders & Shipping",
    q: "Do you ship to provinces?",
    a: "Yes! We ship to all provinces across Cambodia via Vireak Buntham, J&T Express, or Capitol. Delivery typically takes 1-2 business days depending on the location.",
  },
  {
    category: "Orders & Shipping",
    q: "How can I track my order?",
    a: "Once your order is dispatched, you can view the status in the 'My Orders' section of your account. For province deliveries, we will provide the bus/express tracking number via Telegram or SMS.",
  },

  // Payment
  {
    category: "Payment",
    q: "What payment methods do you accept?",
    a: "We accept ABA PAY, Wing, Bakong, and Cash on Delivery (COD) for orders within Phnom Penh. For province orders, payment must be made in advance via bank transfer.",
  },
  {
    category: "Payment",
    q: "Can I pay in Khmer Riel (KHR)?",
    a: "Yes, you can pay in either USD or KHR. Our checkout system automatically calculates the total in KHR based on the daily exchange rate.",
  },

  // Warranty & Returns
  {
    category: "Warranty & Returns",
    q: "How does the warranty process work?",
    a: "If your product has a defect within the warranty period, bring it to our store with the original receipt. We will diagnose it and either repair it in-house or send it to the official brand service center.",
  },
  {
    category: "Warranty & Returns",
    q: "Can I return a product if I change my mind?",
    a: "We do not accept returns for change of mind if the product has been opened or the seal is broken. Please refer to our Return Policy page for full details on defective or DOA (Dead on Arrival) items.",
  },

  // Technical
  {
    category: "Technical",
    q: "Do you install Windows and basic software for free?",
    a: "Yes, every laptop and desktop purchase includes free installation of Windows 11 (unactivated unless an OS is purchased), basic utilities, and drivers.",
  },
  {
    category: "Technical",
    q: "Can I upgrade the RAM or SSD before delivery?",
    a: "Absolutely! If the laptop or desktop supports upgrades, our technicians can install additional RAM or storage before shipping. You only pay for the cost of the components.",
  },
];

export default function FaqPage() {
  const [activeTab, setActiveTab] = useState("General");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredFaqs = FAQS.filter((faq) => faq.category === activeTab);

  const toggleExpand = (index: number) => {
    setExpandedId(expandedId === index ? null : index);
  };

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          position: "relative",
          height: 300,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
        }}
      >
        <div style={{ position: "relative", textAlign: "center", padding: "0 24px" }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: "#fff", marginBottom: 10, letterSpacing: "-0.02em" }}>
            Frequently Asked Questions
          </h1>
          <p className="font-khmer" style={{ fontSize: 16, color: "rgba(255,255,255,0.55)" }}>
            សំណួរដែលសួរញឹកញាប់
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "56px 24px", maxWidth: 900 }}>
        {/* Category Tabs */}
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 16,
            marginBottom: 32,
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          {FAQ_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveTab(cat);
                  setExpandedId(null);
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 30,
                  background: isActive ? "#8B1A1A" : "#fff",
                  color: isActive ? "#fff" : "#555",
                  border: `1px solid ${isActive ? "#8B1A1A" : "#e5e5e5"}`,
                  fontWeight: 600,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 200ms",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredFaqs.map((faq, index) => {
            const isExpanded = expandedId === index;
            return (
              <div
                key={index}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "box-shadow 200ms",
                  boxShadow: isExpanded ? "0 4px 16px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <button
                  onClick={() => toggleExpand(index)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px 24px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{faq.q}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: isExpanded ? "#fef2f2" : "#f1f1f1",
                      color: isExpanded ? "#8B1A1A" : "#777",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 300ms, background 200ms, color 200ms",
                    }}
                  >
                    ▼
                  </span>
                </button>
                <div
                  style={{
                    maxHeight: isExpanded ? 500 : 0,
                    overflow: "hidden",
                    transition: "max-height 300ms ease-in-out",
                  }}
                >
                  <div style={{ padding: "0 24px 24px", color: "#555", fontSize: 15, lineHeight: 1.7 }}>
                    {faq.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 56,
            padding: 40,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e5e5e5",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1a1a1a", marginBottom: 8 }}>
            Still have questions?
          </h2>
          <p style={{ fontSize: 15, color: "#777", marginBottom: 24 }}>
            Can't find the answer you're looking for? Our support team is ready to help.
          </p>
          <Link
            href="/contact"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "#8B1A1A",
              color: "#fff",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              transition: "background 200ms",
            }}
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
