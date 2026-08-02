"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/translations";

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  const { lang } = useLangStore();
  const t = translations[lang].hero;

  return (
    <section
      style={{
        background: "var(--bg-white)",
        padding: "48px 0 0",
        borderBottom: "3px solid #e5e5e5",
      }}
    >
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-10 min-h-[300px]">
          {/* Left — Text */}
          <div style={{ paddingBottom: "48px" }}>
            <h1 className="text-[30px] sm:text-[38px] lg:text-[44px] font-black text-[#1a1a1a] leading-[1.15] mb-4 tracking-tight">
              {t.titleLine1}
              <br />
              {t.titleLine2}
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "#555",
                marginBottom: "6px",
                lineHeight: "1.7",
              }}
            >
              {t.subtitle}
            </p>
            <p
              className="font-khmer"
              style={{
                fontSize: "14px",
                color: "#777",
                marginBottom: "28px",
              }}
            >
              {t.khmerSubtitle}
            </p>
            <Link href="/category/all" className="btn-red inline-flex items-center gap-2 shadow-lg hover:shadow-red-900/40" style={{ width: "fit-content", padding: "12px 32px", fontSize: "15px" }}>
              {t.shopNow}
            </Link>
          </div>

          {/* Right — Laptop Image */}
          <div className="flex justify-center items-end h-auto lg:h-[340px] relative mt-4 lg:mt-0">
            <img
              src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=700&q=90"
              alt="Premium Laptop"
              className="w-full max-w-[480px] object-cover object-center rounded-t-lg shadow-xl"
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
  const { lang } = useLangStore();
  const t = translations[lang].features;

  const featuresList = [
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ), label: t.genuine },
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ), label: t.warranty },
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ), label: t.localPayments },
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ), label: t.sameDayDelivery },
  ];

  return (
    <div style={{ background: "#1a1a1a" }}>
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-white/5">
          {featuresList.map((f, i) => (
            <div
              key={i}
              className="feature-item p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center gap-3 text-center border-b lg:border-b-0 border-r-0 lg:border-r border-white/5 last:border-r-0"
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
  const { lang } = useLangStore();
  const t = translations[lang].categories;
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    api.get('/categories')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data);
        }
      })
      .catch(console.error);
  }, []);

  const getIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("laptop")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    );
    if (s.includes("desktop")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    );
    if (s.includes("part") || s.includes("component") || s.includes("accessor")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
    );
    if (s.includes("gaming")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
        <circle cx="15" cy="13" r="1"/><circle cx="17" cy="11" r="1"/>
        <path d="M21 6H3a1 1 0 0 0-1 1v9a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V7a1 1 0 0 0-1-1Z"/>
      </svg>
    );
    if (s.includes("second") || s.includes("used") || s.includes("hand")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 16h5v5"/>
      </svg>
    );
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    );
  };

  const defaultCategories = [
    { name: t.laptops, slug: "laptops" },
    { name: t.desktops, slug: "desktops" },
    { name: t.parts, slug: "parts" },
    { name: t.gaming, slug: "gaming" },
    { name: t.secondHand, slug: "secondhand", badge: "99% New" },
    { name: t.services, slug: "services" },
  ];

  const hasSecondHand = categories.some((c: any) =>
    c.slug?.toLowerCase() === "secondhand" || c.name?.toLowerCase().includes("second")
  );

  const displayCategories = categories.length > 0
    ? (hasSecondHand ? categories : [
        ...categories,
        { name: t.secondHand, slug: "secondhand", badge: "99% New" }
      ])
    : defaultCategories;

  return (
    <section style={{ background: "#1a1a1a", padding: "48px 0" }}>
      <div className="container">
        <p className="section-heading">{t.shopByCategory}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="category-card relative overflow-hidden group hover:border-[#8B1A1A] transition-all"
              style={{ textDecoration: "none" }}
            >
              {cat.badge && (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-[#8B1A1A] text-white text-[10px] font-bold rounded-full shadow-sm">
                  {cat.badge}
                </span>
              )}
              <div style={{ color: "rgba(255,255,255,0.7)" }}>{getIcon(cat.slug)}</div>
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
function ProductCard({ product }: { product: any }) {
  const { lang } = useLangStore();
  const t = translations[lang].products;
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: Number(product.id),
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url
    });
    alert(`${product.name} added to cart!`);
  };

  return (
    <div className="product-card-dark">
      {/* Badge */}
      {product.is_featured && (
        <div
          style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}
        >
          <span className="badge-hot">
            {t.hot}
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
          {product.image_url ? (
            <img
              src={product.image_url}
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
          ) : (
            <span style={{fontSize: 40}}>💻</span>
          )}
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
          {product.category?.name || "Uncategorized"}
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
          onClick={handleAddToCart}
        >
          <ShoppingCart size={14} />
          {t.addToCart}
        </button>
      </div>
    </div>
  );
}

function BestSellers() {
  const { lang } = useLangStore();
  const t = translations[lang].products;
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    api.get('/products')
      .then(res => setProducts(res.data.reverse().slice(0, 8)))
      .catch(console.error);
  }, []);

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
            {t.bestSellers}
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
            {t.viewAll}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
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
