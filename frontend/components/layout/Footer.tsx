"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, MessageSquare, Share2, Play, Send } from "lucide-react";

const footerLinks = {
  shop: [
    { label: "Laptops", href: "/category/laptops" },
    { label: "Desktops", href: "/category/desktops" },
    { label: "Gaming Gear", href: "/category/gaming-gear" },
    { label: "Monitors", href: "/category/monitors" },
    { label: "Accessories", href: "/category/accessories" },
    { label: "New Arrivals", href: "/products?sort=newest" },
    { label: "Sale Items", href: "/products?sale=true" },
  ],
  support: [
    { label: "My Account", href: "/account/profile" },
    { label: "Order Tracking", href: "/orders" },
    { label: "Return Policy", href: "/return-policy" },
    { label: "Warranty Info", href: "/warranty" },
    { label: "FAQs", href: "/faqs" },
    { label: "Contact Us", href: "/contact" },
  ],
  company: [
    { label: "About S Tech Store", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-default)",
        marginTop: "80px",
      }}
    >
      {/* Main Footer Content */}
      <div className="container-main" style={{ padding: "60px 48px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "48px",
          }}
        >
          {/* Brand Column */}
          <div style={{ maxWidth: "320px" }}>
            <Link
              href="/"
              style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  background: "var(--gradient-brand)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "900",
                  fontSize: "20px",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                S
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    fontWeight: "800",
                    fontSize: "20px",
                    lineHeight: "1",
                  }}
                >
                  <span className="gradient-text">S Tech</span>
                  <span style={{ color: "var(--text-secondary)" }}> Store</span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Premium Tech
                </div>
              </div>
            </Link>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.8", marginBottom: "24px" }}>
              Your one-stop destination for the latest computers, laptops, gaming gear and tech accessories. 
              Quality guaranteed, best prices, fast delivery.
            </p>
            {/* Contact Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { icon: Phone, text: "+855 12 345 678" },
                { icon: Mail, text: "support@stechstore.com" },
                { icon: MapPin, text: "Phnom Penh, Cambodia" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontSize: "13px" }}
                >
                  <Icon size={14} style={{ color: "var(--brand-primary)", flexShrink: 0 }} />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "32px",
            }}
          >
            {Object.entries(footerLinks).map(([key, links]) => (
              <div key={key}>
                <h4
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-primary)",
                    marginBottom: "16px",
                  }}
                >
                  {key === "shop" ? "Shop" : key === "support" ? "Support" : "Company"}
                </h4>
                <ul style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "14px",
                          transition: "color var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLAnchorElement).style.color = "var(--brand-primary)";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLAnchorElement).style.color = "var(--text-muted)";
                        }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="divider" />
      <div className="container-main">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 0",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            © 2025 S Tech Store. All rights reserved.
          </p>

          {/* Social Links */}
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { icon: MessageSquare, href: "#" },
              { icon: Share2, href: "#" },
              { icon: Play, href: "#" },
              { icon: Send, href: "#" },
            ].map(({ icon: Icon, href }, i) => (
              <a
                key={i}
                href={href}
                style={{
                  width: "36px",
                  height: "36px",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "rgba(37, 99, 235, 0.15)";
                  el.style.borderColor = "var(--brand-primary)";
                  el.style.color = "var(--brand-primary)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "var(--bg-surface-2)";
                  el.style.borderColor = "var(--border-default)";
                  el.style.color = "var(--text-muted)";
                }}
              >
                <Icon size={15} />
              </a>
            ))}
          </div>

          {/* Payment icons placeholder */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {["VISA", "MC", "PayPal", "ABA"].map((pay) => (
              <span
                key={pay}
                style={{
                  padding: "3px 8px",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "var(--text-muted)",
                  letterSpacing: "0.05em",
                }}
              >
                {pay}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
