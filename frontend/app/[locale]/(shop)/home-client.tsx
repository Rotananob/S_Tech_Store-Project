"use client";

import { Link } from "@/i18n/routing";
import { ShoppingCart } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "next-intl";

import { motion } from "framer-motion";

export function HeroSection() {
  const t = useTranslations("Hero");

  return (
    <section
      style={{
        background: "var(--bg-white)",
        padding: "48px 0 0",
        borderBottom: "3px solid #e5e5e5",
        overflow: "hidden",
      }}
    >
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-10 min-h-[300px]">
          <motion.div 
            style={{ paddingBottom: "48px" }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.h1 
              className="text-[30px] sm:text-[38px] lg:text-[44px] font-black text-[#1a1a1a] leading-[1.15] mb-4 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {t("titleLine1")}
              <br />
              {t("titleLine2")}
            </motion.h1>
            <motion.p
              style={{
                fontSize: "15px",
                color: "#555",
                marginBottom: "6px",
                lineHeight: "1.7",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {t("subtitle")}
            </motion.p>
            <motion.p
              className="font-khmer"
              style={{
                fontSize: "14px",
                color: "#777",
                marginBottom: "28px",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {t("khmerSubtitle")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Link href="/category/all" className="btn-red inline-flex items-center gap-2 shadow-lg hover:shadow-red-900/40" style={{ width: "fit-content", padding: "12px 32px", fontSize: "15px", textDecoration: "none" }}>
                {t("shopNow")}
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="flex justify-center items-end h-auto lg:h-[340px] relative mt-4 lg:mt-0"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.img
              src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=700&q=90"
              alt="Premium Laptop"
              className="w-full max-w-[480px] object-cover object-center rounded-t-lg shadow-xl"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </div>

      <div className="divider-gradient" />
    </section>
  );
}

export function FeatureStrip() {
  const t = useTranslations("Features");

  const featuresList = [
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ), label: t("genuine") },
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ), label: t("warranty") },
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ), label: t("localPayments") },
    { svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ), label: t("sameDayDelivery") },
  ];

  return (
    <div style={{ background: "#1a1a1a", overflow: "hidden" }}>
      <div className="container">
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-white/5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {featuresList.map((f, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
              }}
              className="feature-item p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center gap-3 text-center border-b lg:border-b-0 border-r-0 lg:border-r border-white/5 last:border-r-0"
            >
              <motion.div 
                style={{ color: "#1a4fa0" }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {f.svg}
              </motion.div>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>
                {f.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export function CategorySection({ categories = [] }: { categories: any[] }) {
  const t = useTranslations("Categories");

  const getIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("laptop")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    );
    if (s.includes("desktop")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    );
    if (s.includes("part") || s.includes("component") || s.includes("accessor")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
    );
    if (s.includes("gaming")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
        <circle cx="15" cy="13" r="1"/><circle cx="17" cy="11" r="1"/>
        <path d="M21 6H3a1 1 0 0 0-1 1v9a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V7a1 1 0 0 0-1-1Z"/>
      </svg>
    );
    if (s.includes("second") || s.includes("used") || s.includes("hand")) return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 16h5v5"/>
      </svg>
    );
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    );
  };

  const defaultCategories = [
    { name: t("laptops"), slug: "laptops" },
    { name: t("desktops"), slug: "desktops" },
    { name: t("parts"), slug: "parts" },
    { name: t("gaming"), slug: "gaming" },
    { name: t("secondHand"), slug: "secondhand", badge: "99% New" },
    { name: t("services"), slug: "services" },
  ];

  const hasSecondHand = categories.some((c: any) =>
    c.slug?.toLowerCase() === "secondhand" || c.name?.toLowerCase().includes("second")
  );

  const displayCategories = categories.length > 0
    ? (hasSecondHand ? categories : [
        ...categories,
        { name: t("secondHand"), slug: "secondhand", badge: "99% New" }
      ])
    : defaultCategories;

  return (
    <section style={{ background: "#1a1a1a", padding: "48px 0", overflow: "hidden" }}>
      <div className="container">
        <motion.p 
          className="section-heading"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          {t("shopByCategory")}
        </motion.p>

        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08 }
            }
          }}
        >
          {displayCategories.map((cat) => (
            <motion.div
              key={cat.slug}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4 } }
              }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={`/category/${cat.slug}`}
                className="category-card relative overflow-hidden group hover:border-[#8B1A1A] transition-colors"
                style={{ textDecoration: "none", display: "flex", flexDirection: "column", height: "100%" }}
              >
                {cat.badge && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-[#8B1A1A] text-white text-[10px] font-bold rounded-full shadow-sm">
                    {cat.badge}
                  </span>
                )}
                <div style={{ color: "rgba(255,255,255,0.7)" }}>{getIcon(cat.slug)}</div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "rgba(255,255,255,0.85)",
                    marginTop: "12px"
                  }}
                >
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div style={{ marginTop: "48px" }}>
        <div className="divider-red" />
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
    alert(`${product.name} added to cart!`);
  };

  return (
    <motion.div 
      className="product-card-dark relative group"
      whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(0,0,0,0.4)" }}
      transition={{ duration: 0.2 }}
    >
      {product.is_featured && (
        <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}>
          <span className="badge-hot">{t("hot")}</span>
        </div>
      )}

      <Link href={`/products/${product.slug}`}>
        <div
          style={{
            background: "#2a2a2a",
            aspectRatio: "4/3",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {product.image_url ? (
            <motion.img
              src={product.image_url}
              alt={product.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <div style={{ width: 48, height: 48, opacity: 0.3 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
            </div>
          )}
        </div>
      </Link>

      <div style={{ padding: "14px" }}>
        <Link href={`/products/${product.slug}`} style={{ textDecoration: "none" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "rgba(255,255,255,0.92)",
              marginBottom: "4px",
              lineHeight: "1.4",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.name}
          </h3>
        </Link>

        <p
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.4)",
            marginBottom: "10px",
          }}
        >
          {product.category?.name || "Uncategorized"}
        </p>

        <div style={{ marginBottom: "12px" }}>
          <div className="price-usd">{formatUSD(product.price)}</div>
          <div className="price-khr">{formatKHR(product.price)}</div>
        </div>

        <motion.button
          className="btn-red"
          style={{ width: "100%", padding: "9px 16px", fontSize: "13px" }}
          onClick={handleAddToCart}
          whileTap={{ scale: 0.95 }}
        >
          <ShoppingCart size={14} />
          {t("addToCart")}
        </motion.button>
      </div>
    </motion.div>
  );
}

export function BestSellers({ products = [] }: { products: any[] }) {
  const t = useTranslations("Products");

  return (
    <section style={{ background: "#111", padding: "48px 0 60px", overflow: "hidden" }}>
      <div className="container">
        <motion.div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "28px",
          }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "white",
              letterSpacing: "-0.01em",
            }}
          >
            {t("bestSellers")}
          </h2>
          <Link
            href="/products"
            style={{
              fontSize: "13px",
              color: "#1a4fa0",
              fontWeight: "600",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.color = "#4a8ff0";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.color = "#1a4fa0";
            }}
          >
            {t("viewAll")}
          </Link>
        </motion.div>

        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {products.map((product) => (
            <motion.div
              key={product.id}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
              }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
