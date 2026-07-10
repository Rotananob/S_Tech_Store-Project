"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ArrowRight,
  Truck,
  Shield,
  RefreshCw,
  HeadphonesIcon,
  TrendingUp,
  Zap,
  Star,
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { mockProducts, mockCategories, mockBanners } from "@/lib/mock-data";

// ─── Hero Banner ─────────────────────────────────────────────────────────────
function HeroBanner() {
  const [active, setActive] = useState(0);
  const banners = mockBanners;

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = banners[active];

  return (
    <div
      style={{
        position: "relative",
        height: "520px",
        overflow: "hidden",
        borderRadius: "20px",
        margin: "24px 0",
      }}
    >
      {/* Background Image */}
      <img
        src={banner.image}
        alt={banner.title}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transition: "all 0.8s ease",
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(10,14,26,0.95) 0%, rgba(10,14,26,0.6) 50%, rgba(10,14,26,0.1) 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 60px",
        }}
      >
        <div style={{ maxWidth: "520px" }} className="animate-fade-in-up">
          {banner.badge && (
            <div style={{ marginBottom: "16px" }}>
              <span
                className="badge badge-hot"
                style={{ fontSize: "12px", padding: "5px 14px" }}
              >
                🔥 {banner.badge}
              </span>
            </div>
          )}
          <p
            style={{
              fontSize: "14px",
              color: "var(--brand-accent)",
              fontWeight: "600",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            {banner.subtitle}
          </p>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "900",
              lineHeight: "1.1",
              marginBottom: "16px",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            {banner.title}
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-secondary)",
              marginBottom: "32px",
              lineHeight: "1.7",
            }}
          >
            {banner.description}
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <Link href={banner.link || "/products"} className="btn-primary" style={{ padding: "13px 28px", fontSize: "15px" }}>
              {banner.cta || "Shop Now"}
              <ArrowRight size={17} />
            </Link>
            <Link href="/products" className="btn-secondary" style={{ padding: "13px 24px" }}>
              Browse All
            </Link>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          left: "60px",
          display: "flex",
          gap: "8px",
        }}
      >
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              height: "4px",
              width: i === active ? "32px" : "16px",
              background:
                i === active ? "var(--brand-primary)" : "rgba(255,255,255,0.3)",
              border: "none",
              borderRadius: "99px",
              cursor: "pointer",
              transition: "all var(--transition-base)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Category Grid ────────────────────────────────────────────────────────────
function CategoryGrid() {
  return (
    <section style={{ marginBottom: "60px" }}>
      <div className="section-header">
        <h2 className="section-title">
          Shop by <span className="gradient-text">Category</span>
        </h2>
        <Link
          href="/products"
          className="btn-ghost"
          style={{ color: "var(--brand-primary)", fontWeight: "600", fontSize: "14px" }}
        >
          View All <ChevronRight size={16} />
        </Link>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
        }}
        className="stagger-children"
      >
        {mockCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              transition: "all var(--transition-base)",
              textDecoration: "none",
            }}
            className="animate-fade-in-up"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = "var(--brand-primary)";
              el.style.background = "rgba(37, 99, 235, 0.08)";
              el.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = "var(--border-default)";
              el.style.background = "var(--bg-surface)";
              el.style.transform = "translateY(0)";
            }}
          >
            <span style={{ fontSize: "28px" }}>{cat.icon}</span>
            <div>
              <div
                style={{
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "var(--text-primary)",
                }}
              >
                {cat.name}
              </div>
              <div
                style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}
              >
                {cat.count} products
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Trust Badges ─────────────────────────────────────────────────────────────
function TrustBadges() {
  const badges = [
    { icon: Truck, title: "Free Shipping", desc: "On orders over $99" },
    { icon: Shield, title: "Secure Payment", desc: "100% Protected" },
    { icon: RefreshCw, title: "Easy Returns", desc: "30 day policy" },
    { icon: HeadphonesIcon, title: "24/7 Support", desc: "Always here for you" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
        margin: "0 0 60px",
      }}
    >
      {badges.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              background: "rgba(37, 99, 235, 0.12)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={20} style={{ color: "var(--brand-primary)" }} />
          </div>
          <div>
            <div style={{ fontWeight: "700", fontSize: "14px" }}>{title}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              {desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Featured Products ────────────────────────────────────────────────────────
function FeaturedProducts() {
  const [activeTab, setActiveTab] = useState("all");
  const tabs = ["all", "laptops", "monitors", "gaming"];
  const filtered =
    activeTab === "all"
      ? mockProducts
      : mockProducts.filter((p) =>
          p.category.toLowerCase().includes(activeTab.split("s")[0])
        );

  return (
    <section style={{ marginBottom: "60px" }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Zap size={20} style={{ display: "inline", color: "#f59e0b", marginRight: "8px" }} />
            Featured <span className="gradient-text">Products</span>
          </h2>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px" }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "7px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid",
                borderColor:
                  activeTab === tab ? "var(--brand-primary)" : "var(--border-default)",
                background:
                  activeTab === tab
                    ? "rgba(37, 99, 235, 0.12)"
                    : "transparent",
                color:
                  activeTab === tab ? "var(--brand-primary)" : "var(--text-muted)",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all var(--transition-fast)",
              }}
            >
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="product-grid stagger-children">
        {filtered.map((product) => (
          <div key={product.id} className="animate-fade-in-up">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: "32px" }}>
        <Link href="/products" className="btn-secondary" style={{ padding: "12px 36px" }}>
          View All Products
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

// ─── Promo Banner ─────────────────────────────────────────────────────────────
function PromoBanner() {
  return (
    <div
      style={{
        background: "var(--gradient-brand)",
        borderRadius: "var(--radius-xl)",
        padding: "48px 60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "60px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          right: "-60px",
          top: "-60px",
          width: "300px",
          height: "300px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "100px",
          bottom: "-80px",
          width: "200px",
          height: "200px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "50%",
        }}
      />

      <div>
        <p
          style={{
            fontSize: "13px",
            fontWeight: "700",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: 0.8,
            marginBottom: "8px",
          }}
        >
          ⚡ Flash Sale — Today Only
        </p>
        <h2
          style={{
            fontSize: "36px",
            fontWeight: "900",
            fontFamily: "Outfit, sans-serif",
            marginBottom: "8px",
          }}
        >
          Up to 40% OFF Gaming Laptops
        </h2>
        <p style={{ opacity: 0.8, fontSize: "15px" }}>
          Limited stock. Don't miss out on these incredible deals!
        </p>
      </div>
      <Link
        href="/products?category=gaming-gear"
        style={{
          background: "white",
          color: "var(--brand-primary)",
          padding: "14px 32px",
          borderRadius: "var(--radius-md)",
          fontWeight: "800",
          fontSize: "15px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          transition: "all var(--transition-base)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
        }}
      >
        Shop the Sale
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="container-main" style={{ paddingTop: "8px" }}>
      <HeroBanner />
      <TrustBadges />
      <CategoryGrid />
      <FeaturedProducts />
      <PromoBanner />
    </div>
  );
}
