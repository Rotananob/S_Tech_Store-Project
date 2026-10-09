"use client";
import React, { useState, useMemo } from "react";
import { Plus, Filter, Clock, Tag, TrendingUp, Trash2, ChevronDown } from "lucide-react";

type Promotion = {
  id: string;
  name: string;
  code: string;
  type: string;
  value: string;
  validity: string;
  usageCount: number;
  usageMax: number | null;
  status: string;
  autoApplied: boolean;
};

const INITIAL_PROMOS: Promotion[] = [
  { id: "1", name: "Khmer New Year Sale", code: "KNY2024", type: "Percentage", value: "15%", validity: "Apr 10 - Apr 16, 2024", usageCount: 450, usageMax: 1000, status: "Active", autoApplied: false },
  { id: "2", name: "Flash Deal: RTX 4090", code: "", type: "Fixed Amount", value: "-$200", validity: "Ends in 2 days", usageCount: 12, usageMax: 20, status: "Active", autoApplied: true },
  { id: "3", name: "Back to School Promo", code: "STUDENT24", type: "Percentage", value: "10%", validity: "Aug 1 - Sep 15, 2024", usageCount: 0, usageMax: null, status: "Scheduled", autoApplied: false },
];

export default function PromotionManagementPage() {
  const [promos, setPromos] = useState<Promotion[]>(INITIAL_PROMOS);
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [newPromo, setNewPromo] = useState<Partial<Promotion>>({ type: "Percentage", status: "Active", autoApplied: false });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    return promos.filter(p => {
      const matchType = typeFilter === "All Types" || p.type === typeFilter;
      const matchStatus = statusFilter === "All Status" || p.status === statusFilter;
      return matchType && matchStatus;
    });
  }, [promos, typeFilter, statusFilter]);

  const handleCreateSave = () => {
    if (!newPromo.name || !newPromo.value) {
      showToast("Name and Value are required.", "error");
      return;
    }
    const promo: Promotion = {
      id: Date.now().toString(),
      name: newPromo.name!,
      code: newPromo.code || "",
      type: newPromo.type || "Percentage",
      value: newPromo.value!,
      validity: newPromo.validity || "No expiry",
      usageCount: 0,
      usageMax: newPromo.usageMax || null,
      status: newPromo.status || "Active",
      autoApplied: newPromo.autoApplied || false,
    };
    setPromos([promo, ...promos]);
    setShowCreate(false);
    setNewPromo({ type: "Percentage", status: "Active", autoApplied: false });
    showToast("Promotion created successfully!");
  };

  const handleDelete = (id: string) => {
    setPromos(prev => prev.filter(p => p.id !== id));
    showToast("Promotion deleted.");
  };

  return (
    <div className="font-sans">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Create New Promotion</h3>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Campaign Name *</label>
                <input 
                  value={newPromo.name || ""} 
                  onChange={e => setNewPromo({ ...newPromo, name: e.target.value })} 
                  placeholder="e.g. Summer Sale" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
                  <div className="relative">
                    <select 
                      value={newPromo.type} 
                      onChange={e => setNewPromo({ ...newPromo, type: e.target.value })} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                      <option>Percentage</option>
                      <option>Fixed Amount</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Value *</label>
                  <input 
                    value={newPromo.value || ""} 
                    onChange={e => setNewPromo({ ...newPromo, value: e.target.value })} 
                    placeholder="e.g. 15% or -$200" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Promo Code (optional)</label>
                  <input 
                    value={newPromo.code || ""} 
                    onChange={e => setNewPromo({ ...newPromo, code: e.target.value })} 
                    placeholder="e.g. SUMMER24" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Validity Period</label>
                  <input 
                    value={newPromo.validity || ""} 
                    onChange={e => setNewPromo({ ...newPromo, validity: e.target.value })} 
                    placeholder="e.g. Jun 1 - Jun 30" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                  <div className="relative">
                    <select 
                      value={newPromo.status} 
                      onChange={e => setNewPromo({ ...newPromo, status: e.target.value })} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                      <option>Active</option>
                      <option>Scheduled</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Uses (optional)</label>
                  <input 
                    type="number" 
                    value={newPromo.usageMax || ""} 
                    onChange={e => setNewPromo({ ...newPromo, usageMax: parseInt(e.target.value) || null })} 
                    placeholder="Unlimited" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newPromo.autoApplied} 
                    onChange={e => setNewPromo({ ...newPromo, autoApplied: e.target.checked })} 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                  Auto-apply without code
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
              <button 
                onClick={() => setShowCreate(false)} 
                className="flex-1 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateSave} 
                className="flex-1 py-2.5 border-none rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Create Promotion
              </button>
            </div>
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
          className="px-4 py-2 bg-[#8B1A1A] text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-[#6B1010] transition-colors"
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
          <div className="text-3xl font-bold text-gray-900">{promos.filter(p => p.status === "Active").length}</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">+12%</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 mb-1">Total Discounts Given</div>
          <div className="text-3xl font-bold text-gray-900 tracking-tight">$1,250</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded">Urgent</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 mb-1">Expiring Soon</div>
          <div className="text-3xl font-bold text-gray-900">2</div>
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
                <option>Active</option>
                <option>Scheduled</option>
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">No promotions found.</td>
                </tr>
              ) : filtered.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="text-sm font-bold text-gray-900 mb-1">{promo.name}</div>
                    <div className={`text-xs ${promo.autoApplied ? 'text-gray-500' : 'text-gray-600'}`}>
                      {promo.autoApplied ? "Auto-applied" : <>Code: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{promo.code}</span></>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="inline-flex items-center rounded overflow-hidden">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1">{promo.type}</span>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1">{promo.value}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {promo.validity}
                  </td>
                  <td className="p-4 w-48">
                    {promo.usageMax ? (
                      <>
                        <div className="text-sm font-bold text-gray-900 mb-1.5 flex justify-between">
                          {promo.usageCount} <span className="font-normal text-gray-400">/ {promo.usageMax}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${promo.usageCount / promo.usageMax > 0.8 ? 'bg-red-500' : 'bg-blue-600'}`}
                            style={{ width: `${(promo.usageCount / promo.usageMax) * 100}%` }}
                          ></div>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {promo.usageCount === 0 ? "Not started" : `${promo.usageCount} uses`}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {promo.status === "Active" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                        <Clock size={12} /> Scheduled
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleDelete(promo.id)} 
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
