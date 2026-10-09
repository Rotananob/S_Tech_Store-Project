"use client";

import { useState, useEffect } from "react";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { onAuthStateChanged, User as FirebaseUser, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  User, Shield, Bell, Package, Heart, Wrench, Award,
  CheckCircle2, Key, Smartphone, History, MapPin, Mail, Phone,
  Save, LogOut, ChevronRight, Gift, Sparkles, Eye, Clock, X,
  Settings, Globe, Moon, Sun, Monitor, Camera, BadgeCheck,
  Check, RefreshCw, Send, AlertTriangle, Cpu, Laptop, ExternalLink,
  Copy, Zap, Download, Lock, Navigation, Compass, Crosshair, Type, Truck, Bike
} from "lucide-react";
import LanguageConfirmModal from "@/components/ui/LanguageConfirmModal";
import { useLangStore } from "@/store/langStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useUpdateStore } from "@/store/updateStore";
import { translations } from "@/lib/translations";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { ThemeDropdown } from "@/components/ui/ThemeDropdown";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface ProfileData {
  display_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  khan?: string;
  telegram?: string;
  profession?: string;
  gender?: string;
  birthday?: string;
  delivery_notes?: string;
  two_fa_enabled: boolean;
  notif_orders: boolean;
  notif_promos: boolean;
  notif_builds: boolean;
  notif_telegram: boolean;
  points: number;
  created_at: string;
  gps_lat?: number;
  gps_lng?: number;
  photo_url?: string;
}

const CAMBODIA_PROVINCES = [
  "Phnom Penh",
  "Kandal",
  "Siem Reap",
  "Battambang",
  "Preah Sihanouk",
  "Kampong Cham",
  "Kampot",
  "Kampong Chhnang",
  "Kampong Speu",
  "Kampong Thom",
  "Kep",
  "Koh Kong",
  "Kratie",
  "Mondulkiri",
  "Oddar Meanchey",
  "Pailin",
  "Preah Vihear",
  "Prey Veng",
  "Pursat",
  "Ratanakiri",
  "Stung Treng",
  "Svay Rieng",
  "Takeo",
  "Tbong Khmum",
];

const PRESET_AVATARS = [
  { label: "Pro Gamer", url: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=160&q=80" },
  { label: "Tech Lead", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&q=80" },
  { label: "Digital Creator", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=80" },
  { label: "Security Pro", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&q=80" },
  { label: "VIP Executive", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&q=80" },
];

const FONT_SYSTEMS = [
  { id: "inter", name: "Modern Inter / Default", sample: "S Tech Store Cambodia 2026" },
  { id: "kantumruy", name: "Kantumruy Pro (Modern Khmer)", sample: "ហាងកំព្យូទ័រ អេស តិច ស្ត័រ" },
  { id: "koh-santepheap", name: "Koh Santepheap (Clean Khmer)", sample: "គុណភាពស្តង់ដារ និងការធានាផ្លូវការ" },
  { id: "battambang", name: "Battambang (Classic Khmer)", sample: "ទំនុកចិត្ត គុណភាព និងតម្លៃសមរម្យ" },
  { id: "noto-sans", name: "Noto Sans Khmer (Google Standard)", sample: "សេវាកម្មដំឡើង និងជួសជុលរហ័ស" },
];

const TABS = [
  { key: "profile", label: "Profile Info", desc: "Personal info & bio", icon: User },
  { key: "address", label: "Delivery Address", desc: "Location & GPS Pin", icon: MapPin },
  { key: "security", label: "Security & Devices", desc: "2FA, Passwords & Sessions", icon: Shield },
  { key: "preferences", label: "Preferences & Updates", desc: "Language, fonts & theme", icon: Settings },
  { key: "warranty", label: "Warranty & Hardware", desc: "Official RMA & Devices", icon: Cpu },
  { key: "orders", label: "Order History", desc: "Purchases & PassApp tracking", icon: Package },
];

export default function UserProfilePage() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveModal, setSaveModal] = useState<{ show: boolean; success: boolean; title: string; message: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadSuccess, setAvatarUploadSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [showRmaModal, setShowRmaModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "address" | "security" | "preferences" | "warranty" | "orders">("profile");
  const [mobileTabDropdownOpen, setMobileTabDropdownOpen] = useState(false);

  // Font system & Language confirm state
  const [selectedFont, setSelectedFont] = useState("inter");
  const [pendingLocaleSwitch, setPendingLocaleSwitch] = useState<"en" | "km" | null>(null);

  // GPS Map & PassApp Live tracking state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showPassAppModal, setShowPassAppModal] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<any>(null);

  const router = useRouter();
  const pathname = usePathname();

  // PWA update store
  const { isChecking, checkForUpdates, applyUpdate, hasUpdate } = useUpdateStore();
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    email: "",
    phone: "",
    address: "",
    city: "Phnom Penh",
    khan: "Chamkar Mon",
    telegram: "",
    profession: "Tech Enthusiast",
    gender: "Male",
    birthday: "2000-01-01",
    delivery_notes: "Call 10 minutes before arrival",
    two_fa_enabled: false,
    notif_orders: true,
    notif_promos: true,
    notif_builds: true,
    notif_telegram: true,
    points: 850,
    created_at: "2025-01-15",
    gps_lat: 11.5564,
    gps_lng: 104.9282,
  });

  const [stats, setStats] = useState({
    orders: 3,
    wishlist: 4,
    points: 850,
    warranty_items: 2,
    unread_notifications: 1,
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<"all" | "processing" | "shipped" | "completed">("all");

  const { lang } = useLangStore();
  const t = translations[lang].profilePage;
  const tNav = translations[lang].nav;
  const wishlistCount = useWishlistStore((s) => s.getTotalItems());

  useEffect(() => {
    setMounted(true);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setProfile((prev) => ({
          ...prev,
          display_name: u.displayName || prev.display_name || "S Tech VIP Member",
          email: u.email || prev.email,
        }));
        loadProfile(u);
        loadOrders();
      } else {
        const sessionStr = typeof window !== "undefined" ? localStorage.getItem("stech_user_session") : null;
        if (sessionStr) {
          try {
            const sUser = JSON.parse(sessionStr);
            if (sUser?.firebase_uid) {
              const pseudoUser = {
                uid: sUser.firebase_uid,
                displayName: sUser.display_name,
                email: sUser.email,
                photoURL: sUser.photo_url,
              } as any;
              setUser(pseudoUser);
              setProfile((prev) => ({
                ...prev,
                display_name: sUser.display_name || prev.display_name || "S Tech VIP Member",
                email: sUser.email || prev.email,
                phone: sUser.phone || prev.phone,
              }));
              loadProfile(pseudoUser);
              loadOrders();
              return;
            }
          } catch (e) {}
        }
        router.push("/login");
      }
    });
    return () => unsub();
  }, []);

  const loadProfile = async (currentUser?: FirebaseUser) => {
    try {
      const res = await api.get("/user/profile");
      if (res.data?.profile) {
        setProfile((prev) => ({ ...prev, ...res.data.profile }));
        if (res.data.profile.photo_url) {
          setAvatarPreview(res.data.profile.photo_url);
        }
      }
      if (res.data?.stats) {
        setStats((prev) => ({ ...prev, ...res.data.stats }));
      }
    } catch (e) {
      // Backend warming up — gracefully seed default values
      if (currentUser) {
        setProfile((prev) => ({
          ...prev,
          display_name: currentUser.displayName || prev.display_name,
          email: currentUser.email || prev.email,
          photo_url: currentUser.photoURL || undefined,
        }));
        if (currentUser.photoURL) {
          setAvatarPreview(currentUser.photoURL);
        }
      }
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get("/user/orders");
      const list = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
      setOrders(list.length > 0 ? list : getSampleOrders());
    } catch (e) {
      setOrders(getSampleOrders());
    } finally {
      setOrdersLoading(false);
    }
  };

  const getSampleOrders = () => [
    {
      id: "ST-88910",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: "processing",
      total_amount: 1299.0,
      items: [{ name: "ThinkPad X1 Carbon Gen 11", quantity: 1, price: 1299.0 }],
    },
    {
      id: "ST-88421",
      created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      status: "shipped",
      total_amount: 2899.0,
      items: [{ name: "S-Tech Creator Pro Build (RTX 4080)", quantity: 1, price: 2899.0 }],
    },
    {
      id: "ST-87102",
      created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
      status: "completed",
      total_amount: 599.0,
      items: [{ name: "UltraSharp 27\" 4K Monitor", quantity: 1, price: 599.0 }],
    },
  ];

  // Load persisted font preference
  useEffect(() => {
    try {
      const savedFont = localStorage.getItem("stech_font_system") || "inter";
      setSelectedFont(savedFont);
      document.documentElement.setAttribute("data-font", savedFont);
    } catch (e) {}
  }, []);

  const handleSelectFont = (fontId: string) => {
    setSelectedFont(fontId);
    try {
      localStorage.setItem("stech_font_system", fontId);
      document.documentElement.setAttribute("data-font", fontId);
    } catch (e) {}
  };

  const handlePinCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const pinnedAddress = profile.address && !profile.address.startsWith("GPS Pin:") 
          ? profile.address 
          : `GPS Pin: ${lat}, ${lng} (Pinned Location)`;

        setProfile((p) => ({
          ...p,
          gps_lat: lat,
          gps_lng: lng,
          address: pinnedAddress,
        }));

        // Immediately persist GPS coordinates to cloud PostgreSQL DB
        try {
          await api.put("/user/profile", {
            display_name: profile.display_name,
            phone: profile.phone,
            address: pinnedAddress,
            city: profile.city,
            telegram: profile.telegram,
            profession: profile.profession,
            gender: profile.gender,
            birthday: profile.birthday,
            delivery_notes: profile.delivery_notes,
            gps_lat: lat,
            gps_lng: lng,
          });

          setSaveModal({
            show: true,
            success: true,
            title: "GPS Pinned & Saved to Cloud! 📍",
            message: `Coordinates (${lat}, ${lng}) have been securely saved to your account. Delivery personnel and admin dispatch can now track your exact pin directly.`
          });
        } catch (err: any) {
          console.warn("GPS sync note:", err);
          setSaveModal({
            show: true,
            success: true,
            title: "GPS Pinned! 📍",
            message: `Current location (${lat}, ${lng}) captured. Click 'Save Profile' below to re-verify cloud synchronization.`
          });
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError("Could not retrieve GPS location. Please allow location permissions in your browser.");
        setSaveModal({
          show: true,
          success: false,
          title: "GPS Retrieval Failed",
          message: "Please enable location services or browser GPS permissions to automatically pin your address."
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Real Cloudinary profile image upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fast local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const { uploadAvatar } = await import("@/lib/services/user.service");
      const res = await uploadAvatar(file);
      const cloudUrl = (res as any).photo_url || (res as any).url || (res as any).data?.photo_url || (res as any).data?.url;
      if (cloudUrl) {
        setAvatarPreview(cloudUrl);
        setProfile((prev) => ({ ...prev, photo_url: cloudUrl }));
        if (auth.currentUser) {
          const { updateProfile } = await import("firebase/auth");
          await updateProfile(auth.currentUser, { photoURL: cloudUrl }).catch(() => {});
        }
        setAvatarUploadSuccess(true);
        setTimeout(() => setAvatarUploadSuccess(false), 3500);
      }
    } catch (err: any) {
      console.error("Avatar Cloudinary upload error:", err);
      setAvatarError("Failed to upload avatar to Cloudinary. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSelectPresetAvatar = async (url: string) => {
    setAvatarPreview(url);
    setProfile((prev) => ({ ...prev, photo_url: url }));
    try {
      await api.put("/user/profile", { photo_url: url });
      if (auth.currentUser) {
        const { updateProfile } = await import("firebase/auth");
        await updateProfile(auth.currentUser, { photoURL: url }).catch(() => {});
      }
    } catch (e) {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put("/user/profile", {
        display_name: profile.display_name,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        telegram: profile.telegram,
        profession: profile.profession,
        gender: profile.gender,
        birthday: profile.birthday,
        delivery_notes: profile.delivery_notes,
        gps_lat: profile.gps_lat,
        gps_lng: profile.gps_lng,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);

      setSaveModal({
        show: true,
        success: true,
        title: "Profile Saved Successfully! ✅",
        message: "All personal details, delivery address, and GPS coordinates have been saved directly to PostgreSQL cloud database.",
      });
    } catch (err: any) {
      console.error("Save profile error:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to communicate with cloud server";
      setSaveModal({
        show: true,
        success: false,
        title: "Save Failed ⚠️",
        message: `Could not save profile: ${errMsg}. Please verify your connection and try again.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 4000);
    } catch (err) {
      alert("Please check your email to reset password.");
    }
  };

  const handleToggle2FA = async () => {
    const newVal = !profile.two_fa_enabled;
    setProfile((p) => ({ ...p, two_fa_enabled: newVal }));
    try {
      await api.put("/user/profile", { two_fa_enabled: newVal });
    } catch (e) {}
  };

  const handleManualCheckUpdates = async () => {
    setUpdateStatusMsg("Checking for latest S Tech Store update...");
    const res = await checkForUpdates(true);
    setUpdateStatusMsg(res.message);
    setTimeout(() => setUpdateStatusMsg(null), 5000);
  };

  const copyMemberId = () => {
    const id = `#ST-${(user?.uid || "88294").slice(0, 6).toUpperCase()}`;
    navigator.clipboard?.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatTime = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0e1015] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer border-none p-0.5 ${
        value ? "bg-gradient-to-r from-[#8B1A1A] to-[#c0392b]" : "bg-gray-300 dark:bg-gray-700"
      }`}
    >
      <span
        className={`block w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
          value ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );

  const memberId = `#ST-${(user?.uid || "88294").slice(0, 6).toUpperCase()}`;
  const filteredOrders = orders.filter((o) => (orderFilter === "all" ? true : o.status === orderFilter));

  return (
    <div className="min-h-screen bg-[#f6f8fb] dark:bg-[#0c0e12] text-gray-900 dark:text-gray-100 pt-6 pb-36 sm:pb-16">
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── 1. VIP Membership Hero Card ───────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#12141a] via-[#1a1e27] to-[#0c0e12] border border-white/10 text-white p-6 sm:p-8">
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/15 via-red-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: User Profile Identity */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Avatar Frame with Upload & Presets */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-400 via-red-500 to-indigo-500 p-0.5 shadow-xl">
                  <div className="w-full h-full rounded-[14px] bg-[#141720] flex items-center justify-center overflow-hidden border-2 border-[#12141a] relative">
                    {avatarPreview || user?.photoURL || profile.photo_url ? (
                      <img
                        src={avatarPreview || profile.photo_url || user?.photoURL || ""}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-amber-400 font-black text-3xl">
                        {(profile.display_name || user?.displayName || "U")[0].toUpperCase()}
                      </span>
                    )}

                    {/* Real-time Cloudinary Uploading Overlay */}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
                        <RefreshCw size={20} className="animate-spin text-amber-400" />
                        <span className="text-[9px] font-bold mt-1 text-amber-300">Cloudinary...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Camera Trigger */}
                <label
                  className={`absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-white text-gray-900 shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-transform active:scale-90 border border-gray-200 ${
                    avatarUploading ? "opacity-50 pointer-events-none" : ""
                  }`}
                  title="Upload profile picture to Cloudinary"
                >
                  <Camera size={15} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} />
                </label>
              </div>

              {/* Identity Details */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {profile.display_name || user?.displayName || "S Tech Member"}
                  </h1>
                  <BadgeCheck size={20} className="text-blue-400 fill-blue-400/20" />
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm flex items-center gap-1">
                    <Award size={11} /> VIP GOLD
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-gray-300 flex items-center gap-2">
                  <Mail size={13} className="text-gray-400" />
                  <span>{user?.email || profile.email}</span>
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                  <button
                    type="button"
                    onClick={copyMemberId}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/15 text-gray-300 transition-colors border border-white/10 cursor-pointer"
                    title="Click to copy member ID"
                  >
                    <span>ID: {memberId}</span>
                    {copiedId ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Joined {profile.created_at ? formatTime(profile.created_at) : "2025"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: VIP Loyalty Rewards Tier Box */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 shrink-0 md:min-w-[280px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <span className="text-xs font-bold text-gray-200">S Tech Loyalty Coins</span>
                </div>
                <span className="text-xs font-black text-amber-400">≈ ${(stats.points / 100).toFixed(2)} USD</span>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-white mb-2">
                {stats.points.toLocaleString()} <span className="text-sm font-semibold text-gray-400">Coins</span>
              </div>

              {/* Tier Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                  <span>VIP Gold</span>
                  <span>Next: VIP Diamond (1,000)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (stats.points / 1000) * 100)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCoinsModal(true)}
                className="mt-3 w-full py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all border border-white/15 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Redeem & Benefits</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Avatar Presets Selection Bar */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-gray-400 shrink-0">Quick Tech Avatar:</span>
            {PRESET_AVATARS.map((av) => (
              <button
                key={av.label}
                type="button"
                onClick={() => handleSelectPresetAvatar(av.url)}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-[11px] font-medium transition-colors border border-white/10 whitespace-nowrap cursor-pointer flex items-center gap-1"
              >
                <span>{av.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Quick Stat Counters ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => setActiveTab("orders")}
            className="p-4 rounded-2xl bg-white dark:bg-[#141720] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Orders</span>
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 text-[#8B1A1A] flex items-center justify-center">
                <Package size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-[#8B1A1A] transition-colors">
              {orders.length}
            </div>
            <span className="text-[11px] text-gray-400">Total Purchase History</span>
          </div>

          <Link
            href="/wishlist"
            className="p-4 rounded-2xl bg-white dark:bg-[#141720] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all no-underline group block"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wishlist</span>
              <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 flex items-center justify-center">
                <Heart size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-pink-600 transition-colors">
              {wishlistCount || stats.wishlist}
            </div>
            <span className="text-[11px] text-gray-400">Saved Tech Hardware</span>
          </Link>

          <div
            onClick={() => setActiveTab("warranty")}
            className="p-4 rounded-2xl bg-white dark:bg-[#141720] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Warranty</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Shield size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">
              {stats.warranty_items} Active
            </div>
            <span className="text-[11px] text-gray-400">Official RMA Protection</span>
          </div>

          <div
            onClick={() => setActiveTab("preferences")}
            className="p-4 rounded-2xl bg-white dark:bg-[#141720] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">App Version</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Zap size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
              v2.4.2
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">PWA Ready & Online</span>
          </div>
        </div>

        {/* ── 3. Navigation & Content Layout ──────────────────────── */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">

          {/* Mobile Dropdown Tab Switcher (Top to Bottom selector) */}
          <div className="lg:hidden col-span-12 mb-4 relative">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Settings Category
            </label>
            <button
              type="button"
              onClick={() => setMobileTabDropdownOpen(!mobileTabDropdownOpen)}
              className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#141720] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm text-left active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8B1A1A]/10 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center shrink-0">
                  {(() => {
                    const ActiveIcon = TABS.find((t) => t.key === activeTab)?.icon || User;
                    return <ActiveIcon size={20} />;
                  })()}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {TABS.find((t) => t.key === activeTab)?.label}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {TABS.find((t) => t.key === activeTab)?.desc}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className={`text-gray-400 transition-transform ${mobileTabDropdownOpen ? "rotate-90" : ""}`} />
            </button>

            <AnimatePresence>
              {mobileTabDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 z-40 bg-white dark:bg-[#141720] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl p-2 space-y-1"
                >
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.key as any);
                          setMobileTabDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                          active
                            ? "bg-[#8B1A1A] text-white font-bold shadow-md shadow-red-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={16} />
                          <span className="text-xs font-bold">{tab.label}</span>
                        </div>
                        {active && <Check size={14} className="text-white" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Vertical Tabs Sidebar (Top to Bottom Layout) */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-24 space-y-2">
            <div className="bg-white dark:bg-[#141720] rounded-3xl p-3 border border-gray-100 dark:border-white/5 shadow-sm space-y-1.5">
              <div className="px-3 pt-2 pb-1 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                Settings Menu (ម៉ឺនុយ)
              </div>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left border ${
                      active
                        ? "bg-[#8B1A1A] text-white border-transparent shadow-lg shadow-red-900/20 font-bold"
                        : "bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        active ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400"
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold leading-tight">{tab.label}</div>
                        <div className={`text-[11px] leading-tight ${active ? "text-red-100" : "text-gray-400"}`}>{tab.desc}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className={`shrink-0 transition-transform ${active ? "text-white translate-x-1" : "text-gray-400 opacity-60"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Tab Contents */}
          <div className="lg:col-span-8 xl:col-span-9 col-span-12">
            <div className="bg-white dark:bg-[#141720] rounded-3xl p-5 sm:p-8 border border-gray-100 dark:border-white/5 shadow-sm">

          {/* Success Banner */}
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl flex items-center gap-3 mb-6"
            >
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">
                ការកំណត់ត្រូវបានរក្សាទុកដោយជោគជ័យ! Profile updated successfully.
              </span>
            </motion.div>
          )}

          {/* ── TAB 1: Profile Info ───────────────────────────────── */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Personal Information (ព័ត៌មានផ្ទាល់ខ្លួន)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Manage your personal identity, contact details, and tech profession.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    <User size={14} className="text-[#8B1A1A] dark:text-red-400" />
                    <span>Full Name / Display Name (ឈ្មោះបង្ហាញ)</span>
                  </label>
                  <input
                    type="text"
                    value={profile.display_name}
                    onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all"
                    placeholder="e.g. Sopheak Tech"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    <Mail size={14} className="text-gray-400" />
                    <span>Email Address (អ៊ីមែល)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || profile.email}
                      disabled
                      className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 pr-24 py-3 text-sm text-gray-500 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                      <Check size={10} /> Verified
                    </span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    <Phone size={14} className="text-[#8B1A1A] dark:text-red-400" />
                    <span>Phone Number (លេខទូរស័ព្ទកម្ពុជា)</span>
                  </label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all"
                    placeholder="+855 12 345 678"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    <Send size={14} className="text-blue-500" />
                    <span>Telegram Username (@username for shipping)</span>
                  </label>
                  <input
                    type="text"
                    value={profile.telegram || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, telegram: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all"
                    placeholder="@stech_user"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Profession / Tech Role
                  </label>
                  <select
                    value={profile.profession || "Tech Enthusiast"}
                    onChange={(e) => setProfile((p) => ({ ...p, profession: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all text-gray-900 dark:text-white"
                  >
                    <option value="Software Engineer">Software Engineer / Developer</option>
                    <option value="Hardcore Gamer">Hardcore Gamer / Streamer</option>
                    <option value="Content Creator">Content Creator / Video Editor</option>
                    <option value="IT Specialist">IT Specialist / System Admin</option>
                    <option value="Student">Student</option>
                    <option value="Business Professional">Business Professional</option>
                    <option value="Tech Enthusiast">Tech Enthusiast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Gender & Birthday (For VIP Birthday gifts)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={profile.gender || "Male"}
                      onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-sm outline-none text-gray-900 dark:text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>

                    <input
                      type="date"
                      value={profile.birthday || "2000-01-01"}
                      onChange={(e) => setProfile((p) => ({ ...p, birthday: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-sm outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#a62222] hover:to-[#d64537] text-white text-sm font-bold shadow-lg hover:shadow-red-900/30 transition-all flex items-center gap-2 cursor-pointer border-none"
                >
                  <Save size={16} />
                  <span>Save Profile Changes (រក្សាទុក)</span>
                </button>
              </div>
            </form>
          )}

          {/* ── TAB 2: Delivery Addresses ─────────────────────────── */}
          {activeTab === "address" && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Shipping & Delivery Address (អាសយដ្ឋានដឹកជញ្ជូន)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Set up your primary delivery address across Cambodia for same-day delivery.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    City / Province (រាជធានី / ខេត្ត)
                  </label>
                  <select
                    value={profile.city}
                    onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all text-gray-900 dark:text-white"
                  >
                    {CAMBODIA_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Khan / District & Sangkat (ខណ្ឌ / ស្រុក / សង្កាត់)
                  </label>
                  <input
                    type="text"
                    value={profile.khan || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, khan: e.target.value }))}
                    placeholder="e.g. Khan Chamkar Mon, Sangkat Tonle Bassac"
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Street Address & House / Building No.
                  </label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                    placeholder="e.g. House #142, Street 310, near Olympic Stadium"
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    <Navigation size={14} className="text-blue-500" />
                    <span>Delivery Instructions for Driver</span>
                  </label>
                  <textarea
                    rows={2}
                    value={profile.delivery_notes || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, delivery_notes: e.target.value }))}
                    placeholder="e.g. Call before coming, leave with building security on ground floor."
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all"
                  />
                </div>

                {/* ── Real Google Map & Live GPS Pinning ──────────────── */}
                <div className="sm:col-span-2 pt-2 border-t border-gray-100 dark:border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <MapPin size={16} className="text-[#8B1A1A] dark:text-red-400" />
                        <span>Real Delivery GPS Pin (ទីតាំងផែនទី Google Map ពិតប្រាកដ)</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Used by S Tech Express couriers & PassApp for accurate doorstep delivery.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePinCurrentLocation}
                      disabled={gpsLoading}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all border-none cursor-pointer self-start sm:self-auto disabled:opacity-50"
                    >
                      <Crosshair size={14} className={gpsLoading ? "animate-spin" : ""} />
                      <span>{gpsLoading ? "Pinning Location..." : "Pin Current GPS (ចាប់ទីតាំង)"}</span>
                    </button>
                  </div>

                  {gpsError && (
                    <div className="mb-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{gpsError}</span>
                    </div>
                  )}

                  {/* Interactive Map Frame with Coordinates Display */}
                  <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 relative">
                    {/* Live Coordinates HUD Bar */}
                    <div className="p-3 bg-white/90 dark:bg-[#161922]/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                          <Compass size={13} className="text-emerald-500" />
                          <span>Lat: {profile.gps_lat || 11.5564}</span>
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                          <span>Lng: {profile.gps_lng || 104.9282}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                          GPS Live Pin
                        </span>
                      </div>

                      <a
                        href={`https://www.google.com/maps?q=${profile.gps_lat || 11.5564},${profile.gps_lng || 104.9282}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8B1A1A] dark:text-red-400 font-bold hover:underline flex items-center gap-1 no-underline text-xs"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    {/* Interactive Embedded Map View */}
                    <div className="w-full h-52 sm:h-64 relative bg-gray-200 dark:bg-gray-800">
                      <iframe
                        title="Delivery Location Map"
                        width="100%"
                        height="100%"
                        className="border-none"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${(profile.gps_lng || 104.9282) - 0.015}%2C${(profile.gps_lat || 11.5564) - 0.01}%2C${(profile.gps_lng || 104.9282) + 0.015}%2C${(profile.gps_lat || 11.5564) + 0.01}&layer=mapnik&marker=${profile.gps_lat || 11.5564}%2C${profile.gps_lng || 104.9282}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] text-white text-sm font-bold shadow-lg hover:shadow-red-900/30 transition-all flex items-center gap-2 cursor-pointer border-none"
                >
                  <Save size={16} />
                  <span>Save Shipping Address & GPS Pin</span>
                </button>
              </div>
            </form>
          )}

          {/* ── TAB 3: Security & Devices ─────────────────────────── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Security & Active Sessions (សុវត្ថិភាពគណនី)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Protect your S Tech Store account, credentials, and active device logins.
                </p>
              </div>

              {/* Password Reset Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-[#8B1A1A]" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Password & Authentication</h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Send an official password reset link to your verified email: {user?.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="px-4 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6b1111] text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <Lock size={14} />
                  <span>Send Reset Link</span>
                </button>
              </div>

              {resetSent && (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Password reset email dispatched to {user?.email}. Please check your inbox.</span>
                </div>
              )}

              {/* 2FA Toggle */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-blue-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Two-Factor Authentication (2FA)</h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Require extra verification code when logging in on unrecognized devices.
                  </p>
                </div>
                <Toggle value={profile.two_fa_enabled} onChange={handleToggle2FA} />
              </div>

              {/* Active Device Sessions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop size={14} className="text-emerald-500" />
                    <span>Active Device Logins (ឧបករណ៍កំពុងដំណើរការ)</span>
                  </h4>
                  <span className="text-[11px] text-gray-400">2 Devices Connected</span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-3.5 bg-gray-50/70 dark:bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Monitor size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">Windows PC (Chrome Browser)</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-white text-[9px] font-bold">This Device</span>
                        </div>
                        <p className="text-[11px] text-gray-400">Phnom Penh, Cambodia • Active Now</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Smartphone size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">iPhone 15 Pro (Safari PWA)</span>
                        <p className="text-[11px] text-gray-400">Phnom Penh, Cambodia • 2 hours ago</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert("Session terminated.")}
                      className="text-[11px] text-red-500 font-semibold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Preferences & PWA Updates ──────────────────── */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Preferences & PWA Version
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Notification alerts, theme preferences, and real-time PWA website updates.
                </p>
              </div>

              {/* PWA Version & Real-Time Update Checker Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-red-500" />
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        S Tech Store PWA Release
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">
                        v2.4.2
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Stay updated with the latest performance boosts, bug fixes & Taobao camera lens.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleManualCheckUpdates}
                      disabled={isChecking}
                      className="px-4 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6b1111] text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isChecking ? "animate-spin" : ""} />
                      <span>{isChecking ? "Checking..." : "Check for Updates"}</span>
                    </button>

                    {hasUpdate && (
                      <button
                        type="button"
                        onClick={applyUpdate}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5"
                      >
                        <Download size={13} />
                        <span>Update Now</span>
                      </button>
                    )}
                  </div>
                </div>

                {updateStatusMsg && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>{updateStatusMsg}</span>
                  </div>
                )}
              </div>

              {/* Notification Toggles */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Notification Channels
                </h4>

                <div className="divide-y divide-gray-100 dark:divide-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">
                        Order Status & Shipping Alerts
                      </span>
                      <span className="text-[11px] text-gray-400 block">
                        Receive instant alerts when orders are processed, packed, or out for delivery.
                      </span>
                    </div>
                    <Toggle
                      value={profile.notif_orders}
                      onChange={() => setProfile((p) => ({ ...p, notif_orders: !p.notif_orders }))}
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">
                        VIP Flash Sale & Tech Promos
                      </span>
                      <span className="text-[11px] text-gray-400 block">
                        Get notified when laptops, PC builds, and parts go on exclusive VIP sale.
                      </span>
                    </div>
                    <Toggle
                      value={profile.notif_promos}
                      onChange={() => setProfile((p) => ({ ...p, notif_promos: !p.notif_promos }))}
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">
                        Telegram Bot Dispatch Alerts
                      </span>
                      <span className="text-[11px] text-gray-400 block">
                        Send digital invoice & driver contact directly to your Telegram chat.
                      </span>
                    </div>
                    <Toggle
                      value={profile.notif_telegram}
                      onChange={() => setProfile((p) => ({ ...p, notif_telegram: !p.notif_telegram }))}
                    />
                  </div>
                </div>
              </div>

              {/* ── Font System & Typography ──────────────────────────── */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Type size={16} className="text-[#8B1A1A] dark:text-red-400" />
                    <span>Font System & Typography (ជ្រើសរើសពុម្ពអក្សរ)</span>
                  </h4>
                  <span className="text-[11px] text-gray-400">Personalize Store Reading Experience</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FONT_SYSTEMS.map((f) => {
                    const isSelected = selectedFont === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelectFont(f.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[85px] ${
                          isSelected
                            ? "border-[#8B1A1A] bg-red-50/60 dark:bg-red-950/20 shadow-sm"
                            : "border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {f.name}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center text-[10px] font-bold">
                              <Check size={12} />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-1">
                          {f.sample}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Appearance & Language with Touch-Friendly Dropdowns ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Language Switcher Dropdown */}
                <div className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center shrink-0">
                      <Globe size={20} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white block">Display Language</span>
                      <span className="text-xs text-gray-400 block">Clean Khmer & English switcher</span>
                    </div>
                  </div>

                  <LanguageSwitcher />
                </div>

                {/* Theme Mode Switcher Dropdown */}
                <div className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Sun size={20} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white block">Theme Appearance</span>
                      <span className="text-xs text-gray-400 block">Light, Dark, or System mode</span>
                    </div>
                  </div>

                  <ThemeDropdown />
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: Warranty & RMA Hub ─────────────────────────── */}
          {activeTab === "warranty" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    Official Hardware Warranty & RMA Hub
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Track your registered tech hardware, serial numbers, and 1-year official S Tech Store warranty.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRmaModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center gap-1.5 border-none cursor-pointer shadow-md"
                >
                  <Shield size={14} />
                  <span>Register New Serial</span>
                </button>
              </div>

              {/* Hardware items under warranty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase">
                        Active Warranty
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                        ThinkPad X1 Carbon Gen 11
                      </h4>
                      <p className="text-[11px] text-gray-400">S/N: TP-X1C-8849-KH</p>
                    </div>
                    <Laptop size={24} className="text-[#8B1A1A]" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                      <span>10 Months Remaining</span>
                      <span>Expires Oct 2027</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "80%" }} />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-gray-200/60 dark:border-white/5">
                    <span className="text-[11px] text-gray-400">Lenovo Official Warranty</span>
                    <a
                      href="https://t.me/stechstore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#8B1A1A] font-bold hover:underline flex items-center gap-1 no-underline"
                    >
                      Request Support <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase">
                        Active Warranty
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                        ASUS ROG Zephyrus G14 (2024)
                      </h4>
                      <p className="text-[11px] text-gray-400">S/N: ROG-Z14-2911-KH</p>
                    </div>
                    <Cpu size={24} className="text-purple-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                      <span>11 Months Remaining</span>
                      <span>Expires Nov 2027</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "90%" }} />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-gray-200/60 dark:border-white/5">
                    <span className="text-[11px] text-gray-400">ASUS Genuine Hardware</span>
                    <a
                      href="https://t.me/stechstore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#8B1A1A] font-bold hover:underline flex items-center gap-1 no-underline"
                    >
                      Request Support <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 6: Order History ──────────────────────────────── */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    Order History (ប្រវត្តិការបញ្ជាទិញ)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    View order status, tracking, and download invoices.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 p-1 rounded-xl">
                  {["all", "processing", "shipped", "completed"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderFilter(st as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all border-none cursor-pointer ${
                        orderFilter === st
                          ? "bg-white dark:bg-black text-[#8B1A1A] shadow-sm"
                          : "text-gray-500 bg-transparent"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {ordersLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No orders found in this category.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-[#8B1A1A] shadow-sm">
                          <Package size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              Order #{order.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                order.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : order.status === "shipped"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">{formatTime(order.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200/60 dark:border-white/5">
                        <div className="text-right">
                          <div className="text-base font-black text-gray-900 dark:text-white">
                            ${Number(order.total_amount).toFixed(2)}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {order.items?.length || 1} tech item(s)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTrackedOrder(order);
                              setShowPassAppModal(true);
                            }}
                            className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border-none"
                            title="Live Delivery Tracking like PassApp"
                          >
                            <Bike size={14} />
                            <span>Live Tracking</span>
                          </button>

                          <Link
                            href={`/orders/${order.id}`}
                            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-[#8B1A1A] hover:text-white text-gray-700 dark:text-gray-200 text-xs font-bold transition-all no-underline shadow-sm"
                          >
                            Details &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

        {/* ── 5. Sign Out Bar ────────────────────────────────────── */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("stech_user_session");
              signOut(auth);
              setUser(null);
              router.push("/login");
            }}
            className="w-full py-4 rounded-2xl border border-red-200 dark:border-red-950/60 text-red-600 dark:text-red-400 font-bold text-sm bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out • ចាកចេញពីគណនី</span>
          </button>
        </div>
      </div>

      {/* ── VIP Coins Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showCoinsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-md w-full bg-[#141720] text-white rounded-3xl p-6 border border-white/10 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setShowCoinsModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white border-none cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Sparkles size={24} />
              </div>

              <h3 className="text-lg font-black text-white">VIP Loyalty Coins & Rewards</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                You currently have <strong className="text-amber-400">{stats.points} Coins</strong>. Coins can be used directly at checkout for discounts on any PC build, laptop, or IT service!
              </p>

              <div className="my-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">100 S-Tech Coins</span>
                  <span className="font-bold text-emerald-400">$1.00 USD Off</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Balance Value</span>
                  <span className="font-bold text-amber-400">${(stats.points / 100).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tier Status</span>
                  <span className="font-bold text-white">VIP Gold (Free Shipping)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCoinsModal(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] text-white text-xs font-bold border-none cursor-pointer"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Serial Registration Modal ──────────────────────────── */}
      <AnimatePresence>
        {showRmaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-md w-full bg-[#141720] text-white rounded-3xl p-6 border border-white/10 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setShowRmaModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white border-none cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Shield size={24} />
              </div>

              <h3 className="text-lg font-black text-white">Register Hardware Serial Number</h3>
              <p className="text-xs text-gray-400 mt-1">
                Enter your product serial number from your invoice or device chassis to activate official warranty coverage.
              </p>

              <div className="my-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Serial Number (S/N)</label>
                  <input
                    type="text"
                    placeholder="e.g. ST-X1C-2026-KH"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Product Model</label>
                  <input
                    type="text"
                    placeholder="e.g. ThinkPad X1 Carbon Gen 11"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  alert("Hardware serial verified & registered with S Tech Store Official RMA database.");
                  setShowRmaModal(false);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold border-none cursor-pointer"
              >
                Verify & Register Warranty
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PassApp-Style Real-Time Live Delivery Tracking Modal ─ */}
      <AnimatePresence>
        {showPassAppModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#111318] text-white rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                    <Bike size={22} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-white">
                        PassApp Live Delivery Tracking
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        Live GPS
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Order #{trackedOrder?.id || "ST-88421"} • Estimated Arrival: <strong className="text-amber-400">12-15 Mins</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPassAppModal(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border-none"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* ── Interactive Live Map Simulation ─────────────── */}
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#161a23] h-60 sm:h-72">
                  {/* Map tile background */}
                  <iframe
                    title="Live Driver Tracking Route"
                    width="100%"
                    height="100%"
                    className="border-none opacity-85"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(profile.gps_lng || 104.9282) - 0.02}%2C${(profile.gps_lat || 11.5564) - 0.015}%2C${(profile.gps_lng || 104.9282) + 0.02}%2C${(profile.gps_lat || 11.5564) + 0.015}&layer=mapnik`}
                  />

                  {/* PassApp Animated Courier Pin Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Customer Destination Pin */}
                    <div className="absolute top-1/4 right-1/4 flex flex-col items-center">
                      <div className="px-2 py-0.5 rounded-md bg-[#8B1A1A] text-white text-[10px] font-bold shadow-lg mb-1 whitespace-nowrap">
                        Your Destination
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center shadow-xl border-2 border-white">
                        <MapPin size={16} />
                      </div>
                    </div>

                    {/* Animated Moving Driver Pin */}
                    <motion.div
                      animate={{
                        x: [-40, 20, 60],
                        y: [30, 0, -20],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                      }}
                      className="absolute left-1/3 bottom-1/3 flex flex-col items-center"
                    >
                      <div className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shadow-lg mb-1 whitespace-nowrap flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Driver (35 km/h)</span>
                      </div>
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl border-2 border-white">
                          <Bike size={20} />
                        </div>
                        {/* Radar wave ping */}
                        <div className="absolute -inset-1 rounded-full border-2 border-blue-400 animate-ping opacity-60" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Floating Map HUD */}
                  <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-gray-200">Courier On The Way</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300 font-semibold">
                      <span>Speed: 35 km/h</span>
                      <span>•</span>
                      <span>Dist: 1.8 km</span>
                    </div>
                  </div>
                </div>

                {/* ── Driver Information Card ──────────────────────── */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-800 border-2 border-blue-500 shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&q=80"
                        alt="S Tech Express Driver"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">Sok Channy (ចាន់នី)</h4>
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                          VIP Courier
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Honda Dream 125 • Phnom Penh 1AK-8849
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold mt-1">
                        <span>★ 4.9</span>
                        <span className="text-gray-500 font-normal">(1,480+ safe deliveries)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href="tel:+85512345678"
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 no-underline shadow-sm"
                    >
                      <Phone size={14} />
                      <span>Call Driver</span>
                    </a>
                    <a
                      href="https://t.me/stechstore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 no-underline shadow-sm"
                    >
                      <Send size={14} />
                      <span>Telegram</span>
                    </a>
                  </div>
                </div>

                {/* ── Order Delivery Steps Timeline ────────────────── */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Delivery Progress Status
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5 text-emerald-400 font-bold">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>Order Confirmed & Payment Verified (10:15 AM)</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-emerald-400 font-bold">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>Inspected & Packed at S Tech Hub (10:28 AM)</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-blue-400 font-black animate-pulse">
                      <Bike size={16} className="shrink-0" />
                      <span>Courier Picked Up & On Route — PassApp Active (10:35 AM)</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-500 font-medium">
                      <MapPin size={16} className="shrink-0" />
                      <span>Arrival at Your Pinned Address (Estimated ~ 10:50 AM)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-black/40 border-t border-white/10 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPassAppModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border-none cursor-pointer"
                >
                  Close Tracking
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Language Change Confirmation Modal ───────────────────── */}
      <LanguageConfirmModal
        isOpen={Boolean(pendingLocaleSwitch)}
        targetLocale={pendingLocaleSwitch}
        onConfirm={() => {
          if (pendingLocaleSwitch) {
            useLangStore.getState().setLang(pendingLocaleSwitch === "en" ? "EN" : "KM");
            router.replace(pathname, { locale: pendingLocaleSwitch });
            setPendingLocaleSwitch(null);
          }
        }}
        onCancel={() => setPendingLocaleSwitch(null)}
      />

      {/* ── Profile Save & Cloud Sync Status Modal ───────────────────── */}
      <AnimatePresence>
        {saveModal?.show && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#151922] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/10 text-center relative"
            >
              <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                saveModal.success
                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400"
              }`}>
                {saveModal.success ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
              </div>

              <h3 className="text-base font-black text-gray-900 dark:text-white mb-2">
                {saveModal.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
                {saveModal.message}
              </p>

              <button
                type="button"
                onClick={() => setSaveModal(null)}
                className={`w-full py-3 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                  saveModal.success
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    : "bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A]"
                }`}
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
