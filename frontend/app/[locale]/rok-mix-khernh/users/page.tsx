"use client";

import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { 
  Users, Search, Filter, ShieldCheck, UserCheck, UserX, 
  Key, RefreshCw, MapPin, Phone, Mail, Send, Calendar, 
  ShoppingBag, CheckCircle2, AlertCircle, Eye, Trash2, X 
} from "lucide-react";

export interface AdminCustomerUser {
  id: number;
  firebase_uid: string;
  display_name: string;
  email: string;
  photo_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  delivery_notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  telegram: string | null;
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminCustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  
  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminCustomerUser | null>(null);
  const [resetModalUser, setResetModalUser] = useState<AdminCustomerUser | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/users");
      const list = Array.isArray(res.data) ? res.data : [];
      setUsers(list);
    } catch (e: any) {
      showToast("បរាជ័យក្នុងការទាញយកបញ្ជីអតិថិជន", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: AdminCustomerUser) => {
    setTogglingId(user.id);
    try {
      const res = await api.put(`/admin/users/${user.id}/toggle-status`);
      const updatedUser = res.data?.user;
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: updatedUser.is_active, status: updatedUser.status } : u))
      );
      showToast(res.data?.message || "បានផ្លាស់ប្តូរស្ថានភាពគណនីជោគជ័យ");
    } catch (e: any) {
      showToast("បរាជ័យក្នុងការផ្លាស់ប្តូរស្ថានភាពគណនី", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetModalUser) return;
    setIsResetting(true);
    try {
      const res = await api.post(`/admin/users/${resetModalUser.id}/reset-password`);
      showToast(res.data?.message || "បានផ្ញើសំណើ Reset Password ជោគជ័យ");
      setResetModalUser(null);
      fetchUsers();
    } catch (e: any) {
      showToast("បរាជ័យក្នុងការ Reset Password", "error");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបគណនី "${name}" មែនទេ?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
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
          onClick={fetchUsers}
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
                        {u.telegram && (
                          <div className="flex items-center gap-1 text-[11px] text-sky-600">
                            <Send size={11} />
                            <span>@{u.telegram.replace("@", "")}</span>
                          </div>
                        )}
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
                          onClick={() => setSelectedUser(u)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="មើលព័ត៌មានលម្អិត (View Full Profile)"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setResetModalUser(u)}
                          className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="កំណត់ពាក្យសម្ងាត់ឡើងវិញ (Reset Password)"
                        >
                          <Key size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.display_name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="លុបគណនី (Delete User)"
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

      {/* Modal: View Full User Profile */}
      {selectedUser && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-black text-gray-700 overflow-hidden shrink-0 shadow-sm">
                {selectedUser.photo_url ? (
                  <img src={selectedUser.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{selectedUser.display_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 m-0">
                  {selectedUser.display_name}
                </h3>
                <div className="text-xs text-gray-500 mt-0.5">{selectedUser.email}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    selectedUser.is_active ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {selectedUser.is_active ? "គណនីសកម្ម" : "គណនីបានផ្អាក"}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    ពិន្ទុ: {selectedUser.points} pts
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6">
              <div>
                <span className="text-gray-400 block font-medium">លេខទូរស័ព្ទ:</span>
                <span className="font-bold text-gray-900">{selectedUser.phone || "—"}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Telegram:</span>
                <span className="font-bold text-sky-600">{selectedUser.telegram ? `@${selectedUser.telegram.replace("@", "")}` : "—"}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">មុខរបរ/អាជីព:</span>
                <span className="font-bold text-gray-900">{selectedUser.profession || "—"}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">ភេទ / ថ្ងៃខែកំណើត:</span>
                <span className="font-bold text-gray-900">{selectedUser.gender || "—"} {selectedUser.birthday ? `(${selectedUser.birthday})` : ""}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-400 block font-medium">អាសយដ្ឋានដឹកជញ្ជូន:</span>
                <span className="font-bold text-gray-900">{selectedUser.address ? `${selectedUser.address}, ${selectedUser.city || ""}` : "—"}</span>
              </div>
              {selectedUser.delivery_notes && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400 block font-medium">ចំណាំទីតាំងដឹកជញ្ជូន:</span>
                  <span className="italic text-gray-700">{selectedUser.delivery_notes}</span>
                </div>
              )}
              {(selectedUser.gps_lat || selectedUser.gps_lng) && (
                <div className="sm:col-span-2 pt-2 border-t border-gray-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <MapPin size={14} />
                    <span>GPS Coordinates: {selectedUser.gps_lat}, {selectedUser.gps_lng}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedUser.gps_lat},${selectedUser.gps_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    មើលលើ Google Maps
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setResetModalUser(selectedUser);
                  setSelectedUser(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Key size={14} />
                <span>Reset Password</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs cursor-pointer"
              >
                បិទផ្ទាំង
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Password Confirmation */}
      {resetModalUser && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Key size={30} />
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">
              កំណត់ពាក្យសម្ងាត់ឡើងវិញ?
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 leading-relaxed">
              តើអ្នកពិតជាចង់បង្កើតសំណើ Reset Password សម្រាប់គណនី <b>{resetModalUser.display_name}</b> ({resetModalUser.email}) មែនទេ? ប្រព័ន្ធនឹងបញ្ជូនការជូនដំណឹងទៅគណនីអតិថិជននេះដោយស្វ័យប្រវត្តិ។
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                disabled={isResetting}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResetting}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Key size={14} className={isResetting ? "animate-spin" : ""} />
                <span>{isResetting ? "កំពុងដំណើរការ..." : "យល់ព្រម Reset"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
