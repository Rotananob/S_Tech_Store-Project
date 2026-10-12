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
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const dropCardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -30, 
    scale: 0.96,
    filter: "blur(4px)"
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: "blur(0px)",
    transition: { 
      duration: 0.65, 
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    } 
  },
};

// ─── Tier 2: Grand Seasonal Festival Mega Campaigns (ពិធីបុណ្យភ្ជំបិណ្ឌ Poster) ──────
const GRAND_FESTIVAL_SLIDE = {
  title: "🎉 មហាប្រូម៉ូសិន ពិធីបុណ្យភ្ជំបិណ្ឌ Up to 40% OFF",
  desc: "អបអរសាទរពិធីបុណ្យភ្ជំបិណ្ឌ! បញ្ចុះតម្លៃរហូតដល់ 40% លើ Gaming Laptops, Custom PC Builds, Monitors និង Accessories ធានាត្រឹមត្រូវ ដឹកជូន ២៥ ខេត្ត-ក្រុង!",
  image: "/images/pchum-ben-promo.jpg",
  alt: "Pchum Ben Festival Mega Sale Poster",
  badge: "🇰🇭 មហាប្រូម៉ូសិន បុណ្យភ្ជំបិណ្ឌ",
  isGrandFestival: true,
  promoCode: "PCHUMBEN2026",
  link: "/category/all",
  ctaText: "Shop Festival 40% OFF"
};

// ─── Tier 1: Ultimate Gaming & Custom PC Rig Festival (Gaming Poster) ────────
const GAMING_RIG_SLIDE = {
  title: "⚡ Ultimate Gaming & PC Builds 30% OFF",
  desc: "រៀបចំម៉ាស៊ីន Custom Water-Cooled Gaming Rig, RTX 40-Series & Curved OLED Monitors ជាមួយតម្លៃពិសេសបំផុតប្រចាំឆ្នាំ!",
  image: "/images/gaming-promo.jpg",
  alt: "Ultimate Gaming PC Rig Festival",
  badge: "🔥 Gaming Festival 30% OFF",
  isPromo: true,
  promoCode: "STECH20",
  link: "/build-pc",
  ctaText: "រៀបចំ PC ឥឡូវនេះ (Build PC)"
};

const DEFAULT_HERO_SLIDES = [
  GRAND_FESTIVAL_SLIDE,
  GAMING_RIG_SLIDE,
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
  const [slides, setSlides] = useState([GRAND_FESTIVAL_SLIDE, GAMING_RIG_SLIDE, ...DEFAULT_HERO_SLIDES]);
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
            promoCode: p.code || "STECH20",
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
                badge: `🔥 ${p.code || "PROMO"}`,
                isGrandFestival: (p.name || "").includes("ភ្ជុំ") || (p.name || "").toLowerCase().includes("pchum"),
                isPromo: true,
                promoCode: p.code || "STECH20",
                link: p.target_url || "/category/all",
                ctaText: "ទិញឥឡូវនេះ (Shop Now)",
              };
              setSlides([dynamicSlide, ...DEFAULT_HERO_SLIDES]);
            }
          }).catch(() => {});
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
          initial={{ opacity: 0, y: -24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
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
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 7, hours: 14, minutes: 36, seconds: 50 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const diff = 7 * 24 * 60 * 60 * 1000 - (now % (7 * 24 * 60 * 60 * 1000));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter or prioritize discounted products (up to 4 items)
  const promoProducts = (products && products.length > 0 ? products : []).slice(0, 4);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText("PCHUMBEN2026");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (promoProducts.length === 0) return null;

  return (
    <section className="bg-gradient-to-b from-gray-50/70 via-white to-gray-50/50 dark:from-[#0b0d13] dark:via-[#11141e] dark:to-[#0b0d13] px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-9 w-full overflow-hidden border-b border-gray-100 dark:border-white/5 transition-colors">
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1 bg-gradient-to-r from-red-600 to-[#8B1A1A] text-white text-[10.5px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                <Flame size={12} className="fill-amber-300 text-amber-300 animate-pulse" />
                <span>PCHUM BEN MEGA SALE</span>
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                បញ្ចុះតម្លៃរហូតដល់ 40%
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>🎉 មហាប្រូម៉ូសិនពិសេស</span>
              <span className="text-sm sm:text-base font-bold text-gray-500 dark:text-gray-400 hidden sm:inline">• Festival Flash Deals</span>
            </h2>
          </div>

          {/* 7-Day Live Countdown Clock */}
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
            // Discount rate: 25%, 30%, 35%, 40% across items
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
                    Pchum Ben Deal
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

        {/* Festival Bonus Coupon Strip */}
        <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-950/70 via-[#1a0e12] to-amber-950/70 border border-amber-400/30 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-[#8B1A1A] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Gift size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-200">
                🎁 កាដូបន្ថែមពិធីបុណ្យភ្ជំបិណ្ឌ៖ រាល់ការទិញ Laptop ឬ Custom PC ថែមជូន Backpack, Mouse, Pad & Flash Drive ឥតគិតថ្លៃ!
              </p>
              <p className="text-[11px] text-gray-300">
                បញ្ចូលកូដប្រូម៉ូសិននៅពេល Checkout ដើម្បីទទួលបានការបញ្ចុះតម្លៃបន្ថែម ភ្លាមៗ!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
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
                <span>PCHUMBEN2026 (Copy)</span>
              </>
            )}
          </button>
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

  // Bespoke Luxury Cyber-Tech Category Icons (Custom crafted, glow-accented, non-template)
  const getIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("laptop")) return (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="drop-shadow-md">
        <rect x="5" y="6" width="22" height="15" rx="2.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
        <path d="M9 11h14M9 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
        <path d="M2 24c0-1.1.9-2 2-2h24a2 2 0 0 1 2 2v1H2v-1z" fill="currentColor" />
        <rect x="13" y="22.5" width="6" height="1.5" rx="0.75" fill="#fff" fillOpacity="0.8" />
        <circle cx="16" cy="13.5" r="1.5" fill="#fff" fillOpacity="0.9" />
      </svg>
    );
    if (s.includes("desktop")) return (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="drop-shadow-md">
        <rect x="7" y="3" width="18" height="26" rx="3.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
        <circle cx="16" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.4" />
        <path d="M11 15h10M11 18h10M11 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="10" y="24" width="12" height="2" rx="1" fill="#fff" fillOpacity="0.7" />
        <circle cx="21" cy="8" r="0.8" fill="#fff" />
      </svg>
    );
    if (s.includes("part") || s.includes("component") || s.includes("accessor")) return (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="drop-shadow-md">
        <rect x="7" y="7" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
        <rect x="12" y="12" width="8" height="8" rx="1.5" fill="currentColor" />
        <circle cx="16" cy="16" r="1.5" fill="#fff" />
        <path d="M12 3v4M16 3v4M20 3v4M12 25v4M16 25v4M20 25v4M3 12h4M3 16h4M3 20h4M25 12h4M25 16h4M25 20h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
    if (s.includes("gaming")) return (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="drop-shadow-md">
        <path d="M6 14c0-3.5 2.5-6 6.5-6h7c4 0 6.5 2.5 6.5 6 0 4.5-2 9-4 9-1.5 0-2.5-2-4-2h-4c-1.5 0-2.5 2-4 2-2 0-4-4.5-4-9z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
        <path d="M11 11v6M8 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="21" cy="12.5" r="1.3" fill="#fff" />
        <circle cx="23.5" cy="15" r="1.3" fill="#fff" />
        <circle cx="18.5" cy="15" r="1.3" fill="#fff" />
        <circle cx="21" cy="17.5" r="1.3" fill="#fff" />
      </svg>
    );
    if (s.includes("second") || s.includes("used") || s.includes("hand")) return (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="drop-shadow-md">
        <path d="M16 3l11 5v7c0 7-5 12.5-11 14C10 27.5 5 22 5 15V8l11-5z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
        <path d="M11.5 16l3 3 6.5-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    return (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="drop-shadow-md">
        <path d="M22 6a5.5 5.5 0 0 0-7.78 0L6 14.22a3 3 0 0 0 0 4.24l7.54 7.54a3 3 0 0 0 4.24 0L26 17.78A5.5 5.5 0 0 0 22 6z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
        <path d="M19 9l4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="20" r="1.5" fill="#fff" />
      </svg>
    );
  };

  const defaultCategories = [
    { name: t("laptops"), slug: "laptops", color: "from-blue-600 via-indigo-600 to-sky-500", glow: "shadow-blue-500/25", desc: "Laptops & MacBooks" },
    { name: t("desktops"), slug: "desktops", color: "from-[#8B1A1A] via-red-600 to-rose-500", glow: "shadow-red-600/25", desc: "Custom PCs & Desktops" },
    { name: t("parts"), slug: "parts", color: "from-purple-600 via-violet-600 to-fuchsia-500", glow: "shadow-purple-500/25", desc: "CPUs, GPUs & Storage" },
    { name: t("gaming"), slug: "gaming", color: "from-emerald-600 via-teal-600 to-cyan-500", glow: "shadow-emerald-500/25", desc: "Gaming Gear & Esports" },
    { name: t("secondHand"), slug: "secondhand", color: "from-amber-500 via-orange-600 to-yellow-500", glow: "shadow-amber-500/25", badge: "HOT", desc: "Inspected Pre-Owned" },
    { name: t("services"), slug: "services", color: "from-cyan-600 via-blue-600 to-indigo-700", glow: "shadow-cyan-500/25", desc: "Repair & Support" },
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
    "from-blue-600 via-indigo-600 to-sky-500",
    "from-[#8B1A1A] via-red-600 to-rose-500",
    "from-purple-600 via-violet-600 to-fuchsia-500",
    "from-emerald-600 via-teal-600 to-cyan-500",
    "from-amber-500 via-orange-600 to-yellow-500",
    "from-cyan-600 via-blue-600 to-indigo-700"
  ];
  displayCategories = displayCategories.map((c, i) => ({
    ...c,
    color: c.color || colors[i % colors.length]
  }));

  return (
    <section className="bg-white dark:bg-[#0c0e12] py-6 sm:py-10 border-b border-gray-100 dark:border-white/5 transition-colors">
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A] dark:bg-red-500 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold text-[#8B1A1A] dark:text-red-400 uppercase tracking-wider">Explore Genuine Gear</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {t("shopByCategory")}
            </h2>
          </div>
          <Link
            href="/category/all"
            className="text-xs sm:text-sm bg-gray-100 dark:bg-white/10 hover:bg-[#8B1A1A] dark:hover:bg-[#8B1A1A] text-gray-800 dark:text-gray-200 hover:text-white font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-all no-underline shadow-sm"
          >
            <span>View All</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>

        {/* Exactly 6 Categories in 1 balanced row on Desktop & 2 rows on Phone */}
        <motion.div
          variants={dropContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5"
        >
          {displayCategories.map((cat) => (
            <motion.div
              key={cat.slug}
              variants={dropCardVariants}
              whileHover={{ y: -6 }}
              className="h-full"
            >
              <Link
                href={`/category/${cat.slug}`}
                className="flex flex-col items-center p-3.5 sm:p-5 rounded-2xl bg-gray-50/70 dark:bg-[#151922] hover:bg-white dark:hover:bg-[#1c2230] border border-gray-100 dark:border-white/5 hover:border-red-200 dark:hover:border-red-500/30 hover:shadow-xl transition-all duration-300 group no-underline relative text-center h-full"
              >
                {cat.badge && (
                  <span className="absolute -top-1.5 -right-1 px-2 py-0.5 bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white text-[9px] font-black rounded-full z-10 shadow-sm border border-white dark:border-zinc-900 uppercase tracking-wider">
                    {cat.badge}
                  </span>
                )}
                <div className={`w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] rounded-[20px] bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-lg ${cat.glow || 'shadow-red-900/20'} group-hover:scale-110 group-hover:rotate-2 transition-all duration-300 mb-3 border border-white/20`}>
                  <div className="transition-transform group-hover:scale-105 duration-300">
                    {getIcon(cat.slug)}
                  </div>
                </div>
                <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 transition-colors leading-tight">
                  {cat.name}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 hidden lg:block line-clamp-1 font-medium">
                  {cat.desc || "Explore More"}
                </span>
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
      price: product.price,
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
                <div className="text-[17px] sm:text-[19px] xl:text-[20px] font-black text-[#8B1A1A] dark:text-red-400 leading-tight drop-shadow-sm font-mono truncate">
                  {formatUSD(product.price)}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-400 font-semibold mt-0.5 truncate">
                  {formatKHR(product.price)}
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

  // Client background sync so newly added/edited products in admin reflect immediately
  useEffect(() => {
    import("@/lib/services/product.service").then(({ getProducts }) => {
      getProducts()
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          if (list && list.length > 0) {
            setProducts(list);
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
