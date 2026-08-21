"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Star, Eye, Zap } from "lucide-react";
import { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/translations";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const { lang } = useLangStore();
  const t = translations[lang].products;
  
  const { addItem: addWishlist, removeItem: removeWishlist, isInWishlist } = useWishlistStore();
  const isWishlisted = isInWishlist(Number(product.id));

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isWishlisted) {
      removeWishlist(Number(product.id));
    } else {
      addWishlist({
        id: Number(product.id),
        name: product.name,
        price: product.sale_price ?? product.price,
        image: product.image,
        slug: product.slug,
      });
    }
  };
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: Number(product.id),
      name: product.name,
      price: product.sale_price ?? product.price,
      quantity: 1,
      image_url: product.image
    });
    alert(`${product.name} ${t.addToCart}!`);
  };

  const discountPercent =
    product.sale_price && product.price
      ? Math.round(((product.price - product.sale_price) / product.price) * 100)
      : null;

  const getBadgeClass = (badge: string | null | undefined) => {
    if (!badge) return "";
    const map: Record<string, string> = {
      HOT: "badge-hot",
      NEW: "badge-new",
      SALE: "badge-sale",
    };
    return `badge ${map[badge] || "badge-new"}`;
  };

  return (
    <div
      className="product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: "pointer" }}
    >
      {/* Image Container */}
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          overflow: "hidden",
          background: "var(--bg-surface-2)",
        }}
      >
        {/* Product Image */}
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: isHovered ? "scale(1.07)" : "scale(1)",
              transition: "transform 0.4s ease",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
            }}
          >
            💻
          </div>
        )}

        {/* Badge */}
        {product.badge && (
          <span
            className={getBadgeClass(product.badge)}
            style={{ position: "absolute", top: "10px", left: "10px" }}
          >
            {product.badge}
          </span>
        )}

        {/* Discount percent */}
        {discountPercent && (
          <span
            style={{
              position: "absolute",
              top: product.badge ? "40px" : "10px",
              left: "10px",
              background: "rgba(239, 68, 68, 0.9)",
              color: "white",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "700",
            }}
          >
            -{discountPercent}%
          </span>
        )}

        {/* Out of Stock overlay */}
        {!product.in_stock && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(10, 14, 26, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text-secondary)",
              }}
            >
              {t.outOfStock}
            </span>
          </div>
        )}

        {/* Hover Actions */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateX(0)" : "translateX(8px)",
            transition: "all var(--transition-base)",
          }}
        >
          {/* Wishlist */}
          <button
            onClick={toggleWishlist}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #e5e5e5",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              color: isWishlisted ? "#ef4444" : "#444",
            }}
            title="Add to Wishlist"
          >
            <Heart size={20} fill={isWishlisted ? "#ef4444" : "none"} strokeWidth={isWishlisted ? 0 : 2} />
          </button>
          {/* Quick view */}
          <button
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            <Eye size={15} />
          </button>
        </div>

        {/* Quick Add overlay at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "10px",
            transform: isHovered && product.in_stock ? "translateY(0)" : "translateY(100%)",
            transition: "transform var(--transition-base)",
          }}
        >
          <button
            className="btn-primary"
            style={{ width: "100%", padding: "9px", fontSize: "13px" }}
            onClick={handleAddToCart}
          >
            <ShoppingCart size={14} />
            {t.addToCart}
          </button>
        </div>
      </div>

      {/* Info */}
      <Link href={`/products/${product.slug}`}>
        <div style={{ padding: "14px" }}>
          {/* Brand */}
          {product.brand && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--brand-primary)",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {product.brand}
            </span>
          )}

          {/* Name */}
          <h3
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "var(--text-primary)",
              marginTop: "4px",
              marginBottom: "8px",
              lineHeight: "1.4",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.name}
          </h3>

          {/* Rating */}
          {product.rating && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginBottom: "10px",
              }}
            >
              <div style={{ display: "flex", gap: "1px" }}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={11}
                    fill={i < Math.floor(product.rating!) ? "#f59e0b" : "none"}
                    color={i < Math.floor(product.rating!) ? "#f59e0b" : "var(--text-muted)"}
                  />
                ))}
              </div>
              <span
                style={{ fontSize: "11px", color: "var(--text-muted)" }}
              >
                ({product.reviews?.toLocaleString()})
              </span>
            </div>
          )}

          {/* Price */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "17px",
                fontWeight: "700",
                color: product.sale_price ? "#f87171" : "var(--text-primary)",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {formatPrice(product.sale_price ?? product.price)}
            </span>
            {product.sale_price && (
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  textDecoration: "line-through",
                }}
              >
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
