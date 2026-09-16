"use client";
import React, { useState, useMemo } from "react";
import { Search, Plus, Eye, Edit2, ChevronDown, User } from "lucide-react";

type Ticket = {
  id: string;
  customer: string;
  phone: string;
  device: string;
  issue: string;
  dateIn: string;
  estCost: number;
  status: string;
  technician: string;
};

const INITIAL_REPAIRS: Ticket[] = [
  { id: "#REP-1024", customer: "Chantha Ros", phone: "012 345 678", device: 'MacBook Pro 14"', issue: "Screen replacement", dateIn: "Oct 24, 2023", estCost: 450, status: "In Progress", technician: "Bora" },
  { id: "#REP-1023", customer: "Sovannarith K.", phone: "098 765 432", device: "ASUS ROG Zephyrus", issue: "Fan noise / Overheating", dateIn: "Oct 23, 2023", estCost: 85, status: "Pending Assessment", technician: "Unassigned" },
  { id: "#REP-1022", customer: "Lina Mey", phone: "087 654 321", device: "iPhone 13 Pro", issue: "Battery replacement", dateIn: "Oct 22, 2023", estCost: 65, status: "Ready", technician: "Sokha" },
  { id: "#REP-1021", customer: "Pheakdey S.", phone: "011 223 344", device: "Dell XPS 13", issue: "Keyboard not working", dateIn: "Oct 21, 2023", estCost: 120, status: "Completed", technician: "Bora" },
  { id: "#REP-1020", customer: "Sreyneth H.", phone: "099 887 766", device: "iPad Air 5", issue: "Water damage", dateIn: "Oct 20, 2023", estCost: 0, status: "Pending Assessment", technician: "Unassigned" },
];

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
  const [repairs, setRepairs] = useState<Ticket[]>(INITIAL_REPAIRS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [editForm, setEditForm] = useState<Ticket | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    return repairs.filter(r => {
      const matchStatus = statusFilter === "All Statuses" || r.status === statusFilter;
      const matchSearch = !searchQuery || r.id.toLowerCase().includes(searchQuery.toLowerCase()) || r.customer.toLowerCase().includes(searchQuery.toLowerCase()) || r.device.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [repairs, statusFilter, searchQuery]);

  const handleEditSave = () => {
    if (!editForm) return;
    setRepairs(prev => prev.map(r => r.id === editForm.id ? editForm : r));
    setEditTicket(null);
    setEditForm(null);
    showToast("Repair ticket updated!");
  };

  return (
    <div className="font-sans">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      {/* View Modal */}
      {viewTicket && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Ticket Details — {viewTicket.id}</h3>
            
            <div className="grid grid-cols-2 gap-6">
              {[
                ["Customer", viewTicket.customer], 
                ["Phone", viewTicket.phone], 
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
            
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">STATUS</div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(viewTicket.status)}`}>
                {viewTicket.status}
              </span>
            </div>
            
            <button 
              onClick={() => setViewTicket(null)} 
              className="mt-8 w-full py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTicket && editForm && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Update Ticket {editForm.id}</h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <div className="relative">
                  <select 
                    value={editForm.status} 
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estimated Cost ($)</label>
                <input 
                  type="number" 
                  value={editForm.estCost} 
                  onChange={e => setEditForm({ ...editForm, estCost: parseFloat(e.target.value) || 0 })} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
              <button 
                onClick={() => { setEditTicket(null); setEditForm(null); }} 
                className="flex-1 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditSave} 
                className="flex-1 py-2.5 border-none rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Save
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
          onClick={() => showToast("New ticket form coming soon!")} 
          className="px-4 py-2 bg-[#8B1A1A] text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-[#6B1010] transition-colors"
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">No repair tickets found.</td>
                </tr>
              ) : filtered.map((ticket) => {
                return (
                  <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-bold text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                        {ticket.id}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-900 mb-0.5">{ticket.customer}</div>
                      <div className="text-xs text-gray-500">{ticket.phone}</div>
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
                          onClick={() => setViewTicket(ticket)} 
                          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" 
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditTicket(ticket); setEditForm(ticket); }} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Update Ticket"
                        >
                          <Edit2 size={16} />
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
