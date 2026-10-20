"use client";

import { useState, useEffect, useRef } from "react";
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
  CreditCard, Users, MessageSquare, Wallet, Ticket, Headphones, ShieldCheck, ShoppingCart, Star, Search, Trash2, Unlink, Loader2,
  Calendar, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft
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
import {
  getWalletData,
  deleteWalletTransaction,
  clearWalletTransactions,
  WalletTransaction
} from "@/lib/services/wallet.service";

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

interface CambodiaProvinceDetail {
  name: string;
  nameKm: string;
  keys: string[];
  lat: number;
  lng: number;
  isProvincial: boolean;
  courierName: string;
  courierBadge: string;
  courierVehicle: string;
  vehiclePlate: string;
  transitRoute: string;
  speed: string;
  dist: string;
  estTime: string;
}

const CAMBODIA_PROVINCES_REGISTRY: CambodiaProvinceDetail[] = [
  {
    name: "Kampong Cham",
    nameKm: "ខេត្តកំពង់ចាម",
    keys: ["kampong cham", "កំពង់ចាម", "kpc", "kompong cham", "cham"],
    lat: 11.9924,
    lng: 105.4645,
    isProvincial: true,
    courierName: "S Tech Provincial Express • វីរៈ ប៊ុនថាំ (Virak Buntham VET)",
    courierBadge: "VET Express Inter-Province",
    courierVehicle: "Express Delivery Van (ឡានដឹកទំនិញរហ័ស VET #ST-88)",
    vehiclePlate: "ភ្នំពេញ 2B-6689 (GPS Active)",
    transitRoute: "Phnom Penh Central Distribution Hub → ផ្លូវជាតិលេខ ៧ → ស្ពានគីហ្សូណា → ក្រុងកំពង់ចាម",
    speed: "65 km/h",
    dist: "124 km (ឆ្លងកាត់ស្ពានគីហ្សូណា)",
    estTime: "ថ្ងៃនេះ (Today ~ 2-3 ម៉ោង)",
  },
  {
    name: "Siem Reap",
    nameKm: "ខេត្តសៀមរាប",
    keys: ["siem reap", "សៀមរាប", "sr"],
    lat: 13.3633,
    lng: 103.8564,
    isProvincial: true,
    courierName: "S Tech Provincial Express • Virak Buntham / J&T",
    courierBadge: "Inter-Province Priority",
    courierVehicle: "Express Delivery Van (ឡានដឹកទំនិញរហ័ស)",
    vehiclePlate: "ភ្នំពេញ 2C-1192",
    transitRoute: "Phnom Penh Central Hub → ផ្លូវជាតិលេខ ៦ → សាខាក្រុងសៀមរាប",
    speed: "70 km/h",
    dist: "314 km",
    estTime: "ថ្ងៃនេះ (Today ~ 4-5 ម៉ោង)",
  },
  {
    name: "Battambang",
    nameKm: "ខេត្តបាត់ដំបង",
    keys: ["battambang", "បាត់ដំបង", "btb"],
    lat: 13.0957,
    lng: 103.2022,
    isProvincial: true,
    courierName: "S Tech Provincial Express • Virak Buntham",
    courierBadge: "Inter-Province Priority",
    courierVehicle: "Express Delivery Van",
    vehiclePlate: "ភ្នំពេញ 2A-8831",
    transitRoute: "Phnom Penh Central Hub → ផ្លូវជាតិលេខ ៥ → សាខាបាត់ដំបង",
    speed: "68 km/h",
    dist: "292 km",
    estTime: "ថ្ងៃនេះ (Today ~ 4-5 ម៉ោង)",
  },
  {
    name: "Preah Sihanouk",
    nameKm: "ខេត្តព្រះសីហនុ",
    keys: ["sihanoukville", "ព្រះសីហនុ", "កំពង់សោម", "kampong som", "shv"],
    lat: 10.6275,
    lng: 103.5221,
    isProvincial: true,
    courierName: "S Tech Express • Expressway Fast Transit",
    courierBadge: "Expressway Transit",
    courierVehicle: "Fast Van (ផ្លូវល្បឿនលឿនភ្នំពេញ-ព្រះសីហនុ)",
    vehiclePlate: "ភ្នំពេញ 2X-7749",
    transitRoute: "Phnom Penh Central Hub → ផ្លូវល្បឿនលឿន (PP-SHV) → ក្រុងព្រះសីហនុ",
    speed: "95 km/h",
    dist: "187 km",
    estTime: "ថ្ងៃនេះ (Today ~ 2 ម៉ោង)",
  },
  {
    name: "Kandal",
    nameKm: "ខេត្តកណ្តាល",
    keys: ["kandal", "កណ្តាល", "តាខ្មៅ", "ta khmau", "takhmao"],
    lat: 11.4554,
    lng: 104.9547,
    isProvincial: false,
    courierName: "S Tech Fast Courier • PassApp Delivery",
    courierBadge: "PassApp Live",
    courierVehicle: "Honda Wave 125i (ម៉ូតូដឹកទំនិញ PassApp Express)",
    vehiclePlate: "ភ្នំពេញ 1JC-8924",
    transitRoute: "S Tech Central Flagship Store → ផ្លូវតាខ្មៅ → ដល់មាត់ទ្វារផ្ទះ",
    speed: "40 km/h",
    dist: "8.5 km",
    estTime: "30-45 នាទី",
  },
  {
    name: "Phnom Penh",
    nameKm: "រាជធានីភ្នំពេញ",
    keys: ["phnom penh", "ភ្នំពេញ", "pp", "chamkarmon", "daun penh", "tuol kouk", "sensok", "chroy changvar", "russey keo", "meanchey", "boeng keng kang", "por senchey"],
    lat: 11.5564,
    lng: 104.9282,
    isProvincial: false,
    courierName: "S Tech Fast Courier • PassApp Delivery",
    courierBadge: "PassApp Live",
    courierVehicle: "Honda Wave 125i (ម៉ូតូដឹកទំនិញ PassApp Express)",
    vehiclePlate: "ភ្នំពេញ 1JC-8924",
    transitRoute: "S Tech Central Flagship Store → ផ្លូវកណ្តាលរាជធានី → ដល់មាត់ទ្វារផ្ទះ",
    speed: "35 km/h",
    dist: "2.4 km",
    estTime: "15-30 នាទី",
  },
];

const resolveDeliveryLocation = (order: any, prof: ProfileData): {
  info: CambodiaProvinceDetail;
  lat: number;
  lng: number;
  destinationText: string;
} => {
  const combined = `${order?.shipping_address || ""} ${order?.customer_city || ""} ${prof?.address || ""} ${prof?.city || ""} ${prof?.khan || ""}`.toLowerCase();

  const realLat = order?.gps_lat || prof?.gps_lat;
  const realLng = order?.gps_lng || prof?.gps_lng;
  const hasRealGps = Boolean(realLat && realLat !== 0 && realLng && realLng !== 0);

  // Match province
  let matched = CAMBODIA_PROVINCES_REGISTRY.find((p) =>
    p.keys.some((k) => combined.includes(k))
  );

  // If real GPS near Kampong Cham (11.8 - 12.3 lat, 105.1 - 105.8 lng)
  if (!matched && hasRealGps && realLat && realLng) {
    if (realLat >= 11.8 && realLat <= 12.3 && realLng >= 105.1 && realLng <= 105.8) {
      matched = CAMBODIA_PROVINCES_REGISTRY[0]; // Kampong Cham
    }
  }

  // Fallback check for Kampong Cham if user email / username is MMO KPC, mmokompongcham, etc.
  if (!matched && (combined.includes("kpc") || combined.includes("cham") || combined.includes("កំពង់ចាម") || (prof?.email && prof.email.includes("kompongcham")))) {
    matched = CAMBODIA_PROVINCES_REGISTRY[0]; // Kampong Cham
  }

  // Fallback to Kampong Cham if user's city/address has Kampong Cham or default to Phnom Penh
  if (!matched) {
    matched = CAMBODIA_PROVINCES_REGISTRY[CAMBODIA_PROVINCES_REGISTRY.length - 1]; // Phnom Penh
  }

  const finalLat = (hasRealGps && realLat) ? realLat : matched.lat;
  const finalLng = (hasRealGps && realLng) ? realLng : matched.lng;

  const destinationText = order?.shipping_address || prof?.address || `${matched.nameKm} (ទីរួមខេត្ត)`;

  return {
    info: matched,
    lat: finalLat,
    lng: finalLng,
    destinationText,
  };
};

const getDeliveryTimeline = (orderCreatedAt: string | undefined | null, isProvincial: boolean, destName: string) => {
  const base = orderCreatedAt ? new Date(orderCreatedAt) : new Date();
  const validBase = isNaN(base.getTime()) ? new Date() : base;

  const t1 = new Date(validBase.getTime()).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", hour12: true });
  const t2 = new Date(validBase.getTime() + 14 * 60000).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", hour12: true });
  const t3 = new Date(validBase.getTime() + 32 * 60000).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", hour12: true });
  const t4 = isProvincial
    ? new Date(validBase.getTime() + 180 * 60000).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", hour12: true })
    : new Date(validBase.getTime() + 50 * 60000).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", hour12: true });

  return [
    {
      title: "បានបញ្ជាក់ការកុម្ម៉ង់ & ទូទាត់ជោគជ័យ",
      subtitle: `បានផ្ទៀងផ្ទាត់ដោយស្វ័យប្រវត្ត (${t1})`,
      status: "done",
    },
    {
      title: "វេចខ្ចប់ & ពិនិត្យ QC នៅ S Tech Flagship Hub",
      subtitle: `វេចខ្ចប់ការពារប៉ះទង្គិច ៣ ជាន់ (${t2})`,
      status: "done",
    },
    {
      title: isProvincial
        ? `ចេញដំណើរពីភ្នំពេញ ឆ្ពោះទៅកាន់ ${destName}`
        : "អ្នកដឹកជញ្ជូន PassApp ទទួលកញ្ចប់ & កំពុងធ្វើដំណើរ",
      subtitle: isProvincial
        ? `កំពុងធ្វើដំណើរតាមផ្លូវជាតិលេខ ៧ (${t3})`
        : `កាត់តាមផ្លូវកណ្តាលរាជធានី (${t3})`,
      status: "active",
    },
    {
      title: `ទៅដល់ទីតាំងទទួលទំនិញរបស់អ្នកនៅ ${destName}`,
      subtitle: isProvincial
        ? `ប៉ាន់ស្មានមកដល់ក្នុងរង្វង់ ~ ${t4} (ថ្ងៃនេះ)`
        : `ប៉ាន់ស្មានមកដល់ក្នុងរង្វង់ ~ ${t4} (15-30 នាទី)`,
      status: "pending",
    },
  ];
};

const PRESET_AVATARS = [
  { label: "Pro Gamer", url: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=160&q=80" },
  { label: "Tech Lead", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&q=80" },
  { label: "Digital Creator", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=80" },
  { label: "Security Pro", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&q=80" },
  { label: "VIP Executive", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&q=80" },
];

const FONT_SYSTEMS = [
  { id: "noto-sans", name: "Noto Sans Khmer (Modern Professional • Recommended)", sample: "ហាងកុំព្យូទ័រ អេស តិច ស្ត័រ (S Tech Store)" },
  { id: "koh-santepheap", name: "Koh Santepheap (Clean Khmer)", sample: "គុណភាពស្តង់ដារ និងការធានាផ្លូវការ" },
  { id: "battambang", name: "Battambang (Classic Khmer)", sample: "ទំនុកចិត្ត គុណភាព និងតម្លៃសមរម្យ" },
  { id: "inter", name: "Modern Inter / English First", sample: "S Tech Store Cambodia 2026" },
];

const TABS = [
  { key: "profile", label: "Profile Info", desc: "Personal info & bio", icon: User },
  { key: "address", label: "Delivery Address", desc: "Location & GPS Pin", icon: MapPin },
  { key: "security", label: "Security & Devices", desc: "2FA, Passwords & Sessions", icon: Shield },
  { key: "preferences", label: "Preferences & Updates", desc: "Language, fonts & theme", icon: Settings },
  { key: "warranty", label: "Warranty & Hardware", desc: "Official RMA & Devices", icon: Cpu },
  { key: "orders", label: "History & Activities", desc: "Orders, Viewed Items & Searches", icon: History },
];

const OFFICIAL_CUSTOMER_BOT = "S_TECH_ASSISTANTBOT";

const sanitizeTgBot = (username?: string | null): string => {
  return OFFICIAL_CUSTOMER_BOT;
};

const sanitizeTgDeepLink = (link?: string | null, token?: string | null): string => {
  return `https://t.me/${OFFICIAL_CUSTOMER_BOT}${token ? `?start=${token}` : ""}`;
};

const sanitizeTgAppLink = (link?: string | null, token?: string | null): string => {
  return `tg://resolve?domain=${OFFICIAL_CUSTOMER_BOT}${token ? `&start=${token}` : ""}`;
};

export default function UserProfilePage() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<FirebaseUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const sessionStr = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
        if (sessionStr) {
          const sUser = JSON.parse(sessionStr);
          const uid = sUser?.firebase_uid || sUser?.uid || (sUser?.id ? `tg_${sUser.id}` : null);
          if (uid) {
            return {
              uid: uid,
              displayName: sUser.display_name || sUser.name || "S Tech Member",
              email: sUser.email,
              photoURL: sUser.photo_url || sUser.avatar,
            } as any;
          }
        }
      } catch (e) {}
    }
    return null;
  });
  const [mounted, setMounted] = useState(false);
  const [profileLoading, setProfileLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("stech_cached_user_profile");
        if (cached) return false;
      } catch (e) {}
    }
    return true;
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingTheme, setIsSwitchingTheme] = useState(false);
  const [themeNotice, setThemeNotice] = useState<string | null>(null);

  const handleSwitchTheme = (newTheme: "light" | "dark" | "system") => {
    if (newTheme === theme) return;
    setIsSwitchingTheme(true);
    const label = newTheme === "dark" ? "Dark Mode (ងងឹត)" : newTheme === "light" ? "Light Mode (ពន្លឺ)" : "System Mode (ស្វ័យប្រវត្តិ)";
    setThemeNotice(`កំពុងប្តូរទៅកាន់ ${label}...`);
    setTheme(newTheme);
    setTimeout(() => {
      setIsSwitchingTheme(false);
      setTimeout(() => setThemeNotice(null), 1200);
    }, 380);
  };

  const [saveModal, setSaveModal] = useState<{ show: boolean; success: boolean; title: string; message: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("stech_cached_user_profile");
        if (cached) {
          const p = JSON.parse(cached);
          if (p.photo_url) return p.photo_url;
        }
        const sessionStr = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
        if (sessionStr) {
          const sUser = JSON.parse(sessionStr);
          if (sUser.photo_url || sUser.avatar) return sUser.photo_url || sUser.avatar;
        }
      } catch (e) {}
    }
    return null;
  });
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
  const [telegramBotUsername, setTelegramBotUsername] = useState<string>("S_TECH_ASSISTANTBOT");
  const [telegramPolling, setTelegramPolling] = useState(false);
  const [telegramSuccess, setTelegramSuccess] = useState(false);
  const [telegramUnlinking, setTelegramUnlinking] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const openedTgTabRef = useRef<Window | null>(null);

  // History Sub-Tabs & Activity Tracking (Orders, Viewed Products, Searches, Ledger)
  const [historySubTab, setHistorySubTab] = useState<"orders" | "viewed" | "searches" | "ledger">("orders");
  const [viewedProducts, setViewedProducts] = useState<ViewedProduct[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [profileWalletTx, setProfileWalletTx] = useState<WalletTransaction[]>([]);
  const [profileWalletTxLoading, setProfileWalletTxLoading] = useState(false);
  const [profileWalletTxVisibleCount, setProfileWalletTxVisibleCount] = useState(10);
  const [profileWalletTxSearchDate, setProfileWalletTxSearchDate] = useState("");
  const [profileWalletTxSearchKeyword, setProfileWalletTxSearchKeyword] = useState("");
  const [profileWalletTxDatePreset, setProfileWalletTxDatePreset] = useState<"all" | "today" | "7days" | "30days">("all");
  const [profileWalletTxFilter, setProfileWalletTxFilter] = useState<"all" | "deposit" | "reward" | "purchase">("all");
  const [profileWalletTxDeletingId, setProfileWalletTxDeletingId] = useState<number | null>(null);
  const [profileWalletTxClearing, setProfileWalletTxClearing] = useState(false);

  // 2FA OTP Security Verification State
  const [show2faModal, setShow2faModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSentNotice, setOtpSentNotice] = useState("");
  const [otpTargetAction, setOtpTargetAction] = useState<"enable" | "disable">("enable");
  const [otpChannel, setOtpChannel] = useState<"telegram" | "email">("telegram");
  const [otpErrorType, setOtpErrorType] = useState<string | null>(null);
  const [otpBotUsername, setOtpBotUsername] = useState<string>("S_TECH_ASSISTANTBOT");
  const [otpDeepLink, setOtpDeepLink] = useState<string | null>(null);
  const [otpHasEmail, setOtpHasEmail] = useState<boolean>(false);

  // Luxury Password Reset Alert State (https://www.s-tech-store.tech)
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetChannelModal, setShowResetChannelModal] = useState(false);
  const [resetSuccessModal, setResetSuccessModal] = useState<{
    show: boolean;
    channel?: "telegram" | "email";
    email?: string;
    telegramUsername?: string;
    telegramChatId?: string;
    resetLink?: string;
  } | null>(null);

  // Real Gmail Verification State
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerifySent, setEmailVerifySent] = useState(false);
  const [emailVerifyOtp, setEmailVerifyOtp] = useState("");
  const [emailVerifyModal, setEmailVerifyModal] = useState(false);
  const [emailVerifyError, setEmailVerifyError] = useState("");
  const [emailVerifySuccess, setEmailVerifySuccess] = useState(false);

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
  const {
    currentVersion,
    hasUpdate,
    updateInfo,
    isChecking,
    isUpdating,
    checkForUpdates,
    applyUpdate,
    openUpdateModal,
  } = useUpdateStore();
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);

  // 100% Real cloud data from Neon PostgreSQL / Laravel API with Instant Local-First Hydration
  const [profile, setProfile] = useState<ProfileData>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("stech_cached_user_profile");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            return {
              display_name: parsed.display_name || "",
              email: parsed.email || "",
              phone: parsed.phone || "",
              address: parsed.address || "",
              city: parsed.city || "Phnom Penh",
              khan: parsed.khan || "",
              telegram: parsed.telegram || "",
              telegram_chat_id: parsed.telegram_chat_id,
              profession: parsed.profession || "",
              gender: parsed.gender || "",
              birthday: parsed.birthday || "",
              delivery_notes: parsed.delivery_notes || "",
              two_fa_enabled: Boolean(parsed.two_fa_enabled),
              notif_orders: parsed.notif_orders ?? true,
              notif_promos: parsed.notif_promos ?? true,
              notif_builds: parsed.notif_builds ?? true,
              notif_telegram: parsed.notif_telegram ?? true,
              points: Number(parsed.points || 0),
              created_at: parsed.created_at || "",
              gps_lat: parsed.gps_lat,
              gps_lng: parsed.gps_lng,
              photo_url: parsed.photo_url,
              firebase_uid: parsed.firebase_uid,
              provider: parsed.provider,
            };
          }
        }
        const sess = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
        if (sess) {
          const parsed = JSON.parse(sess);
          const uid = parsed?.firebase_uid || parsed?.uid || (parsed?.id ? String(parsed.id) : "");
          return {
            display_name: parsed.display_name || parsed.name || "",
            email: parsed.email || "",
            phone: parsed.phone || "",
            address: parsed.address || "",
            city: parsed.city || "Phnom Penh",
            khan: parsed.khan || "",
            telegram: parsed.telegram || parsed.username || "",
            telegram_chat_id: parsed.telegram_chat_id || parsed.telegram_id,
            profession: parsed.profession || "",
            gender: parsed.gender || "",
            birthday: parsed.birthday || "",
            delivery_notes: parsed.delivery_notes || "",
            two_fa_enabled: Boolean(parsed.two_fa_enabled),
            notif_orders: true,
            notif_promos: true,
            notif_builds: true,
            notif_telegram: true,
            points: Number(parsed.points || 0),
            created_at: parsed.created_at || "",
            gps_lat: parsed.gps_lat,
            gps_lng: parsed.gps_lng,
            photo_url: parsed.photo_url || parsed.avatar,
            firebase_uid: uid,
            provider: parsed.provider,
          };
        }
      } catch (e) {}
    }
    return {
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
    };
  });

  const [stats, setStats] = useState(() => {
    let cachedBalance = 0;
    let cachedPoints = 0;
    if (typeof window !== "undefined") {
      try {
        const wRaw = localStorage.getItem("stech_cached_wallet");
        if (wRaw) {
          const w = JSON.parse(wRaw);
          if (w.balance !== undefined) cachedBalance = Number(w.balance);
          if (w.coins !== undefined) cachedPoints = Number(w.coins);
        }
        const sRaw = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
        if (sRaw) {
          const s = JSON.parse(sRaw);
          if (cachedBalance === 0 && s.wallet_balance !== undefined) cachedBalance = Number(s.wallet_balance);
          if (cachedPoints === 0 && s.points !== undefined) cachedPoints = Number(s.points);
        }
      } catch (e) {}
    }
    return {
      orders: 0,
      wishlist: 0,
      points: cachedPoints,
      wallet_balance: cachedBalance,
      warranty_items: 0,
      unread_notifications: 0,
    };
  });

  const [orders, setOrders] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("stech_cached_orders");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "processing" | "packing" | "shipped" | "completed">("all");
  const [visibleOrderCount, setVisibleOrderCount] = useState<number>(8);

  const { lang } = useLangStore();
  const t = translations[lang].profilePage;
  const tNav = translations[lang].nav;
  const wishlistCount = useWishlistStore((s) => s.getTotalItems());

  const loadProfileWalletTx = async () => {
    setProfileWalletTxLoading(true);
    try {
      const data = await getWalletData();
      setProfileWalletTx(data.transactions || []);
    } catch (_) {}
    finally {
      setProfileWalletTxLoading(false);
    }
  };

  const handleDeleteProfileWalletTx = async (id: number) => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបប្រវត្តិប្រតិបត្តិការនេះចេញពី Ledger មែនទេ? (Delete this transaction record?)")) {
      return;
    }
    setProfileWalletTxDeletingId(id);
    try {
      await deleteWalletTransaction(id);
      setProfileWalletTx((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || "មិនអាចលុបប្រតិបត្តិការបានទេ");
    } finally {
      setProfileWalletTxDeletingId(null);
    }
  };

  const handleClearAllProfileWalletTx = async () => {
    if (!window.confirm("តើអ្នកពិតជាចង់សម្អាតប្រវត្តិប្រតិបត្តិការទាំងអស់មែនទេ? (Clear all transaction history?)")) {
      return;
    }
    setProfileWalletTxClearing(true);
    try {
      await clearWalletTransactions();
      setProfileWalletTx([]);
    } catch (err: any) {
      alert(err.response?.data?.message || "មិនអាចសម្អាតបានទេ");
    } finally {
      setProfileWalletTxClearing(false);
    }
  };

  const filteredProfileWalletTx = profileWalletTx.filter((tx) => {
    if (profileWalletTxFilter === "deposit" && tx.type !== "deposit") return false;
    if (profileWalletTxFilter === "reward" && tx.type !== "coin_reward" && tx.type !== "coin_redeem") return false;
    if (profileWalletTxFilter === "purchase" && tx.type !== "purchase") return false;

    if (profileWalletTxSearchDate) {
      const txDate = new Date(tx.created_at).toISOString().slice(0, 10);
      if (txDate !== profileWalletTxSearchDate) return false;
    } else if (profileWalletTxDatePreset !== "all") {
      const txTime = new Date(tx.created_at).getTime();
      const now = Date.now();
      if (profileWalletTxDatePreset === "today") {
        const todayStr = new Date().toISOString().slice(0, 10);
        const txDate = new Date(tx.created_at).toISOString().slice(0, 10);
        if (txDate !== todayStr) return false;
      } else if (profileWalletTxDatePreset === "7days") {
        if (now - txTime > 7 * 24 * 3600 * 1000) return false;
      } else if (profileWalletTxDatePreset === "30days") {
        if (now - txTime > 30 * 24 * 3600 * 1000) return false;
      }
    }

    if (profileWalletTxSearchKeyword.trim()) {
      const kw = profileWalletTxSearchKeyword.toLowerCase();
      const desc = (tx.description || "").toLowerCase();
      const ref = (tx.reference_id || "").toLowerCase();
      const amount = String(tx.amount || "");
      if (!desc.includes(kw) && !ref.includes(kw) && !amount.includes(kw)) {
        return false;
      }
    }

    return true;
  });

  const displayedProfileWalletTx = filteredProfileWalletTx.slice(0, profileWalletTxVisibleCount);
  const hasMoreProfileWalletTx = filteredProfileWalletTx.length > profileWalletTxVisibleCount;

  useEffect(() => {
    setMounted(true);

    const syncProfileSession = () => {
      const sessionStr = typeof window !== "undefined"
        ? (localStorage.getItem("stech_user_session") || localStorage.getItem("user_session"))
        : null;
      if (sessionStr) {
        try {
          const sUser = JSON.parse(sessionStr);
          const cleanTgId = sUser?.telegram_id || sUser?.telegram_chat_id || (typeof sUser?.uid === "string" && sUser.uid.startsWith("tg_") ? sUser.uid.replace("tg_", "") : null);
          const uid = sUser?.firebase_uid || sUser?.uid || (cleanTgId ? `tg_${cleanTgId}` : (sUser?.id ? `stech_u_${sUser.id}` : null));
          if (uid) {
            const pseudoUser = {
              uid: uid,
              displayName: sUser.display_name || sUser.name || "S Tech Member",
              email: sUser.email,
              photoURL: sUser.photo_url || sUser.avatar_url || sUser.avatar,
            } as any;
            setUser(pseudoUser);
            if (sUser.photo_url || sUser.avatar_url || sUser.avatar) {
              setAvatarPreview(sUser.photo_url || sUser.avatar_url || sUser.avatar);
            }

            try {
              const cached = localStorage.getItem("stech_cached_user_profile");
              if (cached) {
                const p = JSON.parse(cached);
                const cachedUid = p?.firebase_uid || p?.uid;
                if (!cachedUid || cachedUid === uid) {
                  setProfile((prev) => ({
                    ...prev,
                    ...p,
                    firebase_uid: uid,
                    provider: sUser.provider || (uid.startsWith("tg_") ? "telegram" : p.provider || prev.provider),
                    display_name: sUser.display_name || sUser.name || p.display_name || prev.display_name || "S Tech Member",
                    email: sUser.email || p.email || prev.email,
                    phone: sUser.phone || p.phone || prev.phone,
                    photo_url: sUser.photo_url || sUser.avatar_url || sUser.avatar || p.photo_url || prev.photo_url,
                    telegram: sUser.telegram || p.telegram || prev.telegram,
                    telegram_chat_id: sUser.telegram_chat_id || sUser.telegram_id || p.telegram_chat_id || prev.telegram_chat_id,
                  }));
                } else {
                  localStorage.removeItem("stech_cached_user_profile");
                  setProfile((prev) => ({
                    ...prev,
                    firebase_uid: uid,
                    provider: sUser.provider || (uid.startsWith("tg_") ? "telegram" : prev.provider),
                    display_name: sUser.display_name || sUser.name || "S Tech Member",
                    email: sUser.email || "",
                    phone: sUser.phone || "",
                    photo_url: sUser.photo_url || sUser.avatar_url || sUser.avatar,
                    telegram: sUser.telegram || "",
                    telegram_chat_id: sUser.telegram_chat_id || sUser.telegram_id,
                  }));
                }
                setProfileLoading(false);
              } else {
                setProfile((prev) => ({
                  ...prev,
                  firebase_uid: uid,
                  provider: sUser.provider || (uid.startsWith("tg_") ? "telegram" : prev.provider),
                  display_name: sUser.display_name || sUser.name || prev.display_name || "S Tech Member",
                  email: sUser.email || prev.email,
                  phone: sUser.phone || prev.phone,
                  photo_url: sUser.photo_url || sUser.avatar_url || sUser.avatar || prev.photo_url,
                  telegram: sUser.telegram || prev.telegram,
                  telegram_chat_id: sUser.telegram_chat_id || sUser.telegram_id || prev.telegram_chat_id,
                }));
              }
            } catch (e) {}

            loadProfile(pseudoUser);
            loadOrders();
            loadProfileWalletTx();
            return true;
          }
        } catch (e) {}
      }
      return false;
    };

    const unsub = onAuthStateChanged(auth, (u) => {
      // Check if active local session is Telegram
      const sessionStr = typeof window !== "undefined"
        ? (localStorage.getItem("stech_user_session") || localStorage.getItem("user_session"))
        : null;
      let activeLocalUser: any = null;
      try { if (sessionStr) activeLocalUser = JSON.parse(sessionStr); } catch (_) {}
      const isTelegramActive = activeLocalUser && (
        activeLocalUser.provider === "telegram" ||
        (typeof activeLocalUser.firebase_uid === "string" && activeLocalUser.firebase_uid.startsWith("tg_")) ||
        (typeof activeLocalUser.uid === "string" && activeLocalUser.uid.startsWith("tg_"))
      );

      // If active session is Telegram, DO NOT let Firebase Google account overwrite it!
      if (isTelegramActive) {
        return;
      }

      if (u) {
        setUser(u);
        try {
          const cached = localStorage.getItem("stech_cached_user_profile");
          if (cached) {
            const p = JSON.parse(cached);
            setProfile((prev) => ({
              ...prev,
              ...p,
              firebase_uid: u.uid,
              display_name: u.displayName || p.display_name || prev.display_name,
              email: u.email || p.email || prev.email,
            }));
            if (p.photo_url) setAvatarPreview(p.photo_url);
            setProfileLoading(false);
          } else {
            setProfile((prev) => ({
              ...prev,
              firebase_uid: u.uid,
              display_name: u.displayName || prev.display_name || "S Tech Member",
              email: u.email || prev.email,
            }));
          }
        } catch (e) {
          setProfile((prev) => ({
            ...prev,
            firebase_uid: u.uid,
            display_name: u.displayName || prev.display_name || "S Tech Member",
            email: u.email || prev.email,
          }));
        }
        loadProfile(u);
        loadOrders();
        loadProfileWalletTx();
      } else {
        const found = syncProfileSession();
        if (!found) {
          router.push("/login");
        }
      }
    });

    window.addEventListener("user_session_updated", syncProfileSession);
    const handleWalletUpdated = (e: any) => {
      if (e?.detail) {
        setStats((prev) => ({
          ...prev,
          wallet_balance: e.detail.balance !== undefined ? Number(e.detail.balance) : prev.wallet_balance,
          points: e.detail.coins !== undefined ? Number(e.detail.coins) : prev.points,
        }));
        loadProfileWalletTx();
      }
    };
    window.addEventListener("stech_wallet_updated", handleWalletUpdated);

    return () => {
      unsub();
      window.removeEventListener("user_session_updated", syncProfileSession);
      window.removeEventListener("stech_wallet_updated", handleWalletUpdated);
    };
  }, []);

  const loadProfile = async (currentUser?: FirebaseUser) => {
    try {
      const res = await api.get("/user/profile");
      if (res.data?.profile) {
        setProfile((prev) => {
          const updated = {
            ...prev,
            ...res.data.profile,
            photo_url: res.data.profile.photo_url || prev.photo_url,
          };
          try {
            localStorage.setItem("stech_cached_user_profile", JSON.stringify(updated));
            const hasTg = Boolean(
              updated.telegram_chat_id ||
              (updated.telegram && updated.telegram.trim() !== "") ||
              updated.provider === "telegram" ||
              updated.firebase_uid?.startsWith("tg_")
            );
            if (hasTg) {
              localStorage.setItem("stech_telegram_connected", "true");
            } else {
              localStorage.removeItem("stech_telegram_connected");
            }
          } catch (e) {}
          return updated;
        });
        if (res.data.profile.photo_url) {
          setAvatarPreview(res.data.profile.photo_url);
        }
      }
      if (res.data?.stats) {
        setStats((prev) => ({ ...prev, ...res.data.stats }));
        try {
          const cached = JSON.parse(localStorage.getItem("stech_cached_wallet") || "{}");
          localStorage.setItem("stech_cached_wallet", JSON.stringify({
            ...cached,
            balance: res.data.stats.wallet_balance ?? cached.balance,
            coins: res.data.stats.points ?? cached.coins,
          }));
        } catch (e) {}
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
    } finally {
      setProfileLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get("/user/orders");
      const list = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
      setOrders(list);
      setStats((prev) => ({ ...prev, orders: list.length }));
      try {
        localStorage.setItem("stech_cached_orders", JSON.stringify(list));
      } catch (e) {}
    } catch (e) {
      // Keep existing cached orders on temporary error
    } finally {
      setOrdersLoading(false);
    }
  };

  const isTelegramConnected = Boolean(
    profile.telegram_chat_id ||
    (profile.telegram && profile.telegram.trim() !== "") ||
    profile.provider === "telegram" ||
    profile.firebase_uid?.startsWith("tg_") ||
    user?.uid?.startsWith("tg_") ||
    (typeof window !== "undefined" && (
      localStorage.getItem("stech_telegram_connected") === "true" ||
      (() => {
        try {
          const s = JSON.parse(localStorage.getItem("stech_user_session") || localStorage.getItem("user_session") || "{}");
          return Boolean(
            s.telegram_chat_id ||
            s.telegram_id ||
            s.telegram ||
            s.provider === "telegram" ||
            (s.firebase_uid && s.firebase_uid.startsWith("tg_")) ||
            (s.id && String(s.id).startsWith("tg_"))
          );
        } catch { return false; }
      })()
    ))
  );

  const effectiveTelegramHandle = (
    profile.telegram ||
    (typeof window !== "undefined" ? (() => {
      try {
        const s = JSON.parse(localStorage.getItem("stech_user_session") || localStorage.getItem("user_session") || "{}");
        return s.telegram || s.username || "";
      } catch { return ""; }
    })() : "")
  );

  const effectiveTelegramChatId = (
    profile.telegram_chat_id ||
    (typeof window !== "undefined" ? (() => {
      try {
        const s = JSON.parse(localStorage.getItem("stech_user_session") || localStorage.getItem("user_session") || "{}");
        return s.telegram_chat_id || s.telegram_id || (s.id && String(s.id).startsWith("tg_") ? String(s.id).slice(3) : undefined);
      } catch { return undefined; }
    })() : undefined)
  );

  const isTelegramAuthUser = Boolean(
    isTelegramConnected && (
      profile.provider === "telegram" ||
      profile.firebase_uid?.startsWith("tg_") ||
      user?.uid?.startsWith("tg_") ||
      (typeof window !== "undefined" && (
        (() => {
          try {
            const s1 = JSON.parse(localStorage.getItem("user_session") || "{}");
            const s2 = JSON.parse(localStorage.getItem("stech_user_session") || "{}");
            return Boolean(
              (s1?.provider === "telegram" && (s1?.telegram_id || s1?.telegram)) ||
              (s2?.provider === "telegram" && (s2?.telegram_id || s2?.telegram)) ||
              (s1?.firebase_uid && s1.firebase_uid.startsWith("tg_")) ||
              (s2?.firebase_uid && s2.firebase_uid.startsWith("tg_"))
            );
          } catch { return false; }
        })()
      ))
    )
  );

  // Load persisted font preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("stech_font_system");
      const savedFont = (!saved || saved === "kantumruy") ? "noto-sans" : saved;
      setSelectedFont(savedFont);
      document.documentElement.setAttribute("data-font", savedFont);
    } catch (e) {}
  }, []);

  const handleSelectFont = (fontId: string) => {
    if (fontId === selectedFont) return;
    setIsSwitchingTheme(true);
    const fontObj = FONT_SYSTEMS.find((f) => f.id === fontId);
    const fontName = fontObj?.name || fontId;
    setThemeNotice(`កំពុងប្តូរពុម្ពអក្សរទៅកាន់ ${fontName}...`);
    setSelectedFont(fontId);
    try {
      localStorage.setItem("stech_font_system", fontId);
      document.documentElement.setAttribute("data-font", fontId);
    } catch (e) {}
    setTimeout(() => {
      setIsSwitchingTheme(false);
      setTimeout(() => setThemeNotice(null), 1200);
    }, 380);
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
      const cleanEmail = profile.email?.trim() || "";
      const res = await api.put("/user/profile", {
        display_name: profile.display_name,
        email: cleanEmail,
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

      if (res.data?.profile) {
        const updated = {
          ...profile,
          ...res.data.profile,
          email: res.data.profile.email || cleanEmail || profile.email,
        };
        setProfile(updated);
        try {
          localStorage.setItem("stech_cached_user_profile", JSON.stringify(updated));
          const hasTg = Boolean(
            updated.telegram_chat_id ||
            (updated.telegram && updated.telegram.trim() !== "") ||
            updated.provider === "telegram" ||
            updated.firebase_uid?.startsWith("tg_")
          );
          if (hasTg) {
            localStorage.setItem("stech_telegram_connected", "true");
          } else {
            localStorage.removeItem("stech_telegram_connected");
          }
          const sessStr = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
          if (sessStr) {
            const sessObj = JSON.parse(sessStr);
            if (res.data.profile.email) sessObj.email = res.data.profile.email;
            if (res.data.profile.display_name) sessObj.display_name = res.data.profile.display_name;
            if (res.data.profile.telegram) sessObj.telegram = res.data.profile.telegram;
            if (res.data.profile.phone) sessObj.phone = res.data.profile.phone;
            localStorage.setItem("stech_user_session", JSON.stringify(sessObj));
            localStorage.setItem("user_session", JSON.stringify(sessObj));
            window.dispatchEvent(new Event("user_session_updated"));
          }
        } catch (e) {}
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);

      setSaveModal({
        show: true,
        success: true,
        title: "Profile Saved Successfully! ✅",
        message: "All personal details, real Gmail contact, delivery address, and GPS coordinates have been saved directly to PostgreSQL cloud database.",
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
    // 1. Resolve available channels
    const userTelegramChatId = profile.telegram_chat_id || (profile.firebase_uid?.startsWith("tg_") ? profile.firebase_uid.slice(3) : null) || (user?.uid?.startsWith("tg_") ? user.uid.slice(3) : null);
    const hasTelegram = Boolean(isTelegramConnected || userTelegramChatId || profile.telegram);
    const rawEmail = (user?.email || profile.email || "").toLowerCase().trim();
    const isRealEmail = Boolean(rawEmail && !rawEmail.endsWith("@telegram.s-tech-store.tech") && !rawEmail.endsWith("@tiktok.s-tech-store.tech") && rawEmail.includes("@"));

    if (!hasTelegram && !isRealEmail) {
      alert("សូមភ្ជាប់ Telegram ឬបញ្ចូលអាសយដ្ឋាន Gmail/Email ពិតប្រាកដក្នុងគណនីរបស់អ្នកជាមុនសិន ដើម្បីអាចទទួលតំណភ្ជាប់ Reset Password បាន!");
      return;
    }

    // 2. If both exist: let user choose via modal
    if (hasTelegram && isRealEmail) {
      setShowResetChannelModal(true);
      return;
    }

    // 3. Otherwise dispatch directly to the single available channel
    const targetChannel: "telegram" | "email" = hasTelegram ? "telegram" : "email";
    executePasswordReset(targetChannel);
  };

  const executePasswordReset = async (channel: "telegram" | "email") => {
    setShowResetChannelModal(false);
    setResetLoading(true);

    const userTelegramChatId = profile.telegram_chat_id || (profile.firebase_uid?.startsWith("tg_") ? profile.firebase_uid.slice(3) : null) || (user?.uid?.startsWith("tg_") ? user.uid.slice(3) : null);
    const rawEmail = (user?.email || profile.email || "").toLowerCase().trim();
    const isRealEmail = Boolean(rawEmail && !rawEmail.endsWith("@telegram.s-tech-store.tech") && !rawEmail.endsWith("@tiktok.s-tech-store.tech") && rawEmail.includes("@"));

    try {
      if (channel === "email" && isRealEmail) {
        try {
          await sendPasswordResetEmail(auth, rawEmail);
        } catch (fbErr) {
          console.warn("Firebase reset notice:", fbErr);
        }
      }

      const res = await api.post("/user/send-reset-email", {
        channel,
        email: isRealEmail ? rawEmail : undefined,
        username: profile.display_name || user?.displayName || "S Tech Member",
        telegram_chat_id: userTelegramChatId,
        firebase_uid: profile.firebase_uid || user?.uid,
      });

      if (res.data?.success) {
        setResetSent(true);
        setResetSuccessModal({
          show: true,
          channel: res.data?.channel || channel,
          email: res.data?.email || (channel === "email" ? rawEmail : undefined),
          telegramUsername: res.data?.telegram_username || profile.telegram,
          telegramChatId: res.data?.telegram_chat_id || (userTelegramChatId ? String(userTelegramChatId) : undefined),
          resetLink: res.data?.magic_link,
        });
        setTimeout(() => setResetSent(false), 5000);
      } else {
        alert(res.data?.message || "បរាជ័យក្នុងការផ្ញើតំណភ្ជាប់ Reset Password សូមព្យាយាមម្តងទៀត");
      }
    } catch (err: any) {
      console.error("Password reset dispatch error:", err);
      const errMsg = err?.response?.data?.message || err?.message || "បរាជ័យក្នុងការផ្ញើតំណភ្ជាប់ Reset Password";
      alert(errMsg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendEmailVerification = async () => {
    const rawEmail = (profile.email || user?.email || "").trim();
    if (!rawEmail || !rawEmail.includes("@")) {
      setPrivacyToast("សូមបញ្ចូលអាសយដ្ឋាន Gmail ត្រឹមត្រូវជាមុនសិន!");
      setTimeout(() => setPrivacyToast(null), 3000);
      return;
    }
    setEmailVerifyLoading(true);
    setEmailVerifyError("");
    try {
      const res = await api.post("/user/send-confirm-email", {
        email: rawEmail,
        username: profile.display_name || user?.displayName || "S Tech Member",
      });
      if (res.data?.success) {
        setEmailVerifySent(true);
        setEmailVerifyModal(true);
        setPrivacyToast("បានផ្ញើលេខកូដបញ្ជាក់ទៅកាន់ Gmail រួចរាល់! 📩");
        setTimeout(() => setPrivacyToast(null), 3500);
      } else {
        setEmailVerifyError(res.data?.message || "បរាជ័យក្នុងការផ្ញើអ៊ីមែលផ្ទៀងផ្ទាត់");
        setEmailVerifyModal(true);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 429) {
        setEmailVerifyError("ប្រព័ន្ធបានផ្ញើលេខកូដរួចរាល់ហើយ! សូមពិនិត្យមើល Inbox ឬ Spam ក្នុង Gmail របស់អ្នក ឬរង់ចាំបន្តិចសិនមុនចុចផ្ញើម្ដងទៀត។");
      } else {
        setEmailVerifyError(msg || "បរាជ័យក្នុងការផ្ញើអ៊ីមែលផ្ទៀងផ្ទាត់ សូមព្យាយាមម្ដងទៀត");
      }
      setEmailVerifyModal(true);
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleConfirmEmailOtp = async () => {
    const rawEmail = (profile.email || user?.email || "").trim();
    if (!emailVerifyOtp || emailVerifyOtp.length < 4) {
      setEmailVerifyError("សូមបញ្ចូលលេខកូដ OTP ឱ្យបានត្រឹមត្រូវ");
      return;
    }
    setEmailVerifyLoading(true);
    setEmailVerifyError("");
    try {
      const res = await api.post("/user/verify-confirm-email", {
        email: rawEmail,
        otp: emailVerifyOtp.trim(),
      });
      if (res.data?.success) {
        setEmailVerifySuccess(true);
        setEmailVerifyModal(false);
        setProfile((prev) => ({ ...prev, status: "active" }));
        setPrivacyToast("អាសយដ្ឋាន Gmail ត្រូវបានផ្ទៀងផ្ទាត់ជោគជ័យ ១០០%! 🎉");
        setTimeout(() => setPrivacyToast(null), 3500);
      } else {
        setEmailVerifyError(res.data?.message || "លេខកូដ OTP មិនត្រឹមត្រូវ");
      }
    } catch (err: any) {
      setEmailVerifyError(err.response?.data?.message || "លេខកូដ OTP មិនត្រឹមត្រូវ ឬផុតកំណត់");
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleToggle2FA = async (overrideChannel?: "telegram" | "email") => {
    // 1. Prompt user to disable if currently enabled
    if (profile.two_fa_enabled) {
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

    // 2. Identify available channels (Telegram vs Real Gmail)
    const userTelegramChatId = profile.telegram_chat_id || (profile.firebase_uid?.startsWith("tg_") ? profile.firebase_uid.slice(3) : null) || (user?.uid?.startsWith("tg_") ? user.uid.slice(3) : null);
    const hasTelegram = Boolean(isTelegramAuthUser || userTelegramChatId || profile.telegram);
    const rawEmail = (user?.email || profile.email || "").toLowerCase().trim();
    const isRealEmail = Boolean(rawEmail && !rawEmail.endsWith("@telegram.s-tech-store.tech") && !rawEmail.endsWith("@tiktok.s-tech-store.tech") && rawEmail.includes("@"));

    if (!hasTelegram && !isRealEmail) {
      alert("សូមភ្ជាប់ Telegram ឬបញ្ចូលអាសយដ្ឋាន Gmail ពិតប្រាកដក្នុងគណនីរបស់អ្នកជាមុនសិន ដើម្បីអាចប្រើប្រាស់ប្រព័ន្ធ Two-Factor Authentication បាន!");
      return;
    }

    // Determine target channel
    let channelToSend: "telegram" | "email" = "telegram";
    if (overrideChannel) {
      channelToSend = overrideChannel;
    } else if (hasTelegram && !isRealEmail) {
      channelToSend = "telegram";
    } else if (isRealEmail && !hasTelegram) {
      channelToSend = "email";
    } else {
      // Both exist: default based on auth provider
      channelToSend = isTelegramAuthUser ? "telegram" : "email";
    }

    setOtpChannel(channelToSend);
    setOtpLoading(true);
    setOtpError("");
    setOtpErrorType(null);
    setOtpDeepLink(null);
    setOtpInput("");
    setOtpTargetAction("enable");
    setShow2faModal(true);

    try {
      const res = await api.post("/user/request-2fa-otp", {
        channel: channelToSend,
        email: isRealEmail ? rawEmail : (user?.email || profile.email),
        username: profile.display_name || user?.displayName,
        telegram_chat_id: userTelegramChatId,
        firebase_uid: profile.firebase_uid || user?.uid,
      });

      if (res.data?.success) {
        if (res.data.channel) setOtpChannel(res.data.channel);
        setOtpSentNotice(res.data.message || (channelToSend === "telegram" ? "លេខកូដសុវត្ថិភាព ៦ ខ្ទង់ ត្រូវបានផ្ញើទៅកាន់ Telegram របស់អ្នករួចរាល់ហើយ!" : `លេខកូដសុវត្ថិភាព ៦ ខ្ទង់ ត្រូវបានផ្ញើទៅកាន់អ៊ីមែល ${rawEmail} រួចរាល់ហើយ!`));
      } else {
        setOtpError(res.data?.message || "មិនអាចផ្ញើលេខកូដ OTP បានទេ");
        if (res.data?.error_type) setOtpErrorType(res.data.error_type);
        if (res.data?.bot_username) setOtpBotUsername(sanitizeTgBot(res.data.bot_username));
        if (res.data?.deep_link) setOtpDeepLink(res.data.deep_link);
        if (res.data?.has_email !== undefined) setOtpHasEmail(Boolean(res.data.has_email));
      }
    } catch (err: any) {
      const errData = err.response?.data;
      setOtpError(errData?.message || "មិនអាចផ្ញើលេខកូដ OTP បានទេ សូមព្យាយាមម្តងទៀត");
      if (errData?.error_type) setOtpErrorType(errData.error_type);
      if (errData?.bot_username) setOtpBotUsername(sanitizeTgBot(errData.bot_username));
      if (errData?.deep_link) setOtpDeepLink(errData.deep_link);
      if (errData?.has_email !== undefined) setOtpHasEmail(Boolean(errData.has_email));
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
      let userTelegramChatId = profile.telegram_chat_id || (profile.firebase_uid?.startsWith("tg_") ? profile.firebase_uid.slice(3) : null) || (user?.uid?.startsWith("tg_") ? user.uid.slice(3) : null);
      if (!userTelegramChatId && profile.telegram && profile.telegram.includes("ID:")) {
        const match = profile.telegram.match(/\d+/);
        if (match) userTelegramChatId = match[0];
      }
      const res = await api.post("/user/verify-2fa-otp", {
        otp: otpInput.trim(),
        enable: true,
        email: user?.email || profile.email,
        telegram_chat_id: userTelegramChatId,
        firebase_uid: profile.firebase_uid || user?.uid,
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
        localStorage.removeItem("stech_cached_user_profile");
        localStorage.removeItem("stech_telegram_connected");
        localStorage.removeItem("stech_cached_orders");
        localStorage.removeItem("stech_cached_wallet");
        document.cookie = "customer_token=; path=/; max-age=0;";
        await signOut(auth);
        window.location.href = "/";
      } catch (e) {
        window.location.href = "/";
      }
    }
  };

  const handleConnectTelegram = async () => {
    // 1. Detect mobile device
    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // 2. Pre-open blank tab synchronously in direct user click gesture to defeat desktop popup blockers
    let preOpenedTab: Window | null = null;
    if (!isMobile && typeof window !== "undefined") {
      try {
        preOpenedTab = window.open("about:blank", "_blank");
        if (preOpenedTab) {
          openedTgTabRef.current = preOpenedTab;
          preOpenedTab.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>កំពុងបើក Telegram Bot...</title>
              <style>
                body {
                  margin: 0;
                  background-color: #0e1621;
                  color: #ffffff;
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  text-align: center;
                }
                .spinner {
                  width: 44px;
                  height: 44px;
                  border: 3px solid rgba(255,255,255,0.15);
                  border-top-color: #0088cc;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                  margin: 0 auto 16px auto;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                h2 { margin: 0 0 8px 0; font-size: 19px; font-weight: 700; }
                p { margin: 0; font-size: 13px; color: #8e9aa8; }
              </style>
            </head>
            <body>
              <div>
                <div class="spinner"></div>
                <h2>កំពុងបញ្ជូនទៅកាន់ Telegram Bot... ✈️</h2>
                <p>សូមចុច "START" ក្នុង Telegram ដើម្បីភ្ជាប់គណនី</p>
              </div>
            </body>
            </html>
          `);
        }
      } catch (_) {
        preOpenedTab = null;
      }
    }

    try {
      setTelegramLinking(true);
      const res = await api.post("/user/telegram/link-init");
      if (res.data?.success && res.data?.deep_link) {
        const cleanBot = sanitizeTgBot(res.data.bot_username);
        const cleanDeepLink = sanitizeTgDeepLink(res.data.deep_link, res.data.link_token);
        const cleanAppLink = sanitizeTgAppLink(res.data.app_link, res.data.link_token);

        setTelegramDeepLink(cleanDeepLink);
        setTelegramToken(res.data.link_token);
        setTelegramBotUsername(cleanBot);
        setTelegramModalOpen(true);
        setTelegramSuccess(false);

        // 3. Auto-direct / push user directly to Telegram!
        if (isMobile) {
          // On mobile: trigger custom scheme tg:// so Telegram app opens instantly without leaving browser tab
          window.location.href = cleanAppLink;
          setTimeout(() => {
            // If native app scheme wasn't handled, fallback to Universal Link
            if (document.visibilityState === "visible") {
              window.location.href = cleanDeepLink;
            }
          }, 800);
        } else {
          // On desktop:
          // A. If preOpenedTab was created synchronously, navigate it to cleanDeepLink
          if (preOpenedTab && !preOpenedTab.closed) {
            preOpenedTab.location.href = cleanDeepLink;
          } else {
            // Fallback synthetic link click
            try {
              const a = document.createElement("a");
              a.href = cleanDeepLink;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            } catch (_) {
              window.open(cleanDeepLink, "_blank");
            }
          }

          // B. Also invoke native Telegram Desktop protocol tg:// via hidden iframe
          try {
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = cleanAppLink;
            document.body.appendChild(iframe);
            setTimeout(() => {
              try { document.body.removeChild(iframe); } catch (_) {}
            }, 3000);
          } catch (_) {}
        }

        startTelegramPolling(res.data.link_token);
      } else {
        if (preOpenedTab && !preOpenedTab.closed) preOpenedTab.close();
      }
    } catch (err: any) {
      if (preOpenedTab && !preOpenedTab.closed) preOpenedTab.close();
      console.error("Failed to init telegram link:", err);
      alert(err?.response?.data?.error || "មិនអាចបង្កើតតំណភ្ជាប់ Telegram បានទេ សូមព្យាយាមម្តងទៀត");
    } finally {
      setTelegramLinking(false);
    }
  };

  const startTelegramPolling = (token: string) => {
    setTelegramPolling(true);
    let attempts = 0;
    let pollTimeout: any = null;
    let isChecking = false;
    let isDone = false;

    const cleanup = () => {
      isDone = true;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
      }
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };

    const checkLink = async (): Promise<boolean> => {
      if (isDone || isChecking) return false;
      isChecking = true;
      try {
        const res = await api.get(`/user/telegram/link-check?token=${encodeURIComponent(token)}`);
        if (res.data?.completed) {
          cleanup();
          setTelegramPolling(false);
          setTelegramSuccess(true);

          // Close pre-opened tab if still open
          if (openedTgTabRef.current && !openedTgTabRef.current.closed) {
            try {
              openedTgTabRef.current.close();
            } catch (_) {}
            openedTgTabRef.current = null;
          }

          const updatedTgProfile = {
            ...profile,
            telegram: res.data.telegram || profile.telegram,
            telegram_chat_id: res.data.telegram_id || profile.telegram_chat_id,
            photo_url: res.data.photo_url || profile.photo_url,
            notif_telegram: true,
          };
          setProfile(updatedTgProfile);
          try {
            localStorage.setItem("stech_cached_user_profile", JSON.stringify(updatedTgProfile));
            localStorage.setItem("stech_telegram_connected", "true");
            const sessStr = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
            if (sessStr) {
              const sess = JSON.parse(sessStr);
              sess.telegram = res.data.telegram || sess.telegram;
              sess.telegram_id = res.data.telegram_id || sess.telegram_id;
              sess.telegram_chat_id = res.data.telegram_id || sess.telegram_chat_id;
              localStorage.setItem("stech_user_session", JSON.stringify(sess));
              localStorage.setItem("user_session", JSON.stringify(sess));
              window.dispatchEvent(new Event("user_session_updated"));
            }
          } catch (e) {}

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

          if (openedTgTabRef.current && !openedTgTabRef.current.closed) {
            try {
              openedTgTabRef.current.close();
            } catch (_) {}
            openedTgTabRef.current = null;
          }

          const errMsg = res.data?.error || `គណនី Telegram នេះត្រូវបានភ្ជាប់រួចហើយជាមួយគណនី "${res.data?.already_linked_name || "ផ្សេង"}"! សូមផ្តាច់ការភ្ជាប់ពីគណនីចាស់ជាមុនសិន។`;
          setSaveModal({
            show: true,
            success: false,
            title: "គណនី Telegram ត្រូវបានភ្ជាប់រួចហើយ ⚠️",
            message: errMsg,
          });
          return false;
        }
      } catch (e) {
      } finally {
        isChecking = false;
      }
      return false;
    };

    const onReturn = () => {
      if (document.visibilityState === "visible") {
        checkLink();
      }
    };

    // Immediate check on trigger
    checkLink();

    const scheduleNext = (delay = 1000) => {
      if (isDone) return;
      if (pollTimeout) clearTimeout(pollTimeout);
      pollTimeout = setTimeout(async () => {
        if (isDone) return;
        attempts++;
        if (attempts > 70) {
          cleanup();
          setTelegramPolling(false);
          return;
        }
        const completed = await checkLink();
        if (!completed && !isDone) {
          const isHidden = typeof document !== "undefined" && document.hidden;
          scheduleNext(isHidden ? 2500 : 1000);
        }
      }, delay);
    };

    scheduleNext(1000);

    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    document.addEventListener("visibilitychange", onReturn);
  };

  const handleUnlinkTelegram = () => {
    setShowDisconnectModal(true);
  };

  const executeUnlinkTelegram = async () => {
    // Keep modal open and show clear, active loading state
    setTelegramUnlinking(true);
    try {
      let userTelegramChatId = profile.telegram_chat_id || (profile.firebase_uid?.startsWith("tg_") ? profile.firebase_uid.slice(3) : null) || (user?.uid?.startsWith("tg_") ? user.uid.slice(3) : null);
      if (!userTelegramChatId && profile.telegram && profile.telegram.includes("ID:")) {
        const match = profile.telegram.match(/\d+/);
        if (match) userTelegramChatId = match[0];
      }
      const res = await api.post("/user/telegram/unlink", {
        telegram_chat_id: userTelegramChatId,
        telegram: profile.telegram,
        firebase_uid: profile.firebase_uid || user?.uid,
        email: user?.email || profile.email,
      });

      if (res.data?.success) {
        setShowDisconnectModal(false);
        const newUid = res.data?.new_firebase_uid || profile.firebase_uid;

        setProfile((prev) => ({
          ...prev,
          telegram: "",
          telegram_chat_id: undefined,
          notif_telegram: false,
          provider: prev.provider === "telegram" ? "email" : prev.provider,
          firebase_uid: newUid,
        }));

        if (newUid && user) {
          setUser((prev: any) => ({
            ...prev,
            uid: newUid,
          }));
        }

        // Clean up locally stored session and profile cache so re-renders don't resurrect telegram state
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("stech_telegram_connected");
            const cachedProfileStr = localStorage.getItem("stech_cached_user_profile");
            if (cachedProfileStr) {
              const cp = JSON.parse(cachedProfileStr);
              delete cp.telegram;
              delete cp.telegram_chat_id;
              if (cp.provider === "telegram") cp.provider = "email";
              if (newUid) cp.firebase_uid = newUid;
              localStorage.setItem("stech_cached_user_profile", JSON.stringify(cp));
            }

            const sess = localStorage.getItem("stech_user_session") || localStorage.getItem("user_session");
            if (sess) {
              const p = JSON.parse(sess);
              delete p.telegram;
              delete p.telegram_chat_id;
              delete p.telegram_id;
              if (p.provider === "telegram") p.provider = "email";
              if (newUid) {
                p.firebase_uid = newUid;
                p.uid = newUid;
              }
              localStorage.setItem("stech_user_session", JSON.stringify(p));
              localStorage.setItem("user_session", JSON.stringify(p));
              window.dispatchEvent(new Event("user_session_updated"));
            }
          } catch (err) {}
        }

        // Final Alert & Modal
        setSaveModal({
          show: true,
          success: true,
          title: "ផ្តាច់ការភ្ជាប់ជោគជ័យ ១០០% ✅",
          message: "គណនី Telegram របស់អ្នកត្រូវបានផ្តាច់ចេញពី S Tech Store រួចរាល់ហើយ! ដំណឹងបញ្ជាក់ការផ្តាច់ត្រូវបានផ្ញើចូល Telegram Bot (@S_TECH_ASSISTANTBOT) របស់អ្នករួចរាល់។ លោកអ្នកអាចភ្ជាប់គណនី Telegram នេះជាមួយគណនីផ្សេងបានគ្រប់ពេល។",
        });

        setPrivacyToast("🔓 បានផ្តាច់ Telegram ដោយជោគជ័យ ១០០%!");
        setTimeout(() => setPrivacyToast(null), 4000);
      } else {
        alert(res.data?.message || res.data?.error || "មានបញ្ហាក្នុងការផ្តាច់គណនី Telegram សូមព្យាយាមម្តងទៀត");
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.response?.data?.error || "មានបញ្ហាក្នុងការផ្តាច់គណនី Telegram សូមព្យាយាមម្តងទៀត");
    } finally {
      setTelegramUnlinking(false);
    }
  };

  const handleManualCheckUpdates = async () => {
    setUpdateStatusMsg("កំពុងពិនិត្យមើលកំណែ Update ចុងក្រោយ...");
    const res = await checkForUpdates(true);
    setUpdateStatusMsg(res.message);
    if (res.hasUpdate) {
      openUpdateModal();
    }
    setTimeout(() => setUpdateStatusMsg(null), 6000);
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
  const visibleOrders = filteredOrders.slice(0, visibleOrderCount);
  const hasMoreOrders = filteredOrders.length > visibleOrderCount;
  const remainingOrdersCount = Math.max(0, filteredOrders.length - visibleOrderCount);
  const toPayCount = orders.filter((o) => o.status === "pending" || o.status === "to_pay").length;
  const processingCount = orders.filter((o) => o.status === "processing" || o.status === "to_share").length;
  const packingCount = orders.filter((o) => o.status === "packing" || o.status === "confirmed").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const reviewsCount = orders.filter((o) => o.status === "completed" || o.status === "delivered").length;

  // Dynamic S Tech Loyalty Tier based on points progression (Silver -> Gold -> Platinum -> Diamond)
  const loyaltyTier = (() => {
    const pts = Math.max(0, Number(stats.points) || 0);
    if (pts >= 5000) {
      return {
        name: "Diamond VIP",
        khName: "កម្រិតពេជ្រ VIP",
        badgeText: "DIAMOND VIP",
        icon: "💎",
        badgeClass: "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-600 text-white shadow-purple-500/30",
        colorClass: "text-purple-400",
        barGradient: "from-purple-500 via-fuchsia-500 to-indigo-400",
        progressPercent: 100,
        nextTierText: "Max Level • កម្រិតកំពូល",
        benefitKh: "VIP Concierge 24/7 & Extra Warranty",
      };
    }
    if (pts >= 2000) {
      const prog = Math.min(100, Math.max(6, ((pts - 2000) / (5000 - 2000)) * 100));
      return {
        name: "Platinum VIP",
        khName: "កម្រិតផ្លាទីន",
        badgeText: "PLATINUM VIP",
        icon: "👑",
        badgeClass: "bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-black shadow-cyan-500/25 font-black",
        colorClass: "text-cyan-400",
        barGradient: "from-cyan-400 to-blue-500",
        progressPercent: prog,
        nextTierText: "Next: Diamond VIP (5,000 Coins)",
        benefitKh: "VIP Deals & Birthday Gift",
      };
    }
    if (pts >= 500) {
      const prog = Math.min(100, Math.max(6, ((pts - 500) / (2000 - 500)) * 100));
      return {
        name: "Gold Member",
        khName: "កម្រិតមាស",
        badgeText: "GOLD MEMBER",
        icon: "🥇",
        badgeClass: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black shadow-amber-500/30 font-black",
        colorClass: "text-amber-400",
        barGradient: "from-amber-400 to-yellow-500",
        progressPercent: prog,
        nextTierText: "Next: Platinum VIP (2,000 Coins)",
        benefitKh: "Free Shipping & 5% Coin Boost",
      };
    }
    // Base tier: Silver Member (0 - 499 coins)
    const prog = Math.min(100, Math.max(pts > 0 ? 6 : 0, (pts / 500) * 100));
    return {
      name: "Silver Member",
      khName: "កម្រិតប្រាក់",
      badgeText: "SILVER MEMBER",
      icon: "🥈",
      badgeClass: "bg-gradient-to-r from-slate-200 via-gray-200 to-zinc-300 text-gray-900 shadow-slate-400/20 border border-white/30 font-black",
      colorClass: "text-slate-300",
      barGradient: "from-slate-300 via-gray-200 to-zinc-400",
      progressPercent: prog,
      nextTierText: "Next: Gold Member (500 Coins)",
      benefitKh: "សន្សំពិន្ទុ S-Coins លើរាល់ការទិញ",
    };
  })();

  return (
    <div className="min-h-screen bg-[#f6f8fb] dark:bg-[#0c0e12] text-gray-900 dark:text-gray-100 pt-6 pb-36 sm:pb-16">
      <div className="max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── 1. VIP Membership Hero Card ───────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#12141a] via-[#1a1e27] to-[#0c0e12] border border-white/10 text-white p-6 sm:p-8">
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/15 via-red-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top-Right Unified Controls (Theme Switcher + Sign Out) */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
            {/* Minimalist Segmented Theme Switcher */}
            <div className="flex items-center bg-white/10 dark:bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-xs">
              <button
                type="button"
                onClick={() => handleSwitchTheme("light")}
                disabled={isSwitchingTheme}
                title="Light Mode (ពន្លឺ)"
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer border-none flex items-center justify-center ${
                  theme === "light"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Sun size={13} className={isSwitchingTheme && theme === "light" ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTheme("dark")}
                disabled={isSwitchingTheme}
                title="Dark Mode (ងងឹត)"
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer border-none flex items-center justify-center ${
                  theme === "dark"
                    ? "bg-[#8B1A1A] text-white shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Moon size={13} className={isSwitchingTheme && theme === "dark" ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTheme("system")}
                disabled={isSwitchingTheme}
                title="System Mode (ស្វ័យប្រវត្តិ)"
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer border-none flex items-center justify-center ${
                  theme === "system"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Monitor size={13} className={isSwitchingTheme && theme === "system" ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: User Profile Identity */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-6">
              {/* Avatar Column with Sign Out Button Underneath */}
              <div className="flex flex-col items-center gap-2 shrink-0">
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
                  {isTelegramConnected && (
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

                {/* Logout Button directly below Avatar */}
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-200 hover:text-white border border-red-500/30 hover:border-red-500/60 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer backdrop-blur-md group"
                  title="Sign Out • ចាកចេញ"
                >
                  <LogOut size={13} className="text-red-400 group-hover:text-white transition-colors" />
                  <span>ចាកចេញ</span>
                </button>
              </div>

              {/* Identity Details */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {profile.display_name || user?.displayName || "S Tech Member"}
                  </h1>
                  <BadgeCheck size={20} className="text-blue-400 fill-blue-400/20" />
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm flex items-center gap-1 ${loyaltyTier.badgeClass}`}>
                    <Award size={11} /> {loyaltyTier.badgeText}
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
                <span className="text-xs font-black text-amber-400">≈ ${(stats.points / 200).toFixed(2)} USD</span>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-white mb-2">
                {stats.points.toLocaleString()} <span className="text-sm font-semibold text-gray-400">Coins</span>
              </div>

              {/* Tier Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold">
                  <span className="flex items-center gap-1 text-gray-200">
                    <span>{loyaltyTier.icon}</span>
                    <span>{loyaltyTier.name} ({loyaltyTier.khName})</span>
                  </span>
                  <span className="text-gray-300">{loyaltyTier.nextTierText}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${loyaltyTier.barGradient} rounded-full transition-all duration-500`}
                    style={{ width: `${loyaltyTier.progressPercent}%` }}
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
          <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0">Avatars:</span>
            {PRESET_AVATARS.map((av) => (
              <button
                key={av.label}
                type="button"
                onClick={() => handleSelectPresetAvatar(av.url)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-[10px] font-semibold transition-all border border-white/10 whitespace-nowrap cursor-pointer active:scale-95"
              >
                <span>{av.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Modern Telegram Smart Companion Card ────────────────── */}
        <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 border transition-all duration-300 shadow-sm bg-gradient-to-br from-[#0e1621] via-[#111c2a] to-[#0e1621] border-[#229ED9]/30 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#229ED9]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0088cc] to-[#229ED9] flex items-center justify-center text-white shadow-md shadow-[#0088cc]/30 shrink-0 border border-white/20">
                <Send size={22} className="-translate-x-0.5 translate-y-0.5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
                    <span>{isTelegramConnected ? "Official Telegram Bot" : "Telegram Bot ផ្លូវការ"}</span>
                    <BadgeCheck size={16} className="text-[#229ED9] fill-[#229ED9]/20" />
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isTelegramConnected
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-white/10 text-gray-300 border border-white/10"
                  }`}>
                    {isTelegramConnected ? "Active • ភ្ជាប់រួចរាល់" : "ជម្រើសបន្ថែម (Optional)"}
                  </span>
                </div>
                <p className="text-xs text-gray-300/90 leading-relaxed max-w-xl">
                  {isTelegramConnected
                    ? `ទទួលបានវិក្កយបត្រ (E-Receipts) ដំណឹងបញ្ជាទិញ និង Login 1-Click ផ្ទាល់ខ្លួន${effectiveTelegramHandle ? ` (@${effectiveTelegramHandle.replace('@', '')})` : ""}${effectiveTelegramChatId ? ` • ID: ${effectiveTelegramChatId}` : ""}`
                    : "ភ្ជាប់ជាមួយ Telegram Bot ផ្លូវការរបស់ S Tech ដើម្បីទទួលវិក្កយបត្រ (E-Receipts) និងដំណឹងកុម្ម៉ង់ 24/7 (🛡️ សុវត្ថិភាព 100% មិនទាមទារលេខសម្ងាត់ ឬព័ត៌មានផ្ទាល់ខ្លួន Telegram ឡើយ)"}
                </p>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {isTelegramConnected ? (
                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-2.5 w-full sm:w-auto">
                  <a
                    href="https://t.me/S_TECH_ASSISTANTBOT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#229ED9] hover:from-[#0077b5] hover:to-[#1b8fc5] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0088cc]/25 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border-none no-underline"
                    title="បើក Chat ជាមួយ Telegram Bot ផ្លូវការ (@S_TECH_ASSISTANTBOT)"
                  >
                    <Send size={14} className="shrink-0" />
                    <span>បើក Bot</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleUnlinkTelegram}
                    disabled={telegramUnlinking}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/35 text-red-200 hover:text-white border border-red-500/40 hover:border-red-500/70 text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md disabled:opacity-50"
                    title="ផ្តាច់ការតភ្ជាប់ Telegram ពីគណនីនេះ"
                  >
                    <Unlink size={14} className="shrink-0 text-red-400" />
                    <span>{telegramUnlinking ? "កំពុងផ្តាច់..." : "ផ្តាច់ Telegram"}</span>
                  </button>
                </div>
              ) : profileLoading ? (
                <div className="w-full sm:w-36 h-10 rounded-xl bg-white/10 animate-pulse flex items-center justify-center gap-2 text-xs text-gray-300 font-medium border border-white/10">
                  <Loader2 size={14} className="animate-spin text-[#229ED9]" />
                  <span>កំពុងពិនិត្យ...</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectTelegram}
                  disabled={telegramLinking}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#0088cc] hover:from-[#1b8fc5] hover:to-[#0077b5] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0088cc]/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  <Send size={14} className="shrink-0" />
                  <span>{telegramLinking ? "កំពុងរៀបចំ..." : "ភ្ជាប់ Official Bot"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Executive Perks & Wallet Hub (Clean Bento Grid) ────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Real Cash Wallet & Loyalty Coins */}
          <Link
            href="/account/wallet"
            onClick={(e) => {
              e.preventDefault();
              router.push("/account/wallet");
            }}
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#12141a] p-4 border border-gray-100 dark:border-white/5 hover:border-emerald-500/40 active:scale-[0.99] transition-all shadow-xs hover:shadow-md flex items-center justify-between no-underline cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Wallet size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-gray-900 dark:text-white">S-Tech Wallet</span>
                  <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-md">
                    ${Number(stats.wallet_balance || 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  {stats.points || 0} Coins • បញ្ចូលលុយ KHQR
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              <span className="hidden xs:inline">បើក</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Welcome Gift Voucher */}
          <Link 
            href="/promotions"
            onClick={(e) => {
              if (!profile.has_claimed_welcome_gift) {
                sessionStorage.removeItem("stech_dismissed_gift_modal");
                window.dispatchEvent(new Event("user_session_updated"));
              }
              e.preventDefault();
              router.push("/promotions");
            }}
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#12141a] p-4 border border-gray-100 dark:border-white/5 hover:border-rose-500/40 active:scale-[0.99] transition-all shadow-xs hover:shadow-md flex items-center justify-between no-underline cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Gift size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-gray-900 dark:text-white">កាដូស្វាគមន៍ $5 OFF</span>
                  <span className="text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.2 rounded-md">
                    {profile.has_claimed_welcome_gift ? "បានទទួល" : "ឥតគិតថ្លៃ"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  Voucher បញ្ចុះតម្លៃពិសេសសម្រាប់ទិញទំនិញ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
              <span>{profile.has_claimed_welcome_gift ? "មើល" : "Claim"}</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Saver Pass VIP */}
          <Link 
            href="/build-pc"
            onClick={(e) => {
              e.preventDefault();
              router.push("/build-pc");
            }}
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#12141a] p-4 border border-gray-100 dark:border-white/5 hover:border-amber-500/40 active:scale-[0.99] transition-all shadow-xs hover:shadow-md flex items-center justify-between no-underline cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-gray-900 dark:text-white">Saver Pass</span>
                  <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded-md">
                    VIP
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  Save $10 on PC build • Free delivery
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
              <span>អត្ថប្រយោជន៍</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>

        {/* ── 4. My Orders (Order Status Matrix) ────────────────── */}
        <div className="bg-white dark:bg-[#12141a] rounded-3xl p-5 border border-gray-100 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <Package size={18} className="text-[#8B1A1A] dark:text-red-400" />
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">My Orders</h2>
            </div>
            <button 
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("all"); setVisibleOrderCount(8); }}
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
              onClick={() => { setActiveTab("orders"); setOrderFilter("pending"); setVisibleOrderCount(8); }}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-2">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 flex items-center justify-center group-hover:scale-105 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 group-hover:bg-[#8B1A1A]/5 dark:group-hover:bg-red-500/10 transition-all">
                  <CreditCard size={19} />
                </div>
                {toPayCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {toPayCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">To Pay</span>
            </button>

            {/* 2. Processing */}
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("processing"); setVisibleOrderCount(8); }}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-2">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 flex items-center justify-center group-hover:scale-105 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 group-hover:bg-[#8B1A1A]/5 dark:group-hover:bg-red-500/10 transition-all">
                  <Users size={19} />
                </div>
                {processingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {processingCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Processing</span>
            </button>

            {/* 3. Packing */}
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("packing"); setVisibleOrderCount(8); }}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-2">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 flex items-center justify-center group-hover:scale-105 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 group-hover:bg-[#8B1A1A]/5 dark:group-hover:bg-red-500/10 transition-all">
                  <Package size={19} />
                </div>
                {packingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {packingCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Packing</span>
            </button>

            {/* 4. Shipped */}
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("shipped"); setVisibleOrderCount(8); }}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-2">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 flex items-center justify-center group-hover:scale-105 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 group-hover:bg-[#8B1A1A]/5 dark:group-hover:bg-red-500/10 transition-all">
                  <Truck size={19} />
                </div>
                {shippedCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {shippedCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Shipped</span>
            </button>

            {/* 5. Reviews */}
            <button
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("completed"); setVisibleOrderCount(8); }}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer border-none bg-transparent group"
            >
              <div className="relative mb-2">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-gray-700 dark:text-gray-300 flex items-center justify-center group-hover:scale-105 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 group-hover:bg-[#8B1A1A]/5 dark:group-hover:bg-red-500/10 transition-all">
                  <MessageSquare size={19} />
                </div>
                {reviewsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {reviewsCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Reviews</span>
            </button>
          </div>
        </div>

        {/* ── 5. Quick Tools & Services (Unified Luxury Suite) ────────────────── */}
        <div className="bg-white dark:bg-[#12141a] rounded-3xl p-5 border border-gray-100 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100 dark:border-white/5">
            <h2 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">Quick Tools & Services</h2>
            <span className="text-[11px] font-medium text-gray-400">Essential Suite</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 text-center">
            {/* Wishlist */}
            <Link 
              href="/wishlist" 
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all no-underline text-gray-800 dark:text-gray-200 group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-rose-500 flex items-center justify-center mb-1.5 group-hover:scale-105 group-hover:bg-rose-500/10 transition-all">
                <Heart size={19} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Wishlist</span>
              <span className="text-[9px] text-gray-400 font-medium">{wishlistCount || stats.wishlist} items</span>
            </Link>

            {/* Wallet / Coins */}
            <button 
              type="button"
              onClick={() => setShowCoinsModal(true)}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-amber-500 flex items-center justify-center mb-1.5 group-hover:scale-105 group-hover:bg-amber-500/10 transition-all">
                <Wallet size={19} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Tech Wallet</span>
              <span className="text-[9px] text-gray-400 font-medium">{stats.points} pts</span>
            </button>

            {/* Coupons */}
            <Link 
              href="/promotions" 
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all no-underline text-gray-800 dark:text-gray-200 group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-red-500 flex items-center justify-center mb-1.5 group-hover:scale-105 group-hover:bg-red-500/10 transition-all">
                <Ticket size={19} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Coupons</span>
              <span className="text-[9px] text-gray-400 font-medium">Offers</span>
            </Link>

            {/* Warranty */}
            <button 
              type="button"
              onClick={() => setActiveTab("warranty")}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-emerald-500 flex items-center justify-center mb-1.5 group-hover:scale-105 group-hover:bg-emerald-500/10 transition-all">
                <ShieldCheck size={19} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Warranty</span>
              <span className="text-[9px] text-gray-400 font-medium">Hardware RMA</span>
            </button>

            {/* Delivery Address & GPS */}
            <button 
              type="button"
              onClick={() => setActiveTab("address")}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-sky-500 flex items-center justify-center mb-1.5 group-hover:scale-105 group-hover:bg-sky-500/10 transition-all">
                <MapPin size={19} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Address</span>
              <span className="text-[9px] text-gray-400 font-medium">GPS Location</span>
            </button>

            {/* Browsing History */}
            <button 
              type="button"
              onClick={() => { setActiveTab("orders"); setOrderFilter("all"); setVisibleOrderCount(8); }}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-purple-500 flex items-center justify-center mb-1.5 group-hover:scale-105 group-hover:bg-purple-500/10 transition-all">
                <History size={19} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">History</span>
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
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-teal-500 flex items-center justify-center mb-1.5 group-hover:scale-105 group-hover:bg-teal-500/10 transition-all">
                <Headphones size={19} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Support</span>
              <span className="text-[9px] text-gray-400 font-medium">Live Chat</span>
            </button>

            {/* Settings & Security */}
            <button 
              type="button"
              onClick={() => setActiveTab("security")}
              className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all border-none bg-transparent cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-zinc-500 flex items-center justify-center mb-1.5 group-hover:scale-105 group-hover:bg-zinc-500/10 transition-all">
                <Settings size={19} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Settings</span>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <Mail size={14} className="text-[#8B1A1A] dark:text-red-400" />
                      <span>Real Gmail / Email Address (អ៊ីមែលសម្រាប់ទាក់ទង & ដំណឹង)</span>
                    </label>
                    {profile.email && !profile.email.endsWith("@s-tech-store.tech") && !profile.email.endsWith("@telegram.s-tech-store.tech") && !profile.email.startsWith("tg_") && profile.email.includes("@") ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <Check size={10} /> Real Gmail Active
                        </span>
                        <button
                          type="button"
                          onClick={handleSendEmailVerification}
                          disabled={emailVerifyLoading}
                          className="px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold transition-all border border-sky-300 dark:border-sky-800 cursor-pointer flex items-center gap-1"
                          title="ផ្ញើលេខកូដបញ្ជាក់ទៅ Gmail របស់អ្នក"
                        >
                          {emailVerifyLoading ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                          <span>ផ្ទៀងផ្ទាត់ (Verify)</span>
                        </button>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle size={10} /> សូមបញ្ចូល Gmail ពិត
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value.trim() }))}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 pr-10 py-3 text-sm outline-none focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-black transition-all font-mono"
                      placeholder="e.g. yourname@gmail.com"
                    />
                    {profile.email && !profile.email.endsWith("@s-tech-store.tech") && !profile.email.endsWith("@telegram.s-tech-store.tech") && !profile.email.startsWith("tg_") && profile.email.includes("@") && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    💡 បញ្ចូល Gmail ពិតប្រាកដរបស់អ្នក ដើម្បីឱ្យ Admin អាចទាក់ទង និងបញ្ជូនដំណឹងការបញ្ជាទិញចូលក្នុង Inbox របស់អ្នកបានពិតប្រាកដ។
                  </p>
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
                    {isTelegramConnected ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>{isTelegramAuthUser ? "Auto-Connected (Telegram)" : "Bot Linked"}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectTelegram}
                        disabled={telegramLinking}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-800/60 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Send size={11} />
                        <span>{telegramLinking ? "កំពុងរៀបចំ..." : "+ ភ្ជាប់ Bot ទទួលដំណឹង (Optional)"}</span>
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
                  disabled={isSaving}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#a62222] hover:to-[#d64537] text-white text-sm font-bold shadow-lg hover:shadow-red-900/30 transition-all flex items-center gap-2 cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>កំពុងរក្សាទុក... (Saving Changes)</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Profile Changes (រក្សាទុក)</span>
                    </>
                  )}
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
                  disabled={isSaving}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#a62222] hover:to-[#d64537] text-white text-sm font-bold shadow-lg hover:shadow-red-900/30 transition-all flex items-center gap-2 cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>កំពុងរក្សាទុក... (Saving Address & Pin)</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Shipping Address & GPS Pin</span>
                    </>
                  )}
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
                <Toggle value={profile.two_fa_enabled} onChange={() => handleToggle2FA()} />
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
                          Telegram Companion Bot (@S_TECH_ASSISTANTBOT)
                        </h4>
                        {isTelegramAuthUser ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>Auto-Connected (ចូលតាម Telegram)</span>
                          </span>
                        ) : isTelegramConnected ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>បានភ្ជាប់ជោគជ័យ (Linked)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300 text-[10px] font-semibold border border-slate-200 dark:border-white/10 flex items-center gap-1">
                            <Send size={11} className="text-sky-500" />
                            <span>ជម្រើសបន្ថែម (Optional)</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                        {isTelegramAuthUser
                          ? "គណនី Telegram របស់អ្នកត្រូវបានភ្ជាប់ជាមួយ S Tech Store ដោយស្វ័យប្រវត្តិតាំងពីដំបូងពេល Sign-in។ រាល់វិក្កយបត្រ (Digital Invoices/Receipts) និងដំណឹងការកុម្ម៉ង់ ត្រូវបានបញ្ជូនចូល Bot ផ្ទាល់ខ្លួនរបស់អ្នកដោយស្វ័យប្រវត្តិ!"
                          : "សម្រាប់អតិថិជនទាំងអស់៖ ភ្ជាប់ជាមួយ Official Telegram Bot របស់ S Tech Store ដើម្បីទទួលវិក្កយបត្រ (Digital Invoices) និងដំណឹងកុម្ម៉ង់ទំនិញស្វ័យប្រវត្តិតាម Bot Chat។ 🛡️ ប្រព័ន្ធមានសុវត្ថិភាពខ្ពស់ មិនទាមទារលេខសម្ងាត់ ឬ Password Telegram របស់លោកអ្នកឡើយ (Bot Notification Only)។"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status & Details */}
                {isTelegramConnected ? (
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
                        href="https://t.me/S_TECH_ASSISTANTBOT"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold transition-all no-underline flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Send size={13} />
                        <span>បើកឆាត Telegram Bot (@S_TECH_ASSISTANTBOT)</span>
                        <ExternalLink size={12} />
                      </a>

                      <button
                        type="button"
                        onClick={handleUnlinkTelegram}
                        disabled={telegramUnlinking}
                        className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all border border-red-500/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {telegramUnlinking ? <RefreshCw size={13} className="animate-spin" /> : <X size={13} />}
                        <span>{telegramUnlinking ? "កំពុងផ្តាច់..." : "ផ្តាច់ការភ្ជាប់ (Unlink)"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/80 dark:bg-black/30 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                        <span>សុវត្ថិភាព 100% • ភ្ជាប់ជាមួយ Official Bot ដើម្បីទទួលវិក្កយបត្រ</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        ចុចប៊ូតុងខាងក្រោមដើម្បីបើក Official Bot រួចចុច <strong>START</strong> ក្នុង Telegram ដើម្បីភ្ជាប់ភ្លាមៗ។
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleConnectTelegram}
                      disabled={telegramLinking}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#0088cc] hover:from-[#1b8fc5] hover:to-[#0077b5] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0088cc]/20 cursor-pointer flex items-center justify-center gap-2 shrink-0 border-none disabled:opacity-50"
                    >
                      {telegramLinking ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} className="shrink-0" />}
                      <span>{telegramLinking ? "កំពុងរៀបចំ..." : "ភ្ជាប់ Official Telegram Bot"}</span>
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
              <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/20 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-8 h-8 rounded-xl bg-[#8B1A1A]/10 dark:bg-[#8B1A1A]/20 flex items-center justify-center text-[#8B1A1A] dark:text-red-400">
                        <Zap size={16} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          S Tech Store PWA Release
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-black tracking-wide">
                          v{currentVersion || "1.1.0"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          Official Release
                        </span>
                        {hasUpdate && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black animate-pulse">
                            New Update v{updateInfo?.version || "1.1.X"}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {hasUpdate
                        ? `🎉 មានកំណែអាប់ដេតថ្មី v${updateInfo?.version || "1.1.X"} រួចរាល់! ចុចប៊ូតុង Update ដើម្បីទទួលបានមុខងារថ្មីៗ និង Performance លឿនបំផុត។`
                        : `ប្រព័ន្ធដំណើរការលើ Official Release v${currentVersion || "1.1.0"} ចុងក្រោយបង្អស់ (Universal KHQR Bakong, ABA PAY, Welcome Gift $5.00, Real-Time Coins Reward)`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                    {/* Check for Updates button */}
                    <button
                      type="button"
                      onClick={handleManualCheckUpdates}
                      disabled={isChecking}
                      className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50 shadow-sm"
                    >
                      <RefreshCw size={13} className={isChecking ? "animate-spin text-red-500" : ""} />
                      <span>{isChecking ? "កំពុងពិនិត្យ..." : "Check for Updates"}</span>
                    </button>

                    {/* Update to Latest Version button */}
                    {hasUpdate ? (
                      <button
                        type="button"
                        onClick={openUpdateModal}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/25 cursor-pointer flex items-center gap-1.5 shrink-0 animate-pulse"
                      >
                        <Sparkles size={13} />
                        <span>Update to Latest Version ({updateInfo?.version ? `v${updateInfo.version}` : "v1.1.0"})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await checkForUpdates(true);
                          if (res.hasUpdate) {
                            openUpdateModal();
                          } else {
                            await applyUpdate();
                          }
                        }}
                        disabled={isUpdating || isChecking}
                        className="px-4 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6b1111] text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-sm"
                        title="ពិនិត្យ និង Refresh ទៅកាន់កំណែចុងក្រោយបង្អស់"
                      >
                        <Download size={13} className={isUpdating ? "animate-bounce" : ""} />
                        <span>{isUpdating ? "Updating..." : "Update to Latest Version"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {updateStatusMsg && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
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
                        ) : isTelegramConnected ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                            Linked ({profile.telegram || "Bot Active"})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400 text-[10px] font-semibold">
                            Optional
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 block">
                        ទទួលវិក្កយបត្រអេឡិចត្រូនិច និងដំណឹងកុម្ម៉ង់ទំនិញតាម Official Bot (@S_TECH_ASSISTANTBOT)។
                      </span>
                      {!isTelegramConnected && (
                        <button
                          type="button"
                          onClick={handleConnectTelegram}
                          disabled={telegramLinking}
                          className="mt-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all w-fit"
                        >
                          <Send size={12} />
                          <span>{telegramLinking ? "កំពុងរៀបចំ..." : "+ ភ្ជាប់ Bot ទទួលដំណឹង (Optional)"}</span>
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
                          href="https://t.me/S_TECH_ASSISTANTBOT"
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

                  <button
                    type="button"
                    onClick={() => {
                      setHistorySubTab("ledger");
                      loadProfileWalletTx();
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      historySubTab === "ledger"
                        ? "bg-[#8B1A1A] text-white shadow-md shadow-red-900/30"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-transparent"
                    }`}
                  >
                    <Wallet size={14} />
                    <span>ប្រវត្តិប្រតិបត្តិការ Ledger ({profileWalletTx.length})</span>
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
                          onClick={() => {
                            setOrderFilter(st as any);
                            setVisibleOrderCount(8);
                          }}
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
                      {visibleOrders.map((order) => (
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
                                href={order.order_id ? `/orders?order_id=${encodeURIComponent(order.order_id)}` : `/orders?order_id=${order.id}`}
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

                  {/* See More Controls */}
                  {filteredOrders.length > 0 && hasMoreOrders && (
                    <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 dark:border-white/10">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        កំពុងបង្ហាញ <span className="font-bold text-gray-900 dark:text-white">{visibleOrders.length}</span> នៃ <span className="font-bold text-gray-900 dark:text-white">{filteredOrders.length}</span> ការបញ្ជាទិញ
                      </p>

                      <button
                        type="button"
                        onClick={() => setVisibleOrderCount((prev) => prev + 5)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 text-xs font-bold transition-all shadow-xs hover:shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer group"
                      >
                        <span>See More (មើលបន្ថែម +5)</span>
                        <ChevronDown size={15} className="text-gray-500 group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 font-bold">
                          សល់ {remainingOrdersCount}
                        </span>
                      </button>
                    </div>
                  )}

                  {filteredOrders.length > 8 && !hasMoreOrders && (
                    <div className="pt-3 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 dark:border-white/10">
                      <span>បានបង្ហាញការបញ្ជាទិញទាំងអស់ចំនួន {filteredOrders.length} រួចរាល់។</span>
                      <button
                        type="button"
                        onClick={() => setVisibleOrderCount(8)}
                        className="text-xs text-[#8B1A1A] dark:text-red-400 hover:underline font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none"
                      >
                        <span>បង្រួមមកវិញ (Show Less)</span>
                        <ChevronUp size={14} />
                      </button>
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

              {/* Sub-Tab 4: Wallet Transactions Ledger */}
              {historySubTab === "ledger" && (
                <div className="space-y-4">
                  {/* Top Header & Clear All */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>ប្រវត្តិប្រតិបត្តិការកាបូបលុយ (Transaction Ledger)</span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-[10px] font-mono font-bold">
                          {filteredProfileWalletTx.length}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        បង្ហាញត្រឹមតែ ១០ ប្រតិបត្តិការចុងក្រោយ (អាចស្វែងរកតាមកាលបរិច្ឆេទ ឬចុចមើលបន្ថែម)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href="/account/wallet"
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all no-underline flex items-center gap-1.5"
                      >
                        <Wallet size={13} className="text-[#8B1A1A] dark:text-red-400" />
                        <span>បើកកាបូបលុយ (Open Wallet)</span>
                      </Link>

                      {profileWalletTx.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllProfileWalletTx}
                          disabled={profileWalletTxClearing}
                          className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="សម្អាតប្រវត្តិប្រតិបត្តិការទាំងអស់"
                        >
                          {profileWalletTxClearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          <span>សម្អាតទាំងអស់ (Clear All)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      {/* Date Picker Input */}
                      <div className="relative flex-1">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="date"
                          value={profileWalletTxSearchDate}
                          onChange={(e) => {
                            setProfileWalletTxSearchDate(e.target.value);
                            setProfileWalletTxDatePreset("all");
                            setProfileWalletTxVisibleCount(10);
                          }}
                          className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-[#141720] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:border-[#8B1A1A] focus:outline-none font-mono"
                          title="ជ្រើសរើសថ្ងៃជាក់លាក់ (Search by exact date)"
                        />
                        {profileWalletTxSearchDate && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfileWalletTxSearchDate("");
                              setProfileWalletTxVisibleCount(10);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-0.5 cursor-pointer bg-transparent border-none"
                            title="សម្អាតថ្ងៃ (Clear date)"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Keyword search input */}
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={profileWalletTxSearchKeyword}
                          onChange={(e) => {
                            setProfileWalletTxSearchKeyword(e.target.value);
                            setProfileWalletTxVisibleCount(10);
                          }}
                          placeholder="ស្វែងរកតាមឈ្មោះ, Ref, ចំនួនទឹកប្រាក់..."
                          className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-[#141720] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#8B1A1A] focus:outline-none"
                        />
                        {profileWalletTxSearchKeyword && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfileWalletTxSearchKeyword("");
                              setProfileWalletTxVisibleCount(10);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-0.5 cursor-pointer bg-transparent border-none"
                            title="សម្អាតពាក្យស្វែងរក"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Presets and Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/50 dark:border-white/5">
                      {/* Date Presets */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                        <span className="text-gray-500 dark:text-gray-400 mr-1 hidden sm:inline text-[11px] font-bold">
                          កាលបរិច្ឆេទ:
                        </span>
                        {(
                          [
                            { id: "all", label: "ទាំងអស់ (All)" },
                            { id: "today", label: "ថ្ងៃនេះ (Today)" },
                            { id: "7days", label: "៧ ថ្ងៃ (7 Days)" },
                            { id: "30days", label: "ខែនេះ (30 Days)" },
                          ] as const
                        ).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setProfileWalletTxDatePreset(p.id);
                              setProfileWalletTxSearchDate("");
                              setProfileWalletTxVisibleCount(10);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                              profileWalletTxDatePreset === p.id && !profileWalletTxSearchDate
                                ? "bg-[#8B1A1A] text-white border-[#8B1A1A] shadow-xs"
                                : "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 border-gray-200 dark:border-white/10"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Type Filter Buttons */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                        {(["all", "deposit", "reward", "purchase"] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              setProfileWalletTxFilter(f);
                              setProfileWalletTxVisibleCount(10);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer whitespace-nowrap ${
                              profileWalletTxFilter === f
                                ? "bg-black dark:bg-white text-white dark:text-black border-transparent shadow-xs"
                                : "bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10"
                            }`}
                          >
                            {f === "all" ? "គ្រប់ប្រភេទ" : f === "deposit" ? "បញ្ចូលលុយ" : f === "reward" ? "កាក់" : "ការទិញ"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Loading Spinner */}
                  {profileWalletTxLoading ? (
                    <div className="py-12 flex justify-center">
                      <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredProfileWalletTx.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-6">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <Wallet size={24} />
                      </div>
                      <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                        {profileWalletTxSearchDate || profileWalletTxSearchKeyword || profileWalletTxDatePreset !== "all" || profileWalletTxFilter !== "all"
                          ? "មិនមានប្រតិបត្តិការត្រូវនឹងលក្ខខណ្ឌស្វែងរកនេះទេ"
                          : "មិនទាន់មានប្រវត្តិប្រតិបត្តិការនៅឡើយទេ"}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                        រាល់ការបញ្ចូលលុយ ការបញ្ជាទិញដោយកាបូប និងកាក់រង្វាន់នឹងបង្ហាញនៅទីនេះ។
                      </p>
                      {(profileWalletTxSearchDate || profileWalletTxSearchKeyword || profileWalletTxDatePreset !== "all" || profileWalletTxFilter !== "all") && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileWalletTxSearchDate("");
                            setProfileWalletTxSearchKeyword("");
                            setProfileWalletTxDatePreset("all");
                            setProfileWalletTxFilter("all");
                            setProfileWalletTxVisibleCount(10);
                          }}
                          className="mt-2 text-xs text-[#8B1A1A] dark:text-red-400 font-bold hover:underline cursor-pointer bg-transparent border-none"
                        >
                          សម្អាតការស្វែងរកទាំងអស់ (Reset Filters)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#141720] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-xs">
                        {displayedProfileWalletTx.map((tx) => {
                          const isDeposit = tx.type === "deposit";
                          const isReward = tx.type === "coin_reward";
                          const isRedeem = tx.type === "coin_redeem";
                          const isPurchase = tx.type === "purchase";
                          const statusLower = (tx.status || "").toLowerCase();
                          const isPending = statusLower === "pending" || statusLower === "processing";
                          const isFailed = ["failed", "cancelled", "rejected", "declined", "error"].includes(statusLower);

                          return (
                            <div
                              key={tx.id}
                              className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isPending
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                      : isFailed
                                      ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                                      : isDeposit
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                      : isReward
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                      : isRedeem
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                                  }`}
                                >
                                  {isDeposit ? (
                                    <ArrowDownLeft size={18} />
                                  ) : isReward ? (
                                    <Sparkles size={18} />
                                  ) : isRedeem ? (
                                    <RefreshCw size={16} />
                                  ) : (
                                    <ArrowUpRight size={18} />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <h5 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {tx.description}
                                  </h5>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    <span>
                                      {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                    {tx.reference_id && (
                                      <span className="truncate">• Ref: {tx.reference_id}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <div className="text-right space-y-0.5">
                                  {isReward && (
                                    <div className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                                      +{tx.coins} Coins
                                    </div>
                                  )}
                                  {isRedeem && (
                                    <div>
                                      <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                                        +${Number(tx.amount).toFixed(2)} USD
                                      </div>
                                      <div className="text-[10px] text-gray-400">-{tx.coins} Coins</div>
                                    </div>
                                  )}
                                  {isDeposit && (
                                    <div
                                      className={`text-xs sm:text-sm font-black ${
                                        isPending
                                          ? "text-amber-600 dark:text-amber-400"
                                          : isFailed
                                          ? "text-red-500 line-through"
                                          : "text-emerald-600 dark:text-emerald-400"
                                      }`}
                                    >
                                      +${Number(tx.amount).toFixed(2)} USD
                                    </div>
                                  )}
                                  {isPurchase && (
                                    <div className="text-xs sm:text-sm font-black text-red-600 dark:text-red-400">
                                      -${Math.abs(Number(tx.amount)).toFixed(2)} USD
                                    </div>
                                  )}

                                  <div>
                                    {isPending ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        <span>PENDING</span>
                                      </span>
                                    ) : isFailed ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        <span>FAILED</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>COMPLETED</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Delete single transaction record button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProfileWalletTx(tx.id)}
                                  disabled={profileWalletTxDeletingId === tx.id}
                                  className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-none cursor-pointer shrink-0 disabled:opacity-40"
                                  title="លុបកំណត់ត្រានេះ (Delete record)"
                                >
                                  {profileWalletTxDeletingId === tx.id ? (
                                    <Loader2 size={15} className="animate-spin text-red-600" />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination: Show 10 by default & See More */}
                      <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          កំពុងបង្ហាញ {displayedProfileWalletTx.length} នៃ {filteredProfileWalletTx.length} ប្រតិបត្តិការ
                        </span>

                        <div className="flex items-center gap-2">
                          {hasMoreProfileWalletTx && (
                            <button
                              type="button"
                              onClick={() => setProfileWalletTxVisibleCount((prev) => prev + 10)}
                              className="px-4 py-2 rounded-xl bg-[#8B1A1A] hover:bg-[#721515] text-white text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                              <span>មើលបន្ថែម (+10 ទៀត) • See More</span>
                              <ChevronDown size={14} />
                            </button>
                          )}

                          {profileWalletTxVisibleCount > 10 && (
                            <button
                              type="button"
                              onClick={() => setProfileWalletTxVisibleCount(10)}
                              className="px-3.5 py-2 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all border-none cursor-pointer flex items-center gap-1"
                            >
                              <span>បង្ហាញតែ ១០ វិញ (Show 10 Only)</span>
                              <ChevronUp size={14} />
                            </button>
                          )}
                        </div>
                      </div>
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
                    {user?.email || profile.email || profile.phone || "S Tech Member"}
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
                    localStorage.removeItem("stech_cached_user_profile");
                    localStorage.removeItem("stech_telegram_connected");
                    localStorage.removeItem("stech_cached_orders");
                    localStorage.removeItem("stech_cached_wallet");
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
                  <span className="text-gray-400">200 S-Tech Coins</span>
                  <span className="font-bold text-emerald-400">$1.00 USD Off</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">1,000 S-Tech Coins (Max Limit)</span>
                  <span className="font-bold text-emerald-400">$5.00 USD Off</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Balance Value</span>
                  <span className="font-bold text-amber-400">${(stats.points / 200).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tier Status (កម្រិតសមាជិក)</span>
                  <span className={`font-bold flex items-center gap-1.5 ${loyaltyTier.colorClass}`}>
                    <span>{loyaltyTier.icon} {loyaltyTier.name}</span>
                    <span className="text-[10px] text-gray-300 font-normal">({loyaltyTier.benefitKh})</span>
                  </span>
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

      {/* ── Real-Time Live Delivery Tracking Modal (Province-Aware: Kampong Cham VET & Phnom Penh PassApp) ─ */}
      <AnimatePresence>
        {showPassAppModal && (() => {
          const loc = resolveDeliveryLocation(trackedOrder, profile);
          const isProvincial = loc.info.isProvincial;
          const timelineSteps = getDeliveryTimeline(trackedOrder?.created_at, isProvincial, loc.info.nameKm);
          const deltaLat = isProvincial ? 0.025 : 0.012;
          const deltaLng = isProvincial ? 0.035 : 0.018;

          return (
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
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
                      isProvincial
                        ? "bg-gradient-to-tr from-emerald-600 to-teal-600"
                        : "bg-gradient-to-tr from-blue-600 to-indigo-600"
                    }`}>
                      {isProvincial ? <Truck size={22} className="text-white" /> : <Bike size={22} className="text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-white">
                          {isProvincial ? "S Tech Provincial Express" : "PassApp Live Delivery Tracking"}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isProvincial
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }`}>
                          {loc.info.courierBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Order #{trackedOrder?.id || (orders[0]?.id || "Live Order")} • គោលដៅ: <strong className="text-white">{loc.info.nameKm}</strong> • រយៈពេល: <strong className="text-amber-400">{loc.info.estTime}</strong>
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
                    {/* Map tile background centered accurately in Kampong Cham or destination province */}
                    <iframe
                      title="Live Driver Tracking Route"
                      width="100%"
                      height="100%"
                      className="border-none opacity-85"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${(loc.lng - deltaLng).toFixed(5)}%2C${(loc.lat - deltaLat).toFixed(5)}%2C${(loc.lng + deltaLng).toFixed(5)}%2C${(loc.lat + deltaLat).toFixed(5)}&layer=mapnik&marker=${loc.lat.toFixed(5)}%2C${loc.lng.toFixed(5)}`}
                    />

                    {/* Animated Courier Pin Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      {/* Customer Destination Pin */}
                      <div className="absolute top-1/4 right-1/4 flex flex-col items-center">
                        <div className="px-2 py-0.5 rounded-md bg-[#8B1A1A] text-white text-[10px] font-bold shadow-lg mb-1 whitespace-nowrap max-w-[200px] truncate">
                          📍 {loc.destinationText}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center shadow-xl border-2 border-white">
                          <MapPin size={16} />
                        </div>
                      </div>

                      {/* Animated Moving Courier Pin */}
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
                        <div className={`px-2 py-0.5 rounded-md text-white text-[10px] font-bold shadow-lg mb-1 whitespace-nowrap flex items-center gap-1 ${
                          isProvincial ? "bg-teal-700" : "bg-blue-600"
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>{isProvincial ? "VET Express Van" : "Courier"} ({loc.info.speed})</span>
                        </div>
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center shadow-xl border-2 border-white ${
                            isProvincial ? "bg-teal-700" : "bg-blue-600"
                          }`}>
                            {isProvincial ? <Truck size={20} /> : <Bike size={20} />}
                          </div>
                          {/* Radar wave ping */}
                          <div className={`absolute -inset-1 rounded-full border-2 animate-ping opacity-60 ${
                            isProvincial ? "border-teal-400" : "border-blue-400"
                          }`} />
                        </div>
                      </motion.div>
                    </div>

                    {/* Floating Map HUD */}
                    <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-bold text-gray-200">
                          {isProvincial ? "ឡានដឹកទំនិញកំពុងធ្វើដំណើរ" : "អ្នកដឹកទំនិញកំពុងធ្វើដំណើរ"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300 font-semibold text-[11px]">
                        <span>Speed: {loc.info.speed}</span>
                        <span>•</span>
                        <span>Dist: {loc.info.dist}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Driver Information Card (Realistic Cambodian Courier) ──────────────────────── */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-800 border-2 border-emerald-500 shrink-0 shadow-md">
                        <img
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=80"
                          alt="S Tech Official Courier"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center font-black py-0.5 text-emerald-400">
                          VERIFIED
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">សុខ វណ្ណា (Sok Vanna)</h4>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            Official Courier #ST-88
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {loc.info.courierVehicle} • <span className="font-mono text-gray-300 font-bold">{loc.info.vehiclePlate}</span>
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold mt-1">
                          <span>★ 4.98</span>
                          <span className="text-gray-400 font-normal">(1,480+ ការដឹកជញ្ជូនជោគជ័យ)</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-emerald-400 font-semibold">{loc.info.courierName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href="tel:+855968280888"
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 no-underline shadow-sm cursor-pointer"
                      >
                        <Phone size={14} />
                        <span>Call Driver</span>
                      </a>
                      <a
                        href="https://t.me/S_TECH_ASSISTANTBOT"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 no-underline shadow-sm cursor-pointer"
                      >
                        <Send size={14} />
                        <span>Telegram</span>
                      </a>
                    </div>
                  </div>

                  {/* ── Order Delivery Steps Timeline (Dynamic Real-World Timestamps) ────────────────── */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                        ដំណើរការដឹកជញ្ជូនជាក់ស្តែង (Real-Time Timeline)
                      </h4>
                      <span className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">
                        {loc.info.transitRoute}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {timelineSteps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          {step.status === "done" ? (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                          ) : step.status === "active" ? (
                            isProvincial ? (
                              <Truck size={16} className="text-teal-400 shrink-0 mt-0.5 animate-pulse" />
                            ) : (
                              <Bike size={16} className="text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                            )
                          ) : (
                            <MapPin size={16} className="text-gray-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold ${
                              step.status === "done" ? "text-emerald-400" :
                              step.status === "active" ? (isProvincial ? "text-teal-400" : "text-blue-400") : "text-gray-400"
                            }`}>
                              {step.title}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {step.subtitle}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-black/40 border-t border-white/10 flex justify-between items-center shrink-0">
                  <div className="text-[11px] text-gray-400 truncate max-w-[250px]">
                    ដៃគូដឹកជញ្ជូនផ្លូវការ: <strong className="text-gray-200">{loc.info.courierName}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassAppModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border-none cursor-pointer"
                  >
                    បិទផ្ទាំង (Close)
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Active Profile Saving Loading HUD ───────────────────── */}
      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[140] flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-900/95 dark:bg-black/95 text-white shadow-2xl backdrop-blur-md border border-white/10"
          >
            <Loader2 size={18} className="animate-spin text-[#c0392b]" />
            <span className="text-xs sm:text-sm font-bold">កំពុងរក្សាទុកទិន្នន័យ Profile ទៅកាន់ Database... (Saving...)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Theme / UI Mode Switch Loading HUD ───────────────────── */}
      <AnimatePresence>
        {(isSwitchingTheme || themeNotice) && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[140] flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-black/90 dark:bg-white/10 text-white backdrop-blur-xl border border-white/20 shadow-2xl"
          >
            {isSwitchingTheme ? (
              <Loader2 size={15} className="animate-spin text-amber-400" />
            ) : (
              <CheckCircle2 size={15} className="text-emerald-400" />
            )}
            <span className="text-xs font-bold tracking-wide">{themeNotice}</span>
          </motion.div>
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
                onClick={() => {
                  setTelegramModalOpen(false);
                  setTelegramPolling(false);
                  if (openedTgTabRef.current && !openedTgTabRef.current.closed) {
                    try { openedTgTabRef.current.close(); } catch (_) {}
                    openedTgTabRef.current = null;
                  }
                }}
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

                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                      កំពុងបើក Telegram Bot ស្វ័យប្រវត្តិ ✈️
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ប្រព័ន្ធកំពុងបញ្ជូនទៅ Telegram... សូមចុច <strong>START</strong> លើ Telegram ដើម្បីភ្ជាប់ភ្លាមៗ!
                    </p>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 py-1 px-3 rounded-lg mx-auto w-fit">
                      <ShieldCheck size={13} />
                      <span>សុវត្ថិភាព 100% • មិនទាមទារលេខសម្ងាត់ ឬព័ត៌មានផ្ទាល់ខ្លួន Telegram ឡើយ</span>
                    </div>
                  </div>

                  {telegramDeepLink && (
                    <div className="space-y-3 pt-2">
                      <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-800/40 flex items-center justify-center gap-2.5 text-xs text-sky-700 dark:text-sky-300 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping"></span>
                        <span>កំពុងរង់ចាំលោកអ្នកចុច Start ក្នុង Telegram...</span>
                      </div>

                      <a
                        href={sanitizeTgDeepLink(telegramDeepLink, telegramToken) || "https://t.me/S_TECH_ASSISTANTBOT"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white text-xs font-bold transition-all no-underline flex items-center justify-center gap-2 cursor-pointer border border-gray-200 dark:border-white/10"
                      >
                        <Send size={14} className="text-[#0088cc]" />
                        <span>បើក Telegram ម្តងទៀត (ប្រសិនបើមិនទាន់លោត)</span>
                        <ExternalLink size={13} className="text-gray-400" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setTelegramModalOpen(false);
                          setTelegramPolling(false);
                          if (openedTgTabRef.current && !openedTgTabRef.current.closed) {
                            try { openedTgTabRef.current.close(); } catch (_) {}
                            openedTgTabRef.current = null;
                          }
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs font-medium transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
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
        {show2faModal && (() => {
          let userTelegramChatId = profile.telegram_chat_id || (profile.firebase_uid?.startsWith("tg_") ? profile.firebase_uid.slice(3) : null) || (user?.uid?.startsWith("tg_") ? user.uid.slice(3) : null);
      if (!userTelegramChatId && profile.telegram && profile.telegram.includes("ID:")) {
        const match = profile.telegram.match(/\d+/);
        if (match) userTelegramChatId = match[0];
      }
          const hasTelegramChannel = Boolean(isTelegramAuthUser || userTelegramChatId || profile.telegram);
          const rawUserEmail = (user?.email || profile.email || "").toLowerCase().trim();
          const hasRealEmailChannel = Boolean(rawUserEmail && !rawUserEmail.endsWith("@telegram.s-tech-store.tech") && !rawUserEmail.endsWith("@tiktok.s-tech-store.tech") && rawUserEmail.includes("@"));

          return (
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
                      {otpSentNotice || (otpChannel === "telegram"
                        ? `លេខកូដសុវត្ថិភាព ៦ ខ្ទង់ ត្រូវបានផ្ញើទៅកាន់ Telegram របស់អ្នក (@${profile.telegram ? profile.telegram.replace(/^@/, '') : 'Bot'})។`
                        : `លេខកូដសុវត្ថិភាព ៦ ខ្ទង់ ត្រូវបានផ្ញើទៅកាន់អ៊ីមែល ${hasRealEmailChannel ? rawUserEmail : 'របស់អ្នក'}។`)}
                    </p>
                  </div>

                  {/* ── Case 3: Both Telegram & Real Email available -> Channel Selector Switcher ── */}
                  {hasTelegramChannel && hasRealEmailChannel && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                        ជ្រើសរើសច្រកទទួលលេខកូដ (Channel)
                      </span>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-black/40 rounded-2xl border border-gray-200 dark:border-white/10">
                        <button
                          type="button"
                          disabled={otpLoading}
                          onClick={() => handleToggle2FA("telegram")}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-50 ${
                            otpChannel === "telegram"
                              ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          }`}
                        >
                          <Send size={13} className={otpChannel === "telegram" ? "text-white" : "text-sky-500"} />
                          <span className="truncate">Telegram</span>
                        </button>
                        <button
                          type="button"
                          disabled={otpLoading}
                          onClick={() => handleToggle2FA("email")}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-50 ${
                            otpChannel === "email"
                              ? "bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white shadow-md"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          }`}
                        >
                          <Mail size={13} className={otpChannel === "email" ? "text-white" : "text-red-500"} />
                          <span className="truncate">Gmail</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Case 1: Telegram Only Badge ── */}
                  {hasTelegramChannel && !hasRealEmailChannel && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[11px] font-bold text-sky-600 dark:text-sky-400 mx-auto">
                      <Send size={12} />
                      <span>ច្រកទទួលកូដ: Telegram Private Bot (@{profile.telegram ? profile.telegram.replace(/^@/, '') : 'S_TECH_ASSISTANTBOT'})</span>
                    </div>
                  )}

                  {/* ── Case 2: Email Only Badge ── */}
                  {!hasTelegramChannel && hasRealEmailChannel && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] font-bold text-red-600 dark:text-red-400 mx-auto">
                      <Mail size={12} />
                      <span>ច្រកទទួលកូដ: Gmail ({rawUserEmail})</span>
                    </div>
                  )}

                  {/* Error Banner */}
                  {otpError && (
                    <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-bold space-y-2.5 text-left">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 text-red-500 mt-0.5" />
                        <span className="leading-relaxed">{otpError}</span>
                      </div>

                      {/* Bot Direct Link + Gmail 1-click fallback */}
                      <div className="space-y-2 pt-1">
                        {(otpErrorType === "bot_not_started" || otpError.includes("/start") || otpError.includes("Bot") || otpChannel === "telegram") && (
                          <a
                            href={otpDeepLink || `https://t.me/${otpBotUsername || "S_TECH_ASSISTANTBOT"}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#229ED9] hover:from-[#0077b5] hover:to-[#1b8fc5] text-white text-xs font-bold flex items-center justify-center gap-2 no-underline shadow-sm transition-transform active:scale-98"
                          >
                            <Send size={14} className="-translate-x-0.5 translate-y-0.5" />
                            <span>បើក Telegram Bot (@{otpBotUsername || "S_TECH_ASSISTANTBOT"}) ចុច Start</span>
                            <ExternalLink size={12} />
                          </a>
                        )}

                        {(hasRealEmailChannel || otpHasEmail || (profile.email && profile.email.includes("@") && !profile.email.endsWith("@s-tech-store.tech"))) && (
                          <button
                            type="button"
                            disabled={otpLoading}
                            onClick={() => handleToggle2FA("email")}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6b1111] hover:to-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 border-none cursor-pointer shadow-sm transition-transform active:scale-98 disabled:opacity-50"
                          >
                            <Mail size={14} />
                            <span>ផ្ញើតាម Gmail ជំនួសវិញ (Send OTP via Gmail)</span>
                          </button>
                        )}
                      </div>
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
                        ⏱️ សុពលភាពលេខកូដត្រឹម ១០ នាទី • ចុច Copy ពី {otpChannel === "telegram" ? "Telegram Bot" : "Gmail"} រួច Paste ទីនេះ
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

                  <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-center gap-1.5">
                    <span>មិនបានទទួលលេខកូដ?</span>
                    <button
                      type="button"
                      disabled={otpLoading}
                      onClick={() => handleToggle2FA(otpChannel)}
                      className="text-blue-500 hover:underline font-bold border-none bg-transparent cursor-pointer p-0 disabled:opacity-50"
                    >
                      {otpLoading ? "កំពុងផ្ញើ..." : "ចុចផ្ញើម្តងទៀត"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Password Reset Channel Selector Modal ─────────────────── */}
      <AnimatePresence>
        {showResetChannelModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-[#141722] text-gray-900 dark:text-white rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl text-center space-y-4"
            >
              <button
                type="button"
                onClick={() => setShowResetChannelModal(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-[#0088cc] flex items-center justify-center mx-auto shadow-md">
                <Key size={30} />
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  ជ្រើសរើសមធ្យោបាយ Reset Password 🔑
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                  គណនីរបស់អ្នកមានទាំង Telegram Bot និង Email ផ្ទាល់ខ្លួន។ តើលោកអ្នកចង់ឱ្យប្រព័ន្ធផ្ញើតំណភ្ជាប់ Reset Password / Magic Login ទៅកាន់មធ្យោបាយណា?
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* Option 1: Telegram Bot */}
                <button
                  type="button"
                  onClick={() => executePasswordReset("telegram")}
                  disabled={resetLoading}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 to-blue-500/10 hover:from-sky-500/20 hover:to-blue-500/20 border border-sky-500/30 text-left transition-all cursor-pointer flex items-center gap-3.5 group active:scale-98"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0088cc] to-[#229ED9] text-white flex items-center justify-center shadow-md shrink-0">
                    <Send size={18} className="-translate-x-0.5 translate-y-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-sky-500 transition-colors">
                        Telegram Bot ផ្លូវការ
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#0088cc]/15 text-[#0088cc]">
                        1-Click លឿនបំផុត
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      ផ្ញើចូលឆាត @S_TECH_ASSISTANTBOT {profile.telegram ? `(@${profile.telegram.replace('@', '')})` : ""}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                {/* Option 2: Real Email / Gmail */}
                <button
                  type="button"
                  onClick={() => executePasswordReset("email")}
                  disabled={resetLoading}
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-left transition-all cursor-pointer flex items-center gap-3.5 group active:scale-98"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-md shrink-0">
                    <Mail size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-500 transition-colors">
                        អាសយដ្ឋាន Email / Gmail
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {user?.email || profile.email}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetChannelModal(false)}
                  className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-gray-300 text-xs font-bold transition-all border-none cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
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

              {resetSuccessModal.channel === "telegram" ? (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0088cc] to-[#229ED9] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#0088cc]/30">
                  <Send size={28} className="-translate-x-0.5 translate-y-0.5" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center mx-auto shadow-md">
                  <Lock size={32} />
                </div>
              )}

              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {resetSuccessModal.channel === "telegram"
                    ? "បានផ្ញើតំណភ្ជាប់ Reset Password ទៅ Telegram! 🔑📱"
                    : "បានផ្ញើតំណភ្ជាប់ Reset Password រួចរាល់! 🔑"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {resetSuccessModal.channel === "telegram"
                    ? "លិខិតផ្លូវការ និងតំណភ្ជាប់ Magic Login & Reset Password ត្រូវបានបញ្ជូនចូលឆាត Bot ផ្ទាល់ខ្លួនរបស់អ្នក:"
                    : "លិខិតផ្លូវការពី S Tech Store Cambodia (www.s-tech-store.tech) ត្រូវបានបញ្ជូនទៅកាន់:"}
                </p>

                {resetSuccessModal.channel === "telegram" ? (
                  <div className="mt-2.5 p-3 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-1">
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center justify-center gap-1.5">
                      <Send size={13} />
                      <span>Official Bot: @S_TECH_ASSISTANTBOT</span>
                    </div>
                    {(resetSuccessModal.telegramChatId || resetSuccessModal.telegramUsername) && (
                      <div className="font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        {resetSuccessModal.telegramUsername ? `@${resetSuccessModal.telegramUsername.replace('@', '')}` : ""}
                        {resetSuccessModal.telegramChatId ? ` (ID: ${resetSuccessModal.telegramChatId})` : ""}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 font-mono text-xs font-bold text-gray-800 dark:text-gray-200">
                    {resetSuccessModal.email}
                  </div>
                )}
              </div>

              {resetSuccessModal.channel === "telegram" && (
                <a
                  href="https://t.me/S_TECH_ASSISTANTBOT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#229ED9] hover:from-[#0077b5] hover:to-[#1b8fc5] text-white text-xs font-bold transition-all shadow-md shadow-[#0088cc]/25 cursor-pointer border-none flex items-center justify-center gap-2 active:scale-98 no-underline"
                >
                  <Send size={14} />
                  <span>បើកឆាត Telegram Bot (@S_TECH_ASSISTANTBOT)</span>
                  <ExternalLink size={13} />
                </a>
              )}

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
                {resetSuccessModal.channel === "telegram"
                  ? "សូមបើកឆាត Telegram Bot ឬចុចប៊ូតុងខាងលើដើម្បីចូលគណនី និង Reset Password ភ្លាមៗ។ តំណភ្ជាប់នេះមានសុពលភាព ២៤ ម៉ោង។"
                  : "សូមពិនិត្យមើលប្រអប់សំបុត្រ Inbox ឬ Spam ក្នុង Email របស់អ្នក។ តំណភ្ជាប់នេះមានសុពលភាព ៦០ នាទី។"}
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

      {/* ── Telegram Disconnect Confirmation Modal ────────────────── */}
      <AnimatePresence>
        {showDisconnectModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-[#141722] text-gray-900 dark:text-white rounded-3xl p-6 sm:p-7 border border-red-500/30 shadow-2xl text-center space-y-4"
            >
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto shadow-md">
                <AlertTriangle size={32} />
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  ផ្តាច់ការភ្ជាប់គណនី Telegram? ⚠️
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  តើអ្នកពិតជាចង់ផ្តាច់ការភ្ជាប់ Telegram នេះមែនទេ? លោកអ្នកនឹងលែងទទួលបានវិក្កយបត្រអេឡិចត្រូនិច (E-Receipts) ឬដំណឹងបញ្ជាទិញចូល Telegram ទៀតហើយ។
                </p>
                {profile.telegram_chat_id && (
                  <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                    ID: {profile.telegram_chat_id} {profile.telegram ? `(@${profile.telegram.replace('@', '')})` : ''}
                  </div>
                )}
                {telegramUnlinking && (
                  <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center gap-2.5 animate-pulse shadow-xs">
                    <RefreshCw size={15} className="animate-spin text-amber-500 shrink-0" />
                    <span>ប្រព័ន្ធកំពុងដំណើរការផ្តាច់ Telegram ពី Database & Bot...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisconnectModal(false)}
                  disabled={telegramUnlinking}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ទេ (បោះបង់)
                </button>
                <button
                  type="button"
                  onClick={executeUnlinkTelegram}
                  disabled={telegramUnlinking}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-75 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 border-none cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {telegramUnlinking ? <RefreshCw size={14} className="animate-spin" /> : null}
                  <span>{telegramUnlinking ? "កំពុងដំណើរការផ្តាច់..." : "យល់ព្រមផ្តាច់"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Real Gmail OTP Verification Modal ────────────────────── */}
      <AnimatePresence>
        {emailVerifyModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-[#141722] text-gray-900 dark:text-white rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl text-center space-y-4"
            >
              <button
                type="button"
                onClick={() => setEmailVerifyModal(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center mx-auto shadow-md">
                <Mail size={30} />
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  ផ្ទៀងផ្ទាត់គណនី Gmail ✉️
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                  យើងបានផ្ញើលេខកូដសម្ងាត់ 6 ខ្ទង់ (OTP) ទៅកាន់ប្រអប់សំបុត្រ Gmail របស់អ្នក៖
                </p>
                <div className="mt-2 p-2 rounded-xl bg-gray-50 dark:bg-white/5 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                  {profile.email}
                </div>
              </div>

              {emailVerifyError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">
                  {emailVerifyError}
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={6}
                  value={emailVerifyOtp}
                  onChange={(e) => setEmailVerifyOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-[8px] font-mono font-black py-3 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-white outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-gray-400">
                  សូមពិនិត្យមើល Inbox ឬ Spam folder ក្នុង Gmail របស់អ្នក (សុពលភាព ១៥ នាទី)
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailVerifyModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all border-none cursor-pointer"
                >
                  បិទ (Close)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEmailOtp}
                  disabled={emailVerifyLoading || emailVerifyOtp.length < 6}
                  className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {emailVerifyLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>ផ្ទៀងផ្ទាត់ OTP</span>
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSendEmailVerification}
                  disabled={emailVerifyLoading}
                  className="text-[11px] text-sky-500 hover:underline bg-transparent border-none cursor-pointer font-semibold"
                >
                  មិនទាន់បានទទួលលេខកូដ? ចុចផ្ញើឡើងវិញ (Resend OTP)
                </button>
              </div>
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
