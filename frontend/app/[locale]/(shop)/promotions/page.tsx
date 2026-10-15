"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Clock,
  ShoppingCart,
  Check,
  Copy,
  Flame,
  Tag,
  Package,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Cpu,
  Laptop,
  Monitor,
  Headphones,
  PhoneCall,
  Send,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useLangStore } from "@/store/langStore";
import { getProducts } from "@/lib/services/product.service";
import { Product } from "@/types";
import api from "@/lib/api";

const USD_TO_KHR = 4060;
const fmtKHR = (n: number) => `~${(Math.round(n * USD_TO_KHR)).toLocaleString()} ៛`;

// ─── Real Brand Flash Deals (Curated Genuine Store Products) ─────────────────
const REAL_FLASH_DEALS = [
  {
    id: 9,
    name: "ASUS TUF Gaming F16 (2025)",
    specs: "Core i7-13650HX / RTX 4060 8GB / 16GB DDR5 / 512GB SSD / 165Hz FHD+",
    model: "TUF-F16-FX607",
    category: "Laptops",
    price: 849,
    original: 945,
    image: "https://res.cloudinary.com/q4zwsbd5/image/upload/v1784105167/stech_store/lhctwojobiknqwxyjmav.jpg",
    stock: 3,
    badge: "FLASH SALE",
  },
  {
    id: 2,
    name: "ROG Zephyrus G14 OLED (2024)",
    specs: "AMD Ryzen 9 8945HS / RTX 4060 / 32GB LPDDR5X / 1TB SSD / 120Hz 3K OLED",
    model: "GA403UV-G14",
    category: "Laptops",
    price: 1499,
    original: 1649,
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=700&q=80",
    stock: 4,
    badge: "POPULAR",
  },
  {
    id: 1,
    name: "Lenovo ThinkPad X1 Carbon Gen 11",
    specs: "Intel Core i7-1355U / 16GB RAM / 512GB PCIe SSD / 14\" WUXGA IPS Ultra-Light",
    model: "21HM001YUS",
    category: "Laptops",
    price: 1149,
    original: 1299,
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=700&q=80",
    stock: 5,
    badge: "VIP PICK",
  },
  {
    id: 44,
    name: "Corsair ONE i500 Liquid-Cooled Compact PC",
    specs: "Intel Core i9-14900K / RTX 4080 Super / 64GB DDR5 / 2TB Gen4 NVMe / Custom Liquid",
    model: "CS-ONE-I500",
    category: "Desktops",
    price: 3299,
    original: 3599,
    image: "https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=700&q=80",
    stock: 2,
    badge: "LIMITED",
  },
  {
    id: 4,
    name: "Logitech MX Master 3S Wireless Mouse",
    specs: "Quiet Acoustic Switches / 8,000 DPI Darkfield Sensor / MagSpeed Electromagnetic / USB-C",
    model: "MX-MASTER-3S",
    category: "Accessories",
    price: 79.99,
    original: 99.99,
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=700&q=80",
    stock: 8,
    badge: "BESTSELLER",
  },
  {
    id: 3,
    name: "Apple iPhone 15 Pro Max 256GB Titanium",
    specs: "A17 Pro 3nm Chip / Grade 5 Titanium Body / 48MP Quad-Pixel / 5X Optical Zoom",
    model: "MU773LL/A",
    category: "Phones",
    price: 1089,
    original: 1199,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=700&q=80",
    stock: 6,
    badge: "HOT DEAL",
  },
  {
    id: 16,
    name: "S Tech Custom RGB Gaming Desktop Set",
    specs: "Intel Core i5-13400F / RTX 3060 12GB / 16GB DDR4 / 500GB NVMe / 650W Bronze / RGB Case",
    model: "ST-BUILD-G30",
    category: "Desktops",
    price: 489,
    original: 530,
    image: "https://res.cloudinary.com/q4zwsbd5/image/upload/v1791589566/stech_store/iouwnomgyajg61cckdni.jpg",
    stock: 4,
    badge: "COMBO",
  },
  {
    id: 5,
    name: "Samsung Odyssey OLED G8 34\" Curved Monitor",
    specs: "UWQHD 3440x1440 / 175Hz / 0.03ms Response / Neo Quantum Processor / Smart Gaming Hub",
    model: "LS34BG850S",
    category: "Monitors",
    price: 899,
    original: 1199,
    image: "https://images.unsplash.com/photo-1527443224154-c4a573d3b9e5?w=700&q=80",
    stock: 3,
    badge: "SALE",
  },
];

// ─── Real Hardware Bundle Packages ───────────────────────────────────────────
const BUNDLE_PACKAGES = [
  {
    id: 101,
    name: "PC Gaming Pro Set (Full Rig)",
    subtitle: "ឈុតកុំព្យូទ័រលេងហ្គេម & Stream ធ្ងន់ៗ",
    items: [
      "Intel Core i7-14700K 20-Core Processor",
      "NVIDIA GeForce RTX 4070 Super 12GB GDDR6X",
      "Kingston FURY Beast 32GB (2x16GB) DDR5 6000MHz",
      "Kingston KC3000 1TB PCIe 4.0 NVMe SSD",
      "DeepCool 240mm ARGB Liquid Cooler + 750W 80+ Gold",
    ],
    price: 1499,
    original: 1799,
    save: 300,
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=700&q=80",
    badge: "TOP GAMING SET",
  },
  {
    id: 102,
    name: "Creator Workstation Suite (3D & 4K)",
    subtitle: "ឈុតកាត់តវីដេអូ Render & 3D Architectural Design",
    items: [
      "AMD Ryzen 9 7900X 12-Core / 24-Thread",
      "GeForce RTX 4080 Super 16GB GDDR6X",
      "Corsair Vengeance 64GB (2x32GB) DDR5",
      "Samsung 990 Pro 2TB PCIe 4.0 NVMe SSD",
      "360mm High-Performance AIO + Corsair 850W Gold PSU",
    ],
    price: 2399,
    original: 2849,
    save: 450,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=700&q=80",
    badge: "WORKSTATION",
  },
  {
    id: 103,
    name: "Executive Productivity Dual-Screen Suite",
    subtitle: "ឈុតការងារការិយាល័យ & Multitasking កម្រិតខ្ពស់",
    items: [
      "Lenovo ThinkPad X1 Carbon Gen 11 (Core i7 / 16GB / 512GB)",
      "Dell UltraSharp 27\" 4K USB-C Hub Monitor (U2723QE)",
      "Logitech MX Master 3S Wireless Mouse",
      "Keychron K2 Wireless Mechanical Keyboard (RGB)",
    ],
    price: 1699,
    original: 2049,
    save: 350,
    image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=700&q=80",
    badge: "OFFICE COMBO",
  },
];

export default function PromotionsPage() {
  const { lang } = useLangStore();
  const isKhmer = lang === "KM";
  const addItem = useCartStore((s) => s.addItem);

  const [deals, setDeals] = useState(REAL_FLASH_DEALS);
  const [storeCoupons, setStoreCoupons] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [addedItemName, setAddedItemName] = useState<string | null>(null);

  // Live 4-day countdown timer
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 14, mins: 45, secs: 20 });

  useEffect(() => {
    // Attempt to merge live discount products from backend API if available
    getProducts()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list && list.length > 0) {
          const discountItems = list
            .filter((p: any) => p.sale_price && Number(p.sale_price) < Number(p.price))
            .slice(0, 8);

          if (discountItems.length >= 4) {
            const mapped = discountItems.map((p: any, idx: number) => ({
              id: Number(p.id),
              name: p.name,
              specs: p.specs || p.description || `${p.brand || "Brand"} High Performance Hardware`,
              model: p.model || `ST-${p.id}`,
              category: typeof p.category === "string" ? p.category : (p.category?.name || "Hardware"),
              price: Number(p.sale_price),
              original: Number(p.price),
              image: p.image_url || p.image || REAL_FLASH_DEALS[idx % REAL_FLASH_DEALS.length].image,
              stock: p.stock ?? Math.floor(Math.random() * 5 + 2),
              badge: "FLASH DEAL",
            }));
            setDeals(mapped);
          }
        }
      })
      .catch(() => {});

    // Fetch active promo codes dynamically
    api.get("/promo-codes?active_only=1")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const valid = list.filter((p: any) => p && p.code && p.status === "active");
        const colors = ["#8B1A1A", "#1e40af", "#059669", "#d97706", "#7c3aed"];
        const mapped = valid.map((p: any, idx: number) => ({
          code: p.code,
          discount: p.type === "percentage" ? `${p.value}% OFF` : `$${p.value} OFF`,
          title: p.name || `បញ្ចុះតម្លៃ ${p.value}`,
          minOrder: p.description || "ការបញ្ចុះតម្លៃពិសេសពី S Tech Store",
          color: colors[idx % colors.length],
        }));
        setStoreCoupons(mapped);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const target = Date.now() + (3 * 86400 + 14 * 3600 + 45 * 60) * 1000;
    const interval = setInterval(() => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddToCart = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      id: Number(item.id),
      name: item.name,
      price: Number(item.price),
      quantity: 1,
      image_url: item.image,
      product: item,
    });

    setAddedItemName(item.name);
    setTimeout(() => {
      setAddedItemName(null);
    }, 2000);
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-[#0c1017] text-gray-900 dark:text-gray-100 pb-20">
      
      {/* Toast Notification when item added to cart */}
      <AnimatePresence>
        {addedItemName && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-bold border border-emerald-400/40"
          >
            <CheckCircle2 size={18} />
            <span>បានបញ្ចូល «{addedItemName}» ទៅកាន់កន្ត្រកទំនិញជោគជ័យ!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. HERO PROMOTION BANNER (Real Authentic Tech Store Theme) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-black via-[#1a0f0f] to-[#0d131f] text-white py-12 sm:py-20 border-b border-white/10">
        {/* Background circuit glow */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl space-y-4 sm:space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-black tracking-wide uppercase">
              <Flame size={14} className="text-red-500 animate-pulse" />
              <span>{isKhmer ? "មហាប្រូម៉ូសិនពិសេសប្រចាំខែ" : "Monthly Mega Tech Deals"}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              S Tech Store <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-400 bg-clip-text text-transparent">Mega Sale</span>
            </h1>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-medium">
              {isKhmer
                ? "បញ្ចុះតម្លៃពិសេសលើ Gaming Laptops, កុំព្យូទ័រផ្គុំ Desktop, គ្រឿងបន្លាស់ PC Parts និង Accessories សុទ្ធ ១០០% ធានាគុណភាពផ្លូវការពីក្រុមហ៊ុន រួមជាមួយសេវាដឹកជញ្ជូនរហ័សទូទាំង ២៥ ខេត្ត-ក្រុង។"
                : "Exclusive limited-time promotions on genuine gaming laptops, custom workstations, computer components, and accessories with official warranty and nationwide delivery across Cambodia."}
            </p>

            {/* Live Synchronized Countdown Clock */}
            <div className="pt-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock size={14} className="text-red-400" />
                <span>{isKhmer ? "ការផ្ដល់ជូនពិសេសផុតកំណត់ក្នុងរង្វង់៖" : "Limited Time Offer Ends In:"}</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {[
                  { val: timeLeft.days, label: isKhmer ? "ថ្ងៃ" : "Days" },
                  { val: timeLeft.hours, label: isKhmer ? "ម៉ោង" : "Hours" },
                  { val: timeLeft.mins, label: isKhmer ? "នាទី" : "Mins" },
                  { val: timeLeft.secs, label: isKhmer ? "វិនាទី" : "Secs" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center bg-white/10 dark:bg-black/50 backdrop-blur-md border border-white/15 rounded-xl px-3 sm:px-4 py-2 min-w-[58px] sm:min-w-[70px]"
                  >
                    <span className="font-mono text-xl sm:text-3xl font-black text-amber-300">
                      {String(item.val).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-300 font-bold uppercase mt-0.5">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#flash-deals"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-red-700 hover:to-red-800 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-900/40 flex items-center gap-2 transition-all no-underline cursor-pointer"
              >
                <Zap size={16} />
                <span>{isKhmer ? "ទិញទំនិញ Flash Deals" : "Shop Flash Deals"}</span>
                <ArrowRight size={14} />
              </a>

              <a
                href="#bundle-deals"
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition-all no-underline cursor-pointer backdrop-blur-xs"
              >
                <Package size={16} />
                <span>{isKhmer ? "ឈុត Combo Sets" : "View Combo Sets"}</span>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Decorative gradient strip */}
      <div className="h-1 bg-gradient-to-r from-red-600 via-amber-500 to-[#1a4fa0]" />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-16">

        {/* ── 2. FLASH DEALS (Real Store Products & Ultra Responsive 2-Col Mobile Grid) ── */}
        <section id="flash-deals" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600/10 dark:bg-red-500/20 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center shrink-0">
                <Zap size={22} className="fill-current" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{isKhmer ? "⚡ Flash Deals ប្រចាំថ្ងៃ" : "⚡ Daily Flash Deals"}</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isKhmer ? "ទំនិញសុទ្ធ ១០០% តម្លៃពិសេសមានកំណត់ក្នុងស្តុក" : "Genuine brand hardware with limited promotion stock"}
                </p>
              </div>
            </div>

            <Link
              href="/products"
              className="text-xs sm:text-sm font-bold text-[#8B1A1A] dark:text-red-400 hover:underline flex items-center gap-1 shrink-0 no-underline"
            >
              <span>{isKhmer ? "មើលទំនិញទាំងអស់" : "View All Products"}</span>
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Fully Responsive Grid: 2 columns on mobile, 3 on tablet, 4 on desktop (Zero Cut-Off) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {deals.map((item) => {
              const discountPct = Math.round((1 - item.price / item.original) * 100);

              return (
                <div
                  key={item.id}
                  className="group bg-white dark:bg-[#151922] border border-gray-200 dark:border-white/10 hover:border-red-500/60 dark:hover:border-red-500/60 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Image & Badges */}
                  <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-black/20 p-2 sm:p-3 flex items-center justify-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=700&q=80";
                      }}
                    />

                    {/* Discount badge */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                      <span className="px-2 py-0.5 rounded-md bg-[#8B1A1A] text-white text-[10px] sm:text-xs font-black shadow-xs">
                        -{discountPct}%
                      </span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-amber-300 text-[9px] font-bold uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Stock Alert */}
                    <div className="absolute bottom-2 left-2 z-10 bg-amber-500/95 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                      {isKhmer ? `សល់ ${item.stock} គ្រឿង` : `Only ${item.stock} left`}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-400 block truncate">
                        {item.category} • Model: {item.model}
                      </span>

                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 transition-colors">
                        {item.name}
                      </h3>

                      <p className="text-[10px] text-gray-400 line-clamp-1 hidden sm:block">
                        {item.specs}
                      </p>
                    </div>

                    {/* Pricing Block */}
                    <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-white/5">
                      <div>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-base sm:text-lg font-black text-[#8B1A1A] dark:text-red-400">
                            ${Number(item.price).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            ${Number(item.original).toFixed(2)}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium block">
                          {fmtKHR(item.price)}
                        </span>
                      </div>

                      {/* Add to Cart button (Full-width & responsive) */}
                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(e, item)}
                        className="w-full py-2 sm:py-2.5 rounded-xl bg-gray-900 dark:bg-white/10 hover:bg-[#8B1A1A] dark:hover:bg-red-600 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-xs active:scale-95"
                      >
                        <ShoppingCart size={13} />
                        <span>{isKhmer ? "ដាក់កន្ត្រក" : "Add to Cart"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. HARDWARE BUNDLE PACKAGES (Real Full Set Desktop & Creator Combos) ── */}
        <section id="bundle-deals" className="space-y-5">
          <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/10 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {isKhmer ? "📦 ឈុតកុំព្យូទ័រ & Hardware Combo Sets" : "📦 Hardware Bundle Deals"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isKhmer ? "ទិញជាឈុតពេញលេញ ចំណេញកាន់តែច្រើន និងតម្លើងរួចជាស្រេច" : "Pre-configured and tested full systems with special combo discounts"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {BUNDLE_PACKAGES.map((bundle) => (
              <div
                key={bundle.id}
                className="bg-white dark:bg-[#151922] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="relative h-44 sm:h-52 overflow-hidden bg-gray-100 dark:bg-black/30">
                  <img
                    src={bundle.image}
                    alt={bundle.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                      {bundle.badge}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 z-10">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-sm">
                      {isKhmer ? `ចំណេញ $${bundle.save}` : `Save $${bundle.save}`}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="text-base font-black truncate">{bundle.name}</h3>
                    <p className="text-xs text-gray-200 truncate">{bundle.subtitle}</p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">
                      {isKhmer ? "គ្រឿងក្នុងឈុត (Included Items):" : "Included Hardware Components:"}
                    </span>
                    <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {bundle.items.map((it, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-tight">{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#8B1A1A] dark:text-red-400">
                          ${bundle.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          ${bundle.original.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block">
                        {fmtKHR(bundle.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, bundle)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-[#8B1A1A] hover:from-red-700 hover:to-red-800 text-white text-xs font-black shadow-sm cursor-pointer border-none flex items-center gap-1.5"
                    >
                      <ShoppingCart size={14} />
                      <span>{isKhmer ? "កុម្ម៉ង់ឈុតនេះ" : "Get Bundle"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. STORE COUPON CODES (Only rendered if active promos exist in DB) ── */}
        {storeCoupons.length > 0 && (
          <section className="bg-white dark:bg-[#151922] border border-gray-200 dark:border-white/10 rounded-3xl p-5 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Tag size={20} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  {isKhmer ? "🏷️ កូដបញ្ចុះតម្លៃពិសេស (Store Coupons)" : "🏷️ Store Promo Coupons"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isKhmer ? "ចម្លងកូដដើម្បីទទួលបានការបញ្ចុះតម្លៃពេល Checkout" : "Copy coupon codes and apply at checkout for extra savings"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
              {storeCoupons.map((coupon) => {
                const isCopied = copiedCode === coupon.code;
                return (
                  <div
                    key={coupon.code}
                    className="rounded-2xl border-2 border-dashed p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-all"
                    style={{
                      borderColor: `${coupon.color}40`,
                      backgroundColor: `${coupon.color}08`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                          {coupon.discount}
                        </span>
                        <span
                          className="font-mono text-lg font-black tracking-wider block"
                          style={{ color: coupon.color }}
                        >
                          {coupon.code}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(coupon.code)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white flex items-center gap-1.5 cursor-pointer border-none shadow-xs transition-all"
                        style={{
                          backgroundColor: isCopied ? "#059669" : coupon.color,
                        }}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? (isKhmer ? "បានចម្លង!" : "Copied!") : (isKhmer ? "ចម្លង" : "Copy")}</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-black/5 dark:border-white/5">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {coupon.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {coupon.minOrder}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 5. STORE GUARANTEES & AUTHENTIC KHMER SHOP SERVICES ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {[
            {
              icon: ShieldCheck,
              title: isKhmer ? "ទំនិញសុទ្ធ ១០០%" : "100% Genuine Hardware",
              desc: isKhmer ? "ធានាគុណភាពផ្លូវការពីក្រុមហ៊ុន" : "Official brand warranty directly from manufacturers",
              color: "text-red-500 bg-red-500/10",
            },
            {
              icon: Package,
              title: isKhmer ? "ដឹកជញ្ជូនរហ័សទូទាំងប្រទេស" : "Nationwide Delivery",
              desc: isKhmer ? "ដឹកតាម PassApp, Virak Buntham, J&T" : "Fast & safe delivery to all 25 provinces",
              color: "text-blue-500 bg-blue-500/10",
            },
            {
              icon: Cpu,
              title: isKhmer ? "សេវាតម្លើង & ជួសជុលផ្ទាល់" : "Expert PC Assembly",
              desc: isKhmer ? "តម្លើង PC ស្អាត និងថែទាំដោយជាងជំនាញ" : "Professional cable management & BIOS tune",
              color: "text-emerald-500 bg-emerald-500/10",
            },
            {
              icon: Send,
              title: isKhmer ? "Telegram Bot Support" : "Telegram Bot Support",
              desc: isKhmer ? "ទទួលវិក្កយបត្រ & ដំណឹងតាមឆាតស្វ័យប្រវត្ត" : "Direct digital invoices & status updates",
              color: "text-sky-500 bg-sky-500/10",
            },
          ].map((feat, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#151922] border border-gray-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${feat.color}`}>
                <feat.icon size={20} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  {feat.title}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

      </main>
    </div>
  );
}
