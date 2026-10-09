"use client";
import React, { useState, useEffect, useMemo } from "react";
import { getRecentOrders, updateOrderStatus, Order } from "@/lib/services/admin.service";
import { Download, Plus, Search, ChevronDown, Eye, Edit2 } from "lucide-react";

const STATUSES = ["All Statuses", "Processing", "Completed", "Pending", "Cancelled"];
const ITEMS_PER_PAGE = 5;

const getStatusStyle = (status: string) => {
  const s = status.toLowerCase();
  if (s === "processing" || s === "pending") return "bg-blue-100 text-blue-700";
  if (s === "completed" || s === "delivered") return "bg-green-100 text-green-700";
  if (s === "cancelled") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 3000); 
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const data = await getRecentOrders(); 
      setOrders(data);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = statusFilter === "All Statuses" || o.status.toLowerCase() === statusFilter.toLowerCase();
      const matchSearch = !searchQuery || 
        o.order_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleClear = () => { setSearchQuery(""); setStatusFilter("All Statuses"); setCurrentPage(1); };

  const handleEditSave = async () => {
    if (!editOrder) return;
    const success = await updateOrderStatus(editOrder.id, editStatus.toLowerCase());
    
    if (success) {
      setOrders(prev => prev.map(o => o.id === editOrder.id ? { ...o, status: editStatus.toLowerCase() } : o));
      setEditOrder(null);
      showToast("Order status updated!");
    } else {
      setEditOrder(null);
      showToast("Failed to update order status.", "error");
    }
  };

  const handleExportCSV = () => {
    const rows = [["Order ID", "Customer", "Phone", "Date", "Payment", "USD", "Status"]];
    orders.forEach(o => rows.push([o.order_id, o.customer_name, o.customer_phone || "N/A", new Date(o.created_at).toLocaleString(), o.payment_method || "N/A", `$${o.total_amount}`, o.status]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "orders.csv"; a.click();
    showToast("CSV exported successfully!");
  };

  const formatDisplayDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      };
    } catch {
      return { date: "N/A", time: "N/A" };
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      {/* View Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6">Order Details — {viewOrder.order_id}</h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                ["Customer", viewOrder.customer_name], 
                ["Phone", viewOrder.customer_phone || "N/A"], 
                ["Date", new Date(viewOrder.created_at).toLocaleString()], 
                ["Payment", viewOrder.payment_method || "N/A"], 
                ["Total (USD)", `$${Number(viewOrder.total_amount).toFixed(2)}`], 
                ["Address", viewOrder.shipping_address || "N/A"]
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{k}</div>
                  <div className="text-sm font-medium text-gray-900">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">STATUS</div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(viewOrder.status)}`}>
                {capitalize(viewOrder.status)}
              </span>
            </div>
            <button 
              onClick={() => setViewOrder(null)} 
              className="mt-8 w-full py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Update Status</h3>
            <p className="text-gray-500 text-sm mb-6">Order: <strong>{editOrder.order_id}</strong> — {editOrder.customer_name}</p>
            
            <label className="text-sm font-semibold text-gray-700 mb-2 block">New Status</label>
            <div className="relative mb-6">
              <select 
                value={editStatus} 
                onChange={e => setEditStatus(e.target.value)} 
                className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                {STATUSES.filter(s => s !== "All Statuses").map(s => (
                  <option key={s} value={s.toLowerCase()}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setEditOrder(null)} 
                className="flex-1 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditSave} 
                className="flex-1 py-2.5 border-none rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
          <p className="text-gray-500 text-sm">Manage and process customer orders, track shipments, and handle returns.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleExportCSV} 
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button 
            onClick={() => showToast("Create Order form coming soon!")} 
            className="px-4 py-2 bg-[#8B1A1A] text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-[#6B1010] transition-colors"
          >
            <Plus size={16} />
            Create Order
          </button>
        </div>
      </div>

      {/* Filters Box */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full md:w-auto">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Search Orders</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
              placeholder="Order ID or Customer Name" 
              className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
            />
          </div>
        </div>
        
        <div className="w-full md:w-64">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Status Filter</label>
          <div className="relative">
            <select 
              value={statusFilter} 
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} 
              className="w-full py-2.5 pl-4 pr-10 border border-gray-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            >
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleClear} 
            className="flex-1 md:flex-none px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
          <button 
            onClick={() => setCurrentPage(1)} 
            className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse">Loading orders...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="p-4 w-12"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" /></th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ORDER ID</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CUSTOMER</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">DATE</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">PAYMENT</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">TOTAL</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">STATUS</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-500">No orders match your search.</td>
                    </tr>
                  ) : paginated.map((order) => {
                    const { date, time } = formatDisplayDate(order.created_at);
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" /></td>
                        <td className="p-4 text-sm font-bold text-gray-900">{order.order_id}</td>
                        <td className="p-4">
                          <div className="text-sm font-semibold text-gray-900 mb-0.5">{order.customer_name}</div>
                          <div className="text-xs text-gray-500">{order.customer_phone || "N/A"}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-700 mb-0.5">{date}</div>
                          <div className="text-xs text-gray-500">{time}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                            {order.payment_method || "N/A"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-sm font-bold text-gray-900 mb-0.5">
                            ${Number(order.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            ~ {(Number(order.total_amount) * 4100).toLocaleString()} KHR
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(order.status)}`}>
                            {capitalize(order.status)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setViewOrder(order)} 
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" 
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => { setEditOrder(order); setEditStatus(order.status); }} 
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors" 
                              title="Edit Status"
                            >
                              <Edit2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 gap-4">
              <div className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-900">{filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-semibold text-gray-900">{filtered.length}</span> entries
              </div>
              <div className="flex gap-1.5">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)} 
                  className={`px-3 py-1.5 border rounded-md text-sm font-medium transition-colors ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'}`}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button 
                    key={p} 
                    onClick={() => setCurrentPage(p)} 
                    className={`px-3 py-1.5 border rounded-md text-sm font-medium transition-colors ${p === currentPage ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                ))}
                <button 
                  disabled={currentPage === totalPages || totalPages === 0} 
                  onClick={() => setCurrentPage(p => p + 1)} 
                  className={`px-3 py-1.5 border rounded-md text-sm font-medium transition-colors ${currentPage === totalPages || totalPages === 0 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'}`}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
