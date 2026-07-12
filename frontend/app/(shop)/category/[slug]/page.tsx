"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import ProductCard from "@/components/product/ProductCard";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [sort, setSort] = useState("Popular");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCPUs, setSelectedCPUs] = useState<string[]>([]);
  const [selectedRAM, setSelectedRAM] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    api.get('/products')
      .then(res => {
        const allProducts = res.data;
        // Filter by category slug
        let filtered = allProducts.filter((p: any) => 
          p.category?.name?.toLowerCase() === slug || slug === 'all'
        );
        
        // Basic filtering for demo
        if (inStockOnly) {
          filtered = filtered.filter((p: any) => p.stock > 0);
        }
        
        setProducts(filtered);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [slug, inStockOnly]);

  const toggleFilter = (list: string[], setList: (arr: string[]) => void, value: string) => {
    if (list.includes(value)) {
      setList(list.filter((i) => i !== value));
    } else {
      setList([...list, value]);
    }
  };

  return (
    <div style={{ background: "var(--bg-white)", minHeight: "100vh", color: "#1a1a1a" }}>
      <div className="container" style={{ paddingTop: "32px", paddingBottom: "80px" }}>
        
        {/* ── Header Area ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0 mb-6">
          <div>
            <h1 className="text-[28px] md:text-[32px] font-black mb-1 md:mb-2 tracking-tight capitalize">
              {slug === 'all' ? 'All Products' : slug} <span className="text-[#c0392b]">.</span>
            </h1>
            <p className="font-khmer text-[13px] md:text-[14px] text-[#666]">
              ស្វែងរកផលិតផលនៅទីនេះ
            </p>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-[#555] w-full md:w-auto">
            <span className="whitespace-nowrap">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-md bg-white text-[#1a1a1a] outline-none cursor-pointer w-full md:w-[140px]"
            >
              <option>Popular</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest Arrivals</option>
            </select>
          </div>
        </div>

        <div style={{ height: "1px", background: "#eaeaea", marginBottom: "32px" }} />

        {/* ── Main Layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 items-start">
          {/* LEFT — Filters Sidebar */}
          <aside className="bg-[#f7f7f7] p-4 md:p-6 rounded-lg w-full">
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "24px" }}>Filters</h2>

            {/* In Stock Toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "32px", fontSize: "14px", fontWeight: "500" }}>
              <input type="checkbox" className="custom-checkbox" checked={inStockOnly} onChange={() => setInStockOnly(!inStockOnly)} />
              In Stock
            </label>

            {/* Brand Filter */}
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>Brand</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {["ASUS", "Lenovo", "Dell", "MSI"].map((brand) => (
                  <label key={brand} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: selectedBrands.includes(brand) ? "#1a1a1a" : "#666" }}>
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleFilter(selectedBrands, setSelectedBrands, brand)}
                    />
                    {brand}
                  </label>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>Price (USD)</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "13px" }}
                />
                <span style={{ color: "#999" }}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>
            </div>

            {/* CPU Filter */}
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>CPU</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {["Intel Core i9", "Intel Core i7", "AMD Ryzen 9"].map((cpu) => (
                  <label key={cpu} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: selectedCPUs.includes(cpu) ? "#1a1a1a" : "#666" }}>
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={selectedCPUs.includes(cpu)}
                      onChange={() => toggleFilter(selectedCPUs, setSelectedCPUs, cpu)}
                    />
                    {cpu}
                  </label>
                ))}
              </div>
            </div>

            {/* RAM Filter */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>RAM</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {["32GB", "16GB"].map((ram) => (
                  <label key={ram} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: selectedRAM.includes(ram) ? "#1a1a1a" : "#666" }}>
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={selectedRAM.includes(ram)}
                      onChange={() => toggleFilter(selectedRAM, setSelectedRAM, ram)}
                    />
                    {ram}
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT — Product Grid */}
          <div className="w-full">
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>Loading products...</div>
            ) : products.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#666", background: "white", borderRadius: "8px", border: "1px solid #eaeaea" }}>
                No products found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={{
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    image: p.image_url,
                    slug: p.slug,
                    badge: p.is_featured ? "HOT" : (p.stock === 0 ? "OUT OF STOCK" : null),
                    in_stock: p.stock > 0
                  }} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
