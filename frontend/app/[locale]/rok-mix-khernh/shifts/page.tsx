"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { CalendarCheck, Clock, Plus, Users, Calendar, CheckCircle2, Edit, Trash2, X, Sun, Moon, Briefcase } from "lucide-react";

type Shift = {
  id: number;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  days?: string;
  description?: string;
  is_active: boolean;
  staff_count?: number;
};

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Shift | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [startTime, setStartTime] = useState("08:00 AM");
  const [endTime, setEndTime] = useState("05:00 PM");
  const [days, setDays] = useState("Monday - Saturday");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/shifts");
      setShifts(res.data);
    } catch (e) {
      showToast("Failed to load shift schedules", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const openCreateModal = () => {
    setEditTarget(null);
    setName("");
    setCode(`SHIFT-0${shifts.length + 1}`);
    setStartTime("08:00 AM");
    setEndTime("05:00 PM");
    setDays("Monday - Saturday");
    setDescription("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (s: Shift) => {
    setEditTarget(s);
    setName(s.name);
    setCode(s.code);
    setStartTime(s.start_time);
    setEndTime(s.end_time);
    setDays(s.days || "Monday - Saturday");
    setDescription(s.description || "");
    setIsActive(s.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        code,
        start_time: startTime,
        end_time: endTime,
        days,
        description,
        is_active: isActive,
      };

      if (editTarget) {
        await api.put(`/admin/shifts/${editTarget.id}`, payload);
        showToast("Shift schedule updated successfully!");
      } else {
        await api.post("/admin/shifts", payload);
        showToast("Shift schedule created successfully!");
      }

      setModalOpen(false);
      fetchShifts();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Operation failed.";
      showToast(msg, "error");
    }
  };

  const handleDelete = async (id: number, sName: string) => {
    if (!confirm(`Are you sure you want to delete shift "${sName}"?`)) return;

    try {
      await api.delete(`/admin/shifts/${id}`);
      showToast(`Shift "${sName}" removed.`);
      fetchShifts();
    } catch (err: any) {
      showToast("Failed to delete shift.", "error");
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
              <CalendarCheck size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B1A1A]">Operations Schedule</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            គ្រប់គ្រងវេនធ្វើការ • Shifts & Working Hours
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            ចាត់ចែងម៉ោងចូលធ្វើការ វេនព្រឹក វេនរសៀល/យប់ និងវេនពេញម៉ោងសម្រាប់បុគ្គលិកហាង។
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#8B1A1A]/20 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>+ បង្កើតវេនថ្មី • Add Shift</span>
        </button>
      </div>

      {/* Shift Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {loading ? (
          <div className="col-span-full py-16 text-center text-gray-400">Loading working shifts...</div>
        ) : shifts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400">No shifts created yet.</div>
        ) : (
          shifts.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {s.name.includes("ព្រឹក") || s.name.includes("Morning") ? (
                        <Sun size={20} className="text-amber-500" />
                      ) : s.name.includes("យប់") || s.name.includes("Evening") ? (
                        <Moon size={20} className="text-indigo-600" />
                      ) : (
                        <Briefcase size={20} className="text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-snug">{s.name}</h3>
                      <span className="text-[10px] font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {s.code}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                    {s.is_active ? "Active" : "Disabled"}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-gray-600 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#8B1A1A] flex-shrink-0" />
                    <span>ម៉ោងធ្វើការ: <strong>{s.start_time} - {s.end_time}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                    <span>ថ្ងៃធ្វើការ: {s.days || "Monday - Saturday"}</span>
                  </div>
                  {s.description && (
                    <p className="text-[11px] text-gray-500 italic mt-2 line-clamp-2">
                      "{s.description}"
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-500 font-medium">
                  បុគ្គលិកក្នុងវេននេះ: <strong>{s.staff_count ?? 2} នាក់</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Shift"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Shift"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add/Edit Shift */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#8B1A1A]" />
                <h3 className="text-base font-bold text-gray-900">
                  {editTarget ? "កែសម្រួលវេនធ្វើការ • Edit Shift" : "បង្កើតវេនធ្វើការថ្មី • Add New Shift"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ឈ្មោះវេន • Shift Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Morning Shift"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">កូដវេន • Shift Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="SHIFT-AM"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ម៉ោងចូល • Start Time *</label>
                  <input
                    type="text"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="08:00 AM"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ម៉ោងចេញ • End Time *</label>
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="05:00 PM"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ថ្ងៃធ្វើការក្នុងសប្តាហ៍ • Working Days</label>
                <input
                  type="text"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  placeholder="Monday - Saturday"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ការពិពណ៌នាអំពីវេន • Shift Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ភារកិច្ច និងតួនាទីចម្បងក្នុងវេននេះ..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shiftActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#8B1A1A] rounded"
                />
                <label htmlFor="shiftActive" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  វេនកំពុងដំណើរការ • Shift Active
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
                  {editTarget ? "រក្សាទុក • Update Shift" : "បង្កើតវេន • Create Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
