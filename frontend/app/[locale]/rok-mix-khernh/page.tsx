"use client";

import React, { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { 
  getAdminStats, getRecentOrders, broadcastTelegramMessage, 
  AdminStats, Order 
} from "@/lib/services/admin.service";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
  DollarSign, ShoppingBag, Wrench, Tag, FileText, ArrowUpRight, 
  ArrowDownRight, Settings, Send, Volume2, VolumeX, Radio, Sparkles, 
  CheckCircle2, AlertTriangle, Search, Activity, ShieldCheck, RefreshCw, 
  MessageSquare, ExternalLink, Zap
} from "lucide-react";

// Sales chart mock data
const monthlySalesData = [
  { name: 'Jan', sales: 4200 },
  { name: 'Feb', sales: 3400 },
  { name: 'Mar', sales: 5100 },
  { name: 'Apr', sales: 4800 },
  { name: 'May', sales: 6300 },
  { name: 'Jun', sales: 7400 },
  { name: 'Jul', sales: 8900 },
];

export default function AdminDashboardOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState<number>(0);
  
  // Telegram Quick Broadcast state
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTopic, setBroadcastTopic] = useState("chat");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Play pleasant "Cha-Ching" notification sound using Web Audio API
  const playCashChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15); // D6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start(ctx.currentTime + 0.15);
      osc1.stop(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // Audio autoplay permission or context error fallback
    }
  };

  const fetchData = async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        getAdminStats(),
        getRecentOrders(6),
      ]);
      setStats(statsData);
      
      if (lastOrderCount > 0 && ordersData.length > lastOrderCount && audioEnabled) {
        playCashChime();
        showToast("🔔 ការបញ្ជាទិញថ្មីទើបតែបានចូលមកដល់! (New Order Received)");
      }
      setLastOrderCount(ordersData.length);
      setRecentOrders(ordersData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh orders every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [audioEnabled, lastOrderCount]);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) {
      showToast("សូមសរសេរសារប្រកាសជាមុនសិន", "error");
      return;
    }

    setSendingBroadcast(true);
    try {
      const res = await broadcastTelegramMessage(broadcastMsg.trim(), broadcastTopic, "Admin");
      if (res.success) {
        showToast("បានផ្ញើសារប្រកាសទៅ Telegram Group ជោគជ័យ! 🎉");
        setBroadcastMsg("");
      } else {
        showToast(res.error || "បរាជ័យក្នុងការផ្ញើសារ", "error");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "បរាជ័យក្នុងការផ្ញើសារ សូមពិនិត្យការភ្ជាប់ Bot";
      showToast(msg, "error");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "processing" || s === "pending") return "bg-blue-100 text-blue-700";
    if (s === "completed" || s === "delivered") return "bg-green-100 text-green-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const filteredOrders = recentOrders.filter((order) => {
    const q = searchQuery.toLowerCase();
    return (
      (order.order_id && order.order_id.toLowerCase().includes(q)) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
      (order.customer_phone && order.customer_phone.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 border-3 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-gray-500 font-bold text-sm">កំពុងផ្ទុកព័ត៌មានផ្ទាំងគ្រប់គ្រង (Loading Dashboard)...</div>
      </div>
    );
  }

  return (
    <div className="font-sans space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-xl font-bold text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'} transition-all animate-in fade-in slide-in-from-top-4`}>
          {toast.msg}
        </div>
      )}

      {/* ── TOP COMMAND HEADER & QUICK CONTROLS ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Live Operations Command Center
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight m-0">
            Store Management Dashboard
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            តាមដានការលក់ ការបញ្ជាទិញ ស្តុកទំនិញ និងការជូនដំណឹង Telegram ក្នុងពេលជាក់ស្តែង (Real-time 24/7)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Order Audio Sound Alert Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playCashChime();
              showToast(next ? "🔊 បានបើកសំឡេងជូនដំណឹង (Audio Alerts ON)" : "🔇 បានបិទសំឡេងជូនដំណឹង (Audio Alerts OFF)");
            }}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              audioEnabled 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs' 
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
            title="បន្លឺសំឡេងពេលមាន Order ថ្មី"
          >
            {audioEnabled ? <Volume2 size={16} className="text-emerald-600" /> : <VolumeX size={16} />}
            <span>{audioEnabled ? "Sound Alert ON 🔔" : "Sound Alert OFF 🔕"}</span>
          </button>

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={fetchData}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
            title="ទាញទិន្នន័យថ្មី (Refresh)"
          >
            <RefreshCw size={16} />
          </button>

          {/* Export Report */}
          <button 
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white text-[#8B1A1A] border border-[#8B1A1A] hover:bg-red-50 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <FileText size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ── LIVE INFRASTRUCTURE HEARTBEAT BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm text-xs">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50/80">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div className="truncate">
            <span className="text-gray-400 block text-[10px]">Cloud Database</span>
            <span className="font-bold text-gray-800">Neon PostgreSQL (22ms)</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50/80">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
          <div className="truncate">
            <span className="text-gray-400 block text-[10px]">Telegram Bot Service</span>
            <span className="font-bold text-sky-700">@s_tech_storeBot</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50/80">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div className="truncate">
            <span className="text-gray-400 block text-[10px]">CDN Media Storage</span>
            <span className="font-bold text-gray-800">Cloudinary Online</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50/80">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <div className="truncate">
            <span className="text-gray-400 block text-[10px]">Portal Security Path</span>
            <span className="font-bold text-indigo-700">rok-mix-khernh 🛡️</span>
          </div>
        </div>
      </div>

      {/* ── TELEGRAM QUICK NOTIFICATION & BROADCAST CENTER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Banner with 1-Click Bot Setup */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-r from-[#0088cc] via-[#0077b5] to-[#1a4fa0] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-md">
              <Send size={26} className="text-white fill-white/20" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold text-sky-100 mb-1">
                <Sparkles size={12} /> ABA Merchant Style One-Click
              </div>
              <h3 className="text-lg font-black text-white m-0">
                Official Telegram Bot: @s_tech_storeBot
              </h3>
              <p className="text-xs text-sky-100 mt-1 leading-relaxed max-w-md">
                ទទួលការជូនដំណឹងពីការបញ្ជាទិញថ្មី (New Orders) និងបែងចែកតាម Forum Topics ដោយស្វ័យប្រវត្តក្នុង Telegram Group។
              </p>
            </div>
          </div>
          <Link
            href="/rok-mix-khernh/settings"
            className="relative z-10 px-5 py-3 rounded-xl bg-white text-[#0088cc] hover:bg-sky-50 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all no-underline shrink-0 hover:scale-105 active:scale-95"
          >
            <span>គ្រប់គ្រង Telegram Bot</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>

        {/* Instant Staff Telegram Broadcast Card */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-[#0088cc] animate-pulse" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                  Instant Telegram Broadcast
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-[#0088cc]">
                Live
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              ផ្ញើសារប្រកាសបន្ទាន់ ឬដំណឹងថ្មីទៅកាន់ Telegram Group របស់បុគ្គលិកភ្លាមៗ។
            </p>
          </div>

          <form onSubmit={handleSendBroadcast} className="flex flex-col gap-2.5">
            <div className="flex gap-2">
              <select
                value={broadcastTopic}
                onChange={(e) => setBroadcastTopic(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 outline-none font-medium"
              >
                <option value="chat">💬 Chat Topic</option>
                <option value="orders">🛒 Orders Topic</option>
                <option value="repairs">🛠️ Repairs Topic</option>
                <option value="stock">⚠️ Stock Topic</option>
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="វាយសារប្រកាសទៅគ្រុប..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0088cc] focus:bg-white"
              />
              <button
                type="submit"
                disabled={sendingBroadcast}
                className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none shrink-0 disabled:opacity-50"
              >
                <Send size={13} className={sendingBroadcast ? "animate-spin" : ""} />
                <span>{sendingBroadcast ? "..." : "Send"}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* ── 4 CORE KPI STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Stat 1: Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-blue-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <DollarSign size={22} />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${stats?.salesGrowth && stats.salesGrowth >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {stats?.salesGrowth && stats.salesGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(stats?.salesGrowth || 0)}%
            </span>
          </div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-1 uppercase">TOTAL SALES</div>
          <div className="text-2xl font-black text-gray-900">
            ${(stats?.totalSales || 0).toLocaleString()} <span className="text-xs font-bold text-gray-400">USD</span>
          </div>
        </div>

        {/* Stat 2: Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-indigo-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <ShoppingBag size={22} />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${stats?.ordersGrowth && stats.ordersGrowth >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {stats?.ordersGrowth && stats.ordersGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(stats?.ordersGrowth || 0)}%
            </span>
          </div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-1 uppercase">TOTAL ORDERS</div>
          <div className="text-2xl font-black text-gray-900">{(stats?.totalOrders || 0).toLocaleString()}</div>
        </div>

        {/* Stat 3: Pending Repairs */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-amber-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Wrench size={22} />
            </div>
            {stats?.pendingRepairs ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 animate-pulse">Needs Action</span>
            ) : null}
          </div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-1 uppercase">PENDING REPAIRS</div>
          <div className="text-2xl font-black text-gray-900">{stats?.pendingRepairs || 0}</div>
        </div>

        {/* Stat 4: Active Promotions */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-rose-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
              <Tag size={22} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Active Promo
            </span>
          </div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-1 uppercase">ACTIVE PROMOTIONS</div>
          <div className="text-2xl font-black text-gray-900">{stats?.activePromotions || 0}</div>
        </div>
      </div>

      {/* ── MIDDLE ROW: CHARTS & ACTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-black text-gray-900 m-0">Sales Performance & Revenue</h2>
              <p className="text-xs text-gray-400 m-0 mt-0.5">Monthly store gross volume in USD</p>
            </div>
            <select className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-gray-50 text-gray-600 font-bold outline-none focus:ring-2 focus:ring-blue-100">
              <option>This Year (2026)</option>
              <option>Previous Year</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySalesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dx={-10} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  itemStyle={{ color: '#8B1A1A', fontWeight: 'bold' }}
                  formatter={(value: any) => [
                    `$${Number(value).toLocaleString()} USD`,
                    "Revenue"
                  ]}
                />
                <Line type="monotone" dataKey="sales" stroke="#8B1A1A" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#8B1A1A' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Short Cuts */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
              <Zap size={18} className="text-[#8B1A1A]" />
              <span>Quick Actions</span>
            </h2>
            <div className="flex flex-col gap-2.5">
              <Link 
                href="/rok-mix-khernh/products/new" 
                className="flex items-center gap-3.5 p-3 rounded-xl border border-gray-100 hover:border-[#8B1A1A]/30 hover:bg-red-50/30 transition-all group no-underline"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-[#8B1A1A] group-hover:text-white transition-colors">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900">Add New Product</div>
                  <div className="text-[11px] text-gray-400">បន្ថែមទំនិញថ្មីចូលស្តុក</div>
                </div>
              </Link>

              <Link 
                href="/rok-mix-khernh/repairs" 
                className="flex items-center gap-3.5 p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all group no-underline"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Wrench size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-xs sm:text-sm font-bold text-gray-900">Repair Tickets</div>
                  <div className="text-[11px] text-gray-400">តាមដានសំណើជួសជុល</div>
                </div>
                {stats?.pendingRepairs ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    {stats.pendingRepairs}
                  </span>
                ) : null}
              </Link>

              <Link 
                href="/rok-mix-khernh/settings" 
                className="flex items-center gap-3.5 p-3 rounded-xl border border-gray-100 hover:border-sky-200 hover:bg-sky-50/30 transition-all group no-underline"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-[#0088cc] group-hover:text-white transition-colors">
                  <Settings size={18} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-gray-900">Settings & Telegram Bot</div>
                  <div className="text-[11px] text-gray-400">ការកំណត់ប្រព័ន្ធ & Bot</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* ── RECENT ORDERS COMMAND TABLE WITH SEARCH FILTER ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-5 sm:p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900 m-0">Recent Orders</h2>
            <p className="text-xs text-gray-400 m-0 mt-0.5">បញ្ជីការបញ្ជាទិញចុងក្រោយបំផុត</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ស្វែងរកតាម ID, ឈ្មោះ, លេខទូរស័ព្ទ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8B1A1A] focus:bg-white font-medium"
              />
            </div>

            <Link 
              href="/rok-mix-khernh/orders" 
              className="text-xs font-bold text-[#8B1A1A] hover:underline no-underline shrink-0 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
            >
              View All Orders →
            </Link>
          </div>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            {searchQuery ? "រកមិនឃើញការកុម្ម៉ង់ដែលត្រូវនឹងពាក្យស្វែងរកឡើយ" : "មិនទាន់មានការបញ្ជាទិញថ្មីឡើយ"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-gray-50/60 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-900">{order.order_id}</td>
                    <td className="p-4 font-semibold text-gray-800">{order.customer_name}</td>
                    <td className="p-4 font-mono text-gray-500">{order.customer_phone || "-"}</td>
                    <td className="p-4 text-gray-500">{formatDate(order.created_at)}</td>
                    <td className="p-4 font-black text-gray-900 font-mono">
                      ${Number(order.total_amount).toLocaleString()} USD
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
