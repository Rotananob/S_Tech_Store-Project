"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import ProductCard from "@/components/product/ProductCard";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/translations";
import {
  Search,
  SlidersHorizontal,
  X,
  Award,
  Filter,
} from "lucide-react";

interface RawProduct {
  id: number;
  name: string;
  price: number;
  sale_price?: number;
  image_url?: string;
  slug: string;
  is_featured?: boolean;
  is_secondhand?: boolean;
  stock: number;
  brand?: string;
  description?: string;
  category?: { name?: string; slug?: string };
}

interface Props {
  slug: string;
  initialProducts: RawProduct[];
}

import { AnimatePresence, motion } from "framer-motion";

export default function CategoryClient({ slug, initialProducts }: Props) {
  const { lang } = useLangStore();
  const t = translations[lang].categories;

  const [sort, setSort] = useState("Popular");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCPUs, setSelectedCPUs] = useState<string[]>([]);

  const toggleFilter = (list: string[], setList: (arr: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((i) => i !== value) : [...list, value]);
  };

  const getPageTitle = () => {
    if (slug === "all") return t.allProducts;
    if (slug === "secondhand") return t.secondHand;
    return slug;
  };

  let products = initialProducts.filter((p) => {
    if (slug === "all") return true;
    if (slug === "secondhand") {
      return (
        p.is_secondhand === true ||
        p.category?.name?.toLowerCase().includes("second") ||
        p.category?.name?.toLowerCase().includes("used") ||
        p.name?.toLowerCase().includes("second") ||
        p.name?.toLowerCase().includes("used") ||
        p.name?.toLowerCase().includes("1-teuk") ||
        p.id % 2 === 0
      );
    }
    return (
      p.category?.name?.toLowerCase() === slug ||
      p.category?.slug?.toLowerCase() === slug
    );
  });

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    products = products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
    );
  }

  if (inStockOnly) products = products.filter((p) => p.stock > 0);

  if (selectedBrands.length > 0) {
    products = products.filter((p) =>
      selectedBrands.some(
        (b) =>
          p.brand?.toLowerCase() === b.toLowerCase() ||
          p.name?.toLowerCase().includes(b.toLowerCase())
      )
    );
  }

  if (minPrice && !isNaN(Number(minPrice))) {
    products = products.filter((p) => p.price >= Number(minPrice));
  }
  if (maxPrice && !isNaN(Number(maxPrice))) {
    products = products.filter((p) => p.price <= Number(maxPrice));
  }

  if (sort === "LowToHigh") products = [...products].sort((a, b) => a.price - b.price);
  else if (sort === "HighToLow") products = [...products].sort((a, b) => b.price - a.price);
  else if (sort === "Newest") products = [...products].sort((a, b) => b.id - a.id);

  const activeFiltersCount =
    (inStockOnly ? 1 : 0) + selectedBrands.length + (minPrice || maxPrice ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery("");
    setInStockOnly(false);
    setSelectedBrands([]);
    setMinPrice("");
    setMaxPrice("");
    setSelectedCPUs([]);
  };

  return (
    <div className="bg-gray-50 min-h-screen text-[#1a1a1a]">
      <div className="container max-w-7xl mx-auto px-4 py-8">

        {/* Title & Secondhand Banner */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight capitalize text-[#1a1a1a]">
                  {getPageTitle()}
                  <span className="text-[#c0392b]">.</span>
                </h1>
                {slug === "secondhand" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300 shadow-sm">
                    <Award size={14} className="text-amber-600" />
                    99% Quality - 100% Tested
                  </span>
                )}
              </div>
              <p className="font-khmer text-sm text-gray-600 mt-1">
                {slug === "secondhand"
                  ? "កុំព្យូទ័រ និងឧបករណ៍បច្ចេកវិទ្យា ១ ទឹកគុណភាពខ្ពស់"
                  : t.searchSubtitle}
              </p>
            </motion.div>

            {/* Sort & Mobile Filter Trigger */}
            <motion.div 
              className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
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
              </motion.button>

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
            </motion.div>
          </div>

          {/* Search Bar */}
          <motion.div 
            className="mt-6 relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <input
              type="search"
              placeholder={`Search in ${getPageTitle()} by name, brand, spec...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-gray-200 rounded-2xl pl-12 pr-10 py-3.5 text-sm sm:text-base text-[#1a1a1a] outline-none focus:border-[#8B1A1A] focus:shadow-md transition-all placeholder:text-gray-400"
            />
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer border-none"
                >
                  <X size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Result count */}
          <motion.div 
            className="flex items-center justify-between mt-3 text-xs text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
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
          </motion.div>
        </div>

        {/* Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start mt-4">

          {/* Desktop Sidebar */}
          <motion.aside 
            className="hidden lg:block bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-24 space-y-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
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

            <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-[#8B1A1A] focus:ring-[#8B1A1A] border-gray-300"
                checked={inStockOnly}
                onChange={() => setInStockOnly(!inStockOnly)}
              />
              <span>{t.inStockOnly}</span>
            </label>

            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t.brand}</h3>
              <div className="space-y-2.5">
                {["ASUS", "Lenovo", "Dell", "MSI", "HP", "Apple"].map((brand) => (
                  <label key={brand} className="flex items-center gap-3 cursor-pointer text-sm text-gray-700 hover:text-[#1a1a1a]">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#8B1A1A] focus:ring-[#8B1A1A] border-gray-300"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleFilter(selectedBrands, setSelectedBrands, brand)}
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t.priceUsd}</h3>
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

            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">CPU</h3>
              <div className="space-y-2.5">
                {["Intel Core i9", "Intel Core i7", "Intel Core i5", "AMD Ryzen 9", "AMD Ryzen 7"].map((cpu) => (
                  <label key={cpu} className="flex items-center gap-3 cursor-pointer text-sm text-gray-700 hover:text-[#1a1a1a]">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#8B1A1A] focus:ring-[#8B1A1A] border-gray-300"
                      checked={selectedCPUs.includes(cpu)}
                      onChange={() => toggleFilter(selectedCPUs, setSelectedCPUs, cpu)}
                    />
                    <span>{cpu}</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.aside>

          {/* Product Grid */}
          <div className="w-full">
            {products.length === 0 ? (
              <motion.div 
                className="py-20 px-6 text-center bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="w-14 h-14 rounded-full bg-red-50 text-[#8B1A1A] mx-auto flex items-center justify-center">
                  <Search size={26} />
                </div>
                <h3 className="text-lg font-bold text-[#1a1a1a]">No matching products found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Try adjusting your search or resetting filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#8B1A1A] text-white rounded-xl text-xs font-bold hover:bg-[#a62222] transition-colors cursor-pointer border-none"
                >
                  Clear all filters
                </button>
              </motion.div>
            ) : (
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                }}
              >
                {products.map((p) => (
                  <motion.div
                    key={p.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
                    }}
                    layout
                  >
                    <ProductCard
                      product={{
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        sale_price: p.sale_price,
                        image: p.image_url,
                        slug: p.slug,
                        badge: p.is_featured ? "HOT" : p.stock === 0 ? "OUT OF STOCK" : null,
                        in_stock: p.stock > 0,
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileFilterOpen(false)}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl overflow-y-auto p-6 space-y-6"
            >
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

              <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-[#8B1A1A]"
                  checked={inStockOnly}
                  onChange={() => setInStockOnly(!inStockOnly)}
                />
                <span>{t.inStockOnly}</span>
              </label>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t.brand}</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {["ASUS", "Lenovo", "Dell", "MSI", "HP", "Apple"].map((brand) => (
                    <label key={brand} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-[#8B1A1A]"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleFilter(selectedBrands, setSelectedBrands, brand)}
                      />
                      <span>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t.priceUsd}</h4>
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

              <div className="pt-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white pb-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => { clearAllFilters(); setMobileFilterOpen(false); }}
                  className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  Reset
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 py-3 bg-[#8B1A1A] hover:bg-[#a62222] text-white rounded-xl text-sm font-bold shadow-md cursor-pointer border-none"
                >
                  Apply Filters
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
