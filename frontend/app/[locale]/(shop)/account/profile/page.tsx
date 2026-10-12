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
  Copy, Zap, Download, Lock, Navigation, Compass, Crosshair, Type, Truck, Bike,
  CreditCard, Users, MessageSquare, Wallet, Ticket, Headphones, ShieldCheck, ShoppingCart, Star, Search, Trash2
} from "lucide-react";
import LanguageConfirmModal from "@/components/ui/LanguageConfirmModal";
import { useLangStore } from "@/store/langStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useUpdateStore } from "@/store/updateStore";
import { useCartStore } from "@/store/cartStore";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { translations } from "@/lib/translations";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { ThemeDropdown } from "@/components/ui/ThemeDropdown";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  getViewedProducts,
  clearViewedProducts,
  getSearchHistory,
  clearSearchHistory,
  removeSearchQuery,
  ViewedProduct,
  SearchHistoryItem
} from "@/lib/services/history.service";

interface ProfileData {
  firebase_uid?: string;
  provider?: string;
  display_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  khan?: string;
  telegram?: string;
  telegram_chat_id?: string;
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
  has_claimed_welcome_gift?: boolean;
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
  { key: "orders", label: "History & Activities", desc: "Orders, Viewed Items & Searches", icon: History },
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [registeredWarranties, setRegisteredWarranties] = useState<any[]>([]);
  const [newSerialInput, setNewSerialInput] = useState("");
  const [newModelInput, setNewModelInput] = useState("");
  const [deviceInfo, setDeviceInfo] = useState({ name: "Web Browser (Current Session)", isMobile: false });
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

  // Telegram Companion Bot Linking State
  const [telegramLinking, setTelegramLinking] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [telegramBotUsername, setTelegramBotUsername] = useState<string>("Stech_store_LoginBot");
  const [telegramPolling, setTelegramPolling] = useState(false);
  const [telegramSuccess, setTelegramSuccess] = useState(false);
  const [telegramUnlinking, setTelegramUnlinking] = useState(false);

  // History Sub-Tabs & Activity Tracking (Orders, Viewed Products, Searches)
  const [historySubTab, setHistorySubTab] = useState<"orders" | "viewed" | "searches">("orders");
  const [viewedProducts, setViewedProducts] = useState<ViewedProduct[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // 2FA OTP Security Verification State
  const [show2faModal, setShow2faModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSentNotice, setOtpSentNotice] = useState("");
  const [otpTargetAction, setOtpTargetAction] = useState<"enable" | "disable">("enable");

  // Luxury Password Reset Alert State (https://www.s-tech-store.tech)
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessModal, setResetSuccessModal] = useState<{ show: boolean; email: string; resetLink?: string } | null>(null);

  // Privacy and Cache Toast
  const [privacyToast, setPrivacyToast] = useState<string | null>(null);

  const refreshHistory = () => {
    if (typeof window !== "undefined") {
      setViewedProducts(getViewedProducts());
      setSearchHistory(getSearchHistory());
    }
  };

  useEffect(() => {
    refreshHistory();
    window.addEventListener("stech_history_updated", refreshHistory);
    return () => window.removeEventListener("stech_history_updated", refreshHistory);
  }, []);

  const router = useRouter();
  const pathname = usePathname();

  // Recommended products for Pinduoduo-inspired "You May Also Like" feed
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  useEffect(() => {
    import("@/lib/services/product.service").then(({ getProducts }) => {
      getProducts()
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          if (list && list.length > 0) {
            setRecommendedProducts(list.slice(0, 10));
          }
        })
        .catch((e) => console.error("Error loading recommended products:", e));
    });
  }, []);

  // Load real registered warranties from storage
  useEffect(() => {
    try {
      const uKey = user?.uid || "guest";
      const saved = localStorage.getItem("stech_user_warranties_" + uKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRegisteredWarranties(parsed);
          setStats((prev) => ({ ...prev, warranty_items: parsed.length }));
        }
      }
    } catch (e) {}
  }, [user]);

  // Real client device detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
      let name = "Web Browser";
      if (/Windows/i.test(ua)) name = "Windows PC (Web Browser)";
      else if (/Macintosh|Mac OS/i.test(ua)) name = "Mac (Safari / Chrome)";
      else if (/iPhone/i.test(ua)) name = "iPhone (Safari Mobile)";
      else if (/Android/i.test(ua)) name = "Android Phone (Chrome)";
      setDeviceInfo({ name, isMobile });
    }
  }, []);

  // PWA update store
  const { isChecking, checkForUpdates, applyUpdate, hasUpdate } = useUpdateStore();
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);

  // 100% Real cloud data from Neon PostgreSQL / Laravel API
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    email: "",
    phone: "",
    address: "",
    city: "Phnom Penh",
    khan: "",
    telegram: "",
    telegram_chat_id: undefined,
    profession: "",
    gender: "",
    birthday: "",
    delivery_notes: "",
    two_fa_enabled: false,
    notif_orders: true,
    notif_promos: true,
    notif_builds: true,
    notif_telegram: true,
    points: 0,
    created_at: "",
    gps_lat: undefined,
    gps_lng: undefined,
  });

  const [stats, setStats] = useState({
    orders: 0,
    wishlist: 0,
    points: 0,
    wallet_balance: 0,
    warranty_items: 0,
    unread_notifications: 0,
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "processing" | "packing" | "shipped" | "completed">("all");

  const { lang } = useLangStore();
  const t = translations[lang].profilePage;
  const tNav = translations[lang].nav;
  const wishlistCount = useWishlistStore((s) => s.getTotalItems());

  useEffect(() => {
    setMounted(true);

    const syncProfileSession = () => {
      const sessionStr = typeof window !== "undefined"
        ? (localStorage.getItem("stech_user_session") || localStorage.getItem("user_session"))
        : null;
      if (sessionStr) {
        try {
          const sUser = JSON.parse(sessionStr);
          const uid = sUser?.firebase_uid || sUser?.uid || (sUser?.id ? `tg_${sUser.id}` : null);
          if (uid) {
            const pseudoUser = {
              uid: uid,
              displayName: sUser.display_name || sUser.name || "S Tech VIP Member",
              email: sUser.email,
              photoURL: sUser.photo_url || sUser.avatar,
            } as any;
            setUser(pseudoUser);
            if (sUser.photo_url || sUser.avatar) {
              setAvatarPreview(sUser.photo_url || sUser.avatar);
            }
            setProfile((prev) => ({
              ...prev,
              firebase_uid: uid,
              provider: sUser.provider || (uid.startsWith("tg_") ? "telegram" : prev.provider),
              display_name: sUser.display_name || sUser.name || prev.display_name || "S Tech VIP Member",
              email: sUser.email || prev.email,
              phone: sUser.phone || prev.phone,
              photo_url: sUser.photo_url || sUser.avatar || prev.photo_url,
              telegram: sUser.telegram || prev.telegram,
              telegram_chat_id: sUser.telegram_chat_id || sUser.telegram_id || prev.telegram_chat_id,
            }));
            loadProfile(pseudoUser);
            loadOrders();
            return true;
          }
        } catch (e) {}
      }
      return false;
    };

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setProfile((prev) => ({
          ...prev,
          firebase_uid: u.uid,
          display_name: u.displayName || prev.display_name || "S Tech VIP Member",
          email: u.email || prev.email,
        }));
        loadProfile(u);
        loadOrders();
      } else {
        const found = syncProfileSession();
        if (!found) {
          router.push("/login");
        }
      }
    });

    window.addEventListener("user_session_updated", syncProfileSession);

    return () => {
      unsub();
      window.removeEventListener("user_session_updated", syncProfileSession);
    };
  }, []);

  const loadProfile = async (currentUser?: FirebaseUser) => {
    try {
      const res = await api.get("/user/profile");
      if (res.data?.profile) {
        setProfile((prev) => ({
          ...prev,
          ...res.data.profile,
          photo_url: res.data.profile.photo_url || prev.photo_url,
        }));
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
          photo_url: currentUser.photoURL || prev.photo_url,
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
      setOrders(list);
      setStats((prev) => ({ ...prev, orders: list.length }));
    } catch (e) {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const isTelegramAuthUser = Boolean(
    profile.provider === "telegram" ||
    profile.firebase_uid?.startsWith("tg_") ||
    user?.uid?.startsWith("tg_") ||
    (typeof window !== "undefined" && (
      (() => {
        try {
          const s1 = JSON.parse(localStorage.getItem("user_session") || "{}");
          const s2 = JSON.parse(localStorage.getItem("stech_user_session") || "{}");
          return s1?.provider === "telegram" || s2?.provider === "telegram" || Boolean(s1?.telegram_id || s2?.telegram_id);
        } catch { return false; }
      })()
    ))
  );

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
    const targetEmail = user?.email || profile.email;
    if (!targetEmail) {
      alert("សូមផ្ទៀងផ្ទាត់ ឬបញ្ចូលអ៊ីមែលគណនីរបស់អ្នកជាមុនសិន");
      return;
    }

    setResetLoading(true);
    try {
      // 1. Firebase built-in reset email
      try {
        await sendPasswordResetEmail(auth, targetEmail);
      } catch (fbErr) {
        console.warn("Firebase reset notice:", fbErr);
      }

      // 2. Custom backend branded luxury Khmer HTML email with domain https://www.s-tech-store.tech
      const res = await api.post("/user/send-reset-email", {
        email: targetEmail,
        username: profile.display_name || user?.displayName || "VIP Member",
      });

      setResetSent(true);
      setResetSuccessModal({
        show: true,
        email: targetEmail,
        resetLink: res.data?.data?.reset_link,
      });
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      console.error("Password reset dispatch error:", err);
      setResetSent(true);
      setResetSuccessModal({
        show: true,
        email: targetEmail,
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    const targetEmail = user?.email || profile.email;
    if (!targetEmail) {
      alert("សូមភ្ជាប់អ៊ីមែលដើម្បីអាចប្រើប្រាស់ប្រព័ន្ធ Two-Factor Authentication បាន!");
      return;
    }

    if (profile.two_fa_enabled) {
      // Prompt user to disable
      if (confirm("តើអ្នកពិតជាចង់បិទប្រព័ន្ធការពារ Two-Factor Authentication មែនទេ?")) {
        try {
          await api.put("/user/profile", { two_fa_enabled: false });
          setProfile((p) => ({ ...p, two_fa_enabled: false }));
          setPrivacyToast("បានបិទប្រព័ន្ធ Two-Factor Authentication រួចរាល់!");
          setTimeout(() => setPrivacyToast(null), 3000);
        } catch (e) {}
      }
      return;
    }

    // Opening 2FA: request OTP code via email & telegram
    setOtpLoading(true);
    setOtpError("");
    setOtpInput("");
    setOtpTargetAction("enable");
    setShow2faModal(true);

    try {
      const res = await api.post("/user/request-2fa-otp", {
        email: targetEmail,
        username: profile.display_name || user?.displayName,
      });
      setOtpSentNotice(res.data?.message || `លេខកូដសុវត្ថិភាព OTP ត្រូវបានផ្ញើទៅកាន់ ${targetEmail}!`);
    } catch (err: any) {
      setOtpError(err.response?.data?.message || "មិនអាចផ្ញើលេខកូដ OTP បានទេ សូមព្យាយាមម្តងទៀត");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerify2faOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.trim().length < 4) {
      setOtpError("សូមបញ្ចូលលេខកូដ OTP ឱ្យបានត្រឹមត្រូវ");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    try {
      const targetEmail = user?.email || profile.email;
      const res = await api.post("/user/verify-2fa-otp", {
        otp: otpInput.trim(),
        enable: true,
        email: targetEmail,
      });

      if (res.data?.success) {
        setProfile((p) => ({ ...p, two_fa_enabled: true }));
        setShow2faModal(false);
        setPrivacyToast("🎉 អបអរសាទរ! បានផ្ទៀងផ្ទាត់ និងបើកប្រព័ន្ធ Two-Factor Authentication ជោគជ័យ 🛡️");
        setTimeout(() => setPrivacyToast(null), 4000);
      } else {
        setOtpError(res.data?.message || "លេខកូដ OTP មិនត្រឹមត្រូវឡើយ!");
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || "លេខកូដ OTP មិនត្រឹមត្រូវ ឬផុតកំណត់សុពលភាពហើយ");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleClearViewedHistory = () => {
    if (confirm("តើអ្នកពិតជាចង់សម្អាតប្រវត្តិចូលមើលទំនិញទាំងអស់មែនទេ?")) {
      clearViewedProducts();
      setViewedProducts([]);
      setPrivacyToast("បានសម្អាតប្រវត្តិចូលមើលទំនិញរួចរាល់!");
      setTimeout(() => setPrivacyToast(null), 3000);
    }
  };

  const handleClearSearchHistory = () => {
    if (confirm("តើអ្នកពិតជាចង់សម្អាតប្រវត្តិពាក្យស្វែងរកទាំងអស់មែនទេ?")) {
      clearSearchHistory();
      setSearchHistory([]);
      setPrivacyToast("បានសម្អាតប្រវត្តិស្វែងរកទាំងអស់រួចរាល់!");
      setTimeout(() => setPrivacyToast(null), 3000);
    }
  };

  const handleRemoveSingleSearch = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSearchQuery(query);
    setSearchHistory(getSearchHistory());
  };

  const handleExportAccountData = () => {
    try {
      const exportData = {
        exported_at: new Date().toISOString(),
        store: "S Tech Store Cambodia",
        domain: "https://www.s-tech-store.tech",
        user_profile: {
          ...profile,
          email: user?.email || profile.email,
          uid: user?.uid,
        },
        viewed_products: getViewedProducts(),
        search_history: getSearchHistory(),
        orders_count: orders.length,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stech_profile_data_${profile.display_name || "user"}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setPrivacyToast("បានទាញយកទិន្នន័យគណនី (JSON Export) ដោយជោគជ័យ!");
      setTimeout(() => setPrivacyToast(null), 3500);
    } catch (e) {
      alert("ទាញយកទិន្នន័យមិនបានសម្រេច");
    }
  };

  const handleLogoutAllSessions = async () => {
    if (confirm("តើអ្នកពិតជាចង់ចាកចេញពីគ្រប់ឧបករណ៍ទាំងអស់មែនទេ?")) {
      try {
        localStorage.removeItem("customer_token");
        localStorage.removeItem("user_session");
        localStorage.removeItem("stech_user_session");
        await signOut(auth);
        window.location.href = "/";
      } catch (e) {
        window.location.href = "/";
      }
    }
  };

  const handleConnectTelegram = async () => {
    try {
      setTelegramLinking(true);
      const res = await api.post("/user/telegram/link-init");
      if (res.data?.success && res.data?.deep_link) {
        setTelegramDeepLink(res.data.deep_link);
        setTelegramToken(res.data.link_token);
        if (res.data.bot_username) {
          setTelegramBotUsername(res.data.bot_username);
        }
        setTelegramModalOpen(true);
        setTelegramSuccess(false);

        const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|Android/i.test(navigator.userAgent);
        const appLink = res.data.app_link;

        if (isMobile && appLink) {
          // Open Telegram App directly without navigating browser tab away from S Tech Store
          window.location.href = appLink;
        } else {
          window.open(res.data.deep_link, "_blank");
        }

        startTelegramPolling(res.data.link_token);
      }
    } catch (err: any) {
      console.error("Failed to init telegram link:", err);
      alert(err?.response?.data?.error || "មិនអាចបង្កើតតំណភ្ជាប់ Telegram បានទេ សូមព្យាយាមម្តងទៀត");
    } finally {
      setTelegramLinking(false);
    }
  };

  const startTelegramPolling = (token: string) => {
    setTelegramPolling(true);
    let attempts = 0;
    let pollInterval: any = null;

    const cleanup = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };

    const checkLink = async () => {
      try {
        const res = await api.get(`/user/telegram/link-check?token=${encodeURIComponent(token)}`);
        if (res.data?.completed) {
          cleanup();
          setTelegramPolling(false);
          setTelegramSuccess(true);
          setProfile((prev) => ({
            ...prev,
            telegram: res.data.telegram || prev.telegram,
            telegram_chat_id: res.data.telegram_id || prev.telegram_chat_id,
            photo_url: res.data.photo_url || prev.photo_url,
            notif_telegram: true,
          }));
          if (res.data.photo_url) {
            setAvatarPreview(res.data.photo_url);
          }
          // Snappy 1.5s celebration then return back to profile view
          setTimeout(() => {
            setTelegramModalOpen(false);
            setTelegramSuccess(false);
          }, 1500);
          return true;
        } else if (res.data?.status === "conflict" || res.data?.status === "rejected") {
          cleanup();
          setTelegramPolling(false);
          setTelegramModalOpen(false);
          const errMsg = res.data?.error || `គណនី Telegram នេះត្រូវបានភ្ជាប់រួចហើយជាមួយគណនី "${res.data?.already_linked_name || "ផ្សេង"}"! សូមផ្តាច់ការភ្ជាប់ពីគណនីចាស់ជាមុនសិន។`;
          setSaveModal({
            show: true,
            success: false,
            title: "គណនី Telegram ត្រូវបានភ្ជាប់រួចហើយ ⚠️",
            message: errMsg,
          });
          return false;
        }
      } catch (e) {}
      return false;
    };

    // Immediate check on trigger
    checkLink();

    pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > 80) {
        cleanup();
        setTelegramPolling(false);
        return;
      }
      await checkLink();
    }, 1200);

    // Immediate check on tab return from Telegram app
    const onReturn = () => {
      if (document.visibilityState === "visible") {
        checkLink();
      }
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm("តើអ្នកពិតជាចង់ផ្តាច់ការភ្ជាប់គណនី Telegram នេះមែនទេ? លោកអ្នកនឹងមិនទទួលបានវិក្កយបត្រអេឡិចត្រូនិច ឬដំណឹងបញ្ជាទិញក្នុងឆាត Telegram ទៀតឡើយ។")) {
      return;
    }
    try {
      setTelegramUnlinking(true);
      const res = await api.post("/user/telegram/unlink");
      if (res.data?.success) {
        setProfile((prev) => ({
          ...prev,
          telegram: "",
          telegram_chat_id: undefined,
          notif_telegram: false,
        }));

        // Clean up locally stored session
        if (typeof window !== "undefined") {
          try {
            const sess = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
            if (sess) {
              const p = JSON.parse(sess);
              delete p.telegram;
              delete p.telegram_chat_id;
              delete p.telegram_id;
              localStorage.setItem("stech_user_session", JSON.stringify(p));
              localStorage.setItem("user_session", JSON.stringify(p));
              window.dispatchEvent(new Event("user_session_updated"));
            }
          } catch (err) {}
        }

        setSaveModal({
          show: true,
          success: true,
          title: "ផ្តាច់ការភ្ជាប់ជោគជ័យ ✅",
          message: "គណនី Telegram ត្រូវបានផ្តាច់ចេញពីគណនីរបស់អ្នករួចរាល់។ ឥឡូវនេះគណនី Telegram នេះនៅទំនេរ និងអាចយកទៅភ្ជាប់ជាមួយគណនីផ្សេងបាន។",
        });
      }
    } catch (e: any) {
      alert("មានបញ្ហាក្នុងការផ្តាច់គណនី Telegram សូមព្យាយាមម្តងទៀត");
    } finally {
      setTelegramUnlinking(false);
    }
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
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "all") return true;
    if (orderFilter === "pending") return o.status === "pending" || o.status === "to_pay";
    if (orderFilter === "processing") return o.status === "processing" || o.status === "to_share";
    if (orderFilter === "packing") return o.status === "packing" || o.status === "confirmed";
    if (orderFilter === "shipped") return o.status === "shipped";
    if (orderFilter === "completed") return o.status === "completed" || o.status === "delivered";
    return o.status === orderFilter;
  });
  const toPayCount = orders.filter((o) => o.status === "pending" || o.status === "to_pay").length;
  const processingCount = orders.filter((o) => o.status === "processing" || o.status === "to_share").length;
  const packingCount = orders.filter((o) => o.status === "packing" || o.status === "confirmed").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const reviewsCount = orders.filter((o) => o.status === "completed" || o.status === "delivered").length;

  return (
    <div className="min-h-screen bg-[#f6f8fb] dark:bg-[#0c0e12] text-gray-900 dark:text-gray-100 pt-6 pb-36 sm:pb-16">
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── 1. VIP Membership Hero Card ───────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#12141a] via-[#1a1e27] to-[#0c0e12] border border-white/10 text-white p-6 sm:p-8">
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/15 via-red-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top-Right Quick Sign Out Button (Prominent & Accessible at Top) */}
          <div className="absolute top-5 right-5 sm:top-7 sm:right-8 z-20">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-200 hover:text-white border border-red-500/35 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-md"
              title="Sign Out • ចាកចេញពីគណនី"
            >
              <LogOut size={14} />
              <span className="hidden xs:inline">Sign Out • </span>
              <span>ចាកចេញ</span>
            </button>
          </div>

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

                {/* Telegram Verified Avatar Badge */}
                {(isTelegramAuthUser || profile.telegram_chat_id) && (
                  <div
                    className="absolute -top-1.5 -left-1.5 w-7 h-7 rounded-full bg-gradient-to-tr from-[#0088cc] to-[#229ED9] text-white flex items-center justify-center shadow-lg border-2 border-[#12141a] z-10"
                    title="Telegram Verified Account"
                  >
                    <Send size={12} className="-translate-x-0.5 translate-y-0.5" />
                  </div>
                )}

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
                  {/* Quick Sign Out Button in Meta Row */}
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-500/20 hover:bg-red-500/35 text-red-300 hover:text-white transition-colors border border-red-500/30 cursor-pointer font-bold shadow-sm"
                    title="Sign Out • ចាកចេញពីគណនី"
                  >
                    <LogOut size={11} />
                    <span>Sign Out • ចាកចេញ</span>
                  </button>
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

          {/* Quick Theme Switcher Bar for Mobile & Desktop */}
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                <Sun size={13} className="text-amber-400" />
                <span>ពន្លឺអេក្រង់ / Theme Mode:</span>
              </span>
            </div>
            <div className="flex items-center bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                  theme === "light"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Sun size={13} />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                  theme === "dark"
                    ? "bg-[#8B1A1A] text-white shadow-sm"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Moon size={13} />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                  theme === "system"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Monitor size={13} />
                <span>Auto</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Official Telegram Account Linkage Card (Prominent & SuperApp Style) ────────────────── */}
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 border transition-all duration-300 shadow-xl bg-gradient-to-br from-[#17212b] via-[#0f1822] to-[#131b26] border-[#229ED9]/40 text-white">
          {/* Ambient Telegram Blue Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#229ED9]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0088cc] to-[#229ED9] flex items-center justify-center text-white shadow-lg shadow-[#0088cc]/30 shrink-0 border border-white/20">
                <Send size={28} className="-translate-x-0.5 translate-y-0.5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                    <span>{isTelegramAuthUser || profile.telegram_chat_id ? "គណនីបានភ្ជាប់ជាមួយ Telegram រួចរាល់" : "ភ្ជាប់គណនីជាមួយ Telegram Bot"}</span>
                    <BadgeCheck size={18} className="text-[#229ED9] fill-[#229ED9]/20" />
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isTelegramAuthUser || profile.telegram_chat_id
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-[#229ED9]/20 text-sky-300 border border-[#229ED9]/40 animate-pulse"
                  }`}>
                    {isTelegramAuthUser || profile.telegram_chat_id ? "✓ Connected • ភ្ជាប់ជោគជ័យ" : "⚡ Recommend • ណែនាំ"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl">
                  {isTelegramAuthUser || profile.telegram_chat_id
                    ? `លោកអ្នកបានភ្ជាប់គណនី Telegram រួចរាល់ហើយ ទទួលបានវិក្កយបត្រអេឡិចត្រូនិច (E-Receipts) ដំណឹងបញ្ជាទិញទាន់ចិត្ត និង Login 1-Click រួចស្រេច! (${profile.telegram ? `Username: ${profile.telegram}` : ""} ${profile.telegram_chat_id ? `• Chat ID: ${profile.telegram_chat_id}` : ""})`
                    : "ភ្ជាប់គណនីជាមួយ Telegram Bot ឥឡូវនេះ ដើម្បីទទួលបានវិក្កយបត្រអេឡិចត្រូនិច (E-Receipts), ដំណឹងដឹកជញ្ជូនរហ័សទាន់ចិត្តតាម Telegram 24/7 និង Login 1-Click លើកក្រោយ!"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isTelegramAuthUser || profile.telegram_chat_id ? (
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => window.open(`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Stech_store_LoginBot"}`, "_blank")}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#0088cc] hover:from-[#1b8fc5] hover:to-[#0077b5] text-white text-xs sm:text-sm font-black transition-all shadow-lg shadow-[#0088cc]/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    <Send size={15} />
                    <span>បើក Telegram Bot</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleUnlinkTelegram}
                    disabled={telegramUnlinking}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-red-300 text-xs sm:text-sm font-semibold transition-colors border border-white/10 cursor-pointer"
                  >
                    <span>ផ្តាច់ការភ្ជាប់</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectTelegram}
                  disabled={telegramLinking}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-sm sm:text-base font-black transition-all shadow-xl shadow-amber-500/40 border-2 border-amber-300 ring-4 ring-amber-400/30 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer animate-pulse"
                >
                  <AlertTriangle size={18} className="text-slate-950 shrink-0" />
                  <span>{telegramLinking ? "កំពុងដំណើរការ..." : "⚠️ មិនទាន់ភ្ជាប់ Telegram • ចុចភ្ជាប់ឥឡូវនេះ (Connect Telegram)"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. PINDUODUO-INSPIRED SUITE (Matching Image 2) ────────────────── */}

        {/* 2.0 $5 Welcome Gift Claim Banner (If not yet claimed) */}
        {!profile.has_claimed_welcome_gift && (
          <div 
            onClick={() => {
              sessionStorage.removeItem("stech_dismissed_gift_modal");
              window.dispatchEvent(new Event("user_session_updated"));
            }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#8B1A1A] via-red-600 to-amber-600 p-4 text-white shadow-lg border border-red-400/50 cursor-pointer flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md text-amber-300 flex items-center justify-center font-black shadow-sm shrink-0">
                <Gift size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase tracking-wider">កាដូស្វាគមន៍ $5.00 OFF</span>
                  <span className="text-[10px] font-black bg-amber-400 text-black px-2 py-0.5 rounded-full uppercase">ឥតគិតថ្លៃ</span>
                </div>
                <p className="text-xs text-white/90 mt-0.5 font-medium line-clamp-1">
                  ចែករំលែក Link ដើម្បីទទួលយក Voucher $5 ភ្លាមៗសម្រាប់ទិញទំនិញ!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#8B1A1A] text-xs font-black shrink-0 ml-2 shadow-sm">
              <span>Claim $5 🎁</span>
            </div>
          </div>
        )}

        {/* Real Cash Wallet & Loyalty Coins Quick Bar */}
        <Link
          href="/account/wallet"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#180a0a] via-[#120808] to-[#1a1408] p-4 text-white shadow-md border border-red-900/40 hover:border-amber-500/50 cursor-pointer flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99] no-underline"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B1A1A] to-amber-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
              <Wallet size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-white">S-Tech Real Wallet & Coins</span>
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  ${Number(stats.wallet_balance || 0).toFixed(2)} USD
                </span>
                <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {stats.points || 0} Coins
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                បញ្ចូលលុយពី Bank (KHQR) • ទទួល 1 Coin រាល់ថ្ងៃ • ប្តូរកាក់ជាសាច់ប្រាក់
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-black text-amber-400 shrink-0 ml-2">
            <span>បើកកាបូប &gt;</span>
          </div>
        </Link>

        {/* 2.1 Saver Pass Golden VIP Banner */}
        <div 
          onClick={() => setShowCoinsModal(true)}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#ffe8ba] via-[#ffd591] to-[#ffa940] p-3.5 sm:p-4 text-[#873800] shadow-md border border-amber-300/60 cursor-pointer flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 text-white flex items-center justify-center font-black shadow-sm shrink-0">
              <Gift size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#612500] uppercase tracking-wide">Saver Pass</span>
                <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase">VIP Only</span>
              </div>
              <p className="text-xs font-semibold text-[#873800]/90 mt-0.5 line-clamp-1">
                Save up to $10 on next PC build • 0$ Delivery & exclusive VIP vouchers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-black text-[#612500] shrink-0 ml-2">
            <span>Claim &gt;</span>
          </div>
        </div>

        {/* 2.2 "My Orders" 5-Status Row (Pinduoduo / Taobao style) */}
        <div className="bg-white dark:bg-[#141720] rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#8B1A1A] dark:text-red-400" />
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">My Orders</h2>
            </div>
            <button 
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("all"); }}
              className="text-xs font-bold text-gray-500 hover:text-[#8B1A1A] dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-0.5 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <span>View All Orders</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1 sm:gap-2 text-center">
            {/* 1. To Pay */}
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("pending"); }}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-1.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard size={20} />
                </div>
                {toPayCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {toPayCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">To Pay</span>
            </button>

            {/* 2. Processing */}
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("processing"); }}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-1.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                {processingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {processingCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Processing</span>
            </button>

            {/* 3. Packing */}
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("packing"); }}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-1.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package size={20} />
                </div>
                {packingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {packingCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Packing</span>
            </button>

            {/* 4. Shipped */}
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("shipped"); }}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-1.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck size={20} />
                </div>
                {shippedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {shippedCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Shipped</span>
            </button>

            {/* 5. Reviews */}
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("completed"); }}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-1.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare size={20} />
                </div>
                {reviewsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {reviewsCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Reviews</span>
            </button>
          </div>
        </div>

        {/* 2.3 "Quick Tools & Services" 8-Grid (Pinduoduo Style) */}
        <div className="bg-white dark:bg-[#141720] rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-white/5">
            <h2 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">Quick Tools & Services</h2>
            <span className="text-[11px] font-medium text-gray-400">Essential Tech Suite</span>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
            {/* Wishlist */}
            <Link 
              href="/wishlist" 
              className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all no-underline text-gray-800 dark:text-gray-200 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Heart size={20} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Wishlist</span>
              <span className="text-[9px] text-gray-400 font-medium">{wishlistCount || stats.wishlist} items</span>
            </Link>

            {/* Wallet / Coins */}
            <button 
              type="button"
              onClick={() => setShowCoinsModal(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Wallet size={20} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Tech Wallet</span>
              <span className="text-[9px] text-amber-600 font-bold">{stats.points} pts</span>
            </button>

            {/* Coupons */}
            <Link 
              href="/promotions" 
              className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all no-underline text-gray-800 dark:text-gray-200 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Ticket size={20} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Coupons</span>
              <span className="text-[9px] text-red-600 font-bold">25% OFF</span>
            </Link>

            {/* Warranty */}
            <button 
              type="button"
              onClick={() => setActiveTab("warranty")}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <ShieldCheck size={20} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Warranty</span>
              <span className="text-[9px] text-emerald-600 font-medium">100% Genuine</span>
            </button>

            {/* Delivery Address & GPS */}
            <button 
              type="button"
              onClick={() => setActiveTab("address")}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <MapPin size={20} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Address</span>
              <span className="text-[9px] text-gray-400 font-medium">GPS Pin</span>
            </button>

            {/* Browsing History */}
            <button 
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("all"); }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <History size={20} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">History</span>
              <span className="text-[9px] text-gray-400 font-medium">Activity</span>
            </button>

            {/* Customer Support */}
            <button 
              type="button"
              onClick={() => {
                import("@/store/chatStore").then(({ useChatStore }) => {
                  useChatStore.getState().openChat();
                });
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Headphones size={20} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Support</span>
              <span className="text-[9px] text-teal-600 font-medium">Live 24/7</span>
            </button>

            {/* Settings & Security */}
            <button 
              type="button"
              onClick={() => setActiveTab("security")}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Settings size={20} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Settings</span>
              <span className="text-[9px] text-gray-400 font-medium">2FA & Security</span>
            </button>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <Send size={14} className="text-[#0088cc]" />
                      <span>Telegram Username (@username for shipping)</span>
                    </label>
                    {(profile.telegram_chat_id || isTelegramAuthUser) ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>{isTelegramAuthUser ? "Auto-Connected (Telegram)" : "Bot Linked"}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectTelegram}
                        disabled={telegramLinking}
                        className="px-2 py-0.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-800 dark:text-amber-300 border border-amber-400/50 text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all animate-pulse"
                      >
                        <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400" />
                        <span>{telegramLinking ? "Connecting..." : "⚠️ មិនទាន់ភ្ជាប់ • ចុចភ្ជាប់ Telegram"}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={profile.telegram || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, telegram: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all"
                    placeholder="@stech_user"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    ភ្ជាប់ជាមួយ Bot ដើម្បីទទួលវិក្កយបត្រ (Receipts/Invoices) និងតាមដានការដឹកជញ្ជូន។
                  </p>
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
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">ពាក្យសម្ងាត់ & សុវត្ថិភាព (Password & Reset)</h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ផ្ញើតំណភ្ជាប់ប្តូរពាក្យសម្ងាត់ផ្លូវការទៅកាន់អ៊ីមែល: <strong className="text-gray-800 dark:text-gray-200">{user?.email || profile.email}</strong> (Domain: s-tech-store.tech)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="px-4 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6b1111] text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <Lock size={14} className={resetLoading ? "animate-spin" : ""} />
                  <span>{resetLoading ? "កំពុងផ្ញើ..." : "ផ្ញើតំណភ្ជាប់ Reset"}</span>
                </button>
              </div>

              {resetSent && (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-500 shrink-0" />
                  <span>បានផ្ញើសារ Reset Password ដោយជោគជ័យទៅកាន់ {user?.email || profile.email} (សូមពិនិត្យ Inbox ឬ Spam របស់អ្នក)។</span>
                </div>
              )}

              {/* 2FA Verification Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-blue-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">ការផ្ទៀងផ្ទាត់ពីរកត្តា (Two-Factor Authentication / 2FA)</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      profile.two_fa_enabled ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-gray-200 dark:bg-white/10 text-gray-500"
                    }`}>
                      {profile.two_fa_enabled ? "✓ បានបើក (Active)" : "មិនទាន់បើក (Disabled)"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    តម្រូវឱ្យបញ្ចូលលេខកូដសុវត្ថិភាព ៦ ខ្ទង់ដែលផ្ញើទៅ Email & Telegram រាល់ពេលចូលប្រើលើឧបករណ៍ថ្មី។
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
                  <button
                    type="button"
                    onClick={handleLogoutAllSessions}
                    className="text-[11px] font-bold text-red-500 hover:text-red-600 hover:underline border-none bg-transparent cursor-pointer"
                  >
                    ចាកចេញពីគ្រប់ឧបករណ៍ (Sign Out All)
                  </button>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-3.5 bg-gray-50/70 dark:bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        {deviceInfo.isMobile ? <Smartphone size={16} /> : <Monitor size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{deviceInfo.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-white text-[9px] font-bold">This Device</span>
                        </div>
                        <p className="text-[11px] text-gray-400">Current IP Session • Active Now • S Tech Verified</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy & Account Data Export Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Shield size={16} className="text-purple-500" />
                      <span>គ្រប់គ្រងទិន្នន័យឯកជនភាព (Privacy & Data Management)</span>
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      សម្អាតទិន្នន័យ Cache ប្រវត្តិ ឬទាញយកទិន្នន័យគណនីរបស់អ្នកជារូបរាង JSON file។
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleClearViewedHistory}
                    className="p-3 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 hover:border-red-400 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block group-hover:text-red-500">
                      🗑️ សម្អាតទំនិញបានមើល
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      លុបប្រវត្តិទំនិញចូលមើល ({viewedProducts.length} មុខ)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearSearchHistory}
                    className="p-3 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 hover:border-red-400 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block group-hover:text-red-500">
                      🗑️ សម្អាតប្រវត្តិស្វែងរក
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      លុបពាក្យគន្លឹះស្វែងរក ({searchHistory.length} ពាក្យ)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportAccountData}
                    className="p-3 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 hover:border-blue-400 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block group-hover:text-blue-500">
                      📥 ទាញយកទិន្នន័យគណនី
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Export Data to JSON
                    </span>
                  </button>
                </div>
              </div>

              {/* ── Telegram Customer Companion Bot (Private Account Link) ── */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent border border-sky-500/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0088cc] to-sky-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
                      <Send size={22} className="rotate-[-20deg]" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                          Telegram Companion Bot (@Stech_store_LoginBot)
                        </h4>
                        {isTelegramAuthUser ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>Auto-Connected (ចូលតាម Telegram)</span>
                          </span>
                        ) : (profile.telegram_chat_id || profile.telegram) ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>បានភ្ជាប់ជោគជ័យ (Linked)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            <span>មិនទាន់ភ្ជាប់ (Not Connected)</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                        {isTelegramAuthUser
                          ? "គណនី Telegram របស់អ្នកត្រូវបានភ្ជាប់ជាមួយ S Tech Store ដោយស្វ័យប្រវត្តិតាំងពីដំបូងពេល Sign-in។ រាល់វិក្កយបត្រ (Digital Invoices/Receipts) និងដំណឹងការកុម្ម៉ង់ ត្រូវបានបញ្ជូនចូល Bot ផ្ទាល់ខ្លួនរបស់អ្នកដោយស្វ័យប្រវត្តិ!"
                          : "សម្រាប់អតិថិជនទាំងអស់ (Google Gmail, Email/Password): ភ្ជាប់ Telegram ផ្ទាល់ខ្លួន ដើម្បីទទួលវិក្កយបត្រអេឡិចត្រូនិច (Digital Invoices/Receipts), តាមដានការដឹកជញ្ជូន និងដំណឹងផ្ទាល់ខ្លួនក្នុង Private Chat ដោយសុវត្ថិភាពខ្ពស់ មិនលាយឡំជាមួយអ្នកដទៃឡើយ។"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status & Details */}
                {(profile.telegram_chat_id || profile.telegram || isTelegramAuthUser) ? (
                  <div className="p-4 rounded-xl bg-white/80 dark:bg-black/30 border border-sky-500/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                        <span>គណនី Telegram: <strong className="text-sky-600 dark:text-sky-400">{profile.telegram || "Connected via Telegram"}</strong> {profile.telegram_chat_id && <code className="text-[10px] bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 rounded text-sky-700 dark:text-sky-300">ID: {profile.telegram_chat_id}</code>}</span>
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        🔒 {isTelegramAuthUser ? "Auto-Connected from Sign-in" : "Private & Encrypted"} (វិក្កយបត្រ Receipts ផ្ញើចូលឆាតនេះផ្តាច់មុខ)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-white/5">
                      <a
                        href="https://t.me/Stech_store_LoginBot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold transition-all no-underline flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Send size={13} />
                        <span>បើកឆាត Telegram Bot (@Stech_store_LoginBot)</span>
                        <ExternalLink size={12} />
                      </a>

                      {!isTelegramAuthUser && (
                        <button
                          type="button"
                          onClick={handleUnlinkTelegram}
                          disabled={telegramUnlinking}
                          className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all border border-red-500/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {telegramUnlinking ? <RefreshCw size={13} className="animate-spin" /> : <X size={13} />}
                          <span>{telegramUnlinking ? "កំពុងផ្តាច់..." : "ផ្តាច់ការភ្ជាប់ (Unlink)"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/80 dark:bg-black/30 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <span>⚡ ភ្ជាប់ត្រឹមតែ ១-Click ប៉ុណ្ណោះ គ្មានការពិបាកឡើយ!</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        ចុចប៊ូតុងខាងក្រោម នោះប្រព័ន្ធនឹងបើក Telegram Bot ស្វ័យប្រវត្តិ។ ចុច <strong>START</strong> ក្នុង Telegram ដើម្បីភ្ជាប់ភ្លាមៗ។
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleConnectTelegram}
                      disabled={telegramLinking}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs sm:text-sm font-black transition-all border-2 border-amber-300 shadow-lg shadow-amber-500/30 ring-4 ring-amber-400/20 cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 animate-pulse"
                    >
                      {telegramLinking ? <RefreshCw size={14} className="animate-spin" /> : <AlertTriangle size={15} className="text-slate-950 shrink-0" />}
                      <span>{telegramLinking ? "កំពុងរៀបចំ..." : "⚠️ មិនទាន់ភ្ជាប់ Telegram • ចុចភ្ជាប់ Bot ឥឡូវនេះ"}</span>
                    </button>
                  </div>
                )}
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

                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">
                          Telegram Bot Dispatch Alerts & E-Invoices
                        </span>
                        {isTelegramAuthUser ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                            Auto-Connected ({profile.telegram || "Telegram"})
                          </span>
                        ) : (profile.telegram_chat_id || profile.telegram) ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                            Linked ({profile.telegram || "Bot Active"})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                            Not Linked
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 block">
                        Send digital invoice & driver contact directly to your private Telegram chat (@Stech_store_LoginBot).
                      </span>
                      {(!profile.telegram_chat_id && !isTelegramAuthUser) && (
                        <button
                          type="button"
                          onClick={handleConnectTelegram}
                          disabled={telegramLinking}
                          className="mt-1.5 px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-800 dark:text-amber-300 border border-amber-400/40 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all animate-pulse w-fit"
                        >
                          <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" />
                          <span>{telegramLinking ? "Connecting..." : "⚠️ មិនទាន់ភ្ជាប់ Telegram • ចុចដើម្បីភ្ជាប់ Bot"}</span>
                        </button>
                      )}
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
                    Track your registered tech hardware, serial numbers, and official 3 to 6-month S Tech Store warranty.
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
              {registeredWarranties.length === 0 ? (
                <div className="p-8 sm:p-12 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ShieldCheck size={28} />
                  </div>
                  <div className="max-w-md">
                    <h4 className="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base">
                      មិនទាន់មានឧបករណ៍ដែលបានចុះបញ្ជីធានានៅឡើយទេ
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      រាល់កុំព្យូទ័រ និងគ្រឿងបន្លាស់ដែលបានទិញពី S Tech Store ទទួលបានការធានាផ្លូវការ 3 ទៅ 6 ខែ។ សូមចុចប៊ូតុងខាងក្រោមដើម្បីចុះបញ្ជីលេខ Serial (S/N) ឧបករណ៍របស់បង!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRmaModal(true)}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md border-none cursor-pointer flex items-center gap-1.5"
                  >
                    <Shield size={14} />
                    <span>ចុះបញ្ជីលេខ Serial ឥឡូវនេះ (Register Serial)</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {registeredWarranties.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase">
                            Active Warranty (មានការធានា)
                          </span>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                            {item.model}
                          </h4>
                          <p className="text-[11px] text-gray-400 font-mono">S/N: {item.serial}</p>
                        </div>
                        <Laptop size={24} className="text-[#8B1A1A]" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                          <span>Verified with S Tech Cloud RMA</span>
                          <span>Registered {new Date(item.registered_at).toLocaleDateString()}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-gray-200/60 dark:border-white/5">
                        <span className="text-[11px] text-gray-400">S Tech Official Support</span>
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
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 6: History & Activities Hub ──────────────────────── */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              {/* Main Tab Header with Sub-Tab Navigation */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
                <div>
                  <h3 className="text-base sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <History size={22} className="text-[#8B1A1A] dark:text-red-400" />
                    <span>ប្រវត្តិសកម្មភាព & ការបញ្ជាទិញ (Activity History)</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    គ្រប់គ្រងប្រវត្តិការទិញទំនិញ ផលិតផលដែលបានចូលមើល និងពាក្យគន្លឹះស្វែងរករបស់អ្នក។
                  </p>
                </div>

                {/* Sub-Tab Navigation Pills */}
                <div className="flex items-center gap-1.5 bg-gray-100/90 dark:bg-white/10 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setHistorySubTab("orders")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      historySubTab === "orders"
                        ? "bg-[#8B1A1A] text-white shadow-md shadow-red-900/30"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-transparent"
                    }`}
                  >
                    <Package size={14} />
                    <span>ការបញ្ជាទិញ ({orders.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistorySubTab("viewed")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      historySubTab === "viewed"
                        ? "bg-[#8B1A1A] text-white shadow-md shadow-red-900/30"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-transparent"
                    }`}
                  >
                    <Eye size={14} />
                    <span>ទំនិញបានមើល ({viewedProducts.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistorySubTab("searches")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      historySubTab === "searches"
                        ? "bg-[#8B1A1A] text-white shadow-md shadow-red-900/30"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-transparent"
                    }`}
                  >
                    <Search size={14} />
                    <span>ប្រវត្តិស្វែងរក ({searchHistory.length})</span>
                  </button>
                </div>
              </div>

              {/* Sub-Tab 1: Orders History */}
              {historySubTab === "orders" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      តម្រៀបតាមស្ថានភាព (Filter Status):
                    </span>

                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 p-1 rounded-xl overflow-x-auto no-scrollbar">
                      {["all", "pending", "processing", "packing", "shipped", "completed"].map((st) => (
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
                    <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-3 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-8">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <Package size={32} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-800 dark:text-gray-200 text-base">មិនទាន់មានការបញ្ជាទិញនៅឡើយទេ</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                          លោកអ្នកមិនទាន់មានទំនិញក្នុងប្រវត្តិបញ្ជាទិញឡើយ។ ចូលមើលទំនិញបច្ចេកវិទ្យា និងគ្រឿងបន្លាស់ឥឡូវនេះ!
                        </p>
                      </div>
                      <Link
                        href="/category/all"
                        className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6b1111] hover:to-red-700 text-white font-bold text-xs shadow-md no-underline transition-all"
                      >
                        ស្វែងរកទំនិញឥឡូវនេះ (Shop Now)
                      </Link>
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

              {/* Sub-Tab 2: Recently Viewed Products */}
              {historySubTab === "viewed" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        ទំនិញដែលបានចូលមើលថ្មីៗ ({viewedProducts.length} មុខ)
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        កត់ត្រារាល់ផលិតផលដែលលោកអ្នកបានចូលមើលលើវេបសាយ ស្រួលត្រឡប់មកពិនិត្យឡើងវិញ
                      </p>
                    </div>
                    {viewedProducts.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearViewedHistory}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 border-none cursor-pointer transition-all"
                      >
                        <Trash2 size={13} />
                        <span>សម្អាតប្រវត្តិ</span>
                      </button>
                    )}
                  </div>

                  {viewedProducts.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-3 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-8">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <Eye size={32} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-800 dark:text-gray-200 text-base">
                          មិនទាន់មានប្រវត្តិចូលមើលទំនិញនៅឡើយទេ
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                          នៅពេលលោកអ្នកចុចចូលមើលផលិតផលណាមួយ វានឹងត្រូវកត់ត្រាទុកនៅទីនេះដោយស្វ័យប្រវត្តិ!
                        </p>
                      </div>
                      <Link
                        href="/category/all"
                        className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white font-bold text-xs shadow-md no-underline transition-all"
                      >
                        រុករកទំនិញឥឡូវនេះ (Explore Store)
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {viewedProducts.map((p) => {
                        const displayPrice = p.sale_price ? Number(p.sale_price) : Number(p.price);
                        const originalPrice = Number(p.price);
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col p-3 rounded-2xl bg-white dark:bg-[#141720] border border-gray-100 dark:border-white/10 shadow-xs hover:shadow-md transition-all group"
                          >
                            <Link
                              href={`/products/${p.slug || p.id}`}
                              className="h-32 sm:h-40 w-full bg-gray-50 dark:bg-white/5 rounded-xl overflow-hidden mb-2.5 p-2 flex items-center justify-center relative no-underline"
                            >
                              <img
                                src={p.image || "/logo.jpg"}
                                alt={p.name}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            </Link>

                            <div className="text-[10px] text-gray-400 uppercase font-bold truncate">
                              {p.category_name || "Official Tech"}
                            </div>
                            <Link
                              href={`/products/${p.slug || p.id}`}
                              className="text-xs sm:text-[13px] font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1 group-hover:text-[#8B1A1A] transition-colors no-underline"
                            >
                              {p.name}
                            </Link>

                            <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-100 dark:border-white/5">
                              <div>
                                <span className="text-xs sm:text-sm font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                                  ${displayPrice.toFixed(2)}
                                </span>
                                {p.sale_price && (
                                  <span className="block text-[10px] text-gray-400 line-through font-mono">
                                    ${originalPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  useCartStore.getState().addItem({
                                    id: Number(p.id),
                                    name: p.name,
                                    price: displayPrice,
                                    image_url: p.image || "/logo.jpg",
                                    quantity: 1,
                                    product: p as any,
                                  });
                                  setPrivacyToast(`បានបន្ថែម "${p.name.slice(0, 20)}..." ទៅក្នុងកន្ត្រក!`);
                                  setTimeout(() => setPrivacyToast(null), 2500);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#8B1A1A]/10 hover:bg-[#8B1A1A] text-[#8B1A1A] hover:text-white text-[11px] font-bold transition-colors cursor-pointer border-none flex items-center gap-1"
                                title="Add to Cart"
                              >
                                <ShoppingCart size={12} />
                                <span>+កន្ត្រក</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 3: Search Query History */}
              {historySubTab === "searches" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        ប្រវត្តិស្វែងរក (Search History - {searchHistory.length} ពាក្យ)
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        ចុចលើពាក្យគន្លឹះដើម្បីស្វែងរកទំនិញភ្លាមៗ
                      </p>
                    </div>
                    {searchHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSearchHistory}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 border-none cursor-pointer transition-all"
                      >
                        <Trash2 size={13} />
                        <span>សម្អាតប្រវត្តិស្វែងរក</span>
                      </button>
                    )}
                  </div>

                  {searchHistory.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-3 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-8">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <Search size={32} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-800 dark:text-gray-200 text-base">
                          មិនទាន់មានប្រវត្តិពាក្យស្វែងរកនៅឡើយទេ
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                          នៅពេលលោកអ្នកស្វែងរកផលិតផលលើ Navbar ឬទំព័រ Search វានឹងត្រូវរក្សាទុកនៅទីនេះ។
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {searchHistory.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => router.push(`/search?q=${encodeURIComponent(item.query)}`)}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#141720] border border-gray-200 dark:border-white/10 hover:border-[#8B1A1A] dark:hover:border-red-400 shadow-xs hover:shadow-sm cursor-pointer transition-all group"
                        >
                          <Search size={14} className="text-gray-400 group-hover:text-[#8B1A1A] transition-colors" />
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-[#8B1A1A]">
                            {item.query}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveSingleSearch(item.query, e)}
                            className="w-4 h-4 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 text-gray-400 hover:text-gray-700 flex items-center justify-center text-[10px] ml-1 border-none bg-transparent cursor-pointer"
                            title="លុបចេញ"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

        {/* ── 4. "You May Also Like" 2-Column Product Grid (Pinduoduo Style) ── */}
        {recommendedProducts.length > 0 && (
          <div className="pt-6 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A] animate-pulse" />
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">You May Also Like</h2>
              </div>
              <Link 
                href="/category/all" 
                className="text-xs font-bold text-[#8B1A1A] dark:text-red-400 hover:underline flex items-center gap-0.5 no-underline"
              >
                <span>View More</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {recommendedProducts.map((p) => {
                const img = p.image_url || p.image || (Array.isArray(p.images) ? p.images[0] : "");
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="flex flex-col p-3 rounded-2xl bg-white dark:bg-[#141720] border border-gray-100 dark:border-white/5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all no-underline group"
                  >
                    <div className="h-36 sm:h-44 w-full bg-gray-50 dark:bg-white/5 rounded-xl overflow-hidden mb-2.5 p-2 flex items-center justify-center relative">
                      {img ? (
                        <img src={img} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                      ) : (
                        <Laptop size={32} className="text-gray-300" />
                      )}
                      {p.badge && (
                        <span className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2 group-hover:text-[#8B1A1A] transition-colors">
                      {p.name}
                    </h3>
                    <div className="mt-auto flex items-baseline justify-between gap-1 pt-1">
                      <div>
                        <div className="text-xs sm:text-sm font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                          {formatUSD(p.sale_price || p.price)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {formatKHR(p.sale_price || p.price)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          useCartStore.getState().addItem({
                            id: Number(p.id),
                            name: p.name,
                            price: Number(p.sale_price || p.price),
                            image_url: img,
                            quantity: 1,
                            product: p,
                          });
                        }}
                        className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center hover:bg-[#8B1A1A] hover:text-white transition-colors cursor-pointer border-none"
                        title="Add to Cart"
                      >
                        <ShoppingCart size={13} />
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5. Prominent Large Sign Out Bar ────────────────────── */}
        <div className="pt-4">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-5 px-6 rounded-3xl border-2 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-extrabold text-base bg-red-50/80 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 shadow-sm hover:shadow-md flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-[0.99]"
          >
            <LogOut size={22} strokeWidth={2.2} />
            <span>Sign Out • ចាកចេញពីគណនី</span>
          </button>
        </div>
      </div>

      {/* ── Large Logout Confirmation Modal (ផ្ទាំង Logout ធំទូលាយ & ច្បាស់លាស់) ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#141722] text-gray-900 dark:text-white rounded-3xl p-6 sm:p-8 border border-red-200/60 dark:border-white/10 shadow-2xl text-center flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Glowing Large Red Icon */}
              <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-950/50 border-2 border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 mb-5 shadow-lg shadow-red-500/10">
                <LogOut size={38} strokeWidth={2.2} />
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                តើបងពិតជាចង់ចាកចេញពីគណនីមែនទេ?
              </h3>

              {/* User Account Details */}
              <div className="w-full bg-gray-50 dark:bg-white/5 rounded-2xl p-3.5 mb-4 border border-gray-100 dark:border-white/5 flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 text-white font-black flex items-center justify-center text-sm shrink-0">
                  {(profile.display_name || user?.displayName || "U")[0].toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {profile.display_name || user?.displayName || "S Tech Member"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || profile.email || profile.phone || "VIP Member"}
                  </div>
                </div>
              </div>

              {/* Informative text */}
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6 px-2">
                រាល់ព័ត៌មានផ្ទាល់ខ្លួន អាសយដ្ឋានដឹកជញ្ជូន ទីតាំង GPS និងកាក់ភក្តីភាព (Loyalty Coins) របស់បង ត្រូវបានរក្សាទុកដោយសុវត្ថិភាពនៅលើ Cloud Database។ បងអាចចូលប្រើប្រាស់វិញបានគ្រប់ពេលវេលា។
              </p>

              {/* Action Buttons */}
              <div className="w-full flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full sm:flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 font-bold text-sm transition-all border border-gray-200/60 dark:border-white/10 cursor-pointer"
                >
                  បោះបង់ / នៅបន្តប្រើប្រាស់ (Cancel)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("stech_user_session");
                    localStorage.removeItem("user_session");
                    localStorage.removeItem("customer_token");
                    document.cookie = "customer_token=; path=/; max-age=0;";
                    signOut(auth);
                    setUser(null);
                    setShowLogoutModal(false);
                    window.dispatchEvent(new Event("user_session_updated"));
                    router.push("/login");
                  }}
                  className="w-full sm:flex-1 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-[#8B1A1A] hover:from-red-700 hover:to-[#6b1111] text-white font-extrabold text-sm transition-all shadow-xl shadow-red-900/30 flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  <LogOut size={18} />
                  <span>បាទ/ចាស ចាកចេញ (Sign Out)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

              <div className="flex gap-2">
                <Link
                  href="/account/wallet"
                  onClick={() => setShowCoinsModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black text-center border-none cursor-pointer no-underline flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
                >
                  <Wallet size={14} />
                  <span>បើកកាបូប & ទទួលកាក់ (Open Wallet)</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowCoinsModal(false)}
                  className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border-none cursor-pointer"
                >
                  បិទ
                </button>
              </div>
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
                    value={newSerialInput}
                    onChange={(e) => setNewSerialInput(e.target.value)}
                    placeholder="e.g. ST-X1C-2026-KH"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Product Model</label>
                  <input
                    type="text"
                    value={newModelInput}
                    onChange={(e) => setNewModelInput(e.target.value)}
                    placeholder="e.g. ThinkPad X1 Carbon Gen 11"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!newSerialInput.trim() || !newModelInput.trim()) {
                    alert("សូមបញ្ចូលលេខ Serial Number និងឈ្មោះម៉ូឌែលផលិតផលបាទ!");
                    return;
                  }
                  const newItem = {
                    id: "war_" + Date.now(),
                    model: newModelInput.trim(),
                    serial: newSerialInput.trim(),
                    registered_at: new Date().toISOString(),
                  };
                  const updated = [newItem, ...registeredWarranties];
                  setRegisteredWarranties(updated);
                  setStats((prev) => ({ ...prev, warranty_items: updated.length }));
                  try {
                    localStorage.setItem("stech_user_warranties_" + (user?.uid || "guest"), JSON.stringify(updated));
                  } catch (e) {}
                  setNewSerialInput("");
                  setNewModelInput("");
                  setShowRmaModal(false);
                  setSaveModal({
                    show: true,
                    success: true,
                    title: "ចុះបញ្ជីធានាជោគជ័យ! 🛡️",
                    message: `ឧបករណ៍ ${newItem.model} (S/N: ${newItem.serial}) ត្រូវបានចុះបញ្ជី និងផ្ទៀងផ្ទាត់ជាមួយប្រព័ន្ធធានាផ្លូវការរបស់ S Tech Store រួចរាល់ហើយ!`,
                  });
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
                      Order #{trackedOrder?.id || (orders[0]?.id || "Live Order")} • Estimated Arrival: <strong className="text-amber-400">15-30 Mins</strong>
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
                        <h4 className="text-sm font-black text-white">S Tech Express Courier (ក្រុមដឹកជញ្ជូន)</h4>
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                          Official Courier
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        S Tech Fast Doorstep Delivery • PassApp Integration
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold mt-1">
                        <span>★ 5.0</span>
                        <span className="text-gray-500 font-normal">(Verified Store Courier)</span>
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

      {/* ── Telegram Companion Bot Linking Modal ───────────────────── */}
      <AnimatePresence>
        {telegramModalOpen && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-[#181a20] rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-white/10 text-center relative overflow-hidden"
            >
              <button
                type="button"
                onClick={() => { setTelegramModalOpen(false); setTelegramPolling(false); }}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>

              {telegramSuccess ? (
                <div className="py-4 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={36} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                      ភ្ជាប់គណនី Telegram ជោគជ័យ ១០០%!
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed px-2">
                      គណនី Telegram របស់អ្នកត្រូវបានភ្ជាប់ជាមួយ <strong className="text-emerald-600 dark:text-emerald-400">{profile.display_name}</strong> រួចរាល់។ រាល់វិក្កយបត្រ Receipts និងការតាមដានទំនិញនឹងត្រូវផ្ញើចូលឆាតនេះដោយស្វ័យប្រវត្តិ។
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setTelegramModalOpen(false); setTelegramSuccess(false); }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer border-none"
                  >
                    រួចរាល់ (Done)
                  </button>
                </div>
              ) : (
                <div className="py-2 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#0088cc] to-sky-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-500/30">
                    <Send size={28} className="rotate-[-20deg]" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                      ភ្ជាប់ Telegram Companion Bot
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ចុចប៊ូតុងខាងក្រោមដើម្បីបើក Bot ក្នុងកម្មវិធី Telegram រួចចុច <strong>START</strong>
                    </p>
                  </div>

                  {telegramDeepLink && (
                    <div className="space-y-3 pt-2">
                      <a
                        href={telegramDeepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-4 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-extrabold transition-all no-underline flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 cursor-pointer"
                      >
                        <Send size={16} />
                        <span>បើកកម្មវិធី Telegram (@{telegramBotUsername})</span>
                        <ExternalLink size={14} />
                      </a>

                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping"></span>
                        <span>កំពុងរង់ចាំលោកអ្នកចុច Start ក្នុង Telegram...</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setTelegramModalOpen(false);
                          setTelegramPolling(false);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                      >
                        <X size={14} />
                        <span>✕ បោះបង់ ឬត្រឡប់ក្រោយ (Cancel & Return)</span>
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 dark:border-white/10 text-[11px] text-gray-400">
                    🔒 ប្រព័ន្ធភ្ជាប់ដោយសុវត្ថិភាពខ្ពស់ ឆាតឯកជនមួយទល់នឹងមួយ (Private 1-on-1 Bot)
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Two-Factor Authentication (2FA) OTP Modal ───────────── */}
      <AnimatePresence>
        {show2faModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-[#141722] text-gray-900 dark:text-white rounded-3xl p-6 sm:p-7 border border-blue-500/30 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setShow2faModal(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                  <ShieldCheck size={36} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    ផ្ទៀងផ្ទាត់លេខកូដសុវត្ថិភាព 2FA
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {otpSentNotice || `លេខកូដសុវត្ថិភាព ៦ ខ្ទង់ ត្រូវបានផ្ញើទៅកាន់អ៊ីមែល ${user?.email || profile.email} និង Telegram របស់អ្នក។`}
                  </p>
                </div>

                {otpError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-bold">
                    {otpError}
                  </div>
                )}

                <form onSubmit={handleVerify2faOtp} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                      បញ្ចូលលេខកូដ OTP (៦ ខ្ទង់)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[12px] text-2xl font-black font-mono py-3.5 px-4 bg-gray-50 dark:bg-black/40 border-2 border-blue-500/30 focus:border-blue-500 rounded-2xl outline-none text-gray-900 dark:text-white transition-all"
                    />
                    <span className="text-[11px] text-gray-400 block mt-1.5">
                      ⏱️ សុពលភាពលេខកូដត្រឹម ១០ នាទី
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShow2faModal(false)}
                      className="flex-1 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all border-none cursor-pointer"
                    >
                      បោះបង់ (Cancel)
                    </button>
                    <button
                      type="submit"
                      disabled={otpLoading || otpInput.length < 4}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold transition-all shadow-lg shadow-blue-500/25 border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {otpLoading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>កំពុងផ្ទៀងផ្ទាត់...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>បញ្ជាក់ & បើក 2FA</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5">
                  មិនបានទទួលលេខកូដ?{" "}
                  <button
                    type="button"
                    onClick={handleToggle2FA}
                    className="text-blue-500 hover:underline font-bold border-none bg-transparent cursor-pointer p-0"
                  >
                    ចុចផ្ញើម្តងទៀត
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Luxury Password Reset Success Modal ─────────────────── */}
      <AnimatePresence>
        {resetSuccessModal && resetSuccessModal.show && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-[#141722] text-gray-900 dark:text-white rounded-3xl p-6 sm:p-7 border border-red-500/30 shadow-2xl text-center space-y-4"
            >
              <button
                type="button"
                onClick={() => setResetSuccessModal(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center mx-auto shadow-md">
                <Lock size={32} />
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  បានផ្ញើតំណភ្ជាប់ Reset Password រួចរាល់! 🔑
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  លិខិតផ្លូវការពី <strong>S Tech Store Cambodia (www.s-tech-store.tech)</strong> ត្រូវបានបញ្ជូនទៅកាន់:
                </p>
                <div className="mt-2 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 font-mono text-xs font-bold text-gray-800 dark:text-gray-200">
                  {resetSuccessModal.email}
                </div>
              </div>

              {resetSuccessModal.resetLink && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-left space-y-1.5">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">
                    🔗 តំណភ្ជាប់ផ្លាស់ប្តូរពាក្យសម្ងាត់ផ្ទាល់ (Direct Link):
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={resetSuccessModal.resetLink}
                      className="w-full text-[11px] font-mono bg-white dark:bg-black/50 p-2 rounded-lg border border-blue-200 dark:border-blue-900/50 outline-none text-gray-700 dark:text-gray-300 truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resetSuccessModal.resetLink || "");
                        setPrivacyToast("បានចម្លងតំណភ្ជាប់ (Copied Link)!");
                        setTimeout(() => setPrivacyToast(null), 2500);
                      }}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 border-none cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-400 leading-relaxed">
                សូមពិនិត្យមើលប្រអប់សំបុត្រ Inbox ឬ Spam ក្នុង Email របស់អ្នក។ តំណភ្ជាប់នេះមានសុពលភាព ៦០ នាទី។
              </p>

              <button
                type="button"
                onClick={() => setResetSuccessModal(null)}
                className="w-full py-3.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6b1111] text-white text-xs font-bold transition-all shadow-md cursor-pointer border-none"
              >
                យល់ព្រម (OK)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Privacy & Notification Toast ────────────────────────── */}
      <AnimatePresence>
        {privacyToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-[100000] px-4 py-3 rounded-2xl bg-gray-900 text-white text-xs font-bold shadow-2xl border border-white/20 flex items-center gap-2.5"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{privacyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
