"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/routing";
import { useRouter, usePathname } from "@/i18n/routing";
import Image from "next/image";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  Search, ShoppingCart, User, Phone,
  Menu, X, ChevronDown, Heart, Bell,
  Gift, Shield, Zap, CheckCheck, Trash2, Clock, Info, LogOut, Camera
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useLangStore } from "@/store/langStore";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeDropdown } from "@/components/ui/ThemeDropdown";
import { useNotificationStore } from "@/store/notificationStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { AnimatePresence, motion } from "framer-motion";
import SlideOverCart from "@/components/cart/SlideOverCart";
import { useVisualSearchStore } from "@/store/visualSearchStore";
import VisualSearchModal from "@/components/search/VisualSearchModal";

export default function Navbar() {
  const openVisualSearch = useVisualSearchStore((s) => s.openVisualSearch);
  const [search, setSearch] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const cartCount = useCartStore((s) => s.getTotalItems());
  const { lang, setLang } = useLangStore();
  const t = useTranslations("Navigation");
  const tNotif = useTranslations("Notifications");
  const {
    notifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    getUnreadCount,
  } = useNotificationStore();

  const navLinks = [
    { label: t('home'), href: "/" },
    { label: t('laptops'), href: "/category/laptops" },
    { label: t('desktops'), href: "/category/desktops" },
    { label: t('parts'), href: "/category/parts" },
    { label: t('gaming'), href: "/category/gaming" },
    { label: t('buildPc'), href: "/build-pc" },
    { label: t('services'), href: "/services" },
    { label: t('promotions'), href: "/promotions" },
    { label: t('orders'), href: "/orders" },
    { label: t('contact'), href: "/contact" },
  ];

  useEffect(() => {
    setMounted(true);
    try {
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u) {
          fetchNotifications();
          useCartStore.getState().fetchCart();
          useWishlistStore.getState().fetchWishlist();
        } else {
          useCartStore.getState().clearCart();
          useWishlistStore.getState().clearWishlist();
        }
      });
      return () => unsub();
    } catch (e) { console.error(e); }
  }, []);

  // Close lang & notification dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setSearch("");
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "welcome":
        return <Gift className="text-[#8B1A1A] flex-shrink-0" size={18} />;
      case "login":
        return <Shield className="text-blue-600 flex-shrink-0" size={18} />;
      case "promo":
        return <Zap className="text-amber-500 flex-shrink-0" size={18} />;
      case "order":
        return <Info className="text-green-600 flex-shrink-0" size={18} />;
      default:
        return <Info className="text-gray-500 flex-shrink-0" size={18} />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return tNotif('timeJustNow');
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d`;
  };

  const unreadCount = mounted ? getUnreadCount() : 0;

  return (
    <>
      {/* ── 1. Top Announcement Bar (Desktop Only) ─────────────────── */}
      <div className="bg-[#111] text-white/70 text-[11px] py-1.5 hidden lg:block">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Phone size={11} />
            <span>+855 12 345 678 | support@stechstore.com.kh</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{t('freeDelivery')}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Main Header Row (Logo + Search Bar + Icons) ───────────────── */}
      <header className="bg-white dark:bg-[#12151e] border-b border-gray-100 dark:border-white/10 sticky top-0 z-40 shadow-sm transition-colors">
        <div className="container h-[56px] lg:h-[68px] flex items-center justify-between gap-2 lg:gap-3 xl:gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 lg:gap-2.5 flex-shrink-0 no-underline group">
            <Image 
              src="/logo.jpg" 
              alt="S Tech Store" 
              width={40} 
              height={40} 
              className="rounded-lg object-contain transition-transform duration-300 group-hover:scale-105 w-[32px] h-[32px] lg:w-[40px] lg:h-[40px]" 
              priority 
            />
            <div className="leading-none">
              <div className="font-dangrek text-[18px] lg:text-[21px] text-[#1a1a1a] dark:text-white tracking-wide">
                S <span className="text-[#8B1A1A] dark:text-red-400">Tech</span> <span className="text-[#1a4fa0] dark:text-blue-400">Store</span>
              </div>
              <div className="font-khmer text-[10px] lg:text-[11px] text-[#888] dark:text-gray-400 hidden sm:block">ហាងបច្ចេកវិទ្យា</div>
            </div>
          </Link>

          {/* Desktop Search Bar (Visible on lg and larger) */}
          <div className="hidden lg:flex flex-1 max-w-md xl:max-w-xl 2xl:max-w-2xl mx-4 xl:mx-6">
            <form onSubmit={handleSearch} className="relative w-full flex items-center">
              <input
                type="search"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full pl-11 pr-20 h-10 text-[14px] text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A] dark:focus:border-red-500 focus:bg-white dark:focus:bg-[#161a25] focus:shadow-sm transition-all"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={openVisualSearch}
                  title="Visual Camera Search / ស្កេនរូបភាព"
                  className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center transition-transform active:scale-90 cursor-pointer border border-red-200 dark:border-red-800/40 shadow-sm"
                  aria-label="Scan image with Camera"
                >
                  <Camera size={13} strokeWidth={2.2} />
                </button>
                <button
                  type="submit"
                  className="w-7 h-7 bg-[#8B1A1A] hover:bg-[#6b1111] text-white rounded-full flex items-center justify-center transition-colors cursor-pointer border-none shadow-sm"
                  aria-label="Search"
                >
                  <Search size={13} />
                </button>
              </div>
            </form>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2 shrink-0">
            <Link
              href="/wishlist"
              title={t('wishlist')}
              className="flex w-[44px] h-[44px] lg:w-9 lg:h-9 items-center justify-center rounded-lg text-[#555] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-[#1a1a1a] dark:hover:text-white transition-colors"
            >
              <Heart size={20} />
            </Link>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                title={t('alerts')}
                className="relative w-[44px] h-[44px] lg:w-9 lg:h-9 flex items-center justify-center rounded-lg text-[#555] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-[#1a1a1a] dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent"
              >
                <Bell size={20} />
                {mounted && unreadCount > 0 && (
                  <span className="absolute top-2 right-2 lg:top-1.5 lg:right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              {/* Notification Center Popover */}
              {notifOpen && (
                <div className="absolute top-full right-0 mt-2 w-[320px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-[#1a1a1a]">{tNotif('title')}</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-[#8B1A1A] text-white rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer border-none bg-transparent p-0 flex items-center gap-1"
                        >
                          <CheckCheck size={13} />
                          {tNotif('markAllRead')}
                        </button>
                        <button
                          type="button"
                          onClick={clearAll}
                          className="text-[12px] font-semibold text-gray-400 hover:text-red-600 transition-colors cursor-pointer border-none bg-transparent p-0 flex items-center gap-1"
                          title={tNotif('clearAll')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="py-10 px-4 text-center text-gray-400 text-[13px] flex flex-col items-center gap-2">
                        <Bell size={28} className="text-gray-300" />
                        <span>{tNotif('empty')}</span>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        return (
                          <div
                            key={n.id}
                            onClick={() => markAsRead(n.id)}
                            className={`px-4 py-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                              !n.read ? "bg-red-50/50 hover:bg-red-50" : "bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {getNotifIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-[13px] font-bold text-[#1a1a1a] truncate">{n.title}</h4>
                                <span className="text-[11px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                                  <Clock size={11} />
                                  {formatTimeAgo(n.created_at)}
                                </span>
                              </div>
                              <p className="text-[12px] text-[#555] mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                            </div>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-[#8B1A1A] flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              id="navbar-cart-icon"
              href="/cart"
              onClick={(e) => {
                e.preventDefault();
                useCartStore.getState().setIsOpen(true);
              }}
              title={t('cart')}
              className="relative w-[44px] h-[44px] lg:w-9 lg:h-9 flex items-center justify-center rounded-lg text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a] transition-all"
            >
              <ShoppingCart size={20} />
              {mounted && cartCount > 0 && (
                <span className="absolute top-2 right-2 lg:-top-1 lg:-right-1 w-4 h-4 bg-[#8B1A1A] rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* ── Theme & Language Switchers (Comfortable Dropdowns) ── */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ThemeDropdown />
              <LanguageSwitcher />
            </div>

            {/* ── Prominent Sign In / Register Buttons or User Profile (Desktop Only) ── */}
            {user ? (
              <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-gray-200 dark:border-white/10 shrink-0">
                <Link
                  href="/account/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-950/40 text-[#1a1a1a] dark:text-gray-100 hover:text-[#8B1A1A] dark:hover:text-red-400 font-bold text-sm transition-all border border-gray-200 dark:border-white/10 hover:border-red-200 no-underline shadow-sm shrink-0 whitespace-nowrap"
                >
                  <div className="w-5 h-5 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    {(user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                  <span className="max-w-[90px] xl:max-w-[120px] truncate">{user.displayName || user.email?.split("@")[0]}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="px-2.5 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-red-600 hover:text-white text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-white/10 cursor-pointer flex items-center gap-1 shrink-0"
                  title={t('signOut')}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-white/10 shrink-0">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs xl:text-sm font-bold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-[#1a1a1a] dark:text-gray-100 transition-all border border-gray-200 dark:border-white/10 shadow-sm no-underline shrink-0 whitespace-nowrap"
                >
                  {t('signIn')}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 rounded-xl text-xs xl:text-sm font-bold bg-[#8B1A1A] hover:bg-[#6b1111] !text-white text-white transition-all shadow-md hover:shadow-lg no-underline flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  <span className="!text-white text-white font-bold">{t('register')}</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Dedicated Category Navigation Bar (Desktop lg+) ── */}
        <nav className="hidden lg:block bg-gray-50/80 dark:bg-[#0c0d12]/90 border-t border-gray-100 dark:border-white/5">
          <div className="container flex items-center justify-center gap-6 xl:gap-8 py-2.5 overflow-x-auto no-scrollbar">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 text-[14px] font-medium rounded-md whitespace-nowrap transition-colors no-underline group overflow-hidden ${
                  pathname === link.href
                    ? "text-[#8B1A1A] dark:text-red-400 font-bold bg-red-50/30 dark:bg-red-950/20"
                    : "text-[#444] dark:text-gray-300 hover:text-[#8B1A1A] dark:hover:text-red-400"
                }`}
              >
                {link.label}
                <span 
                  className={`absolute left-0 bottom-0 w-full h-[2px] bg-[#8B1A1A] dark:bg-red-500 transition-transform duration-300 origin-left ${
                    pathname === link.href ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`} 
                />
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* ── 4. Persistent Mobile Search Bar (Below Header on < lg) ── */}
      <div className="lg:hidden sticky top-[56px] z-30 bg-white dark:bg-[#12151e] px-3 sm:px-4 py-2 border-b border-gray-100 dark:border-white/10 shadow-sm transition-colors">
        <form onSubmit={handleSearch} className="relative w-full flex items-center">
          <input
            type="search"
            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-full pl-11 pr-20 h-[42px] leading-normal text-[14px] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-[#161a25] transition-all shadow-inner"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Camera Visual Search Scanner Button */}
            <button
              type="button"
              onClick={openVisualSearch}
              title="Visual Camera Search / ស្កេនរូបភាព"
              className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-[#8B1A1A] flex items-center justify-center transition-transform active:scale-90 cursor-pointer border border-red-200 shadow-sm"
              aria-label="Scan image with Camera"
            >
              <Camera size={16} strokeWidth={2.2} />
            </button>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="w-8 h-8 bg-[#8B1A1A] hover:bg-[#6b1111] text-white rounded-full flex items-center justify-center transition-colors cursor-pointer border-none shadow-sm"
              aria-label="Search"
            >
              <Search size={14} />
            </button>
          </div>
        </form>
      </div>

      <SlideOverCart />
      <VisualSearchModal />
    </>
  );
}
