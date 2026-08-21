"use client";

import { Link } from "@/i18n/routing";
import { Phone, Mail, MapPin, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

const footerLinks = {
  shop: [
    { label: "Laptops", href: "/category/laptops" },
    { label: "Desktops", href: "/category/desktops" },
    { label: "Parts & Components", href: "/category/parts" },
    { label: "Gaming", href: "/category/gaming" },
    { label: "IT Services", href: "/services" },
    { label: "New Arrivals", href: "/products?sort=newest" },
  ],
  support: [
    { label: "My Orders", href: "/orders" },
    { label: "Return Policy", href: "/returns" },
    { label: "Warranty Info", href: "/warranty" },
    { label: "FAQs", href: "/faqs" },
    { label: "Contact Us", href: "/contact" },
    { label: "Order via Telegram", href: "https://t.me/stechstore" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export default function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="container" style={{ padding: "48px 24px" }}>
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-12">
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <img
                src="/logo.jpg"
                alt="S Tech Store Logo"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  flexShrink: 0,
                  borderRadius: "8px",
                  filter: "brightness(0.9)",
                }}
              />
              <div>
                <div className="font-dangrek" style={{ fontSize: "24px", color: "white", lineHeight: "1", marginBottom: "2px", letterSpacing: "0.02em" }}>
                  S <span style={{ color: "#c0392b" }}>Tech</span>{" "}
                  <span style={{ color: "#4a8ff0" }}>Store</span>
                </div>
                <div
                  className="font-khmer"
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.45)",
                    letterSpacing: "0.05em",
                    lineHeight: "1",
                  }}
                >
                  ហាងបច្ចេកវិទ្យា
                </div>
              </div>
            </Link>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: "1.7", marginBottom: "20px" }}>
              {t("desc")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { icon: Phone, text: "+855 12 345 678" },
                { icon: Mail, text: "support@stechstore.com.kh" },
                { icon: MapPin, text: "Phnom Penh, Cambodia" },
                { icon: MessageSquare, text: "Telegram: @stechstore" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                  <Icon size={13} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {(Object.entries(footerLinks) as [string, { label: string; href: string }[]][]).map(([key, links]) => (
              <div key={key}>
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "14px",
                  }}
                >
                  {key === "shop" ? t("shop") : key === "support" ? t("support") : t("company")}
                </h4>
                <ul style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", transition: "color 150ms ease" }}
                        onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "rgba(255,255,255,0.85)")}
                        onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "rgba(255,255,255,0.4)")}
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

      {/* Bottom */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "16px 24px",
          textAlign: "center",
          fontSize: "12px",
          color: "rgba(255,255,255,0.25)",
        }}
      >
        {t("copyright")}
      </div>
    </footer>
  );
}
