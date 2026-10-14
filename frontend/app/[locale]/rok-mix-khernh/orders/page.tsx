"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  getRecentOrders,
  updateOrder,
  pushOrderNotification,
  updateOrderStatus,
  deleteOrder,
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
  Trash2,
  Copy,
  Check,
  Printer,
  Clock,
  PackageCheck,
} from "lucide-react";

const STATUSES = ["All Statuses", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const ITEMS_PER_PAGE = 8;

const NOTIF_TEMPLATES = [
  {
    id: "confirmed",
    name: "បញ្ជាក់ការបញ្ជាទិញ (Confirmed)",
    title: "ការបញ្ជាទិញត្រូវបានបញ្ជាក់ (Order Confirmed)",
    status: "processing",
    message: (orderId: string) =>
      `ការបញ្ជាទិញ #${orderId} របស់អ្នកត្រូវបានបញ្ជាក់ដោយជោគជ័យ! បុគ្គលិកកំពុងរៀបចំវេចខ្ចប់ទំនិញជូនលោកអ្នក។`,
  },
  {
    id: "shipping",
    name: "កំពុងដឹកជញ្ជូន (Out for Delivery)",
    title: "ទំនិញកំពុងដឹកជញ្ជូន (Out for Delivery)",
    status: "shipped",
    message: (orderId: string, tracking?: string) =>
      `ទំនិញ #${orderId} របស់អ្នកកំពុងធ្វើដំណើរលើផ្លូវដឹកជញ្ជូន${
        tracking ? ` [កូដបញ្ញើ: ${tracking}]` : ""
      }។ សូមត្រៀមទទួលការទូរស័ព្ទពីអ្នកដឹកជញ្ជូន!`,
  },
  {
    id: "delivered",
    name: "ដឹកជញ្ជូនដល់ជោគជ័យ (Delivered)",
    title: "ទំនិញបានដឹកជញ្ជូនដល់ជោគជ័យ (Delivered)",
    status: "delivered",
    message: (orderId: string) =>
      `ការបញ្ជាទិញ #${orderId} ត្រូវបានប្រគល់ជូនដោយជោគជ័យ។ សូមអរគុណសម្រាប់ការគាំទ្រ S Tech Store!`,
  },
  {
    id: "paid",
    name: "ផ្ទៀងផ្ទាត់ការបង់ប្រាក់ (Payment Verified)",
    title: "ការទូទាត់ប្រាក់ទទួលបានជោគជ័យ",
    status: "processing",
    message: (orderId: string) =>
      `ការទូទាត់ប្រាក់សម្រាប់ការបញ្ជាទិញ #${orderId} ត្រូវបានផ្ទៀងផ្ទាត់ដោយជោគជ័យ។ ហាងកំពុងដំណើរការកញ្ចប់ទំនិញជូនអ្នក!`,
  },
  {
    id: "cancelled",
    name: "បោះបង់ការបញ្ជាទិញ (Order Cancelled)",
    title: "ការបញ្ជាទិញត្រូវបានបោះបង់",
    status: "cancelled",
    message: (orderId: string) =>
      `ការបញ្ជាទិញ #${orderId} ត្រូវបានបោះបង់។ ប្រសិនបើលោកអ្នកមានចម្ងល់ ឬសំណូមពរ សូមទាក់ទងមកកាន់ក្រុមការងារ Admin របស់ S Tech Store។`,
  },
  {
    id: "delay",
    name: "ដំណឹងបន្ទាន់ / ព័ត៌មានបន្ថែម (Notice)",
    title: "ព័ត៌មានបន្ថែមទាក់ទងនឹងការបញ្ជាទិញ",
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

const isSyntheticEmail = (email?: string | null) => {
  if (!email) return true;
  const lower = email.toLowerCase().trim();
  return (
    lower.endsWith("@s-tech-store.tech") ||
    lower.endsWith("@telegram.s-tech-store.tech") ||
    lower.endsWith("@tiktok.s-tech-store.tech") ||
    lower.startsWith("tg_") ||
    !lower.includes("@")
  );
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
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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

  const handleCopy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      showToast("បានចម្លងដោយជោគជ័យ!");
    } catch {
      showToast("បរាជ័យក្នុងការចម្លង", "error");
    }
  };

  const handleQuickStatusChange = async (targetOrder: Order, newStatus: string) => {
    const cleanStatus = newStatus.toLowerCase();
    const res = await updateOrderStatus(targetOrder.id, cleanStatus);
    if (res.success) {
      showToast(`បានប្តូរស្ថានភាពទៅជា ${capitalize(cleanStatus)} ជោគជ័យ!`);
      const updated = { ...targetOrder, status: cleanStatus };
      setOrders((prev) => prev.map((o) => (o.id === targetOrder.id ? updated : o)));
      if (viewOrder && viewOrder.id === targetOrder.id) {
        setViewOrder(updated);
      }
    } else {
      showToast(res.message || "បរាជ័យក្នុងការប្តូរស្ថានភាព", "error");
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderTarget) return;
    setDeletingOrder(true);
    const res = await deleteOrder(deleteOrderTarget.id);
    setDeletingOrder(false);
    if (res.success) {
      showToast(res.message || "បានលុបការបញ្ជាទិញជោគជ័យ!");
      setOrders((prev) => prev.filter((o) => o.id !== deleteOrderTarget.id));
      if (viewOrder?.id === deleteOrderTarget.id) setViewOrder(null);
      if (editOrder?.id === deleteOrderTarget.id) setEditOrder(null);
      setDeleteOrderTarget(null);
    } else {
      showToast(res.message || "បរាជ័យក្នុងការលុបការបញ្ជាទិញ", "error");
    }
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
      status: (order.status || "pending").toLowerCase(),
      payment_status: (order.payment_status || "pending").toLowerCase(),
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
      status: editForm.status.toLowerCase(),
      payment_status: editForm.payment_status.toLowerCase(),
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
                status: editForm.status.toLowerCase(),
                payment_status: editForm.payment_status.toLowerCase(),
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
    setNotifyTitle(`បច្ចុប្បន្នភាពការបញ្ជាទិញ #${order.order_id}`);
    setNotifyMessage(
      `ការបញ្ជាទិញ #${order.order_id} របស់អ្នកត្រូវបានបញ្ជាក់រួចរាល់ហើយ! បុគ្គលិកកំពុងរៀបចំវេចខ្ចប់ទំនិញជូនលោកអ្នក។`
    );
    setNotifyStatusSync((order.status || "processing").toLowerCase());

    // Prioritize customer's real Gmail if available in account profile or order
    let email = "";
    if (order.customer_account?.email && !isSyntheticEmail(order.customer_account.email)) {
      email = order.customer_account.email;
    } else if (order.customer_email && !isSyntheticEmail(order.customer_email)) {
      email = order.customer_email;
    } else {
      email = order.customer_account?.email || order.customer_email || "";
    }

    const hasReal = Boolean(email && !isSyntheticEmail(email));
    setNotifyCustomEmail(email);
    // Real Gmail enables Channel 1 (ON) by default. If synthetic placeholder, default to OFF so admin sees prompt
    setNotifyEmail(hasReal);
    setNotifyTelegram(true);
    setNotifyWeb(true);
  };

  const handleSendNotification = async () => {
    if (!notifyOrder || !notifyMessage.trim()) return;
    if (!notifyEmail && !notifyTelegram && !notifyWeb) {
      showToast("សូមជ្រើសរើសយ៉ាងហោចណាស់ Channel មួយ (Email, Telegram, ឬ Website Account)", "error");
      return;
    }
    setSendingNotify(true);
    const targetStatus = notifyStatusSync ? notifyStatusSync.toLowerCase() : undefined;
    const res = await pushOrderNotification(notifyOrder.id, {
      title: notifyTitle.trim() || undefined,
      message: notifyMessage.trim(),
      status: targetStatus,
      send_email: notifyEmail,
      send_telegram: notifyTelegram,
      send_web: notifyWeb,
      email: notifyCustomEmail.trim() || undefined,
    });
    setSendingNotify(false);

    if (res.success) {
      showToast(res.message || "បានផ្ញើការជូនដំណឹងជោគជ័យ!");
      if (targetStatus && targetStatus !== notifyOrder.status.toLowerCase()) {
        setOrders((prev) =>
          prev.map((o) => (o.id === notifyOrder.id ? { ...o, status: targetStatus } : o))
        );
        if (viewOrder && viewOrder.id === notifyOrder.id) {
          setViewOrder({ ...viewOrder, status: targetStatus });
        }
      }
      setNotifyOrder(null);
      fetchOrders(true);
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

      {/* ─── Rich & Responsive View Order Details Modal (ព័ត៌មានលម្អិត Order) ─── */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-950 via-gray-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 flex items-center justify-center text-rose-400 font-bold shrink-0 border border-white/10">
                  <PackageCheck size={22} className="text-rose-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold leading-tight font-mono">
                      {viewOrder.order_id}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopy(viewOrder.order_id, `view_oid_${viewOrder.id}`)}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                      title="Copy Order ID"
                    >
                      {copiedKey === `view_oid_${viewOrder.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusStyle(
                        viewOrder.status
                      )}`}
                    >
                      {capitalize(viewOrder.status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    កាលបរិច្ឆេទ: {new Date(viewOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer shrink-0 ml-2"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
              {/* 1. Order Lifecycle Progress Timeline */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>ដំណាក់កាលបញ្ជាទិញ (Order Timeline)</span>
                  <span className="text-[11px] font-mono text-gray-500">
                    បច្ចុប្បន្ន: <strong className="text-gray-900">{capitalize(viewOrder.status)}</strong>
                  </span>
                </div>

                {viewOrder.status.toLowerCase() === "cancelled" ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    <span>ការបញ្ជាទិញនេះត្រូវបានបោះបង់ (Order Cancelled)</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center">
                    {[
                      { key: "pending", label: "1. រង់ចាំ", sub: "Pending" },
                      { key: "processing", label: "2. រៀបចំ", sub: "Processing" },
                      { key: "shipped", label: "3. ដឹកជញ្ជូន", sub: "Shipped" },
                      { key: "delivered", label: "4. ជោគជ័យ", sub: "Delivered" },
                    ].map((step, idx) => {
                      const orderSteps = ["pending", "processing", "shipped", "delivered"];
                      const currentIdx = orderSteps.indexOf(viewOrder.status.toLowerCase());
                      const isCompleted = currentIdx >= idx;
                      const isCurrent = currentIdx === idx;

                      return (
                        <div key={step.key} className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCurrent
                                ? "bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-xs"
                                : isCompleted
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {isCompleted && !isCurrent ? <Check size={14} /> : idx + 1}
                          </div>
                          <div
                            className={`mt-1.5 text-[11px] font-bold leading-tight ${
                              isCurrent ? "text-blue-700" : isCompleted ? "text-emerald-700" : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </div>
                          <div className="text-[10px] text-gray-400 hidden sm:block font-mono">{step.sub}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Status Advance Bar */}
                <div className="mt-3.5 pt-3 border-t border-gray-200/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-600 mr-1">ផ្លាស់ប្តូរ Status រហ័ស:</span>
                  {[
                    { key: "pending", label: "Pending", bg: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300" },
                    { key: "processing", label: "Processing", bg: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300" },
                    { key: "shipped", label: "Shipped", bg: "hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300" },
                    { key: "delivered", label: "Delivered", bg: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300" },
                    { key: "cancelled", label: "Cancel", bg: "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300" },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      disabled={viewOrder.status.toLowerCase() === btn.key}
                      onClick={() => handleQuickStatusChange(viewOrder, btn.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        viewOrder.status.toLowerCase() === btn.key
                          ? "bg-gray-900 text-white border-gray-900"
                          : `bg-white border-gray-200 text-gray-700 ${btn.bg}`
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Customer Profile Card */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-purple-600" />
                    <span>ព័ត៌មានអតិថិជន (Customer Profile)</span>
                  </div>
                  {viewOrder.customer_account?.has_telegram || (viewOrder.user_id && viewOrder.user_id.startsWith("tg_")) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                      <Send size={11} className="text-sky-600" />
                      Telegram Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      Web Account
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-3.5">
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
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="text-sm font-bold text-gray-950 flex flex-wrap items-center gap-2">
                      <span>{viewOrder.customer_account?.display_name || viewOrder.customer_name}</span>
                      {viewOrder.customer_account?.username && (
                        <span className="text-xs font-mono font-medium text-purple-600">
                          {viewOrder.customer_account.username}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 flex flex-wrap items-center gap-3">
                      {/* Phone */}
                      {viewOrder.customer_phone ? (
                        <div className="flex items-center gap-1 font-mono">
                          <Phone size={12} className="text-gray-400" />
                          <a href={`tel:${viewOrder.customer_phone}`} className="text-blue-600 hover:underline">
                            {viewOrder.customer_phone}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(viewOrder.customer_phone || "", "cust_phone")}
                            className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {copiedKey === "cust_phone" ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No phone</span>
                      )}

                      {/* Email */}
                      {(viewOrder.customer_email || viewOrder.customer_account?.email) && (
                        <div className="flex items-center gap-1 font-mono">
                          <Mail size={12} className="text-gray-400" />
                          <a
                            href={`mailto:${viewOrder.customer_email || viewOrder.customer_account?.email}`}
                            className="text-blue-600 hover:underline truncate max-w-[200px]"
                          >
                            {viewOrder.customer_email || viewOrder.customer_account?.email}
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(viewOrder.customer_email || viewOrder.customer_account?.email || "", "cust_email")
                            }
                            className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {copiedKey === "cust_email" ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Delivery & Courier Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Truck size={13} className="text-gray-500" />
                    <span>សេវាដឹកជញ្ជូន & កូដបញ្ញើ</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-900 mt-1">
                    តំបន់: <span className="font-bold text-blue-700">{viewOrder.delivery_type === "province" ? "តាមបណ្តាខេត្ត-ក្រុង" : "រាជធានីភ្នំពេញ (Express)"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">កូដបញ្ញើ (Tracking):</span>
                    {viewOrder.tracking_number ? (
                      <div className="flex items-center gap-1 font-mono text-xs font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
                        <span>{viewOrder.tracking_number}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(viewOrder.tracking_number || "", "tracking_no")}
                          className="p-0.5 hover:text-purple-900 cursor-pointer"
                        >
                          {copiedKey === "tracking_no" ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">មិនទាន់មានកូដបញ្ញើ</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <MapPin size={13} className="text-gray-500" />
                    <span>អាសយដ្ឋានដឹកជញ្ជូន (Address)</span>
                  </div>
                  <div className="text-xs text-gray-800 font-medium leading-relaxed mt-1">
                    {viewOrder.shipping_address || "គ្មានព័ត៌មានអាសយដ្ឋាន"}
                  </div>
                </div>
              </div>

              {/* 4. Payment & Financial Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    វិធីសាស្ត្រទូទាត់
                  </div>
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <CreditCard size={15} className="text-gray-500" />
                    <span>{viewOrder.payment_method?.toUpperCase() || "COD"}</span>
                  </div>
                  <div className="mt-1.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getPaymentStatusStyle(
                        viewOrder.payment_status
                      )}`}
                    >
                      {capitalize(viewOrder.payment_status || "Pending")}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    សរុបទឹកប្រាក់ (USD)
                  </div>
                  <div className="text-lg font-black text-rose-600">
                    ${Number(viewOrder.total_amount).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    Rate: 4,100 KHR/$
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    សមមូលប្រាក់រៀល (KHR)
                  </div>
                  <div className="text-base font-black text-blue-700 font-mono">
                    {(Number(viewOrder.total_amount) * 4100).toLocaleString()} ៛
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                    ទូទាត់បានតាម KHQR
                  </div>
                </div>
              </div>

              {/* 5. Purchased Products List (Rich Item Breakdown) */}
              <div className="p-4 rounded-xl border border-gray-200/90 bg-white space-y-3">
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
                  <span>ទំនិញដែលបានបញ្ជាទិញ (Order Items)</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {viewOrder.items && viewOrder.items.length > 0 ? `${viewOrder.items.length} មុខទំនិញ` : "1 មុខទំនិញ"}
                  </span>
                </div>

                {viewOrder.items && viewOrder.items.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {viewOrder.items.map((item: any, i: number) => {
                      const productName = item.product?.name || item.product_name || `ទំនិញ #${item.product_id || i + 1}`;
                      const productImg = item.product?.image_url || (item.product?.images && item.product.images[0]) || null;
                      const unitPrice = Number(item.unit_price || item.price || 0);
                      const qty = Number(item.quantity || 1);
                      const subtotal = Number(item.subtotal || unitPrice * qty);

                      return (
                        <div key={item.id || i} className="py-2.5 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {productImg ? (
                              <img src={productImg} alt={productName} className="w-full h-full object-cover" />
                            ) : (
                              <PackageCheck size={20} className="text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate" title={productName}>
                              {productName}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                              ${unitPrice.toFixed(2)} × {qty}
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-xs text-gray-900">
                            ${subtotal.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-50 text-center text-xs text-gray-500">
                    ទំនិញសរុបមានតម្លៃ ${Number(viewOrder.total_amount).toFixed(2)} (ព័ត៌មានលម្អិតមុខទំនិញត្រូវបានកត់ត្រាក្នុងប្រព័ន្ធ)
                  </div>
                )}
              </div>

              {/* 6. Admin Internal Notes */}
              {viewOrder.admin_notes && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText size={13} className="text-amber-600" />
                    <span>កំណត់សម្គាល់ផ្ទៃក្នុង Admin (Memo)</span>
                  </div>
                  <div className="text-xs text-amber-950 font-medium">
                    {viewOrder.admin_notes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="py-2.5 px-4 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-100 transition-colors cursor-pointer text-xs sm:text-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="py-2.5 px-3 border border-gray-300 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm"
                title="Print Order Receipt"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewOrder;
                  setViewOrder(null);
                  openEditModal(target);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm shadow-xs"
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
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm shadow-xs"
              >
                <Bell size={15} />
                <span>Notify Customer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewOrder;
                  setDeleteOrderTarget(target);
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer text-xs sm:text-sm"
                title="Delete Order"
              >
                <Trash2 size={15} />
                <span className="hidden sm:inline">Delete</span>
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
                      <option value="pending">Pending (រង់ចាំទូទាត់)</option>
                      <option value="paid">Paid (បង់ប្រាក់រួច)</option>
                      <option value="failed">Failed (បរាជ័យ)</option>
                      <option value="refunded">Refunded (បានសងប្រាក់វិញ)</option>
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
                    <option value="pnompenh">ភ្នំពេញ (Delivery Fee: $2.00)</option>
                    <option value="province">ខេត្ត-ក្រុង (Delivery Fee: $3.00)</option>
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
                <div className="text-[11px] text-gray-600 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Mail size={12} className="text-gray-500" />
                    <span>{notifyCustomEmail || notifyOrder.customer_email || notifyOrder.customer_account?.email || "No email"}</span>
                    {!isSyntheticEmail(notifyCustomEmail || notifyOrder.customer_email || notifyOrder.customer_account?.email) ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Real Gmail
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Telegram Placeholder
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Phone size={12} className="text-gray-500" />
                    <span>{notifyOrder.customer_phone || "No phone"}</span>
                  </span>
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

              {/* 3 Clickable Channel Options (Real Gmail, Telegram Bot, Website Account) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ជ្រើសរើស Channels សម្រាប់បញ្ជូនដំណឹង (3-Channel Delivery) *
                  </label>
                  <span className="text-[11px] text-gray-500">ចុចលើប៊ូតុងដើម្បី On / Off</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Channel 1: Real Gmail / Email */}
                  <button
                    type="button"
                    onClick={() => setNotifyEmail(!notifyEmail)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      notifyEmail
                        ? "bg-rose-50 border-rose-400 ring-2 ring-rose-400/30 text-rose-950 shadow-xs"
                        : "bg-gray-50/70 border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            notifyEmail ? "bg-rose-500 text-white" : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          <Mail size={13} />
                        </div>
                        <span>1. Real Gmail</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          notifyEmail ? "bg-rose-200 text-rose-800" : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {notifyEmail ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono truncate text-gray-700" title={notifyCustomEmail || "គ្មាន Email"}>
                      {!isSyntheticEmail(notifyCustomEmail)
                        ? notifyCustomEmail
                        : notifyCustomEmail ? `${notifyCustomEmail}` : "(មិនទាន់មាន Gmail ពិត)"}
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-rose-700">
                      {!isSyntheticEmail(notifyCustomEmail) ? "HTML Email ផ្លូវការ (Real Gmail)" : "ទាមទារ Real Gmail"}
                    </span>
                  </button>

                  {/* Channel 2: Telegram Bot Direct */}
                  <button
                    type="button"
                    onClick={() => setNotifyTelegram(!notifyTelegram)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      notifyTelegram
                        ? "bg-sky-50 border-sky-400 ring-2 ring-sky-400/30 text-sky-950 shadow-xs"
                        : "bg-gray-50/70 border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            notifyTelegram ? "bg-sky-500 text-white" : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          <Send size={13} />
                        </div>
                        <span>2. Telegram Bot</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          notifyTelegram ? "bg-sky-200 text-sky-800" : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {notifyTelegram ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div className="text-[11px] truncate text-gray-700">
                      {notifyOrder.customer_account?.has_telegram ||
                      (notifyOrder.user_id && notifyOrder.user_id.startsWith("tg_"))
                        ? "1-on-1 Chat Connected"
                        : "តាម Chat ID (បើមាន)"}
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-sky-700">
                      សារកាត Bot 1-on-1
                    </span>
                  </button>

                  {/* Channel 3: Website Account In-App & Mini App */}
                  <button
                    type="button"
                    onClick={() => setNotifyWeb(!notifyWeb)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      notifyWeb
                        ? "bg-purple-50 border-purple-400 ring-2 ring-purple-400/30 text-purple-950 shadow-xs"
                        : "bg-gray-50/70 border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            notifyWeb ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          <Globe size={13} />
                        </div>
                        <span>3. Acc Website</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          notifyWeb ? "bg-purple-200 text-purple-800" : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {notifyWeb ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div className="text-[11px] truncate text-gray-700">
                      {notifyOrder.customer_account?.display_name || notifyOrder.customer_name}
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-purple-700">
                      Bell Web & Mini App
                    </span>
                  </button>
                </div>

                {/* Inline editable verified Gmail */}
                {notifyEmail && (
                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Mail size={15} className="text-rose-600 shrink-0" />
                      <input
                        type="email"
                        value={notifyCustomEmail}
                        onChange={(e) => setNotifyCustomEmail(e.target.value)}
                        placeholder="បញ្ចូល Gmail ពិតប្រាកដរបស់អតិថិជន (e.g. customer@gmail.com)..."
                        className="w-full bg-transparent text-xs text-gray-900 font-medium outline-none placeholder:text-gray-400 font-mono"
                      />
                    </div>
                    {!isSyntheticEmail(notifyCustomEmail) ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                        Valid Real Gmail
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                        Placeholder
                      </span>
                    )}
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
                        if (tmpl.status) setNotifyStatusSync(tmpl.status.toLowerCase());
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
                  placeholder="e.g. ការបញ្ជាទិញត្រូវបានបញ្ជាក់"
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
                  ប្តូរ Status នៃការបញ្ជាទិញជាមួយគ្នា (Status Sync)
                </label>
                <div className="relative">
                  <select
                    value={notifyStatusSync}
                    onChange={(e) => setNotifyStatusSync(e.target.value.toLowerCase())}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
                  >
                    <option value="">រក្សា Status បច្ចុប្បន្ន ({capitalize(notifyOrder.status)})</option>
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

      {/* ─── Delete Order Confirmation Modal ─── */}
      {deleteOrderTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">តើអ្នកពិតជាចង់លុប Order នេះមែនទេ?</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                ការបញ្ជាទិញ <strong className="font-mono text-gray-900">#{deleteOrderTarget.order_id}</strong> របស់{" "}
                <strong>{deleteOrderTarget.customer_name}</strong> នឹងត្រូវបានលុបចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteOrderTarget(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                បោះបង់ (Cancel)
              </button>
              <button
                type="button"
                disabled={deletingOrder}
                onClick={handleDeleteOrder}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                {deletingOrder ? (
                  <span>កំពុងលុប...</span>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>បញ្ជាក់ការលុប (Delete)</span>
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
                <option value="telegram">Telegram Connected Only</option>
                <option value="web_only">Web Account Only</option>
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
            {/* ─── Mobile View: Touch-Friendly Cards (block md:hidden) ─── */}
            <div className="block md:hidden divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">
                  មិនមានការបញ្ជាទិញស្របតាមការស្វែងរករបស់អ្នកឡើយ។
                </div>
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
                    <div
                      key={`m-${order.id}`}
                      className="p-4 space-y-3.5 bg-white hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Card Header: Order ID + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-gray-900 text-base">
                              #{order.order_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(order.order_id, `oid-${order.id}`)}
                              className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors cursor-pointer"
                              title="Copy Order ID"
                            >
                              {copiedKey === `oid-${order.id}` ? (
                                <Check size={13} className="text-emerald-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                            <Clock size={11} />
                            <span>
                              {date} • {time}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {capitalize(order.status)}
                        </span>
                      </div>

                      {/* Customer Info Card */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100">
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
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5 truncate">
                            <span className="truncate">{order.customer_name}</span>
                            {order.customer_account?.username && (
                              <span className="text-[10px] text-purple-600 font-mono">
                                @{order.customer_account.username}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate flex items-center gap-2 mt-0.5">
                            {displayEmail && (
                              <span className="truncate font-mono">{displayEmail}</span>
                            )}
                            {order.customer_phone && (
                              <span className="font-mono text-gray-600">{order.customer_phone}</span>
                            )}
                          </div>
                          <div className="mt-1">
                            {hasTg ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                <Send size={9} className="text-sky-600" />
                                Telegram Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                Web Account
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Financial & Delivery Details */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-gray-100">
                        <div>
                          <div className="text-gray-400 text-[10px] uppercase font-bold">វិធីទូទាត់</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-gray-800">
                              {order.payment_method?.toUpperCase() || "COD"}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPaymentStatusStyle(
                                order.payment_status
                              )}`}
                            >
                              {capitalize(order.payment_status || "Pending")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400 text-[10px] uppercase font-bold">សរុប (TOTAL)</div>
                          <div className="font-extrabold text-gray-900 text-sm">
                            ${Number(order.total_amount).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            ~ {(Number(order.total_amount) * 4100).toLocaleString()} KHR
                          </div>
                        </div>
                      </div>

                      {/* Tracking if available */}
                      {order.tracking_number && (
                        <div className="text-[11px] bg-purple-50 text-purple-800 px-3 py-1.5 rounded-lg flex items-center justify-between border border-purple-100 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Truck size={12} className="text-purple-600" />
                            <span>Tracking: {order.tracking_number}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(order.tracking_number!, `trk-${order.id}`)}
                            className="text-purple-600 font-sans text-[10px] underline font-bold cursor-pointer"
                          >
                            {copiedKey === `trk-${order.id}` ? "Copied" : "Copy"}
                          </button>
                        </div>
                      )}

                      {/* Large Mobile Action Buttons: 2x2 Touch Grid (min-h-[44px]) */}
                      <div className="grid grid-cols-2 gap-2 pt-1.5">
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => setViewOrder(order)}
                          className="min-h-[44px] px-3 py-2.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-gray-200 transition-all cursor-pointer shadow-xs"
                        >
                          <Eye size={17} className="text-gray-700 shrink-0" />
                          <span>មើល (View)</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(order)}
                          className="min-h-[44px] px-3 py-2.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-blue-200 transition-all cursor-pointer shadow-xs"
                        >
                          <Edit2 size={17} className="text-blue-600 shrink-0" />
                          <span>កែប្រែ (Edit)</span>
                        </button>

                        {/* Push Notification Button */}
                        <button
                          type="button"
                          onClick={() => openPushModal(order)}
                          className="min-h-[44px] px-3 py-2.5 bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-purple-200 transition-all cursor-pointer shadow-xs"
                        >
                          <Bell size={17} className="text-purple-600 shrink-0" />
                          <span>ដំណឹង (Notify)</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteOrderTarget(order)}
                          className="min-h-[44px] px-3 py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-rose-200 transition-all cursor-pointer shadow-xs"
                        >
                          <Trash2 size={17} className="text-rose-600 shrink-0" />
                          <span>លុប (Delete)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ─── Desktop Table View (hidden md:block) ─── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="p-4">ORDER ID</th>
                    <th className="p-4">អតិថិជន &amp; គណនីពិត (CUSTOMER ACCOUNT)</th>
                    <th className="p-4">កាលបរិច្ឆេទ (DATE)</th>
                    <th className="p-4">ការទូទាត់ (PAYMENT)</th>
                    <th className="p-4 text-right">តម្លៃសរុប (TOTAL)</th>
                    <th className="p-4 text-center">ស្ថានភាព (STATUS)</th>
                    <th className="p-4 text-center">ACTIONS</th>
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
                          <td className="p-4 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              {/* Push Notification */}
                              <button
                                type="button"
                                onClick={() => openPushModal(order)}
                                className="p-2 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all cursor-pointer shadow-xs"
                                title="Push Notification to Customer (Web, Telegram, Gmail)"
                              >
                                <Bell size={16} />
                              </button>
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => setViewOrder(order)}
                                className="p-2 text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl transition-all cursor-pointer shadow-xs"
                                title="View Details (មើលលម្អិត)"
                              >
                                <Eye size={16} />
                              </button>
                              {/* Edit Order */}
                              <button
                                type="button"
                                onClick={() => openEditModal(order)}
                                className="p-2 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer shadow-xs"
                                title="Edit Order (កែប្រែព័ត៌មាន Order)"
                              >
                                <Edit2 size={16} />
                              </button>
                              {/* Delete Order */}
                              <button
                                type="button"
                                onClick={() => setDeleteOrderTarget(order)}
                                className="p-2 text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-xs"
                                title="Delete Order (លុប Order)"
                              >
                                <Trash2 size={16} />
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
