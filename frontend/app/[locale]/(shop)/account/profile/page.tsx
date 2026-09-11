"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  User, Shield, Bell, Package, Heart, Wrench, Award,
  CheckCircle2, Key, Smartphone, History, MapPin, Mail, Phone,
  Save, LogOut, ChevronRight, Gift, Sparkles, Eye, Clock,
} from "lucide-react";
import { useLangStore } from "@/store/langStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { translations } from "@/lib/translations";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileData {
  display_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  two_fa_enabled: boolean;
  notif_orders: boolean;
  notif_promos: boolean;
  notif_builds: boolean;
  points: number;
  created_at: string;
}

interface StatsData {
  orders: number;
  wishlist: number;
  points: number;
  unread_notifications: number;
}

export default function UserProfilePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "security" | "notifications" | "orders" | "wishlist" | "builds" | "repairs">("overview");
  const [mounted, setMounted] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData>({
    display_name: "", email: "", phone: "", address: "", city: "",
    two_fa_enabled: false, notif_orders: true, notif_promos: true, notif_builds: true,
    points: 0, created_at: "",
  });
  const [stats, setStats] = useState<StatsData>({ orders: 0, wishlist: 0, points: 0, unread_notifications: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const { lang } = useLangStore();
  const t = translations[lang].profilePage;
  const tNav = translations[lang].nav;
  const tNotif = translations[lang].notifications;
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const wishlistCount = useWishlistStore((s) => s.getTotalItems());

  useEffect(() => {
    setMounted(true);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        loadProfile();
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, []);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await api.get("/user/profile");
      setProfile(res.data.profile);
      setStats(res.data.stats);
      fetchNotifications();
    } catch (e) { console.error(e); }
    setLoadingProfile(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put("/user/profile", {
        display_name: profile.display_name,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      loadProfile();
    } catch (e) { console.error(e); }
  };

  const handleSaveNotifPrefs = async () => {
    try {
      await api.put("/user/profile", {
        notif_orders: profile.notif_orders,
        notif_promos: profile.notif_promos,
        notif_builds: profile.notif_builds,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) { console.error(e); }
  };

  const handleToggle2FA = async () => {
    const newVal = !profile.two_fa_enabled;
    setProfile((p) => ({ ...p, two_fa_enabled: newVal }));
    try {
      await api.put("/user/profile", { two_fa_enabled: newVal });
    } catch (e) { console.error(e); }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get("/user/orders");
      setOrders(res.data || []);
    } catch (e) { console.error(e); }
    setOrdersLoading(false);
  };

  const formatTime = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return tNotif.timeJustNow;
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  if (!mounted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const SidebarTab = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => (
    <button
      onClick={() => { setActiveTab(id as any); if (id === "orders") loadOrders(); }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-none text-left ${
        activeTab === id ? "bg-[#8B1A1A] text-white shadow-md" : "bg-transparent text-gray-700 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3"><Icon size={18} /><span>{label}</span></div>
      <ChevronRight size={15} />
    </button>
  );

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button type="button" onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer border-none ${value ? "bg-[#8B1A1A]" : "bg-gray-300"}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? "translate-x-6" : "translate-x-0"}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-10">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-[#111] via-[#1a1a1a] to-[#252525] rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden border border-white/10">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#8B1A1A]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#8B1A1A] to-[#c0392b] text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-white/20">
                {(profile.display_name || user?.displayName || "U")[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{profile.display_name || user?.displayName || "S Tech Customer"}</h1>
                  <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-[#8B1A1A]/90 text-white border border-red-400/30 flex items-center gap-1">
                    <Sparkles size={11} />{t.roleCustomer}
                  </span>
                </div>
                <p className="text-white/60 text-xs sm:text-sm mt-1 flex items-center gap-2">
                  <Mail size={13} className="text-red-400" />{user?.email || profile.email}
                </p>
                <p className="text-white/40 text-[11px] mt-1">
                  {t.memberSince}: {profile.created_at ? formatTime(profile.created_at) : "2025"} • 🇰🇭
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-white/60 mb-1 font-medium">
                    <span>{stats.points} pts</span>
                    <span>1000 pts to Gold</span>
                  </div>
                  <div className="w-full sm:w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full" style={{ width: `${Math.min((stats.points / 1000) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
            {user ? (
              <button onClick={() => signOut(auth)} className="self-start sm:self-center bg-white/10 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border border-white/15 flex items-center gap-2 cursor-pointer">
                <LogOut size={14} />{tNav.signOut}
              </button>
            ) : (
              <div className="flex items-center gap-3 self-start sm:self-center">
                <Link href="/login" className="bg-[#8B1A1A] hover:bg-[#a62222] text-white px-5 py-2.5 rounded-xl text-xs font-bold no-underline">{tNav.signIn}</Link>
                <Link href="/register" className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-xs font-bold border border-white/20 no-underline">{tNav.register}</Link>
              </div>
            )}
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="space-y-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 space-y-1">
              <SidebarTab id="overview" icon={User} label={t.overview} />
              <SidebarTab id="settings" icon={Wrench} label={t.settings} />
              <SidebarTab id="security" icon={Shield} label={t.security} />
              <SidebarTab id="notifications" icon={Bell} label={t.notifPrefs} />
              <SidebarTab id="orders" icon={Package} label={t.statsOrders} />
              <SidebarTab id="builds" icon={Wrench} label="My PC Builds" />
              <SidebarTab id="repairs" icon={Shield} label="Tech Repairs" />
              <SidebarTab id="wishlist" icon={Heart} label={t.statsWishlist} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-2.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block px-1">Quick Links</span>
              <button onClick={() => { setActiveTab("orders"); loadOrders(); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium no-underline cursor-pointer border-none bg-transparent text-left">
                <span className="flex items-center gap-2.5"><Package size={17} className="text-[#8B1A1A]" />{t.statsOrders}</span>
                <span className="text-xs font-bold text-gray-400">{stats.orders}</span>
              </button>
              <button onClick={() => setActiveTab("wishlist")} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium no-underline cursor-pointer border-none bg-transparent text-left">
                <span className="flex items-center gap-2.5"><Heart size={17} className="text-[#8B1A1A]" />{t.statsWishlist}</span>
                <span className="text-xs font-bold text-gray-400">{stats.wishlist}</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {saveSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-2xl flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                <span className="text-sm font-semibold">{t.savedSuccess}</span>
              </div>
            )}

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: t.statsOrders, value: stats.orders, icon: Package, color: "text-[#8B1A1A]" },
                    { label: t.statsWishlist, value: stats.wishlist, icon: Heart, color: "text-red-500" },
                    { label: t.statsBuilds, value: 0, icon: Wrench, color: "text-blue-600" },
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">{s.label}</span>
                        <s.icon size={20} className={s.color} />
                      </div>
                      <span className="text-2xl font-black text-[#1a1a1a] mt-3 block">{s.value}</span>
                    </div>
                  ))}
                  <div className="bg-gradient-to-br from-[#8B1A1A] to-[#a62222] p-5 rounded-2xl text-white shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/80">{t.statsPoints}</span>
                      <Award size={20} className="text-amber-300" />
                    </div>
                    <span className="text-2xl font-black text-amber-300 mt-3 block">{stats.points} pts</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 text-[#8B1A1A]"><Gift size={24} /></div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1a1a1a]">{t.welcomeCardTitle}</h2>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{t.welcomeCardDesc}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings */}
            {activeTab === "settings" && (
              <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a]">{t.settings}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{t.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">{t.formName}</label>
                    <div className="relative">
                      <input type="text" value={profile.display_name || ""} onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all" />
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">{t.formEmail}</label>
                    <div className="relative">
                      <input type="email" value={user?.email || profile.email || ""} disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-500 cursor-not-allowed" />
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">{t.formPhone}</label>
                    <div className="relative">
                      <input type="text" value={profile.phone || ""} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all" />
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">{t.formCity}</label>
                    <div className="relative">
                      <input type="text" value={profile.city || ""} onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all" />
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-2">{t.formAddress}</label>
                    <input type="text" value={profile.address || ""} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all" />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button type="submit" className="bg-[#8B1A1A] hover:bg-[#a62222] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer border-none">
                    <Save size={16} />{t.saveBtn}
                  </button>
                </div>
              </form>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                  <div className="border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-bold text-[#1a1a1a]">{t.security}</h2>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2"><Key size={16} className="text-[#8B1A1A]" />{t.secPassword}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Keep your S Tech account secure.</p>
                    </div>
                    <button type="button" onClick={() => alert("Password reset email sent.")} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold cursor-pointer border border-gray-200">Update</button>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2"><Smartphone size={16} className="text-blue-600" />{t.sec2FA}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{t.sec2FADesc}</p>
                    </div>
                    <Toggle value={profile.two_fa_enabled} onChange={handleToggle2FA} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2"><History size={16} className="text-[#8B1A1A]" />{t.recentActivity}</h3>
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((n) => (
                      <div key={n.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <Shield size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-[#1a1a1a]">{n.title}</p>
                          <span className="text-[11px] text-gray-400">{formatTimeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No recent activity</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Notification Preferences */}
            {activeTab === "notifications" && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a]">{t.notifPrefs}</h2>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-sm font-bold text-[#1a1a1a]">{t.prefOrderTitle}</h3><p className="text-xs text-gray-500 mt-0.5">{t.prefOrderDesc}</p></div>
                    <Toggle value={profile.notif_orders} onChange={() => setProfile((p) => ({ ...p, notif_orders: !p.notif_orders }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-sm font-bold text-[#1a1a1a]">{t.prefPromoTitle}</h3><p className="text-xs text-gray-500 mt-0.5">{t.prefPromoDesc}</p></div>
                    <Toggle value={profile.notif_promos} onChange={() => setProfile((p) => ({ ...p, notif_promos: !p.notif_promos }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-sm font-bold text-[#1a1a1a]">{t.prefBuildTitle}</h3><p className="text-xs text-gray-500 mt-0.5">{t.prefBuildDesc}</p></div>
                    <Toggle value={profile.notif_builds} onChange={() => setProfile((p) => ({ ...p, notif_builds: !p.notif_builds }))} />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button type="button" onClick={handleSaveNotifPrefs} className="bg-[#8B1A1A] hover:bg-[#a62222] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer border-none">
                    <Save size={16} />{t.saveBtn}
                  </button>
                </div>
              </div>
            )}

            {/* Orders */}
            {activeTab === "orders" && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a]">{t.statsOrders}</h2>
                </div>
                {ordersLoading ? (
                  <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" /></div>
                ) : orders.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">No orders yet. <Link href="/category/all" className="text-[#8B1A1A] font-semibold no-underline">Start shopping!</Link></div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order: any) => (
                      <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                              <Package size={20} className="text-[#8B1A1A]" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-[#1a1a1a] group-hover:text-[#8B1A1A] transition-colors">Order #{order.id}</span>
                              <p className="text-[11px] text-gray-400">{formatTime(order.created_at)}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                            order.status === "completed" ? "bg-green-100 text-green-700 border border-green-200" :
                            order.status === "processing" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                            order.status === "cancelled" ? "bg-red-100 text-red-700 border border-red-200" :
                            "bg-amber-100 text-amber-700 border border-amber-200"
                          }`}>{order.status.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="text-gray-500 font-medium">{order.items?.length || 0} items</span>
                          <span className="font-black text-[#1a1a1a] text-base">${Number(order.total_amount).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Wishlist */}
            {activeTab === "wishlist" && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
                    <Heart size={20} className="text-red-500" />
                    {t.statsWishlist}
                  </h2>
                </div>
                <div className="py-2">
                  <p className="text-sm text-gray-500 mb-4">View your wishlist by clicking the button below to go to your dedicated Wishlist page, or browse your saved items here.</p>
                  <Link href="/wishlist" className="inline-flex items-center justify-center gap-2 bg-[#8B1A1A] hover:bg-[#a62222] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all no-underline">
                    <Heart size={16} /> Open Full Wishlist
                  </Link>
                </div>
              </div>
            )}

            {/* Builds */}
            {activeTab === "builds" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
                    <Wrench size={20} className="text-blue-600" />
                    My Custom PC Builds
                  </h2>
                </div>
                <div className="py-10 text-center text-gray-400 text-sm">
                  <p className="mb-4">You don't have any saved PC builds yet.</p>
                  <Link href="/build-pc" className="inline-flex items-center justify-center gap-2 bg-[#1a4fa0] hover:bg-[#153e7d] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all no-underline">
                    <Wrench size={16} /> Start a New Build
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Repairs */}
            {activeTab === "repairs" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
                    <Shield size={20} className="text-amber-500" />
                    Tech Support & Repairs
                  </h2>
                </div>
                <div className="py-10 text-center text-gray-400 text-sm">
                  <p className="mb-4">No active repair tickets. Need help with your devices?</p>
                  <Link href="/contact" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all no-underline">
                    <Phone size={16} /> Contact Support
                  </Link>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
