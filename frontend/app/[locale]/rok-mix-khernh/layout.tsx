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
  Send
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

  const NAV_LINKS = [
    { 
      href: "/rok-mix-khernh", 
      label: isKm ? "ផ្ទាំងគ្រប់គ្រងទូទៅ" : "Dashboard", 
      icon: <LayoutDashboard size={18} />, 
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/products", 
      label: isKm ? "គ្រប់គ្រងទំនិញ" : "Products", 
      icon: <Package size={18} />, 
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/orders", 
      label: isKm ? "គ្រប់គ្រងការបញ្ជាទិញ" : "Orders", 
      icon: <ShoppingCart size={18} />, 
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/repairs", 
      label: isKm ? "សេវាជួសជុល" : "Repairs", 
      icon: <Wrench size={18} />, 
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/users", 
      label: isKm ? "គ្រប់គ្រងអតិថិជន" : "Customer Accounts", 
      icon: <UserCheck size={18} />, 
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/chat", 
      label: isKm ? "ឆាតផ្ទាល់ (Real-time)" : "Live Chat", 
      icon: <MessageSquare size={18} />, 
      adminOnly: false,
      badge: "RTDB"
    },
    { 
      href: "/rok-mix-khernh/telegram-bot", 
      label: isKm ? "Telegram Bot 🤖" : "Telegram Bot", 
      icon: <Send size={18} className="text-[#0088cc]" />, 
      adminOnly: false,
      badge: "Live"
    },
    // Admin Only Management Features
    { 
      href: "/rok-mix-khernh/staff", 
      label: isKm ? "គ្រប់គ្រងបុគ្គលិក" : "Staff Accounts", 
      icon: <Users size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
    { 
      href: "/rok-mix-khernh/branches", 
      label: isKm ? "គ្រប់គ្រងសាខាហាង" : "Store Branches", 
      icon: <Building2 size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
    { 
      href: "/rok-mix-khernh/shifts", 
      label: isKm ? "គ្រប់គ្រងវេនធ្វើការ" : "Work Shifts", 
      icon: <CalendarCheck size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
    { 
      href: "/rok-mix-khernh/promotions", 
      label: isKm ? "ប្រូម៉ូសិន" : "Promotions", 
      icon: <Tag size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
    { 
      href: "/rok-mix-khernh/settings", 
      label: isKm ? "ការកំណត់ប្រព័ន្ធ" : "System Settings", 
      icon: <Settings size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
  ];

  return (
    <div className="admin-theme flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/75 z-40 lg:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar - Enhanced for Mobile Comfort */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[340px] lg:w-72 bg-[#0c0d12] text-white flex flex-col transform transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} border-r border-white/10`}>
        
        {/* Brand Logo Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/rok-mix-khernh" className="flex items-center gap-3 no-underline text-white group">
            <img 
              src="/logo.jpg" 
              alt="S Tech Store Logo" 
              className="w-11 h-11 rounded-2xl object-contain shadow-md bg-white p-0.5 border border-white/20" 
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight m-0 leading-tight">S Tech Store</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${isAdmin ? 'bg-[#8B1A1A] text-white' : 'bg-blue-600 text-white'}`}>
                  {user?.role || "STAFF"}
                </span>
                <span className="text-[11px] text-gray-400">Management</span>
              </div>
            </div>
          </Link>
          <button 
            className="lg:hidden text-white/70 hover:text-white w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors" 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current User Pill in Sidebar */}
        <div className={`p-3.5 mx-3 my-3 border rounded-2xl transition-all ${
          isSuperAdmin
            ? "bg-gradient-to-br from-amber-950 via-[#2a1705] to-black border-amber-400/80 shadow-[0_4px_25px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50"
            : isAdmin 
              ? "bg-gradient-to-br from-amber-950/40 via-[#1c1212] to-black/70 border-amber-500/40 shadow-[0_4px_20px_rgba(245,158,11,0.15)]" 
              : "bg-gradient-to-br from-blue-950/40 via-[#0f1422] to-black/70 border-blue-500/30 shadow-[0_4px_20px_rgba(59,130,246,0.12)]"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-md ${
              isSuperAdmin
                ? "bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 text-amber-950 ring-2 ring-yellow-300 shadow-amber-400/50"
                : isAdmin 
                  ? "bg-gradient-to-tr from-amber-500 via-rose-600 to-red-600 text-amber-100 ring-2 ring-amber-400/50" 
                  : "bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 text-cyan-100 ring-2 ring-cyan-400/50"
            }`}>
              {isSuperAdmin ? (
                <Crown size={22} className="text-amber-950 fill-amber-950 drop-shadow" />
              ) : isAdmin ? (
                <Crown size={20} className="text-amber-200 drop-shadow" />
              ) : (
                <ShieldCheck size={20} className="text-cyan-200 drop-shadow" />
              )}
              <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0f0f12] ${isSuperAdmin ? 'bg-yellow-300 animate-pulse' : isAdmin ? 'bg-amber-400' : 'bg-cyan-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white truncate">{user?.name || "Logged In User"}</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${
                  isSuperAdmin
                    ? "bg-yellow-400/30 text-yellow-300 border-yellow-300 shadow-sm"
                    : isAdmin 
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/40" 
                      : "bg-blue-500/20 text-blue-300 border-blue-400/40"
                }`}>
                  {isSuperAdmin ? "👑 មហាសិទ្ធិ" : isAdmin ? "👑 ADMIN" : "🛡️ STAFF"}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
          
          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-1 text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5 truncate">
              <Store size={11} className={isSuperAdmin ? "text-yellow-400 flex-shrink-0" : isAdmin ? "text-amber-400 flex-shrink-0" : "text-blue-400 flex-shrink-0"} />
              <span className="truncate">{user?.branch || "Headquarters"}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Clock size={11} className={isSuperAdmin ? "text-amber-300 flex-shrink-0" : isAdmin ? "text-rose-400 flex-shrink-0" : "text-cyan-400 flex-shrink-0"} />
              <span className="truncate">{user?.shift || "Full Time Management"}</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-2 px-3 overflow-y-auto space-y-1.5">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            const isRestrictedForStaff = link.adminOnly && !isAdmin;

            if (isRestrictedForStaff) {
              return (
                <div 
                  key={link.href}
                  className="flex items-center justify-between px-3.5 py-3 text-xs text-gray-600 rounded-xl cursor-not-allowed select-none"
                  title={isKm ? "មុខងារនេះសម្រាប់តែ Administrator ប៉ុណ្ណោះ" : "Administrator Privilege Only"}
                >
                  <div className="flex items-center gap-3 opacity-40">
                    {link.icon}
                    <span>{link.label}</span>
                  </div>
                  <span className="text-[9px] font-semibold bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                </div>
              );
            }

            return (
              <Link 
                key={link.href} 
                href={link.href} 
                onClick={() => setSidebarOpen(false)} 
                className={`flex items-center justify-between px-3.5 py-3 text-[13.5px] sm:text-sm font-semibold rounded-2xl transition-all no-underline ${
                  isActive 
                    ? "text-white bg-gradient-to-r from-[#8B1A1A] to-red-700 shadow-md shadow-[#8B1A1A]/40" 
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 space-y-2 mt-auto">
          <Link 
            href="/rok-mix-khernh/products/new" 
            className="w-full py-2.5 px-3 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors no-underline shadow-md"
          >
            <Package size={16} />
            <span>{isKm ? "+ បន្ថែមទំនិញថ្មី" : "+ Add New Product"}</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-red-400 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/10"
          >
            <LogOut size={14} />
            <span>{isKm ? "ចាកចេញពីប្រព័ន្ធ" : "Logout"}</span>
          </button>
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
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
