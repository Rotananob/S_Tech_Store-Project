"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, ShoppingCart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCartStore } from "@/store/cartStore";

export default function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const addItemToCart = useCartStore((state) => state.addItem);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    useWishlistStore.getState().fetchWishlist();
  }, []);

  const handleAddToCart = (item: any) => {
    addItemToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image,
    });
    alert("Added to cart!");
  };

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#fdfdfd" }} />;
  }

  return (
    <div style={{ background: "#fdfdfd", minHeight: "100vh", color: "#1a1a1a" }}>
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "36px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>
              My Wishlist
            </h1>
            <p style={{ color: "#666", fontSize: "14px" }}>
              {items.length} {items.length === 1 ? "item" : "items"} in your wishlist
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearWishlist}
              style={{ background: "none", border: "none", color: "#888", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
            >
              Clear Wishlist
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", border: "1px solid #eaeaea", background: "white", borderRadius: "8px" }}>
            <HeartEmptyIcon />
            <p style={{ fontSize: "16px", color: "#666", marginBottom: "20px", marginTop: "20px" }}>Your wishlist is empty.</p>
            <Link href="/" className="btn-red" style={{ padding: "12px 24px", display: "inline-block" }}>
              Discover Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={item.id} style={{ background: "white", border: "1px solid #eaeaea", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <Link href={item.slug ? `/products/${item.slug}` : `/products/${item.id}`} style={{ position: "relative", aspectRatio: "1/1", display: "block", background: "#f9f9f9" }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "20px" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>💻</div>
                  )}
                </Link>
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <Link href={item.slug ? `/products/${item.slug}` : `/products/${item.id}`} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", lineHeight: "1.4" }}>{item.name}</h3>
                  </Link>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#a92020", marginBottom: "16px" }}>
                    ${(item.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="btn-red"
                      style={{ flex: 1, padding: "8px", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    >
                      <ShoppingCart size={14} /> Add
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{ width: "36px", height: "36px", background: "white", border: "1px solid #eaeaea", borderRadius: "4px", color: "#888", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeartEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  );
}
