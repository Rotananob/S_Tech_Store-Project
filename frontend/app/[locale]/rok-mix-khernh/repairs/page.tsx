"use client";
import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { sendRepairAlert } from "@/lib/services/admin.service";
import { Search, Plus, Eye, Edit2, ChevronDown, User, Trash2, X, Wrench, CheckCircle2, Mail, Send, Bell, Globe, Smartphone, Phone, DollarSign } from "lucide-react";

type Ticket = {
  id: number;
  ticket_code: string;
  customer: string;
  phone: string;
  customer_email?: string;
  device: string;
  issue: string;
  dateIn: string;
  estCost: number;
  status: string;
  technician: string;
  notes?: string;
};

type EditTicketForm = Ticket & {
  send_email?: boolean;
  send_telegram?: boolean;
  send_web?: boolean;
};

const STATUSES = ["All Statuses", "Pending Assessment", "In Progress", "Ready", "Completed"];

const getStatusStyle = (status: string) => {
  switch (status) {
    case "Pending Assessment": return "bg-amber-100 text-amber-700";
    case "In Progress": return "bg-blue-100 text-blue-700";
    case "Ready": return "bg-green-100 text-green-700";
    case "Completed": return "bg-gray-100 text-gray-600";
    default: return "bg-gray-100 text-gray-600";
  }
};

export default function RepairManagementPage() {
  const [repairs, setRepairs] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [editForm, setEditForm] = useState<EditTicketForm | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);

  // Multi-Channel Alert Modal state
  const [alertTicket, setAlertTicket] = useState<Ticket | null>(null);
  const [alertEmail, setAlertEmail] = useState(true);
  const [alertTelegram, setAlertTelegram] = useState(true);
  const [alertWeb, setAlertWeb] = useState(true);
  const [alertCustomEmail, setAlertCustomEmail] = useState("");
  const [sendingAlert, setSendingAlert] = useState(false);

  const [newForm, setNewForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    send_email: true,
    send_telegram: true,
    send_web: true,
    device_name: "",
    issue_description: "",
    technician_name: "Unassigned",
    estimated_cost: 0,
    status: "Pending Assessment",
  });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/repairs");
      const mapped: Ticket[] = (res.data || []).map((r: any) => ({
        id: r.id,
        ticket_code: r.ticket_code || `#REP-${r.id}`,
        customer: r.customer_name || "Unknown Customer",
        phone: r.customer_phone || "-",
        customer_email: r.customer_email || "",
        device: r.device_name || "Device",
        issue: r.issue_description || "N/A",
        dateIn: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently",
        estCost: parseFloat(r.estimated_cost) || 0,
        status: r.status || "Pending Assessment",
        technician: r.technician_name || "Unassigned",
        notes: r.notes || "",
      }));
      setRepairs(mapped);
    } catch (e) {
      showToast("Failed to load repair tickets from database", "error");
    } finally {
      setLoading(false);
    }
  };

  const openAlertModal = (ticket: Ticket) => {
    setAlertTicket(ticket);
    const email = ticket.customer_email || "";
    setAlertCustomEmail(email);
    setAlertEmail(Boolean(email));
    setAlertTelegram(true);
    setAlertWeb(true);
  };

  const handleSendAlert = async () => {
    if (!alertTicket) return;
    if (!alertEmail && !alertTelegram && !alertWeb) {
      showToast("សូមជ្រើសរើសយ៉ាងហោចណាស់ Channel មួយ (Email, Telegram, ឬ Website Account)", "error");
      return;
    }
    try {
      setSendingAlert(true);
      const res = await sendRepairAlert(alertTicket.id, {
        send_email: alertEmail,
        send_telegram: alertTelegram,
        send_web: alertWeb,
        email: alertCustomEmail.trim() || undefined,
      });
      if (res.success) {
        showToast(res.message || "បានបញ្ជូនការជូនដំណឹងជោគជ័យ!");
        if (alertCustomEmail && alertCustomEmail !== alertTicket.customer_email) {
          setRepairs(prev => prev.map(r => r.id === alertTicket.id ? { ...r, customer_email: alertCustomEmail } : r));
        }
        setAlertTicket(null);
      } else {
        showToast(res.message || "បរាជ័យក្នុងការបញ្ជូនការជូនដំណឹង", "error");
      }
    } catch (e: any) {
      showToast(e?.response?.data?.message || "បរាជ័យក្នុងការបញ្ជូនការជូនដំណឹង", "error");
    } finally {
      setSendingAlert(false);
    }
  };

  const handleSendEmail = async (ticket: Ticket) => {
    openAlertModal(ticket);
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  const filtered = useMemo(() => {
    return repairs.filter(r => {
      const matchStatus = statusFilter === "All Statuses" || r.status === statusFilter;
      const matchSearch = !searchQuery || 
        r.ticket_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.device.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [repairs, statusFilter, searchQuery]);

  const openEditTicketModal = (ticket: Ticket) => {
    setEditTicket(ticket);
    setEditForm({
      ...ticket,
      send_email: Boolean(ticket.customer_email),
      send_telegram: true,
      send_web: true,
    });
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    try {
      await api.put(`/admin/repairs/${editForm.id}`, {
        status: editForm.status,
        technician_name: editForm.technician,
        estimated_cost: editForm.estCost,
        send_email: editForm.send_email,
        send_telegram: editForm.send_telegram,
        send_web: editForm.send_web,
      });
      setRepairs(prev => prev.map(r => r.id === editForm.id ? { ...editForm } : r));
      setEditTicket(null);
      setEditForm(null);
      showToast("បច្ចុប្បន្នភាពប័ណ្ណជួសជុលបានជោគជ័យ! • Ticket updated!");
    } catch (e) {
      showToast("បរាជ័យក្នុងការកែប្រែព័ត៌មាន", "error");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.customer_name.trim() || !newForm.device_name.trim() || !newForm.issue_description.trim()) {
      showToast("សូមបំពេញព័ត៌មានចាំបាច់អតិថិជន និងឧបករណ៍", "error");
      return;
    }

    setCreatingTicket(true);
    try {
      await api.post("/admin/repairs", newForm);
      await fetchRepairs();
      setShowCreateModal(false);
      setNewForm({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        send_email: true,
        send_telegram: true,
        send_web: true,
        device_name: "",
        issue_description: "",
        technician_name: "Unassigned",
        estimated_cost: 0,
        status: "Pending Assessment",
      });
      showToast("បានបង្កើតប័ណ្ណជួសជុលជោគជ័យ! • Repair ticket created!");
    } catch (e) {
      showToast("បរាជ័យក្នុងការបង្កើតប័ណ្ណជួសជុល", "error");
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleDeleteTicket = async (id: number) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបប័ណ្ណជួសជុលនេះមែនទេ?")) return;
    try {
      await api.delete(`/admin/repairs/${id}`);
      setRepairs(prev => prev.filter(r => r.id !== id));
      if (viewTicket?.id === id) setViewTicket(null);
      showToast("បានលុបប័ណ្ណជួសជុលដោយជោគជ័យ! • Ticket deleted");
    } catch (e) {
      showToast("បរាជ័យក្នុងការលុបប័ណ្ណជួសជុល", "error");
    }
  };

  return (
    <div className="font-sans">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="text-[#8B1A1A]" size={20} />
                <span>បង្កើតប័ណ្ណជួសជុលថ្មី • New Repair Ticket</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ឈ្មោះអតិថិជន • Customer Name *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="ឈ្មោះអតិថិជន..."
                  value={newForm.customer_name}
                  onChange={e => setNewForm({ ...newForm, customer_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  លេខទូរស័ព្ទ • Phone Number
                </label>
                <input 
                  type="text"
                  placeholder="012 345 678"
                  value={newForm.customer_phone}
                  onChange={e => setNewForm({ ...newForm, customer_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  អ៊ីមែលអតិថិជន • Customer Email (សម្រាប់ Push Email Notification)
                </label>
                <input 
                  type="email"
                  placeholder="customer@example.com"
                  value={newForm.customer_email}
                  onChange={e => setNewForm({ ...newForm, customer_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]"
                />
              </div>

              {/* Multi-Channel Alerts Checkboxes */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Bell size={14} className="text-purple-600" />
                  <span>ការជូនដំណឹងស្វ័យប្រវត្តិ (Instant Multi-Channel Alerts)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${newForm.send_email ? 'bg-white border-rose-400 text-rose-950 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={newForm.send_email}
                      onChange={e => setNewForm({ ...newForm, send_email: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-rose-600 cursor-pointer"
                    />
                    <Mail size={13} className="text-rose-600 shrink-0" />
                    <span className="truncate">Real Email</span>
                  </label>

                  <label className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${newForm.send_telegram ? 'bg-white border-sky-400 text-sky-950 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={newForm.send_telegram}
                      onChange={e => setNewForm({ ...newForm, send_telegram: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-sky-600 cursor-pointer"
                    />
                    <Send size={13} className="text-sky-600 shrink-0" />
                    <span className="truncate">Telegram</span>
                  </label>

                  <label className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${newForm.send_web ? 'bg-white border-purple-400 text-purple-950 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={newForm.send_web}
                      onChange={e => setNewForm({ ...newForm, send_web: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-purple-600 cursor-pointer"
                    />
                    <Globe size={13} className="text-purple-600 shrink-0" />
                    <span className="truncate">Account Web</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ឈ្មោះឧបករណ៍ • Device Name *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="MacBook Pro 14, Dell XPS 13, iPhone 15 Pro..."
                  value={newForm.device_name}
                  onChange={e => setNewForm({ ...newForm, device_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  បញ្ហាដែលត្រូវជួសជុល • Reported Issue *
                </label>
                <textarea 
                  required
                  rows={3}
                  placeholder="រៀបរាប់ពីបញ្ហាខូច ឬអាការៈរបស់ឧបករណ៍..."
                  value={newForm.issue_description}
                  onChange={e => setNewForm({ ...newForm, issue_description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ជាងទទួលខុសត្រូវ • Technician
                  </label>
                  <input 
                    type="text"
                    placeholder="ឈ្មោះជាង..."
                    value={newForm.technician_name}
                    onChange={e => setNewForm({ ...newForm, technician_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    តម្លៃប៉ាន់ស្មាន • Est. Cost USD
                  </label>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newForm.estimated_cost}
                    onChange={e => setNewForm({ ...newForm, estimated_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ស្ថានភាព • Status
                </label>
                <select 
                  value={newForm.status}
                  onChange={e => setNewForm({ ...newForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] bg-white"
                >
                  <option value="Pending Assessment">Pending Assessment</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Ready">Ready</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                >
                  បោះបង់ • Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creatingTicket}
                  className="flex-1 py-2.5 border-none rounded-xl bg-[#8B1A1A] hover:bg-[#6B1010] text-white font-bold transition-colors disabled:opacity-50"
                >
                  {creatingTicket ? "កំពុងបង្កើត..." : "បង្កើតប័ណ្ណ • Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewTicket && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Ticket Details — {viewTicket.ticket_code}</h3>
            
            <div className="grid grid-cols-2 gap-6">
              {[
                ["Customer", viewTicket.customer], 
                ["Phone", viewTicket.phone], 
                ["Email", viewTicket.customer_email || "N/A"], 
                ["Device", viewTicket.device], 
                ["Date In", viewTicket.dateIn], 
                ["Est. Cost", `$${viewTicket.estCost}`], 
                ["Technician", viewTicket.technician]
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{k}</div>
                  <div className="text-sm font-medium text-gray-900">{v}</div>
                </div>
              ))}
              
              <div className="col-span-2">
                <div className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Reported Issue</div>
                <div className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {viewTicket.issue}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">STATUS</div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(viewTicket.status)}`}>
                  {viewTicket.status}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => handleDeleteTicket(viewTicket.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                <span>លុបប័ណ្ណ</span>
              </button>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const t = viewTicket;
                  setViewTicket(null);
                  openAlertModal(t);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Bell size={16} />
                <span>បញ្ជូនការជូនដំណឹង (Email / TG / Web)</span>
              </button>
              <button 
                onClick={() => setViewTicket(null)} 
                className="px-6 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                បិទ • Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTicket && editForm && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Update Ticket {editForm.ticket_code}</h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <div className="relative">
                  <select 
                    value={editForm.status} 
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    {STATUSES.filter(s => s !== "All Statuses").map(s => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Technician</label>
                <input 
                  value={editForm.technician} 
                  onChange={e => setEditForm({ ...editForm, technician: e.target.value })} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estimated Cost in USD</label>
                <input 
                  type="number" 
                  value={editForm.estCost} 
                  onChange={e => setEditForm({ ...editForm, estCost: parseFloat(e.target.value) || 0 })} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              {/* Multi-Channel Alerts Checkboxes */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Bell size={13} className="text-purple-600" />
                  <span>ផ្ញើជូនដំណឹងបច្ចុប្បន្នភាព (Notify Customer Channels)</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <label className={`flex items-center gap-1 p-2 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all ${editForm.send_email ? 'bg-white border-rose-400 text-rose-950 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={editForm.send_email ?? true}
                      onChange={e => setEditForm({ ...editForm, send_email: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-rose-600 cursor-pointer"
                    />
                    <Mail size={12} className="text-rose-600 shrink-0" />
                    <span className="truncate">Email</span>
                  </label>

                  <label className={`flex items-center gap-1 p-2 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all ${editForm.send_telegram ? 'bg-white border-sky-400 text-sky-950 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={editForm.send_telegram ?? true}
                      onChange={e => setEditForm({ ...editForm, send_telegram: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-sky-600 cursor-pointer"
                    />
                    <Send size={12} className="text-sky-600 shrink-0" />
                    <span className="truncate">Telegram</span>
                  </label>

                  <label className={`flex items-center gap-1 p-2 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all ${editForm.send_web ? 'bg-white border-purple-400 text-purple-950 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={editForm.send_web ?? true}
                      onChange={e => setEditForm({ ...editForm, send_web: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-purple-600 cursor-pointer"
                    />
                    <Globe size={12} className="text-purple-600 shrink-0" />
                    <span className="truncate">Web</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button 
                onClick={() => { setEditTicket(null); setEditForm(null); }} 
                className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditSave} 
                className="flex-1 py-2.5 border-none rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors cursor-pointer shadow-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Push Alert to Repair Customer Modal ─── */}
      {alertTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-5 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bell size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">Push Alert to Customer</h3>
                  <p className="text-xs text-purple-200">
                    Ticket: {alertTicket.ticket_code} • {alertTicket.customer} ({alertTicket.device})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAlertTicket(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Ticket Summary Card */}
              <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <User size={13} className="text-purple-700" />
                    <span>{alertTicket.customer}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusStyle(alertTicket.status)}`}>
                    {alertTicket.status}
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Smartphone size={12} className="text-gray-500" /> {alertTicket.device}</span>
                  <span className="flex items-center gap-1"><Phone size={12} className="text-gray-500" /> {alertTicket.phone}</span>
                  <span className="flex items-center gap-1"><DollarSign size={12} className="text-gray-500" /> ${alertTicket.estCost}</span>
                </div>
              </div>

              {/* 3 Channels Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  ជ្រើសរើស Channels សម្រាប់បញ្ជូនដំណឹង (Multi-Channel Dispatch) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Channel 1: Real Email */}
                  <div
                    onClick={() => setAlertEmail(!alertEmail)}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      alertEmail
                        ? "bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-xs"
                        : "bg-gray-50/60 border-gray-200 text-gray-400 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-rose-950">
                        <Mail size={15} className="text-rose-600" />
                        <span>Real Email</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={alertEmail}
                        onChange={(e) => {
                          e.stopPropagation();
                          setAlertEmail(e.target.checked);
                        }}
                        className="w-4 h-4 rounded text-rose-600 cursor-pointer"
                      />
                    </div>
                    <div className="text-[11px] text-gray-700 truncate" title={alertCustomEmail || "គ្មាន Email"}>
                      {alertCustomEmail || "គ្មាន Email"}
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-rose-700">
                      {alertCustomEmail ? "បាញ់ Email HTML របាយការណ៍" : "បញ្ចូល Email ខាងក្រោម"}
                    </span>
                  </div>

                  {/* Channel 2: Telegram Bot Direct */}
                  <div
                    onClick={() => setAlertTelegram(!alertTelegram)}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      alertTelegram
                        ? "bg-sky-50/80 border-sky-400 ring-2 ring-sky-500/20 shadow-xs"
                        : "bg-gray-50/60 border-gray-200 text-gray-400 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-sky-950">
                        <Send size={15} className="text-sky-600" />
                        <span>Telegram Bot</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={alertTelegram}
                        onChange={(e) => {
                          e.stopPropagation();
                          setAlertTelegram(e.target.checked);
                        }}
                        className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                      />
                    </div>
                    <div className="text-[11px] text-gray-700 truncate">
                      Bot 2 Companion
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-sky-700">
                      ផ្ញើសារ 1-on-1 Ticket Card
                    </span>
                  </div>

                  {/* Channel 3: Website Account In-App */}
                  <div
                    onClick={() => setAlertWeb(!alertWeb)}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      alertWeb
                        ? "bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20 shadow-xs"
                        : "bg-gray-50/60 border-gray-200 text-gray-400 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-purple-950">
                        <Globe size={15} className="text-purple-600" />
                        <span>Account Web</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={alertWeb}
                        onChange={(e) => {
                          e.stopPropagation();
                          setAlertWeb(e.target.checked);
                        }}
                        className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                      />
                    </div>
                    <div className="text-[11px] text-gray-700 truncate">
                      {alertTicket.customer}
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-purple-700">
                      កត់ត្រាក្នុង Notification Bell
                    </span>
                  </div>
                </div>

                {alertEmail && (
                  <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center gap-2">
                    <Mail size={14} className="text-rose-600 shrink-0" />
                    <input
                      type="email"
                      value={alertCustomEmail}
                      onChange={(e) => setAlertCustomEmail(e.target.value)}
                      placeholder="ផ្ទៀងផ្ទាត់ ឬបញ្ចូលអ៊ីមែលអតិថិជន (e.g. customer@example.com)..."
                      className="w-full bg-transparent text-xs text-gray-800 outline-none font-medium placeholder:text-gray-400"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={() => setAlertTicket(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-100 transition-colors cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendAlert}
                disabled={sendingAlert}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {sendingAlert ? (
                  <span>Sending Alert...</span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Multi-Channel Alert</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Repair & Services</h1>
          <p className="text-gray-500 text-sm">Manage customer repair tickets, assignments, and service statuses.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)} 
          className="px-4 py-2.5 bg-[#8B1A1A] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#6B1010] transition-colors cursor-pointer shadow-sm"
        >
          <Plus size={16} />
          New Repair Ticket
        </button>
      </div>

      {/* Filters Box */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full md:flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Search Ticket ID, Customer, or Device" 
            className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50" 
          />
        </div>
        
        <div className="w-full sm:w-1/2 md:w-64 relative">
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="w-full py-2.5 pl-4 pr-10 border border-gray-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
        
        <button 
          onClick={() => { setSearchQuery(""); setStatusFilter("All Statuses"); }} 
          className="w-full md:w-auto px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">TICKET ID</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CUSTOMER</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">DEVICE / ISSUE</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">DATE IN</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <div className="w-8 h-8 border-2 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    កំពុងទាញទិន្នន័យពី Database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">No repair tickets found.</td>
                </tr>
              ) : filtered.map((ticket) => {
                return (
                  <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                        {ticket.ticket_code}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-900 mb-0.5">{ticket.customer}</div>
                      <div className="text-xs text-gray-500">{ticket.phone}</div>
                      {ticket.customer_email && (
                        <div className="text-[11px] text-gray-400 font-mono truncate max-w-[140px]" title={ticket.customer_email}>
                          {ticket.customer_email}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-gray-900 mb-0.5">{ticket.device}</div>
                      <div className="text-xs text-red-600 font-medium">{ticket.issue}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {ticket.dateIn}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusStyle(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      {ticket.technician !== "Unassigned" && (
                        <div className="text-xs text-gray-500 mt-2 flex items-center gap-1.5 font-medium">
                          <User size={12} />
                          {ticket.technician}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openAlertModal(ticket)} 
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer" 
                          title="ជូនដំណឹងទៅកាន់អតិថិជន (Multi-Channel Alert: Email, Telegram, Web)"
                        >
                          <Bell size={16} />
                        </button>
                        <button 
                          onClick={() => setViewTicket(ticket)} 
                          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" 
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => openEditTicketModal(ticket)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" 
                          title="Update Ticket"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTicket(ticket.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                          title="Delete Ticket"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
