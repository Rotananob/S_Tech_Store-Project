"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ShoppingCart, Laptop, Monitor, Cpu, Server, HardDrive, Gamepad2, RotateCcw, Smartphone, Zap, AppWindow, BoxSelect, MonitorPlay, Headphones, Sparkles } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "next-intl";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

const HERO_SLIDES = [
  {
    title: "Next-Gen Laptops & Gear",
    desc: "Top-tier performance, 100% Genuine with Official Warranty.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
    alt: "Premium Laptops",
    badge: "Official Warranty"
  },
  {
    title: "Custom Gaming Desktops",
    desc: "High-FPS gaming rigs & workstations built for performance.",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=800&auto=format&fit=crop",
    alt: "Custom Gaming PC",
    badge: "Custom Build"
  },
  {
    title: "Ultra-Fast PC Components",
    desc: "CPUs, GPUs, RAM & NVMe SSDs from leading global brands.",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=800&auto=format&fit=crop",
    alt: "PC Components",
    badge: "100% Genuine"
  },
  {
    title: "Pro Accessories & Gear",
    desc: "Mechanical keyboards, gaming mice, monitors & headsets.",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop",
    alt: "Pro Gaming Peripherals",
    badge: "Best Deals"
  }
];

export function HeroSection() {
  const t = useTranslations("Hero");
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const current = HERO_SLIDES[slideIndex];

  return (
    <section className="bg-white px-4 sm:px-6 lg:px-8 py-3 sm:py-5 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative w-full h-[190px] sm:h-[240px] md:h-[270px] lg:h-[300px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm bg-gradient-to-r from-gray-50 via-gray-100 to-gray-200">
          
          {/* Fixed S Tech Store Logo & Brand Badge (Remains Firmly in Place) */}
          <div className="absolute top-3.5 left-4 sm:top-5 sm:left-6 z-30 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm border border-gray-100">
            <img src="/logo.jpg" alt="S Tech Store" className="w-6 h-6 rounded-full object-cover shadow-sm border border-white" />
            <span className="text-[11px] sm:text-xs font-black text-[#8B1A1A] uppercase tracking-[0.15em] drop-shadow-sm">S Tech Store</span>
          </div>

          {/* Dynamic Animated Content Container */}
          <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-8 pt-10 sm:pt-8 z-10">
            {/* Animated Text */}
            <div className="flex flex-col items-start text-left w-[58%] sm:w-[50%] z-20">
              <div className="h-[28px] sm:h-[36px] overflow-hidden mb-1 flex items-center relative w-full">
                <AnimatePresence mode="wait">
                  <motion.h1
                    key={slideIndex}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="text-gray-900 text-base sm:text-2xl md:text-3xl font-black leading-[1.1] drop-shadow-sm absolute w-full"
                  >
                    {current.title}
                  </motion.h1>
                </AnimatePresence>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={`desc-${slideIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-gray-600 text-[10px] sm:text-sm md:text-base mb-3 sm:mb-5 leading-snug line-clamp-2 font-medium max-w-lg"
                >
                  {current.desc}
                </motion.p>
              </AnimatePresence>
              
              <div className="flex items-center gap-2.5">
                <Link
                  href="/category/all"
                  className="bg-[#8B1A1A] hover:bg-[#6B1010] text-white text-[11px] sm:text-sm font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-full shadow-md transition-all no-underline flex items-center gap-2 hover:scale-105"
                >
                  <span>Shop Now</span>
                  <span className="text-xs sm:text-sm">&rarr;</span>
                </Link>
                <span className="text-[10px] sm:text-xs font-semibold text-gray-500 bg-white/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full hidden sm:inline-block border border-gray-200">
                  {current.badge}
                </span>
              </div>
            </div>

            {/* Auto Sliding 4 Images with Smooth Transition */}
            <div className="absolute right-[-8%] sm:right-[0%] top-1/2 -translate-y-1/2 w-[55%] sm:w-[45%] lg:w-[42%] h-[130%] sm:h-[135%] z-10 flex items-center justify-center pointer-events-none">
              <div className="absolute w-44 h-44 bg-red-400/15 blur-3xl rounded-full" />
              
              <AnimatePresence mode="wait">
                <motion.img
                  key={slideIndex}
                  src={current.image}
                  alt={current.alt}
                  initial={{ opacity: 0, scale: 0.92, x: 30 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 1.05, x: -30 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="w-full h-full object-cover rounded-full shadow-[0_0_35px_rgba(0,0,0,0.15)] border-4 border-white/60"
                />
              </AnimatePresence>
            </div>
          </div>

          {/* Slide Indicators (Dots) */}
          <div className="absolute bottom-3 left-4 sm:left-8 z-20 flex items-center gap-1.5">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSlideIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 border-none p-0 cursor-pointer ${
                  idx === slideIndex ? "w-6 sm:w-8 bg-[#8B1A1A]" : "w-1.5 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeatureStrip() {
  const t = useTranslations("Features");

  const featuresList = [
    { svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ), label: t("genuine") },
    { svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ), label: t("warranty") },
    { svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ), label: t("localPayments") },
    { svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ), label: t("sameDayDelivery") },
  ];

  return (
    <div className="bg-[#fcfcfc] border-b border-gray-100 overflow-hidden relative w-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex w-max lg:w-full animate-marquee lg:animate-none hover:[animation-play-state:paused] lg:justify-between">
          <div className="flex flex-nowrap lg:flex-wrap items-center py-3 gap-8 sm:gap-12 lg:gap-6 px-4 pr-8 lg:pr-4 w-full lg:justify-between">
            {featuresList.map((f, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className="text-[#8B1A1A] p-1.5 bg-red-50 rounded-lg">{f.svg}</div>
                <span className="text-[11px] sm:text-xs font-semibold text-gray-700 whitespace-nowrap tracking-tight">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
          {/* Duplicate for mobile marquee infinite effect */}
          <div className="flex flex-nowrap items-center py-3 gap-8 px-4 pr-8 lg:hidden">
            {featuresList.map((f, i) => (
              <div key={`dup-${i}`} className="flex items-center gap-2 shrink-0">
                <div className="text-[#8B1A1A] p-1.5 bg-red-50 rounded-lg">{f.svg}</div>
                <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap tracking-tight">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategorySection({ categories: initialCategories = [] }: { categories?: any[] }) {
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const t = useTranslations("Categories");

  // Client background sync to ensure fresh categories from Neon DB
  useEffect(() => {
    import("@/lib/services/product.service").then(({ getCategories }) => {
      getCategories()
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          if (list && list.length > 0) {
            setCategories(list);
          }
        })
        .catch((err) => console.error("Client fetch categories error:", err));
    });
  }, []);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  // Clean GenZ / Human-design style icons (hand-crafted geometry, no AI generic stock vibe)
  const getIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("laptop")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M2 18h20" />
        <path d="M10 18v2h4v-2" />
      </svg>
    );
    if (s.includes("desktop")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2.5" />
        <circle cx="12" cy="7" r="1.5" fill="currentColor" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="16" x2="16" y2="16" />
      </svg>
    );
    if (s.includes("part") || s.includes("component") || s.includes("accessor")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="5" width="14" height="14" rx="2" />
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
        <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" />
      </svg>
    );
    if (s.includes("gaming")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12h4m-2-2v4" />
        <circle cx="15" cy="11" r="1" fill="currentColor" />
        <circle cx="17" cy="13" r="1" fill="currentColor" />
        <path d="M17.3 5H6.7a4 4 0 0 0-3.9 3.1L2 14.5a3.5 3.5 0 0 0 5.4 3.7L9.5 17h5l2.1 1.2a3.5 3.5 0 0 0 5.4-3.7l-.8-6.4A4 4 0 0 0 17.3 5z" />
      </svg>
    );
    if (s.includes("second") || s.includes("used") || s.includes("hand")) return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    );
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  };

  const defaultCategories = [
    { name: t("laptops"), slug: "laptops", color: "from-blue-500 to-indigo-600", desc: "Laptops & MacBooks" },
    { name: t("desktops"), slug: "desktops", color: "from-[#8B1A1A] to-red-700", desc: "Custom PCs & Desktops" },
    { name: t("parts"), slug: "parts", color: "from-purple-500 to-violet-700", desc: "CPUs, GPUs & Storage" },
    { name: t("gaming"), slug: "gaming", color: "from-emerald-500 to-teal-700", desc: "Gaming Gear & Gear" },
    { name: t("secondHand"), slug: "secondhand", color: "from-amber-500 to-orange-600", badge: "HOT", desc: "Inspected Pre-Owned" },
    { name: t("services"), slug: "services", color: "from-cyan-500 to-blue-700", desc: "Repair & Support" },
  ];

  // Exclude "smartphones" per user explicit instruction
  const filteredCategories = categories.filter((c: any) => {
    const s = (c.slug || c.name || "").toLowerCase();
    return !s.includes("smart") && !s.includes("phone");
  });

  // Always produce EXACTLY 6 categories by merging DB categories with defaultCategories
  let merged: any[] = [...filteredCategories];
  if (!merged.some((c) => c.slug?.toLowerCase() === "secondhand")) {
    merged.push({ name: t("secondHand"), slug: "secondhand", badge: "HOT", desc: "Inspected Pre-Owned" });
  }
  for (const def of defaultCategories) {
    if (merged.length >= 6) break;
    if (!merged.some((c) => c.slug?.toLowerCase() === def.slug.toLowerCase())) {
      merged.push(def);
    }
  }
  let displayCategories = merged.slice(0, 6);

  const colors = [
    "from-blue-500 to-indigo-600",
    "from-[#8B1A1A] to-red-700",
    "from-purple-500 to-violet-700",
    "from-emerald-500 to-teal-700",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-blue-700"
  ];
  displayCategories = displayCategories.map((c, i) => ({
    ...c,
    color: c.color || colors[i % colors.length]
  }));

  return (
    <section className="bg-white py-6 sm:py-10 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A] animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold text-[#8B1A1A] uppercase tracking-wider">Explore Genuine Gear</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
              {t("shopByCategory")}
            </h2>
          </div>
          <Link
            href="/category/all"
            className="text-xs sm:text-sm bg-gray-100 hover:bg-[#8B1A1A] text-gray-800 hover:text-white font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-all no-underline shadow-sm"
          >
            <span>View All</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>

        {/* Exactly 6 Categories in 1 balanced row on Desktop (lg:grid-cols-6) & 2 rows on Phone (grid-cols-3) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
          {displayCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="flex flex-col items-center p-3.5 sm:p-5 rounded-2xl bg-gray-50/70 hover:bg-white border border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 group no-underline relative text-center"
            >
              {cat.badge && (
                <span className="absolute -top-1.5 -right-1 px-2 py-0.5 bg-[#8B1A1A] text-white text-[9px] font-black rounded-full z-10 shadow-sm border border-white uppercase tracking-wider">
                  {cat.badge}
                </span>
              )}
              <div className={`w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-[18px] bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 mb-2.5`}>
                <div className="transition-transform group-hover:rotate-6 duration-300">
                  {getIcon(cat.slug)}
                </div>
              </div>
              <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 group-hover:text-[#8B1A1A] transition-colors leading-tight">
                {cat.name}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 hidden lg:block line-clamp-1 font-medium">
                {cat.desc || "Explore More"}
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
  const [flyAnim, setFlyAnim] = useState<{ id: number; x: number; y: number } | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);

    setFlyAnim({ id: Date.now(), x: e.clientX, y: e.clientY });
    setTimeout(() => setFlyAnim(null), 600);

    addItem({
      id: Number(product.id),
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url
    });
    
    setTimeout(() => {
      useCartStore.getState().setIsOpen(true);
    }, 600);
  };

  return (
    <>
      <motion.div 
        whileHover={{ y: -4 }}
        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 relative border border-gray-100 hover:border-red-200 flex flex-col h-full group"
      >
        {/* Hot / Featured Badge */}
        {product.is_featured ? (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider">
              {t("hot")}
            </span>
          </div>
        ) : (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              Genuine
            </span>
          </div>
        )}

        {/* Product Image Frame */}
        <Link href={`/products/${product.slug}`} className="block relative w-full h-[180px] sm:h-[200px] lg:h-[220px] bg-gradient-to-b from-gray-50/80 to-gray-100/40 p-4 sm:p-5 overflow-hidden flex items-center justify-center no-underline">
          {(product.image_url || product.image) ? (
            <img
              src={product.image_url || product.image}
              alt={product.name}
              className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-108 transition-transform duration-300 drop-shadow-sm"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
            </div>
          )}
        </Link>

        {/* Card Body */}
        <div className="p-4 sm:p-5 flex flex-col flex-grow bg-white border-t border-gray-50">
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
            <span className="truncate max-w-[130px]">{product.category?.name || "Genuine Tech"}</span>
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">In Stock</span>
          </div>

          <Link href={`/products/${product.slug}`} className="no-underline">
            <h3 className="text-[14px] sm:text-[15px] font-bold text-gray-900 leading-snug line-clamp-2 min-h-[42px] mb-2 group-hover:text-[#8B1A1A] transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Pricing Row */}
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-[17px] sm:text-[19px] font-black text-[#8B1A1A] leading-none drop-shadow-sm">
                {formatUSD(product.price)}
              </div>
              <div className="text-[11px] text-gray-400 font-semibold mt-1">
                {formatKHR(product.price)}
              </div>
            </div>

            {/* Quick Add Button */}
            <motion.button
              animate={isShaking ? { x: [0, -4, 4, -4, 4, 0] } : {}}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleAddToCart}
              className="px-3.5 py-2 rounded-xl bg-[#8B1A1A] hover:bg-[#6B1010] text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
              aria-label={t("addToCart")}
            >
              <ShoppingCart size={15} strokeWidth={2.2} />
              <span className="hidden sm:inline">Add</span>
            </motion.button>
          </div>

          {/* Preview Details Button */}
          <Link 
            href={`/products/${product.slug}`}
            className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-[#1a4fa0] text-[11px] font-bold rounded-xl text-center transition-colors border border-gray-200/60 no-underline"
          >
            Preview Details &rarr;
          </Link>
        </div>
      </motion.div>

      {/* Fly to Cart Animation Overlay */}
      <AnimatePresence>
        {flyAnim && (
          <motion.div
            key={flyAnim.id}
            initial={{ x: flyAnim.x - 16, y: flyAnim.y - 16, scale: 1, opacity: 1 }}
            animate={{ 
              x: typeof window !== 'undefined' ? window.innerWidth - 60 : 0, 
              y: typeof window !== 'undefined' ? window.innerHeight - 40 : 0, 
              scale: 0.2, 
              opacity: 0 
            }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            style={{ position: 'fixed', zIndex: 9999, top: 0, left: 0, pointerEvents: 'none' }}
          >
            <div className="w-8 h-8 bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] rounded-full flex items-center justify-center text-white shadow-lg">
              <ShoppingCart size={14} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function BestSellers({ products: initialProducts = [] }: { products?: any[] }) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const t = useTranslations("Products");

  // Client background sync so newly added/edited products in admin reflect immediately
  useEffect(() => {
    import("@/lib/services/product.service").then(({ getProducts }) => {
      getProducts()
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          if (list && list.length > 0) {
            setProducts(list.slice(0, 8));
          }
        })
        .catch((err) => console.error("Client fetch products error:", err));
    });
  }, []);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  return (
    <section className="bg-[#f8f9fa] py-8 sm:py-12 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A]" />
              <span className="text-[11px] sm:text-xs font-bold text-[#8B1A1A] uppercase tracking-wider">Top Recommended</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
              {t("bestSellers")}
            </h2>
          </div>
          <Link
            href="/category/all"
            className="text-xs sm:text-sm bg-white hover:bg-[#8B1A1A] text-gray-800 hover:text-white font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-all no-underline shadow-sm border border-gray-200"
          >
            <span>{t("viewAll")}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>

        {/* Clean 4 columns on desktop, 3 on tablet, 2 on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
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
    <section className="bg-white py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#8B1A1A] via-[#a32222] to-[#1a4fa0] rounded-3xl p-6 sm:p-10 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden text-white border border-[#8B1A1A]/30">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-black/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 text-center sm:text-left z-10 max-w-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-md">
              <Sparkles size={32} className="text-amber-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
                👑 Member Privilege
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight m-0">
                Join S Tech VIP Club
              </h2>
              <p className="text-white/85 text-sm sm:text-base mt-2 leading-relaxed">
                Enjoy exclusive member pricing, priority official warranty, order tracking, and genuine tech support across Cambodia.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto z-10 shrink-0">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-white hover:bg-gray-100 text-[#8B1A1A] text-sm sm:text-base font-bold py-3.5 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center no-underline hover:scale-105"
            >
              {tNav('register')} Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-white/15 hover:bg-white/25 text-white border border-white/30 text-sm sm:text-base font-bold py-3.5 px-6 rounded-xl backdrop-blur-md transition-all text-center no-underline"
            >
              {tNav('signIn')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
