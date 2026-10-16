"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import api from "@/lib/api";
import ProductCard from "@/components/product/ProductCard";
import { Filter, SlidersHorizontal, Sparkles, Package } from "lucide-react";

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialSort = searchParams.get("sort") === "newest" ? "Newest" : "Popular";

  const [sort, setSort] = useState(initialSort);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/products", { params: { fresh: 1, _t: Date.now() } })
      .then((res) => {
        let allProducts = Array.isArray(res.data) ? res.data : (res.data?.data || []);

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

    const handleProductUpdated = (e: any) => {
      const updated = e.detail || e;
      if (!updated || !updated.id) return;
      const numId = Number(updated.id);
      setProducts((prev) => {
        const exists = prev.some((p) => Number(p.id) === numId);
        if (exists) {
          return prev.map((p) => (Number(p.id) === numId ? { ...p, ...updated } : p));
        }
        return [updated, ...prev];
      });
    };

    const handleProductDeleted = (e: any) => {
      const delId = e.detail?.id ?? e.productId ?? e.detail?.rawId ?? e;
      if (!delId) return;
      const numId = Number(delId);
      setProducts((prev) => prev.filter((p) => Number(p.id) !== numId && p.slug !== String(delId)));
    };

    window.addEventListener("stech:product-updated", handleProductUpdated as EventListener);
    window.addEventListener("stech:product-deleted", handleProductDeleted as EventListener);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("stech_products_channel");
        channel.onmessage = (event) => {
          if (event.data?.type === "PRODUCT_UPDATED" && event.data.product) {
            handleProductUpdated({ detail: event.data.product });
          } else if (event.data?.type === "PRODUCT_DELETED") {
            handleProductDeleted({ detail: { id: event.data.productId, rawId: event.data.rawId } });
          }
        };
      }
    } catch (_) {}

    return () => {
      window.removeEventListener("stech:product-updated", handleProductUpdated as EventListener);
      window.removeEventListener("stech:product-deleted", handleProductDeleted as EventListener);
      if (channel) channel.close();
    };
  }, [sort]);

  return (
    <div className="bg-gray-50 dark:bg-[#0c0e12] min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
      {/* Desktop Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#12141a] via-[#1a1415] to-[#0c0e12] text-white py-12 lg:py-16 border-b border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(#8B1A1A_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold tracking-wide uppercase mb-3">
            <Sparkles size={13} className="text-red-400" />
            <span>Official Hardware Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-2">
            All Products <span className="text-[#8B1A1A] dark:text-red-500">.</span>
          </h1>
          <p className="font-khmer text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
            ស្វែងរកទំនិញបច្ចេកវិទ្យា Laptops, PC Builds និងគ្រឿងបន្លាស់សុទ្ធ ១០០% ធានាផ្លូវការ
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white dark:bg-[#151922] p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center font-bold">
              <Package size={17} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                Showing <strong className="text-gray-900 dark:text-white font-bold">{products.length}</strong> products
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 hidden sm:block whitespace-nowrap">
              Sort by:
            </label>
            <div className="relative w-full sm:w-auto">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full sm:w-auto pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1f2c] text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A] cursor-pointer appearance-none transition-colors"
              >
                <option value="Popular">🔥 Popular / Best Selling</option>
                <option value="Newest">⚡ Newest Arrivals</option>
                <option value="LowToHigh">💵 Price: Low to High</option>
                <option value="HighToLow">💎 Price: High to Low</option>
              </select>
              <SlidersHorizontal size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div 
                key={n} 
                className="h-[360px] bg-white dark:bg-[#151922] rounded-2xl border border-gray-200 dark:border-white/5 animate-pulse" 
              />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-4 bg-white dark:bg-[#151922] rounded-3xl border border-gray-200 dark:border-white/10 shadow-xs max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl">
              🛒
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
              No products found
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6">
              Check back later for new arrivals or browse other categories.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8B1A1A] hover:bg-[#6b1010] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all no-underline"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-[#0c0e12] flex items-center justify-center text-sm font-bold text-gray-500">
        Loading Products...
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
