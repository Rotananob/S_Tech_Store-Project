"use client";
import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { Plus, Filter, Clock, Tag, TrendingUp, Trash2, ChevronDown, CheckCircle2, X } from "lucide-react";

type Promotion = {
  id: number | string;
  name: string;
  code?: string;
  type: string;
  value: string | number;
  valid_from?: string | null;
  valid_until?: string | null;
  usage_count?: number;
  usage_max?: number | null;
  status: string;
  auto_applied?: boolean;
};

export default function PromotionManagementPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: "",
    code: "",
    type: "percentage",
    value: "",
    valid_from: "",
    valid_until: "",
    usage_max: "",
    status: "active",
    auto_applied: false,
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const res = await api.get("/promo-codes");
      setPromos(res.data || []);
    } catch (e) {
      showToast("បរាជ័យក្នុងការទាញទិន្នន័យប្រូម៉ូសិន", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const filtered = useMemo(() => {
    return promos.filter(p => {
      const pType = (p.type || "").toLowerCase();
      const matchType = typeFilter === "All Types" || 
        (typeFilter === "Percentage" && pType.includes("percent")) ||
        (typeFilter === "Fixed Amount" && pType.includes("fix"));
      
      const pStatus = (p.status || "").toLowerCase();
      const matchStatus = statusFilter === "All Status" || 
        pStatus === statusFilter.toLowerCase();
      return matchType && matchStatus;
    });
  }, [promos, typeFilter, statusFilter]);

  const handleCreateSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.name || !newPromo.value) {
      showToast("សូមបំពេញឈ្មោះយុទ្ធនាការ និងតម្លៃបញ្ចុះតម្លៃ", "error");
      return;
    }

    setSubmitting(true);
    try {
      const numVal = parseFloat(String(newPromo.value).replace(/[^0-9.]/g, '')) || 0;
      await api.post("/promo-codes", {
        name: newPromo.name,
        code: newPromo.code ? newPromo.code.toUpperCase().trim() : null,
        type: newPromo.type,
        value: numVal,
        valid_from: newPromo.valid_from || null,
        valid_until: newPromo.valid_until || null,
        usage_max: newPromo.usage_max ? parseInt(newPromo.usage_max) : null,
        status: newPromo.status,
        auto_applied: Boolean(newPromo.auto_applied),
      });

      await fetchPromos();
      setShowCreate(false);
      setNewPromo({
        name: "",
        code: "",
        type: "percentage",
        value: "",
        valid_from: "",
        valid_until: "",
        usage_max: "",
        status: "active",
        auto_applied: false,
      });
      showToast("បានបង្កើតប្រូម៉ូសិនថ្មីដោយជោគជ័យ! • Promotion created!");
    } catch (e: any) {
      const err = e.response?.data?.message || "បរាជ័យក្នុងការបង្កើតប្រូម៉ូសិន";
      showToast(err, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបប្រូម៉ូសិននេះមែនទេ?")) return;
    try {
      await api.delete(`/promo-codes/${id}`);
      setPromos(prev => prev.filter(p => p.id !== id));
      showToast("បានលុបប្រូម៉ូសិនដោយជោគជ័យ! • Promotion deleted.");
    } catch (e) {
      showToast("បរាជ័យក្នុងការលុបប្រូម៉ូសិន", "error");
    }
  };

  // Real stats
  const activeCount = promos.filter(p => (p.status || "").toLowerCase() === "active").length;
  const totalUses = promos.reduce((sum, p) => sum + (p.usage_count || 0), 0);
  const scheduledCount = promos.filter(p => (p.status || "").toLowerCase() === "scheduled").length;

  return (
    <div className="font-sans">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Tag className="text-[#8B1A1A]" size={20} />
                <span>បង្កើតប្រូម៉ូសិនថ្មី • Create Promotion</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ឈ្មោះយុទ្ធនាការ • Campaign Name *
                </label>
                <input 
                  type="text"
                  required
                  value={newPromo.name} 
                  onChange={e => setNewPromo({ ...newPromo, name: e.target.value })} 
                  placeholder="ឧទាហរណ៍៖ Khmer New Year Sale" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ប្រភេទ • Type
                  </label>
                  <select 
                    value={newPromo.type} 
                    onChange={e => setNewPromo({ ...newPromo, type: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] bg-white"
                  >
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed Amount $</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    តម្លៃ • Value *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPromo.value} 
                    onChange={e => setNewPromo({ ...newPromo, value: e.target.value })} 
                    placeholder="15 or 50" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    កូដប្រូម៉ូសិន • Promo Code
                  </label>
                  <input 
                    type="text"
                    value={newPromo.code} 
                    onChange={e => setNewPromo({ ...newPromo, code: e.target.value })} 
                    placeholder="KNY2026" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] font-mono uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ចំនួនប្រើអតិបរមា • Max Uses
                  </label>
                  <input 
                    type="number" 
                    value={newPromo.usage_max} 
                    onChange={e => setNewPromo({ ...newPromo, usage_max: e.target.value })} 
                    placeholder="មិនកំណត់" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    សុពលភាពចាប់ពី • Valid From
                  </label>
                  <input 
                    type="date"
                    value={newPromo.valid_from} 
                    onChange={e => setNewPromo({ ...newPromo, valid_from: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    សុពលភាពដល់ • Valid Until
                  </label>
                  <input 
                    type="date"
                    value={newPromo.valid_until} 
                    onChange={e => setNewPromo({ ...newPromo, valid_until: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ស្ថានភាព • Status
                </label>
                <select 
                  value={newPromo.status} 
                  onChange={e => setNewPromo({ ...newPromo, status: e.target.value })} 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] bg-white"
                >
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              
              <div className="pt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newPromo.auto_applied} 
                    onChange={e => setNewPromo({ ...newPromo, auto_applied: e.target.checked })} 
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" 
                  />
                  <span>ដាក់បញ្ចុះតម្លៃស្វ័យប្រវត្តដោយមិនបាច់វាយកូដ • Auto-apply without code</span>
                </label>
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowCreate(false)} 
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                >
                  បោះបង់ • Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 py-2.5 border-none rounded-xl bg-[#8B1A1A] hover:bg-[#6B1010] text-white font-bold transition-colors disabled:opacity-50"
                >
                  {submitting ? "កំពុងរក្សាទុក..." : "បង្កើតប្រូម៉ូសិន • Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Promotion Management</h1>
          <p className="text-gray-500 text-sm">Create and manage sales campaigns, discount coupons, and limited-time offers.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)} 
          className="px-4 py-2.5 bg-[#8B1A1A] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#6B1010] transition-colors cursor-pointer shadow-sm"
        >
          <Plus size={16} />
          Create New Promotion
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Tag size={20} />
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded">Current</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 mb-1">Active Campaigns</div>
          <div className="text-3xl font-bold text-gray-900">{activeCount}</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">Live</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 mb-1">Total Promo Usages</div>
          <div className="text-3xl font-bold text-gray-900 tracking-tight">{totalUses}</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded">Planned</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 mb-1">Scheduled Promotions</div>
          <div className="text-3xl font-bold text-gray-900">{scheduledCount}</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-10">
        
        {/* Filters Row */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 font-semibold text-sm">
            <Filter size={18} />
            Filters:
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value)} 
                className="w-full py-2 pl-3 pr-8 border border-gray-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 text-gray-700"
              >
                <option>All Types</option>
                <option>Percentage</option>
                <option>Fixed Amount</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
            <div className="relative flex-1 sm:flex-none">
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)} 
                className="w-full py-2 pl-3 pr-8 border border-gray-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 text-gray-700"
              >
                <option>All Status</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="disabled">Disabled</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">CAMPAIGN NAME</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">TYPE & VALUE</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">VALIDITY PERIOD</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">USAGE</th>
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
                  <td colSpan={6} className="p-12 text-center text-gray-500">No promotions found in database.</td>
                </tr>
              ) : filtered.map((promo) => {
                const isFixed = (promo.type || "").toLowerCase().includes("fix");
                const valStr = isFixed ? `-$${promo.value}` : `${promo.value}%`;
                const isActive = (promo.status || "").toLowerCase() === "active";
                const dateStr = promo.valid_from && promo.valid_until 
                  ? `${new Date(promo.valid_from).toLocaleDateString()} - ${new Date(promo.valid_until).toLocaleDateString()}` 
                  : (promo.valid_until ? `Ends ${new Date(promo.valid_until).toLocaleDateString()}` : "No expiry");

                return (
                  <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-900 mb-1">{promo.name}</div>
                      <div className={`text-xs ${promo.auto_applied ? 'text-gray-500' : 'text-gray-600'}`}>
                        {promo.auto_applied ? "Auto-applied" : <>Code: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{promo.code || "N/A"}</span></>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center rounded overflow-hidden">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 uppercase">{promo.type}</span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1">{valStr}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {dateStr}
                    </td>
                    <td className="p-4 w-48">
                      {promo.usage_max ? (
                        <>
                          <div className="text-sm font-bold text-gray-900 mb-1.5 flex justify-between">
                            {promo.usage_count || 0} <span className="font-normal text-gray-400">/ {promo.usage_max}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${(promo.usage_count || 0) / promo.usage_max > 0.8 ? 'bg-red-500' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(100, ((promo.usage_count || 0) / promo.usage_max) * 100)}%` }}
                            ></div>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {(promo.usage_count || 0) === 0 ? "Not started" : `${promo.usage_count} uses`}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold capitalize">
                          <Clock size={12} /> {promo.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleDelete(promo.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                          title="Delete"
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
