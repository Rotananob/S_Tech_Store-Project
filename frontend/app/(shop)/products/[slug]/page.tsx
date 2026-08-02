"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, ChevronRight, Check, Send } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import api from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/translations";

type TabType = "specs" | "description" | "reviews";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<TabType>("specs");
  
  const addItemToCart = useCartStore((state) => state.addItem);
  const { lang } = useLangStore();
  const t = translations[lang].products;

  useEffect(() => {
    api.get(`/products/${slug}`)
      .then(res => {
        setProduct(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#111", display: "flex", justifyContent: "center", alignItems: "center", color: "white" }}>Loading...</div>;
  }

  if (!product) {
    return <div style={{ minHeight: "100vh", background: "#111", display: "flex", justifyContent: "center", alignItems: "center", color: "white" }}>Product not found</div>;
  }

  const handleAddToCart = () => {
    addItemToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      image_url: product.image_url,
    });
    alert(`${product.name} ${t.addToCart}!`);
  };

  const images = product.image_url ? [product.image_url] : ["/placeholder.jpg"];
  const specs = [
    { key: "Category", value: product.category?.name || "Uncategorized" },
    { key: "Stock", value: product.stock > 0 ? t.inStock : t.outOfStock }
  ];
  const model = product.name;

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
            {translations[lang].nav.home}
          </Link>
          <ChevronRight size={13} />
          <Link
            href={`/category/${product.category?.name?.toLowerCase() || 'uncategorized'}`}
            style={{ color: "rgba(255,255,255,0.45)", transition: "color 150ms" }}
            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "white")}
            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "rgba(255,255,255,0.45)")}
          >
            {product.category?.name || "Uncategorized"}
          </Link>
          <ChevronRight size={13} />
          <span style={{ color: "rgba(255,255,255,0.7)" }}>{product.name}</span>
        </nav>

        {/* ── Main Layout ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
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
                  {product.badge === "NEW" ? t.newArrival : product.badge}
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
                  background: product.stock > 0 ? "#22c55e" : "#ef4444",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "13px",
                  color: product.stock > 0 ? "#22c55e" : "#ef4444",
                  fontWeight: "600",
                }}
              >
                {product.stock > 0 ? t.inStock : t.outOfStock}
              </span>
              {product.stock > 0 && (
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                  {t.shipsToday}
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
                {t.quantity}
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
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="btn-red"
                style={{ flex: 1, padding: "13px 20px", fontSize: "14px", opacity: product.stock === 0 ? 0.5 : 1 }}
              >
                <ShoppingCart size={16} />
                {t.addToCart}
              </button>
              <button
                className="btn-outline-blue"
                style={{ flex: 1, padding: "13px 20px", fontSize: "14px" }}
              >
                <Send size={15} />
                {t.orderTelegram}
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
                {t.oneYearWarranty}
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
                {t.genuineProduct}
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
            {t.specifications}
          </button>
          <button
            className={`tab-btn${tab === "description" ? " active" : ""}`}
            onClick={() => setTab("description")}
          >
            {t.description}
          </button>
          <button
            className={`tab-btn${tab === "reviews" ? " active" : ""}`}
            onClick={() => setTab("reviews")}
          >
            {t.reviews} ({product.reviews || 0})
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
              ? `${product.reviews} customer reviews.`
              : t.noReviews}
          </div>
        )}
      </div>
    </div>
  );
}
