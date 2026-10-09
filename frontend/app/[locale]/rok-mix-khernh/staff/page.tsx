"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Users, UserPlus, Shield, Store, Clock, Phone, Mail, Key, Edit, Trash2, CheckCircle2, AlertCircle, X } from "lucide-react";

type StaffMember = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "staff" | "manager";
  branch?: string;
  shift?: string;
  phone?: string;
  status: "active" | "inactive";
  created_at?: string;
  last_login_at?: string;
};

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"staff" | "admin" | "manager">("staff");
  const [branch, setBranch] = useState("Phnom Penh Main Branch");
  const [shift, setShift] = useState("Morning Shift");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/staff");
      setStaffList(res.data);
    } catch (e: any) {
      showToast("Failed to load staff accounts.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openCreateModal = () => {
    setEditTarget(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("staff");
    setBranch("Phnom Penh Main Branch");
    setShift("Morning Shift");
    setPhone("");
    setStatus("active");
    setModalOpen(true);
  };

  const openEditModal = (s: StaffMember) => {
    setEditTarget(s);
    setName(s.name);
    setEmail(s.email);
    setPassword(""); // Leave blank if keeping same password
    setRole(s.role);
    setBranch(s.branch || "Phnom Penh Main Branch");
    setShift(s.shift || "Morning Shift");
    setPhone(s.phone || "");
    setStatus(s.status);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editTarget) {
        // Update
        const payload: any = { name, email, role, branch, shift, phone, status };
        if (password.trim()) payload.password = password;

        await api.put(`/admin/staff/${editTarget.id}`, payload);
        showToast("Staff account updated successfully!");
      } else {
        // Create
        if (!password.trim()) {
          showToast("Password is required for new accounts.", "error");
          return;
        }
        await api.post("/admin/staff", {
          name,
          email,
          password,
          role,
          branch,
          shift,
          phone,
        });
        showToast("Staff account created successfully!");
      }

      setModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Operation failed.";
      showToast(msg, "error");
    }
  };

  const handleDelete = async (id: number, staffName: string) => {
    if (!confirm(`Are you sure you want to delete staff account: "${staffName}"?`)) return;

    try {
      await api.delete(`/admin/staff/${id}`);
      showToast(`Account "${staffName}" removed.`);
      fetchStaff();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to delete account.";
      showToast(msg, "error");
    }
  };

  return (
    <div className="font-sans max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[99999] px-5 py-3 rounded-xl shadow-xl font-medium text-sm text-white ${toast.type === "error" ? "bg-red-600" : "bg-emerald-600"} transition-all`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-[#8B1A1A]/10 text-[#8B1A1A] rounded-lg">
              <Shield size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B1A1A]">Admin Privilege</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            គ្រប់គ្រងគណនីបុគ្គលិក • Staff & Accounts
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            ចាត់ចែងគណនី Admin, Staff, សាខាដែលបម្រើការ និងវេនធ្វើការ • Manage roles, branch assignments & shifts
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#8B1A1A]/20 transition-all cursor-pointer"
        >
          <UserPlus size={16} />
          <span>+ បង្កើតបុគ្គលិកថ្មី • New Staff</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#8B1A1A] flex items-center justify-center font-bold">
            <Shield size={24} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Administrator Accounts</div>
            <div className="text-2xl font-extrabold text-gray-900">
              {staffList.filter(s => s.role === "admin").length}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Active Store Staff</div>
            <div className="text-2xl font-extrabold text-gray-900">
              {staffList.filter(s => s.role === "staff").length}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Store size={24} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Branch Coverage</div>
            <div className="text-2xl font-extrabold text-gray-900">
              {new Set(staffList.map(s => s.branch).filter(Boolean)).size || 1} Branches
            </div>
          </div>
        </div>
      </div>

      {/* Staff Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-base font-bold text-gray-900">បញ្ជីបុគ្គលិកទាំងអស់ ({staffList.length})</h2>
          <span className="text-xs text-gray-500">Security Hash: Bcrypt Cost 12</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Staff Member</th>
                <th className="p-4">Role & Access</th>
                <th className="p-4">Assigned Branch • សាខា</th>
                <th className="p-4">Working Shift • វេន</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400">Loading staff accounts...</td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500">No staff members configured yet.</td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs ${s.role === 'admin' ? 'bg-[#8B1A1A]' : 'bg-blue-600'}`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{s.name}</span>
                            {s.role === 'admin' && <Shield size={12} className="text-[#8B1A1A]" />}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{s.email}</span>
                            {s.phone && <span>• {s.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        s.role === 'admin' 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {s.role === 'admin' ? 'Super Admin' : 'Store Staff'}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                        <Store size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{s.branch || "Phnom Penh Main Branch"}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-700">
                        <Clock size={14} className="text-blue-500 flex-shrink-0" />
                        <span>{s.shift || "Morning Shift"}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        s.status === 'active' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {s.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="កែសម្រួល • Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="លុបចេញ • Delete"
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

      {/* Create / Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#8B1A1A]/10 text-[#8B1A1A] rounded-lg">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editTarget ? "កែសម្រួលព័ត៌មានបុគ្គលិក • Edit Staff" : "បង្កើតបុគ្គលិកថ្មី • New Staff Member"}
                  </h3>
                  <p className="text-[11px] text-gray-500">បញ្ចូលទិន្នន័យដើម្បីកំណត់តួនាទី និងវេន</p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ឈ្មោះបុគ្គលិក • Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chan Dara"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">តួនាទី • Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white font-medium"
                  >
                    <option value="staff">Store Staff • បុគ្គលិកលក់ និងរៀបចំទំនិញ</option>
                    <option value="admin">Super Admin • អ្នកគ្រប់គ្រងប្រព័ន្ធ</option>
                    <option value="manager">Store Manager • ប្រធានសាខា</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">អ៊ីមែលការងារ • Work Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dara@stechstore.com"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">លេខទូរស័ព្ទ • Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="012 345 678"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {editTarget ? "ពាក្យសម្ងាត់ថ្មី • Password • ទុកទទេរបើមិនផ្លាស់ប្តូរ" : "ពាក្យសម្ងាត់ • Password *"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editTarget ? "•••••••• • Keep unchanged" : "យ៉ាងតិច ៦ តួអក្សរ • Min 6 chars"}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">សាខាបម្រើការ • Branch</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-xs font-medium"
                  >
                    <option value="Phnom Penh Main Branch">Phnom Penh Main Branch</option>
                    <option value="Toul Kork Branch">Toul Kork Branch</option>
                    <option value="Siem Reap Branch">Siem Reap Branch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">វេនធ្វើការ • Working Shift</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-xs font-medium"
                  >
                    <option value="Morning Shift">Morning Shift • 08:00 - 17:00</option>
                    <option value="Afternoon Shift">Afternoon Shift • 13:00 - 21:30</option>
                    <option value="Full-Time Shift">Full-Time Shift • 08:00 - 18:00</option>
                  </select>
                </div>
              </div>

              {editTarget && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ស្ថានភាពគណនី • Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === "active"}
                        onChange={() => setStatus("active")}
                        className="text-[#8B1A1A]"
                      />
                      <span>Active • ដំណើរការ</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === "inactive"}
                        onChange={() => setStatus("inactive")}
                        className="text-red-600"
                      />
                      <span>Inactive • ផ្អាកដំណើរការ</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  បោះបង់ • Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B1A1A]/20 cursor-pointer"
                >
                  {editTarget ? "រក្សាទុកការកែប្រែ • Save Changes" : "បង្កើតគណនី • Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
