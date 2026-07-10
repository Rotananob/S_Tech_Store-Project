"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { mockProducts, mockCategories, formatUSD, formatKHR } from "@/lib/mock-data";

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section
      style={{
        background: "var(--bg-white)",
        padding: "48px 0 0",
        borderBottom: "3px solid #e5e5e5",
      }}
    >
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-10 min-h-[300px]">
          {/* Left — Text */}
          <div style={{ paddingBottom: "48px" }}>
            <h1 className="text-[32px] sm:text-[42px] font-black text-[#1a1a1a] leading-[1.15] mb-4 tracking-tight">
              Your Hub for Genuine
              <br />
              Tech in Cambodia
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "#555",
                marginBottom: "6px",
                lineHeight: "1.7",
              }}
            >
              Discover top-tier laptops, custom desktop builds, and professional IT
              services.
            </p>
            <p
              className="font-khmer"
              style={{
                fontSize: "14px",
                color: "#777",
                marginBottom: "28px",
              }}
            >
              ស្វែងរកកុំព្យូទ័រ, លប់ថប់, និងសេវាកម្ម IT គ្រប់ប្រភេទ
            </p>
            <Link href="/products" className="btn-red" style={{ width: "fit-content", padding: "12px 32px", fontSize: "15px" }}>
              Shop Now
            </Link>
          </div>

          {/* Right — Laptop Image */}
          <div className="flex justify-center items-end h-auto md:h-[320px] relative mt-4 md:mt-0">
            <img
              src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=700&q=90"
              alt="Premium Laptop"
              className="w-full max-w-[480px] object-cover object-center rounded-t-lg"
            />
          </div>
        </div>
      </div>

      {/* Gradient divider line */}
      <div className="divider-gradient" />
    </section>
  );
}

// ─── Feature Strip ────────────────────────────────────────────────────────────
function FeatureStrip() {
  const features = [
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ), label: "Genuine Products" },
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ), label: "1-Year Warranty" },
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ), label: "Local Payments" },
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ), label: "Same-Day Delivery" },
  ];

  return (
    <div style={{ background: "#1a1a1a" }}>
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-white/5">
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-item p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center gap-3 text-center border-b md:border-b-0 border-r-0 md:border-r border-white/5 last:border-r-0"
            >
              <div style={{ color: "#1a4fa0" }}>{f.svg}</div>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────
function CategorySection() {
  const categories = [
    { name: "Laptops", slug: "laptops", icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    )},
    { name: "Desktops", slug: "desktops", icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    )},
    { name: "Parts", slug: "parts", icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
    )},
    { name: "Gaming", slug: "gaming", icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
        <circle cx="15" cy="13" r="1"/><circle cx="17" cy="11" r="1"/>
        <path d="M21 6H3a1 1 0 0 0-1 1v9a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V7a1 1 0 0 0-1-1Z"/>
      </svg>
    )},
    { name: "Services", slug: "services", icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    )},
  ];

  return (
    <section style={{ background: "#1a1a1a", padding: "48px 0" }}>
      <div className="container">
        <p className="section-heading">Shop by Category</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="category-card"
              style={{ textDecoration: "none" }}
            >
              <div style={{ color: "rgba(255,255,255,0.7)" }}>{cat.icon}</div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Red separator */}
      <div style={{ marginTop: "48px" }}>
        <div className="divider-red" />
      </div>
    </section>
  );
}

// ─── Best Sellers ─────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: typeof mockProducts[0] }) {
  return (
    <div className="product-card-dark">
      {/* Badge */}
      {product.badge && (
        <div
          style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}
        >
          <span className={product.badge === "HOT" ? "badge-hot" : "badge-new"}>
            {product.badge}
          </span>
        </div>
      )}

      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div
          style={{
            background: "#2a2a2a",
            height: "200px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.4s ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLImageElement).style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLImageElement).style.transform = "scale(1)";
            }}
          />
        </div>
      </Link>

      {/* Info */}
      <div style={{ padding: "14px" }}>
        <Link href={`/products/${product.slug}`} style={{ textDecoration: "none" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "rgba(255,255,255,0.92)",
              marginBottom: "4px",
              lineHeight: "1.4",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.name}
          </h3>
        </Link>

        <p
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.4)",
            marginBottom: "10px",
          }}
        >
          {product.specs}
        </p>

        {/* Price */}
        <div style={{ marginBottom: "12px" }}>
          <div className="price-usd">{formatUSD(product.price)}</div>
          <div className="price-khr">{formatKHR(product.price)}</div>
        </div>

        {/* Add to Cart */}
        <button
          className="btn-red"
          style={{ width: "100%", padding: "9px 16px", fontSize: "13px" }}
        >
          <ShoppingCart size={14} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function BestSellers() {
  return (
    <section style={{ background: "#111", padding: "48px 0 60px" }}>
      <div className="container">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "28px",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "white",
              letterSpacing: "-0.01em",
            }}
          >
            Best Sellers
          </h2>
          <Link
            href="/products"
            style={{
              fontSize: "13px",
              color: "#1a4fa0",
              fontWeight: "600",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.color = "#4a8ff0";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.color = "#1a4fa0";
            }}
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <FeatureStrip />
      <CategorySection />
      <BestSellers />
    </div>
  );
}
