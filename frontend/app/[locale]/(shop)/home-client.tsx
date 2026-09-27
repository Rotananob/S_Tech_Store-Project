"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ShoppingCart } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "next-intl";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

export function HeroSection() {
  const t = useTranslations("Hero");
  const [user, setUser] = useState<any>(undefined);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-white px-3 py-3 w-full overflow-hidden">
      <div className="relative w-full h-[180px] rounded-2xl overflow-hidden shadow-sm">
        <AnimatePresence initial={false}>
          {currentSlide === 0 ? (
            <motion.div
              key="slide1"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-gradient-to-br from-[#8B1A1A] to-[#c0392b] flex flex-col justify-center px-6"
            >
              <h1 className="text-white text-xl md:text-2xl font-bold leading-tight mb-1">
                {t("titleLine1")} {t("titleLine2")}
              </h1>
              <p className="text-white/90 text-xs md:text-sm mb-4 max-w-[200px]">
                {t("subtitle")}
              </p>
              <div className="flex gap-2">
                <Link
                  href="/category/all"
                  className="bg-white text-[#8B1A1A] text-xs font-bold px-4 py-1.5 rounded-full shadow-md no-underline inline-block"
                >
                  {t("shopNow")}
                </Link>
                {user === null && (
                  <Link
                    href="/register"
                    className="bg-white/20 text-white border border-white/40 text-xs font-bold px-4 py-1.5 rounded-full no-underline inline-block backdrop-blur-sm"
                  >
                    VIP
                  </Link>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="slide2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-gradient-to-br from-[#1a4fa0] to-[#2563eb] flex flex-col justify-center px-6"
            >
              <h1 className="text-white text-xl md:text-2xl font-bold leading-tight mb-1">
                {t("khmerSubtitle")}
              </h1>
              <p className="text-white/90 text-xs md:text-sm mb-4 max-w-[200px]">
                {t("subtitle")}
              </p>
              <Link
                href="/category/all"
                className="bg-white text-[#1a4fa0] text-xs font-bold px-4 py-1.5 rounded-full shadow-md no-underline inline-block w-max"
              >
                {t("shopNow")}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentSlide === 0 ? "bg-white w-4" : "bg-white/50"}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${currentSlide === 1 ? "bg-white w-4" : "bg-white/50"}`} />
        </div>
      </div>
    </section>
  );
}

export function FeatureStrip() {
  const t = useTranslations("Features");

  const featuresList = [
    { svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ), label: t("genuine") },
    { svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ), label: t("warranty") },
    { svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ), label: t("localPayments") },
    { svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ), label: t("sameDayDelivery") },
  ];

  return (
    <div className="bg-[#f8f8f8] border-y border-gray-200">
      <div className="overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex flex-nowrap md:justify-center items-center px-4 py-3 gap-6 min-w-max">
          {featuresList.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="text-[#8B1A1A]">{f.svg}</div>
              <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap tracking-tight">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CategorySection({ categories = [] }: { categories: any[] }) {
  const t = useTranslations("Categories");

  const getIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("laptop")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    );
    if (s.includes("desktop")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    );
    if (s.includes("part") || s.includes("component") || s.includes("accessor")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
    );
    if (s.includes("gaming")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
        <circle cx="15" cy="13" r="1"/><circle cx="17" cy="11" r="1"/>
        <path d="M21 6H3a1 1 0 0 0-1 1v9a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V7a1 1 0 0 0-1-1Z"/>
      </svg>
    );
    if (s.includes("second") || s.includes("used") || s.includes("hand")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 16h5v5"/>
      </svg>
    );
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    );
  };

  const defaultCategories = [
    { name: t("laptops"), slug: "laptops", color: "from-blue-400 to-blue-600" },
    { name: t("desktops"), slug: "desktops", color: "from-red-400 to-[#8B1A1A]" },
    { name: t("parts"), slug: "parts", color: "from-purple-400 to-purple-600" },
    { name: t("gaming"), slug: "gaming", color: "from-green-400 to-green-600" },
    { name: t("secondHand"), slug: "secondhand", color: "from-orange-400 to-orange-600", badge: "HOT" },
    { name: t("services"), slug: "services", color: "from-teal-400 to-teal-600" },
  ];

  const hasSecondHand = categories.some((c: any) =>
    c.slug?.toLowerCase() === "secondhand" || c.name?.toLowerCase().includes("second")
  );

  let displayCategories = categories.length > 0
    ? (hasSecondHand ? categories : [
        ...categories,
        { name: t("secondHand"), slug: "secondhand", badge: "HOT" }
      ])
    : defaultCategories;

  // map colors sequentially if fetching from api
  if (categories.length > 0) {
    const colors = ["from-blue-400 to-blue-600", "from-red-400 to-[#8B1A1A]", "from-purple-400 to-purple-600", "from-green-400 to-green-600", "from-orange-400 to-orange-600", "from-teal-400 to-teal-600"];
    displayCategories = displayCategories.map((c, i) => ({
      ...c,
      color: c.color || colors[i % colors.length]
    }));
  }

  return (
    <section className="bg-white pt-4 pb-2">
      <div className="px-4 flex justify-between items-center mb-3">
        <h2 className="text-[15px] font-bold text-gray-900">{t("shopByCategory")}</h2>
        <Link href="/category/all" className="text-[12px] text-gray-500 font-medium">
          View All &gt;
        </Link>
      </div>

      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="flex px-4 gap-4 min-w-max md:justify-center">
          {displayCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="flex flex-col items-center gap-1.5 no-underline group relative w-[60px]"
            >
              {cat.badge && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.5 bg-[#8B1A1A] text-white text-[9px] font-bold rounded-full z-10 shadow-sm border border-white">
                  {cat.badge}
                </span>
              )}
              <div className={`w-[50px] h-[50px] rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow`}>
                {getIcon(cat.slug)}
              </div>
              <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductCard({ product }: { product: any }) {
  const t = useTranslations("Products");
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: Number(product.id),
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url
    });
    useCartStore.getState().setIsOpen(true);
  };

  return (
    <motion.div 
      className="bg-white rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.1)] transition-shadow duration-300 relative border border-gray-100 flex flex-col h-full"
    >
      {product.is_featured && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-[#8B1A1A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            {t("hot")}
          </span>
        </div>
      )}

      <Link href={`/products/${product.slug}`} className="block relative w-full aspect-square bg-[#f5f5f5]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
          </div>
        )}
      </Link>

      <div className="p-2.5 flex flex-col flex-grow">
        <Link href={`/products/${product.slug}`} className="no-underline">
          <h3 className="text-[13px] font-bold text-gray-900 leading-tight mb-1 line-clamp-2 min-h-[30px]">
            {product.name}
          </h3>
        </Link>

        <p className="text-[10px] text-gray-500 mb-1.5 truncate">
          {product.category?.name || "Uncategorized"}
        </p>

        <div className="mt-auto mb-2.5">
          <div className="text-[#8B1A1A] font-bold text-[15px] leading-none mb-0.5">{formatUSD(product.price)}</div>
          <div className="text-gray-400 text-[11px] font-medium leading-none">{formatKHR(product.price)}</div>
        </div>

        <button
          className="w-full bg-[#f8f8f8] hover:bg-[#8B1A1A] text-gray-700 hover:text-white border border-gray-200 hover:border-[#8B1A1A] py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-[11px] font-bold"
          onClick={handleAddToCart}
        >
          <ShoppingCart size={12} />
          {t("addToCart")}
        </button>
      </div>
    </motion.div>
  );
}

export function BestSellers({ products = [] }: { products: any[] }) {
  const t = useTranslations("Products");

  return (
    <section className="bg-[#f5f5f5] py-4">
      <div className="px-4 flex justify-between items-center mb-3">
        <h2 className="text-[16px] font-black text-gray-900">{t("bestSellers")}</h2>
        <Link href="/products" className="text-[12px] text-[#1a4fa0] font-bold">
          {t("viewAll")} &gt;
        </Link>
      </div>

      <div className="px-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PromoCTA() {
  const tNav = useTranslations("Navigation");
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (user !== null) return null;

  return (
    <section className="bg-[#f5f5f5] p-3 pb-8">
      <div className="bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="text-center sm:text-left mb-3 sm:mb-0 relative z-10">
          <h2 className="text-white text-[15px] font-bold mb-1">Join S Tech VIP</h2>
          <p className="text-white/80 text-[11px] max-w-xs">
            Exclusive deals, order tracking, and more in Cambodia!
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto relative z-10">
          <Link href="/register" className="flex-1 sm:flex-none bg-white text-[#8B1A1A] text-[12px] font-bold py-2 px-4 rounded-lg text-center shadow-sm">
            {tNav('register')}
          </Link>
          <Link href="/login" className="flex-1 sm:flex-none bg-white/20 text-white border border-white/30 text-[12px] font-bold py-2 px-4 rounded-lg text-center backdrop-blur-sm">
            {tNav('signIn')}
          </Link>
        </div>
      </div>
    </section>
  );
}
