"use client";

import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { Link } from "@/i18n/routing";
import { 
  Users, Search, Filter, ShieldCheck, UserCheck, UserX, 
  Key, RefreshCw, MapPin, Phone, Mail, Send, Calendar, 
  ShoppingBag, CheckCircle2, AlertCircle, Eye, Trash2, X,
  Copy, ExternalLink, MessageCircle, Check, Link2, Coins, MessageSquare, ChevronRight
} from "lucide-react";

export interface AdminCustomerUser {
  id: number;
  firebase_uid: string;
  display_name: string;
  username?: string | null;
  email: string;
  photo_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  delivery_notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  telegram: string | null;
  telegram_chat_id?: string | null;
  has_telegram?: boolean;
  profession: string | null;
  gender: string | null;
  birthday: string | null;
  is_admin: boolean;
  is_active: boolean;
  status: string;
  points: number;
  total_orders: number;
  total_spent: number;
  created_at: string | null;
  last_password_reset_at: string | null;
}

const CACHE_KEY = "admin_cached_customer_users";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminCustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  
  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminCustomerUser | null>(null);
  const [resetModalUser, setResetModalUser] = useState<AdminCustomerUser | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [magicLinkResult, setMagicLinkResult] = useState<{
    link: string;
    token: string;
    expires_at: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Deep Drawer States for Customer
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "points" | "actions">("profile");
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [adjustPointsDelta, setAdjustPointsDelta] = useState<string>("");
  const [adjustPointsReason, setAdjustPointsReason] = useState<string>("");
  const [adjustingPoints, setAdjustingPoints] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Database Caching: Fetch ONCE and cache in sessionStorage unless explicitly refreshed by admin
  const fetchUsers = async (forceRefresh: boolean = false) => {
    try {
      if (!forceRefresh && typeof window !== "undefined") {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const list = JSON.parse(cached);
            if (Array.isArray(list) && list.length > 0) {
              setUsers(list);
              setLoading(false);
              return;
            }
          } catch (e) {}
        }
      }

      setLoading(true);
      const res = await api.get("/admin/users");
      const list = Array.isArray(res.data) ? res.data : [];
      setUsers(list);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
      }
      if (forceRefresh) {
        showToast("បានទាញយកទិន្នន័យថ្មីពី Database ជោគជ័យ!");
      }
    } catch (e: any) {
      showToast("បរាជ័យក្នុងការទាញយកបញ្ជីអតិថិជន", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(false);
  }, []);

  const handleToggleStatus = async (user: AdminCustomerUser) => {
    setTogglingId(user.id);
    try {
      const res = await api.put(`/admin/users/${user.id}/toggle-status`);
      const updatedUser = res.data?.user;
      const newActive = updatedUser ? updatedUser.is_active : !user.is_active;
      const newStatus = updatedUser ? updatedUser.status : (newActive ? "active" : "disabled");

      setUsers((prev) => {
        const updated = prev.map((u) => (u.id === user.id ? { ...u, is_active: newActive, status: newStatus } : u));
        if (typeof window !== "undefined") {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        }
        return updated;
      });

      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, is_active: newActive, status: newStatus } : null));
      }

      showToast(res.data?.message || (newActive ? "បានបើកដំណើរការគណនីជោគជ័យ" : "បានផ្អាកដំណើរការគណនីជោគជ័យ"));
    } catch (e: any) {
      showToast("បរាជ័យក្នុងការផ្លាស់ប្តូរស្ថានភាពគណនី", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const fetchCustomerOrders = async (userId: number) => {
    setLoadingOrders(true);
    try {
      const res = await api.get(`/admin/users/${userId}/orders`);
      setCustomerOrders(res.data?.orders || []);
    } catch (e) {
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOpenUserDetail = (user: AdminCustomerUser) => {
    setSelectedUser(user);
    setActiveTab("profile");
    setAdjustPointsDelta("");
    setAdjustPointsReason("");
    fetchCustomerOrders(user.id);
  };

  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const delta = parseInt(adjustPointsDelta);
    if (isNaN(delta) || delta === 0) {
      showToast("សូមបញ្ចូលចំនួនពិន្ទុត្រឹមត្រូវ (+ ឬ -)", "error");
      return;
    }

    setAdjustingPoints(true);
    try {
      const res = await api.post(`/admin/users/${selectedUser.id}/adjust-points`, {
        points: delta,
        reason: adjustPointsReason.trim() || undefined,
      });

      if (res.data?.success) {
        const newPoints = res.data.points;
        setSelectedUser((prev) => (prev ? { ...prev, points: newPoints } : null));
        setUsers((prev) => {
          const updated = prev.map((u) => (u.id === selectedUser.id ? { ...u, points: newPoints } : u));
          if (typeof window !== "undefined") {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(updated));
          }
          return updated;
        });
        showToast(`បានកែសម្រួលពិន្ទុ ${delta > 0 ? "+" : ""}${delta} pts ដោយជោគជ័យ!`);
        setAdjustPointsDelta("");
        setAdjustPointsReason("");
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការកែសម្រួលពិន្ទុ", "error");
    } finally {
      setAdjustingPoints(false);
    }
  };

  const handleOpenResetModal = (user: AdminCustomerUser) => {
    setResetModalUser(user);
    setMagicLinkResult(null);
    setCopiedLink(false);
    handleGenerateMagicLink(user);
  };

  const handleGenerateMagicLink = async (targetUser?: AdminCustomerUser) => {
    const userToReset = targetUser || resetModalUser;
    if (!userToReset) return;
    setIsResetting(true);
    setCopiedLink(false);
    try {
      const res = await api.post(`/admin/users/${userToReset.id}/magic-link`);
      if (res.data?.success) {
        setMagicLinkResult({
          link: res.data.magic_link,
          token: res.data.token,
          expires_at: res.data.expires_at,
        });
        showToast(res.data.message || "បានបង្កើត Magic Login Link ដោយជោគជ័យ");

        // Update last_password_reset_at in-place without re-querying the database
        const now = new Date().toISOString();
        setUsers((prev) => {
          const updated = prev.map((u) => (u.id === userToReset.id ? { ...u, last_password_reset_at: now } : u));
          if (typeof window !== "undefined") {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(updated));
          }
          return updated;
        });
        if (resetModalUser && resetModalUser.id === userToReset.id) {
          setResetModalUser((prev) => (prev ? { ...prev, last_password_reset_at: now } : null));
        }
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការបង្កើត Magic Link", "error");
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!magicLinkResult?.link) return;
    try {
      await navigator.clipboard.writeText(magicLinkResult.link);
      setCopiedLink(true);
      showToast("បានចម្លង Magic Login Link រួចរាល់!");
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      showToast("មិនអាចចម្លងតំណភ្ជាប់បានទេ សូមជ្រើសរើសហើយ Copy ដោយផ្ទាល់", "error");
    }
  };

  // 100% PRIVATE: Send directly to Customer's private Telegram bot or Gmail (Never spam Admin group)
  const handleSendMagicLinkPrivate = async () => {
    if (!resetModalUser) return;
    setIsSendingTelegram(true);
    try {
      const res = await api.post(`/admin/users/${resetModalUser.id}/send-magic-link-telegram`);
      if (res.data?.success) {
        const channel = res.data?.channel;
        if (channel === "telegram_private") {
          showToast("🚀 បានបាញ់ Magic Link ទៅកាន់ Telegram Bot ឯកជនរបស់អតិថិជនជោគជ័យ!");
        } else if (channel === "email") {
          showToast(`📧 បានផ្ញើ Magic Link ទៅកាន់ Gmail (${resetModalUser.email}) របស់អតិថិជនជោគជ័យ!`);
        } else {
          showToast(res.data?.message || "បានបញ្ជូនតំណភ្ជាប់ជោគជ័យ!");
        }
      } else {
        showToast(res.data?.message || "មិនអាចបញ្ជូនបានទេ សូមសាកល្បងម្ដងទៀត", "error");
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការបញ្ជូន", "error");
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបគណនី "${name}" មែនទេ?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => {
        const updated = prev.filter((u) => u.id !== id);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
      showToast(`បានលុបគណនី "${name}" ដោយជោគជ័យ`);
      if (selectedUser?.id === id) setSelectedUser(null);
    } catch (e: any) {
      showToast("បរាជ័យក្នុងការលុបគណនី", "error");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (u.display_name && u.display_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q)) ||
        (u.telegram && u.telegram.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.is_active) ||
        (statusFilter === "disabled" && !u.is_active);

      return matchSearch && matchStatus;
    });
  }, [users, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const disabled = users.filter((u) => !u.is_active).length;
    const totalOrders = users.reduce((acc, u) => acc + (u.total_orders || 0), 0);
    return { total, active, disabled, totalOrders };
  }, [users]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "មិនទាន់កំណត់";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("km-KH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="font-sans max-w-7xl mx-auto pb-12">
      {toast && (
        <div className={`fixed top-6 right-6 z-[99999] px-5 py-3 rounded-2xl shadow-xl font-bold text-sm text-white flex items-center gap-2 ${
          toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
        } animate-in fade-in`}>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
            គ្រប់គ្រងគណនីអតិថិជន
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            ពិនិត្យមើលកាលបរិច្ឆេទចុះឈ្មោះ ព័ត៌មានលម្អិត បិទ/បើកដំណើរការគណនី និងកំណត់ពាក្យសម្ងាត់ឡើងវិញ
          </p>
        </div>

        <button
          onClick={() => fetchUsers(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-[#8B1A1A]" : ""} />
          <span>ធ្វើបច្ចុប្បន្នភាព</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">អតិថិជនសរុប</span>
            <Users size={18} className="text-[#8B1A1A]" />
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.total}</div>
          <div className="text-[11px] text-gray-400 mt-1">គណនីចុះឈ្មោះក្នុងប្រព័ន្ធ</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">គណនីសកម្ម</span>
            <UserCheck size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.active}</div>
          <div className="text-[11px] text-gray-400 mt-1">អាចកុម្ម៉ង់ និងចូលប្រើបាន</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">គណនីបានផ្អាក</span>
            <UserX size={18} className="text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600">{stats.disabled}</div>
          <div className="text-[11px] text-gray-400 mt-1">ត្រូវបិទដោយ Admin</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">ការកុម្ម៉ង់សរុប</span>
            <ShoppingBag size={18} className="text-sky-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalOrders}</div>
          <div className="text-[11px] text-gray-400 mt-1">Orders ពីអតិថិជនទាំងអស់</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ អ៊ីមែល ទូរស័ព្ទ Telegram ឬទីក្រុង..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400 hidden sm:block" />
          <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-bold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              ទាំងអស់ ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "active" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              សកម្ម ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter("disabled")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "disabled" ? "bg-white text-red-600 shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              បានផ្អាក ({stats.disabled})
            </button>
          </div>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs font-black uppercase tracking-wider">
                <th className="py-4 px-5">គណនីអតិថិជន</th>
                <th className="py-4 px-4">ទំនាក់ទំនង</th>
                <th className="py-4 px-4">ថ្ងៃចុះឈ្មោះ</th>
                <th className="py-4 px-4">ការកុម្ម៉ង់ & ចំណាយ</th>
                <th className="py-4 px-4 text-center">ស្ថានភាព</th>
                <th className="py-4 px-5 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-[#8B1A1A]" />
                      <span>កំពុងផ្ទុកបញ្ជីអតិថិជនពី Cloud Database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    មិនមានទិន្នន័យអតិថិជនដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* User Profile */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden font-bold text-gray-600">
                          {u.photo_url ? (
                            <img src={u.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{u.display_name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                            <span>{u.display_name}</span>
                            {u.is_admin && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-red-100 text-[#8B1A1A]">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">{u.email || "No email"}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs">
                          <Phone size={12} className="text-gray-400" />
                          <span>{u.phone || "—"}</span>
                        </div>
                        {u.has_telegram ? (
                          <div className="flex items-center gap-1 text-[11px] text-sky-600 font-bold" title="Connected to Telegram Bot">
                            <Send size={11} />
                            <span>{u.telegram ? `@${u.telegram.replace("@", "")}` : "Telegram Bot"}</span>
                          </div>
                        ) : u.telegram ? (
                          <div className="flex items-center gap-1 text-[11px] text-sky-600">
                            <Send size={11} />
                            <span>@{u.telegram.replace("@", "")}</span>
                          </div>
                        ) : null}
                        {u.city && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <MapPin size={11} />
                            <span>{u.city}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Registration Date */}
                    <td className="py-3.5 px-4 text-gray-600 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
                        <span>{formatDate(u.created_at)}</span>
                      </div>
                      {u.last_password_reset_at && (
                        <div className="text-[10px] text-amber-600 mt-0.5">
                          Reset: {formatDate(u.last_password_reset_at)}
                        </div>
                      )}
                    </td>

                    {/* Orders & Spent */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">
                        {u.total_orders} orders
                      </div>
                      <div className="text-xs text-emerald-700 font-mono font-bold">
                        ${Number(u.total_spent || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        disabled={togglingId === u.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                          u.is_active
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        } disabled:opacity-50`}
                      >
                        <span className={`w-2 h-2 rounded-full ${u.is_active ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                        <span>{u.is_active ? "សកម្ម" : "បានផ្អាក"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenUserDetail(u)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="មើលព័ត៌មានលម្អិត • View Full Profile"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenResetModal(u)}
                          className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Magic Login Link • Reset Password"
                        >
                          <Key size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.display_name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="លុបគណនី • Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Deep Drawer: Comprehensive Customer Management */}
      {selectedUser && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer z-10"
            >
              <X size={20} />
            </button>

            {/* Header: Customer Profile Card */}
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-950 border border-gray-200 flex items-center justify-center text-xl font-black text-white overflow-hidden shrink-0 shadow-md">
                {selectedUser.photo_url ? (
                  <img src={selectedUser.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{selectedUser.display_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-black text-gray-900 m-0 truncate">
                    {selectedUser.display_name}
                  </h3>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                    selectedUser.is_active ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {selectedUser.is_active ? "● គណនីសកម្ម" : "● បានផ្អាក"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{selectedUser.email}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                    <Coins size={14} className="text-amber-500" />
                    <span>{selectedUser.points} Loyalty Coins</span>
                  </span>
                  <span className="font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-xl text-[11px]">
                    {selectedUser.total_orders || 0} Orders (${selectedUser.total_spent || 0})
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-2xl mb-4 shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "profile"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Users size={14} />
                <span>ព័ត៌មានទូទៅ</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "orders"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <ShoppingBag size={14} />
                <span>ប្រវត្តិបញ្ជាទិញ ({customerOrders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("points")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "points"
                    ? "bg-white text-amber-800 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Coins size={14} className="text-amber-500" />
                <span>កែសម្រួលកាក់</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("actions")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "actions"
                    ? "bg-white text-red-700 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Key size={14} />
                <span>សកម្មភាពរហ័ស</span>
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {/* Tab 1: Profile & Delivery */}
              {activeTab === "profile" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <span className="text-gray-400 block font-medium">លេខទូរស័ព្ទ:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-gray-900 font-mono">{selectedUser.phone || "—"}</span>
                        {selectedUser.phone && (
                          <a href={`tel:${selectedUser.phone}`} className="text-[#8B1A1A] hover:underline flex items-center gap-0.5 text-[11px] font-bold">
                            <Phone size={11} /> Call
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Telegram:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-sky-600 font-mono">{selectedUser.telegram ? `@${selectedUser.telegram.replace("@", "")}` : "—"}</span>
                        {selectedUser.telegram && (
                          <a
                            href={`https://t.me/${selectedUser.telegram.replace("@", "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-600 hover:underline flex items-center gap-0.5 text-[11px] font-bold"
                          >
                            <ExternalLink size={11} /> Open
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">មុខរបរ/អាជីព:</span>
                      <span className="font-bold text-gray-900 mt-0.5 block">{selectedUser.profession || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">ភេទ / ថ្ងៃខែកំណើត:</span>
                      <span className="font-bold text-gray-900 mt-0.5 block">{selectedUser.gender || "—"} {selectedUser.birthday ? `(${selectedUser.birthday})` : ""}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 block font-medium">អាសយដ្ឋានដឹកជញ្ជូន:</span>
                      <span className="font-bold text-gray-900 mt-0.5 block">{selectedUser.address ? `${selectedUser.address}, ${selectedUser.city || ""}` : "—"}</span>
                    </div>
                    {selectedUser.delivery_notes && (
                      <div className="sm:col-span-2">
                        <span className="text-gray-400 block font-medium">ចំណាំទីតាំងដឹកជញ្ជូន:</span>
                        <span className="italic text-gray-700 mt-0.5 block">{selectedUser.delivery_notes}</span>
                      </div>
                    )}
                    {(selectedUser.gps_lat || selectedUser.gps_lng) && (
                      <div className="sm:col-span-2 pt-2 border-t border-gray-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                          <MapPin size={14} />
                          <span>GPS: {selectedUser.gps_lat}, {selectedUser.gps_lng}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${selectedUser.gps_lat},${selectedUser.gps_lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 flex items-center gap-1"
                        >
                          <ExternalLink size={12} /> Google Maps
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-gray-500 flex flex-col gap-1">
                    <div><b>Firebase UID:</b> <span className="font-mono text-gray-700">{selectedUser.firebase_uid || "N/A"}</span></div>
                    <div><b>ចុះឈ្មោះនៅថ្ងៃ៖</b> {formatDate(selectedUser.created_at)}</div>
                    {selectedUser.last_password_reset_at && (
                      <div><b>កាលបរិច្ឆេទ Reset ពាក្យសម្ងាត់ចុងក្រោយ៖</b> {formatDate(selectedUser.last_password_reset_at)}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Orders History */}
              {activeTab === "orders" && (
                <div className="space-y-3">
                  {loadingOrders ? (
                    <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center">
                      <RefreshCw size={24} className="animate-spin text-[#8B1A1A] mb-2" />
                      <span className="text-xs font-bold">កំពុងទាញយកប្រវត្តិបញ្ជាទិញ...</span>
                    </div>
                  ) : customerOrders.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center bg-gray-50 rounded-2xl">
                      <ShoppingBag size={32} className="text-gray-300 mb-2 stroke-1" />
                      <p className="text-xs font-bold text-gray-700">មិនទាន់មានប្រវត្តិបញ្ជាទិញនៅឡើយទេ</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">អតិថិជននេះមិនទាន់បានដាក់ Order លើ website នៅឡើយ</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {customerOrders.map((ord: any) => (
                        <div key={ord.id} className="p-3.5 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-200/70 transition-all flex items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900 font-mono">#{ord.order_number || ord.id}</span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                ord.status === "completed" || ord.status === "delivered"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : ord.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {ord.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1">
                              {ord.items?.length || 1} មុខទំនិញ • {formatDate(ord.created_at)}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-black text-gray-900 text-sm font-mono text-[#8B1A1A]">
                              ${ord.total_amount || ord.total_price || 0}
                            </div>
                            <Link
                              href={`/rok-mix-khernh/orders`}
                              className="text-[11px] text-blue-600 font-bold hover:underline flex items-center justify-end gap-0.5 mt-0.5"
                            >
                              <span>មើលក្នុង Orders</span>
                              <ChevronRight size={12} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Adjust Loyalty Coins */}
              {activeTab === "points" && (
                <div className="space-y-4">
                  {/* Current Points Hero */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/5 border border-amber-300/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">កាក់ភក្តីភាពបច្ចុប្បន្ន</span>
                      <div className="text-3xl font-black text-amber-950 font-mono flex items-center gap-2 mt-1">
                        <Coins size={28} className="text-amber-500" />
                        <span>{selectedUser.points} <span className="text-sm font-normal text-amber-800">PTS</span></span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-500 text-white shadow-xs">
                      VIP Rewards
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      ចំនួនបន្ថែមរហ័ស • Quick Adjust
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "+10 pts", val: "10" },
                        { label: "+50 pts (VIP Gift)", val: "50" },
                        { label: "+100 pts (Special Promo)", val: "100" },
                        { label: "+200 pts", val: "200" },
                        { label: "-50 pts (Deduct)", val: "-50" },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAdjustPointsDelta(preset.val)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-xs font-bold text-gray-700 hover:text-amber-900 transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Adjustment Form */}
                  <form onSubmit={handleAdjustPointsSubmit} className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        ចំនួនពិន្ទុកែប្រែ (+ ឬ -) *
                      </label>
                      <input
                        type="number"
                        required
                        value={adjustPointsDelta}
                        onChange={(e) => setAdjustPointsDelta(e.target.value)}
                        placeholder="ឧ. 50 ឬ -20"
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        មូលហេតុ / Reason (នឹងជូនដំណឹងទៅអតិថិជន)
                      </label>
                      <input
                        type="text"
                        value={adjustPointsReason}
                        onChange={(e) => setAdjustPointsReason(e.target.value)}
                        placeholder="ឧទាហរណ៍៖ កាដូពិសេសសម្រាប់ខួបកំណើត ឬសងការដឹកយឺត..."
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={adjustingPoints || !adjustPointsDelta}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Coins size={15} />
                      <span>{adjustingPoints ? "កំពុងរក្សាទុក..." : "រក្សាទុកពិន្ទុថ្មី • Update Points"}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 4: Direct Actions */}
              {activeTab === "actions" && (
                <div className="space-y-3">
                  {/* Action 1: Live Chat */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#8B1A1A] text-white flex items-center justify-center shadow-xs shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">ឆាតផ្ទាល់ Real-time ជាមួយអតិថិជន</div>
                        <div className="text-[11px] text-gray-500">បើកបន្ទប់ឆាត Live ក្នុង Admin ដើម្បីឆ្លើយតបសំណួរ</div>
                      </div>
                    </div>
                    <Link
                      href="/rok-mix-khernh/chat"
                      className="px-4 py-2 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm no-underline shrink-0"
                    >
                      <span>បើកឆាត</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>

                  {/* Action 2: Magic Link */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Key size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">Magic Login Link • Reset Password</div>
                        <div className="text-[11px] text-gray-500">បង្កើត Link សម្រាប់អតិថិជន Login ដោយមិនបាច់វាយពាក្យសម្ងាត់</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenResetModal(selectedUser);
                        setSelectedUser(null);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                    >
                      <span>បង្កើត Link</span>
                    </button>
                  </div>

                  {/* Action 3: Suspend / Activate Account */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-xs shrink-0 ${
                        selectedUser.is_active ? "bg-red-600" : "bg-emerald-600"
                      }`}>
                        {selectedUser.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">
                          {selectedUser.is_active ? "ផ្អាកដំណើរការគណនី (Suspend)" : "បើកដំណើរការគណនីឡើងវិញ (Activate)"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {selectedUser.is_active ? "បិទមិនឱ្យអតិថិជននេះ Login ចូលប្រើប្រាស់" : "អនុញ្ញាតឱ្យអតិថិជន Login និងកម្ម៉ង់ទំនិញឡើងវិញ"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(selectedUser)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 ${
                        selectedUser.is_active
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <span>{selectedUser.is_active ? "ផ្អាកគណនី" : "បើកគណនី"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs cursor-pointer transition-colors"
              >
                បិទផ្ទាំង • Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Magic Login & Reset Password Link Generator */}
      {resetModalUser && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 relative">
            <button
              onClick={() => {
                setResetModalUser(null);
                setMagicLinkResult(null);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Key size={30} />
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-black text-gray-900 mb-1.5">
                Magic Login Link • Reset Password
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                បង្កើតតំណភ្ជាប់ចូលគណនីផ្ទាល់សម្រាប់អតិថិជន <b>{resetModalUser.display_name}</b> ({resetModalUser.email})។ អតិថិជនអាចចុចចូលភ្លាមៗដោយមិនបាច់វាយពាក្យសម្ងាត់ចាស់។
              </p>
              <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border">
                {resetModalUser.has_telegram ? (
                  <span className="flex items-center gap-1.5 text-sky-700 bg-sky-50 border-sky-200">
                    <span className="w-2 h-2 rounded-full bg-[#229ED9] animate-pulse" />
                    <span>ភ្ជាប់ Telegram រួចរាល់ (ផ្ញើទៅ Private Bot)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>មិនទាន់ភ្ជាប់ Telegram (ផ្ញើទៅកាន់ Gmail)</span>
                  </span>
                )}
              </div>
            </div>

            {isResetting ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={28} className="animate-spin text-amber-600" />
                <span className="text-xs font-bold text-gray-500">កំពុងបង្កើតតំណភ្ជាប់សុវត្ថិភាពពី Neon DB...</span>
              </div>
            ) : magicLinkResult ? (
              <div className="space-y-4">
                {/* Link Box */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    តំណភ្ជាប់ចូលគណនីផ្ទាល់ • One-time Magic Link
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:border-amber-500 focus-within:bg-white transition-all">
                    <Link2 size={16} className="text-gray-400 shrink-0 ml-1" />
                    <input
                      type="text"
                      readOnly
                      value={magicLinkResult.link}
                      className="w-full bg-transparent text-xs text-gray-800 font-mono outline-none select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                        copiedLink
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-900 hover:bg-gray-800 text-white"
                      }`}
                    >
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedLink ? "បានចម្លង!" : "Copy Link"}</span>
                    </button>
                  </div>
                </div>

                {/* Expiration Note */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <b>សុពលភាព ២៤ ម៉ោង (100% Private)៖</b> តំណភ្ជាប់នេះបញ្ជូនផ្ទាល់ទៅអតិថិជនតែម្នាក់គត់ មិនលេចធ្លាយក្នុង Admin Group ឡើយ។ ពេលអតិថិជនចុចរួច វានឹងផុតកំណត់ដោយស្វ័យប្រវត្តិ។
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {/* Send via Private Telegram Bot or Gmail */}
                  <button
                    type="button"
                    onClick={handleSendMagicLinkPrivate}
                    disabled={isSendingTelegram}
                    title={resetModalUser.has_telegram ? "ផ្ញើសារឯកជនទៅ Telegram Bot របស់អតិថិជន" : "ផ្ញើអ៊ីមែល Reset ទៅកាន់ Gmail របស់អតិថិជន"}
                    className={`py-2.5 px-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs ${
                      resetModalUser.has_telegram
                        ? "bg-[#229ED9] hover:bg-[#1b8ec3]"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {isSendingTelegram ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : resetModalUser.has_telegram ? (
                      <Send size={14} />
                    ) : (
                      <Mail size={14} />
                    )}
                    <span>
                      {isSendingTelegram
                        ? "កំពុងបញ្ជូន..."
                        : resetModalUser.has_telegram
                        ? "🚀 ផ្ញើទៅ Telegram ឯកជន (Bot)"
                        : "📧 ផ្ញើទៅ Gmail អតិថិជន"}
                    </span>
                  </button>

                  {/* Share to Telegram directly */}
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(magicLinkResult.link)}&text=${encodeURIComponent('S Tech Store Magic Login Link សម្រាប់ចូលគណនី')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer text-center no-underline border border-gray-200"
                  >
                    <MessageCircle size={14} className="text-[#229ED9]" />
                    <span>Share តាម Telegram</span>
                  </a>

                  {/* Open Link to Test */}
                  <a
                    href={magicLinkResult.link}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer text-center no-underline"
                  >
                    <ExternalLink size={14} />
                    <span>សាកល្បងបើកមើល</span>
                  </a>

                  {/* Regenerate new link */}
                  <button
                    type="button"
                    onClick={() => handleGenerateMagicLink()}
                    className="py-2.5 px-3 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>បង្កើត Link ថ្មីឡើងវិញ</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <button
                  type="button"
                  onClick={() => handleGenerateMagicLink()}
                  className="py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <Key size={14} />
                  <span>បង្កើត Magic Login Link</span>
                </button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setResetModalUser(null);
                  setMagicLinkResult(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs cursor-pointer hover:bg-black transition-colors"
              >
                បិទផ្ទាំង
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
