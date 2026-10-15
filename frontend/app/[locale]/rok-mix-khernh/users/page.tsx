"use client";

import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { Link } from "@/i18n/routing";
import { 
  Users, Search, Filter, ShieldCheck, UserCheck, UserX, 
  Key, RefreshCw, MapPin, Phone, Mail, Send, Calendar, 
  ShoppingBag, CheckCircle2, AlertCircle, Eye, Trash2, X,
  Copy, ExternalLink, MessageCircle, Check, Link2, Coins, MessageSquare, ChevronRight,
  UserPlus, Edit, AlertTriangle, ShieldAlert, Crown, Briefcase, Globe,
  ChevronLeft, Layers, Smartphone
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
  role?: "customer" | "staff" | "admin" | "super_admin";
  role_label?: string;
  auth_channel?: "firebase" | "telegram" | "linked";
  auth_channel_label?: string;
  is_system_owner?: boolean;
  is_staff?: boolean;
  is_customer?: boolean;
  is_admin: boolean;
  is_active: boolean;
  status: string;
  points: number;
  wallet_balance?: number;
  total_orders: number;
  total_spent: number;
  created_at: string | null;
  last_password_reset_at: string | null;
}

export interface UserCounts {
  customers: number;
  staff: number;
  admins: number;
  all: number;
  active_customers: number;
  active_staff: number;
  active_admins: number;
  active_total: number;
  disabled_total: number;
  total_orders: number;
  channel_firebase: number;
  channel_telegram: number;
  channel_linked: number;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

const CACHE_KEY = "admin_cached_customer_users";
const MASTER_OWNER_EMAIL = "nobrothana180703@gmail.com";
const isSystemOwner = (email?: string | null) => (email || "").toLowerCase().trim() === MASTER_OWNER_EMAIL;

const isUserAdminOrOwner = (u: AdminCustomerUser) => {
  return isSystemOwner(u.email) || u.role === "super_admin" || u.role === "admin" || (u.is_admin && u.role !== "staff");
};

const isUserStaff = (u: AdminCustomerUser) => {
  return u.role === "staff" || u.is_staff || (u.email && u.email.toLowerCase().trim() === "staff@stechstore.com");
};

const isUserCustomer = (u: AdminCustomerUser) => {
  return !isUserAdminOrOwner(u) && !isUserStaff(u);
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminCustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [roleTab, setRoleTab] = useState<"customers" | "staff" | "admins" | "all">("customers");

  // Database Pagination & Counts
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatching, setTotalMatching] = useState(0);
  const [perPage] = useState(20);
  const [counts, setCounts] = useState<UserCounts>({
    customers: 0,
    staff: 0,
    admins: 0,
    all: 0,
    active_customers: 0,
    active_staff: 0,
    active_admins: 0,
    active_total: 0,
    disabled_total: 0,
    total_orders: 0,
    channel_firebase: 0,
    channel_telegram: 0,
    channel_linked: 0,
  });

  // Current Admin user & Role
  const [currentAdminRole, setCurrentAdminRole] = useState<string>("admin");
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("stech_admin_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.role) setCurrentAdminRole(parsed.role);
          if (parsed?.email) setCurrentAdminEmail((parsed.email || "").toLowerCase().trim());
        }
      } catch (e) {}
    }
  }, []);

  const isStaff = currentAdminRole === "staff";
  
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

  // Add User Modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addFormData, setAddFormData] = useState({
    display_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    profession: "",
    delivery_notes: "",
    points: 0,
  });

  // Edit User Modal state (Admin only)
  const [editModalUser, setEditModalUser] = useState<AdminCustomerUser | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editFormData, setEditFormData] = useState({
    display_name: "",
    phone: "",
    address: "",
    city: "",
    profession: "",
    delivery_notes: "",
    status: "active",
    points: 0,
  });

  // Delete User Modal state (Admin only, confirmation popup)
  const [deleteModalUser, setDeleteModalUser] = useState<AdminCustomerUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

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

  // Strict deduplication helper: guarantees NO duplicate emails, chat IDs, or UIDs are ever displayed
  const deduplicateUsersList = (rawList: AdminCustomerUser[]): AdminCustomerUser[] => {
    const seen = new Set<string>();
    const result: AdminCustomerUser[] = [];
    for (const u of rawList) {
      const email = (u.email || "").toLowerCase().trim();
      const chatId = (u.telegram_chat_id || "").trim();
      const uid = (u.firebase_uid || "").trim();

      // Prioritize grouping keys to merge duplicates
      let key = "";
      if (chatId && (email.startsWith("tg_") || !email)) {
        key = `tg:${chatId}`;
      } else if (email) {
        key = `email:${email}`;
      } else if (chatId) {
        key = `tg:${chatId}`;
      } else if (uid) {
        key = `uid:${uid}`;
      } else {
        key = `id:${u.id}`;
      }

      if (!seen.has(key)) {
        seen.add(key);
        result.push(u);
      }
    }
    return result;
  };

  // Server-side paginated database query (20 accounts per page)
  const fetchUsers = async (
    targetPage: number = 1,
    append: boolean = false,
    forceRefresh: boolean = false
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get("/admin/users", {
        params: {
          page: targetPage,
          per_page: perPage,
          search: searchQuery.trim() || undefined,
          role: roleTab,
          status: statusFilter,
        },
      });

      const resData = res.data;
      const rawList: AdminCustomerUser[] = Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData)
        ? resData
        : [];
      const cleanList = deduplicateUsersList(rawList);

      if (append) {
        setUsers((prev) => deduplicateUsersList([...prev, ...cleanList]));
      } else {
        setUsers(cleanList);
      }

      if (resData?.current_page) setCurrentPage(resData.current_page);
      if (resData?.last_page) setTotalPages(resData.last_page);
      if (typeof resData?.total === "number") setTotalMatching(resData.total);

      if (resData?.counts) {
        setCounts(resData.counts);
      }

      if (forceRefresh) {
        showToast("បានទាញយក និងសម្អាតទិន្នន័យថ្មីពី Database ជោគជ័យ!");
      }
    } catch (e: any) {
      showToast("បរាជ័យក្នុងការទាញយកបញ្ជីអតិថិជន", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Debounced search & filter effect (triggers fetch from DB whenever search query, role tab, or status filter changes)
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers(1, false, false);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery, roleTab, statusFilter]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || loading) return;
    setCurrentPage(page);
    fetchUsers(page, false, false);
  };

  const handleLoadMore = () => {
    if (currentPage >= totalPages || loadingMore) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchUsers(nextPage, true, false);
  };

  const handleToggleStatus = async (user: AdminCustomerUser) => {
    if (isSystemOwner(user.email)) {
      showToast("មិនអាចផ្អាកដំណើរការគណនីម្ចាស់ប្រព័ន្ធ (System Owner) បានដាច់ខាត!", "error");
      return;
    }

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

      const diff = newActive ? 1 : -1;
      setCounts((prev) => ({
        ...prev,
        active_total: Math.max(0, prev.active_total + diff),
        disabled_total: Math.max(0, prev.disabled_total - diff),
        active_customers: isUserCustomer(user) ? Math.max(0, prev.active_customers + diff) : prev.active_customers,
        active_staff: isUserStaff(user) ? Math.max(0, prev.active_staff + diff) : prev.active_staff,
        active_admins: isUserAdminOrOwner(user) ? Math.max(0, prev.active_admins + diff) : prev.active_admins,
      }));

      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, is_active: newActive, status: newStatus } : null));
      }

      showToast(res.data?.message || (newActive ? "បានបើកដំណើរការគណនីជោគជ័យ" : "បានផ្អាកដំណើរការគណនីជោគជ័យ"));
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការផ្លាស់ប្តូរស្ថានភាពគណនី", "error");
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

  // Send directly to Customer's private Telegram bot or Gmail
  const handleSendMagicLinkPrivate = async () => {
    if (!resetModalUser) return;
    setIsSendingTelegram(true);
    try {
      const res = await api.post(`/admin/users/${resetModalUser.id}/send-magic-link-telegram`);
      if (res.data?.success) {
        const channel = res.data?.channel;
        if (channel === "telegram_private") {
          showToast("បានផ្ញើតំណភ្ជាប់ Magic Link ទៅកាន់ Telegram ផ្ទាល់ខ្លួនរបស់អតិថិជនជោគជ័យ!");
        } else if (channel === "email") {
          showToast(`បានផ្ញើតំណភ្ជាប់ Magic Link ទៅកាន់ Gmail (${resetModalUser.email}) របស់អតិថិជនជោគជ័យ!`);
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

  const handleOpenDeleteModal = (user: AdminCustomerUser) => {
    if (isSystemOwner(user.email)) {
      showToast("មិនអាចលុបគណនីម្ចាស់ប្រព័ន្ធ (System Owner) បានដាច់ខាត!", "error");
      return;
    }
    if (isStaff) {
      showToast("បុគ្គលិកមិនមានសិទ្ធិលុបគណនីឡើយ! មានតែ Admin ប៉ុណ្ណោះដែលអាចលុបបាន", "error");
      return;
    }
    setDeleteModalUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    if (isSystemOwner(deleteModalUser.email)) {
      showToast("មិនអាចលុបគណនីម្ចាស់ប្រព័ន្ធ (System Owner) បានដាច់ខាត!", "error");
      return;
    }
    if (isStaff) {
      showToast("បុគ្គលិកមិនមានសិទ្ធិលុបគណនីឡើយ!", "error");
      return;
    }

    setIsDeletingUser(true);
    try {
      const res = await api.delete(`/admin/users/${deleteModalUser.id}`);
      setUsers((prev) => {
        const updated = prev.filter((u) => u.id !== deleteModalUser.id);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        }
        return updated;
      });

      setTotalMatching((prev) => Math.max(0, prev - 1));
      setCounts((prev) => {
        const isCust = isUserCustomer(deleteModalUser);
        const isSt = isUserStaff(deleteModalUser);
        const isAdm = isUserAdminOrOwner(deleteModalUser);
        const wasActive = deleteModalUser.is_active;
        return {
          ...prev,
          all: Math.max(0, prev.all - 1),
          customers: isCust ? Math.max(0, prev.customers - 1) : prev.customers,
          staff: isSt ? Math.max(0, prev.staff - 1) : prev.staff,
          admins: isAdm ? Math.max(0, prev.admins - 1) : prev.admins,
          active_total: wasActive ? Math.max(0, prev.active_total - 1) : prev.active_total,
          disabled_total: !wasActive ? Math.max(0, prev.disabled_total - 1) : prev.disabled_total,
          active_customers: (wasActive && isCust) ? Math.max(0, prev.active_customers - 1) : prev.active_customers,
          active_staff: (wasActive && isSt) ? Math.max(0, prev.active_staff - 1) : prev.active_staff,
          active_admins: (wasActive && isAdm) ? Math.max(0, prev.active_admins - 1) : prev.active_admins,
        };
      });

      showToast(res.data?.message || `បានលុបគណនី "${deleteModalUser.display_name}" ដោយជោគជ័យ`);
      if (selectedUser?.id === deleteModalUser.id) setSelectedUser(null);
      setDeleteModalUser(null);
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការលុបគណនី", "error");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.display_name.trim() || !addFormData.email.trim()) {
      showToast("សូមបញ្ចូលឈ្មោះពេញ និងអ៊ីមែល", "error");
      return;
    }

    setIsAddingUser(true);
    try {
      const res = await api.post("/admin/users", addFormData);
      if (res.data?.success && res.data.user) {
        const newUser = res.data.user;
        setUsers((prev) => {
          const updated = [newUser, ...prev];
          if (typeof window !== "undefined") {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(updated));
          }
          return updated;
        });

        setTotalMatching((prev) => prev + 1);
        setCounts((prev) => ({
          ...prev,
          all: prev.all + 1,
          customers: prev.customers + 1,
          active_total: prev.active_total + 1,
          active_customers: prev.active_customers + 1,
          channel_firebase: prev.channel_firebase + 1,
        }));

        showToast(res.data.message || "បានបង្កើតគណនីអតិថិជនថ្មីដោយជោគជ័យ");
        setIsAddUserOpen(false);
        setAddFormData({
          display_name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          profession: "",
          delivery_notes: "",
          points: 0,
        });
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការបង្កើតគណនី", "error");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleOpenEditModal = (user: AdminCustomerUser) => {
    if (isStaff) {
      showToast("បុគ្គលិកមិនមានសិទ្ធិកែប្រែព័ត៌មានអតិថិជនឡើយ", "error");
      return;
    }
    if (isSystemOwner(user.email) && currentAdminEmail !== MASTER_OWNER_EMAIL) {
      showToast("មិនអាចកែប្រែគណនីម្ចាស់ប្រព័ន្ធបានឡើយ!", "error");
      return;
    }

    setEditModalUser(user);
    setEditFormData({
      display_name: user.display_name || "",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      profession: user.profession || "",
      delivery_notes: user.delivery_notes || "",
      status: user.is_active ? "active" : "disabled",
      points: user.points || 0,
    });
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;
    if (isStaff) {
      showToast("បុគ្គលិកមិនមានសិទ្ធិកែប្រែព័ត៌មានអតិថិជនឡើយ", "error");
      return;
    }

    setIsEditingUser(true);
    try {
      const res = await api.put(`/admin/users/${editModalUser.id}`, editFormData);
      if (res.data?.success && res.data.user) {
        const updated = res.data.user;
        setUsers((prev) => {
          const list = prev.map((u) => (u.id === editModalUser.id ? { ...u, ...updated } : u));
          if (typeof window !== "undefined") {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
          }
          return list;
        });
        if (selectedUser?.id === editModalUser.id) {
          setSelectedUser((prev) => (prev ? { ...prev, ...updated } : null));
        }
        showToast(res.data.message || "បានកែប្រែព័ត៌មានគណនីដោយជោគជ័យ");
        setEditModalUser(null);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការកែប្រែគណនី", "error");
    } finally {
      setIsEditingUser(false);
    }
  };

  const currentRoleTotal = useMemo(() => {
    if (roleTab === "customers") return counts.customers;
    if (roleTab === "staff") return counts.staff;
    if (roleTab === "admins") return counts.admins;
    return counts.all;
  }, [counts, roleTab]);

  const currentRoleActive = useMemo(() => {
    if (roleTab === "customers") return counts.active_customers;
    if (roleTab === "staff") return counts.active_staff;
    if (roleTab === "admins") return counts.active_admins;
    return counts.active_total;
  }, [counts, roleTab]);

  const currentRoleDisabled = Math.max(0, currentRoleTotal - currentRoleActive);

  // Directly display users returned from database query (server paginated & searched)
  const displayedUsers = users;

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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8B1A1A] hover:bg-[#6e1414] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus size={16} />
            <span>+ បន្ថែមអតិថិជន</span>
          </button>

          <button
            type="button"
            onClick={() => fetchUsers(1, false, true)}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-[#8B1A1A]" : ""} />
            <span>ធ្វើបច្ចុប្បន្នភាព</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {roleTab === "customers"
                ? "អតិថិជនសរុប"
                : roleTab === "staff"
                ? "បុគ្គលិកសរុប"
                : roleTab === "admins"
                ? "ADMIN & OWNER សរុប"
                : "គណនីសរុបទាំងអស់"}
            </span>
            <Users size={18} className="text-[#8B1A1A]" />
          </div>
          <div className="text-2xl font-black text-gray-900 font-mono">{currentRoleTotal}</div>
          <div className="text-[11px] text-gray-400 mt-1">
            {roleTab === "customers"
              ? "អតិថិជនពិតប្រាកដក្នុងប្រព័ន្ធ"
              : roleTab === "staff"
              ? "បុគ្គលិកគ្រប់គ្រងហាង"
              : roleTab === "admins"
              ? "Admin & System Owner"
              : "សរុបគ្រប់តួនាទីទាំងអស់"}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">ប្រភពផ្ទៀងផ្ទាត់ (AUTH)</span>
            <Globe size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">{counts.all}</div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-amber-700">Google ({counts.channel_firebase})</span>
            <span>•</span>
            <span className="font-bold text-sky-700">TG ({counts.channel_telegram})</span>
            <span>•</span>
            <span className="font-bold text-purple-700">Linked ({counts.channel_linked})</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {roleTab === "customers"
                ? "អតិថិជនសកម្ម"
                : roleTab === "staff"
                ? "បុគ្គលិកសកម្ម"
                : roleTab === "admins"
                ? "ADMIN សកម្ម"
                : "គណនីសកម្មសរុប"}
            </span>
            <UserCheck size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {currentRoleActive} <span className="text-sm font-semibold text-gray-400">/ {currentRoleTotal}</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            សកម្ម {currentRoleTotal > 0 ? Math.round((currentRoleActive / currentRoleTotal) * 100) : 100}% • ផ្អាក ({currentRoleDisabled})
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">ការកុម្ម៉ង់សរុប</span>
            <ShoppingBag size={18} className="text-sky-600" />
          </div>
          <div className="text-2xl font-black text-gray-900 font-mono">{counts.total_orders}</div>
          <div className="text-[11px] text-gray-400 mt-1">Orders ពីអតិថិជនទាំងអស់</div>
        </div>
      </div>

      {/* Role Classification Tabs: Customers vs Staff vs Admins & Owner */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setRoleTab("customers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border-none ${
            roleTab === "customers"
              ? "bg-[#8B1A1A] text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
          }`}
        >
          <Users size={16} />
          <span>អតិថិជន (Customers)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black font-mono ${
            roleTab === "customers" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
          }`}>
            {counts.customers}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRoleTab("staff")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border-none ${
            roleTab === "staff"
              ? "bg-teal-700 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
          }`}
        >
          <Briefcase size={16} />
          <span>បុគ្គលិក (Staff)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black font-mono ${
            roleTab === "staff" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
          }`}>
            {counts.staff}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRoleTab("admins")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border-none ${
            roleTab === "admins"
              ? "bg-indigo-700 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
          }`}
        >
          <ShieldCheck size={16} />
          <span>អ្នកគ្រប់គ្រង & ម្ចាស់ប្រព័ន្ធ (Admins & System Owner)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black font-mono ${
            roleTab === "admins" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
          }`}>
            {counts.admins}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRoleTab("all")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border-none ${
            roleTab === "all"
              ? "bg-gray-900 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
          }`}
        >
          <Globe size={16} />
          <span>ទាំងអស់ (All Accounts)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black font-mono ${
            roleTab === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
          }`}>
            {counts.all}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
              ទាំងអស់ ({currentRoleTotal})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "active" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              សកម្ម ({currentRoleActive})
            </button>
            <button
              onClick={() => setStatusFilter("disabled")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "disabled" ? "bg-white text-red-600 shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              បានផ្អាក ({currentRoleDisabled})
            </button>
          </div>
        </div>
      </div>

      {/* Auth Channels Banner: Firebase vs Telegram dual authentication explanation */}
      <div className="mb-6 p-4 bg-gradient-to-r from-amber-50/70 via-sky-50/70 to-purple-50/70 rounded-2xl border border-gray-200/80 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-sky-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Globe size={18} />
          </div>
          <div>
            <div className="font-bold text-gray-900 flex items-center gap-2 flex-wrap">
              <span>ប្រព័ន្ធបញ្ជាក់អត្តសញ្ញាណ ២ ប្រភព (Dual Authentication System)</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                DB Dynamic Pagination (20 / Page)
              </span>
            </div>
            <div className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
              ទិន្នន័យទាញផ្ទាល់ពី Database ដោយបែងចែកជា <b>Firebase Google ({counts.channel_firebase})</b> សម្រាប់ Web, <b>Telegram Bot ({counts.channel_telegram})</b> សម្រាប់ Mini App, និង <b>Linked ({counts.channel_linked})</b> ដែលភ្ជាប់ទាំងពីរ។
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[11px] flex-wrap">
          <span className="px-2.5 py-1 rounded-xl bg-amber-100/90 text-amber-900 font-bold border border-amber-300 flex items-center gap-1">
            <span>🔥</span> Google: {counts.channel_firebase}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-sky-100/90 text-sky-900 font-bold border border-sky-300 flex items-center gap-1">
            <Send size={11} /> Telegram: {counts.channel_telegram}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-purple-100/90 text-purple-900 font-bold border border-purple-300 flex items-center gap-1">
            <span>🔗</span> Linked: {counts.channel_linked}
          </span>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs font-black uppercase tracking-wider">
                <th className="py-4 px-5">គណនីអតិថិជន & ប្រភព AUTH</th>
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
                      <span>កំពុងទាញយកបញ្ជីទិន្នន័យពី Database...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    មិនមានទិន្នន័យអតិថិជនដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ
                  </td>
                </tr>
              ) : (
                displayedUsers.map((u) => (
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
                            {isSystemOwner(u.email) || u.role === "super_admin" ? (
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 border border-amber-400 flex items-center gap-1 shadow-xs">
                                <Crown size={12} className="text-amber-700" />
                                <span>ម្ចាស់ប្រព័ន្ធ (System Owner)</span>
                              </span>
                            ) : isUserStaff(u) ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-300 flex items-center gap-1 shadow-xs">
                                <Briefcase size={11} className="text-teal-600" />
                                <span>បុគ្គលិក (Staff)</span>
                              </span>
                            ) : isUserAdminOrOwner(u) ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-300 flex items-center gap-1 shadow-xs">
                                <ShieldCheck size={11} className="text-indigo-600" />
                                <span>អ្នកគ្រប់គ្រង (Admin)</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
                                <UserCheck size={11} className="text-gray-500" />
                                <span>អតិថិជន (Customer)</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate flex items-center gap-1.5 font-mono">
                            <span>{u.email || "No email"}</span>
                            {u.email && !u.email.endsWith("@s-tech-store.tech") && !u.email.endsWith("@telegram.s-tech-store.tech") && !u.email.startsWith("tg_") && u.email.includes("@") && (
                              <span className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 font-sans text-[9px] font-bold border border-emerald-200">
                                Real
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {u.auth_channel === "linked" ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-sans text-[9px] font-bold border border-purple-200 inline-flex items-center gap-1">
                                <span>🔗</span>
                                <span>Linked (Web + Bot)</span>
                              </span>
                            ) : u.auth_channel === "telegram" ? (
                              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-sans text-[9px] font-bold border border-sky-200 inline-flex items-center gap-1">
                                <Send size={9} />
                                <span>Telegram Bot</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-sans text-[9px] font-bold border border-amber-200 inline-flex items-center gap-1">
                                <span>🔥</span>
                                <span>Google Auth</span>
                              </span>
                            )}
                          </div>
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
                      {isSystemOwner(u.email) ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs cursor-default"
                          title="គណនីម្ចាស់ប្រព័ន្ធសកម្មជានិច្ច មិនអាចផ្អាកដំណើរការបានឡើយ"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>សកម្ម (ការពារ)</span>
                        </span>
                      ) : (
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
                      )}
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

                        {!isStaff && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            disabled={isSystemOwner(u.email) && currentAdminEmail !== MASTER_OWNER_EMAIL}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              isSystemOwner(u.email) && currentAdminEmail !== MASTER_OWNER_EMAIL
                                ? "text-gray-300 cursor-not-allowed opacity-40"
                                : "text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                            }`}
                            title={isSystemOwner(u.email) ? "គណនីម្ចាស់ប្រព័ន្ធមិនអាចកែប្រែបានឡើយ" : "កែប្រែព័ត៌មានគណនី • Edit Profile"}
                          >
                            <Edit size={16} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenResetModal(u)}
                          className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Magic Login Link • Reset Password"
                        >
                          <Key size={16} />
                        </button>

                        {!isStaff && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(u)}
                            disabled={isSystemOwner(u.email)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              isSystemOwner(u.email)
                                ? "text-gray-300 cursor-not-allowed opacity-40"
                                : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                            }`}
                            title={isSystemOwner(u.email) ? "គណនីម្ចាស់ប្រព័ន្ធត្រូវបានការពារ មិនអាចលុបបានឡើយ" : "លុបគណនី • Delete User"}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Load More Controls */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500 font-medium text-center sm:text-left">
            បង្ហាញ <b className="text-gray-900 font-mono">{displayedUsers.length > 0 ? 1 : 0} - {displayedUsers.length}</b> នៃគណនីផ្គូផ្គងសរុប <b className="text-gray-900 font-mono">{totalMatching}</b> {totalPages > 1 && <span className="font-mono text-gray-400">(ទំព័រ {currentPage} នៃ {totalPages})</span>}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
            {/* Load More (+20) button */}
            {currentPage < totalPages && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-3.5 py-1.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6e1414] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Layers size={13} />
                )}
                <span>{loadingMore ? "កំពុងទាញយក..." : "មើលបន្ថែម (+២០ ទៀត)"}</span>
              </button>
            )}

            {/* Numbered Pagination (1, 2, 3...) */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="ទំព័រមុន"
                >
                  <ChevronLeft size={15} />
                </button>

                {getPageNumbers(currentPage, totalPages).map((p, idx) => (
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-400 text-xs font-mono">...</span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => handlePageChange(Number(p))}
                      disabled={loading}
                      className={`min-w-[30px] h-7 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? "bg-gray-900 text-white shadow-xs"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {p}
                    </button>
                  )
                ))}

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="ទំព័របន្ទាប់"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
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
                  {isSystemOwner(selectedUser.email) ? (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-black">គណនីម្ចាស់ប្រព័ន្ធ (System Owner)</div>
                        <div className="text-[11px] text-amber-800 mt-0.5">
                          គណនីនេះត្រូវបានការពារកម្រិតខ្ពស់បំផុត មិនអាចផ្អាកដំណើរការ ឬលុបចេញពីប្រព័ន្ធបានឡើយ។
                        </div>
                      </div>
                    </div>
                  ) : null}

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

                  {!isSystemOwner(selectedUser.email) && (
                    <>
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

                      {/* Action 4: Edit Profile (Admin only) */}
                      {!isStaff && (
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
                              <Edit size={18} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900">កែប្រែព័ត៌មានគណនី (Edit Profile)</div>
                              <div className="text-[11px] text-gray-500">កែប្រែឈ្មោះ លេខទូរស័ព្ទ អាសយដ្ឋាន និងចំណាំដឹកជញ្ជូន</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEditModal(selectedUser);
                              setSelectedUser(null);
                            }}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                          >
                            <span>កែប្រែ</span>
                          </button>
                        </div>
                      )}

                      {/* Action 5: Delete Account (Admin only) */}
                      {!isStaff && (
                        <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200/80 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
                              <Trash2 size={18} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900">លុបគណនីអតិថិជនជាអចិន្ត្រៃយ៍ (Delete)</div>
                              <div className="text-[11px] text-gray-500">លុបទិន្នន័យអតិថិជន និងផ្តាច់ការភ្ជាប់ Telegram ទាំងអស់</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenDeleteModal(selectedUser);
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                          >
                            <span>លុបគណនី</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
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
                <span className="text-xs font-bold text-gray-500">កំពុងរៀបចំបង្កើតតំណភ្ជាប់សុវត្ថិភាព...</span>
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
                    <b>សុពលភាព ២៤ ម៉ោង (សុវត្ថិភាពឯកជនភាព)៖</b> តំណភ្ជាប់នេះបញ្ជូនផ្ទាល់ទៅអតិថិជនតែម្នាក់គត់ មិនលេចធ្លាយក្នុង Admin Group ឡើយ។ ពេលអតិថិជនចុចរួច វានឹងផុតកំណត់ដោយស្វ័យប្រវត្តិ។
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
                        ? "ផ្ញើទៅ Telegram ផ្ទាល់ខ្លួន"
                        : "ផ្ញើទៅ Gmail អតិថិជន"}
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

      {/* Modal: Delete Confirmation Popup */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in zoom-in-95 relative">
            <button
              onClick={() => setDeleteModalUser(null)}
              disabled={isDeletingUser}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <AlertTriangle size={32} />
            </div>

            <div className="text-center mb-5">
              <h3 className="text-xl font-black text-gray-900 mb-1.5">
                បញ្ជាក់ការលុបគណនីអតិថិជន
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                តើអ្នកពិតជាចង់លុបគណនីរបស់អតិថិជននេះចេញពីប្រព័ន្ធមែនទេ?
              </p>
            </div>

            {/* User Card */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 mb-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-700 overflow-hidden shrink-0">
                {deleteModalUser.photo_url ? (
                  <img src={deleteModalUser.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{deleteModalUser.display_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-gray-900 text-sm truncate">{deleteModalUser.display_name}</div>
                <div className="text-xs text-gray-500 truncate">{deleteModalUser.email}</div>
                {deleteModalUser.phone && (
                  <div className="text-[11px] text-gray-400 mt-0.5">{deleteModalUser.phone}</div>
                )}
              </div>
            </div>

            {/* Danger Warning Box */}
            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl text-red-900 text-xs mb-5 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-700">
                <ShieldAlert size={15} />
                <span>ការព្រមានអំពីទិន្នន័យ (Data Cascade)៖</span>
              </div>
              <p className="text-[11px] leading-relaxed text-red-800">
                ការលុបនេះនឹងលុបទិន្នន័យអតិថិជនជាអចិន្ត្រៃយ៍ចេញពី Database ព្រមទាំងផ្តាច់ការតភ្ជាប់ Telegram និង Session ទាំងអស់។ សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយវិញបានឡើយ!
              </p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                disabled={isDeletingUser}
                className="py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingUser}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>កំពុងលុប...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>យល់ព្រមលុបគណនី</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Customer */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in zoom-in-95 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddUserOpen(false)}
              disabled={isAddingUser}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#8B1A1A] flex items-center justify-center shrink-0">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  បន្ថែមគណនីអតិថិជនថ្មី
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  បង្កើតគណនីអតិថិជនផ្ទាល់ក្នុងប្រព័ន្ធ
                </p>
              </div>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ឈ្មោះពេញ (Display Name) *
                </label>
                <input
                  type="text"
                  required
                  value={addFormData.display_name}
                  onChange={(e) => setAddFormData({ ...addFormData, display_name: e.target.value })}
                  placeholder="ឧ. សុខ សំបូរ"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  អាសយដ្ឋានអ៊ីមែល (Email) *
                </label>
                <input
                  type="email"
                  required
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  placeholder="ឧ. sambor.sok@gmail.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    លេខទូរស័ព្ទ (Phone)
                  </label>
                  <input
                    type="text"
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                    placeholder="ឧ. 012 345 678"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    រាជធានី/ខេត្ត (City)
                  </label>
                  <input
                    type="text"
                    value={addFormData.city}
                    onChange={(e) => setAddFormData({ ...addFormData, city: e.target.value })}
                    placeholder="ឧ. ភ្នំពេញ"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    មុខរបរ (Profession)
                  </label>
                  <input
                    type="text"
                    value={addFormData.profession}
                    onChange={(e) => setAddFormData({ ...addFormData, profession: e.target.value })}
                    placeholder="ឧ. Graphic Designer"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    កាក់ភក្តីភាពដំបូង (Points)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={addFormData.points}
                    onChange={(e) => setAddFormData({ ...addFormData, points: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  អាសយដ្ឋានដឹកជញ្ជូន (Address)
                </label>
                <input
                  type="text"
                  value={addFormData.address}
                  onChange={(e) => setAddFormData({ ...addFormData, address: e.target.value })}
                  placeholder="ឧ. ផ្ទះលេខ 12 ផ្លូវ 2004 សង្កាត់ទឹកថ្លា"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ចំណាំទីតាំងដឹកជញ្ជូន (Delivery Notes)
                </label>
                <input
                  type="text"
                  value={addFormData.delivery_notes}
                  onChange={(e) => setAddFormData({ ...addFormData, delivery_notes: e.target.value })}
                  placeholder="ឧ. នៅជិតសាលាបឋមសិក្សា..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-[#8B1A1A] focus:bg-white transition-all"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  disabled={isAddingUser}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-5 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6e1414] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isAddingUser ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>កំពុងបង្កើត...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>បង្កើតគណនី</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Customer (Admin Only) */}
      {editModalUser && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in zoom-in-95 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditModalUser(null)}
              disabled={isEditingUser}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Edit size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  កែប្រែព័ត៌មានអតិថិជន
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editModalUser.email}
                </p>
              </div>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ឈ្មោះពេញ (Display Name) *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.display_name}
                  onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-amber-600 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    លេខទូរស័ព្ទ (Phone)
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-amber-600 focus:bg-white transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    រាជធានី/ខេត្ត (City)
                  </label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-amber-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    មុខរបរ (Profession)
                  </label>
                  <input
                    type="text"
                    value={editFormData.profession}
                    onChange={(e) => setEditFormData({ ...editFormData, profession: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-amber-600 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ស្ថានភាពគណនី (Status)
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-amber-600 focus:bg-white transition-all font-bold"
                  >
                    <option value="active">● សកម្ម (Active)</option>
                    <option value="disabled">● បានផ្អាក (Disabled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  អាសយដ្ឋានដឹកជញ្ជូន (Address)
                </label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-amber-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ចំណាំទីតាំងដឹកជញ្ជូន (Delivery Notes)
                </label>
                <input
                  type="text"
                  value={editFormData.delivery_notes}
                  onChange={(e) => setEditFormData({ ...editFormData, delivery_notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-amber-600 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  disabled={isEditingUser}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isEditingUser}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isEditingUser ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>កំពុងរក្សាទុក...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>រក្សាទុកការកែប្រែ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
