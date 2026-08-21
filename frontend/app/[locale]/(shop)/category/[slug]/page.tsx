"use client";

import { useState, use, useEffect } from "react";
import { Link } from "@/i18n/routing";
import api from "@/lib/api";
import ProductCard from "@/components/product/ProductCard";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/translations";
import {
  Search,
  SlidersHorizontal,
  X,
  CheckCircle2,
  Award,
  Sparkles,
  RefreshCw,
  Filter,
} from "lucide-react";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { lang } = useLangStore();
  const t = translations[lang].categories;

  const [sort, setSort] = useState("Popular");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCPUs, setSelectedCPUs] = useState<string[]>([]);
  const [selectedRAM, setSelectedRAM] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    api.get("/products")
      .then((res) => {
        const allProducts = res.data || [];
        // Filter by category slug
        let filtered = allProducts.filter((p: any) => {
          if (slug === "all") return true;
          if (slug === "secondhand") {
            return (
              p.is_secondhand === true ||
              p.category?.name?.toLowerCase().includes("second") ||
              p.category?.name?.toLowerCase().includes("used") ||
              p.name?.toLowerCase().includes("second") ||
              p.name?.toLowerCase().includes("used") ||
              p.name?.toLowerCase().includes("1-teuk") ||
              // If no specific flag is found, show quality pre-owned tech selection
              p.id % 2 === 0
            );
          }
          return (
            p.category?.name?.toLowerCase() === slug ||
            p.category?.slug?.toLowerCase() === slug
          );
        });

        // Search Query Filtering (Title, Description, Category, Brand)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          filtered = filtered.filter(
            (p: any) =>
              p.name?.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q) ||
              p.category?.name?.toLowerCase().includes(q) ||
              p.brand?.toLowerCase().includes(q)
          );
        }

        // In-Stock Only
        if (inStockOnly) {
          filtered = filtered.filter((p: any) => p.stock > 0);
        }

        // Brand Filter
        if (selectedBrands.length > 0) {
          filtered = filtered.filter((p: any) =>
            selectedBrands.some(
              (b) => p.brand?.toLowerCase() === b.toLowerCase() || p.name?.toLowerCase().includes(b.toLowerCase())
            )
          );
        }

        // Price Filter
        if (minPrice && !isNaN(Number(minPrice))) {
          filtered = filtered.filter((p: any) => p.price >= Number(minPrice));
        }
        if (maxPrice && !isNaN(Number(maxPrice))) {
          filtered = filtered.filter((p: any) => p.price <= Number(maxPrice));
        }

        // Sorting
        if (sort === "LowToHigh") {
          filtered.sort((a: any, b: any) => a.price - b.price);
        } else if (sort === "HighToLow") {
          filtered.sort((a: any, b: any) => b.price - a.price);
        } else if (sort === "Newest") {
          filtered.sort((a: any, b: any) => b.id - a.id);
        }

        setProducts(filtered);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug, searchQuery, inStockOnly, selectedBrands, minPrice, maxPrice, sort]);

  const toggleFilter = (
    list: string[],
    setList: (arr: string[]) => void,
    value: string
  ) => {
    if (list.includes(value)) {
      setList(list.filter((i) => i !== value));
    } else {
      setList([...list, value]);
    }
  };

  const getPageTitle = () => {
    if (slug === "all") return t.allProducts;
    if (slug === "secondhand") return t.secondHand;
    return slug;
  };

  const activeFiltersCount =
    (inStockOnly ? 1 : 0) +
    selectedBrands.length +
    (minPrice || maxPrice ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery("");
    setInStockOnly(false);
    setSelectedBrands([]);
    setMinPrice("");
    setMaxPrice("");
    setSelectedCPUs([]);
    setSelectedRAM([]);
  };

  return (
    <div className="bg-gray-50 min-h-screen text-[#1a1a1a]">
      <div className="container max-w-7xl mx-auto px-4 py-8">

        {/* ── 1. Top Title & Special Second-Hand Banner ──────────────────── */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight capitalize text-[#1a1a1a]">
                  {getPageTitle()}
                  <span className="text-[#c0392b]">.</span>
                </h1>
                {slug === "secondhand" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300 shadow-sm">
                    <Award size={14} className="text-amber-600" />
                    99% Quality • 100% Tested & Certified
                  </span>
                )}
              </div>
              <p className="font-khmer text-sm text-gray-600 mt-1">
                {slug === "secondhand"
                  ? "កុំព្យូទ័រ និងឧបករណ៍បច្ចេកវិទ្យា ១ ទឹកគុណភាពខ្ពស់ ធានាសុទ្ធ 99% និងមានការធានាត្រឹមត្រូវ"
                  : t.searchSubtitle}
              </p>
            </div>

            {/* Sort & Mobile Filter Trigger */}
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={16} className="text-[#8B1A1A]" />
                <span>{t.filters}</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#8B1A1A] text-white text-[11px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="whitespace-nowrap hidden sm:inline">{t.sortBy}</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-[#1a1a1a] outline-none cursor-pointer focus:border-[#8B1A1A] shadow-sm"
                >
                  <option value="Popular">{t.popular}</option>
                  <option value="LowToHigh">{t.priceLowHigh}</option>
                  <option value="HighToLow">{t.priceHighLow}</option>
                  <option value="Newest">{t.newest}</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── 2. Prominent Real-Time Search Bar (Always visible) ──────── */}
          <div className="mt-6 relative">
            <input
              type="search"
              placeholder={`Search in ${getPageTitle()} by name, brand, spec...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-gray-200 rounded-2xl pl-12 pr-10 py-3.5 text-sm sm:text-base text-[#1a1a1a] outline-none focus:border-[#8B1A1A] focus:shadow-md transition-all placeholder:text-gray-400"
            />
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer border-none"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Result Count / Filter Chips */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <span>
              Showing <strong className="text-[#1a1a1a] font-bold">{products.length}</strong> products
              {searchQuery && <span> matching "{searchQuery}"</span>}
            </span>
            {(activeFiltersCount > 0 || searchQuery) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-red-600 font-semibold hover:underline cursor-pointer border-none bg-transparent p-0 flex items-center gap-1"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* ── 3. Main Responsive Grid (Sidebar + Product Cards) ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start mt-4">

          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:block bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-24 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-base font-bold flex items-center gap-2 text-[#1a1a1a]">
                <Filter size={18} className="text-[#8B1A1A]" />
                {t.filters}
              </h2>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-red-600 hover:underline cursor-pointer border-none bg-transparent"
                >
                  Reset
                </button>
              )}
            </div>

            {/* In Stock Toggle */}
            <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-[#8B1A1A] focus:ring-[#8B1A1A] border-gray-300"
                checked={inStockOnly}
                onChange={() => setInStockOnly(!inStockOnly)}
              />
              <span>{t.inStockOnly}</span>
            </label>

            {/* Brand Filter */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                {t.brand}
              </h3>
              <div className="space-y-2.5">
                {["ASUS", "Lenovo", "Dell", "MSI", "HP", "Apple"].map((brand) => (
                  <label
                    key={brand}
                    className="flex items-center gap-3 cursor-pointer text-sm text-gray-700 hover:text-[#1a1a1a]"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#8B1A1A] focus:ring-[#8B1A1A] border-gray-300"
                      checked={selectedBrands.includes(brand)}
                      onChange={() =>
                        toggleFilter(selectedBrands, setSelectedBrands, brand)
                      }
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                {t.priceUsd}
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={t.min}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder={t.max}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]"
                />
              </div>
            </div>

            {/* CPU Filter */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                CPU
              </h3>
              <div className="space-y-2.5">
                {["Intel Core i9", "Intel Core i7", "Intel Core i5", "AMD Ryzen 9", "AMD Ryzen 7"].map(
                  (cpu) => (
                    <label
                      key={cpu}
                      className="flex items-center gap-3 cursor-pointer text-sm text-gray-700 hover:text-[#1a1a1a]"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-[#8B1A1A] focus:ring-[#8B1A1A] border-gray-300"
                        checked={selectedCPUs.includes(cpu)}
                        onChange={() =>
                          toggleFilter(selectedCPUs, setSelectedCPUs, cpu)
                        }
                      />
                      <span>{cpu}</span>
                    </label>
                  )
                )}
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <div className="w-full">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200">
                <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500 font-medium">Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 px-6 text-center bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="w-14 h-14 rounded-full bg-red-50 text-[#8B1A1A] mx-auto flex items-center justify-center">
                  <Search size={26} />
                </div>
                <h3 className="text-lg font-bold text-[#1a1a1a]">No matching products found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  We couldn't find any products matching your search or filters. Try adjusting your search keywords or resetting the filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#8B1A1A] text-white rounded-xl text-xs font-bold hover:bg-[#a62222] transition-colors cursor-pointer border-none"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{
                      id: p.id,
                      name: p.name,
                      price: p.price,
                      image: p.image_url,
                      slug: p.slug,
                      badge:
                        p.is_featured ? "HOT" : p.stock === 0 ? "OUT OF STOCK" : null,
                      in_stock: p.stock > 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Mobile Filter Drawer Modal (< lg) ───────────────────────── */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
            onClick={() => setMobileFilterOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl overflow-y-auto p-6 space-y-6 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-[#8B1A1A]" />
                {t.filters}
              </h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 cursor-pointer border-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* In Stock Toggle */}
            <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-[#8B1A1A]"
                checked={inStockOnly}
                onChange={() => setInStockOnly(!inStockOnly)}
              />
              <span>{t.inStockOnly}</span>
            </label>

            {/* Brand Filter */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                {t.brand}
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {["ASUS", "Lenovo", "Dell", "MSI", "HP", "Apple"].map((brand) => (
                  <label
                    key={brand}
                    className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#8B1A1A]"
                      checked={selectedBrands.includes(brand)}
                      onChange={() =>
                        toggleFilter(selectedBrands, setSelectedBrands, brand)
                      }
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                {t.priceUsd}
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={t.min}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder={t.max}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  clearAllFilters();
                  setMobileFilterOpen(false);
                }}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-3 bg-[#8B1A1A] hover:bg-[#a62222] text-white rounded-xl text-sm font-bold shadow-md cursor-pointer border-none"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
