"use client";

import { useState, use } from "react";
import Link from "next/link";
import { ShoppingCart, ArrowLeftRight } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [sort, setSort] = useState("Popular");

  // Filter states
  const [inStockOnly, setInStockOnly] = useState(true);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(["ASUS"]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCPUs, setSelectedCPUs] = useState<string[]>([]);
  const [selectedRAM, setSelectedRAM] = useState<string[]>([]);

  // Toggle filter helper
  const toggleFilter = (list: string[], setList: (arr: string[]) => void, value: string) => {
    if (list.includes(value)) {
      setList(list.filter((i) => i !== value));
    } else {
      setList([...list, value]);
    }
  };

  const products = [
    {
      id: 1,
      name: "ASUS ROG Zephyrus G14 (2024)",
      badge: "NEW",
      specs: ["Ryzen 9 8945HS", "RTX 4070 8GB", "32GB LPDDR5X", "1TB NVMe Gen4"],
      price: 1999,
      oldPrice: null,
      inStock: true,
      image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80",
    },
    {
      id: 2,
      name: "Lenovo ThinkPad X1 Carbon Gen 12",
      badge: null,
      specs: ["Core Ultra 7 155H", "Intel Arc Graphics", "16GB LPDDR5X", "512GB NVMe Gen4"],
      price: 1749,
      oldPrice: null,
      inStock: true,
      image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
    },
    {
      id: 3,
      name: "Dell Precision 5480 Workstation",
      badge: "SALE",
      specs: ["Core i7-13800H", "RTX 2000 Ada", "32GB LPDDR5", "1TB NVMe Gen4"],
      price: 2199,
      oldPrice: 2499,
      inStock: true,
      image: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600&q=80",
    },
    {
      id: 4,
      name: "MSI Raider GE78 HX",
      badge: "OUT OF STOCK",
      specs: ["Core i9-14900HX", "RTX 4090 16GB", "64GB DDR5", "2TB NVMe Gen4"],
      price: 3499,
      oldPrice: null,
      inStock: false,
      image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80",
    },
  ];

  return (
    <div style={{ background: "var(--bg-white)", minHeight: "100vh", color: "#1a1a1a" }}>
      <div className="container" style={{ paddingTop: "32px", paddingBottom: "80px" }}>
        
        {/* ── Header Area ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0 mb-6">
          <div>
            <h1 className="text-[28px] md:text-[32px] font-black mb-1 md:mb-2 tracking-tight">
              Laptops <span className="text-[#c0392b]">.</span>
            </h1>
            <p className="font-khmer text-[13px] md:text-[14px] text-[#666]">
              កុំព្យូទ័រយួរដៃសម្រាប់គ្រប់តម្រូវការ / Laptops for every need
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="product-card-light">
                {/* Image Section */}
                <Link href={`/products/slug`}>
                  <div
                    style={{
                      background: "#f9f9f9",
                      padding: "20px",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      aspectRatio: "4/3",
                    }}
                  >
                    {p.badge && (
                      <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10 }}>
                        <span
                          className={
                            p.badge === "NEW" ? "badge-light-blue"
                            : p.badge === "SALE" ? "badge-light-red"
                            : "badge-light-gray"
                          }
                        >
                          {p.badge}
                        </span>
                      </div>
                    )}
                    <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain", filter: p.inStock ? "none" : "grayscale(100%) opacity(0.7)" }} />
                  </div>
                </Link>

                {/* Content Section */}
                <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <Link href={`/products/slug`} style={{ textDecoration: "none" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a1a", marginBottom: "8px", lineHeight: "1.4" }}>
                      {p.name}
                    </h3>
                  </Link>

                  {/* Specs */}
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", flex: 1 }}>
                    {p.specs.map((spec, i) => (
                      <li key={i} style={{ fontSize: "11px", color: "#666", marginBottom: "4px", fontFamily: "monospace" }}>
                        {spec}
                      </li>
                    ))}
                  </ul>

                  {/* Price */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "800", color: p.inStock ? "#a92020" : "#888", letterSpacing: "0.02em" }}>
                        {formatUSD(p.price)}
                      </span>
                      {p.oldPrice && (
                        <span style={{ fontSize: "12px", color: "#999", textDecoration: "line-through" }}>
                          {formatUSD(p.oldPrice)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                      {formatKHR(p.price)}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-red"
                      disabled={!p.inStock}
                      style={{
                        flex: 1,
                        padding: "10px",
                        fontSize: "13px",
                        background: p.inStock ? "#a92020" : "#d1d5db",
                        cursor: p.inStock ? "pointer" : "not-allowed",
                        boxShadow: "none",
                      }}
                    >
                      {p.inStock ? (
                        <>
                          <ShoppingCart size={14} style={{ marginRight: "6px", display: "inline" }} />
                          Add
                        </>
                      ) : (
                        "Out of Stock"
                      )}
                    </button>
                    <button
                      style={{
                        width: "38px",
                        height: "38px",
                        background: "white",
                        border: "1px solid #1a4fa0",
                        borderRadius: "4px",
                        color: "#1a4fa0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <ArrowLeftRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
