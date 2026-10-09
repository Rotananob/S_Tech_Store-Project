"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Building2, Plus, Phone, MapPin, Clock, User, CheckCircle, Edit, Trash2, X, Store } from "lucide-react";

type Branch = {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  manager_name?: string;
  opening_hours?: string;
  is_active: boolean;
  staff_count?: number;
};

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [managerName, setManagerName] = useState("");
  const [openingHours, setOpeningHours] = useState("08:00 AM - 08:30 PM");
  const [isActive, setIsActive] = useState(true);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/branches");
      setBranches(res.data);
    } catch (e) {
      showToast("Failed to load branches", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openCreateModal = () => {
    setEditTarget(null);
    setName("");
    setCode(`ST-BRANCH-0${branches.length + 1}`);
    setAddress("");
    setPhone("");
    setManagerName("");
    setOpeningHours("08:00 AM - 08:30 PM");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditTarget(b);
    setName(b.name);
    setCode(b.code);
    setAddress(b.address || "");
    setPhone(b.phone || "");
    setManagerName(b.manager_name || "");
    setOpeningHours(b.opening_hours || "08:00 AM - 08:30 PM");
    setIsActive(b.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        code,
        address,
        phone,
        manager_name: managerName,
        opening_hours: openingHours,
        is_active: isActive,
      };

      if (editTarget) {
        await api.put(`/admin/branches/${editTarget.id}`, payload);
        showToast("Branch updated successfully!");
      } else {
        await api.post("/admin/branches", payload);
        showToast("Branch created successfully!");
      }

      setModalOpen(false);
      fetchBranches();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Operation failed.";
      showToast(msg, "error");
    }
  };

  const handleDelete = async (id: number, bName: string) => {
    if (!confirm(`Are you sure you want to delete branch "${bName}"?`)) return;

    try {
      await api.delete(`/admin/branches/${id}`);
      showToast(`Branch "${bName}" deleted.`);
      fetchBranches();
    } catch (err: any) {
      showToast("Failed to delete branch.", "error");
    }
  };

  return (
    <div className="font-sans max-w-7xl mx-auto pb-12">
      {/* Toast */}
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
              <Building2 size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B1A1A]">Admin Operations</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            គ្រប់គ្រងសាខាហាង • Branch Management
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            ចាត់ចែងទីតាំងសាខា S Tech Store ទូទាំងរាជធានី-ខេត្ត លេខទំនាក់ទំនង និងម៉ោងបើកដំណើរការ។
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#8B1A1A]/20 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>+ បន្ថែមសាខាថ្មី • Add Branch</span>
        </button>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {loading ? (
          <div className="col-span-full py-16 text-center text-gray-400">Loading branch networks...</div>
        ) : branches.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400">No branches added yet.</div>
        ) : (
          branches.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#8B1A1A] flex items-center justify-center font-bold">
                      <Store size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-snug">{b.name}</h3>
                      <span className="text-[10px] font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {b.code}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                    {b.is_active ? "Active" : "Closed"}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-gray-600 pt-3 border-t border-gray-100">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{b.address || "Main Street, Phnom Penh"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400 flex-shrink-0" />
                    <span>{b.phone || "+855 23 888 999"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400 flex-shrink-0" />
                    <span>Manager: <strong>{b.manager_name || "Rotana Nob"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-500 flex-shrink-0" />
                    <span>{b.opening_hours || "08:00 AM - 08:30 PM"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-500 font-medium">
                  បុគ្គលិក: <strong>{b.staff_count ?? 2} នាក់</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Branch"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id, b.name)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Branch"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add/Edit Branch */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#8B1A1A]" />
                <h3 className="text-base font-bold text-gray-900">
                  {editTarget ? "កែសម្រួលសាខា (Edit Branch)" : "បន្ថែមសាខាថ្មី (Add New Branch)"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ឈ្មោះសាខា • Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Toul Kork Branch"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">កូដសាខា • Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ST-TK-02"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">អាសយដ្ឋាន • Full Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street 315, Sangkat Boeung Kak 1, Khan Toul Kork, Phnom Penh"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">លេខទូរស័ព្ទ • Phone Contact</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+855 23 888 777"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">អ្នកគ្រប់គ្រង • Branch Manager</label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Sokha Meng"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ម៉ោងបើកដំណើរការ • Opening Hours</label>
                <input
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="08:00 AM - 08:30 PM"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="branchActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#8B1A1A] rounded"
                />
                <label htmlFor="branchActive" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  សាខាកំពុងដំណើរការទទួលភ្ញៀវ • Branch Active for Operations
                </label>
              </div>

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
                  {editTarget ? "រក្សាទុក • Update Branch" : "បង្កើតសាខា • Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
