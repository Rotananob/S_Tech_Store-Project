"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import api from "@/lib/api";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { isUserAuthenticated, getEffectiveUser } from "@/lib/auth-user";
import OrderReceiptModal, { ReceiptData } from "@/components/orders/OrderReceiptModal";
import { 
  Printer, 
  Package, 
  Loader2, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBag, 
  AlertCircle 
} from "lucide-react";

const getOrderStep = (status: string): number => {
  const s = (status || "").toLowerCase();
  if (s === "delivered" || s === "completed") return 4;
  if (s === "shipped" || s === "shipping" || s === "delivering") return 3;
  if (s === "processing") return 2;
  if (s === "cancelled") return -1;
  return 1;
};

const ORDER_STEPS = [
  { step: 1, label: "Placed", labelKh: "បានកុម្ម៉ង់", icon: Clock },
  { step: 2, label: "Processing", labelKh: "រៀបចំទំនិញ", icon: Package },
  { step: 3, label: "Out for Delivery", labelKh: "កំពុងដឹកជញ្ជូន", icon: Truck },
  { step: 4, label: "Delivered", labelKh: "បានទទួល", icon: CheckCircle2 },
];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  processing: { bg: "#dbeafe", color: "#1e40af", label: "Processing" },
  shipped: { bg: "#e9d5ff", color: "#6b21a8", label: "Shipped" },
  delivered: { bg: "#dcfce7", color: "#166534", label: "Delivered" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
};

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: { name: string; image?: string };
}

interface Order {
  id: number;
  order_id: string;
  status: string;
  total_amount: number;
  payment_method: string | null;
  delivery_type: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(() => {
    if (typeof window !== "undefined") {
      return isUserAuthenticated() || Boolean(
        localStorage.getItem("stech_user_session") ||
        localStorage.getItem("user_session") ||
        localStorage.getItem("stech_user_token") ||
        localStorage.getItem("customer_token")
      );
    }
    return null;
  });
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [loadingDetailOrderId, setLoadingDetailOrderId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleCopyOrderId = (orderId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2000);
    }
  };

  const handleViewReceipt = (order: Order, immediate = false) => {
    const isCOD = (order.payment_method || "").toLowerCase() === "cod";
    const receipt: ReceiptData = {
      orderId: order.order_id,
      customerName: order.customer_name || "Customer",
      customerPhone: order.customer_phone || "",
      shippingAddress: order.shipping_address || "",
      deliveryType: order.delivery_type || "pnompenh",
      paymentMethod: order.payment_method || "cod",
      paymentStatus: order.status === "cancelled" ? "cancelled" : (isCOD ? "cod" : "paid"),
      items: (order.items || []).map((i) => ({
        id: i.id,
        name: i.product?.name || `Tech Item #${i.product_id}`,
        quantity: i.quantity,
        price: i.unit_price,
        image: i.product?.image,
      })),
      subtotal: Number(order.total_amount) > 3 ? Number(order.total_amount) - 2 : Number(order.total_amount),
      deliveryFee: order.delivery_type === "province" ? 3 : 2,
      total: Number(order.total_amount),
      paidAt: fmtDate(order.created_at),
    };

    if (immediate) {
      setSelectedReceipt(receipt);
      setShowReceiptModal(true);
      return;
    }

    setLoadingDetailOrderId(order.order_id);
    setTimeout(() => {
      setSelectedReceipt(receipt);
      setLoadingDetailOrderId(null);
      setShowReceiptModal(true);
    }, 450);
  };

  const hasActiveClientSession = (): boolean => {
    if (typeof window === "undefined") return false;
    if (isUserAuthenticated()) return true;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tg_token") || urlParams.get("token")) return true;
      if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) return true;
      if (
        localStorage.getItem("stech_user_session") ||
        localStorage.getItem("user_session") ||
        localStorage.getItem("stech_user_token") ||
        localStorage.getItem("customer_token")
      ) {
        return true;
      }
    } catch (e) {}
    return false;
  };

  const fetchOrders = async (isRetry = false) => {
    try {
      setLoading(true);
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      let tgToken = urlParams?.get("tg_token") || urlParams?.get("token");
      if (!tgToken && typeof window !== "undefined") {
        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser?.id) {
          tgToken = String(tgUser.id);
        }
      }

      const res = await api.get("/user/orders", {
        params: tgToken ? { tg_token: tgToken } : undefined,
        headers: tgToken ? { "X-Telegram-Chat-ID": tgToken } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
      setOrders(list);
      setLoggedIn(true);

      // Auto-retry once if list is empty and user opened via Telegram
      if (list.length === 0 && !isRetry && typeof window !== "undefined") {
        if (tgToken || (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) {
          setTimeout(() => {
            fetchOrders(true);
          }, 600);
        }
      }

      // Auto-open specific order receipt if query param order_id or id matches
      if (typeof window !== "undefined") {
        const targetId = urlParams?.get("order_id") || urlParams?.get("id") || window.location.hash.replace("#", "");
        if (targetId) {
          const match = list.find((o: Order) => o.order_id === targetId || String(o.id) === targetId);
          if (match) {
            handleViewReceipt(match);
            setTimeout(() => {
              const el = document.getElementById(`order-${match.order_id}`) || document.getElementById(`order-${match.id}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
          }
        }
      }
    } catch (e: any) {
      if (e?.response?.status === 401 && !hasActiveClientSession()) {
        setLoggedIn(false);
      } else {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check for immediate client-side session (Telegram Mini App, 1-Click token, or local storage)
    if (hasActiveClientSession()) {
      setLoggedIn(true);
      fetchOrders();
    }

    // Direct synchronous token-login if opened with tg_token
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tgToken = urlParams.get("tg_token");
      if (tgToken) {
        api.get(`/auth/telegram/token-login?token=${encodeURIComponent(tgToken)}`).then((loginRes) => {
          if (loginRes.data?.success && loginRes.data?.user) {
            const rawUser = loginRes.data.user;
            const userObj = {
              ...rawUser,
              firebase_uid: rawUser.firebase_uid || rawUser.uid || `tg_${rawUser.id || rawUser.telegram_id}`,
              uid: rawUser.uid || rawUser.firebase_uid || `tg_${rawUser.id || rawUser.telegram_id}`,
              display_name: rawUser.display_name || rawUser.name || "Customer",
              provider: rawUser.provider || "telegram",
            };
            localStorage.setItem("user_session", JSON.stringify(userObj));
            localStorage.setItem("stech_user_session", JSON.stringify(userObj));
            if (loginRes.data.token) {
              localStorage.setItem("customer_token", loginRes.data.token);
              document.cookie = `customer_token=${loginRes.data.token}; path=/; max-age=2592000; SameSite=Lax`;
            }
            fetchOrders(true);
          }
        }).catch(() => {});
      }
    }

    // 2. Listen to Firebase auth state with grace period to prevent false logout flash
    const auth = getAuth();
    let timeoutId: NodeJS.Timeout | null = null;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (timeoutId) clearTimeout(timeoutId);
        setLoggedIn(true);
        fetchOrders();
      } else {
        // Firebase reported null initially. Check client session before declaring logged out
        timeoutId = setTimeout(() => {
          if (!hasActiveClientSession() && !auth.currentUser) {
            setLoggedIn(false);
            setLoading(false);
          }
        }, 800);
      }
    });

    // 3. Listen to TelegramAuthBridge 1-click token auto-login events
    const handleSessionUpdated = () => {
      setLoggedIn(true);
      fetchOrders();
    };
    window.addEventListener("user_session_updated", handleSessionUpdated);

    return () => {
      unsub();
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("user_session_updated", handleSessionUpdated);
    };
  }, []);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const fmtUSD = (n: number) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* ── Official Invoice / Receipt Modal ── */}
      <OrderReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={selectedReceipt}
      />

      {/* ── Order Detail Loading Popup Modal (បង្ហាញ Loading ពេលចុចមើល Detail) ── */}
      {loadingDetailOrderId && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#161b26] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-white/10 text-center flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                <Package className="w-8 h-8 animate-bounce" />
              </div>
              <div className="absolute -inset-1.5 rounded-2xl border-2 border-red-500/40 border-t-red-600 animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 dark:text-white font-mono">
                Order #{loadingDetailOrderId}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                កំពុងទាញយកព័ត៌មានលម្អិត និងវិក្កយបត្រ...
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                <span className="text-[11px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">
                  Loading Order Details...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#12141a] via-[#1a1415] to-[#0c0e12] text-white py-12 lg:py-16 border-b border-gray-800 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(#8B1A1A_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold tracking-wide uppercase mb-3">
            <Package size={13} className="text-red-400" />
            <span>Order History & Invoices</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">
            My Orders <span className="text-[#8B1A1A] dark:text-red-500">.</span>
          </h1>
          <p className="font-khmer text-sm sm:text-base text-gray-400">
            ប្រវត្តិការបញ្ជាទិញ ស្ថានភាពដឹកជញ្ជូន និងវិក្កយបត្រផ្លូវការរបស់អ្នក
          </p>
        </div>
      </section>

      <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Not logged in */}
        {loggedIn === false && (
          <div className="max-w-md mx-auto text-center p-8 sm:p-12 bg-white dark:bg-[#151922] rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl">
              🔒
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">
              Please Sign In
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              You need to be logged in to view your past orders, delivery tracking, and official invoices.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 bg-[#8B1A1A] hover:bg-[#6b1010] text-white rounded-xl font-bold text-sm shadow-md transition-all no-underline"
            >
              Sign In Now
            </Link>
          </div>
        )}

        {/* Loading */}
        {loggedIn && loading && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-white dark:bg-[#151922] border border-gray-200/60 dark:border-white/5 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {loggedIn && !loading && orders.length === 0 && (
          <div className="max-w-md mx-auto text-center p-8 sm:p-12 bg-white dark:bg-[#151922] rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl">
              🛍️
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">
              No orders yet
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              You haven&apos;t placed any orders yet. Explore our genuine laptops, gaming rigs and components!
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-3 bg-[#8B1A1A] hover:bg-[#6b1010] text-white rounded-xl font-bold text-sm shadow-md transition-all no-underline"
            >
              Start Shopping
            </Link>
          </div>
        )}

        {/* Order list */}
        {loggedIn && !loading && orders.length > 0 && (
          <div className="space-y-4 max-w-5xl mx-auto">
            {orders.map((order) => {
              const st = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
              const currentStep = getOrderStep(order.status);
              const isExpanded = !!expandedOrders[order.order_id || String(order.id)];
              const isCancelled = order.status === "cancelled";

              return (
                <div
                  key={order.id}
                  id={`order-${order.order_id || order.id}`}
                  className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-xs hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white font-mono">
                        {order.order_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyOrderId(order.order_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                        title="Copy Order ID"
                      >
                        {copiedOrderId === order.order_id ? (
                          <>
                            <Check size={12} className="text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <span className="text-xs text-gray-400 font-medium">
                        {fmtDate(order.created_at)}
                      </span>
                    </div>
                    <span
                      className="px-3.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: st.bg,
                        color: st.color,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>

                  {/* 🚚 Animated Interactive Tracking Stepper */}
                  {isCancelled ? (
                    <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 flex items-center gap-2.5 text-red-700 dark:text-red-400 text-xs font-medium">
                      <AlertCircle size={16} className="shrink-0 text-red-600 dark:text-red-400" />
                      <span>ការបញ្ជាទិញនេះត្រូវបានលុបចោល (This order has been cancelled).</span>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/5">
                      <div className="relative">
                        {/* Connecting track line */}
                        <div className="absolute top-4 left-6 right-6 h-1 bg-gray-200 dark:bg-white/10 -translate-y-1/2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#8B1A1A] to-emerald-500 transition-all duration-700 ease-out"
                            style={{
                              width: `${Math.min(100, Math.max(0, ((currentStep - 1) / 3) * 100))}%`,
                            }}
                          />
                        </div>

                        {/* Step circles */}
                        <div className="relative z-10 flex items-center justify-between">
                          {ORDER_STEPS.map((s) => {
                            const isDone = currentStep > s.step;
                            const isCurrent = currentStep === s.step;
                            const IconComponent = s.icon;

                            return (
                              <div key={s.step} className="flex flex-col items-center">
                                <div
                                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                                    isDone
                                      ? "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20"
                                      : isCurrent
                                      ? "bg-[#8B1A1A] text-white shadow-md ring-4 ring-[#8B1A1A]/20"
                                      : "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500"
                                  }`}
                                >
                                  {isCurrent && (
                                    <span className="absolute -inset-1 rounded-full bg-[#8B1A1A] opacity-30 animate-ping pointer-events-none" />
                                  )}
                                  {isDone ? (
                                    <Check size={16} strokeWidth={3} />
                                  ) : (
                                    <IconComponent size={15} />
                                  )}
                                </div>
                                <span
                                  className={`text-[10px] sm:text-xs font-bold mt-2 text-center transition-colors ${
                                    isCurrent
                                      ? "text-[#8B1A1A] dark:text-red-400"
                                      : isDone
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-gray-400 dark:text-gray-500"
                                  }`}
                                >
                                  {s.labelKh}
                                </span>
                                <span className="text-[9px] text-gray-400 hidden sm:block">
                                  {s.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-1">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        Total Amount
                      </p>
                      <p className="text-lg sm:text-xl font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                        {fmtUSD(order.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        Items Count
                      </p>
                      <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                        {order.items?.length || 0} product{(order.items?.length || 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        Payment Method
                      </p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {order.payment_method ? order.payment_method.toUpperCase() : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        Delivery Region
                      </p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {order.delivery_type === "pnompenh" ? "Phnom Penh" : order.delivery_type === "province" ? "Province" : order.delivery_type || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Expandable Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => toggleExpand(order.order_id || String(order.id))}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <ShoppingBag size={13} className="text-[#8B1A1A]" />
                        <span>
                          {isExpanded
                            ? "បិទបញ្ជីទំនិញ (Hide Products)"
                            : `មើលទំនិញក្នុងកញ្ចប់ (${order.items.length} មុខ) (View Products)`}
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 bg-gray-50/70 dark:bg-white/[0.02] p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                          {order.items.map((it, idx) => (
                            <div
                              key={it.id || idx}
                              className="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className="w-5 h-5 rounded-md bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                                  {it.product?.name || `Product #${it.product_id}`}
                                </span>
                                <span className="text-gray-400 text-[11px] shrink-0">
                                  × {it.quantity}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-gray-900 dark:text-white shrink-0">
                                {fmtUSD(it.subtotal || (it.unit_price * it.quantity))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-3">
                    <span className="text-xs text-gray-400">
                      Official Electronic Proof of Purchase • S Tech Store
                    </span>
                    <button
                      type="button"
                      onClick={() => handleViewReceipt(order)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/10 hover:bg-[#8B1A1A] hover:text-white text-gray-800 dark:text-gray-200 transition-all border border-gray-200 dark:border-white/10 cursor-pointer shadow-2xs"
                    >
                      {loadingDetailOrderId === order.order_id ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-red-600" />
                          <span>កំពុងទាញយកព័ត៌មាន (Loading)...</span>
                        </>
                      ) : (
                        <>
                          <Printer size={13} />
                          <span>View & Print Receipt (វិក្កយបត្រ)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
