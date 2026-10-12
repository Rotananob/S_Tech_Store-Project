"use client";

import { useState, useEffect } from "react";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Wrench, 
  Tag, 
  Settings, 
  Users, 
  Store, 
  Clock, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  UserCheck, 
  Building2,
  CalendarCheck,
  Crown,
  MessageSquare,
  Send,
  ChevronRight,
  Globe,
  Sparkles
} from "lucide-react";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "staff" | "manager";
  branch?: string;
  shift?: string;
  phone?: string;
  permissions?: string[];
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isKm = locale === "km";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // If on admin login page, bypass the layout chrome
  const isLoginPage = pathname === "/rok-mix-khernh/login" || pathname.endsWith("/rok-mix-khernh/login");

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("stech_admin_token");
      const userStr = localStorage.getItem("stech_admin_user");
      const hasDirectToken = (
        window.location.search.includes("token=") || 
        window.location.search.includes("bypass_token=")
      );

      if (!token && !hasDirectToken) {
        // Not authenticated — redirect to admin login
        router.push("/rok-mix-khernh/login");
        return;
      }

      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (e) {
          // ignore parse error
        }
      }
      setCheckingAuth(false);
    }
  }, [pathname, isLoginPage, router]);

  // Listen for dynamic auth updates from 1-click token verification
  useEffect(() => {
    const handleAuthUpdate = () => {
      try {
        const userStr = localStorage.getItem("stech_admin_user");
        if (userStr) {
          setUser(JSON.parse(userStr));
          setCheckingAuth(false);
        }
      } catch (e) {}
    };

    window.addEventListener("stech_admin_auth_updated", handleAuthUpdate);
    window.addEventListener("storage", handleAuthUpdate);
    return () => {
      window.removeEventListener("stech_admin_auth_updated", handleAuthUpdate);
      window.removeEventListener("storage", handleAuthUpdate);
    };
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("stech_admin_token");
      localStorage.removeItem("stech_admin_user");
      document.cookie = "stech_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    router.push("/rok-mix-khernh/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="admin-theme min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-3 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-medium">
          {isKm ? "កំពុងផ្ទៀងផ្ទាត់សិទ្ធិគ្រប់គ្រង..." : "Verifying Administrator Access..."}
        </p>
      </div>
    );
  }

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  const CORE_LINKS = [
    { 
      href: "/rok-mix-khernh", 
      title: "Dashboard", 
      subtitle: isKm ? "ផ្ទាំងគ្រប់គ្រងទូទៅ" : "Main Operations",
      icon: LayoutDashboard,
      gradient: "from-rose-500 via-red-600 to-rose-700",
      shadow: "shadow-rose-900/40",
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/products", 
      title: "Products", 
      subtitle: isKm ? "គ្រប់គ្រងទំនិញ & ស្តុក" : "Inventory & Catalog",
      icon: Package,
      gradient: "from-blue-500 via-indigo-600 to-blue-700",
      shadow: "shadow-blue-900/40",
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/orders", 
      title: "Orders", 
      subtitle: isKm ? "ការបញ្ជាទិញ & ដឹកជញ្ជូន" : "Sales & Tracking",
      icon: ShoppingCart,
      gradient: "from-emerald-500 via-teal-600 to-emerald-700",
      shadow: "shadow-emerald-900/40",
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/repairs", 
      title: "Repairs", 
      subtitle: isKm ? "សេវាជួសជុល & គ្រឿងបន្លាស់" : "Repair Services",
      icon: Wrench,
      gradient: "from-amber-500 via-orange-600 to-amber-700",
      shadow: "shadow-amber-900/40",
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/users", 
      title: "Customer Accounts", 
      subtitle: isKm ? "គ្រប់គ្រងអតិថិជន & CRM" : "Customer Profiles",
      icon: UserCheck,
      gradient: "from-sky-500 via-blue-600 to-sky-700",
      shadow: "shadow-sky-900/40",
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/chat", 
      title: "Live Chat", 
      subtitle: isKm ? "ឆាតផ្ទាល់ Real-Time" : "Real-Time Support",
      icon: MessageSquare,
      gradient: "from-pink-500 via-rose-600 to-pink-700",
      shadow: "shadow-pink-900/40",
      badge: "RTDB",
      isLive: true,
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/telegram-bot", 
      title: "Telegram Bot", 
      subtitle: isKm ? "គ្រប់គ្រង Bot & Alerts" : "Bot Sentinel & Alerts",
      icon: Send,
      gradient: "from-[#0088cc] via-sky-500 to-blue-600",
      shadow: "shadow-sky-900/40",
      badge: "Live",
      adminOnly: false 
    },
  ];

  const SYSTEM_LINKS = [
    { 
      href: "/rok-mix-khernh/staff", 
      title: "Staff Accounts", 
      subtitle: isKm ? "គ្រប់គ្រងបុគ្គលិក & សិទ្ធិ" : "Staff & Permissions",
      icon: Users,
      gradient: "from-purple-500 via-violet-600 to-purple-700",
      shadow: "shadow-purple-900/40",
      badge: "Admin",
      adminOnly: true 
    },
    { 
      href: "/rok-mix-khernh/branches", 
      title: "Store Branches", 
      subtitle: isKm ? "គ្រប់គ្រងសាខាហាង" : "Branches & Locations",
      icon: Building2,
      gradient: "from-teal-500 via-emerald-600 to-teal-700",
      shadow: "shadow-teal-900/40",
      badge: "Admin",
      adminOnly: true 
    },
    { 
      href: "/rok-mix-khernh/shifts", 
      title: "Work Shifts", 
      subtitle: isKm ? "កាលវិភាគ & វេនធ្វើការ" : "Rosters & Schedules",
      icon: CalendarCheck,
      gradient: "from-cyan-500 via-blue-600 to-cyan-700",
      shadow: "shadow-cyan-900/40",
      badge: "Admin",
      adminOnly: true 
    },
    { 
      href: "/rok-mix-khernh/promotions", 
      title: "Promotions", 
      subtitle: isKm ? "ប្រូម៉ូសិន & កូដបញ្ចុះតម្លៃ" : "Discounts & Campaigns",
      icon: Tag,
      gradient: "from-orange-500 via-rose-600 to-orange-700",
      shadow: "shadow-orange-900/40",
      badge: "Admin",
      adminOnly: true 
    },
    { 
      href: "/rok-mix-khernh/settings", 
      title: "System Settings", 
      subtitle: isKm ? "ការកំណត់ប្រព័ន្ធ & Security" : "System & Security",
      icon: Settings,
      gradient: "from-slate-500 via-zinc-600 to-slate-700",
      shadow: "shadow-slate-900/40",
      badge: "Admin",
      adminOnly: true 
    },
  ];

  return (
    <div className="admin-theme flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-md transition-opacity animate-in fade-in duration-200" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar - Enhanced for Fast, Large Mobile Touch Comfort */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[380px] lg:w-80 bg-[#0c0d12] text-white flex flex-col transform transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} border-r border-white/10`}>
        
        {/* Brand Logo Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0c0d12]/95 backdrop-blur-md">
          <Link href="/rok-mix-khernh" className="flex items-center gap-3 no-underline text-white group">
            <img 
              src="/logo.jpg" 
              alt="S Tech Store Logo" 
              className="w-12 h-12 rounded-2xl object-contain shadow-lg bg-white p-0.5 border border-white/20 group-hover:scale-105 transition-transform" 
            />
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight m-0 leading-tight flex items-center gap-1.5">
                <span>S <span className="text-[#8B1A1A]">Tech</span> Store</span>
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${isAdmin ? 'bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white shadow-xs' : 'bg-blue-600 text-white'}`}>
                  {user?.role || "STAFF"}
                </span>
                <span className="text-[11px] text-gray-400 font-medium">Console</span>
              </div>
            </div>
          </Link>
          <button 
            className="lg:hidden text-white/80 hover:text-white w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 transition-all cursor-pointer" 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Current User VIP Pill in Sidebar */}
        <div className={`p-3.5 mx-3.5 my-3 border rounded-2xl shrink-0 transition-all ${
          isSuperAdmin
            ? "bg-gradient-to-br from-amber-950/80 via-[#2a1705] to-black border-amber-400/80 shadow-[0_4px_25px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50"
            : isAdmin 
              ? "bg-gradient-to-br from-amber-950/40 via-[#1c1212] to-black/70 border-amber-500/40 shadow-[0_4px_20px_rgba(245,158,11,0.15)]" 
              : "bg-gradient-to-br from-blue-950/40 via-[#0f1422] to-black/70 border-blue-500/30 shadow-[0_4px_20px_rgba(59,130,246,0.12)]"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-md ${
              isSuperAdmin
                ? "bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 text-amber-950 ring-2 ring-yellow-300 shadow-amber-400/50"
                : isAdmin 
                  ? "bg-gradient-to-tr from-amber-500 via-rose-600 to-red-600 text-amber-100 ring-2 ring-amber-400/50" 
                  : "bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 text-cyan-100 ring-2 ring-cyan-400/50"
            }`}>
              {isSuperAdmin ? (
                <Crown size={24} className="text-amber-950 fill-amber-950 drop-shadow" />
              ) : isAdmin ? (
                <Crown size={22} className="text-amber-200 drop-shadow" />
              ) : (
                <ShieldCheck size={22} className="text-cyan-200 drop-shadow" />
              )}
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0c0d12] ${isSuperAdmin ? 'bg-yellow-300 animate-pulse' : isAdmin ? 'bg-amber-400' : 'bg-cyan-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white truncate">{user?.name || "Logged In User"}</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${
                  isSuperAdmin
                    ? "bg-yellow-400/30 text-yellow-300 border-yellow-300 shadow-sm"
                    : isAdmin 
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/40" 
                      : "bg-blue-500/20 text-blue-300 border-blue-400/40"
                }`}>
                  {isSuperAdmin ? "👑 SUPER ADMIN" : isAdmin ? "👑 ADMIN" : "🛡️ STAFF"}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 truncate mt-0.5">{user?.email}</div>
            </div>
          </div>
          
          <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px] text-gray-300">
            <div className="flex items-center gap-1.5 truncate bg-black/30 px-2 py-1 rounded-lg">
              <Store size={12} className={isSuperAdmin ? "text-yellow-400 shrink-0" : isAdmin ? "text-amber-400 shrink-0" : "text-blue-400 shrink-0"} />
              <span className="truncate">{user?.branch?.split(' ')[0] || "Phnom Penh"}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate bg-black/30 px-2 py-1 rounded-lg">
              <Clock size={12} className={isSuperAdmin ? "text-amber-300 shrink-0" : isAdmin ? "text-rose-400 shrink-0" : "text-cyan-400 shrink-0"} />
              <span className="truncate">{user?.shift?.split(' ')[0] || "Full Time"}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Menu - Large Touch Ergonomics */}
        <nav className="flex-1 px-3.5 py-2 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          {/* Section 1: Core Operations */}
          <div>
            <div className="px-2 pb-2 flex items-center justify-between text-[10.5px] font-black tracking-wider uppercase text-gray-400 select-none">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span>📌</span>
                <span>{isKm ? "ប្រតិបត្តិការចម្បង" : "CORE OPERATIONS"}</span>
              </span>
              <span className="text-[9px] text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                {CORE_LINKS.length} MODULES
              </span>
            </div>

            <div className="space-y-1.5">
              {CORE_LINKS.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    onClick={() => setSidebarOpen(false)} 
                    className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all duration-200 no-underline border ${
                      isActive 
                        ? "bg-gradient-to-r from-[#8B1A1A] via-red-800 to-red-600 text-white shadow-xl shadow-red-950/70 border-red-500/50 ring-1 ring-red-400/30" 
                        : "bg-white/[0.03] hover:bg-white/[0.08] text-gray-200 border-white/5 hover:border-white/15 active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Big Vibrant Icon Container */}
                      <div className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-tr ${link.gradient} text-white ${link.shadow} group-hover:scale-105 group-active:scale-95 transition-transform duration-200`}>
                        <link.icon size={22} className="drop-shadow-xs" />
                        {link.isLive && (
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#0c0d12]" />
                          </span>
                        )}
                      </div>

                      {/* Dual-Line Labels */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13.5px] sm:text-[14.5px] font-bold tracking-tight truncate ${isActive ? 'text-white font-extrabold' : 'text-gray-100 group-hover:text-white'}`}>
                            {link.title}
                          </span>
                          {link.badge && (
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 border ${
                              isActive 
                                ? "bg-white/20 text-white border-white/30" 
                                : link.badge === "RTDB" || link.badge === "Live"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            }`}>
                              {link.badge}
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] truncate mt-0.5 font-medium ${isActive ? 'text-red-100' : 'text-gray-400 group-hover:text-gray-300'}`}>
                          {link.subtitle}
                        </div>
                      </div>
                    </div>

                    <ChevronRight 
                      size={18} 
                      className={`shrink-0 ml-2 transition-transform duration-200 ${
                        isActive 
                          ? 'text-white translate-x-0.5' 
                          : 'text-gray-500 group-hover:text-white group-hover:translate-x-0.5'
                      }`} 
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section 2: Administration & System */}
          <div>
            <div className="px-2 pt-2 pb-2 flex items-center justify-between text-[10.5px] font-black tracking-wider uppercase text-gray-400 select-none">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span>⚙️</span>
                <span>{isKm ? "ការគ្រប់គ្រងប្រព័ន្ធ" : "SYSTEM & ADMIN"}</span>
              </span>
              <span className="text-[9px] text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                {SYSTEM_LINKS.length} MODULES
              </span>
            </div>

            <div className="space-y-1.5">
              {SYSTEM_LINKS.map((link) => {
                const isActive = pathname === link.href;
                const isRestrictedForStaff = link.adminOnly && !isAdmin;

                if (isRestrictedForStaff) {
                  return (
                    <div 
                      key={link.href}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white/[0.01] border border-white/5 text-gray-600 cursor-not-allowed select-none opacity-40"
                      title={isKm ? "មុខងារនេះសម្រាប់តែ Administrator ប៉ុណ្ណោះ" : "Administrator Privilege Only"}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-gray-800 text-gray-500">
                          <link.icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-gray-500 truncate">{link.title}</div>
                          <div className="text-[10px] text-gray-600 truncate">{link.subtitle}</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-semibold bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                        Admin Only
                      </span>
                    </div>
                  );
                }

                return (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    onClick={() => setSidebarOpen(false)} 
                    className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all duration-200 no-underline border ${
                      isActive 
                        ? "bg-gradient-to-r from-[#8B1A1A] via-red-800 to-red-600 text-white shadow-xl shadow-red-950/70 border-red-500/50 ring-1 ring-red-400/30" 
                        : "bg-white/[0.03] hover:bg-white/[0.08] text-gray-200 border-white/5 hover:border-white/15 active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Big Vibrant Icon Container */}
                      <div className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-tr ${link.gradient} text-white ${link.shadow} group-hover:scale-105 group-active:scale-95 transition-transform duration-200`}>
                        <link.icon size={22} className="drop-shadow-xs" />
                      </div>

                      {/* Dual-Line Labels */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13.5px] sm:text-[14.5px] font-bold tracking-tight truncate ${isActive ? 'text-white font-extrabold' : 'text-gray-100 group-hover:text-white'}`}>
                            {link.title}
                          </span>
                          {link.badge && (
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 border ${
                              isActive 
                                ? "bg-white/20 text-white border-white/30" 
                                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            }`}>
                              {link.badge}
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] truncate mt-0.5 font-medium ${isActive ? 'text-red-100' : 'text-gray-400 group-hover:text-gray-300'}`}>
                          {link.subtitle}
                        </div>
                      </div>
                    </div>

                    <ChevronRight 
                      size={18} 
                      className={`shrink-0 ml-2 transition-transform duration-200 ${
                        isActive 
                          ? 'text-white translate-x-0.5' 
                          : 'text-gray-500 group-hover:text-white group-hover:translate-x-0.5'
                      }`} 
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section 3: Live Cloud Sentinel Status Card (Fills leftover space ergonomically) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 shadow-inner mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  Cloud Infrastructure <Sparkles size={12} className="text-amber-400" />
                </span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                24/7 Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col">
                <span className="text-gray-400 text-[9px]">Neon PostgreSQL</span>
                <span className="font-bold text-emerald-400 font-mono">22ms • Active</span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col">
                <span className="text-gray-400 text-[9px]">Realtime DB</span>
                <span className="font-bold text-sky-400 font-mono">Firebase RTDB</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Bottom Actions Dock */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 space-y-2.5 bg-[#0a0a0f] shrink-0">
          <Link 
            href="/rok-mix-khernh/products/new" 
            onClick={() => setSidebarOpen(false)}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#8B1A1A] via-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all no-underline shadow-lg shadow-red-950/70 active:scale-[0.98] border border-red-500/30"
          >
            <Package size={18} className="animate-pulse" />
            <span>{isKm ? "+ បន្ថែមទំនិញថ្មី • Add Product" : "+ Add New Product"}</span>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all no-underline border border-white/10 active:scale-95"
              title="បើកមើល Website"
            >
              <Globe size={14} className="text-sky-400" />
              <span>{isKm ? "មើល Store" : "Live Store"}</span>
            </a>

            <button
              onClick={handleLogout}
              className="py-2.5 px-3 bg-red-950/30 hover:bg-red-950/60 text-red-300 hover:text-red-200 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-red-500/20 active:scale-95"
            >
              <LogOut size={14} />
              <span>{isKm ? "ចាកចេញ" : "Logout"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-xs">
          
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden text-gray-700 p-2 rounded-lg hover:bg-gray-100 cursor-pointer" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            
            <Link href="/rok-mix-khernh" className="flex items-center gap-2.5 no-underline">
              <img 
                src="/logo.jpg" 
                alt="S Tech Store" 
                className="w-8 h-8 rounded-lg object-contain border border-gray-200" 
              />
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-gray-900 tracking-tight">
                  S <span className="text-[#8B1A1A]">Tech</span> Store
                </span>
                <span className={`text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full uppercase tracking-wider ${isAdmin ? 'bg-[#8B1A1A]' : 'bg-blue-600'}`}>
                  {user?.role || "Staff"}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Branch and Shift Badge on Top Header for quick viewing */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100/80 px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700">
              <Store size={13} className="text-[#8B1A1A]" />
              <span className="font-semibold">{user?.branch?.split(' ')[0] || "Phnom Penh"}</span>
              <span className="text-gray-300">|</span>
              <Clock size={13} className="text-blue-600" />
              <span>{user?.shift?.split(' ')[0] || "Day"}</span>
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* User Profile Pill & Logout */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2.5 pl-2 py-1 pr-2 rounded-2xl border shadow-2xs ${
                isSuperAdmin 
                  ? "bg-gradient-to-r from-amber-50 to-yellow-50/60 border-amber-300 ring-1 ring-amber-300/40"
                  : "bg-gray-50/80 border-gray-200/80"
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                  isSuperAdmin
                    ? "bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 text-amber-950 ring-2 ring-yellow-300 shadow-amber-400/30"
                    : isAdmin
                      ? "bg-gradient-to-tr from-amber-500 via-rose-600 to-red-600 text-white ring-1 ring-amber-400/60 shadow-amber-500/20"
                      : "bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white ring-1 ring-blue-400/60 shadow-blue-500/20"
                }`}>
                  {isSuperAdmin ? (
                    <Crown size={16} className="text-amber-950 fill-amber-950 drop-shadow-xs" />
                  ) : isAdmin ? (
                    <Crown size={15} className="text-amber-100" />
                  ) : (
                    <ShieldCheck size={15} className="text-cyan-100" />
                  )}
                </div>
                <div className="text-left hidden sm:block pr-1">
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <span>{user?.name || "Admin"}</span>
                    <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded-full border ${
                      isSuperAdmin
                        ? "bg-amber-300 text-amber-950 border-amber-400 font-extrabold shadow-2xs"
                        : isAdmin 
                          ? "bg-amber-100 text-amber-900 border-amber-300" 
                          : "bg-blue-100 text-blue-900 border-blue-300"
                    }`}>
                      {isSuperAdmin ? "👑 មហាសិទ្ធិ (Owner)" : isAdmin ? "👑 Admin" : "🛡️ Staff"}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {isSuperAdmin ? (isKm ? "ម្ចាស់ប្រព័ន្ធ / Ultimate Privilege" : "System Owner (Supreme Privileges)") : isAdmin ? (isKm ? "អ្នកគ្រប់គ្រងជាន់ខ្ពស់" : "Super Administrator") : (isKm ? "បុគ្គលិកហាង" : "Store Staff Member")}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
                title="ចាកចេញ (Logout)"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-2 sm:p-4 lg:p-8 overflow-x-hidden overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
