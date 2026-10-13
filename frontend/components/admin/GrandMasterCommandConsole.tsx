"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Lock, 
  Crown, 
  Zap, 
  Database, 
  AlertOctagon, 
  Flame, 
  Radio, 
  RefreshCw, 
  Coins, 
  UserX, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Download, 
  Sparkles, 
  Layers, 
  X, 
  Terminal,
  Activity,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import {
  getMasterSystemStatus,
  toggleMaintenanceMode,
  purgeGlobalCaches,
  toggleFinancialFreeze,
  backupDatabaseSnapshot,
  forceClientUpdateBroadcast,
  sendEmergencySos,
  revokeAllStaffSessions,
  updateCoinMultiplier,
  MasterSystemState,
  MasterSystemMetrics
} from "@/lib/services/master.service";

interface Props {
  /** If undefined, the component will detect automatically from the API */
  isSuperAdminProp?: boolean;
  onRefreshStats?: () => void;
}

export default function GrandMasterCommandConsole({ isSuperAdminProp, onRefreshStats }: Props) {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(isSuperAdminProp ?? false);
  const [currentRole, setCurrentRole] = useState<string>("admin");
  const [state, setState] = useState<MasterSystemState>({
    maintenance_mode: false,
    financial_freeze: false,
    coin_multiplier: 1.0,
    force_app_version: "1.0.0",
    last_cache_purge: null,
    last_backup_at: null,
    last_backup_file: null,
    emergency_lockdown: false,
  });
  const [metrics, setMetrics] = useState<MasterSystemMetrics | null>(null);

  // Action Loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Access Denied Modal state for Regular Admins
  const [deniedModal, setDeniedModal] = useState<{
    show: boolean;
    buttonName: string;
    description: string;
  } | null>(null);

  // Confirmation Modal state for Super Admin dangerous actions
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    dangerLevel: "warning" | "danger" | "extreme";
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Sound effect
  const playAlertChime = (tone: "success" | "warn") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone === "warn" ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(tone === "warn" ? 220 : 880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  const loadStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Also inspect client storage for instant role resolution
      const userStr = typeof window !== "undefined" ? localStorage.getItem("stech_admin_user") : null;
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          if (parsed.role === "super_admin" || parsed.email === "nobrothana180703@gmail.com") {
            setIsSuperAdmin(true);
          }
        } catch (e) {}
      }

      const res = await getMasterSystemStatus();
      if (res.success) {
        setIsSuperAdmin(res.is_super_admin);
        setCurrentRole(res.current_role);
        setState(res.state);
        setMetrics(res.metrics);
      }
    } catch (e) {
      console.warn("Could not load master status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Intercept button clicks: if not Super Admin, show View-Only Access Denied modal!
  const handleProtectedAction = (
    actionKey: string,
    buttonTitle: string,
    actionFn: () => Promise<void>,
    requiresConfirm = false,
    confirmTitle = "",
    confirmMsg = "",
    dangerLevel: "warning" | "danger" | "extreme" = "warning"
  ) => {
    if (!isSuperAdmin) {
      playAlertChime("warn");
      setDeniedModal({
        show: true,
        buttonName: buttonTitle,
        description: `លោកអ្នកជា Admin ធម្មតា (Limited Administrator) អាចត្រឹមតែមើលឃើញស្ថានភាព ប៉ុន្តែគ្មានមហាសិទ្ធិចុចដំណើរការប៊ូតុង "${buttonTitle}" នេះបានឡើយ។ មហាសិទ្ធិនេះត្រូវបានរក្សាទុកសម្រាប់តែម្ចាស់ប្រព័ន្ធ (Super Admin / Master Owner) ប៉ុណ្ណោះ!`,
      });
      return;
    }

    if (requiresConfirm) {
      setConfirmModal({
        show: true,
        title: confirmTitle || `បញ្ជាក់ការដំណើរការ: ${buttonTitle}`,
        message: confirmMsg || `តើអ្នកពិតជាចង់ដំណើរការប្រតិបត្តិការ ${buttonTitle} នេះមែនទេ?`,
        dangerLevel,
        onConfirm: async () => {
          setConfirmModal(null);
          await executeAction(actionKey, actionFn);
        },
      });
    } else {
      executeAction(actionKey, actionFn);
    }
  };

  const executeAction = async (actionKey: string, actionFn: () => Promise<void>) => {
    setActionLoading(actionKey);
    try {
      await actionFn();
      playAlertChime("success");
      await loadStatus(true);
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      playAlertChime("warn");
      const msg = err.response?.data?.error || err.response?.data?.message || "បរាជ័យក្នុងការដំណើរការ";
      showToast(msg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-[#120f0a] via-[#16120d] to-[#0d0d10] p-5 sm:p-7 text-white shadow-2xl shadow-amber-950/20">
      
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[99999] flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold shadow-2xl transition-all ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── HEADER: GRAND MASTER COMMAND CENTER ── */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/40 text-amber-300 text-[11px] font-black tracking-wider uppercase shadow-xs">
              <Crown size={13} className="text-amber-400 animate-pulse" />
              <span>Grand Master System Controls</span>
            </span>

            {/* Privilege Level Badge */}
            {isSuperAdmin ? (
              <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>មហាសិទ្ធិម្ចាស់ប្រព័ន្ធពេញលេញ (Master Active)</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-gray-300 text-[10px] font-bold uppercase flex items-center gap-1.5">
                <Lock size={11} className="text-amber-400" />
                <span>Admin ធម្មតា (View-Only Mode)</span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0 flex items-center gap-2">
            <span>មជ្ឈមណ្ឌលមហាសិទ្ធិម្ចាស់ប្រព័ន្ធ</span>
            <span className="text-amber-400 font-mono text-xs sm:text-sm">CONSOLE v1.0.0</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
            {isSuperAdmin
              ? "លោកអ្នកមានមហាសិទ្ធិបញ្ជាគ្រប់គ្រងពេញលេញលើប្រព័ន្ធហាង សុវត្ថិភាពសាច់ប្រាក់ Cache និងការបិទ/បើកហាងបន្ទាន់។"
              : "លោកអ្នកជា Admin ធម្មតាអាចមើលឃើញស្ថានភាពបច្ចុប្បន្នបាន ប៉ុន្តែរាល់ប៊ូតុងបញ្ជាទាំងអស់ត្រូវបានការពារ (View-Only)។"}
          </p>
        </div>

        {/* Quick Refresh Status Button */}
        <button
          type="button"
          onClick={() => loadStatus()}
          disabled={loading}
          className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-amber-400" : ""} />
          <span>{loading ? "Syncing..." : "Refresh Status"}</span>
        </button>
      </div>

      {/* ── METRICS OVERVIEW TICKER ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-white/10 text-xs">
        <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
          <span className="text-gray-400 text-[10px] uppercase font-bold block">Store Status</span>
          <span className={`text-sm font-black flex items-center gap-1.5 mt-0.5 ${state.maintenance_mode ? 'text-rose-400' : 'text-emerald-400'}`}>
            <span className={`w-2 h-2 rounded-full ${state.maintenance_mode ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} />
            <span>{state.maintenance_mode ? "Maintenance Mode" : "Normal Live 24/7"}</span>
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
          <span className="text-gray-400 text-[10px] uppercase font-bold block">Financial Gate</span>
          <span className={`text-sm font-black flex items-center gap-1.5 mt-0.5 ${state.financial_freeze ? 'text-amber-400' : 'text-emerald-400'}`}>
            <span className={`w-2 h-2 rounded-full ${state.financial_freeze ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>{state.financial_freeze ? "Frozen (Lockdown)" : "Active (Transactions OK)"}</span>
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
          <span className="text-gray-400 text-[10px] uppercase font-bold block">Coin Multiplier</span>
          <span className="text-sm font-black text-yellow-400 flex items-center gap-1 mt-0.5">
            <Coins size={14} className="text-yellow-400" />
            <span>{state.coin_multiplier}x Reward Points</span>
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
          <span className="text-gray-400 text-[10px] uppercase font-bold block">Active Staff Sessions</span>
          <span className="text-sm font-black text-sky-400 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>{metrics?.active_staff_sessions || 1} Connected</span>
          </span>
        </div>
      </div>

      {/* ── 8 MASTER ACTION BUTTONS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
        
        {/* 1. Maintenance Mode Killswitch */}
        <div className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between ${
          state.maintenance_mode 
            ? "bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/40" 
            : "bg-white/[0.03] border-white/10 hover:border-white/20"
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <AlertOctagon size={20} />
              </div>
              {!isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-1">
                  <Lock size={10} /> Owner Only
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white m-0">Store Maintenance Mode</h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              {state.maintenance_mode 
                ? "ហាងកំពុងត្រូវបានបិទជាបណ្ដោះអាសន្ន។" 
                : "បិទហាងជាបន្ទាន់សម្រាប់ជួសជុល ឬ Upgrade។"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              handleProtectedAction(
                "maintenance",
                "Store Maintenance Mode",
                async () => {
                  const res = await toggleMaintenanceMode(!state.maintenance_mode);
                  showToast(res.message);
                },
                true,
                state.maintenance_mode ? "បើកហាងជាសាធារណៈឡើងវិញ" : "បិទហាងដាក់ Maintenance Mode",
                state.maintenance_mode 
                  ? "តើអ្នកចង់បិទ Maintenance Mode និងបើកដំណើរការហាងជាធម្មតាឡើងវិញមែនទេ?" 
                  : "ប្រយ័ត្ន! ការបើក Maintenance Mode នឹងធ្វើឲ្យអតិថិជនមិនអាចមើលទំនិញ ឬទិញបានឡើយ។ តើអ្នកចង់បន្តទេ?",
                state.maintenance_mode ? "warning" : "extreme"
              );
            }}
            disabled={actionLoading === "maintenance"}
            className={`mt-3 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              !isSuperAdmin
                ? "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 opacity-70"
                : state.maintenance_mode
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40"
            }`}
          >
            {actionLoading === "maintenance" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : !isSuperAdmin ? (
              <Lock size={13} className="text-amber-400" />
            ) : (
              <AlertOctagon size={13} />
            )}
            <span>
              {!isSuperAdmin 
                ? "🔒 មហាសិទ្ធិប៉ុណ្ណោះ (Locked)" 
                : state.maintenance_mode 
                ? "បិទ Maintenance (Go Live)" 
                : "បើក Maintenance Mode"}
            </span>
          </button>
        </div>

        {/* 2. Global Cache & Storage Purge */}
        <div className="relative p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Flame size={20} />
              </div>
              {!isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-1">
                  <Lock size={10} /> Owner Only
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white m-0">Global Cache Purge</h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              កម្ទេច System Cache, Redis & PWA Service Worker Cache 100%។
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              handleProtectedAction(
                "cache",
                "Global Cache Purge",
                async () => {
                  const res = await purgeGlobalCaches();
                  showToast(res.message);
                },
                false
              );
            }}
            disabled={actionLoading === "cache"}
            className={`mt-3 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              !isSuperAdmin
                ? "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 opacity-70"
                : "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-md shadow-amber-950/40"
            }`}
          >
            {actionLoading === "cache" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : !isSuperAdmin ? (
              <Lock size={13} className="text-amber-400" />
            ) : (
              <Zap size={13} />
            )}
            <span>{!isSuperAdmin ? "🔒 មហាសិទ្ធិប៉ុណ្ណោះ (Locked)" : "កម្ទេច Cache ទាំងអស់"}</span>
          </button>
        </div>

        {/* 3. Financial Emergency Freeze */}
        <div className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between ${
          state.financial_freeze 
            ? "bg-amber-950/50 border-amber-500/70 shadow-lg shadow-amber-950/40" 
            : "bg-white/[0.03] border-white/10 hover:border-white/20"
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
                <ShieldAlert size={20} />
              </div>
              {!isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-1">
                  <Lock size={10} /> Owner Only
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white m-0">Financial Freeze Killswitch</h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              {state.financial_freeze 
                ? "ប្រតិបត្តិការហិរញ្ញវត្ថុត្រូវបានបង្កកបណ្ដោះអាសន្ន។" 
                : "បង្កកការបង់ប្រាក់ Wallet/Checkout ពេលសង្ស័យ Fraud។"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              handleProtectedAction(
                "financial",
                "Financial Freeze Killswitch",
                async () => {
                  const res = await toggleFinancialFreeze(!state.financial_freeze);
                  showToast(res.message);
                },
                true,
                state.financial_freeze ? "ដោះលែងប្រតិបត្តិការហិរញ្ញវត្ថុ" : "បង្កកប្រតិបត្តិការហិរញ្ញវត្ថុបន្ទាន់",
                state.financial_freeze 
                  ? "តើអ្នកចង់ដោះលែងប្រតិបត្តិការហិរញ្ញវត្ថុឲ្យអតិថិជន Topup/បង់ប្រាក់ធម្មតាវិញមែនទេ?" 
                  : "ប្រយ័ត្ន! ការបង្កកហិរញ្ញវត្ថុនឹងផ្អាកការ Checkout និង Topup ទាំងអស់ភ្លាមៗ។ តើអ្នកចង់បន្តទេ?",
                "danger"
              );
            }}
            disabled={actionLoading === "financial"}
            className={`mt-3 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              !isSuperAdmin
                ? "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 opacity-70"
                : state.financial_freeze
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-yellow-600 hover:bg-yellow-500 text-white shadow-md shadow-yellow-950/40"
            }`}
          >
            {actionLoading === "financial" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : !isSuperAdmin ? (
              <Lock size={13} className="text-amber-400" />
            ) : (
              <ShieldAlert size={13} />
            )}
            <span>
              {!isSuperAdmin 
                ? "🔒 មហាសិទ្ធិប៉ុណ្ណោះ (Locked)" 
                : state.financial_freeze 
                ? "ដោះលែងហិរញ្ញវត្ថុ (Unfreeze)" 
                : "បង្កកហិរញ្ញវត្ថុ (Freeze)"}
            </span>
          </button>
        </div>

        {/* 4. Instant Database Backup & Snapshot */}
        <div className="relative p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <Database size={20} />
              </div>
              {!isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-1">
                  <Lock size={10} /> Owner Only
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white m-0">Live Database Snapshot</h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              {state.last_backup_at 
                ? `Backup ចុងក្រោយ: ${new Date(state.last_backup_at).toLocaleDateString()}` 
                : "ទាញយក Backup ទិន្នន័យហាងពេញលេញភ្លាមៗ។"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              handleProtectedAction(
                "backup",
                "Live Database Snapshot",
                async () => {
                  const res = await backupDatabaseSnapshot();
                  showToast(res.message);
                },
                false
              );
            }}
            disabled={actionLoading === "backup"}
            className={`mt-3 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              !isSuperAdmin
                ? "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 opacity-70"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/40"
            }`}
          >
            {actionLoading === "backup" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : !isSuperAdmin ? (
              <Lock size={13} className="text-amber-400" />
            ) : (
              <Download size={13} />
            )}
            <span>{!isSuperAdmin ? "🔒 មហាសិទ្ធិប៉ុណ្ណោះ (Locked)" : "Export Snapshot ភ្លាមៗ"}</span>
          </button>
        </div>

        {/* 5. Force Client App Update Broadcast */}
        <div className="relative p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <RefreshCw size={20} />
              </div>
              {!isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-1">
                  <Lock size={10} /> Owner Only
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white m-0">Force App Update Broadcast</h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              បង្ខំរាល់ Browser អតិថិជនទូទាំងប្រទេស Refresh យក version v1.0.0 ថ្មី។
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              handleProtectedAction(
                "force_update",
                "Force App Update Broadcast",
                async () => {
                  const res = await forceClientUpdateBroadcast("1.0.0", true);
                  showToast(res.message);
                },
                true,
                "បង្ខំ Update កំណែថ្មីទូទាំងប្រទេស",
                "តើអ្នកចង់បញ្ជូនសញ្ញា Force Update ទៅកាន់គ្រប់ Device និង Browser របស់អតិថិជនទាំងអស់មែនទេ?",
                "warning"
              );
            }}
            disabled={actionLoading === "force_update"}
            className={`mt-3 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              !isSuperAdmin
                ? "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 opacity-70"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950/40"
            }`}
          >
            {actionLoading === "force_update" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : !isSuperAdmin ? (
              <Lock size={13} className="text-amber-400" />
            ) : (
              <Radio size={13} />
            )}
            <span>{!isSuperAdmin ? "🔒 មហាសិទ្ធិប៉ុណ្ណោះ (Locked)" : "Broadcast Force Update"}</span>
          </button>
        </div>

        {/* 6. Emergency Master SOS Broadcast */}
        <div className="relative p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                <Radio size={20} className="animate-pulse" />
              </div>
              {!isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-1">
                  <Lock size={10} /> Owner Only
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white m-0">Telegram SOS Alarm</h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              បាញ់សារប្រកាសអាសន្ន SOS ទៅគ្រប់បុគ្គលិក និង Telegram Bot Groups។
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              handleProtectedAction(
                "sos",
                "Telegram SOS Alarm",
                async () => {
                  const res = await sendEmergencySos();
                  showToast(res.message);
                },
                true,
                "បាញ់សារប្រកាសអាសន្ន Telegram SOS",
                "តើអ្នកចង់បញ្ជូនសារអាសន្ន SOS ទៅកាន់គ្រប់ Telegram Topics របស់បុគ្គលិកទាំងអស់មែនទេ?",
                "danger"
              );
            }}
            disabled={actionLoading === "sos"}
            className={`mt-3 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              !isSuperAdmin
                ? "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 opacity-70"
                : "bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40"
            }`}
          >
            {actionLoading === "sos" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : !isSuperAdmin ? (
              <Lock size={13} className="text-amber-400" />
            ) : (
              <Radio size={13} />
            )}
            <span>{!isSuperAdmin ? "🔒 មហាសិទ្ធិប៉ុណ្ណោះ (Locked)" : "បាញ់សារ SOS បន្ទាន់"}</span>
          </button>
        </div>

        {/* 7. Revoke All Staff Sessions */}
        <div className="relative p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                <UserX size={20} />
              </div>
              {!isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-1">
                  <Lock size={10} /> Owner Only
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white m-0">Revoke Staff Sessions</h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              កាត់ផ្តាច់ Login បុគ្គលិកទាំងអស់ភ្លាមៗ ពេលសង្ស័យបែកធ្លាយ Password។
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              handleProtectedAction(
                "revoke_sessions",
                "Revoke Staff Sessions",
                async () => {
                  const res = await revokeAllStaffSessions();
                  showToast(res.message);
                },
                true,
                "កាត់ផ្តាច់ Session បុគ្គលិកទាំងអស់",
                "ប្រយ័ត្ន! គ្រប់បុគ្គលិក និង Admin ទាំងអស់នឹងត្រូវបាន Logout ចេញពីប្រព័ន្ធភ្លាមៗ។ តើអ្នកចង់បន្តទេ?",
                "danger"
              );
            }}
            disabled={actionLoading === "revoke_sessions"}
            className={`mt-3 w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              !isSuperAdmin
                ? "bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 opacity-70"
                : "bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-950/40"
            }`}
          >
            {actionLoading === "revoke_sessions" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : !isSuperAdmin ? (
              <Lock size={13} className="text-amber-400" />
            ) : (
              <UserX size={13} />
            )}
            <span>{!isSuperAdmin ? "🔒 មហាសិទ្ធិប៉ុណ្ណោះ (Locked)" : "Logout បុគ្គលិកទាំងអស់"}</span>
          </button>
        </div>

        {/* 8. Global Coin Reward Multiplier */}
        <div className="relative p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
                <Coins size={20} />
              </div>
              {!isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-1">
                  <Lock size={10} /> Owner Only
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white m-0">Coin Multiplier Promo</h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              បច្ចុប្បន្ន: {state.coin_multiplier}x (កែប្រែដើម្បីបើក Campaign ផ្ដល់ Coin ច្រើន)
            </p>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {[1, 2, 5].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  handleProtectedAction(
                    `multiplier_${m}`,
                    `Set Coin Multiplier to ${m}x`,
                    async () => {
                      const res = await updateCoinMultiplier(m);
                      showToast(res.message);
                    },
                    false
                  );
                }}
                disabled={actionLoading === `multiplier_${m}`}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isSuperAdmin
                    ? "bg-white/5 text-gray-500 border border-white/5 opacity-60"
                    : state.coin_multiplier === m
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 font-black shadow-sm"
                    : "bg-white/10 hover:bg-white/20 text-gray-200"
                }`}
              >
                {m}x
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── MODAL 1: VIEW-ONLY / ACCESS DENIED MODAL FOR REGULAR ADMINS ── */}
      {deniedModal?.show && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#121318] border-2 border-amber-500/50 rounded-3xl p-6 text-white shadow-[0_20px_60px_rgba(245,158,11,0.25)] space-y-4">
            
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
              <Lock size={28} />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                🔒 Security Privilege Guard
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                មហាសិទ្ធិម្ចាស់ប្រព័ន្ធប៉ុណ្ណោះ!
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed pt-1">
                {deniedModal.description}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-[11px] text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>តួនាទីបច្ចុប្បន្ន:</span>
                <span className="font-bold text-white uppercase">{currentRole}</span>
              </div>
              <div className="flex justify-between">
                <span>សិទ្ធិប្រតិបត្តិការ:</span>
                <span className="font-bold text-amber-400">View-Only (ត្រឹមតែមើល)</span>
              </div>
              <div className="flex justify-between">
                <span>មហាសិទ្ធិបញ្ជា:</span>
                <span className="font-bold text-rose-400">Super Admin Required</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDeniedModal(null)}
              className="w-full py-3 rounded-2xl bg-[#8B1A1A] hover:bg-[#6b1111] text-white font-bold text-xs transition-all shadow-md cursor-pointer border-none"
            >
              ខ្ញុំបានយល់ច្បាស់ (Acknowledge)
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CONFIRMATION MODAL FOR SUPER ADMIN HIGH-RISK ACTIONS ── */}
      {confirmModal?.show && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#141210] border-2 border-red-500/50 rounded-3xl p-6 text-white shadow-[0_20px_60px_rgba(220,38,38,0.35)] space-y-4">
            
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
              <AlertOctagon size={28} />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                ⚠️ Super Admin Authorization
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed pt-1">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs transition-all cursor-pointer border-none"
              >
                បោះបង់ (Cancel)
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all shadow-md shadow-red-950/50 cursor-pointer border-none"
              >
                យល់ព្រមដំណើរការ (Execute)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
