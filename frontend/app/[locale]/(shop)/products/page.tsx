"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import api from "@/lib/api";
import ProductCard from "@/components/product/ProductCard";

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialSort = searchParams.get("sort") === "newest" ? "Newest" : "Popular";

  const [sort, setSort] = useState(initialSort);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/products")
      .then((res) => {
        let allProducts = res.data || [];

        // Apply sorting
        if (sort === "LowToHigh") {
          allProducts.sort((a: any, b: any) => a.price - b.price);
        } else if (sort === "HighToLow") {
          allProducts.sort((a: any, b: any) => b.price - a.price);
        } else if (sort === "Newest") {
          allProducts.sort((a: any, b: any) => b.id - a.id);
        }

        setProducts(allProducts);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [sort]);

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
          padding: "64px 0 48px",
          textAlign: "center",
        }}
      >
        <div className="container">
          <h1 style={{ fontSize: 42, fontWeight: 900, color: "#fff", marginBottom: 10, letterSpacing: "-0.02em" }}>
            All Products
          </h1>
          <p className="font-khmer" style={{ fontSize: 16, color: "rgba(255,255,255,0.55)" }}>
            ផលិតផលទាំងអស់
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "48px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: "#555" }}>
            Showing <strong style={{ color: "#1a1a1a" }}>{products.length}</strong> products
          </p>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              padding: "10px 16px",
              border: "1px solid #e5e5e5",
              borderRadius: 8,
              background: "#fff",
              fontSize: 14,
              fontWeight: 600,
              color: "#1a1a1a",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="Popular">Popular</option>
            <option value="Newest">Newest Arrivals</option>
            <option value="LowToHigh">Price: Low to High</option>
            <option value="HighToLow">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} style={{ height: 320, background: "#fff", borderRadius: 10, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>No products found</h3>
            <p style={{ fontSize: 14, color: "#777" }}>Check back later for new arrivals.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
