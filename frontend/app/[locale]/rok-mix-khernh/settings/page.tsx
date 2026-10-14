"use client";

import React, { useState, useEffect } from "react";
import { 
  Store, 
  Globe, 
  Shield, 
  Bell, 
  Upload, 
  Trash2, 
  Send, 
  Check, 
  AlertCircle, 
  Loader2, 
  KeyRound, 
  Mail, 
  Smartphone,
  Lock,
  RefreshCw,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import TelegramBotCard from "@/components/admin/TelegramBotCard";
import api from "@/lib/api";

const ACTIVE_TABS = [
  "Store Profile", 
  "Telegram Bot", 
  "Regional & Currency", 
  "Security & 2FA", 
  "Notification Settings"
];

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState("Store Profile");
  
  // Settings State
  const [storeName, setStoreName] = useState("S Tech Store");
  const [phone, setPhone] = useState("+855 12 345 678");
  const [address, setAddress] = useState("123 Monivong Blvd, Phnom Penh, Cambodia");
  const [telegram, setTelegram] = useState("STechSupport");
  const [language, setLanguage] = useState("Khmer");
  const [currency, setCurrency] = useState("US Dollar USD");
  const [exchangeRate, setExchangeRate] = useState("4100");
  
  // Security & 2FA State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFA, setTwoFA] = useState(false);
  const [twoFaDetails, setTwoFaDetails] = useState<{
    email?: string;
    telegram_linked?: boolean;
    telegram_chat_id?: string;
  }>({});
  
  // 2FA OTP verification modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Notification Preferences
  const [emailNotify, setEmailNotify] = useState(true);
  const [orderNotify, setOrderNotify] = useState(true);
  const [lowStockNotify, setLowStockNotify] = useState(true);
  const [repairNotify, setRepairNotify] = useState(true);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isToggling2FA, setIsToggling2FA] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Fetch Real Settings from Backend ──────────────────────────────────────
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/admin/settings");
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        const s = d.settings || {};
        if (s.store_name) setStoreName(s.store_name);
        if (s.phone) setPhone(s.phone);
        if (s.address) setAddress(s.address);
        if (s.telegram) setTelegram(s.telegram);
        if (s.language) setLanguage(s.language);
        if (s.currency) setCurrency(s.currency);
        if (s.exchange_rate) setExchangeRate(String(s.exchange_rate));
        
        if (s.email_notify !== undefined) setEmailNotify(!!s.email_notify);
        if (s.order_notify !== undefined) setOrderNotify(!!s.order_notify);
        if (s.low_stock_notify !== undefined) setLowStockNotify(!!s.low_stock_notify);
        if (s.repair_notify !== undefined) setRepairNotify(!!s.repair_notify);

        if (d.admin) {
          setTwoFA(!!d.admin.two_factor_enabled);
          setTwoFaDetails({
            email: d.admin.email,
            telegram_linked: !!d.admin.telegram_linked,
            telegram_chat_id: d.admin.telegram_chat_id,
          });
        }
      }
    } catch (err: any) {
      console.warn("Could not load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Save Store Profile ───────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!storeName.trim()) return showToast("ឈ្មោះហាងមិនអាចទទេបានទេ (Store name required)", "error");
    setIsSaving(true);
    try {
      const res = await api.post("/admin/settings", {
        store_name: storeName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        telegram: telegram.trim(),
      });
      if (res.data?.success) {
        showToast("បានរក្សាទុកព័ត៌មានហាងដោយជោគជ័យ", "success");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "បរាជ័យក្នុងការរក្សាទុកព័ត៌មាន";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Save Regional & Currency ─────────────────────────────────────────────
  const handleSaveRegional = async () => {
    const rate = parseFloat(exchangeRate);
    if (isNaN(rate) || rate <= 0) {
      return showToast("សូមបញ្ចូលអត្រាប្តូរប្រាក់ត្រឹមត្រូវ ($1 = ? ៛)", "error");
    }
    setIsSaving(true);
    try {
      const res = await api.post("/admin/settings", {
        language,
        currency,
        exchange_rate: rate,
      });
      if (res.data?.success) {
        showToast("បានរក្សាទុកការកំណត់រូបិយប័ណ្ណ និងភាសាដោយជោគជ័យ", "success");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "បរាជ័យក្នុងការរក្សាទុក";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Save Notifications ───────────────────────────────────────────────────
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const res = await api.post("/admin/settings", {
        email_notify: emailNotify,
        order_notify: orderNotify,
        low_stock_notify: lowStockNotify,
        repair_notify: repairNotify,
      });
      if (res.data?.success) {
        showToast("បានរក្សាទុកជម្រើសជូនដំណឹងដោយជោគជ័យ", "success");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "បរាជ័យក្នុងការរក្សាទុក";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Change Password ──────────────────────────────────────────────────────
  const handleSaveSecurity = async () => {
    if (!currentPassword) {
      return showToast("សូមបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន", "error");
    }
    if (newPassword.length < 8) {
      return showToast("ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៨ តួអក្សរ (Min 8 characters)", "error");
    }
    if (newPassword !== confirmPassword) {
      return showToast("ពាក្យសម្ងាត់បញ្ជាក់មិនត្រូវគ្នាទេ!", "error");
    }

    setIsChangingPassword(true);
    try {
      const res = await api.post("/admin/settings/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      if (res.data?.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        showToast(res.data.message || "បានផ្លាស់ប្តូរពាក្យសម្ងាត់ដោយជោគជ័យ", "success");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || "បរាជ័យក្នុងការប្តូរពាក្យសម្ងាត់";
      showToast(msg, "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ─── Toggle Real 2FA ───────────────────────────────────────────────────────
  const handleToggle2FA = async () => {
    const nextState = !twoFA;
    setIsToggling2FA(true);
    try {
      const res = await api.post("/admin/settings/toggle-2fa", {
        enabled: nextState,
      });
      if (res.data?.success) {
        setTwoFA(nextState);
        showToast(res.data.message || (nextState ? "2FA ត្រូវបានបើកដំណើរការ" : "2FA ត្រូវបានបិទ"), "success");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "បរាជ័យក្នុងការកំណត់ 2FA";
      showToast(msg, "error");
    } finally {
      setIsToggling2FA(false);
    }
  };

  // ─── Request 2FA Test OTP Code ────────────────────────────────────────────
  const handleRequestOtp = async () => {
    setIsSendingOtp(true);
    try {
      const res = await api.post("/admin/settings/send-2fa-code");
      if (res.data?.success) {
        setShowOtpModal(true);
        showToast("លេខកូដ OTP ត្រូវបានផ្ញើទៅកាន់ Email & Telegram Bot រួចហើយ", "info");
      }
    } catch (err: any) {
      showToast("បរាជ័យក្នុងការផ្ញើកូដ OTP", "error");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ─── Verify 2FA OTP Code ──────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      return showToast("សូមបញ្ចូលលេខកូដ ៦ ខ្ទង់ឱ្យបានត្រឹមត្រូវ", "error");
    }
    setIsVerifyingOtp(true);
    try {
      const res = await api.post("/admin/settings/verify-2fa-code", {
        code: otpCode,
      });
      if (res.data?.success) {
        setShowOtpModal(false);
        setOtpCode("");
        setTwoFA(true);
        showToast("ផ្ទៀងផ្ទាត់កូដ 2FA ត្រឹមត្រូវ! Two-Factor Authentication ត្រូវបានការពារពេញលេញ", "success");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "លេខកូដមិនត្រឹមត្រូវ ឬផុតកំណត់";
      showToast(msg, "error");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const TAB_ICONS: Record<string, React.ReactNode> = {
    "Store Profile": <Store size={17} />,
    "Telegram Bot": <Send size={17} className="text-[#0088cc]" />,
    "Regional & Currency": <Globe size={17} />,
    "Security & 2FA": <Shield size={17} />,
    "Notification Settings": <Bell size={17} />,
  };

  const Toggle = ({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) => (
    <button 
      type="button"
      onClick={onChange} 
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50 ${value ? "bg-[#8B1A1A]" : "bg-gray-300"}`}
    >
      <div 
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${value ? "left-6" : "left-1"}`}
      />
    </button>
  );

  return (
    <div className="font-sans max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] px-4 py-2.5 rounded-xl shadow-xl font-bold text-xs sm:text-sm text-white flex items-center gap-2 transition-all animate-in fade-in slide-in-from-top-2 ${
          toast.type === "error" ? "bg-red-600" : toast.type === "info" ? "bg-sky-600" : "bg-emerald-600"
        }`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            System Settings & Security
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            គ្រប់គ្រងព័ត៌មានហាង, រូបិយប័ណ្ណ, ការការពារ 2FA ពិតប្រាកដ និងការជូនដំណឹង Telegram / Email
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full self-start">
            <Loader2 size={13} className="animate-spin text-[#8B1A1A]" />
            <span>កំពុងផ្ទុកទិន្នន័យ...</span>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
        {/* Navigation Tabs — Horizontal scroll on mobile, vertical sidebar on desktop */}
        <div className="w-full md:w-60 flex flex-row overflow-x-auto no-scrollbar md:flex-col gap-1.5 p-1.5 md:p-0 bg-gray-100/90 md:bg-transparent rounded-2xl md:rounded-none shrink-0 border border-gray-200/50 md:border-none">
          {ACTIVE_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`flex items-center gap-2 sm:gap-2.5 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl md:rounded-lg md:border-l-4 text-xs sm:text-sm font-bold transition-all text-left whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? "bg-white md:bg-gray-100/80 md:border-[#8B1A1A] text-[#8B1A1A] shadow-xs" 
                    : "md:border-transparent text-gray-600 hover:bg-white/60 md:hover:bg-gray-50"
                }`}
              >
                <span className={isActive ? "text-[#8B1A1A]" : "text-gray-400"}>
                  {TAB_ICONS[tab]}
                </span>
                <span>{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-6">

          {/* ── 1. STORE PROFILE ── */}
          {activeTab === "Store Profile" && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-7">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Store className="text-[#8B1A1A]" size={20} />
                  <span>Store Profile • ព័ត៌មានហាង</span>
                </h2>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live Active
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center mb-6 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-[#8B1A1A] to-red-600 rounded-2xl flex items-center justify-center text-white text-3xl sm:text-4xl font-black italic shadow-md shrink-0">
                  S
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs sm:text-sm font-extrabold text-gray-900">Store Brand Logo</div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Logo នេះបង្ហាញលើបង្កាន់ដៃវិក្កយបត្រ (Invoice), Header វេបសាយ និងសារស្វាគមន៍ Bot
                  </p>
                  <div className="text-[11px] text-gray-400 font-mono">Recommended: 512×512px. PNG / JPG</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                    ឈ្មោះហាង (Store Name)
                  </label>
                  <input 
                    value={storeName} 
                    onChange={(e) => setStoreName(e.target.value)} 
                    placeholder="S Tech Store"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#8B1A1A] transition-all font-semibold" 
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                    លេខទូរស័ព្ទទំនាក់ទំនង (Hotline)
                  </label>
                  <input 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="+855 12 345 678"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#8B1A1A] transition-all font-semibold font-mono" 
                  />
                </div>
              </div>
              
              <div className="mb-5">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                  អាសយដ្ឋានហាង (Physical Address)
                </label>
                <input 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="រាជធានីភ្នំពេញ, ប្រទេសកម្ពុជា"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#8B1A1A] transition-all font-semibold" 
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                  Telegram Support Username
                </label>
                <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-100 focus-within:border-[#8B1A1A] transition-all">
                  <span className="px-3.5 py-2.5 bg-gray-50 text-gray-500 text-xs sm:text-sm border-r border-gray-200 whitespace-nowrap font-mono">
                    t.me/
                  </span>
                  <input 
                    value={telegram} 
                    onChange={(e) => setTelegram(e.target.value)} 
                    placeholder="STechSupport"
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm outline-none font-semibold font-mono" 
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>រក្សាទុកព័ត៌មាន (Save Changes)</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 2. TELEGRAM BOT CARD (ABA MERCHANT STYLE) ── */}
          {activeTab === "Telegram Bot" && (
            <TelegramBotCard />
          )}

          {/* ── 3. REGIONAL & CURRENCY ── */}
          {activeTab === "Regional & Currency" && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-7">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Globe className="text-blue-600" size={20} />
                  <span>Regional & Currency • រូបិយប័ណ្ណ & អត្រាប្តូរប្រាក់</span>
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                    ភាសាលំនាំដើម (Default Language)
                  </label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#8B1A1A] bg-white transition-all font-semibold"
                  >
                    <option value="Khmer">ភាសាខ្មែរ (Khmer)</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                    រូបិយប័ណ្ណគោល (Primary Currency)
                  </label>
                  <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#8B1A1A] bg-white transition-all font-semibold"
                  >
                    <option value="US Dollar USD">US Dollar (USD - $)</option>
                    <option value="Cambodian Riel KHR">Cambodian Riel (KHR - ៛)</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-gray-900 mb-1">
                    អត្រាប្តូរប្រាក់ផ្លូវការ • Exchange Rate (USD ទៅ KHR)
                  </div>
                  <div className="text-xs text-gray-500">
                    ប្រើសម្រាប់គណនា KHQR Bakong និងបង្ហាញតម្លៃជាប្រាក់រៀលនៅ Checkout
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-gray-900">$1 = </span>
                  <input 
                    type="number" 
                    value={exchangeRate} 
                    onChange={(e) => setExchangeRate(e.target.value)} 
                    className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#8B1A1A] text-right font-black transition-all bg-white" 
                  />
                  <span className="text-sm font-black text-gray-500">៛</span>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                  onClick={handleSaveRegional} 
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>រក្សាទុក (Save Regional)</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 4. SECURITY & REAL 2FA ── */}
          {activeTab === "Security & 2FA" && (
            <div className="flex flex-col gap-6">
              {/* Real 2FA (Two-Factor Authentication) Control */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-7">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-[#8B1A1A] flex items-center justify-center font-black">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-gray-900">
                        Two-Factor Authentication (2FA)
                      </h2>
                      <p className="text-xs text-gray-500">
                        ការពារសុវត្ថិភាពកម្រិតខ្ពស់ជាមួយការផ្ទៀងផ្ទាត់ Email & Telegram Bot
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                    twoFA 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {twoFA ? "2FA Enabled" : "2FA Disabled"}
                  </span>
                </div>

                <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-red-50/30 rounded-2xl border border-gray-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div className="space-y-1">
                    <div className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2">
                      <span>ស្ថានភាព 2FA លើគណនី Admin</span>
                      {twoFA && <CheckCircle2 size={15} className="text-emerald-600" />}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-lg">
                      រាល់ពេលដែល 2FA ត្រូវបានបើក/បិទ ឬមានការចូលប្រើប្រាស់ ប្រព័ន្ធនឹងផ្ញើសារ Security Alert ទៅកាន់ <b>Email</b> និង <b>Telegram Bot</b> ភ្លាមៗដោយស្វ័យប្រវត្តិ។
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-700">
                      {twoFA ? "បើកដំណើរការ" : "បិទ"}
                    </span>
                    <Toggle 
                      value={twoFA} 
                      onChange={handleToggle2FA} 
                      disabled={isToggling2FA} 
                    />
                  </div>
                </div>

                {/* 2FA Target Channels Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Mail size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-gray-500">Security Alert Email</div>
                      <div className="text-xs font-extrabold text-gray-900 truncate">
                        {twoFaDetails.email || "admin@s-tech-store.tech"}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0088cc]/15 text-[#0088cc] flex items-center justify-center shrink-0">
                      <Send size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-gray-500">Telegram Bot Channel</div>
                      <div className="text-xs font-extrabold text-gray-900 truncate">
                        {twoFaDetails.telegram_linked ? "ភ្ជាប់រួចរាល់ (Active)" : "មិនទាន់ភ្ជាប់ (Topic Security)"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test OTP Code Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-wrap gap-3">
                  <div className="text-xs text-gray-500">
                    ចង់តេស្តផ្ញើកូដផ្ទៀងផ្ទាត់ 2FA ទៅកាន់ Email & Telegram Bot ផ្ទាល់?
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isSendingOtp}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-gray-200 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSendingOtp ? <Loader2 size={13} className="animate-spin" /> : <Smartphone size={13} />}
                    <span>ផ្ញើលេខកូដសាកល្បង (Test OTP)</span>
                  </button>
                </div>
              </div>

              {/* Change Password Form */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-7">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Lock className="text-[#8B1A1A]" size={20} />
                  <span>Change Password • ផ្លាស់ប្តូរពាក្យសម្ងាត់</span>
                </h2>
                
                <div className="flex flex-col gap-4 max-w-md">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                      ពាក្យសម្ងាត់បច្ចុប្បន្ន (Current Password)
                    </label>
                    <input 
                      type="password" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      placeholder="••••••••" 
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#8B1A1A] transition-all font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                      ពាក្យសម្ងាត់ថ្មី (New Password • យ៉ាងតិច ៨ តួ)
                    </label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="យ៉ាងតិច ៨ តួអក្សរ" 
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#8B1A1A] transition-all font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                      បញ្ជាក់ពាក្យសម្ងាត់ថ្មី (Confirm New Password)
                    </label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="វាយបញ្ចូលពាក្យសម្ងាត់ថ្មីម្តងទៀត" 
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-[#8B1A1A] transition-all font-mono" 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-5 mt-6 border-t border-gray-100">
                  <button 
                    onClick={handleSaveSecurity} 
                    disabled={isChangingPassword}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isChangingPassword && <Loader2 size={14} className="animate-spin" />}
                    <span>ប្តូរពាក្យសម្ងាត់ (Update Password)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 5. NOTIFICATION PREFERENCES ── */}
          {activeTab === "Notification Settings" && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-7">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="text-blue-600" size={20} />
                  <span>Notification Settings • ការកំណត់ការជូនដំណឹង</span>
                </h2>
              </div>
              
              <div className="flex flex-col gap-3.5">
                {[
                  { 
                    label: "Email Notifications (សារជូនដំណឹងតាមអ៊ីមែល)", 
                    desc: "ទទួលរបាយការណ៍សង្ខេប និងការជូនដំណឹង Security Alerts មកកាន់ Email.", 
                    value: emailNotify, 
                    set: () => setEmailNotify(!emailNotify) 
                  },
                  { 
                    label: "New Order Alerts (ការកុម្ម៉ង់ទិញថ្មី)", 
                    desc: "ជូនដំណឹងភ្លាមៗនៅពេលមានអតិថិជនដាក់ Order ឬបង់ប្រាក់ KHQR ជោគជ័យ.", 
                    value: orderNotify, 
                    set: () => setOrderNotify(!orderNotify) 
                  },
                  { 
                    label: "Low Stock Warnings (ទំនិញជិតអស់ស្តុក)", 
                    desc: "ផ្ញើការព្រមានជាបន្ទាន់នៅពេលទំនិញក្នុងស្តុកនៅសល់ក្រោម ៥ គ្រឿង.", 
                    value: lowStockNotify, 
                    set: () => setLowStockNotify(!lowStockNotify) 
                  },
                  { 
                    label: "Repair Status Updates (សេវាជួសជុលកុំព្យូទ័រ)", 
                    desc: "ជូនដំណឹងរាល់ពេលប្តូរស្ថានភាពប័ណ្ណជួសជុល (Repair Ticket) របស់អតិថិជន.", 
                    value: repairNotify, 
                    set: () => setRepairNotify(!repairNotify) 
                  },
                ].map(({ label, desc, value, set }) => (
                  <div 
                    key={label} 
                    className="flex justify-between items-center p-4 sm:p-5 bg-gray-50/80 rounded-2xl border border-gray-200 transition-colors hover:bg-gray-100/70"
                  >
                    <div className="pr-4">
                      <div className="text-xs sm:text-sm font-extrabold text-gray-900 mb-1">{label}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
                    </div>
                    <Toggle value={value} onChange={set} />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-5 mt-6 border-t border-gray-100">
                <button 
                  onClick={handleSaveNotifications} 
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>រក្សាទុកជម្រើស (Save Preferences)</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2FA OTP Verification Modal Popup */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#8B1A1A] flex items-center justify-center mx-auto mb-4">
              <KeyRound size={24} />
            </div>
            
            <h3 className="text-base font-black text-gray-900 mb-1">
              ផ្ទៀងផ្ទាត់កូដ 2FA OTP
            </h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              ប្រព័ន្ធបានបញ្ជូនលេខកូដ ៦ ខ្ទង់ទៅកាន់ <b>Email</b> និង <b>Telegram Bot</b> របស់អ្នករួចរាល់ហើយ។
            </p>

            <input 
              type="text" 
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="0 0 0 0 0 0"
              className="w-full py-3 text-center text-2xl font-black tracking-widest border border-gray-300 rounded-2xl outline-none focus:border-[#8B1A1A] focus:ring-2 focus:ring-red-100 mb-5 font-mono"
            />

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => { setShowOtpModal(false); setOtpCode(""); }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border-none"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="flex-1 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-none flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isVerifyingOtp && <Loader2 size={13} className="animate-spin" />}
                <span>ផ្ទៀងផ្ទាត់</span>
              </button>
            </div>
          </div>
        </div>
      {/* ── Active Admin Saving Loading HUD ───────────────────── */}
      {isSaving && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-900/95 text-white shadow-2xl backdrop-blur-md border border-white/10 animate-in fade-in slide-in-from-top-4 duration-200">
          <Loader2 size={18} className="animate-spin text-red-500" />
          <span className="text-xs sm:text-sm font-bold">កំពុងរក្សាទុកការកំណត់ប្រព័ន្ធ... (Saving Settings...)</span>
        </div>
      )}
    </div>
  );
}
