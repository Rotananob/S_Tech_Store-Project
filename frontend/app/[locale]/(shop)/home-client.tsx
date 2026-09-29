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

const HERO_TEXTS = [
  "Next-Gen Laptops & Gear",
  "Build Your Dream PC",
  "Top-Tier Components",
  "Premium Tech Hub"
];

export function HeroSection() {
  const t = useTranslations("Hero");
  const [user, setUser] = useState<any>(undefined);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    const timer = setInterval(() => {
      setTextIndex(prev => (prev + 1) % HERO_TEXTS.length);
    }, 3000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  return (
    <section className="bg-white px-4 py-3 w-full overflow-hidden">
      <div className="relative w-full h-[180px] rounded-2xl overflow-hidden shadow-sm bg-gradient-to-r from-gray-50 to-gray-200">
        <div className="absolute inset-0 flex items-center justify-between px-5 relative z-10">
          
          {/* Text Content */}
          <div className="flex flex-col items-start text-left w-[55%] z-20">
            <div className="flex items-center gap-2 mb-3 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-100/50">
              <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-full object-cover shadow-sm border border-white" />
              <span className="text-xs font-black text-[#8B1A1A] uppercase tracking-[0.15em] drop-shadow-sm">S Tech Store</span>
            </div>
            
            <div className="h-[28px] overflow-hidden mb-1.5 flex items-center relative w-full">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={textIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-gray-900 text-lg md:text-2xl font-black leading-[1.1] drop-shadow-sm absolute w-full"
                >
                  {HERO_TEXTS[textIndex]}
                </motion.h1>
              </AnimatePresence>
            </div>
            
            <p className="text-gray-600 text-[10px] md:text-sm mb-4 leading-snug max-w-[200px] font-medium mt-1">
              Top-tier performance, 100% Genuine with Warranty.
            </p>
            
            <div className="flex gap-2">
              <Link
                href="/category/all"
                className="bg-[#e02e24] text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-md hover:bg-[#c82218] transition-colors"
              >
                Shop Now
              </Link>
            </div>
          </div>

          {/* Laptop Image Area */}
          <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[60%] h-[140%] z-10 flex items-center justify-center">
             {/* Decorative glow */}
             <div className="absolute w-32 h-32 bg-blue-400/20 blur-3xl rounded-full" />
             {/* Using a high-quality free Unsplash laptop image */}
             <img 
               src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop" 
               alt="Premium Laptop" 
               className="w-full h-full object-cover rounded-full shadow-[0_0_40px_rgba(0,0,0,0.15)] border-4 border-white/50"
             />
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ), label: t("genuine") },
    { svg: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ), label: t("warranty") },
    { svg: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ), label: t("localPayments") },
    { svg: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ), label: t("sameDayDelivery") },
  ];

  return (
    <div className="bg-[#fcfcfc] border-b border-gray-100 overflow-hidden relative w-full">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        <div className="flex flex-nowrap items-center py-2.5 gap-8 px-4 pr-8">
          {featuresList.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 shrink-0">
              <div className="text-[#8B1A1A]">{f.svg}</div>
              <span className="text-[10px] font-medium text-gray-600 whitespace-nowrap tracking-tight">
                {f.label}
              </span>
            </div>
          ))}
        </div>
        {/* Duplicate for infinite effect */}
        <div className="flex flex-nowrap items-center py-2.5 gap-8 px-4 pr-8">
          {featuresList.map((f, i) => (
            <div key={`dup-${i}`} className="flex items-center gap-1.5 shrink-0">
              <div className="text-[#8B1A1A]">{f.svg}</div>
              <span className="text-[10px] font-medium text-gray-600 whitespace-nowrap tracking-tight">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    );
    if (s.includes("desktop")) return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    );
    if (s.includes("part") || s.includes("component") || s.includes("accessor")) return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
    );
    if (s.includes("gaming")) return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
        <circle cx="15" cy="13" r="1"/><circle cx="17" cy="11" r="1"/>
        <path d="M21 6H3a1 1 0 0 0-1 1v9a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V7a1 1 0 0 0-1-1Z"/>
      </svg>
    );
    if (s.includes("second") || s.includes("used") || s.includes("hand")) return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 16h5v5"/>
      </svg>
    );
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
    <section className="bg-white pt-5 pb-3">
      <div className="px-4 flex justify-between items-center mb-4">
        <h2 className="text-[16px] font-bold text-gray-900">{t("shopByCategory")}</h2>
        <Link href="/category/all" className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors">
          View All
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      </div>

      <div className="px-4 pb-2">
        <div className="grid grid-cols-4 md:grid-cols-6 gap-x-3 gap-y-5 justify-items-center">
          {displayCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="flex flex-col items-center gap-2 no-underline group relative w-full"
            >
              {cat.badge && (
                <span className="absolute -top-1.5 -right-0 px-1.5 py-0.5 bg-[#8B1A1A] text-white text-[9px] font-bold rounded-full z-10 shadow-sm border border-white">
                  {cat.badge}
                </span>
              )}
              <div className={`w-[56px] h-[56px] rounded-[18px] bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow group-hover:-translate-y-1 duration-200`}>
                <div className="scale-125">
                  {getIcon(cat.slug)}
                </div>
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
  const [flyAnim, setFlyAnim] = useState<{ id: number; x: number; y: number } | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Trigger shake animation on button
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);

    // Trigger fly animation
    setFlyAnim({ id: Date.now(), x: e.clientX, y: e.clientY });
    setTimeout(() => setFlyAnim(null), 600);

    addItem({
      id: Number(product.id),
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url
    });
    
    // Delay cart opening slightly to let user see the fly animation
    setTimeout(() => {
      useCartStore.getState().setIsOpen(true);
    }, 600);
  };

  return (
    <>
      <motion.div 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative border border-gray-100/80 flex flex-col h-full group cursor-pointer"
      >
        {product.is_featured && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {t("hot")}
            </span>
          </div>
        )}

        <Link href={`/products/${product.slug}`} className="block relative w-full aspect-[4/3] bg-gray-50/50 p-4">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-10 bg-gray-50 rounded-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
            </div>
          )}
        </Link>

        <div className="p-3 pt-3 flex flex-col flex-grow relative bg-white border-t border-gray-50">
          <Link href={`/products/${product.slug}`} className="no-underline">
            <h3 className="text-[14px] font-bold text-gray-900 leading-snug line-clamp-2 min-h-[40px] mb-1 group-hover:text-[#8B1A1A] transition-colors">
              {product.name}
            </h3>
          </Link>

          <p className="text-[11px] text-gray-500 mb-2.5 truncate font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            {product.category?.name || "Uncategorized"}
          </p>

          <div className="mt-auto flex items-end justify-between mb-3">
            <div className="flex flex-col gap-0.5">
              <div className="text-[16px] font-black text-[#e02e24] leading-none drop-shadow-sm">{formatUSD(product.price)}</div>
              <div className="text-[12px] text-gray-400 font-bold leading-none">{formatKHR(product.price)}</div>
            </div>
            
            <motion.button
              animate={isShaking ? { x: [0, -5, 5, -5, 5, 0], scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.4 }}
              whileTap={{ scale: 0.8 }}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] text-white hover:shadow-lg flex items-center justify-center transition-all shadow-md z-10"
              onClick={handleAddToCart}
              aria-label={t("addToCart")}
            >
              <ShoppingCart size={18} className="ml-[-1px]" strokeWidth={2.5} />
            </motion.button>
          </div>
          
          {/* Preview Details Button */}
          <Link 
            href={`/products/${product.slug}`}
            className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-[#1a4fa0] text-[11px] font-bold rounded-xl text-center transition-colors border border-gray-100"
          >
            Preview Details
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

export function BestSellers({ products = [] }: { products: any[] }) {
  const t = useTranslations("Products");

  return (
    <section className="bg-[#f5f5f5] py-5">
      <div className="px-4 flex justify-between items-center mb-4">
        <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">{t("bestSellers")}</h2>
        <Link href="/products" className="text-[11px] bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors">
          {t("viewAll")} 
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
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
    <section className="bg-white px-4 py-8">
      <div className="max-w-md mx-auto bg-gradient-to-br from-[#8B1A1A] via-[#a32222] to-[#c0392b] rounded-[24px] p-6 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden border border-[#8B1A1A]/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white mb-4 backdrop-blur-md shadow-sm relative z-10 border border-white/20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h2 className="text-white text-[18px] font-bold mb-2 relative z-10">Join S Tech VIP</h2>
        <p className="text-white/80 text-[13px] leading-relaxed mb-6 relative z-10 max-w-[240px]">
          Exclusive deals, order tracking, and more in Cambodia!
        </p>
        
        <div className="flex w-full gap-3 relative z-10">
          <Link href="/register" className="flex-1 bg-white text-[#8B1A1A] text-[14px] font-bold py-3 px-6 rounded-full shadow-md hover:scale-105 transition-transform text-center flex items-center justify-center">
            {tNav('register')}
          </Link>
          <Link href="/login" className="flex-1 bg-white/20 text-white border border-white/30 text-[14px] font-bold py-3 px-6 rounded-full text-center backdrop-blur-md hover:bg-white/30 transition-colors flex items-center justify-center">
            {tNav('signIn')}
          </Link>
        </div>
      </div>
    </section>
  );
}
