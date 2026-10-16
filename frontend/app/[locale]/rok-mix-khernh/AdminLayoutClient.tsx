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
  MessageSquare,
  Send,
  ChevronRight,
  Globe,
  Sparkles,
  Layers,
  Crown,
  ShieldAlert,
  Lock,
  Palmtree,
  Ban
} from "lucide-react";
import { AdminPWAController, AdminPWAInstallButton } from "@/components/admin/AdminPWAController";
import { getPublicStoreStatus } from "@/lib/services/master.service";
import api from "@/lib/api";

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

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isKm = locale === "km";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [storeStatus, setStoreStatus] = useState<{
    status: string;
    vacationActive: boolean;
    staffLockdownActive: boolean;
    staffLockdownReason: string;
    vacationEndTime: string | null;
  }>({
    status: "online",
    vacationActive: false,
    staffLockdownActive: false,
    staffLockdownReason: "",
    vacationEndTime: null,
  });

  // If on admin login page, bypass the layout chrome
  const isLoginPage = pathname === "/rok-mix-khernh/login" || pathname.endsWith("/rok-mix-khernh/login");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.add("admin-portal-mounted");
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("admin-portal-mounted");
      }
    };
  }, []);

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    if (typeof window !== "undefined") {
      let token = localStorage.getItem("stech_admin_token") || sessionStorage.getItem("stech_admin_token");
      if (!token) {
        // Fallback to cookie if localStorage was cleared on tab close
        const match = document.cookie.match(/(?:^|;\s*)stech_admin_token=([^;]*)/);
        if (match && match[1]) {
          token = decodeURIComponent(match[1]);
          try {
            localStorage.setItem("stech_admin_token", token);
            sessionStorage.setItem("stech_admin_token", token);
          } catch (err) {}
        }
      }

      const userStr = localStorage.getItem("stech_admin_user") || sessionStorage.getItem("stech_admin_user");
      const hasDirectToken = (
        window.location.search.includes("token=") || 
        window.location.search.includes("bypass_token=")
      );

      const isOwnerSession = (
        localStorage.getItem("stech_owner_locked") === "true" ||
        (typeof document !== "undefined" && document.cookie.includes("stech_owner_locked=true")) ||
        userStr?.includes("nobrothana180703@gmail.com")
      );

      if (!token && !hasDirectToken) {
        if (!isOwnerSession) {
          // Not authenticated — redirect to admin login
          router.push("/rok-mix-khernh/login");
          return;
        }
      }

      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          if (parsed?.email === "nobrothana180703@gmail.com") {
            parsed.role = "super_admin";
            localStorage.setItem("stech_owner_locked", "true");
            if (typeof document !== "undefined") {
              document.cookie = "stech_owner_locked=true; path=/; max-age=315360000; SameSite=Lax";
            }
          }
          // Sanitize cached name: if not super_admin, normalize any legacy "Super Admin" name to "Admin"
          if (parsed && parsed.role !== "super_admin" && typeof parsed.name === "string") {
            if (parsed.name.toLowerCase().includes("super admin")) {
              parsed.name = parsed.name.replace(/Super Admin/gi, "Admin");
              try {
                localStorage.setItem("stech_admin_user", JSON.stringify(parsed));
                sessionStorage.setItem("stech_admin_user", JSON.stringify(parsed));
              } catch (e) {}
            }
          }
          setUser(parsed);
        } catch (e) {
          // ignore parse error
        }
      }
      setCheckingAuth(false);

      // Verify and sync profile with backend silently (resilient to Render cold-boot)
      if (token) {
        const verifySession = (isRetry = false) => {
          api.get("/admin/me")
            .then((res) => {
              if (res.data?.user) {
                const freshUser = res.data.user;
                if (freshUser.email === "nobrothana180703@gmail.com") {
                  freshUser.role = "super_admin";
                  localStorage.setItem("stech_owner_locked", "true");
                  if (typeof document !== "undefined") {
                    document.cookie = "stech_owner_locked=true; path=/; max-age=315360000; SameSite=Lax";
                  }
                }
                setUser(freshUser);
                try {
                  localStorage.setItem("stech_admin_user", JSON.stringify(freshUser));
                  sessionStorage.setItem("stech_admin_user", JSON.stringify(freshUser));
                  if (res.data?.token) {
                    localStorage.setItem("stech_admin_token", res.data.token);
                    sessionStorage.setItem("stech_admin_token", res.data.token);
                  }
                } catch (e) {}
              }
            })
            .catch((err) => {
              const isOwner = (
                user?.email === "nobrothana180703@gmail.com" ||
                localStorage.getItem("stech_owner_locked") === "true" ||
                (typeof document !== "undefined" && document.cookie.includes("stech_owner_locked=true")) ||
                userStr?.includes("nobrothana180703@gmail.com")
              );

              // Owner session is permanent and unbreakable: NEVER wipe storage or redirect to login on network drop
              if (isOwner) {
                return;
              }

              // Cold boot or transient network interruption retry
              if (!isRetry && (err.response?.status === 401 || !err.response || err.response?.status >= 500)) {
                setTimeout(() => verifySession(true), 2500);
                return;
              }

              // Only redirect on confirmed 401 unauthenticated after retry
              if (err.response?.status === 401) {
                try {
                  localStorage.removeItem("stech_admin_token");
                  localStorage.removeItem("stech_admin_user");
                  sessionStorage.removeItem("stech_admin_token");
                  sessionStorage.removeItem("stech_admin_user");
                  document.cookie = "stech_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                } catch (e) {}
                router.push("/rok-mix-khernh/login");
              }
            });
        };

        verifySession(false);
      }
    }
  }, [pathname, isLoginPage, router]);

  // Silent session re-validation when returning to PWA app or browser tab after inactivity
  useEffect(() => {
    if (isLoginPage) return;

    const handleWakeup = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        const token = localStorage.getItem("stech_admin_token") || sessionStorage.getItem("stech_admin_token");
        if (token) {
          api.get("/admin/me")
            .then((res) => {
              if (res.data?.user) {
                const freshUser = res.data.user;
                setUser(freshUser);
                try {
                  localStorage.setItem("stech_admin_user", JSON.stringify(freshUser));
                  sessionStorage.setItem("stech_admin_user", JSON.stringify(freshUser));
                  if (res.data?.token) {
                    localStorage.setItem("stech_admin_token", res.data.token);
                    sessionStorage.setItem("stech_admin_token", res.data.token);
                  }
                } catch (e) {}
              }
            })
            .catch(() => {
              // Ignore background sync errors on wakeup — do not kick user out
            });
        }
      }
    };

    document.addEventListener("visibilitychange", handleWakeup);
    window.addEventListener("focus", handleWakeup);
    return () => {
      document.removeEventListener("visibilitychange", handleWakeup);
      window.removeEventListener("focus", handleWakeup);
    };
  }, [isLoginPage]);

  // Listen for dynamic auth updates from 1-click token verification
  useEffect(() => {
    const handleAuthUpdate = () => {
      try {
        const userStr = localStorage.getItem("stech_admin_user");
        if (userStr) {
          const parsed = JSON.parse(userStr);
          if (parsed && parsed.role !== "super_admin" && typeof parsed.name === "string") {
            if (parsed.name.toLowerCase().includes("super admin")) {
              parsed.name = parsed.name.replace(/Super Admin/gi, "Admin");
              localStorage.setItem("stech_admin_user", JSON.stringify(parsed));
            }
          }
          setUser(parsed);
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

  // Event-driven store status sync for Staff Lockdown & Vacation mode (Zero polling interval)
  useEffect(() => {
    if (isLoginPage) return;

    const checkStoreStatus = async () => {
      try {
        const res = await getPublicStoreStatus();
        setStoreStatus({
          status: res.status,
          vacationActive: !!res.vacation?.active,
          staffLockdownActive: !!res.staff_lockdown?.active,
          staffLockdownReason: res.staff_lockdown?.reason || "",
          vacationEndTime: res.vacation?.end_time || null,
        });
      } catch (e) {}
    };

    checkStoreStatus();

    const handleSync = (e: any) => {
      if (e.detail) {
        const res = e.detail;
        setStoreStatus({
          status: res.status,
          vacationActive: !!res.vacation?.active,
          staffLockdownActive: !!res.staff_lockdown?.active,
          staffLockdownReason: res.staff_lockdown?.reason || "",
          vacationEndTime: res.vacation?.end_time || null,
        });
      } else {
        checkStoreStatus();
      }
    };

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("stech_store_mode_sync");
        channel.onmessage = (event) => {
          if (event.data?.data) {
            handleSync({ detail: event.data.data });
          }
        };
      }
    } catch (e) {}

    window.addEventListener("stech_store_status_changed", handleSync);
    return () => {
      if (channel) channel.close();
      window.removeEventListener("stech_store_status_changed", handleSync);
    };
  }, [isLoginPage]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("stech_admin_token");
        localStorage.removeItem("stech_admin_user");
        localStorage.removeItem("stech_owner_locked");
        sessionStorage.removeItem("stech_admin_token");
        sessionStorage.removeItem("stech_admin_user");
        document.cookie = "stech_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "stech_owner_locked=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch (e) {}
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

  // Super Admin is exclusively reserved for the System Owner
  const isSuperAdmin = user?.role === "super_admin" || user?.email === "nobrothana180703@gmail.com";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  // Clean display name: Normal admins are strictly named Admin (never Super Admin)
  const adminDisplayName = !isSuperAdmin && user?.name 
    ? user.name.replace(/Super Admin/gi, "Admin")
    : (user?.name || "Admin");

  const CORE_LINKS = [
    { 
      href: "/rok-mix-khernh", 
      title: "Dashboard", 
      subtitle: isKm ? "ផ្ទាំងគ្រប់គ្រងទូទៅ" : "Main Operations",
      icon: LayoutDashboard,
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/products", 
      title: "Products", 
      subtitle: isKm ? "គ្រប់គ្រងទំនិញ & ស្តុក" : "Inventory & Catalog",
      icon: Package,
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/orders", 
      title: "Orders", 
      subtitle: isKm ? "ការបញ្ជាទិញ & ដឹកជញ្ជូន" : "Sales & Tracking",
      icon: ShoppingCart,
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/repairs", 
      title: "Repairs", 
      subtitle: isKm ? "សេវាជួសជុល & គ្រឿងបន្លាស់" : "Repair Services",
      icon: Wrench,
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/users", 
      title: "Customer Accounts", 
      subtitle: isKm ? "គ្រប់គ្រងអតិថិជន & CRM" : "Customer Profiles",
      icon: UserCheck,
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/chat", 
      title: "Live Chat", 
      subtitle: isKm ? "ឆាតផ្ទាល់ Real-Time" : "Real-Time Support",
      icon: MessageSquare,
      badge: "Live",
      isLive: true,
      adminOnly: false 
    },
    { 
      href: "/rok-mix-khernh/telegram-bot", 
      title: "Telegram Bot", 
      subtitle: isKm ? "គ្រប់គ្រង Bot & Alerts" : "Bot Sentinel & Alerts",
      icon: Send,
      badge: "Bot",
      adminOnly: false 
    },
  ];

  const SYSTEM_LINKS = [
    { 
      href: "/rok-mix-khernh/staff", 
      title: "Staff Accounts", 
      subtitle: isKm ? "គ្រប់គ្រងបុគ្គលិក & សិទ្ធិ" : "Staff & Permissions",
      icon: Users,
      badge: "Admin",
      adminOnly: true 
    },
    { 
      href: "/rok-mix-khernh/branches", 
      title: "Store Branches", 
      subtitle: isKm ? "គ្រប់គ្រងសាខាហាង" : "Branches & Locations",
      icon: Building2,
      badge: "Admin",
      adminOnly: true 
    },
    { 
      href: "/rok-mix-khernh/shifts", 
      title: "Work Shifts", 
      subtitle: isKm ? "កាលវិភាគ & វេនធ្វើការ" : "Rosters & Schedules",
      icon: CalendarCheck,
      badge: "Admin",
      adminOnly: true 
    },
    { 
      href: "/rok-mix-khernh/promotions", 
      title: "Promotions", 
      subtitle: isKm ? "ប្រូម៉ូសិន & កូដបញ្ចុះតម្លៃ" : "Discounts & Campaigns",
      icon: Tag,
      badge: "Admin",
      adminOnly: true 
    },
    { 
      href: "/rok-mix-khernh/settings", 
      title: "System Settings", 
      subtitle: isKm ? "ការកំណត់ប្រព័ន្ធ & Security" : "System & Security",
      icon: Settings,
      badge: "Admin",
      adminOnly: true 
    },
  ];

  return (
    <div data-admin-portal="true" className="admin-theme admin-portal-active flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* PWA Controller: Manifest, Meta Tags, Mobile Install Prompt */}
      <AdminPWAController />

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
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${isSuperAdmin ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-black shadow-xs' : isAdmin ? 'bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white shadow-xs' : 'bg-blue-600 text-white'}`}>
                  {isSuperAdmin ? "OWNER" : isAdmin ? "ADMIN" : "STAFF"}
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
        <div className={`p-3.5 mx-3.5 my-3 rounded-2xl shrink-0 transition-all border ${
          isSuperAdmin
            ? "bg-neutral-900/90 border-amber-500/30 shadow-xs"
            : isAdmin 
              ? "bg-neutral-900/90 border-[#8B1A1A]/40 shadow-xs" 
              : "bg-neutral-900/90 border-neutral-800 shadow-xs"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
              isSuperAdmin
                ? "bg-amber-400/15 border-amber-400/40 text-amber-300"
                : isAdmin 
                  ? "bg-[#8B1A1A]/20 border-[#8B1A1A]/50 text-red-200" 
                  : "bg-neutral-800 border-neutral-700 text-neutral-300"
            }`}>
              {isSuperAdmin ? (
                <ShieldCheck size={20} className="text-amber-300" />
              ) : isAdmin ? (
                <ShieldCheck size={19} className="text-red-200" />
              ) : (
                <ShieldCheck size={19} className="text-neutral-300" />
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0c0d12] ${isSuperAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-white truncate">{adminDisplayName}</span>
                <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded-md border shrink-0 ${
                  isSuperAdmin
                    ? "bg-amber-400/15 text-amber-300 border-amber-400/30 font-mono"
                    : isAdmin 
                      ? "bg-[#8B1A1A]/30 text-red-200 border-[#8B1A1A]/40 font-mono" 
                      : "bg-neutral-800 text-neutral-300 border-neutral-700 font-mono"
                }`}>
                  {isSuperAdmin ? "OWNER" : isAdmin ? "ADMIN" : "STAFF"}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 truncate mt-0.5">{user?.email}</div>
            </div>
          </div>
          
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-1.5 text-[10px] text-neutral-400">
            <div className="flex items-center gap-1.5 truncate bg-black/40 px-2 py-1 rounded-lg border border-white/[0.04]">
              <Store size={11} className={isSuperAdmin ? "text-amber-400 shrink-0" : isAdmin ? "text-red-400 shrink-0" : "text-neutral-400 shrink-0"} />
              <span className="truncate">{user?.branch?.split(' ')[0] || "Phnom Penh"}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate bg-black/40 px-2 py-1 rounded-lg border border-white/[0.04]">
              <Clock size={11} className={isSuperAdmin ? "text-amber-400 shrink-0" : isAdmin ? "text-red-400 shrink-0" : "text-neutral-400 shrink-0"} />
              <span className="truncate">{user?.shift?.split(' ')[0] || "Full Time"}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Menu - Human-Crafted Ergonomics */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          {/* Section 1: Core Operations */}
          <div>
            <div className="px-2 pb-2 flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-neutral-400 select-none">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <Layers size={12} className="text-neutral-400" />
                <span>{isKm ? "ប្រតិបត្តិការចម្បង" : "CORE OPERATIONS"}</span>
              </span>
              <span className="text-[9px] text-neutral-400 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.04]">
                {CORE_LINKS.length}
              </span>
            </div>

            <div className="space-y-1">
              {CORE_LINKS.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    onClick={() => setSidebarOpen(false)} 
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 no-underline border ${
                      isActive 
                        ? "bg-[#8B1A1A] text-white shadow-md shadow-[#8B1A1A]/30 border-[#8B1A1A]" 
                        : "bg-transparent hover:bg-white/[0.05] text-neutral-300 hover:text-white border-transparent hover:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Refined Icon Container */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive 
                          ? "bg-white/20 text-white shadow-xs" 
                          : "bg-white/[0.04] text-neutral-400 group-hover:text-white group-hover:bg-white/[0.08] border border-white/[0.06]"
                      }`}>
                        <link.icon size={18} />
                      </div>

                      {/* Dual-Line Labels */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-semibold tracking-tight truncate ${isActive ? 'text-white font-bold' : 'text-neutral-200 group-hover:text-white'}`}>
                            {link.title}
                          </span>
                          {link.badge && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md shrink-0 border ${
                              isActive 
                                ? "bg-white/20 text-white border-white/30" 
                                : link.badge === "Live"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-mono"
                                : "bg-white/[0.06] text-neutral-400 border-white/10"
                            }`}>
                              {link.badge}
                            </span>
                          )}
                        </div>
                        <div className={`text-[10.5px] truncate font-medium ${isActive ? 'text-red-100' : 'text-neutral-500 group-hover:text-neutral-400'}`}>
                          {link.subtitle}
                        </div>
                      </div>
                    </div>

                    <ChevronRight 
                      size={15} 
                      className={`shrink-0 ml-2 transition-transform duration-150 ${
                        isActive 
                          ? 'text-white/80 translate-x-0.5' 
                          : 'text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5'
                      }`} 
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section 1.5: Grand Master Control (Reserved for System Owner) */}
          <div>
            <div className="px-2 pt-1 pb-2 flex items-center justify-between text-[10px] font-bold tracking-widest uppercase select-none">
              <span className="flex items-center gap-1.5 text-amber-400/90">
                <Crown size={12} className="text-amber-400" />
                <span>{isKm ? "ផ្ទាំងបញ្ជាកំពូលម្ចាស់ប្រព័ន្ធ" : "GRAND MASTER CONTROL"}</span>
              </span>
              <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border ${
                isSuperAdmin 
                  ? "bg-amber-400/15 text-amber-300 border-amber-400/30" 
                  : "bg-white/[0.04] text-neutral-400 border-white/[0.06]"
              }`}>
                {isSuperAdmin ? "ACTIVE" : "VIEW"}
              </span>
            </div>

            <div className="space-y-1">
              <Link 
                href="/rok-mix-khernh/master-control" 
                onClick={() => setSidebarOpen(false)} 
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 no-underline border ${
                  pathname === "/rok-mix-khernh/master-control"
                    ? "bg-gradient-to-r from-amber-700 to-amber-600 text-white shadow-md shadow-amber-950/60 border-amber-400/50" 
                    : isSuperAdmin
                    ? "bg-amber-950/20 hover:bg-amber-950/40 text-neutral-200 border-amber-500/20 hover:border-amber-400/40"
                    : "bg-transparent hover:bg-white/[0.05] text-neutral-300 hover:text-white border-transparent hover:border-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                    pathname === "/rok-mix-khernh/master-control"
                      ? "bg-white/20 text-white border-white/30 shadow-xs"
                      : isSuperAdmin 
                      ? "bg-amber-400/10 border-amber-400/30 text-amber-300 group-hover:bg-amber-400/20" 
                      : "bg-white/[0.04] border-white/[0.06] text-neutral-400"
                  }`}>
                    {isSuperAdmin ? <Crown size={18} /> : <Lock size={17} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-semibold tracking-tight truncate ${
                        pathname === "/rok-mix-khernh/master-control" ? "text-white font-bold" : "text-neutral-200 group-hover:text-white"
                      }`}>
                        Master Controls
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md shrink-0 border ${
                        pathname === "/rok-mix-khernh/master-control"
                          ? "bg-white/20 text-white border-white/30"
                          : isSuperAdmin 
                          ? "bg-amber-400/15 text-amber-300 border-amber-400/30 font-mono" 
                          : "bg-white/[0.06] text-neutral-400 border-white/10"
                      }`}>
                        {isSuperAdmin ? "Owner" : "View"}
                      </span>
                    </div>
                    <div className="text-[10.5px] truncate font-medium text-neutral-500 group-hover:text-neutral-400">
                      {isKm ? "បញ្ជាបិទ/បើកហាង & Killswitches" : "Infrastructure & Killswitches"}
                    </div>
                  </div>
                </div>

                <ChevronRight 
                  size={15} 
                  className={`shrink-0 ml-2 transition-transform duration-150 ${
                    pathname === "/rok-mix-khernh/master-control"
                      ? "text-white/80 translate-x-0.5"
                      : "text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5"
                  }`} 
                />
              </Link>
            </div>
          </div>

          {/* Section 2: Administration & System */}
          <div>
            <div className="px-2 pt-2 pb-2 flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-neutral-400 select-none">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <Settings size={12} className="text-neutral-400" />
                <span>{isKm ? "ការគ្រប់គ្រងប្រព័ន្ធ" : "SYSTEM & ADMIN"}</span>
              </span>
              <span className="text-[9px] text-neutral-400 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.04]">
                {SYSTEM_LINKS.length}
              </span>
            </div>

            <div className="space-y-1">
              {SYSTEM_LINKS.map((link) => {
                const isActive = pathname === link.href;
                const isRestrictedForStaff = link.adminOnly && !isAdmin;

                if (isRestrictedForStaff) {
                  return (
                    <div 
                      key={link.href}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-transparent border border-transparent text-neutral-600 cursor-not-allowed select-none opacity-40"
                      title={isKm ? "មុខងារនេះសម្រាប់តែ Administrator ប៉ុណ្ណោះ" : "Administrator Privilege Only"}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.02] border border-white/[0.04] text-neutral-600">
                          <link.icon size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium text-neutral-600 truncate">{link.title}</div>
                          <div className="text-[10px] text-neutral-700 truncate">{link.subtitle}</div>
                        </div>
                      </div>
                      <span className="text-[8.5px] font-bold uppercase bg-white/[0.04] text-neutral-600 px-1.5 py-0.5 rounded border border-white/[0.06]">
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
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 no-underline border ${
                      isActive 
                        ? "bg-[#8B1A1A] text-white shadow-md shadow-[#8B1A1A]/30 border-[#8B1A1A]" 
                        : "bg-transparent hover:bg-white/[0.05] text-neutral-300 hover:text-white border-transparent hover:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive 
                          ? "bg-white/20 text-white shadow-xs" 
                          : "bg-white/[0.04] text-neutral-400 group-hover:text-white group-hover:bg-white/[0.08] border border-white/[0.06]"
                      }`}>
                        <link.icon size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-semibold tracking-tight truncate ${isActive ? 'text-white font-bold' : 'text-neutral-200 group-hover:text-white'}`}>
                            {link.title}
                          </span>
                          {link.badge && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md shrink-0 border ${
                              isActive 
                                ? "bg-white/20 text-white border-white/30" 
                                : "bg-white/[0.06] text-neutral-400 border-white/10"
                            }`}>
                              {link.badge}
                            </span>
                          )}
                        </div>
                        <div className={`text-[10.5px] truncate font-medium ${isActive ? 'text-red-100' : 'text-neutral-500 group-hover:text-neutral-400'}`}>
                          {link.subtitle}
                        </div>
                      </div>
                    </div>

                    <ChevronRight 
                      size={15} 
                      className={`shrink-0 ml-2 transition-transform duration-150 ${
                        isActive 
                          ? 'text-white/80 translate-x-0.5' 
                          : 'text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5'
                      }`} 
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section 3: Operational Status Card */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold text-neutral-300 tracking-wide uppercase">
                  System Health
                </span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-mono">
                Normal
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04] flex flex-col">
                <span className="text-neutral-500 text-[9px]">Store Engine</span>
                <span className="font-semibold text-emerald-400 font-mono text-[10px]">Online 24/7</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04] flex flex-col">
                <span className="text-neutral-500 text-[9px]">Sync Sentinel</span>
                <span className="font-semibold text-neutral-300 font-mono text-[10px]">Connected</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Bottom Actions Dock */}
        <div className="p-3.5 pb-[max(env(safe-area-inset-bottom,0px)+18px,28px)] border-t border-white/[0.08] space-y-2.5 bg-[#090a0e]/95 backdrop-blur-md shrink-0">
          <Link 
            href="/rok-mix-khernh/products/new" 
            onClick={() => setSidebarOpen(false)}
            className="w-full py-2.5 px-3.5 bg-[#8B1A1A] hover:bg-[#a11e1e] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all no-underline shadow-sm active:scale-[0.98] border border-red-500/30"
          >
            <Package size={16} />
            <span>{isKm ? "+ បន្ថែមទំនិញថ្មី • Add Product" : "+ Add New Product"}</span>
          </Link>

          {/* PWA Install Button in Sidebar */}
          <AdminPWAInstallButton variant="sidebar" />

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-3 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all no-underline border border-white/[0.08] active:scale-95 shadow-xs"
              title="បើកមើល Website"
            >
              <Globe size={15} className="text-neutral-400" />
              <span>{isKm ? "មើល Store" : "Live Store"}</span>
            </a>

            <button
              onClick={handleLogout}
              className="h-11 px-3 bg-gradient-to-r from-red-950/50 to-red-900/40 hover:from-red-900/60 hover:to-red-800/50 text-red-200 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-red-500/30 hover:border-red-500/50 active:scale-95 shadow-sm"
              title="ចាកចេញពី Admin Portal"
            >
              <LogOut size={16} className="text-red-400" />
              <span>{isKm ? "ចាកចេញ (Logout)" : "Logout"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-gray-200/80 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          
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
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  S <span className="text-[#8B1A1A]">Tech</span> Store
                </span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                  isSuperAdmin 
                    ? 'bg-amber-400/25 text-amber-950 border border-amber-400/60 shadow-2xs' 
                    : isAdmin 
                    ? 'bg-[#8B1A1A] text-white shadow-2xs' 
                    : 'bg-neutral-800 text-white'
                }`}>
                  {isSuperAdmin ? "Owner" : isAdmin ? "Admin" : "Staff"}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Branch and Shift Badge on Top Header for quick viewing */}
            <div className="hidden md:flex items-center gap-2 bg-neutral-100/70 px-3 py-1.5 rounded-xl border border-neutral-200/70 text-xs text-neutral-700">
              <Store size={13} className="text-[#8B1A1A]" />
              <span className="font-semibold">{user?.branch?.split(' ')[0] || "Phnom Penh"}</span>
              <span className="text-gray-300">|</span>
              <Clock size={13} className="text-neutral-500" />
              <span>{user?.shift?.split(' ')[0] || "Day"}</span>
            </div>

            {/* PWA Install Button in Top Header */}
            <AdminPWAInstallButton variant="pill" />

            {/* Grand Master Status Quick Pill */}
            <Link
              href="/rok-mix-khernh/master-control"
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all no-underline ${
                isSuperAdmin
                  ? "bg-amber-500/10 border-amber-400/40 text-amber-900 hover:bg-amber-500/20"
                  : "bg-gray-100 hover:bg-gray-200/70 border-gray-200 text-gray-700"
              }`}
              title={isSuperAdmin ? "សិទ្ធិម្ចាស់ប្រព័ន្ធកំពូលសកម្ម • Master Privileges Active" : "Admin ធម្មតា • View-Only Master Controls"}
            >
              {isSuperAdmin ? (
                <>
                  <Crown size={14} className="text-amber-600" />
                  <span className="font-black">Master Control</span>
                </>
              ) : (
                <>
                  <Lock size={12} className="text-gray-500" />
                  <span>Master (View-Only)</span>
                </>
              )}
            </Link>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* User Profile Pill & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`flex items-center gap-2.5 pl-2 py-1 pr-2 rounded-xl border transition-colors ${
                isSuperAdmin 
                  ? "bg-amber-50/60 border-amber-200/80 hover:bg-amber-50"
                  : "bg-neutral-50/80 border-neutral-200/80 hover:bg-neutral-100/60"
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isSuperAdmin
                    ? "bg-amber-400/20 text-amber-900 border border-amber-300/60"
                    : isAdmin
                      ? "bg-[#8B1A1A] text-white"
                      : "bg-neutral-800 text-white"
                }`}>
                  {isSuperAdmin ? (
                    <ShieldCheck size={16} className="text-amber-800" />
                  ) : isAdmin ? (
                    <ShieldCheck size={15} className="text-white" />
                  ) : (
                    <ShieldCheck size={15} className="text-neutral-200" />
                  )}
                </div>
                <div className="text-left hidden sm:block pr-1">
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <span>{adminDisplayName}</span>
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-md border ${
                      isSuperAdmin
                        ? "bg-amber-200/70 text-amber-950 border-amber-300"
                        : isAdmin 
                          ? "bg-red-100 text-[#8B1A1A] border-red-200" 
                          : "bg-neutral-200 text-neutral-800 border-neutral-300"
                    }`}>
                      {isSuperAdmin ? "Owner" : isAdmin ? "Admin" : "Staff"}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {isSuperAdmin ? (isKm ? "ម្ចាស់ប្រព័ន្ធ / Owner" : "System Owner") : isAdmin ? (isKm ? "អ្នកគ្រប់គ្រង / Admin" : "Administrator") : (isKm ? "បុគ្គលិកហាង" : "Store Staff Member")}
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

        {/* ── GLOBAL STAFF LOCKDOWN ALERT BANNER FOR NON-SUPERADMIN USERS ── */}
        {!isSuperAdmin && storeStatus.staffLockdownActive && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-3 shadow-lg flex items-center justify-between gap-3 text-xs font-bold border-b border-red-800 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <Ban size={18} className="text-white shrink-0 animate-pulse" />
              <span>
                ការជូនដំណឹងបន្ទាន់៖ ម្ចាស់ប្រព័ន្ធបានដាក់បញ្ជាបង្កកសកម្មភាព Admin & Staff ទាំងអស់ (Global Activity Lockdown Active)! រាល់សកម្មភាពបន្ថែម កែប្រែ ឬលុបទិន្នន័យត្រូវបានផ្អាកបណ្ដោះអាសន្ន។
              </span>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-black/40 text-[10px] uppercase font-mono tracking-wider shrink-0 border border-white/20">
              READ-ONLY MODE
            </span>
          </div>
        )}

        {/* ── SUPER ADMIN STAFF LOCKDOWN ACTIVE INDICATOR ── */}
        {isSuperAdmin && storeStatus.staffLockdownActive && (
          <div className="bg-gradient-to-r from-red-950 via-rose-950 to-red-900 text-rose-200 px-4 py-2 shadow-sm flex items-center justify-between gap-3 text-xs font-bold border-b border-rose-800/40">
            <div className="flex items-center gap-2">
              <Ban size={14} className="text-rose-400 shrink-0" />
              <span>
                ម្ចាស់ប្រព័ន្ធ៖ លោកអ្នកបានបើក Global Staff Lockdown (សកម្មភាព Admin & Staff ផ្សេងទៀតត្រូវបានផ្អាក)។
              </span>
            </div>
            <Link href="/rok-mix-khernh/master-control" className="text-[11px] underline font-black text-rose-300 hover:text-white shrink-0">
              គ្រប់គ្រង Master Control →
            </Link>
          </div>
        )}

        {/* ── VACATION MODE STOREFRONT NOTICE BANNER ── */}
        {storeStatus.vacationActive && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-yellow-500/20 text-amber-900 border-b border-amber-300/60 px-4 py-2 flex items-center justify-between gap-3 text-xs font-bold">
            <div className="flex items-center gap-2">
              <Palmtree size={15} className="text-amber-700 shrink-0" />
              <span>
                Storefront កំពុងបើកផ្ទាំងឈប់សម្រាកបណ្តោះអាសន្ន (Vacation Mode + Live Countdown) — ហាងនឹង auto direct បើកវិញពេលដល់ម៉ោង!
              </span>
            </div>
            {isSuperAdmin && (
              <Link href="/rok-mix-khernh/master-control" className="text-[11px] underline font-black text-amber-800 hover:text-amber-950 shrink-0">
                កែប្រែពេលសម្រាក →
              </Link>
            )}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-2 sm:p-4 lg:p-8 overflow-x-hidden overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
