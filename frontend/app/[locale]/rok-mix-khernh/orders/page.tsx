"use client";
import React, { useState, useEffect, useMemo } from "react";
import { getRecentOrders, updateOrderStatus, pushOrderNotification, Order } from "@/lib/services/admin.service";
import { Download, Plus, Search, ChevronDown, Eye, Edit2, Bell, Send, CheckCircle2 } from "lucide-react";

const STATUSES = ["All Statuses", "Processing", "Completed", "Pending", "Cancelled"];
const ITEMS_PER_PAGE = 5;

const NOTIF_TEMPLATES = [
  {
    id: "confirmed",
    name: "📦 បញ្ជាក់ការបញ្ជាទិញ (Confirmed)",
    title: "📦 ការបញ្ជាទិញត្រូវបានបញ្ជាក់ (Order Confirmed)",
    status: "processing",
    message: (orderId: string) => `ការបញ្ជាទិញ #${orderId} របស់អ្នកត្រូវបានបញ្ជាក់ដោយជោគជ័យ! បុគ្គលិកកំពុងរៀបចំវេចខ្ចប់ទំនិញជូនលោកអ្នក។`,
  },
  {
    id: "shipping",
    name: "🚚 កំពុងដឹកជញ្ជូន (Out for Delivery)",
    title: "🚚 ទំនិញកំពុងដឹកជញ្ជូន (Out for Delivery)",
    status: "shipped",
    message: (orderId: string) => `ទំនិញ #${orderId} របស់អ្នកកំពុងធ្វើដំណើរលើផ្លូវដឹកជញ្ជូន។ សូមត្រៀមទទួលការទូរស័ព្ទពីអ្នកដឹកជញ្ជូន!`,
  },
  {
    id: "delivered",
    name: "✅ ដឹកជញ្ជូនដល់ជោគជ័យ (Delivered)",
    title: "✅ ទំនិញបានដឹកជញ្ជូនដល់ជោគជ័យ (Delivered)",
    status: "delivered",
    message: (orderId: string) => `ការបញ្ជាទិញ #${orderId} ត្រូវបានប្រគល់ជូនដោយជោគជ័យ។ សូមអរគុណសម្រាប់ការគាំទ្រ S Tech Store!`,
  },
  {
    id: "delay",
    name: "⚠️ ពន្យារពេល / ដំណឹងបន្ទាន់ (Notice)",
    title: "⚠️ ព័ត៌មានបន្ថែមទាក់ទងនឹងការបញ្ជាទិញ",
    status: "",
    message: (orderId: string) => `ជំរាបសួរ! ក្រុមការងារ S Tech Store សូមជម្រាបជូនអំពីការបញ្ជាទិញ #${orderId} របស់អ្នកថា...`,
  },
];

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

  // Push Notification state
  const [notifyOrder, setNotifyOrder] = useState<Order | null>(null);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatusSync, setNotifyStatusSync] = useState("");
  const [sendingNotify, setSendingNotify] = useState(false);

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

  const openPushModal = (order: Order) => {
    setNotifyOrder(order);
    setNotifyTitle(`📦 បច្ចុប្បន្នភាពការបញ្ជាទិញ #${order.order_id}`);
    setNotifyMessage(`ការបញ្ជាទិញ #${order.order_id} របស់អ្នកត្រូវបានបញ្ជាក់រួចរាល់ហើយ! បុគ្គលិកកំពុងរៀបចំវេចខ្ចប់ទំនិញជូនលោកអ្នក។`);
    setNotifyStatusSync(order.status);
  };

  const handleSendNotification = async () => {
    if (!notifyOrder || !notifyMessage.trim()) return;
    setSendingNotify(true);
    const res = await pushOrderNotification(notifyOrder.id, {
      title: notifyTitle.trim() || undefined,
      message: notifyMessage.trim(),
      status: notifyStatusSync || undefined,
    });
    setSendingNotify(false);
    if (res.success) {
      showToast(res.message || "Notification sent to customer!");
      if (notifyStatusSync && notifyStatusSync !== notifyOrder.status) {
        setOrders(prev => prev.map(o => o.id === notifyOrder.id ? { ...o, status: notifyStatusSync } : o));
      }
      setNotifyOrder(null);
    } else {
      showToast(res.message || "Failed to send notification", "error");
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
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setViewOrder(null)} 
                className="flex-1 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer text-sm"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  const target = viewOrder;
                  setViewOrder(null);
                  openPushModal(target);
                }} 
                className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Bell size={16} />
                <span>Notify Customer</span>
              </button>
            </div>
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

      {/* Push Notification to Customer Modal */}
      {notifyOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-5 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bell size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">Push Notification to Customer</h3>
                  <p className="text-xs text-purple-200">Order: {notifyOrder.order_id} • {notifyOrder.customer_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setNotifyOrder(null)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Customer Info Card */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-purple-950">{notifyOrder.customer_name}</div>
                  <div className="text-purple-700 font-mono">{notifyOrder.customer_phone || "No phone"}</div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusStyle(notifyOrder.status)}`}>
                    {capitalize(notifyOrder.status)}
                  </span>
                  <div className="text-[11px] font-bold text-gray-700 mt-1">${Number(notifyOrder.total_amount).toFixed(2)}</div>
                </div>
              </div>

              {/* Quick Template Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  ជ្រើសរើសគំរូសាររហ័ស (Quick Templates)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {NOTIF_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => {
                        setNotifyTitle(tmpl.title);
                        setNotifyMessage(tmpl.message(notifyOrder.order_id));
                        if (tmpl.status) setNotifyStatusSync(tmpl.status);
                      }}
                      className="text-left p-2.5 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50/40 transition-all text-xs cursor-pointer group"
                    >
                      <div className="font-bold text-gray-800 group-hover:text-purple-700">{tmpl.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate">{tmpl.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ចំណងជើងជូនដំណឹង (Notification Title) *
                </label>
                <input
                  type="text"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  placeholder="e.g. 📦 ការបញ្ជាទិញត្រូវបានបញ្ជាក់"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
              </div>

              {/* Message textarea */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ខ្លឹមសារជូនដំណឹង (Notification Message) *
                </label>
                <textarea
                  rows={3}
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  placeholder="សរសេរខ្លឹមសារជូនដំណឹងទៅកាន់អតិថិជន..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 resize-none"
                />
              </div>

              {/* Sync status option */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ប្តូរ Status នៃការបញ្ជាទិញជាមួយគ្នា (Optional Status Sync)
                </label>
                <div className="relative">
                  <select
                    value={notifyStatusSync}
                    onChange={(e) => setNotifyStatusSync(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
                  >
                    <option value="">Keep current status ({notifyOrder.status})</option>
                    {STATUSES.filter((s) => s !== "All Statuses").map((s) => (
                      <option key={s} value={s.toLowerCase()}>Set to {s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={() => setNotifyOrder(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-100 transition-colors cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNotification}
                disabled={sendingNotify || !notifyMessage.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {sendingNotify ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Notification</span>
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
                              onClick={() => openPushModal(order)} 
                              className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors cursor-pointer" 
                              title="Push Notification to Customer"
                            >
                              <Bell size={18} />
                            </button>
                            <button 
                              onClick={() => setViewOrder(order)} 
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer" 
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => { setEditOrder(order); setEditStatus(order.status); }} 
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer" 
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
