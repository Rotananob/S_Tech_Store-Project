"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { 
  ShoppingCart, 
  Laptop, 
  Monitor, 
  Cpu, 
  Server, 
  HardDrive, 
  Gamepad2, 
  RotateCcw, 
  Smartphone, 
  Zap, 
  AppWindow, 
  BoxSelect, 
  MonitorPlay, 
  Headphones, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Flame,
  Clock,
  Tag,
  Copy,
  Check,
  Gift,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "next-intl";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getEffectiveUser } from "@/lib/auth-user";
import api from "@/lib/api";

// ─── Luxury High-Tech Motion Variants (Apple Keynote & Studio Product Drop) ──
const dropContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const dropCardVariants: Variants = {
  hidden: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: "none"
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: "none",
    transition: { 
      duration: 0.4, 
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    } 
  },
};

const DEFAULT_HERO_SLIDES = [
  {
    title: "Next-Gen Laptops & Gear",
    desc: "Top-tier performance, 100% Genuine with Official Warranty.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
    alt: "Premium Laptops",
    badge: "Official Warranty",
    link: "/category/laptops",
    ctaText: "Shop Laptops"
  },
  {
    title: "Custom Gaming Desktops",
    desc: "High-FPS gaming rigs & workstations built for performance.",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=800&auto=format&fit=crop",
    alt: "Custom Gaming PC",
    badge: "Custom Build",
    link: "/build-pc",
    ctaText: "Explore Rigs"
  },
  {
    title: "Ultra-Fast PC Components",
    desc: "CPUs, GPUs, RAM & NVMe SSDs from leading global brands.",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=800&auto=format&fit=crop",
    alt: "PC Components",
    badge: "100% Genuine",
    link: "/category/parts",
    ctaText: "Shop Components"
  },
  {
    title: "Pro Accessories & Gear",
    desc: "Mechanical keyboards, gaming mice, monitors & headsets.",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop",
    alt: "Pro Gaming Peripherals",
    badge: "Best Deals",
    link: "/category/parts",
    ctaText: "Shop Gear"
  }
];

export function HeroSection() {
  const t = useTranslations("Hero");
  const [slideIndex, setSlideIndex] = useState(0);
  const [slides, setSlides] = useState(DEFAULT_HERO_SLIDES);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Dynamic API sync to pull live active promotions from backend
  useEffect(() => {
    // If PWA was launched from an Admin shortcut or with source=admin_pwa, bounce immediately to Admin Console
    if (typeof window !== "undefined") {
      if (window.location.search.includes("source=admin_pwa") || window.location.search.includes("pwa=admin")) {
        window.location.replace("/rok-mix-khernh");
        return;
      }
    }

    let mounted = true;
    api.get("/promotions/hero-banners")
      .then((res) => {
        if (!mounted) return;
        const bannerList = res.data?.data;
        if (Array.isArray(bannerList) && bannerList.length > 0) {
          const promoSlides = bannerList.map((p: any) => ({
            title: p.name,
            desc: p.description || "ការបញ្ចុះតម្លៃពិសេសពី S Tech Store ធានាគុណភាព ១០០%",
            image: p.image_url || "/images/pchum-ben-promo.jpg",
            alt: p.name,
            badge: `🔥 ${p.code ? p.code + ' ' : ''}${p.type === 'percentage' ? p.value + '% OFF' : '$' + p.value + ' OFF'}`,
            isGrandFestival: (p.name || "").includes("ភ្ជុំ") || (p.name || "").toLowerCase().includes("pchum"),
            isPromo: true,
            promoCode: p.code || null,
            link: p.target_url || "/category/all",
            ctaText: "ទិញឥឡូវនេះ (Shop Now)",
          }));
          setSlides([...promoSlides, ...DEFAULT_HERO_SLIDES]);
        } else {
          // Fallback to active-popup if hero-banners is empty
          api.get("/promotions/active-popup").then((popupRes) => {
            if (!mounted) return;
            const p = popupRes.data?.data || popupRes.data?.promo;
            if (p && p.name && p.image_url) {
              const dynamicSlide = {
                title: p.name,
                desc: p.description || "ការបញ្ចុះតម្លៃពិសេសពី S Tech Store ធានាគុណភាព ១០០%",
                image: p.image_url,
                alt: p.name,
                badge: p.code ? `🔥 ${p.code}` : "🔥 SPECIAL PROMOTION",
                isGrandFestival: (p.name || "").includes("ភ្ជុំ") || (p.name || "").toLowerCase().includes("pchum"),
                isPromo: true,
                promoCode: p.code || null,
                link: p.target_url || "/category/all",
                ctaText: "ទិញឥឡូវនេះ (Shop Now)",
              };
              setSlides([dynamicSlide, ...DEFAULT_HERO_SLIDES]);
            } else {
              setSlides(DEFAULT_HERO_SLIDES);
            }
          }).catch(() => {
            if (mounted) setSlides(DEFAULT_HERO_SLIDES);
          });
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Auto-slide every 4.2 seconds with smooth cross-fade
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  // Listen for promo auto-glide event to illuminate and lock hero slider to the festival banner
  useEffect(() => {
    const handlePromoGlide = () => {
      setSlideIndex(0);
    };
    window.addEventListener("stech:hero-promo-illuminated", handlePromoGlide);
    return () => window.removeEventListener("stech:hero-promo-illuminated", handlePromoGlide);
  }, []);

  const current = slides[slideIndex] || slides[0];

  const nextSlide = () => setSlideIndex((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <section className="bg-white dark:bg-[#0c0e12] px-4 sm:px-6 lg:px-8 xl:px-10 py-3 sm:py-5 w-full overflow-hidden transition-colors">
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="group relative w-full h-[210px] sm:h-[260px] md:h-[300px] lg:h-[360px] xl:h-[410px] 2xl:h-[440px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm bg-gradient-to-r from-gray-50 via-gray-100 to-gray-200 dark:from-[#141722] dark:via-[#1a1f2c] dark:to-[#12151f] border border-gray-200/80 dark:border-white/10"
        >
          {/* Fixed S Tech Store Logo & Brand Badge */}
          <div className="absolute top-3.5 left-4 sm:top-5 sm:left-6 xl:top-7 xl:left-8 z-30 flex items-center gap-2 bg-white/95 dark:bg-[#151922]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-white/10">
            <img src="/logo.jpg" alt="S Tech Store" className="w-6 h-6 rounded-full object-cover shadow-sm border border-white" />
            <span className="text-[11px] sm:text-xs font-black text-[#8B1A1A] dark:text-red-400 uppercase tracking-[0.15em] drop-shadow-sm">S Tech Store</span>
          </div>

          {/* Prev / Next Chevrons on Hover */}
          <button
            onClick={prevSlide}
            aria-label="Previous slide"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/85 dark:bg-[#151922]/85 hover:bg-white dark:hover:bg-[#1a1f2c] backdrop-blur-md shadow-md text-gray-800 dark:text-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-gray-200 dark:border-white/10"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/85 dark:bg-[#151922]/85 hover:bg-white dark:hover:bg-[#1a1f2c] backdrop-blur-md shadow-md text-gray-800 dark:text-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-gray-200 dark:border-white/10"
          >
            <ChevronRight size={18} />
          </button>

          {/* Dynamic Animated Content Container */}
          <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-8 xl:px-12 pt-10 sm:pt-8 z-10">
            {/* Animated Text */}
            <div className="flex flex-col items-start text-left w-[55%] sm:w-[54%] lg:w-[56%] z-20">
              <div className="min-h-[36px] sm:min-h-[46px] md:min-h-[56px] xl:min-h-[68px] mb-1.5 xl:mb-3 flex items-center relative w-full overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  <motion.h1
                    key={slideIndex}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="text-gray-900 dark:text-white text-base sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black leading-tight drop-shadow-sm absolute w-full pr-2"
                  >
                    {current.title}
                  </motion.h1>
                </AnimatePresence>
              </div>

              <div className="min-h-[30px] sm:min-h-[38px] xl:min-h-[46px] mb-3 sm:mb-5 xl:mb-6 relative w-full overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  <motion.p
                    key={`desc-${slideIndex}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="text-gray-600 dark:text-gray-300 text-[10px] sm:text-sm md:text-base xl:text-lg leading-relaxed line-clamp-2 font-medium max-w-xl absolute w-full"
                  >
                    {current.desc}
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Link
                  href={(current as any).link || "/category/all"}
                  className={`${
                    (current as any).isGrandFestival
                      ? "bg-gradient-to-r from-[#8B1A1A] via-[#b91c1c] to-[#dc2626] hover:from-[#701515] hover:to-[#b91c1c] shadow-lg shadow-red-900/20"
                      : "bg-[#8B1A1A] hover:bg-[#6B1010] shadow-md hover:shadow-lg"
                  } !text-white text-white text-xs sm:text-sm xl:text-base font-bold px-4 sm:px-6 xl:px-8 py-2 sm:py-3 xl:py-3.5 rounded-full transition-all no-underline flex items-center gap-2 hover:scale-105 shrink-0`}
                >
                  <span className="!text-white text-white font-bold">
                    {(current as any).ctaText || "Shop Now"}
                  </span>
                  <span className="!text-white text-white text-xs sm:text-sm xl:text-base">&rarr;</span>
                </Link>

                {/* Promo Code Chip with Copy */}
                {(current as any).promoCode && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText((current as any).promoCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-[11px] sm:text-xs font-bold text-gray-800 dark:text-gray-200 border border-amber-400/40 shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
                    title="ចុចដើម្បីចម្លងកូដប្រូម៉ូសិន"
                  >
                    <Tag size={12} className="text-amber-500" />
                    <span className="font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider font-extrabold">
                      {(current as any).promoCode}
                    </span>
                    {copiedCode ? (
                      <Check size={12} className="text-emerald-500" />
                    ) : (
                      <Copy size={12} className="text-gray-400" />
                    )}
                  </button>
                )}

                <span
                  className={`text-[10px] sm:text-xs xl:text-sm px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-full hidden md:inline-block border shrink-0 ${
                    (current as any).isGrandFestival
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-gray-950 font-black border-amber-300 shadow-xs"
                      : "font-semibold text-gray-500 dark:text-gray-300 bg-white/90 dark:bg-[#151922]/90 border-gray-200 dark:border-white/10"
                  }`}
                >
                  {current.badge}
                </span>
              </div>
            </div>

            {/* Auto Sliding Real Image Poster with High-Tech Glow */}
            <div className="absolute right-2 sm:right-6 lg:right-8 xl:right-10 top-1/2 -translate-y-1/2 w-[42%] sm:w-[44%] lg:w-[42%] xl:w-[40%] h-[84%] sm:h-[88%] xl:h-[90%] z-10 flex items-center justify-center">
              <div className="absolute w-36 h-36 sm:w-48 sm:h-48 xl:w-64 xl:h-64 bg-red-400/20 dark:bg-red-500/15 blur-3xl rounded-full pointer-events-none" />

              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={slideIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.03 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  <img
                    src={current.image}
                    alt={current.alt}
                    className="max-h-full max-w-full object-contain rounded-2xl sm:rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.25)] border-2 sm:border-4 border-white/90 dark:border-white/10 will-change-transform group-hover:scale-105 transition-transform duration-500"
                  />
                  {(current as any).promoCode && (
                    <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-400/40 text-[10px] sm:text-xs font-mono font-black text-amber-300 shadow-md hidden sm:flex items-center gap-1">
                      <Flame size={12} className="text-amber-400 fill-amber-400" />
                      <span>{(current as any).promoCode}</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Slide Indicators (Dots) */}
          <div className="absolute bottom-3 left-4 sm:left-8 z-20 flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSlideIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 border-none p-0 cursor-pointer ${
                  idx === slideIndex ? "w-6 sm:w-8 bg-[#8B1A1A] dark:bg-red-500" : "w-1.5 bg-gray-300 dark:bg-white/20 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Special Promotion Deals Component (Placed between Banner & Categories) ──
export function PromotionDealsSection({ products = [] }: { products?: any[] }) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [activePromo, setActivePromo] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 7, hours: 0, minutes: 0, seconds: 0 });

  // Dynamically sync with backend active promotion
  useEffect(() => {
    let mounted = true;
    api.get("/promotions/active-popup")
      .then((res) => {
        if (!mounted) return;
        const p = (res.data?.success && res.data?.promo) ? res.data.promo : null;
        setActivePromo(p);
      })
      .catch(() => {
        if (mounted) setActivePromo(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activePromo) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      let targetTime: number;
      if (activePromo.valid_until) {
        targetTime = new Date(activePromo.valid_until).getTime();
      } else {
        const d = new Date();
        targetTime = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      }
      const diff = Math.max(0, targetTime - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [activePromo]);

  // If no promotion exists in DB or no products, completely hide the section
  if (!activePromo) return null;

  const promoProducts = (products && products.length > 0 ? products : []).slice(0, 4);
  if (promoProducts.length === 0) return null;

  const handleCopyCode = (code: string) => {
    if (code) {
      navigator.clipboard?.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddToCart = (e: React.MouseEvent, product: any, promoPrice: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!getEffectiveUser()) {
      router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    addItem({
      id: Number(product.id),
      name: product.name,
      price: promoPrice,
      quantity: 1,
      image_url: product.image_url || product.image,
    });
    setTimeout(() => {
      useCartStore.getState().setIsOpen(true);
    }, 300);
  };

  const discountBadgeText = activePromo.type === "percentage" 
    ? `បញ្ចុះតម្លៃរហូតដល់ ${activePromo.value}%` 
    : `បញ្ចុះតម្លៃ $${activePromo.value}`;

  return (
    <section className="bg-gradient-to-b from-gray-50/70 via-white to-gray-50/50 dark:from-[#0b0d13] dark:via-[#11141e] dark:to-[#0b0d13] px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-9 w-full overflow-hidden border-b border-gray-100 dark:border-white/5 transition-colors">
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1 bg-gradient-to-r from-red-600 to-[#8B1A1A] text-white text-[10.5px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                <Flame size={12} className="fill-amber-300 text-amber-300 animate-pulse" />
                <span>{activePromo.name || "MEGA SALE"}</span>
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                {discountBadgeText}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>🎉 មហាប្រូម៉ូសិនពិសេស</span>
              <span className="text-sm sm:text-base font-bold text-gray-500 dark:text-gray-400 hidden sm:inline">• Flash Deals</span>
            </h2>
          </div>

          {/* Live Countdown Clock */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3.5 py-2 rounded-2xl shadow-xs">
              <Clock size={15} className="text-[#8B1A1A] dark:text-red-400 animate-spin [animation-duration:10s]" />
              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mr-1">ផុតកំណត់ក្នុង៖</span>
              <div className="flex items-center gap-1 font-mono font-black text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#8B1A1A] text-white text-[11px]">{timeLeft.days}ថ្ងៃ</span>
                <span className="text-gray-400">:</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-900 dark:bg-black text-amber-300 text-[11px]">{String(timeLeft.hours).padStart(2, "0")}</span>
                <span className="text-gray-400">:</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-900 dark:bg-black text-amber-300 text-[11px]">{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className="text-gray-400">:</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-900 dark:bg-black text-amber-300 text-[11px]">{String(timeLeft.seconds).padStart(2, "0")}</span>
              </div>
            </div>

            <Link
              href="/promotions"
              className="text-xs sm:text-sm font-bold text-[#8B1A1A] dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 no-underline whitespace-nowrap pl-1"
            >
              <span>មើលទាំងអស់</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 4-Item Promotional Grid */}
        <motion.div
          variants={dropContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5"
        >
          {promoProducts.map((product, idx) => {
            const originalPrice = Number(product.price);
            const discountPct = [30, 25, 35, 40][idx % 4];
            const promoPrice = product.sale_price ? Number(product.sale_price) : Math.round(originalPrice * (1 - discountPct / 100));

            return (
              <motion.div
                key={product.id || idx}
                variants={dropCardVariants}
                whileHover={{ y: -6 }}
                className="bg-white dark:bg-[#151922] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 relative border border-red-500/20 dark:border-red-500/20 hover:border-red-500 flex flex-col h-full group"
              >
                {/* Discount Ribbon */}
                <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
                  <span className="bg-gradient-to-r from-red-600 to-[#8B1A1A] text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-md">
                    -{discountPct}% OFF
                  </span>
                  <span className="bg-amber-400 text-gray-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                    Special Deal
                  </span>
                </div>

                {/* Product Image Frame */}
                <Link
                  href={`/products/${product.slug}`}
                  className="block relative w-full h-[160px] sm:h-[190px] bg-gradient-to-b from-red-50/20 via-gray-50/40 to-gray-100/40 dark:from-red-950/10 dark:via-[#1b212f]/80 dark:to-[#141822]/80 p-4 overflow-hidden flex items-center justify-center no-underline"
                >
                  <img
                    src={product.image_url || product.image || "/logo.jpg"}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-108 transition-transform duration-300 drop-shadow-sm"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/logo.jpg";
                    }}
                  />
                </Link>

                {/* Card Body */}
                <div className="p-3.5 sm:p-4 flex flex-col flex-grow bg-white dark:bg-[#151922] border-t border-gray-50 dark:border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">
                    {product.category?.name || "Official Tech"}
                  </span>

                  <Link href={`/products/${product.slug}`} className="no-underline">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 min-h-[36px] mb-2 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Pricing Row */}
                  <div className="mt-auto pt-2.5 border-t border-gray-100 dark:border-white/10 flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-1.5">
                      <div>
                        <div className="text-base sm:text-lg font-black text-red-600 dark:text-red-400 font-mono leading-tight">
                          {formatUSD(promoPrice)}
                        </div>
                        <div className="text-[11px] text-gray-400 line-through font-mono">
                          {formatUSD(originalPrice)}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full shrink-0">
                        សន្សំ {formatUSD(originalPrice - promoPrice)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, product, promoPrice)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer border-none active:scale-95"
                    >
                      <ShoppingCart size={13} strokeWidth={2.3} />
                      <span>ដាក់ចូលកន្ត្រក</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bonus Coupon Strip */}
        <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-950/70 via-[#1a0e12] to-amber-950/70 border border-amber-400/30 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-[#8B1A1A] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Gift size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-200">
                🎁 {activePromo.name}៖ {activePromo.description || "ការផ្តល់ជូនពិសេសពី S Tech Store ធានាគុណភាព ១០០%!"}
              </p>
              <p className="text-[11px] text-gray-300">
                {activePromo.code ? `ប្រើកូដ ${activePromo.code} នៅពេល Checkout ដើម្បីទទួលបានការបញ្ចុះតម្លៃបន្ថែម ភ្លាមៗ!` : "ទិញទំនិញឥឡូវនេះដើម្បីទទួលបានការបញ្ចុះតម្លៃពិសេស!"}
              </p>
            </div>
          </div>

          {activePromo.code ? (
            <button
              type="button"
              onClick={() => handleCopyCode(activePromo.code)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 transition-all cursor-pointer border-none shrink-0 ${
                copied
                  ? "bg-emerald-600 text-white scale-105"
                  : "bg-amber-400 hover:bg-amber-300 text-gray-950 active:scale-95"
              }`}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>បានចម្លងកូដ! ✓</span>
                </>
              ) : (
                <>
                  <Tag size={14} />
                  <span>{activePromo.code} (Copy)</span>
                </>
              )}
            </button>
          ) : (
            <Link
              href="/promotions"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-gray-950 flex items-center gap-1.5 transition-all cursor-pointer no-underline shrink-0"
            >
              <span>មើលការផ្ដល់ជូន &rarr;</span>
            </Link>
          )}
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
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto">
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

// Category Configuration with Professional Khmer & English Typography
interface CategoryConfig {
  slug: string;
  khName: string;
  enName: string;
  desc: string;
  badge?: string;
  color: string;
  glowBg: string;
  glowShadow: string;
}

const CATEGORY_DEFINITIONS: Record<string, CategoryConfig> = {
  laptops: {
    slug: "laptops",
    khName: "កុំព្យូទ័រយួរដៃ",
    enName: "Laptops",
    desc: "Ultrabook & Gaming",
    color: "from-blue-600 via-indigo-600 to-sky-500",
    glowBg: "bg-blue-500/25",
    glowShadow: "shadow-blue-500/30",
  },
  accessories: {
    slug: "accessories",
    khName: "គ្រឿងបន្ថែម",
    enName: "Accessories",
    desc: "Mouse, Keyboard & Audio",
    color: "from-rose-600 via-pink-600 to-red-500",
    glowBg: "bg-rose-500/25",
    glowShadow: "shadow-rose-500/30",
  },
  desktops: {
    slug: "desktops",
    khName: "កុំព្យូទ័រលើតុ",
    enName: "Desktops",
    desc: "Custom PCs & Towers",
    color: "from-purple-600 via-violet-600 to-indigo-600",
    glowBg: "bg-purple-500/25",
    glowShadow: "shadow-purple-500/30",
  },
  components: {
    slug: "components",
    khName: "គ្រឿងបន្លាស់",
    enName: "Components",
    desc: "CPU, GPU & Storage",
    color: "from-teal-600 via-emerald-600 to-cyan-500",
    glowBg: "bg-teal-500/25",
    glowShadow: "shadow-teal-500/30",
  },
  parts: {
    slug: "parts",
    khName: "គ្រឿងបន្លាស់",
    enName: "Components",
    desc: "CPU, GPU & Storage",
    color: "from-teal-600 via-emerald-600 to-cyan-500",
    glowBg: "bg-teal-500/25",
    glowShadow: "shadow-teal-500/30",
  },
  "gaming-gear": {
    slug: "gaming-gear",
    khName: "សម្ភារហ្គេម",
    enName: "Gaming Gear",
    desc: "Pro Esports Gear",
    badge: "PRO",
    color: "from-amber-500 via-orange-600 to-red-500",
    glowBg: "bg-amber-500/25",
    glowShadow: "shadow-amber-500/30",
  },
  gaming: {
    slug: "gaming",
    khName: "សម្ភារហ្គេម",
    enName: "Gaming Gear",
    desc: "Pro Esports Gear",
    badge: "PRO",
    color: "from-amber-500 via-orange-600 to-red-500",
    glowBg: "bg-amber-500/25",
    glowShadow: "shadow-amber-500/30",
  },
  monitors: {
    slug: "monitors",
    khName: "អេក្រង់កុំព្យូទ័រ",
    enName: "Monitors",
    desc: "4K & High Refresh",
    color: "from-cyan-600 via-blue-600 to-sky-500",
    glowBg: "bg-cyan-500/25",
    glowShadow: "shadow-cyan-500/30",
  },
  secondhand: {
    slug: "secondhand",
    khName: "មួយទឹកស្អាត",
    enName: "Second Hand",
    desc: "100% QC Inspected",
    badge: "HOT",
    color: "from-amber-600 via-yellow-500 to-orange-500",
    glowBg: "bg-yellow-500/25",
    glowShadow: "shadow-yellow-500/30",
  },
  services: {
    slug: "services",
    khName: "សេវាកម្មជួសជុល",
    enName: "Services",
    desc: "Repair & Upgrade Hub",
    color: "from-blue-700 via-indigo-700 to-purple-700",
    glowBg: "bg-indigo-500/25",
    glowShadow: "shadow-indigo-500/30",
  },
};

const resolveCategory = (c: any): CategoryConfig & { raw: any } => {
  const slug = (c.slug || c.name || "").toLowerCase().trim();
  for (const [key, def] of Object.entries(CATEGORY_DEFINITIONS)) {
    if (slug === key || slug.includes(key) || key.includes(slug)) {
      return {
        ...def,
        khName: def.khName,
        enName: def.enName,
        desc: def.desc,
        badge: c.badge || def.badge,
        color: def.color,
        glowBg: def.glowBg,
        glowShadow: def.glowShadow,
        raw: c,
      };
    }
  }
  return {
    slug: c.slug || slug,
    khName: c.name || "ផលិតផលបច្ចេកវិទ្យា",
    enName: c.name || "Tech Gear",
    desc: "Official Tech",
    color: "from-gray-700 to-gray-900",
    glowBg: "bg-red-500/20",
    glowShadow: "shadow-red-500/20",
    raw: c,
  };
};

export function CategorySection({ categories: initialCategories = [] }: { categories?: any[] }) {
  const [categories, setCategories] = useState<any[]>(initialCategories);

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

  // Bespoke Luxury Cyber-Tech Category Icons (Custom crafted, glow-accented, non-template)
  const getIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("laptop")) {
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:scale-110 duration-300 drop-shadow-sm">
          <rect x="4" y="5" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.12" />
          <path d="M7 14.5h14" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
          <circle cx="14" cy="11.5" r="1.5" fill="currentColor" />
          <path d="M2 21c0-.8.7-1.5 1.5-1.5h21c.8 0 1.5.7 1.5 1.5v.5H2v-.5z" fill="currentColor" />
          <rect x="11.5" y="19.5" width="5" height="1" rx="0.5" fill="#fff" fillOpacity="0.9" />
        </svg>
      );
    }
    if (s.includes("accessor")) {
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:scale-110 duration-300 drop-shadow-sm">
          <path d="M5 14a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="3" y="13" width="4.5" height="8" rx="2.2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.2" />
          <rect x="20.5" y="13" width="4.5" height="8" rx="2.2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.2" />
          <path d="M22.5 17c0 3-1.5 5-4.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="17.5" cy="22.5" r="1.2" fill="currentColor" />
        </svg>
      );
    }
    if (s.includes("desktop")) {
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:scale-110 duration-300 drop-shadow-sm">
          <rect x="6" y="3" width="16" height="22" rx="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.12" />
          <circle cx="14" cy="7" r="1.5" fill="currentColor" />
          <path d="M10 12h8M10 15h8M10 18h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
          <rect x="9" y="21" width="10" height="1.8" rx="0.9" fill="currentColor" />
        </svg>
      );
    }
    if (s.includes("part") || s.includes("component")) {
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:scale-110 duration-300 drop-shadow-sm">
          <rect x="6" y="6" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.12" />
          <rect x="10.5" y="10.5" width="7" height="7" rx="1.5" fill="currentColor" />
          <circle cx="14" cy="14" r="1.2" fill="#fff" />
          <path d="M10 2v4M14 2v4M18 2v4M10 22v4M14 22v4M18 22v4M2 10h4M2 14h4M2 18h4M22 10h4M22 14h4M22 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    }
    if (s.includes("gaming")) {
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:scale-110 duration-300 drop-shadow-sm">
          <path d="M6 12c0-3 2-5 5.5-5h5c3.5 0 5.5 2 5.5 5 0 4-1.8 7.5-3.5 7.5-1.3 0-2.2-1.7-3.5-1.7s-2.2 1.7-3.5 1.7C9.8 19.5 8 16 6 12z" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.15" />
          <path d="M10 10v4M8 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="18" cy="11" r="1.1" fill="#fff" />
          <circle cx="20" cy="13" r="1.1" fill="#fff" />
          <circle cx="16" cy="13" r="1.1" fill="#fff" />
          <circle cx="18" cy="15" r="1.1" fill="#fff" />
        </svg>
      );
    }
    if (s.includes("monitor") || s.includes("screen") || s.includes("display")) {
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:scale-110 duration-300 drop-shadow-sm">
          <rect x="3" y="5" width="22" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.12" />
          <path d="M7 15h14" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
          <path d="M14 19v4M10 23h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="14" cy="17" r="0.8" fill="currentColor" />
        </svg>
      );
    }
    if (s.includes("second") || s.includes("used") || s.includes("hand")) {
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:scale-110 duration-300 drop-shadow-sm">
          <path d="M14 3l9 4.2v6.2c0 5.8-3.9 10.3-9 11.6-5.1-1.3-9-5.8-9-11.6V7.2L14 3z" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.15" />
          <path d="M10.5 13.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (s.includes("service") || s.includes("repair")) {
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:scale-110 duration-300 drop-shadow-sm">
          <path d="M19.5 4.5a3.5 3.5 0 0 0-4.6 4.6L6.5 17.5a2 2 0 1 0 2.8 2.8l8.4-8.4a3.5 3.5 0 0 0 4.6-4.6l-2.8 2.8-2-2 2-2.8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
          <circle cx="8" cy="19" r="1" fill="#fff" />
        </svg>
      );
    }
    return (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:scale-110 duration-300 drop-shadow-sm">
        <rect x="5" y="5" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.15" />
        <path d="M9 14h10M14 9v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  };

  const defaultCategoryList: CategoryConfig[] = [
    CATEGORY_DEFINITIONS.laptops,
    CATEGORY_DEFINITIONS.accessories,
    CATEGORY_DEFINITIONS.desktops,
    CATEGORY_DEFINITIONS.components,
    CATEGORY_DEFINITIONS["gaming-gear"],
    CATEGORY_DEFINITIONS.monitors,
  ];

  // Exclude "smartphones" per user explicit instruction
  const filteredCategories = categories.filter((c: any) => {
    const s = (c.slug || c.name || "").toLowerCase();
    return !s.includes("smart") && !s.includes("phone");
  });

  // Always produce EXACTLY 6 categories by merging DB categories with defaultCategoryList
  let merged: any[] = [...filteredCategories];
  for (const def of defaultCategoryList) {
    if (merged.length >= 6) break;
    const exists = merged.some((c) => {
      const cs = (c.slug || c.name || "").toLowerCase();
      return cs.includes(def.slug) || def.slug.includes(cs);
    });
    if (!exists) {
      merged.push(def);
    }
  }

  const displayCategories = merged.slice(0, 6).map(resolveCategory);

  return (
    <section className="bg-white dark:bg-[#0c0e12] py-6 sm:py-10 border-b border-gray-100 dark:border-white/5 transition-colors">
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        
        {/* ── Section Header with High-Tech Pill & Khmer Typography ────────────────── */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 mb-2 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500 animate-pulse shadow-sm shadow-red-500" />
              <span className="text-[10.5px] sm:text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-widest font-khmer">
                S-Tech Categories • ជម្រើសសម្ភារបច្ចេកវិទ្យា
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-normal font-khmer flex items-center gap-2">
              <span>ទិញតាមប្រភេទផលិតផល</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1 font-khmer">
              ជ្រើសរើសប្រភេទឧបករណ៍ដែលអ្នកត្រូវការ ជាមួយការធានាផ្លូវការ និងតម្លៃពិសេស
            </p>
          </div>
          <Link
            href="/category/all"
            className="group self-start sm:self-auto text-xs sm:text-sm bg-gray-100 hover:bg-red-50 dark:bg-white/10 dark:hover:bg-red-950/40 text-gray-800 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 font-extrabold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl flex items-center gap-2 transition-all no-underline border border-gray-200/80 dark:border-white/10 hover:border-red-500/30 shadow-xs active:scale-95 shrink-0"
          >
            <span className="font-khmer">មើលទាំងអស់</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-sans tracking-wider hidden xs:inline">View All</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform text-red-500 shrink-0" />
          </Link>
        </div>

        {/* ── Exactly 6 Professional Luxury Category Cards ────────────────── */}
        <motion.div
          variants={dropContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-6 gap-2.5 sm:gap-4 lg:gap-5"
        >
          {displayCategories.map((cat) => (
            <motion.div
              key={cat.slug}
              variants={dropCardVariants}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.96 }}
              className="h-full"
            >
              <Link
                href={`/category/${cat.slug}`}
                className="group relative flex flex-col items-center justify-between p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-gray-50/90 via-white to-gray-50/60 dark:from-[#131722] dark:via-[#10131b] dark:to-[#0c0e14] hover:bg-white dark:hover:bg-[#161b28] border border-gray-200/80 dark:border-white/10 hover:border-red-500/50 dark:hover:border-red-500/50 transition-all duration-300 shadow-xs hover:shadow-xl hover:shadow-red-950/15 dark:hover:shadow-black/60 text-center h-full no-underline overflow-hidden"
              >
                {/* Ambient Interactive Backlight Glow */}
                <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full ${cat.glowBg || "bg-red-500/15"} blur-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none`} />

                {/* Top Rim Laser Accent */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Optional Badge */}
                {cat.badge && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-red-600 to-[#8B1A1A] text-white text-[8.5px] font-black rounded-full z-10 shadow-sm border border-white/20 uppercase tracking-wider">
                    {cat.badge}
                  </span>
                )}

                {/* Luxury Icon Pod */}
                <div className="relative mb-2.5 mt-1">
                  {/* Soft Ambient Icon Glow */}
                  <div className={`absolute inset-0 rounded-2xl ${cat.glowBg || "bg-red-500/20"} blur-md opacity-30 group-hover:opacity-90 transition-opacity duration-300`} />
                  
                  {/* Icon Frame */}
                  <div className={`relative w-12 h-12 sm:w-14 sm:h-14 lg:w-15 lg:h-15 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-md ${cat.glowShadow || "shadow-red-900/20"} group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300 border border-white/20`}>
                    {getIcon(cat.slug)}
                  </div>
                </div>

                {/* Dual Language Typography (Prominent Khmer + Sleek English) */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[12px] sm:text-[13.5px] font-extrabold text-gray-900 dark:text-gray-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors leading-tight font-khmer text-center line-clamp-1">
                    {cat.khName}
                  </span>
                  <span className="text-[9.5px] sm:text-[10.5px] font-bold text-gray-400 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors tracking-wider uppercase mt-0.5 text-center line-clamp-1">
                    {cat.enName}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 hidden lg:block line-clamp-1 font-medium font-khmer">
                    {cat.desc}
                  </span>
                </div>

                {/* Micro Interactive Pill on Desktop */}
                <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 w-full hidden sm:flex items-center justify-center gap-1 text-[10px] font-bold text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  <span className="font-khmer">រុករក</span>
                  <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function ProductCard({ product }: { product: any }) {
  const t = useTranslations("Products");
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [flyAnim, setFlyAnim] = useState<{ id: number; x: number; y: number } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [imgError, setImgError] = useState(false);

  const numPrice = Number(product.price || 0);
  const numSalePrice = (product.sale_price !== null && product.sale_price !== undefined && Number(product.sale_price) > 0 && Number(product.sale_price) < numPrice)
    ? Number(product.sale_price)
    : null;
  const effectivePrice = numSalePrice !== null ? numSalePrice : numPrice;
  const hasDiscount = numSalePrice !== null;
  const discountPercent = hasDiscount ? Math.round(((numPrice - numSalePrice!) / numPrice) * 100) : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is logged in
    if (!getEffectiveUser()) {
      router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);

    setFlyAnim({ id: Date.now(), x: e.clientX, y: e.clientY });
    setTimeout(() => setFlyAnim(null), 600);

    addItem({
      id: Number(product.id),
      name: product.name,
      price: effectivePrice,
      quantity: 1,
      image_url: product.image_url || product.image
    });
    
    setTimeout(() => {
      useCartStore.getState().setIsOpen(true);
    }, 600);
  };

  return (
    <>
      <motion.div 
        variants={dropCardVariants}
        whileHover={{ y: -6 }}
        className="bg-white dark:bg-[#151922] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 relative border border-gray-100 dark:border-white/10 hover:border-red-200 dark:hover:border-red-500/30 flex flex-col h-full group"
      >
        {/* Hot / Featured / Discount Badge */}
        {hasDiscount ? (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1">
            <span className="bg-gradient-to-r from-red-600 to-[#8B1A1A] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider">
              -{discountPercent}%
            </span>
          </div>
        ) : product.is_featured ? (
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
        <Link href={`/products/${product.slug}`} className="block relative w-full h-[180px] sm:h-[200px] lg:h-[220px] bg-gradient-to-b from-gray-50/80 to-gray-100/40 dark:from-[#1b212f]/80 dark:to-[#141822]/80 p-4 sm:p-5 overflow-hidden flex items-center justify-center no-underline">
          {!imgError && (product.image_url || product.image) ? (
            <img
              src={product.image_url || product.image}
              alt={product.name}
              onError={() => setImgError(true)}
              className="max-h-full max-w-full object-contain dark:brightness-105 group-hover:scale-105 transition-transform duration-300 drop-shadow-sm"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-1.5 bg-gray-50/60 dark:bg-white/5 p-4 rounded-xl">
              <img src="/logo.jpg" alt="S Tech Store" className="w-12 h-12 object-contain rounded-xl opacity-75 shadow-sm" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">S Tech Store</span>
            </div>
          )}
        </Link>

        {/* Card Body */}
        <div className="p-4 sm:p-5 flex flex-col flex-grow bg-white dark:bg-[#151922] border-t border-gray-50 dark:border-white/5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
            <span className="truncate max-w-[130px]">{product.category?.name || "Genuine Tech"}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full shrink-0">In Stock</span>
          </div>

          <Link href={`/products/${product.slug}`} className="no-underline">
            <h3 className="text-[14px] sm:text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 min-h-[42px] mb-2 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Pricing Row */}
          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/10 flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <div className="text-[17px] sm:text-[19px] xl:text-[20px] font-black text-[#8B1A1A] dark:text-red-400 leading-tight drop-shadow-sm font-mono truncate">
                    {formatUSD(effectivePrice)}
                  </div>
                  {hasDiscount && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 line-through font-mono">
                      {formatUSD(numPrice)}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-400 font-semibold mt-0.5 truncate flex items-center gap-1.5">
                  <span>{formatKHR(effectivePrice)}</span>
                  {hasDiscount && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      បញ្ចុះតម្លៃពិសេស
                    </span>
                  )}
                </div>
              </div>
              <Link 
                href={`/products/${product.slug}`}
                className="text-[11px] sm:text-xs text-[#1a4fa0] dark:text-blue-400 hover:text-[#8B1A1A] dark:hover:text-red-400 font-bold no-underline transition-colors shrink-0 whitespace-nowrap pl-1"
              >
                Details &rarr;
              </Link>
            </div>

            {/* Prominent Large Add to Cart Button */}
            <motion.button
              animate={isShaking ? { x: [0, -4, 4, -4, 4, 0] } : {}}
              whileTap={{ scale: 0.96 }}
              onClick={handleAddToCart}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#a62222] hover:from-[#6B1010] hover:to-[#8B1A1A] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer border-none active:scale-[0.98]"
              aria-label={t("addToCart")}
            >
              <ShoppingCart size={16} strokeWidth={2.3} />
              <span>{t("addToCart")}</span>
            </motion.button>
          </div>
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

  // Client background sync & real-time sync so edited products in admin reflect immediately
  useEffect(() => {
    import("@/lib/services/product.service").then(({ getProducts }) => {
      getProducts({ _t: Date.now(), fresh: 1 })
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          if (list && list.length > 0) {
            setProducts(list);
          }
        })
        .catch((err) => console.error("Client fetch products error:", err));
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
      setProducts(prev => prev.filter(p => Number(p.id) !== numId && p.slug !== String(delId)));
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

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "stech_last_product_update" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.product) {
            handleProductUpdated({ detail: data.product });
          }
        } catch (_) {}
      } else if (e.key === "stech_last_product_delete" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.productId || data?.rawId) {
            handleProductDeleted({ detail: { id: data.productId, rawId: data.rawId } });
          }
        } catch (_) {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("stech:product-updated", handleProductUpdated as EventListener);
      window.removeEventListener("stech:product-deleted", handleProductDeleted as EventListener);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
    };
  }, []);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  return (
    <section className="bg-[#f8f9fa] dark:bg-[#0c0d12] py-8 sm:py-12 border-b border-gray-100 dark:border-white/5">
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A]" />
              <span className="text-[11px] sm:text-xs font-bold text-[#8B1A1A] dark:text-red-400 uppercase tracking-wider">Top Recommended</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {t("bestSellers")}
            </h2>
          </div>
          <Link
            href="/category/all"
            className="text-xs sm:text-sm bg-white dark:bg-white/10 hover:bg-[#8B1A1A] dark:hover:bg-[#8B1A1A] text-gray-800 dark:text-gray-200 hover:text-white font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-all no-underline shadow-sm border border-gray-200 dark:border-white/10"
          >
            <span>{t("viewAll")}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>

        {/* Clean responsive grid: 5 on large 2xl desktop, 4 on standard desktop, 3 on tablet, 2 on mobile */}
        <motion.div
          variants={dropContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 xl:gap-7"
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </motion.div>
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
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="bg-gradient-to-r from-[#8B1A1A] via-[#a32222] to-[#1a4fa0] rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8 shadow-xl relative overflow-hidden text-white border border-[#8B1A1A]/30">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-black/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-5 text-center sm:text-left z-10 max-w-xl xl:max-w-2xl">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-md">
              <Sparkles size={30} className="text-amber-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
                <Sparkles size={13} className="text-amber-300" />
                <span>Member Privilege</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight m-0">
                Join S Tech VIP Club
              </h2>
              <p className="text-white/85 text-sm sm:text-base mt-2 leading-relaxed">
                Enjoy exclusive member pricing, priority official warranty, order tracking, and genuine tech support across Cambodia.
              </p>
            </div>
          </div>

          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto z-10 shrink-0">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-white hover:bg-gray-100 !text-[#8B1A1A] text-[#8B1A1A] text-sm sm:text-base font-black py-3.5 px-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center no-underline hover:scale-105 shrink-0 whitespace-nowrap"
            >
              {tNav('register')} Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-white/15 hover:bg-white/25 !text-white text-white border border-white/30 text-sm sm:text-base font-bold py-3.5 px-6 rounded-xl backdrop-blur-md transition-all text-center no-underline shrink-0 whitespace-nowrap"
            >
              {tNav('signIn')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
