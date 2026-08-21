"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/routing";
import { useRouter, usePathname } from "@/i18n/routing";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  Search, ShoppingCart, User, Phone,
  Menu, X, ChevronDown, Heart, Bell,
  Gift, Shield, Zap, CheckCheck, Trash2, Clock, Info, LogOut,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useLangStore } from "@/store/langStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { translations } from "@/lib/translations";

export default function Navbar() {
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
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
  const {
    notifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    getUnreadCount,
  } = useNotificationStore();

  const t = translations[lang].nav;
  const tNotif = translations[lang].notifications;

  const navLinks = [
    { label: t.home, href: "/" },
    { label: t.laptops, href: "/category/laptops" },
    { label: t.desktops, href: "/category/desktops" },
    { label: t.parts, href: "/category/parts" },
    { label: t.gaming, href: "/category/gaming" },
    { label: t.buildPc, href: "/build-pc" },
    { label: t.services, href: "/services" },
    { label: t.promotions, href: "/promotions" },
    { label: t.orders, href: "/orders" },
    { label: t.contact, href: "/contact" },
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
      setMobileOpen(false);
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
    if (diffMin < 1) return tNotif.timeJustNow;
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d`;
  };

  const unreadCount = mounted ? getUnreadCount() : 0;

  return (
    <>
      {/* ── 1. Top Announcement Bar (Laptops / Desktops) ─────────────────── */}
      <div className="bg-[#111] text-white/70 text-[11px] py-1.5 hidden sm:block">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Phone size={11} />
            <span>+855 12 345 678 | support@stechstore.com.kh</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline">{t.freeDelivery}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Main Header Row (Logo + Search Bar + Icons) ───────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="container h-[68px] flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 no-underline">
            <img src="/logo.jpg" alt="S Tech Store" className="w-10 h-10 rounded-lg object-contain" />
            <div className="leading-none">
              <div className="font-dangrek text-[21px] text-[#1a1a1a] tracking-wide">
                S <span className="text-[#8B1A1A]">Tech</span> <span className="text-[#1a4fa0]">Store</span>
              </div>
              <div className="font-khmer text-[11px] text-[#888] hidden sm:block">ហាងបច្ចេកវិទ្យា</div>
            </div>
          </Link>

          {/* Desktop & Laptop Search Bar (Visible on md and larger) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <form onSubmit={handleSearch} className="relative w-full">
              <input
                type="search"
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-10 pr-12 h-10 text-[14px] outline-none focus:border-[#8B1A1A] focus:bg-white focus:shadow-sm transition-all"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#8B1A1A] hover:bg-[#6b1111] text-white rounded-full flex items-center justify-center transition-colors cursor-pointer border-none"
              >
                <Search size={13} />
              </button>
            </form>
          </div>

          {/* Right Action Icons (Wishlist, Cart, Profile, Hamburger on mobile) */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Link
              href="/wishlist"
              title={t.wishlist}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a] transition-colors"
            >
              <Heart size={20} />
            </Link>

            <Link
              href="/cart"
              title={t.cart}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a] transition-colors"
            >
              <ShoppingCart size={20} />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8B1A1A] rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                title={t.alerts}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a] transition-colors cursor-pointer border-none bg-transparent"
              >
                <Bell size={20} />
                {mounted && unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              {/* Notification Center Popover */}
              {notifOpen && (
                <div className="absolute top-full right-0 mt-2 w-[320px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-[#1a1a1a]">{tNotif.title}</span>
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
                          {tNotif.markAllRead}
                        </button>
                        <button
                          type="button"
                          onClick={clearAll}
                          className="text-[12px] font-semibold text-gray-400 hover:text-red-600 transition-colors cursor-pointer border-none bg-transparent p-0 flex items-center gap-1"
                          title={tNotif.clearAll}
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
                        <span>{tNotif.empty}</span>
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

            {/* ── Prominent Language Switcher Pill ── */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 text-[#1a1a1a] hover:text-[#8B1A1A] font-bold text-xs sm:text-sm border border-gray-200/80 hover:border-red-200 transition-all shadow-sm cursor-pointer"
              >
                <span className="text-sm sm:text-base">{lang === "EN" ? "🇺🇸" : "🇰🇭"}</span>
                <span>{lang === "EN" ? "EN" : "ខ្មែរ"}</span>
                <ChevronDown size={13} className="text-gray-400" />
              </button>
              {langOpen && (
                <div className="absolute top-full right-0 mt-2 w-44 bg-white text-[#1a1a1a] rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Select Language / ជ្រើសរើសភាសា
                  </div>
                  {(["EN", "KM"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => { setLang(l); setLangOpen(false); }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm font-semibold hover:bg-red-50/70 transition-colors cursor-pointer border-none flex items-center justify-between ${
                        lang === l ? "text-[#8B1A1A] bg-red-50 font-bold" : "text-gray-700"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{l === "EN" ? "🇺🇸" : "🇰🇭"}</span>
                        <span>{l === "EN" ? "English" : "ភាសាខ្មែរ"}</span>
                      </span>
                      {lang === l && <span className="w-1.5 h-1.5 rounded-full bg-[#8B1A1A]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Prominent Sign In / Register Buttons or User Profile ── */}
            {user ? (
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-gray-200">
                <Link
                  href="/account/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 text-[#1a1a1a] hover:text-[#8B1A1A] font-bold text-xs sm:text-sm transition-all border border-gray-200 hover:border-red-200 no-underline shadow-sm"
                >
                  <div className="w-5 h-5 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center text-[10px] font-black">
                    {(user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                  <span className="max-w-[100px] truncate">{user.displayName || user.email?.split("@")[0]}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-red-600 hover:text-white text-gray-700 rounded-xl text-xs font-bold transition-all border border-gray-200 cursor-pointer flex items-center gap-1"
                  title={t.signOut}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-gray-100 hover:bg-gray-200 text-[#1a1a1a] transition-all border border-gray-200 shadow-sm no-underline"
                >
                  {t.signIn}
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#a62222] hover:to-[#d64537] text-white transition-all shadow-md hover:shadow-lg no-underline flex items-center gap-1"
                >
                  <span>{t.register}</span>
                </Link>
              </div>
            )}

            {/* Mobile Profile Link for small screens */}
            <Link
              href="/account/profile"
              title={t.profile}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a] transition-colors"
            >
              <User size={20} />
            </Link>

            {/* Hamburger Button (Visible only on screens below lg) */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#1a1a1a] hover:bg-gray-100 transition-colors ml-1 cursor-pointer border-none bg-transparent"
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* ── 3. Dedicated Category Navigation Bar (Laptops & Desktops lg+) ── */}
        <nav className="hidden lg:block bg-gray-50/80 border-t border-gray-100">
          <div className="container flex items-center justify-center gap-6 xl:gap-8 py-2.5 overflow-x-auto no-scrollbar">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-[14px] font-medium rounded-md whitespace-nowrap transition-colors no-underline ${
                  pathname === link.href
                    ? "text-[#8B1A1A] bg-red-50/80 font-bold"
                    : "text-[#444] hover:text-[#8B1A1A] hover:bg-gray-100/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* ── 4. Persistent Mobile Search Bar (Visible on phones < md) ── */}
        <div className="md:hidden border-t border-gray-100 bg-gray-50 px-4 py-2.5">
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="search"
              className="w-full bg-white border border-gray-200 rounded-full pl-10 pr-12 h-10 text-[14px] outline-none focus:border-[#8B1A1A] focus:shadow-sm transition-all"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#8B1A1A] hover:bg-[#6b1111] text-white rounded-full flex items-center justify-center transition-colors cursor-pointer border-none"
            >
              <Search size={13} />
            </button>
          </form>
        </div>

        {/* ── 5. Mobile Drawer Menu (Visible when hamburger opened) ── */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white shadow-2xl animate-in slide-in-from-top-2 duration-200">
            {/* Category Nav Links */}
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-3 text-[15px] font-medium rounded-xl transition-colors no-underline ${
                    pathname === link.href
                      ? "text-[#8B1A1A] bg-red-50 font-bold"
                      : "text-[#444] hover:bg-gray-50 hover:text-[#1a1a1a]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Account / Auth & Bottom Navigation Shortcuts */}
            <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
              {user ? (
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center font-bold text-sm">
                      {(user.displayName || user.email || "U")[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-[#1a1a1a]">
                      {user.displayName || user.email?.split("@")[0]}
                    </span>
                  </div>
                  <button
                    onClick={() => { signOut(auth); setMobileOpen(false); }}
                    className="px-3 py-1.5 bg-[#c0392b] text-white rounded-lg text-xs font-semibold border-none cursor-pointer"
                  >
                    {t.signOut}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 py-3 text-center border-2 border-gray-200 rounded-xl text-sm font-bold text-[#1a1a1a] bg-white hover:bg-gray-50 no-underline shadow-sm"
                  >
                    {t.signIn}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 py-3 text-center bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#a62222] hover:to-[#d64537] text-white rounded-xl text-sm font-bold no-underline shadow-md"
                  >
                    {t.register}
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-1">
                <Link
                  href="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white rounded-xl border border-gray-200 text-[#555] hover:text-[#8B1A1A] no-underline"
                >
                  <Heart size={18} />
                  <span className="text-[11px] font-medium">{t.wishlist}</span>
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white rounded-xl border border-gray-200 text-[#555] hover:text-[#8B1A1A] no-underline"
                >
                  <ShoppingCart size={18} />
                  <span className="text-[11px] font-medium">{t.cart}</span>
                </Link>
                <Link
                  href="/account/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white rounded-xl border border-gray-200 text-[#555] hover:text-[#8B1A1A] no-underline"
                >
                  <User size={18} />
                  <span className="text-[11px] font-medium">{t.profile}</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
