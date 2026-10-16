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
  Gift, Shield, Zap, CheckCheck, Trash2, Clock, Info, LogOut, Camera, ExternalLink, Wallet
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
import NotificationPopupModal from "@/components/ui/NotificationPopupModal";
import { recordSearchQuery } from "@/lib/services/history.service";

export default function Navbar() {
  const openVisualSearch = useVisualSearchStore((s) => s.openVisualSearch);
  const [search, setSearch] = useState("");
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLiveDropdown, setShowLiveDropdown] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
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
    setActivePopupNotif,
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
    const syncUserSession = () => {
      if (auth.currentUser) {
        setUser(auth.currentUser);
        fetchNotifications();
        useCartStore.getState().fetchCart();
        useWishlistStore.getState().fetchWishlist();
        return;
      }

      const sessionStr = typeof window !== "undefined"
        ? (localStorage.getItem("stech_user_session") || localStorage.getItem("user_session"))
        : null;

      if (sessionStr) {
        try {
          const sUser = JSON.parse(sessionStr);
          const uid = sUser?.firebase_uid || sUser?.uid || sUser?.id;
          if (uid) {
            setUser({
              uid,
              displayName: sUser.display_name || sUser.name || "VIP Customer",
              email: sUser.email,
              photoURL: sUser.photo_url || sUser.avatar,
            } as any);
            fetchNotifications();
            useCartStore.getState().fetchCart();
            useWishlistStore.getState().fetchWishlist();
            return;
          }
        } catch (e) {}
      }

      setUser(null);
      useCartStore.getState().clearCart();
      useWishlistStore.getState().clearWishlist();
    };

    try {
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          setUser(u);
          fetchNotifications();
          useCartStore.getState().fetchCart();
          useWishlistStore.getState().fetchWishlist();
        } else {
          syncUserSession();
        }
      });

      window.addEventListener("user_session_updated", syncUserSession);

      return () => {
        unsub();
        window.removeEventListener("user_session_updated", syncUserSession);
      };
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

  // ─── Live Predictive Search Debounce ───────────────────────────────────────
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setLiveResults([]);
      setShowLiveDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowLiveDropdown(true);

    const timer = setTimeout(async () => {
      try {
        const { getProducts } = await import("@/lib/services/product.service");
        const res = await getProducts({ search: q });
        const list = Array.isArray(res) ? res : (res?.data || []);
        setLiveResults(list.slice(0, 5));
      } catch (err) {
        setLiveResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [search]);

  // Close live dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (!desktopSearchRef.current || !desktopSearchRef.current.contains(target)) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(target))
      ) {
        setShowLiveDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = search.trim();
    if (q) {
      recordSearchQuery(q);
      setShowLiveDropdown(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const renderLiveDropdown = () => {
    if (!showLiveDropdown || search.trim().length < 2) return null;

    return (
      <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-[100] bg-white dark:bg-[#151922] rounded-2xl shadow-2xl border border-gray-200/90 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-3 bg-gray-50/90 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
          <span className="font-bold text-gray-600 dark:text-gray-300">
            {isSearching ? "🔎 កំពុងស្វែងរកទំនិញ..." : `លទ្ធផលស្វែងរក (${liveResults.length})`}
          </span>
          {isSearching && (
            <div className="w-3.5 h-3.5 border-2 border-[#8B1A1A] dark:border-red-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {liveResults.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[380px] overflow-y-auto">
            {liveResults.map((p) => {
              const displayPrice = p.sale_price ? Number(p.sale_price) : Number(p.price);
              const originalPrice = Number(p.price);

              return (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  onClick={() => {
                    setShowLiveDropdown(false);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors no-underline group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 p-1 shrink-0 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-white/5">
                    <img
                      src={p.image_url || p.image || "/logo.jpg"}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                      {typeof p.category === "object" ? p.category?.name : (p.category || "Official Tech")}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-[#8B1A1A] dark:group-hover:text-red-400">
                      {p.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs sm:text-sm font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                        ${displayPrice.toFixed(2)}
                      </span>
                      {p.sale_price && (
                        <span className="text-[10px] text-gray-400 line-through font-mono">
                          ${originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !isSearching ? (
          <div className="p-6 text-center text-xs text-gray-500">
            <p className="font-bold text-gray-800 dark:text-gray-200">
              រកមិនឃើញទំនិញ &quot;{search}&quot; ឡើយ
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              សូមសាកល្បងពាក្យគន្លឹះ: Laptop, PC, RTX, Monitor, RAM...
            </p>
          </div>
        ) : null}

        {/* View All Matches Footer */}
        <div className="p-2.5 bg-gray-50/80 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 text-center">
          <button
            type="button"
            onClick={(e) => handleSearch(e)}
            className="text-xs font-bold text-[#8B1A1A] dark:text-red-400 hover:underline cursor-pointer border-none bg-transparent"
          >
            មើលលទ្ធផលទាំងអស់សម្រាប់ &quot;{search}&quot; &rarr;
          </button>
        </div>
      </div>
    );
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
      <header className="bg-white/90 dark:bg-[#0c0e14]/90 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08] sticky top-0 z-40 shadow-xs transition-colors">
        <div className="container h-[54px] lg:h-[68px] flex items-center justify-between gap-2 lg:gap-3 xl:gap-4">

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
          <div className="hidden lg:flex flex-1 max-w-md xl:max-w-xl 2xl:max-w-2xl mx-4 xl:mx-6 relative" ref={desktopSearchRef}>
            <form onSubmit={handleSearch} className="relative w-full flex items-center">
              <input
                type="search"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full pl-11 pr-20 h-11 py-2 text-[14px] leading-relaxed text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A] dark:focus:border-red-500 focus:bg-white dark:focus:bg-[#161a25] focus:shadow-sm transition-all placeholder:leading-relaxed font-khmer placeholder:font-khmer placeholder:text-gray-400"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { if (search.trim().length >= 2) setShowLiveDropdown(true); }}
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={openVisualSearch}
                  title="Visual Camera Search / ស្កេនស្វែងរកតាមរូបភាព"
                  className="relative group/cam w-7 h-7 rounded-full bg-gradient-to-tr from-[#8B1A1A] via-red-600 to-rose-500 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-[0_4px_14px_rgba(225,29,72,0.45),0_0_8px_rgba(244,63,94,0.3)] border border-rose-300/40"
                  aria-label="Scan image with Camera"
                >
                  <Camera size={13} strokeWidth={2.4} />
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
            {renderLiveDropdown()}
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
                className="relative w-[44px] h-[44px] lg:w-9 lg:h-9 flex items-center justify-center rounded-xl bg-gray-100/90 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-800 dark:text-gray-100 hover:text-[#8B1A1A] dark:hover:text-red-400 border border-gray-200/80 dark:border-white/10 transition-all cursor-pointer shadow-xs"
              >
                <Bell size={20} />
                {mounted && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-[#8B1A1A] text-white text-[10px] font-black rounded-full border-2 border-white dark:border-[#12151e] flex items-center justify-center shadow-md leading-none animate-in zoom-in-50">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Center Popover (Responsive Mobile Floating Panel) */}
              {notifOpen && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-[62px] sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-[390px] max-w-[420px] mx-auto sm:mx-0 bg-white dark:bg-[#141722] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-gray-900 dark:text-white">{tNotif('title')}</span>
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
                          className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors cursor-pointer border-none bg-transparent p-0 flex items-center gap-1"
                        >
                          <CheckCheck size={13} />
                          {tNotif('markAllRead')}
                        </button>
                        <button
                          type="button"
                          onClick={clearAll}
                          className="text-[12px] font-semibold text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent p-0 flex items-center gap-1"
                          title={tNotif('clearAll')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="py-10 px-4 text-center text-gray-400 dark:text-gray-500 text-[13px] flex flex-col items-center gap-2">
                        <Bell size={28} className="text-gray-300 dark:text-gray-600" />
                        <span>{tNotif('empty')}</span>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              setNotifOpen(false);
                              setActivePopupNotif(n);
                              if (n.link) {
                                router.push(n.link);
                              }
                            }}
                            className={`px-4 py-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                              !n.read 
                                ? "bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30" 
                                : "bg-white dark:bg-[#141722] hover:bg-gray-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {getNotifIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-[13px] font-bold text-gray-900 dark:text-white truncate group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 transition-colors">{n.title}</h4>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 flex-shrink-0">
                                  <Clock size={11} />
                                  {formatTimeAgo(n.created_at)}
                                </span>
                              </div>
                              <p className="text-[12px] text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              {n.link && (
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#8B1A1A] dark:text-red-400">
                                  <span>View Details & Direct Link</span>
                                  <ExternalLink size={10} />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-[#8B1A1A] dark:bg-red-500 mt-1.5" />
                              )}
                              {n.link && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.id);
                                    setNotifOpen(false);
                                    router.push(n.link!);
                                  }}
                                  title="Go directly to page"
                                  className="p-1 rounded-md bg-gray-100 dark:bg-white/10 hover:bg-[#8B1A1A] hover:text-white text-gray-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                >
                                  <ExternalLink size={12} />
                                </button>
                              )}
                            </div>
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
              className="relative w-[44px] h-[44px] lg:w-9 lg:h-9 flex items-center justify-center rounded-xl bg-gray-100/90 dark:bg-white/10 text-gray-900 dark:text-gray-100 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-[#8B1A1A] dark:hover:text-red-400 border border-gray-200/80 dark:border-white/10 transition-all shadow-xs"
            >
              <ShoppingCart size={20} />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-[#8B1A1A] text-white text-[10px] font-black rounded-full border-2 border-white dark:border-[#12151e] flex items-center justify-center leading-none shadow-md animate-in zoom-in-50">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* ── Theme & Language Switchers (Theme hidden on mobile navbar, kept in Account Settings) ── */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden lg:block">
                <ThemeDropdown />
              </div>
              <LanguageSwitcher />
            </div>

            {/* ── Prominent Sign In / Register Buttons or User Profile (Desktop Only) ── */}
            {user ? (
              <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-gray-200 dark:border-white/10 shrink-0">
                <Link
                  href="/account/wallet"
                  title="S-Tech Wallet & Coins"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition-all border border-amber-500/30 no-underline shadow-xs shrink-0 whitespace-nowrap"
                >
                  <Wallet size={13} />
                  <span>Wallet</span>
                </Link>
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
                  onClick={() => {
                    localStorage.removeItem("stech_user_session");
                    localStorage.removeItem("user_session");
                    localStorage.removeItem("customer_token");
                    localStorage.removeItem("stech_cached_user_profile");
                    localStorage.removeItem("stech_telegram_connected");
                    localStorage.removeItem("stech_cached_orders");
                    localStorage.removeItem("stech_cached_wallet");
                    document.cookie = "customer_token=; path=/; max-age=0;";
                    signOut(auth);
                    setUser(null);
                    window.dispatchEvent(new Event("user_session_updated"));
                  }}
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
        <nav className="hidden lg:block bg-gray-50/90 dark:bg-[#0c0d12]/95 border-t border-gray-100 dark:border-white/5 backdrop-blur-md">
          <div className="container flex items-center justify-center gap-2 lg:gap-2.5 xl:gap-5 2xl:gap-7 py-2 overflow-x-auto no-scrollbar">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-2.5 lg:px-3 py-1.5 text-[13px] xl:text-[14px] font-semibold rounded-lg whitespace-nowrap transition-all no-underline group ${
                  pathname === link.href
                    ? "text-[#8B1A1A] dark:text-red-400 font-bold bg-red-50/60 dark:bg-red-950/30 shadow-2xs"
                    : "text-gray-700 dark:text-gray-300 hover:text-[#8B1A1A] dark:hover:text-red-400 hover:bg-gray-100/70 dark:hover:bg-white/5"
                }`}
              >
                {link.label}
                <span 
                  className={`absolute left-2 right-2 bottom-0 h-[2px] bg-[#8B1A1A] dark:bg-red-500 rounded-full transition-transform duration-250 origin-center ${
                    pathname === link.href ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`} 
                />
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* ── 4. Persistent Mobile Search Bar (Below Header on < lg) ── */}
      <div className="lg:hidden sticky top-[54px] z-30 bg-white/90 dark:bg-[#0c0e14]/90 backdrop-blur-xl px-3 sm:px-4 py-2 border-b border-black/[0.05] dark:border-white/[0.08] shadow-xs transition-colors relative" ref={mobileSearchRef}>
        <form onSubmit={handleSearch} className="relative w-full flex items-center">
          <input
            type="search"
            className="w-full bg-gray-100/90 dark:bg-white/[0.08] border border-transparent focus:border-[#8B1A1A]/30 rounded-2xl pl-11 pr-20 h-11 py-2 leading-relaxed text-[14px] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:bg-white dark:focus:bg-[#161a25] transition-all shadow-xs placeholder:leading-relaxed font-khmer placeholder:font-khmer placeholder:text-gray-400"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => { if (search.trim().length >= 2) setShowLiveDropdown(true); }}
          />
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Camera Visual Search Scanner Button */}
            <button
              type="button"
              onClick={openVisualSearch}
              title="Visual Camera Search / ស្កេនស្វែងរកតាមរូបភាព"
              className="relative group/cam w-8 h-8 rounded-full bg-gradient-to-tr from-[#8B1A1A] via-red-600 to-rose-500 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-[0_4px_16px_rgba(225,29,72,0.5),0_0_10px_rgba(244,63,94,0.35)] border border-rose-300/40"
              aria-label="Scan image with Camera"
            >
              <Camera size={15} strokeWidth={2.4} />
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
        {renderLiveDropdown()}
      </div>

      <SlideOverCart />
      <VisualSearchModal />
      <NotificationPopupModal />
    </>
  );
}
