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
    <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-[65vh]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            លទ្ធផលស្វែងរក: <span className="text-[#8B1A1A] dark:text-red-400">&quot;{q}&quot;</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {!loading && (products.length > 0 ? `រកឃើញចំនួន ${products.length} មុខ` : "រកមិនឃើញទំនិញដែលត្រូវគ្នាឡើយ")}
          </p>
        </div>

        {/* Quick Filter Tags */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-400 font-semibold mr-1">ពេញនិយម:</span>
          {["Laptop", "Gaming PC", "RTX", "Monitor", "RAM"].map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-700 dark:text-gray-300 hover:text-[#8B1A1A] dark:hover:text-red-400 font-medium transition-colors no-underline"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-gray-200 dark:border-white/10 border-t-[#8B1A1A] dark:border-t-red-500 animate-spin" />
          <span className="text-xs text-gray-400 font-semibold animate-pulse">កំពុងទាញយកលទ្ធផលស្វែងរក...</span>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm">
            🔎
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            រកមិនឃើញទំនិញ &quot;{q}&quot; ឡើយ
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            សូមពិនិត្យអក្ខរាវិរុទ្ធ ឬសាកល្បងស្វែងរកដោយប្រើពាក្យគន្លឹះទូទៅដូចជា៖ Laptop, PC, Monitor, RTX, SSD...
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#8B1A1A] hover:bg-[#6b1010] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all no-underline"
          >
            ត្រឡប់ទៅទំព័រដើម (Home)
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
