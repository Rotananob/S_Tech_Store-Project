"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import { Product } from "@/types";
import { getProducts } from "@/lib/services/product.service";
import ProductCard from "@/components/product/ProductCard";
import { Link } from "@/i18n/routing";

function SearchContent() {
  const t = useTranslations("Navigation");
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      if (!q.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await getProducts({ search: q });
        setProducts(Array.isArray(res) ? res : (res?.data || []));
      } catch (error) {
        console.error("Failed to fetch search results:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [q]);

  return (
    <div className="container" style={{ padding: "40px 16px", minHeight: "60vh" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: "#111" }}>
        Search Results for: <span style={{ color: "#1a4fa0" }}>&quot;{q}&quot;</span>
      </h1>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            border: "3px solid #f3f3f3", borderTop: "3px solid #1a4fa0",
            animation: "spin 1s linear infinite"
          }} />
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 0", background: "#f9f9f9", borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, color: "#555", marginBottom: 12 }}>No products found</h2>
          <p style={{ color: "#888", marginBottom: 24 }}>We couldn&#39;t find any items matching your search.</p>
          <Link href="/" style={{
            display: "inline-block", padding: "10px 24px",
            background: "#1a4fa0", color: "#fff", borderRadius: 6, fontWeight: 600,
            textDecoration: "none"
          }}>
            Back to Home
          </Link>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
