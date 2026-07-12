"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  Search,
  ShoppingCart,
  User,
  Phone,
  Menu,
  X,
  ChevronDown,
  Heart,
  Bell,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Laptops", href: "/category/laptops" },
  { label: "Desktops", href: "/category/desktops" },
  { label: "Parts", href: "/category/parts" },
  { label: "Gaming", href: "/category/gaming" },
  { label: "Services", href: "/services" },
  { label: "🔧 Build PC", href: "/build-pc" },
];

export default function Navbar() {
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("EN");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const cartCount = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    setMounted(true);
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase auth error:", e);
    }
  }, []);

  return (
    <>
      {/* Top Bar */}
      <div className="bg-[#111] text-white/75 text-[12px] py-[7px] border-b border-white/5">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-1.5">
            <Phone size={12} />
            <span>+855 12 345 678 | support@stechstore.com.kh</span>
          </div>
          <div className="flex items-center justify-center md:justify-end gap-4">
            <span className="hidden md:inline border-r border-white/20 pr-4">🇰🇭 Free Same-Day Delivery in Phnom Penh</span>
            
            {/* Language Switcher */}
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                {lang === "EN" ? "🇺🇸 EN" : "🇰🇭 KHM"}
                <ChevronDown size={12} />
              </button>
              {langOpen && (
                <div className="absolute top-full right-0 mt-3 w-[120px] bg-white text-[#1a1a1a] rounded-md shadow-2xl overflow-hidden border border-gray-200">
                  <button
                    type="button"
                    onClick={() => { setLang("EN"); setLangOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13px] hover:bg-gray-100 transition-colors font-medium cursor-pointer"
                  >
                    🇺🇸 English
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLang("KM"); setLangOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13px] hover:bg-gray-100 transition-colors font-medium cursor-pointer font-khmer"
                  >
                    🇰🇭 ខ្មែរ
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-white text-[13px]">Hi, {user.displayName || user.email?.split('@')[0]}</span>
                <button
                  onClick={() => signOut(auth)}
                  className="text-white text-[13px] font-semibold bg-[#c0392b] hover:bg-[#8B1A1A] px-4 py-1.5 rounded-md no-underline transition-colors cursor-pointer border-none"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-white text-[13px] font-semibold bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-md no-underline transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-white text-[13px] font-semibold bg-[#c0392b] hover:bg-[#8B1A1A] px-4 py-1.5 rounded-md no-underline transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="navbar bg-white border-b border-gray-100">
        <div className="container navbar-inner flex items-center justify-between py-3 md:py-0 h-auto md:h-[64px]">
          {/* Logo */}
          <Link href="/" className="nav-logo flex items-center gap-2.5 flex-shrink-0 no-underline">
            <img
              src="/logo.jpg"
              alt="S Tech Store Logo"
              className="w-[42px] h-[42px] object-contain flex-shrink-0 rounded-lg"
            />
            <div>
              <div className="font-dangrek text-[22px] leading-none text-[#1a1a1a] tracking-[0.02em] mb-[2px]">
                S <span className="text-[#8B1A1A]">Tech</span> <span className="text-[#1a4fa0]">Store</span>
              </div>
              <div className="font-khmer text-[11px] text-[#555] tracking-[0.05em] leading-none">
                ហាងបច្ចេកវិទ្យា
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="nav-links hidden md:flex items-center gap-1 flex-1 ml-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 text-[14px] font-medium rounded-md transition-colors whitespace-nowrap ${
                  pathname === link.href ? "text-[#8B1A1A] bg-gray-50" : "text-[#555] hover:text-[#1a1a1a] hover:bg-gray-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right Side (Search + Icons) */}
          <div className="hidden md:flex items-center gap-4">
            {/* Search */}
            <div className="relative w-[280px] flex-shrink-0">
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-[38px] pr-4 h-[40px] text-[14px] outline-none focus:border-[#8B1A1A] transition-colors"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>

            {/* Icons */}
            <div className="flex items-center gap-1">
              <Link
                href="/wishlist"
                className="w-[38px] h-[38px] flex items-center justify-center rounded-md text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a] transition-colors"
              >
                <Heart size={20} />
              </Link>

              <Link
                href="/cart"
                className="relative w-[38px] h-[38px] flex items-center justify-center rounded-md text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a] transition-colors"
              >
                <ShoppingCart size={20} />
                {mounted && cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#8B1A1A] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              <button className="relative w-[38px] h-[38px] flex items-center justify-center rounded-md text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a] transition-colors">
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>

              <Link
                href="/account/profile"
                className="w-[38px] h-[38px] flex items-center justify-center rounded-md text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a] transition-colors"
              >
                <User size={20} />
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden w-[38px] h-[38px] flex items-center justify-center rounded-md text-[#555]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-4">
            <div className="relative w-full">
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-[38px] pr-4 h-[40px] text-[14px] outline-none focus:border-[#8B1A1A]"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2 text-[15px] font-medium rounded-md ${
                    pathname === link.href ? "text-[#8B1A1A] bg-red-50" : "text-[#555]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <Link href="/wishlist" className="flex flex-col items-center gap-1 text-[#555]">
                <Heart size={20} />
                <span className="text-[11px]">Wishlist</span>
              </Link>
              <Link href="/cart" className="relative flex flex-col items-center gap-1 text-[#555]">
                <ShoppingCart size={20} />
                {mounted && cartCount > 0 && (
                  <span className="absolute -top-1 right-2 w-4 h-4 bg-[#8B1A1A] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
                <span className="text-[11px]">Cart</span>
              </Link>
              <button className="relative flex flex-col items-center gap-1 text-[#555]">
                <Bell size={20} />
                <span className="absolute -top-0.5 right-4 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                <span className="text-[11px]">Alerts</span>
              </button>
              <Link href="/account/profile" className="flex flex-col items-center gap-1 text-[#555]">
                <User size={20} />
                <span className="text-[11px]">Profile</span>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
