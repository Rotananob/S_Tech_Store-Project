"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  getRecentOrders,
  updateOrder,
  pushOrderNotification,
  Order,
} from "@/lib/services/admin.service";
import {
  Download,
  Search,
  ChevronDown,
  Eye,
  Edit2,
  Bell,
  Send,
  CheckCircle2,
  Mail,
  Phone,
  User,
  Truck,
  CreditCard,
  MapPin,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
  Save,
  Globe,
} from "lucide-react";

const STATUSES = ["All Statuses", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const ITEMS_PER_PAGE = 8;

const NOTIF_TEMPLATES = [
  {
    id: "confirmed",
    name: "📦 បញ្ជាក់ការបញ្ជាទិញ (Confirmed)",
    title: "📦 ការបញ្ជាទិញត្រូវបានបញ្ជាក់ (Order Confirmed)",
    status: "processing",
    message: (orderId: string) =>
      `ការបញ្ជាទិញ #${orderId} របស់អ្នកត្រូវបានបញ្ជាក់ដោយជោគជ័យ! បុគ្គលិកកំពុងរៀបចំវេចខ្ចប់ទំនិញជូនលោកអ្នក។`,
  },
  {
    id: "shipping",
    name: "🚚 កំពុងដឹកជញ្ជូន (Out for Delivery)",
    title: "🚚 ទំនិញកំពុងដឹកជញ្ជូន (Out for Delivery)",
    status: "shipped",
    message: (orderId: string, tracking?: string) =>
      `ទំនិញ #${orderId} របស់អ្នកកំពុងធ្វើដំណើរលើផ្លូវដឹកជញ្ជូន${
        tracking ? ` [កូដបញ្ញើ: ${tracking}]` : ""
      }។ សូមត្រៀមទទួលការទូរស័ព្ទពីអ្នកដឹកជញ្ជូន!`,
  },
  {
    id: "delivered",
    name: "✅ ដឹកជញ្ជូនដល់ជោគជ័យ (Delivered)",
    title: "✅ ទំនិញបានដឹកជញ្ជូនដល់ជោគជ័យ (Delivered)",
    status: "delivered",
    message: (orderId: string) =>
      `ការបញ្ជាទិញ #${orderId} ត្រូវបានប្រគល់ជូនដោយជោគជ័យ។ សូមអរគុណសម្រាប់ការគាំទ្រ S Tech Store!`,
  },
  {
    id: "paid",
    name: "💳 ផ្ទៀងផ្ទាត់ការបង់ប្រាក់ (Payment Verified)",
    title: "💳 ការទូទាត់ប្រាក់ទទួលបានជោគជ័យ",
    status: "processing",
    message: (orderId: string) =>
      `ការទូទាត់ប្រាក់សម្រាប់ការបញ្ជាទិញ #${orderId} ត្រូវបានផ្ទៀងផ្ទាត់ដោយជោគជ័យ។ ហាងកំពុងដំណើរការកញ្ចប់ទំនិញជូនអ្នក!`,
  },
  {
    id: "delay",
    name: "⚠️ ដំណឹងបន្ទាន់ / ពន្យារពេល (Notice)",
    title: "⚠️ ព័ត៌មានបន្ថែមទាក់ទងនឹងការបញ្ជាទិញ",
    status: "",
    message: (orderId: string) =>
      `ជំរាបសួរ! ក្រុមការងារ S Tech Store សូមជម្រាបជូនដំណឹងបន្ថែមអំពីការបញ្ជាទិញ #${orderId} របស់អ្នក...`,
  },
];

const getStatusStyle = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "processing" || s === "pending") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "shipped") return "bg-purple-50 text-purple-700 border-purple-200";
  if (s === "completed" || s === "delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "cancelled") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
};

const getPaymentStatusStyle = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "failed") return "bg-rose-50 text-rose-700 border-rose-200";
  if (s === "refunded") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [channelFilter, setChannelFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Edit Modal Form State
  const [editForm, setEditForm] = useState({
    status: "pending",
    payment_status: "pending",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    shipping_address: "",
    delivery_type: "pnompenh",
    payment_method: "cod",
    total_amount: "0",
    tracking_number: "",
    admin_notes: "",
    notify_customer: true,
    send_email: true,
    send_telegram: true,
    send_web: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Push Notification state
  const [notifyOrder, setNotifyOrder] = useState<Order | null>(null);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatusSync, setNotifyStatusSync] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyTelegram, setNotifyTelegram] = useState(true);
  const [notifyWeb, setNotifyWeb] = useState(true);
  const [notifyCustomEmail, setNotifyCustomEmail] = useState("");
  const [sendingNotify, setSendingNotify] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getRecentOrders();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus =
        statusFilter === "All Statuses" ||
        o.status.toLowerCase() === statusFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.order_id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_phone && o.customer_phone.toLowerCase().includes(q)) ||
        (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
        (o.customer_account?.email && o.customer_account.email.toLowerCase().includes(q)) ||
        (o.customer_account?.username && o.customer_account.username.toLowerCase().includes(q)) ||
        (o.tracking_number && o.tracking_number.toLowerCase().includes(q));

      const hasTg = Boolean(
        o.customer_account?.has_telegram || (o.user_id && o.user_id.startsWith("tg_"))
      );
      const matchChannel =
        channelFilter === "all" ||
        (channelFilter === "telegram" && hasTg) ||
        (channelFilter === "web_only" && !hasTg);

      return matchStatus && matchSearch && matchChannel;
    });
  }, [orders, statusFilter, searchQuery, channelFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleClear = () => {
    setSearchQuery("");
    setStatusFilter("All Statuses");
    setChannelFilter("all");
    setCurrentPage(1);
  };

  // Open Full Edit Modal
  const openEditModal = (order: Order) => {
    const email = order.customer_email || order.customer_account?.email || "";
    const hasTg = Boolean(
      order.customer_account?.has_telegram || (order.user_id && order.user_id.startsWith("tg_"))
    );
    setEditOrder(order);
    setEditForm({
      status: order.status || "pending",
      payment_status: order.payment_status || "pending",
      customer_name: order.customer_name || "",
      customer_phone: order.customer_phone || "",
      customer_email: email,
      shipping_address: order.shipping_address || "",
      delivery_type: order.delivery_type || "pnompenh",
      payment_method: order.payment_method || "cod",
      total_amount: String(order.total_amount || 0),
      tracking_number: order.tracking_number || "",
      admin_notes: order.admin_notes || "",
      notify_customer: true,
      send_email: Boolean(email),
      send_telegram: hasTg,
      send_web: true,
    });
  };

  // Save Full Edit
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrder) return;

    setSavingEdit(true);
    const res = await updateOrder(editOrder.id, {
      status: editForm.status,
      payment_status: editForm.payment_status,
      customer_name: editForm.customer_name.trim(),
      customer_phone: editForm.customer_phone.trim(),
      customer_email: editForm.customer_email.trim() || undefined,
      shipping_address: editForm.shipping_address.trim(),
      delivery_type: editForm.delivery_type,
      payment_method: editForm.payment_method,
      total_amount: parseFloat(editForm.total_amount) || editOrder.total_amount,
      tracking_number: editForm.tracking_number.trim() || undefined,
      admin_notes: editForm.admin_notes.trim() || undefined,
      notify_customer: editForm.notify_customer,
      send_email: editForm.send_email,
      send_telegram: editForm.send_telegram,
      send_web: editForm.send_web,
    });
    setSavingEdit(false);

    if (res.success) {
      showToast(res.message || "បានធ្វើបច្ចុប្បន្នភាពការបញ្ជាទិញជោគជ័យ!");
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editOrder.id
            ? {
                ...o,
                status: editForm.status,
                payment_status: editForm.payment_status,
                customer_name: editForm.customer_name.trim(),
                customer_phone: editForm.customer_phone.trim(),
                customer_email: editForm.customer_email.trim() || o.customer_email,
                shipping_address: editForm.shipping_address.trim(),
                delivery_type: editForm.delivery_type,
                payment_method: editForm.payment_method,
                total_amount: parseFloat(editForm.total_amount) || o.total_amount,
                tracking_number: editForm.tracking_number.trim() || o.tracking_number,
                admin_notes: editForm.admin_notes.trim() || o.admin_notes,
              }
            : o
        )
      );
      setEditOrder(null);
    } else {
      showToast(res.message || "Failed to update order", "error");
    }
  };

  // Push Notification Modal
  const openPushModal = (order: Order) => {
    setNotifyOrder(order);
    setNotifyTitle(`📦 បច្ចុប្បន្នភាពការបញ្ជាទិញ #${order.order_id}`);
    setNotifyMessage(
      `ការបញ្ជាទិញ #${order.order_id} របស់អ្នកត្រូវបានបញ្ជាក់រួចរាល់ហើយ! បុគ្គលិកកំពុងរៀបចំវេចខ្ចប់ទំនិញជូនលោកអ្នក។`
    );
    setNotifyStatusSync(order.status);
    const email = order.customer_email || order.customer_account?.email || "";
    const hasTg = Boolean(
      order.customer_account?.has_telegram || (order.user_id && order.user_id.startsWith("tg_"))
    );
    setNotifyCustomEmail(email);
    setNotifyEmail(Boolean(email));
    setNotifyTelegram(hasTg);
    setNotifyWeb(true);
  };

  const handleSendNotification = async () => {
    if (!notifyOrder || !notifyMessage.trim()) return;
    if (!notifyEmail && !notifyTelegram && !notifyWeb) {
      showToast("សូមជ្រើសរើសយ៉ាងហោចណាស់ Channel មួយ (Email, Telegram, ឬ Website Account)", "error");
      return;
    }
    setSendingNotify(true);
    const res = await pushOrderNotification(notifyOrder.id, {
      title: notifyTitle.trim() || undefined,
      message: notifyMessage.trim(),
      status: notifyStatusSync || undefined,
      send_email: notifyEmail,
      send_telegram: notifyTelegram,
      send_web: notifyWeb,
      email: notifyCustomEmail.trim() || undefined,
    });
    setSendingNotify(false);

    if (res.success) {
      showToast(res.message || "បានផ្ញើការជូនដំណឹងជោគជ័យ!");
      if (notifyStatusSync && notifyStatusSync !== notifyOrder.status) {
        setOrders((prev) =>
          prev.map((o) => (o.id === notifyOrder.id ? { ...o, status: notifyStatusSync } : o))
        );
      }
      setNotifyOrder(null);
    } else {
      showToast(res.message || "Failed to send notification", "error");
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ["Order ID", "Customer Name", "Email", "Phone", "Telegram", "Date", "Payment", "Total (USD)", "Status"],
    ];
    orders.forEach((o) =>
      rows.push([
        o.order_id,
        `"${o.customer_name}"`,
        `"${o.customer_email || o.customer_account?.email || "N/A"}"`,
        `"${o.customer_phone || "N/A"}"`,
        `"${o.customer_account?.has_telegram ? (o.customer_account?.username || "Connected") : "No"}"`,
        new Date(o.created_at).toLocaleString(),
        `"${o.payment_method || "N/A"}"`,
        `$${Number(o.total_amount).toFixed(2)}`,
        o.status,
      ])
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stech-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("បានទាញយកឯកសារ CSV ជោគជ័យ!");
  };

  const formatDisplayDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
    } catch {
      return { date: "N/A", time: "N/A" };
    }
  };

  const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  return (
    <div className="font-sans space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-2xl font-medium text-sm text-white flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── View Order Details Modal ─── */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-rose-400 font-bold">
                  ORD
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-tight flex items-center gap-2">
                    <span>{viewOrder.order_id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusStyle(
                        viewOrder.status
                      )}`}
                    >
                      {capitalize(viewOrder.status)}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-300">
                    កាលបរិច្ឆេទ: {new Date(viewOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Linked Customer Account Profile Card */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-purple-600" />
                    <span>គណនីអតិថិជនពិត (Real User Account)</span>
                  </div>
                  {viewOrder.customer_account?.has_telegram ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                      <Send size={11} className="text-sky-600" />
                      Telegram Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      Web Account Only
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-200 shrink-0 border-2 border-white shadow-xs">
                    {viewOrder.customer_account?.photo_url ? (
                      <img
                        src={viewOrder.customer_account.photo_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-800 font-bold text-base">
                        {(viewOrder.customer_name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-950 flex items-center gap-2">
                      <span>{viewOrder.customer_account?.display_name || viewOrder.customer_name}</span>
                      {viewOrder.customer_account?.username && (
                        <span className="text-xs font-medium text-purple-600">
                          {viewOrder.customer_account.username}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Mail size={12} className="text-gray-400" />
                        {viewOrder.customer_email || viewOrder.customer_account?.email || "No email"}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Phone size={12} className="text-gray-400" />
                        {viewOrder.customer_phone || "No phone"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    វិធីសាស្ត្រទូទាត់
                  </div>
                  <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-gray-500" />
                    <span>{viewOrder.payment_method?.toUpperCase() || "COD"}</span>
                  </div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getPaymentStatusStyle(
                      viewOrder.payment_status
                    )}`}
                  >
                    {capitalize(viewOrder.payment_status || "Pending")}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    សរុបទឹកប្រាក់ (TOTAL)
                  </div>
                  <div className="text-base font-bold text-rose-700">
                    ${Number(viewOrder.total_amount).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    ~ {(Number(viewOrder.total_amount) * 4100).toLocaleString()} KHR
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    ការដឹកជញ្ជូន & កូដបញ្ញើ
                  </div>
                  <div className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                    <Truck size={13} className="text-gray-500" />
                    <span>{viewOrder.delivery_type === "province" ? "ខេត្ត-ក្រុង" : "ភ្នំពេញ"}</span>
                  </div>
                  {viewOrder.tracking_number ? (
                    <div className="text-[11px] font-mono text-purple-700 font-bold mt-1 truncate">
                      {viewOrder.tracking_number}
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400 mt-1">មិនទាន់មានកូដបញ្ញើ</div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <MapPin size={13} className="text-gray-500" />
                  <span>អាសយដ្ឋានដឹកជញ្ជូន (Shipping Address)</span>
                </div>
                <div className="text-xs text-gray-800 font-medium">
                  {viewOrder.shipping_address || "N/A"}
                </div>
              </div>

              {/* Admin Internal Notes */}
              {viewOrder.admin_notes && (
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText size={13} className="text-amber-600" />
                    <span>កំណត់សម្គាល់ខាងក្នុង (Admin Memo)</span>
                  </div>
                  <div className="text-xs text-amber-950 font-medium">
                    {viewOrder.admin_notes}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-100 transition-colors cursor-pointer text-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewOrder;
                  setViewOrder(null);
                  openEditModal(target);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Edit2 size={15} />
                <span>Edit Order</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewOrder;
                  setViewOrder(null);
                  openPushModal(target);
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm shadow-sm"
              >
                <Bell size={15} />
                <span>Notify Customer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full Edit Order Modal (កែប្រែការបញ្ជាទិញ) ─── */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    កែប្រែការបញ្ជាទិញ (Edit Order #{editOrder.order_id})
                  </h3>
                  <p className="text-xs text-blue-200">
                    អតិថិជន: {editOrder.customer_name} • ${Number(editOrder.total_amount).toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditOrder(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ស្ថានភាព Order (Status)
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                    >
                      {STATUSES.filter((s) => s !== "All Statuses").map((s) => (
                        <option key={s} value={s.toLowerCase()}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ស្ថានភាពបង់ប្រាក់ (Payment Status)
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.payment_status}
                      onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                    >
                      <option value="pending">⏳ Pending (រង់ចាំទូទាត់)</option>
                      <option value="paid">✅ Paid (បង់ប្រាក់រួច)</option>
                      <option value="failed">❌ Failed (បរាជ័យ)</option>
                      <option value="refunded">🔄 Refunded (បានសងប្រាក់វិញ)</option>
                    </select>
                    <ChevronDown
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ឈ្មោះអតិថិជន (Customer Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    លេខទូរស័ព្ទ (Phone Number) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.customer_phone}
                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Real Email & Total Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Email ពិតរបស់អតិថិជន (Real Email)
                  </label>
                  <input
                    type="email"
                    value={editForm.customer_email}
                    onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                    placeholder="user@gmail.com"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    តម្លៃសរុប Total Amount ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.total_amount}
                    onChange={(e) => setEditForm({ ...editForm, total_amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold text-gray-900"
                  />
                </div>
              </div>

              {/* Delivery Type & Tracking Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    តំបន់ដឹកជញ្ជូន (Delivery Type)
                  </label>
                  <select
                    value={editForm.delivery_type}
                    onChange={(e) => setEditForm({ ...editForm, delivery_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  >
                    <option value="pnompenh">🛵 ភ្នំពេញ (Delivery Fee: $2.00)</option>
                    <option value="province">🚚 ខេត្ត-ក្រុង (Delivery Fee: $3.00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    កូដតាមដានបញ្ញើ (Tracking Number)
                  </label>
                  <input
                    type="text"
                    value={editForm.tracking_number}
                    onChange={(e) => setEditForm({ ...editForm, tracking_number: e.target.value })}
                    placeholder="e.g. VET-883921 / J&T-99214"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  អាសយដ្ឋានដឹកជញ្ជូន (Shipping Address) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editForm.shipping_address}
                  onChange={(e) => setEditForm({ ...editForm, shipping_address: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
                />
              </div>

              {/* Internal Admin Memo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  កំណត់សម្គាល់ផ្ទៃក្នុង Admin (Internal Notes)
                </label>
                <textarea
                  rows={2}
                  value={editForm.admin_notes}
                  onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                  placeholder="ចំណាំផ្ទៃក្នុងរបស់ហាង..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none text-xs"
                />
              </div>

              {/* Auto Notify Multi-Channel Section */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-purple-600" />
                    <div>
                      <div className="text-xs font-bold text-purple-900">
                        ផ្ញើការជូនដំណឹងស្វ័យប្រវត្តិ (Notify Customer on Save)
                      </div>
                      <div className="text-[11px] text-purple-700">
                        ជ្រើសរើស Channel ដែលត្រូវផ្ញើដំណឹងពេលរក្សាទុក
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editForm.notify_customer}
                    onChange={(e) => setEditForm({ ...editForm, notify_customer: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                </div>

                {editForm.notify_customer && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-200/60">
                    <label className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${editForm.send_email ? 'bg-white border-rose-400 text-rose-950 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <input
                        type="checkbox"
                        checked={editForm.send_email}
                        onChange={(e) => setEditForm({ ...editForm, send_email: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-rose-600 cursor-pointer"
                      />
                      <Mail size={13} className="text-rose-600 shrink-0" />
                      <span className="truncate">Real Email</span>
                    </label>

                    <label className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${editForm.send_telegram ? 'bg-white border-sky-400 text-sky-950 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <input
                        type="checkbox"
                        checked={editForm.send_telegram}
                        onChange={(e) => setEditForm({ ...editForm, send_telegram: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-sky-600 cursor-pointer"
                      />
                      <Send size={13} className="text-sky-600 shrink-0" />
                      <span className="truncate">Telegram</span>
                    </label>

                    <label className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${editForm.send_web ? 'bg-white border-purple-400 text-purple-950 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <input
                        type="checkbox"
                        checked={editForm.send_web}
                        onChange={(e) => setEditForm({ ...editForm, send_web: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-purple-600 cursor-pointer"
                      />
                      <Globe size={13} className="text-purple-600 shrink-0" />
                      <span className="truncate">Account Web</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditOrder(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-100 transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                >
                  {savingEdit ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Push Notification Modal ─── */}
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
                  <p className="text-xs text-purple-200">
                    Order: {notifyOrder.order_id} • {notifyOrder.customer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotifyOrder(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Customer Account Indicator */}
              <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <User size={13} className="text-purple-700" />
                    <span>{notifyOrder.customer_account?.display_name || notifyOrder.customer_name}</span>
                    {notifyOrder.customer_account?.username && (
                      <span className="text-purple-600 font-mono text-[11px]">
                        {notifyOrder.customer_account.username}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusStyle(notifyOrder.status)}`}>
                    {capitalize(notifyOrder.status)}
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 flex items-center gap-3">
                  <span>✉️ {notifyOrder.customer_email || notifyOrder.customer_account?.email || "No email"}</span>
                  <span>📞 {notifyOrder.customer_phone || "No phone"}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-purple-200/60 flex items-center gap-2 text-[11px]">
                  {notifyOrder.customer_account?.has_telegram ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      ភ្ជាប់ Telegram រួចរាល់: សារនឹងបាញ់ទៅទាំង Web In-App និង Telegram Bot 1-on-1 Chat!
                    </span>
                  ) : (
                    <span className="text-purple-700 font-medium flex items-center gap-1">
                      <ShieldCheck size={13} className="text-purple-500" />
                      អតិថិជនមិនទាន់ភ្ជាប់ Telegram ទេ: សារនឹងផ្ញើទៅកាន់ Account Website (In-App Notification)!
                    </span>
                  )}
                </div>
              </div>

              {/* Multi-Channel Alerts Selector (Real Email, Telegram, In-App Website) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  ជ្រើសរើស Channels សម្រាប់បញ្ជូនដំណឹង (Multi-Channel Alerts) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Channel 1: Real Email */}
                  <div
                    onClick={() => setNotifyEmail(!notifyEmail)}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      notifyEmail
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
                        checked={notifyEmail}
                        onChange={(e) => {
                          e.stopPropagation();
                          setNotifyEmail(e.target.checked);
                        }}
                        className="w-4 h-4 rounded text-rose-600 cursor-pointer"
                      />
                    </div>
                    <div className="text-[11px] text-gray-700 truncate" title={notifyCustomEmail || "គ្មាន Email"}>
                      {notifyCustomEmail || "គ្មាន Email"}
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-rose-700">
                      {notifyCustomEmail ? "បាញ់ Email ពិតៗ (HTML)" : "បញ្ចូល Email ខាងក្រោម"}
                    </span>
                  </div>

                  {/* Channel 2: Telegram Bot Direct */}
                  <div
                    onClick={() => setNotifyTelegram(!notifyTelegram)}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      notifyTelegram
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
                        checked={notifyTelegram}
                        onChange={(e) => {
                          e.stopPropagation();
                          setNotifyTelegram(e.target.checked);
                        }}
                        className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                      />
                    </div>
                    <div className="text-[11px] text-gray-700 truncate">
                      {notifyOrder.customer_account?.has_telegram ? "Chat ផ្ទាល់ Connected" : "មិនទាន់ Link Telegram"}
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-sky-700">
                      {notifyOrder.customer_account?.has_telegram ? "ផ្ញើសារ 1-on-1 ស្វ័យប្រវត្តិ" : "ផ្ញើតាម Chat ID បើមាន"}
                    </span>
                  </div>

                  {/* Channel 3: Website Account In-App */}
                  <div
                    onClick={() => setNotifyWeb(!notifyWeb)}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      notifyWeb
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
                        checked={notifyWeb}
                        onChange={(e) => {
                          e.stopPropagation();
                          setNotifyWeb(e.target.checked);
                        }}
                        className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                      />
                    </div>
                    <div className="text-[11px] text-gray-700 truncate">
                      {notifyOrder.customer_account?.display_name || notifyOrder.customer_name}
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-purple-700">
                      កត់ត្រាក្នុង Notification Bell
                    </span>
                  </div>
                </div>

                {notifyEmail && (
                  <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center gap-2">
                    <Mail size={14} className="text-rose-600 shrink-0" />
                    <input
                      type="email"
                      value={notifyCustomEmail}
                      onChange={(e) => setNotifyCustomEmail(e.target.value)}
                      placeholder="ផ្ទៀងផ្ទាត់ ឬបញ្ចូលអ៊ីមែលអតិថិជន (e.g. customer@example.com)..."
                      className="w-full bg-transparent text-xs text-gray-800 outline-none font-medium placeholder:text-gray-400"
                    />
                  </div>
                )}
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
                        setNotifyMessage(tmpl.message(notifyOrder.order_id, notifyOrder.tracking_number));
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
                      <option key={s} value={s.toLowerCase()}>
                        Set to {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
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

      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <span>Order Management</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold">
              {orders.length} Orders
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            គ្រប់គ្រងការបញ្ជាទិញ, ពិនិត្យ Email/Account ពិត, កែប្រែព័ត៌មាន Order និងបាញ់ Notification ទៅកាន់ Web & Telegram
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white text-gray-700 border border-gray-300 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-blue-600" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer shadow-xs"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ─── Filter & Search Box ─── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Search */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              ស្វែងរកការបញ្ជាទិញ (Search Orders)
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Order ID, ឈ្មោះ, Email, Phone, ឬ Telegram..."
                className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              ស្ថានភាព (Status)
            </label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 pl-3.5 pr-10 border border-gray-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={16}
              />
            </div>
          </div>

          {/* Channel Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Telegram Connection
            </label>
            <div className="relative">
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 pl-3.5 pr-10 border border-gray-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white"
              >
                <option value="all">ទាំងអស់ (All Accounts)</option>
                <option value="telegram">🟢 Telegram Connected Only</option>
                <option value="web_only">🌐 Web Account Only</option>
              </select>
              <ChevronDown
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={16}
              />
            </div>
          </div>
        </div>

        {(searchQuery || statusFilter !== "All Statuses" || channelFilter !== "all") && (
          <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              រកឃើញ <strong>{filtered.length}</strong> ក្នុងចំណោម {orders.length} orders
            </span>
            <button
              onClick={handleClear}
              className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
            >
              សម្អាតការស្វែងរក (Clear Filters)
            </button>
          </div>
        )}
      </div>

      {/* ─── Orders Table ─── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3 animate-pulse">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <span className="text-sm font-medium">កំពុងទាញយកទិន្នន័យការបញ្ជាទិញ...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="p-4">ORDER ID</th>
                    <th className="p-4">អតិថិជន &amp; គណនីពិត (CUSTOMER ACCOUNT)</th>
                    <th className="p-4">កាលបរិច្ឆេទ (DATE)</th>
                    <th className="p-4">ការទូទាត់ (PAYMENT)</th>
                    <th className="p-4 text-right">តម្លៃសរុប (TOTAL)</th>
                    <th className="p-4 text-center">ស្ថានភាព (STATUS)</th>
                    <th className="p-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-16 text-center text-gray-400 text-sm">
                        មិនមានការបញ្ជាទិញស្របតាមការស្វែងរករបស់អ្នកឡើយ។
                      </td>
                    </tr>
                  ) : (
                    paginated.map((order) => {
                      const { date, time } = formatDisplayDate(order.created_at);
                      const hasTg = Boolean(
                        order.customer_account?.has_telegram ||
                          (order.user_id && order.user_id.startsWith("tg_"))
                      );
                      const displayEmail =
                        order.customer_email || order.customer_account?.email || null;

                      return (
                        <tr key={order.id} className="hover:bg-blue-50/20 transition-colors group">
                          {/* Order ID */}
                          <td className="p-4">
                            <div className="font-mono font-bold text-gray-900">{order.order_id}</div>
                            {order.tracking_number && (
                              <div className="text-[10px] text-purple-700 font-mono font-bold flex items-center gap-0.5 mt-0.5">
                                <Truck size={10} />
                                <span>{order.tracking_number}</span>
                              </div>
                            )}
                          </td>

                          {/* Customer Real Account & Telegram Badge */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 shrink-0 border border-gray-200">
                                {order.customer_account?.photo_url ? (
                                  <img
                                    src={order.customer_account.photo_url}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-purple-700 font-bold text-sm">
                                    {(order.customer_name || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="min-w-0">
                                <div className="font-bold text-gray-950 flex items-center gap-1.5 truncate">
                                  <span>{order.customer_name}</span>
                                  {order.customer_account?.username && (
                                    <span className="text-xs font-normal text-purple-600 font-mono">
                                      {order.customer_account.username}
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                                  {displayEmail && (
                                    <span className="flex items-center gap-1 font-mono text-[11px] text-gray-700">
                                      <Mail size={11} className="text-gray-400" />
                                      {displayEmail}
                                    </span>
                                  )}
                                  {order.customer_phone && (
                                    <span className="flex items-center gap-1 font-mono text-[11px] text-gray-500">
                                      <Phone size={11} className="text-gray-400" />
                                      {order.customer_phone}
                                    </span>
                                  )}
                                </div>

                                {/* Connection badge */}
                                <div className="mt-1">
                                  {hasTg ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                      <Send size={10} className="text-sky-600" />
                                      Telegram Connected
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200">
                                      Web Account
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="p-4">
                            <div className="text-xs font-medium text-gray-800">{date}</div>
                            <div className="text-[11px] text-gray-400">{time}</div>
                          </td>

                          {/* Payment */}
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md text-xs font-semibold">
                              {order.payment_method?.toUpperCase() || "COD"}
                            </span>
                            <div className="mt-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPaymentStatusStyle(
                                  order.payment_status
                                )}`}
                              >
                                {capitalize(order.payment_status || "Pending")}
                              </span>
                            </div>
                          </td>

                          {/* Total */}
                          <td className="p-4 text-right">
                            <div className="font-bold text-gray-900">
                              ${Number(order.total_amount).toFixed(2)}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              ~ {(Number(order.total_amount) * 4100).toLocaleString()} KHR
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(
                                order.status
                              )}`}
                            >
                              {capitalize(order.status)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="flex justify-end items-center gap-1.5">
                              {/* Push Notification */}
                              <button
                                onClick={() => openPushModal(order)}
                                className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Push Notification to Customer (Web & Telegram)"
                              >
                                <Bell size={17} />
                              </button>
                              {/* View Details */}
                              <button
                                onClick={() => setViewOrder(order)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye size={17} />
                              </button>
                              {/* Edit Order */}
                              <button
                                onClick={() => openEditModal(order)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Order (កែប្រែព័ត៌មាន Order)"
                              >
                                <Edit2 size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 gap-4 bg-gray-50/50">
              <div className="text-xs text-gray-500">
                បង្ហាញ{" "}
                <span className="font-bold text-gray-800">
                  {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{" "}
                ដល់{" "}
                <span className="font-bold text-gray-800">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
                </span>{" "}
                នៃសរុប <span className="font-bold text-gray-800">{filtered.length}</span> entries
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${
                    currentPage === 1
                      ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                      : "border-gray-300 text-gray-700 hover:bg-white bg-white cursor-pointer shadow-xs"
                  }`}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      p === currentPage
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${
                    currentPage === totalPages || totalPages === 0
                      ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                      : "border-gray-300 text-gray-700 hover:bg-white bg-white cursor-pointer shadow-xs"
                  }`}
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
