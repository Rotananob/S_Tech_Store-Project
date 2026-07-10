"use client";

import { useState, use } from "react";
import Link from "next/link";
import { ShoppingCart, ChevronRight, Check, Send } from "lucide-react";
import { mockProducts, formatUSD, formatKHR } from "@/lib/mock-data";

// Find or fallback product
function getProduct(slug: string) {
  return mockProducts.find((p) => p.slug === slug) ?? mockProducts[4];
}

type TabType = "specs" | "description" | "reviews";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const product = getProduct(slug);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<TabType>("specs");

  const images = (product as any).images ?? [product.image];
  const specs = (product as any).specs_detail ?? [];
  const model = (product as any).model ?? product.specs;

  return (
    <div style={{ background: "#111", minHeight: "100vh", color: "white" }}>
      <div className="container" style={{ paddingTop: "24px", paddingBottom: "60px" }}>

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "28px",
            fontSize: "13px",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <Link
            href="/"
            style={{ color: "rgba(255,255,255,0.45)", transition: "color 150ms" }}
            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "white")}
            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "rgba(255,255,255,0.45)")}
          >
            Home
          </Link>
          <ChevronRight size={13} />
          <Link
            href={`/category/${product.category.toLowerCase()}`}
            style={{ color: "rgba(255,255,255,0.45)", transition: "color 150ms" }}
            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "white")}
            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "rgba(255,255,255,0.45)")}
          >
            {product.category}
          </Link>
          <ChevronRight size={13} />
          <span style={{ color: "rgba(255,255,255,0.7)" }}>{product.name}</span>
        </nav>

        {/* ── Main Layout ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          {/* LEFT — Images ─────────────────────────────────────────────── */}
          <div>
            {/* Main Image */}
            <div
              style={{
                background: "#1a1a1a",
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "16px",
                aspectRatio: "4/3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <img
                src={images[activeImage]}
                alt={product.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "opacity 0.3s ease",
                }}
              />
            </div>

            {/* Thumbnails */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {images.map((img: string, i: number) => (
                <img
                  key={i}
                  src={img}
                  alt={`View ${i + 1}`}
                  className={`thumb ${i === activeImage ? "active" : ""}`}
                  onClick={() => setActiveImage(i)}
                />
              ))}
            </div>
          </div>

          {/* RIGHT — Product Info ──────────────────────────────────────── */}
          <div>
            {/* Badge */}
            {product.badge && (
              <div style={{ marginBottom: "14px" }}>
                <span className="badge-new-arrival">
                  {product.badge === "NEW" ? "NEW ARRIVAL" : product.badge}
                </span>
              </div>
            )}

            {/* Title */}
            <h1
              style={{
                fontSize: "34px",
                fontWeight: "800",
                color: "rgba(255,255,255,0.92)",
                lineHeight: "1.15",
                marginBottom: "8px",
                letterSpacing: "-0.02em",
              }}
            >
              {product.name}
            </h1>

            {/* Model */}
            <p
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,0.45)",
                marginBottom: "24px",
              }}
            >
              {model}
            </p>

            {/* Price Box */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "6px",
                padding: "18px 20px",
                marginBottom: "18px",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: "800",
                  color: "#c0392b",
                  fontFamily: "Inter, monospace",
                  letterSpacing: "0.01em",
                }}
              >
                {formatUSD(product.price)}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.35)",
                  marginTop: "4px",
                }}
              >
                {formatKHR(product.price)}&nbsp;
                <span style={{ marginLeft: "6px" }}>🇰🇭</span>
              </div>
            </div>

            {/* Stock */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: product.in_stock ? "#22c55e" : "#ef4444",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "13px",
                  color: product.in_stock ? "#22c55e" : "#ef4444",
                  fontWeight: "600",
                }}
              >
                {product.in_stock ? "In Stock" : "Out of Stock"}
              </span>
              {product.in_stock && (
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                  — Ships today
                </span>
              )}
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: "rgba(255,255,255,0.08)",
                margin: "20px 0",
              }}
            />

            {/* Quantity */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                Quantity
              </label>
              <div className="qty-control">
                <button
                  className="qty-btn"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                >
                  −
                </button>
                <span className="qty-value">{qty}</span>
                <button
                  className="qty-btn"
                  onClick={() => setQty(qty + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
              <button
                className="btn-red"
                style={{ flex: 1, padding: "13px 20px", fontSize: "14px" }}
              >
                <ShoppingCart size={16} />
                Add to Cart
              </button>
              <button
                className="btn-outline-blue"
                style={{ flex: 1, padding: "13px 20px", fontSize: "14px" }}
              >
                <Send size={15} />
                Order via Telegram
              </button>
            </div>

            {/* Trust Badges */}
            <div
              style={{
                display: "flex",
                gap: "20px",
                padding: "14px 0",
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                <Check size={13} style={{ color: "#22c55e" }} />
                1-Year Official Warranty
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                <Check size={13} style={{ color: "#22c55e" }} />
                100% Genuine Product
              </div>
            </div>
          </div>
        </div>

        {/* ── Divider ────────────────────────────────────────────────────── */}
        <div
          style={{
            height: "1px",
            background: "rgba(255,255,255,0.07)",
            margin: "40px 0 0",
          }}
        />

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            marginBottom: "28px",
          }}
        >
          <button
            className={`tab-btn${tab === "specs" ? " active" : ""}`}
            onClick={() => setTab("specs")}
          >
            Specifications
          </button>
          <button
            className={`tab-btn${tab === "description" ? " active" : ""}`}
            onClick={() => setTab("description")}
          >
            Description
          </button>
          <button
            className={`tab-btn${tab === "reviews" ? " active" : ""}`}
            onClick={() => setTab("reviews")}
          >
            Reviews ({product.reviews})
          </button>
        </div>

        {/* Tab Content */}
        {tab === "specs" && (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <table className="spec-table">
              <tbody>
                {specs.map((spec: { key: string; value: string }, i: number) => (
                  <tr key={i}>
                    <td>{spec.key}</td>
                    <td>{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "description" && (
          <div
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.7)",
              lineHeight: "1.8",
              maxWidth: "720px",
            }}
          >
            <p>{(product as any).description}</p>
          </div>
        )}

        {tab === "reviews" && (
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px" }}>
            {product.reviews > 0
              ? `${product.reviews} customer reviews. Sign in to write a review.`
              : "No reviews yet. Be the first to review this product."}
          </div>
        )}
      </div>
    </div>
  );
}
