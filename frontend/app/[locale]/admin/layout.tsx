"use client";

import { useState, useEffect } from "react";
import { Link, useRouter, usePathname } from "@/i18n/routing";
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
  CalendarCheck
} from "lucide-react";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "staff" | "manager";
  branch?: string;
  shift?: string;
  phone?: string;
  permissions?: string[];
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // If on admin login page, bypass the layout chrome
  const isLoginPage = pathname === "/admin/login" || pathname.endsWith("/admin/login");

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("stech_admin_token");
      const userStr = localStorage.getItem("stech_admin_user");

      if (!token) {
        // Not authenticated — redirect to admin login
        router.push("/admin/login");
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

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("stech_admin_token");
      localStorage.removeItem("stech_admin_user");
      document.cookie = "stech_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    router.push("/admin/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-3 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-medium">កំពុងផ្ទៀងផ្ទាត់សិទ្ធិគ្រប់គ្រង (Verifying Admin Access)...</p>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  const NAV_LINKS = [
    { 
      href: "/admin", 
      label: "ផ្ទាំងគ្រប់គ្រងទូទៅ (Overview)", 
      icon: <LayoutDashboard size={18} />, 
      adminOnly: false 
    },
    { 
      href: "/admin/products", 
      label: "គ្រប់គ្រងទំនិញ (Products)", 
      icon: <Package size={18} />, 
      adminOnly: false 
    },
    { 
      href: "/admin/orders", 
      label: "គ្រប់គ្រងការបញ្ជាទិញ (Orders)", 
      icon: <ShoppingCart size={18} />, 
      adminOnly: false 
    },
    { 
      href: "/admin/repairs", 
      label: "សេវាជួសជុល (Repairs)", 
      icon: <Wrench size={18} />, 
      adminOnly: false 
    },
    // Admin Only Management Features
    { 
      href: "/admin/staff", 
      label: "គ្រប់គ្រងបុគ្គលិក (Staff Accounts)", 
      icon: <Users size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
    { 
      href: "/admin/branches", 
      label: "គ្រប់គ្រងសាខាហាង (Branches)", 
      icon: <Building2 size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
    { 
      href: "/admin/shifts", 
      label: "គ្រប់គ្រងវេនធ្វើការ (Shifts)", 
      icon: <CalendarCheck size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
    { 
      href: "/admin/promotions", 
      label: "ប្រូម៉ូសិន (Promotions)", 
      icon: <Tag size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
    { 
      href: "/admin/settings", 
      label: "ការកំណត់ប្រព័ន្ធ (Settings)", 
      icon: <Settings size={18} />, 
      adminOnly: true,
      badge: "Admin" 
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f0f12] text-white flex flex-col transform transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} border-r border-white/10 shadow-xl`}>
        
        {/* Brand Logo Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3 no-underline text-white group">
            <img 
              src="/logo.jpg" 
              alt="S Tech Store Logo" 
              className="w-10 h-10 rounded-xl object-contain shadow-md bg-white p-0.5 border border-white/20" 
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight m-0 leading-tight">S Tech Store</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isAdmin ? 'bg-[#8B1A1A] text-white' : 'bg-blue-600 text-white'}`}>
                  {user?.role || "STAFF"}
                </span>
                <span className="text-[11px] text-gray-400">Management</span>
              </div>
            </div>
          </Link>
          <button 
            className="lg:hidden text-white/70 hover:text-white p-1 rounded-md" 
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Current User Pill in Sidebar */}
        <div className="p-3 mx-3 my-3 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${isAdmin ? 'bg-gradient-to-br from-red-600 to-red-800 text-white' : 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white'}`}>
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{user?.name || "Logged In User"}</div>
              <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
          
          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-1 text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5 truncate">
              <Store size={11} className="text-red-400 flex-shrink-0" />
              <span className="truncate">{user?.branch || "Phnom Penh Main Branch"}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Clock size={11} className="text-blue-400 flex-shrink-0" />
              <span className="truncate">{user?.shift || "Standard Shift"}</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-2 px-3 overflow-y-auto space-y-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            const isRestrictedForStaff = link.adminOnly && !isAdmin;

            if (isRestrictedForStaff) {
              return (
                <div 
                  key={link.href}
                  className="flex items-center justify-between px-3 py-2.5 text-xs text-gray-600 rounded-lg cursor-not-allowed select-none"
                  title="មុខងារនេះសម្រាប់តែ Administrator ប៉ុណ្ណោះ (Admin Privilege Only)"
                >
                  <div className="flex items-center gap-3 opacity-40">
                    {link.icon}
                    <span>{link.label}</span>
                  </div>
                  <span className="text-[9px] font-semibold bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
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
                className={`flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-all no-underline ${
                  isActive 
                    ? "text-white bg-[#8B1A1A] shadow-md shadow-[#8B1A1A]/30" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded">
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
            href="/admin/products/new" 
            className="w-full py-2.5 px-3 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors no-underline shadow-md"
          >
            <Package size={16} />
            <span>+ Add New Product</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-red-400 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/10"
          >
            <LogOut size={14} />
            <span>ចាកចេញពីប្រព័ន្ធ (Logout)</span>
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
            
            <Link href="/admin" className="flex items-center gap-2.5 no-underline">
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

            {/* User Profile Pill & Logout */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-gray-900">{user?.name || "Admin"}</div>
                <div className="text-[10px] text-gray-500">{user?.role === "admin" ? "Super Administrator" : "Store Staff Member"}</div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
