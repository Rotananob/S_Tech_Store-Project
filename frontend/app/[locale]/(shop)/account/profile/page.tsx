"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useRouter, usePathname } from "@/i18n/routing";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  User, Shield, Bell, Package, Heart, Wrench, Award,
  CheckCircle2, Key, Smartphone, History, MapPin, Mail, Phone,
  Save, LogOut, ChevronRight, Gift, Sparkles, Eye, Clock, X, Settings, Globe, Moon, Sun, Monitor, Type, Camera, BadgeCheck, Store, Info
} from "lucide-react";
import { useLangStore } from "@/store/langStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { translations } from "@/lib/translations";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

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
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const [activeModal, setActiveModal] = useState<"none" | "profile" | "security" | "orders">("none");

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
  const { notifications, fetchNotifications } = useNotificationStore();
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

  
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarPreview(ev.target?.result as string);
        // Normally we'd upload this to Firebase/Cloudinary here
      };
      reader.readAsDataURL(file);
    }
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
    if (!dateStr) return "";
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return tNotif.timeJustNow;
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  if (!mounted) return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button type="button" onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border-none ${value ? "bg-[#8B1A1A]" : "bg-gray-300"}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );

  const BottomSheet = ({ isOpen, onClose, title, children }: any) => (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{opacity: 0}} 
            animate={{opacity: 1}} 
            exit={{opacity: 0}} 
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{y: "100%"}} 
            animate={{y: 0}} 
            exit={{y: "100%"}} 
            transition={{type: "spring", damping: 25, stiffness: 250}}
            className="fixed bottom-0 left-0 right-0 max-h-[90vh] min-h-[50vh] bg-white rounded-t-[1.5rem] z-50 overflow-y-auto pb-safe shadow-2xl flex flex-col"
          >
            <div className="sticky top-0 bg-white/90 backdrop-blur-md px-5 py-4 border-b border-gray-100 flex items-center justify-between z-10">
              <h2 className="text-base font-bold text-[#1a1a1a]">{title}</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border-none cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex-1 mb-8">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-24 md:max-w-md md:mx-auto md:border-x md:border-gray-200 md:shadow-2xl relative">
      {/* Profile Card - VIP Design */}
      <div className="bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] pt-12 pb-20 px-6 text-white relative rounded-b-[2rem] shadow-xl overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-red-500/20 to-pink-500/10 rounded-full blur-xl -ml-8 -mb-8"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-300 p-0.5 shadow-lg">
              <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden border-2 border-[#1a1a1a]">
                {avatarPreview || user?.photoURL ? (
                  <img src={avatarPreview || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-yellow-400 font-extrabold text-3xl">{(profile.display_name || user?.displayName || "U")[0].toUpperCase()}</span>
                )}
              </div>
            </div>
            {/* Upload Button */}
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-800 shadow-md cursor-pointer border border-gray-100 hover:bg-gray-50 transition-colors">
              <Camera size={14} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[19px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                {profile.display_name || user?.displayName || "S Tech Customer"}
              </h1>
              <BadgeCheck size={18} className="text-blue-400 fill-blue-400/20" />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white flex items-center gap-1 shadow-sm">
                <Award size={10} /> VIP MEMBER
              </span>
              <span className="text-white/60 text-[10px] flex items-center gap-1">
                <Clock size={10} /> {t.memberSince}: {profile.created_at ? formatTime(profile.created_at) : "2025"}
              </span>
            </div>
            
            <p className="text-white/70 text-[11px] flex items-center gap-1.5 font-medium">
              <Mail size={12} className="text-white/50" /> {user?.email || profile.email}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 -mt-10 relative z-20">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between divide-x divide-gray-100">
          <div className="flex-1 flex flex-col items-center cursor-pointer" onClick={() => { loadOrders(); setActiveModal("orders"); }}>
            <span className="text-lg font-black text-[#1a1a1a]">{stats.orders}</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase mt-1">{t.statsOrders}</span>
          </div>
          <Link href="/wishlist" className="flex-1 flex flex-col items-center cursor-pointer no-underline">
            <span className="text-lg font-black text-[#1a1a1a]">{stats.wishlist}</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase mt-1">{t.statsWishlist}</span>
          </Link>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-lg font-black text-[#8B1A1A]">{stats.points}</span>
            <span className="text-[10px] text-[#8B1A1A] font-medium uppercase mt-1">{t.statsPoints}</span>
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="px-4 mt-6">
        <div className="bg-[#8B1A1A]/5 border border-[#8B1A1A]/10 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center flex-shrink-0 text-[#8B1A1A]">
            <Gift size={16} />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#8B1A1A]">{t.welcomeCardTitle}</h3>
            <p className="text-[11px] text-[#8B1A1A]/80 mt-0.5 leading-snug">{t.welcomeCardDesc}</p>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-[#1a1a1a] text-sm">{t.statsOrders}</h2>
            <button onClick={() => { loadOrders(); setActiveModal("orders"); }} className="text-[11px] font-semibold text-gray-500 flex items-center gap-0.5 cursor-pointer border-none bg-transparent">
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex justify-between px-2">
            <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => { loadOrders(); setActiveModal("orders"); }}>
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                <Clock size={20} className="text-orange-500" />
              </div>
              <span className="text-[11px] font-medium text-gray-600">Processing</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => { loadOrders(); setActiveModal("orders"); }}>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Package size={20} className="text-blue-500" />
              </div>
              <span className="text-[11px] font-medium text-gray-600">Shipped</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => { loadOrders(); setActiveModal("orders"); }}>
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <X size={20} className="text-red-500" />
              </div>
              <span className="text-[11px] font-medium text-gray-600">Cancelled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-[#1a1a1a] text-sm mb-5">{t.overview}</h2>
          <div className="grid grid-cols-3 gap-y-6 gap-x-4">
            <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setActiveModal("profile")}>
              <div className="w-8 h-8 flex items-center justify-center"><User size={24} className="text-blue-600" /></div>
              <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">Update<br/>Profile</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setActiveModal("security")}>
              <div className="w-8 h-8 flex items-center justify-center"><Shield size={24} className="text-green-600" /></div>
              <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">{t.security}</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setActiveModal("profile")}>
              <div className="w-8 h-8 flex items-center justify-center"><MapPin size={24} className="text-orange-500" /></div>
              <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">Addresses</span>
            </div>
            <Link href="/wishlist" className="flex flex-col items-center gap-2 cursor-pointer no-underline">
              <div className="w-8 h-8 flex items-center justify-center"><Heart size={24} className="text-red-500" /></div>
              <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">{t.statsWishlist}</span>
            </Link>
            <Link href="/build-pc" className="flex flex-col items-center gap-2 cursor-pointer no-underline">
              <div className="w-8 h-8 flex items-center justify-center"><Wrench size={24} className="text-purple-600" /></div>
              <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">{t.statsBuilds}</span>
            </Link>
            <Link href="/contact" className="flex flex-col items-center gap-2 cursor-pointer no-underline">
              <div className="w-8 h-8 flex items-center justify-center"><Phone size={24} className="text-teal-500" /></div>
              <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">Tech Support</span>
            </Link>
          </div>
        </div>
      </div>

      {/* App Settings Section */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-[#1a1a1a] text-sm mb-4">{t.notifPrefs}</h2>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Package size={18} className="text-gray-500 flex-shrink-0" />
              <div>
                <span className="text-[13px] font-medium text-gray-700 block">{t.prefOrderTitle}</span>
                <span className="text-[10px] text-gray-400 block">{t.prefOrderDesc}</span>
              </div>
            </div>
            <Toggle value={profile.notif_orders} onChange={() => {
              setProfile(p => ({...p, notif_orders: !p.notif_orders}));
              setTimeout(handleSaveNotifPrefs, 100);
            }} />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Gift size={18} className="text-gray-500 flex-shrink-0" />
              <div>
                <span className="text-[13px] font-medium text-gray-700 block">{t.prefPromoTitle}</span>
                <span className="text-[10px] text-gray-400 block">{t.prefPromoDesc}</span>
              </div>
            </div>
            <Toggle value={profile.notif_promos} onChange={() => {
              setProfile(p => ({...p, notif_promos: !p.notif_promos}));
              setTimeout(handleSaveNotifPrefs, 100);
            }} />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Wrench size={18} className="text-gray-500 flex-shrink-0" />
              <div>
                <span className="text-[13px] font-medium text-gray-700 block">{t.prefBuildTitle}</span>
                <span className="text-[10px] text-gray-400 block">{t.prefBuildDesc}</span>
              </div>
            </div>
            <Toggle value={profile.notif_builds} onChange={() => {
              setProfile(p => ({...p, notif_builds: !p.notif_builds}));
              setTimeout(handleSaveNotifPrefs, 100);
            }} />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-gray-500" />
              <span className="text-[13px] font-medium text-gray-700">Language</span>
            </div>
            <button 
              onClick={() => {
                const next = lang === 'EN' ? 'km' : 'en';
                useLangStore.getState().setLang(next === 'en' ? 'EN' : 'KM');
                router.replace(pathname, { locale: next });
              }}
              className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 border-none cursor-pointer"
            >
              {lang === 'EN' ? 'English' : 'Khmer'}
            </button>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Sun size={18} className="text-gray-500" />
              <span className="text-[13px] font-medium text-gray-700">Theme</span>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-md border-none cursor-pointer ${theme === 'light' ? 'bg-white shadow-sm text-[#8B1A1A]' : 'text-gray-500 bg-transparent'}`}
              >
                <Sun size={14} />
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-md border-none cursor-pointer ${theme === 'dark' ? 'bg-white shadow-sm text-black' : 'text-gray-500 bg-transparent'}`}
              >
                <Moon size={14} />
              </button>
              <button 
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-md border-none cursor-pointer ${theme === 'system' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 bg-transparent'}`}
              >
                <Monitor size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-gray-500" />
              <span className="text-[13px] font-medium text-gray-700">Version</span>
            </div>
            <span className="text-[11px] font-medium text-gray-400">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="px-4 mt-6 mb-8">
        <button onClick={() => signOut(auth)} className="w-full py-3.5 rounded-xl border border-red-200 text-red-600 font-bold text-sm bg-red-50 hover:bg-red-100 flex items-center justify-center gap-2 cursor-pointer transition-colors">
          <LogOut size={18} /> {tNav.signOut}
        </button>
      </div>

      {/* Modals */}
      <BottomSheet isOpen={activeModal === 'profile'} onClose={() => setActiveModal('none')} title={t.settings}>
        <p className="text-[11px] text-gray-500 mb-4">{t.subtitle}</p>
        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-3 mb-4">
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
            <span className="text-xs font-semibold">{t.savedSuccess}</span>
          </div>
        )}
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1.5">{t.formName}</label>
            <div className="relative">
              <input type="text" value={profile.display_name || ""} onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all" />
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1.5">{t.formEmail}</label>
            <div className="relative">
              <input type="email" value={user?.email || profile.email || ""} disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1.5">{t.formPhone}</label>
            <div className="relative">
              <input type="text" value={profile.phone || ""} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all" />
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1.5">{t.formCity}</label>
            <div className="relative">
              <input type="text" value={profile.city || ""} onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all" />
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1.5">{t.formAddress}</label>
            <input type="text" value={profile.address || ""} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all" />
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full bg-[#8B1A1A] hover:bg-[#a62222] text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer border-none transition-colors">
              <Save size={16} />{t.saveBtn}
            </button>
          </div>
        </form>
      </BottomSheet>

      <BottomSheet isOpen={activeModal === 'security'} onClose={() => setActiveModal('none')} title={t.security}>
        <div className="space-y-6">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <h3 className="text-[13px] font-bold text-[#1a1a1a] flex items-center gap-2"><Key size={16} className="text-[#8B1A1A]" />{t.secPassword}</h3>
              <p className="text-[11px] text-gray-500 mt-1">Keep your S Tech account secure.</p>
            </div>
            <button type="button" onClick={() => alert("Password reset email sent.")} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-[11px] font-semibold cursor-pointer border border-gray-200 transition-colors">Update</button>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <h3 className="text-[13px] font-bold text-[#1a1a1a] flex items-center gap-2"><Smartphone size={16} className="text-blue-600" />{t.sec2FA}</h3>
              <p className="text-[11px] text-gray-500 mt-1">{t.sec2FADesc}</p>
            </div>
            <Toggle value={profile.two_fa_enabled} onChange={handleToggle2FA} />
          </div>
          
          <div className="pt-2">
            <h3 className="text-[13px] font-bold text-[#1a1a1a] flex items-center gap-2 mb-3"><History size={16} className="text-[#8B1A1A]" />{t.recentActivity}</h3>
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Shield size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-[#1a1a1a] leading-tight">{n.title}</p>
                    <span className="text-[10px] text-gray-400">{formatTimeAgo(n.created_at)}</span>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No recent activity</p>}
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={activeModal === 'orders'} onClose={() => setActiveModal('none')} title={t.statsOrders}>
        {ordersLoading ? (
          <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No orders yet.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <div key={order.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-100">
                      <Package size={14} className="text-[#8B1A1A]" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-[#1a1a1a]">Order #{order.id}</span>
                      <p className="text-[10px] text-gray-400">{formatTime(order.created_at)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    order.status === "completed" ? "bg-green-100 text-green-700" :
                    order.status === "processing" ? "bg-blue-100 text-blue-700" :
                    order.status === "cancelled" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{order.status.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-gray-100">
                  <span className="text-gray-500 font-medium">{order.items?.length || 0} items</span>
                  <span className="font-black text-[#1a1a1a] text-sm">${Number(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
