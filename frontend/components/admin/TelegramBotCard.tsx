"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, CheckCircle2, AlertCircle, RefreshCw, Unlink, ExternalLink, 
  Copy, ShieldCheck, Bell, Smartphone, Layers, Key, Bot, 
  Settings, Check, ArrowRight, Zap, X, ChevronRight, MessageSquare, Info,
  ShoppingBag, Wrench, Clock, ArrowLeft, BarChart3, Tag, ShieldAlert, 
  Calendar, PackageCheck, Terminal, Sliders, CheckSquare
} from "lucide-react";
import { 
  getTelegramStatus, generateTelegramLink, testTelegramNotification, 
  disconnectTelegram, updateTelegramSettings, setupTelegramTopics, 
  pairTelegramGroup, setupCustomerBot, setupStaffBot, generateAdminMiniAppLink,
  triggerDailyReport, triggerWeeklyReport, scanLowStock, TelegramStatus, TelegramPairLink 
} from "@/lib/services/admin.service";

// =============================================================================
// TELEGRAM BOT ARCHITECTURE:
// UNIFIED BOT: @S_TECH_ASSISTANTBOT (Customer Mini App, Chat, Orders, Auth & Staff Alerts)
// =============================================================================
const OFFICIAL_STAFF_BOT_USERNAME = "S_TECH_ASSISTANTBOT";
const OFFICIAL_BOT_USERNAME = OFFICIAL_STAFF_BOT_USERNAME;
const OFFICIAL_CUSTOMER_BOT_USERNAME = "S_TECH_ASSISTANTBOT";

export default function TelegramBotCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingUpTopics, setSettingUpTopics] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncingCustomerBot, setSyncingCustomerBot] = useState(false);
  const [syncingStaffBot, setSyncingStaffBot] = useState(false);
  const [generatingMiniApp, setGeneratingMiniApp] = useState(false);
  const [showBotFatherGuide, setShowBotFatherGuide] = useState(false);
  const [showStaffBotFatherGuide, setShowStaffBotFatherGuide] = useState(false);
  const [pairData, setPairData] = useState<TelegramPairLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Guided Wizard States
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [justConnected, setJustConnected] = useState(false);
  const [showBotDetails, setShowBotDetails] = useState(false);

  // Manual Direct Connect State
  const [manualChatId, setManualChatId] = useState("");
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [manualConnecting, setManualConnecting] = useState(false);

  const [sendingDailyReport, setSendingDailyReport] = useState(false);
  const [sendingWeeklyReport, setSendingWeeklyReport] = useState(false);
  const [scanningStock, setScanningStock] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleTriggerDailyReport = async () => {
    setSendingDailyReport(true);
    try {
      const res = await triggerDailyReport();
      if (res.success) {
        showToast("បានផ្ញើរបាយការណ៍អាជីវកម្មប្រចាំថ្ងៃ (៨ យប់) ទៅ Telegram ជោគជ័យ!");
      } else {
        showToast(res.message || "បរាជ័យក្នុងការផ្ញើរបាយការណ៍", "error");
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការផ្ញើរបាយការណ៍", "error");
    } finally {
      setSendingDailyReport(false);
    }
  };

  const handleTriggerWeeklyReport = async () => {
    setSendingWeeklyReport(true);
    try {
      const res = await triggerWeeklyReport();
      if (res.success) {
        showToast("បានផ្ញើរបាយការណ៍សង្ខេបប្រចាំសប្តាហ៍ទៅ Telegram ជោគជ័យ!");
      } else {
        showToast(res.message || "បរាជ័យក្នុងការផ្ញើរបាយការណ៍", "error");
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការផ្ញើរបាយការណ៍", "error");
    } finally {
      setSendingWeeklyReport(false);
    }
  };

  const handleScanLowStock = async () => {
    setScanningStock(true);
    try {
      const res = await scanLowStock(3);
      if (res.success) {
        showToast(res.message || "បានស្កេនពិនិត្យស្តុកជោគជ័យ!");
      } else {
        showToast(res.message || "បរាជ័យក្នុងការស្កេនស្តុក", "error");
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការស្កេនស្តុក", "error");
    } finally {
      setScanningStock(false);
    }
  };

  const handleDirectConnect = async () => {
    if (!manualChatId.trim()) {
      showToast("សូមបញ្ចូល Telegram Chat ID", "error");
      return;
    }
    setManualConnecting(true);
    try {
      const res = await pairTelegramGroup(manualChatId.trim());
      if (res.success) {
        showToast("Telegram Group បានភ្ជាប់ជោគជ័យ!");
        fetchStatus(true);
      } else {
        showToast(res.message || "បរាជ័យក្នុងការភ្ជាប់", "error");
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "បរាជ័យក្នុងការភ្ជាប់ Telegram Group", "error");
    } finally {
      setManualConnecting(false);
    }
  };

  const handleSyncCustomerBot = async () => {
    setSyncingCustomerBot(true);
    try {
      const res = await setupCustomerBot();
      if (res.success) {
        showToast("បានធ្វើសមកាលកម្ម Commands & Mini App Menu ជោគជ័យ!");
        fetchStatus(false);
      } else {
        showToast(res.error || "បរាជ័យក្នុងការធ្វើសមកាលកម្ម", "error");
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || "បរាជ័យក្នុងការធ្វើសមកាលកម្ម Bot", "error");
    } finally {
      setSyncingCustomerBot(false);
    }
  };

  const handleSyncStaffBot = async () => {
    setSyncingStaffBot(true);
    try {
      const res = await setupStaffBot();
      if (res.success) {
        showToast("បានកំណត់ Commands & Mini App Menu សម្រាប់ Staff Bot ជោគជ័យ!");
        fetchStatus(false);
      } else {
        showToast(res.error || res.message || "បរាជ័យក្នុងការកំណត់ Staff Bot", "error");
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || "បរាជ័យក្នុងការកំណត់ Staff Bot", "error");
    } finally {
      setSyncingStaffBot(false);
    }
  };

  const handleLaunchStaffMiniApp = async (destination: "chat" | "orders" | "dashboard" = "chat") => {
    setGeneratingMiniApp(true);
    try {
      const res = await generateAdminMiniAppLink(destination);
      if (res.success && res.miniapp_url) {
        window.open(res.miniapp_url, "_blank");
        showToast(`⚡ បានបើក ${destination === 'chat' ? 'Live Chat' : 'Orders'} Mini App ជោគជ័យ!`);
      } else {
        showToast("បរាជ័យក្នុងការបង្កើតតំណភ្ជាប់", "error");
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || "បរាជ័យក្នុងការបង្កើតតំណភ្ជាប់", "error");
    } finally {
      setGeneratingMiniApp(false);
    }
  };

  const handleCopyStaffMiniAppLink = async (destination: "chat" | "orders" = "chat") => {
    try {
      const res = await generateAdminMiniAppLink(destination);
      if (res.success && res.miniapp_url) {
        await navigator.clipboard.writeText(res.miniapp_url);
        showToast("✓ បានចម្លងតំណភ្ជាប់ 1-Click Mini App ជោគជ័យ! (អាចផ្ញើជូន Staff ក្នុង Telegram)");
      }
    } catch (e) {
      showToast("បរាជ័យក្នុងការចម្លង", "error");
    }
  };

  const fetchStatus = async (checkNow: boolean = false) => {
    try {
      const data = await getTelegramStatus(checkNow);
      setStatus(data);
      if (data.connected && (pairData || wizardOpen) && !justConnected) {
        setJustConnected(true);
        showToast("Telegram Group បានតភ្ជាប់ជោគជ័យ!");
        if (!data.topics || Object.keys(data.topics).length < 4) {
          setupTelegramTopics().then((res) => {
            if (res.success) {
              getTelegramStatus(false).then(setStatus);
            }
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch telegram status", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(false);
  }, []);

  // Poll for connection while awaiting group pairing
  useEffect(() => {
    if (!pairData || status?.connected) return;
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 1800);
    return () => clearInterval(interval);
  }, [pairData, status?.connected]);

  // Check upon returning from Telegram app to browser tab
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === "visible" && (wizardOpen || pairData) && !status?.connected) {
        fetchStatus(true);
      }
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [wizardOpen, pairData, status?.connected]);

  const handleOneClickConnect = async () => {
    setConnecting(true);
    setJustConnected(false);
    try {
      const res = await generateTelegramLink();
      setPairData(res);
      setWizardOpen(true);
      setWizardStep(1);
      showToast("កំពុងបើកកម្មវិធី Telegram... សូមជ្រើសរើស Group របស់ហាង");

      const tgApp = res.tg_app_url || `tg://resolve?domain=${res.bot_username}&startgroup=${res.pair_code}&admin=manage_topics+change_info+post_messages+edit_messages+delete_messages+pin_messages+promote_members+invite_users`;
      const tgWeb = res.group_url;

      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = tgApp;
      } else {
        try {
          const link = document.createElement("a");
          link.href = tgApp;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          window.open(tgWeb, "_blank");
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "បរាជ័យក្នុងការបង្កើត Link";
      showToast(msg, "error");
    } finally {
      setConnecting(false);
    }
  };

  const handleTestPing = async () => {
    setTesting(true);
    try {
      const res = await testTelegramNotification();
      if (res.success) {
        showToast("សារសាកល្បងត្រូវបានផ្ញើទៅ Telegram Group ជោគជ័យ!");
      } else {
        showToast((res as any).error || res.message || "បរាជ័យក្នុងការផ្ញើសារសាកល្បង", "error");
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || "បរាជ័យក្នុងការផ្ញើ", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleSetupTopics = async () => {
    setSettingUpTopics(true);
    try {
      const res = await setupTelegramTopics();
      if ((res as any).already_exists) {
        showToast("Forum Topics ត្រូវបានរៀបចំរួចរាល់ហើយ ដំណើរការល្អ!");
      } else if (res.success) {
        showToast("Forum Topics ត្រូវបានបង្កើត និងរៀបចំជោគជ័យ!");
        fetchStatus();
      } else {
        showToast(res.message || (res as any).error || "សូមបើកសិទ្ធិ Admin ឲ្យ Bot ជាមុនសិន", "error");
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || "សូមប្រាកដថា Bot ជា Administrator និងបានបើកមុខងារ Topics";
      showToast(msg, "error");
    } finally {
      setSettingUpTopics(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("តើអ្នកពិតជាចង់ផ្តាច់ Bot ចេញពីគ្រុបនេះមែនទេ?")) return;
    setDisconnecting(true);
    try {
      await disconnectTelegram();
      showToast("បានផ្តាច់ Telegram Bot រួចរាល់");
      setStatus((prev) => prev ? { ...prev, connected: false, chat_id: null, chat_title: null } : null);
      setPairData(null);
    } catch (e) {
      showToast("បរាជ័យក្នុងការផ្តាច់", "error");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggle = async (key: keyof TelegramStatus) => {
    if (!status) return;
    const updated = { ...status, [key]: !status[key] };
    setStatus(updated as TelegramStatus);
    try {
      await updateTelegramSettings({ [key]: updated[key] });
      showToast("បានរក្សាទុកការកំណត់");
    } catch (e) {
      showToast("បរាជ័យក្នុងការផ្លាស់ប្តូរ", "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("បានចម្លង Link ជោគជ័យ!");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw size={18} className="animate-spin text-slate-700" />
          <span className="text-xs font-semibold uppercase tracking-wider">កំពុងផ្ទុកព័ត៌មាន Telegram Integration...</span>
        </div>
      </div>
    );
  }

  const botUsername = status?.bot_username || OFFICIAL_BOT_USERNAME;
  const customerBotUsername = status?.customer_bot_username || OFFICIAL_CUSTOMER_BOT_USERNAME;

  return (
    <div className="space-y-6">
      
      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100000] px-4 py-3 rounded-xl shadow-xl text-xs font-semibold text-white flex items-center gap-2.5 ${
          toast.type === 'error' ? 'bg-red-700' : 'bg-slate-900 border border-slate-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} className="text-emerald-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main Enterprise Card Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/[0.04] overflow-hidden">
        
        {/* Enterprise Executive Header Surface */}
        <div className="relative bg-gradient-to-br from-[#060b14] via-[#0b1527] to-[#040810] text-white p-6 sm:p-8 border-b border-sky-500/20 overflow-hidden">
          {/* Decorative ambient glowing lights */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-sky-950 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400 shadow-lg shadow-sky-950/50 ring-4 ring-sky-500/10">
                <Bot size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider text-sky-400 bg-sky-950/80 px-3 py-0.5 rounded-full border border-sky-500/30 flex items-center gap-2 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
                    </span>
                    DISPATCH &amp; FORUM SENTINEL
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                  Telegram Bot Center &amp; Forum Topics
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed font-medium">
                  ប្រព័ន្ធស្វ័យប្រវត្តិនៃការបញ្ជូនដំណឹងការបញ្ជាទិញ (Orders), សេវាជួសជុល (Repairs), ស្តុកទំនិញ (Inventory), និងការតម្រៀបតាម Forum Topics ក្នុង Telegram Group
                </p>
              </div>
            </div>

            {/* Real-time Status Badge */}
            <div className="shrink-0 flex items-center">
              {status?.connected ? (
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-black shadow-lg shadow-emerald-950/50">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </span>
                  <span>Group Connected • Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-black shadow-lg shadow-amber-950/50">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Ready for Setup</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* CASE 1: GROUP CONNECTED */}
          {status?.connected ? (
            <div className="space-y-6">
              
              {/* Connected Group Details Bar */}
              <div className="p-5 sm:p-6 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 via-white to-sky-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/25 ring-4 ring-emerald-500/15">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-mono font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        ACTIVE GROUP
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 mt-1 tracking-tight">
                      {status.chat_title || "S Tech Store Official Team"}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono mt-1.5">
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                        Chat ID: <b className="text-slate-900 font-bold">{status.chat_id}</b>
                      </span>
                      <span>•</span>
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                        Bot: <b className="text-slate-900 font-bold">@{botUsername}</b>
                      </span>
                      {status.connected_at && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500">Connected: {status.connected_at}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={testing}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={14} className={testing ? "animate-spin" : ""} />
                    <span>{testing ? "កំពុងផ្ញើ..." : "ផ្ញើសារសាកល្បង"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-600 text-xs font-bold border-2 border-red-200 hover:border-red-300 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Unlink size={14} />
                    <span>ផ្តាច់ការតភ្ជាប់</span>
                  </button>
                </div>
              </div>

              {/* FORUM TOPICS STATUS & AUTO-CREATE PANEL */}
              <div className="p-5 sm:p-6 rounded-2xl border-2 border-slate-200 bg-white space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                      <Layers size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 m-0">
                        Telegram Forum Topics (ការបែងចែកប្រធានបទស្វ័យប្រវត្តិ)
                      </h3>
                      <p className="text-xs text-slate-500 m-0 mt-0.5 font-medium">
                        សារ Notification នីមួយៗនឹងត្រូវបានតម្រៀបចូលតាម Forum Topic ដាច់ដោយឡែកពីគ្នា
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSetupTopics}
                    disabled={settingUpTopics || Boolean(status?.topics?.orders && status?.topics?.repairs && status?.topics?.stock && status?.topics?.chat)}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                      Boolean(status?.topics?.orders && status?.topics?.repairs && status?.topics?.stock && status?.topics?.chat)
                        ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-200/90 shadow-xs cursor-default"
                        : "bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-md active:scale-95 cursor-pointer"
                    } disabled:opacity-70`}
                  >
                    {Boolean(status?.topics?.orders && status?.topics?.repairs && status?.topics?.stock && status?.topics?.chat) ? (
                      <>
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        <span>ប្រធានបទ Topics រៀបចំរួចរាល់</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={15} className={settingUpTopics ? "animate-spin" : ""} />
                        <span>{settingUpTopics ? "កំពុងរៀបចំ Topics..." : "បង្កើត Topics ស្វ័យប្រវត្តិ"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 4 Topic Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {[
                    {
                      key: "orders",
                      icon: ShoppingBag,
                      title: "ការបញ្ជាទិញថ្មី (Orders)",
                      desc: "វិក្កយបត្រ និងព័ត៌មានដឹកជញ្ជូន",
                      created: Boolean(status?.topics?.orders),
                    },
                    {
                      key: "repairs",
                      icon: Wrench,
                      title: "សេវាជួសជុល (Repairs)",
                      desc: "ប័ណ្ណទទួលឧបករណ៍ និងស្ថានភាព",
                      created: Boolean(status?.topics?.repairs),
                    },
                    {
                      key: "stock",
                      icon: AlertCircle,
                      title: "ការជូនដំណឹងស្តុក (Stock)",
                      desc: "ប្រកាសអាសន្នពេលទំនិញជិតអស់",
                      created: Boolean(status?.topics?.stock),
                    },
                    {
                      key: "chat",
                      icon: MessageSquare,
                      title: "សេវាអតិថិជន (Support)",
                      desc: "សម្រាប់សន្ទនាទូទៅក្នុងក្រុម",
                      created: Boolean(status?.topics?.chat),
                    },
                  ].map((top) => {
                    const TopIcon = top.icon;
                    return (
                      <div key={top.key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-400 flex flex-col justify-between gap-3 shadow-2xs transition-all">
                        <div className="flex items-center justify-between">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                            <TopIcon size={17} />
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            top.created 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {top.created ? "Ready" : "Pending"}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900">{top.title}</div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">{top.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Topics Notice */}
                <div className="p-4 bg-sky-50/80 rounded-xl border border-sky-200/90 text-xs text-slate-700 flex items-start gap-3 leading-relaxed font-medium">
                  <Info size={17} className="text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <b className="font-black text-slate-900">ចំណាំ Topics:</b> គ្រាន់តែបើកមុខងារ <b>Topics</b> ក្នុង Group Settings នោះ Bot នឹងដំណើរការ និងចាប់សិទ្ធិ Manage Topics ដោយស្វ័យប្រវត្តិតែម្តង។
                  </div>
                </div>
              </div>

              {/* Notification Event Toggles */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-slate-700" />
                  <h3 className="text-sm sm:text-base font-black text-slate-900 m-0">
                    ការកំណត់ការជូនដំណឹងស្វ័យប្រវត្តិ (Notification Sentinel)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      key: "notify_orders" as const,
                      icon: ShoppingBag,
                      title: "ការបញ្ជាទិញថ្មី (Orders)",
                      desc: "ផ្ញើព័ត៌មានលម្អិតពីអតិថិជន និងទំនិញភ្លាមៗពេលមានការកុម្ម៉ង់",
                      value: status.notify_orders,
                    },
                    {
                      key: "notify_low_stock" as const,
                      icon: AlertCircle,
                      title: "ទំនិញជិតអស់ស្តុក (Stock Alert)",
                      desc: "ប្រកាសអាសន្នពេលទំនិញសល់ ≤ ៣ គ្រឿង ឬអស់ពីស្តុកភ្លាមៗ",
                      value: status.notify_low_stock,
                    },
                    {
                      key: "notify_auto_reports" as const,
                      icon: BarChart3,
                      title: "របាយការណ៍ស្វ័យប្រវត្តិ (៨ យប់)",
                      desc: "គណនាផ្ញើសង្ខេបអ្នកចូលមើល & ការលក់ (ច័ន្ទ-សៅរ៍) និងរបាយការណ៍សប្តាហ៍ (អាទិត្យ)",
                      value: status.notify_auto_reports,
                    },
                    {
                      key: "notify_promotions" as const,
                      icon: Tag,
                      title: "ប្រូម៉ូសិន & បញ្ចុះតម្លៃ",
                      desc: "ជូនដំណឹងពេលបង្កើតកូដបញ្ចុះតម្លៃ ឬកម្មវិធីប្រូម៉ូសិនទំនិញថ្មីៗ",
                      value: status.notify_promotions,
                    },
                    {
                      key: "notify_errors" as const,
                      icon: ShieldAlert,
                      title: "បញ្ហាប្រព័ន្ធ (Errors Sentinel)",
                      desc: "ជូនដំណឹងភ្លាមៗទៅកាន់ Topic Errors ពេលប្រព័ន្ធជួបបញ្ហាបច្ចេកទេស",
                      value: status.notify_errors,
                    },
                    {
                      key: "notify_repairs" as const,
                      icon: Wrench,
                      title: "សំណើជួសជុល (Repairs)",
                      desc: "ជូនដំណឹងពេលមានអតិថិជនដាក់សំណើសុំជួសជុលឧបករណ៍",
                      value: status.notify_repairs,
                    },
                    {
                      key: "notify_shifts" as const,
                      icon: Clock,
                      title: "វេនការងារបុគ្គលិក",
                      desc: "ជូនដំណឹងអំពីកាលវិភាគផ្លាស់ប្តូរវេនរបស់បុគ្គលិក",
                      value: status.notify_shifts,
                    },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleToggle(item.key)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          item.value 
                            ? 'border-slate-800 bg-white shadow-sm hover:border-slate-900' 
                            : 'border-slate-200 bg-slate-50/50 opacity-70 hover:opacity-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            item.value ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            <ItemIcon size={16} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">
                              {item.desc}
                            </div>
                          </div>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${item.value ? 'bg-slate-900' : 'bg-slate-300'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 shadow-xs transition-all ${item.value ? 'left-5' : 'left-1'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* QUICK ACTIONS & INSTANT REPORT TESTERS */}
                <div className="mt-5 p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                        សកម្មភាពរហ័ស &amp; ការធ្វើតេស្តរបាយការណ៍ (Quick Actions)
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        ផ្ញើរបាយការណ៍ ឬស្កេនពិនិត្យស្តុកទំនិញភ្លាមៗដោយមិនចាំបាច់រង់ចាំដល់ម៉ោងកំណត់
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={handleTriggerDailyReport}
                      disabled={sendingDailyReport}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <BarChart3 size={15} className={sendingDailyReport ? "animate-spin text-white" : "text-white"} />
                      <span>ផ្ញើរបាយការណ៍ថ្ងៃនេះ (Daily)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerWeeklyReport}
                      disabled={sendingWeeklyReport}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Calendar size={15} className={sendingWeeklyReport ? "animate-spin text-white" : "text-white"} />
                      <span>ផ្ញើរបាយការណ៍សប្តាហ៍ (Weekly)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleScanLowStock}
                      disabled={scanningStock}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-300 hover:border-slate-400 text-slate-900 text-xs font-black transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <PackageCheck size={15} className={scanningStock ? "animate-spin text-slate-700" : "text-slate-700"} />
                      <span>ស្កេនទំនិញជិតអស់ស្តុក (≤ 3)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CASE 2: NOT CONNECTED (1-CLICK FLOW) */
            <div className="space-y-6">
              
              {/* Main 1-Click Connect Panel */}
              <div className="p-6 sm:p-8 rounded-3xl border-2 border-sky-300/80 bg-gradient-to-br from-sky-50/80 via-white to-blue-50/40 shadow-xl shadow-sky-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="max-w-2xl space-y-3.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-mono font-black uppercase tracking-wider border border-sky-200">
                    <Smartphone size={13} />
                    <span>1-CLICK FAST CONNECT</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    ភ្ជាប់ Telegram Bot ទៅកាន់ Telegram Group របស់ហាង
                  </h3>

                  {/* Clean 2-Step Straight to the Point Guide */}
                  <div className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0088cc] text-white flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                      <span>ចុចប៊ូតុងខាងក្រោមដើម្បី <b>Add Bot (@{botUsername}) ចូល Group</b> ដែលទើបបង្កើត</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                      <span>កុំភ្លេចចូល <b>Group Settings → បើកមុខងារ &quot;Topics&quot; (Turn ON Topics)</b> ឱ្យហើយផង</span>
                    </div>
                  </div>

                  <p className="text-slate-500 text-xs leading-relaxed font-medium pt-0.5">
                    💡 គ្រាន់តែចុច Add ទៅជាការស្រេច មិនបាច់រៀបចំសិទ្ធិស្មុគស្មាញទេ ឱ្យតែ Group បើក Topics នោះ Bot នឹងចាប់ auto ទទួលសិទ្ធិ Manage Topics និងរៀបចំជូនភ្លាមៗ!
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleOneClickConnect}
                      disabled={connecting}
                      className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0088cc] via-[#009beb] to-[#0077b5] hover:brightness-110 text-white text-sm sm:text-base font-black shadow-xl shadow-sky-500/30 hover:shadow-sky-500/50 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      <Send size={16} className={connecting ? "animate-spin" : ""} />
                      <span>{connecting ? "កំពុងបើក Telegram..." : "ចុចទីនេះដើម្បី Add Bot ចូល Group"}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border-2 border-sky-200 shadow-md flex flex-col items-center justify-center text-center shrink-0 w-full md:w-56">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center mb-2 shadow-lg shadow-sky-500/30">
                    <Send size={26} />
                  </div>
                  <span className="text-sm font-black text-slate-900">Direct Connect</span>
                  <span className="text-xs font-mono font-bold text-sky-700 mt-0.5">
                    @{botUsername}
                  </span>
                </div>
              </div>

              {/* Direct Connect by Group ID (Drawer) */}
              <div className="p-5 rounded-2xl border-2 border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setShowManualConnect(!showManualConnect)}
                  className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-950 bg-transparent border-none cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Key size={16} className="text-slate-600" />
                    <span>ជម្រើសភ្ជាប់ដោយផ្ទាល់តាមរយៈ Group Chat ID (Direct Connect)</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono font-bold">{showManualConnect ? "បិទវិញ ▲" : "បើកមើល ▼"}</span>
                </button>

                {showManualConnect && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                    {/* Short & Clear Guide to Get Telegram Group Chat ID */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-sky-50/80 border border-sky-200/90 text-xs text-slate-700 space-y-2 leading-relaxed font-medium">
                      <div className="flex items-center gap-2 font-black text-slate-900">
                        <Info size={15} className="text-[#0088cc] shrink-0" />
                        <span>របៀបយក Chat ID របស់ Telegram Group ងាយៗ៖</span>
                      </div>
                      <div className="space-y-1.5 pl-5 list-disc text-slate-600 text-[11.5px]">
                        <div>
                          <b>វិធីទី១</b>៖ Forward សារណាមួយពី Group របស់បងទៅកាន់ Bot <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-[#0088cc] font-bold underline">@userinfobot</a> ឬ <a href="https://t.me/RawDataBot" target="_blank" rel="noreferrer" className="text-[#0088cc] font-bold underline">@RawDataBot</a> នោះវានឹងបង្ហាញលេខ <b>Id</b> ភ្លាមៗ (ឧ. <code>-100xxxxxxxxxx</code>)។
                        </div>
                        <div>
                          <b>វិធីទី២</b>៖ ចុច Copy Link លើសារណាមួយក្នុង Group (ឧ. <code>https://t.me/c/2481234567/1</code> → លេខ Chat ID គឺគ្រាន់តែថែម <code>-100</code> នៅខាងមុខ គឺ <code>-1002481234567</code>)។
                        </div>
                      </div>
                      <div className="text-[11px] text-sky-800 font-bold bg-white/70 px-2.5 py-1 rounded-lg border border-sky-200/60 inline-block">
                        💡 ចំណាំ៖ Chat ID របស់ Telegram Group តែងតែចាប់ផ្តើមដោយសញ្ញាដក និងលេខ ១០០ (<code>-100...</code>)
                      </div>
                    </div>

                    {/* Chat ID Input & Connect Action */}
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <label className="block text-[11px] font-black text-slate-700 uppercase">
                          Telegram Chat ID
                        </label>
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <Check size={12} /> Bot នឹងចាប់ឈ្មោះ Group ដោយស្វ័យប្រវត្តិ (Auto-detect)
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={manualChatId}
                            onChange={(e) => setManualChatId(e.target.value)}
                            placeholder="-100xxxxxxxxxx"
                            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-mono font-bold focus:border-slate-900 outline-none transition-colors"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleDirectConnect}
                          disabled={manualConnecting}
                          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                        >
                          <Zap size={14} className={manualConnecting ? "animate-spin" : ""} />
                          <span>{manualConnecting ? "កំពុងភ្ជាប់..." : "ភ្ជាប់ Group ភ្លាមៗ (Instant Connect)"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Waiting Radar Panel */}
              {pairData && !status?.connected && (
                <div className="p-6 sm:p-7 rounded-2xl border-2 border-slate-900 bg-white shadow-xl space-y-5">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs sm:text-sm font-black text-slate-900">
                        កំពុងរង់ចាំការតភ្ជាប់ពី Telegram Group (Radar Active)
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                      Pair Code: {pairData.pair_code}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600 leading-relaxed font-medium m-0">
                        សូមបើក Telegram ហើយ Add Bot <b>@{botUsername}</b> ចូល Group (កុំភ្លេចបើក Topics ក្នុង Group Settings)។
                      </p>

                      <div className="flex flex-col gap-2.5">
                        <button
                          type="button"
                          onClick={() => setWizardOpen(true)}
                          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <span>បើកមើលជំហានងាយៗ (2-Step Guide)</span>
                          <ExternalLink size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(pairData.group_url)}
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 transition-all active:scale-95 cursor-pointer"
                        >
                          <Copy size={14} />
                          <span>{copied ? "បានចម្លងរួចរាល់!" : "Copy Direct Invitation Link"}</span>
                        </button>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed font-medium flex items-start gap-2.5">
                        <Info size={15} className="text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <b className="font-black text-slate-900">ចំណាំ:</b> ឱ្យតែ Group បើក Topics នោះ Bot នឹងចាប់ auto ទទួលសិទ្ធិ Manage Topics និងតភ្ជាប់ក្នុងរយៈពេល ២ វិនាទី!
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 text-white text-center space-y-3 shadow-lg">
                      <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center mx-auto shadow-inner">
                        <RefreshCw size={22} className="animate-spin text-sky-400" />
                      </div>
                      <div className="text-sm font-black text-white">
                        Radar Active — Auto Detecting...
                      </div>
                      <div className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed font-medium">
                        ផ្ទាំងនេះកំពុងត្រួតពិនិត្យស្វ័យប្រវត្តិ។ នៅពេល Bot ចូលដល់ក្នុង Group វានឹងប្តូរទៅជា &quot;Connected&quot; ដោយស្វ័យប្រវត្តិ។
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ⚡ NEW ENTERPRISE FEATURE: ADMIN & STAFF TELEGRAM MINI APP OPTION */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="relative rounded-3xl border-2 border-sky-200 hover:border-sky-400 bg-gradient-to-br from-white via-sky-50/30 to-indigo-50/20 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all space-y-6 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-sky-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase text-sky-800 bg-sky-100 px-3 py-1 rounded-lg border border-sky-200">
                    ⚡ NEW OPTION • ADMIN &amp; STAFF MINI APP
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 1-Click Instant Access
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0 pt-1">
                  Telegram Mini App សម្រាប់ Admin &amp; Staff (Live Chat &amp; Hub)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed m-0">
                  ផ្តល់ជម្រើសឱ្យ Admin និងបុគ្គលិកអាចចុច ១-Click ដើម្បីបើក Live Chat ឆ្លើយតបអតិថិជន ឬគ្រប់គ្រង Orders ផ្ទាល់ក្នុង Telegram ដោយស្វ័យប្រវត្តិនូវ Authenticated Session មិនចាំបាច់ Log in ឡើយ!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncStaffBot}
                  disabled={syncingStaffBot}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white transition-all shadow-md shadow-sky-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Bot size={15} />
                  <span>{syncingStaffBot ? "កំពុង Sync..." : "Sync Staff Mini App Menu"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStaffBotFatherGuide(!showStaffBotFatherGuide)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-all active:scale-95 cursor-pointer"
                >
                  <Terminal size={14} />
                  <span>{showStaffBotFatherGuide ? "បិទ Guide" : "BotFather Guide"}</span>
                </button>
              </div>
            </div>

            {/* Quick 1-Click Launchers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Launcher 1: Live Chat Mini App */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-sky-100/90 shadow-2xs hover:border-sky-300 transition-all flex flex-col justify-between gap-4 group">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 m-0">Live Chat Mini App</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      បើកផ្ទាំងឆ្លើយតបអតិថិជន Real-time ភ្លាមៗក្នុង Telegram (Auto-Select Conversation)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleLaunchStaffMiniApp("chat")}
                    disabled={generatingMiniApp}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Zap size={13} className="text-amber-300" />
                    <span>បើក Live Chat ភ្លាម</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyStaffMiniAppLink("chat")}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95"
                    title="ចម្លងតំណភ្ជាប់ 1-Click"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {/* Launcher 2: Orders Mini App */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-sky-100/90 shadow-2xs hover:border-sky-300 transition-all flex flex-col justify-between gap-4 group">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 m-0">Orders Management Mini App</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      ពិនិត្យការបញ្ជាទិញថ្មីៗ វិក្កយបត្រ និងរៀបចំការដឹកជញ្ជូនរហ័សក្នុង Telegram
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleLaunchStaffMiniApp("orders")}
                    disabled={generatingMiniApp}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <PackageCheck size={14} />
                    <span>បើក Orders ភ្លាម</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyStaffMiniAppLink("orders")}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95"
                    title="ចម្លងតំណភ្ជាប់ 1-Click"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {/* Launcher 3: Telegram Staff Bot Launcher */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-sky-100/90 shadow-2xs hover:border-sky-300 transition-all flex flex-col justify-between gap-4 group">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0088cc] to-sky-700 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 m-0">Telegram Staff Bot Direct</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      បើកកម្មវិធី Telegram ផ្ទាល់ទៅកាន់ Staff Bot (@{botUsername}) ជាមួយ Mini App Menu
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={`https://t.me/${botUsername}?start=miniapp_chat`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#0088cc] hover:bg-[#0077b5] text-white transition-all shadow-sm active:scale-95 no-underline"
                  >
                    <ExternalLink size={14} />
                    <span>បើកក្នុង Telegram</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Staff BotFather Guide */}
            {showStaffBotFatherGuide && (
              <div className="p-5 rounded-2xl bg-[#090e1a] text-slate-200 border-2 border-sky-900/50 space-y-3.5 shadow-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal size={17} className="text-sky-400" />
                    <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider m-0">
                      Staff Bot BotFather Commands Reference (@{botUsername})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStaffBotFatherGuide(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="font-bold text-sky-400">1. /setmenubutton (Menu Button)</div>
                    <div className="bg-black/70 p-2.5 rounded-lg border border-slate-800 space-y-1 text-slate-300 select-all">
                      <div>URL: <span className="text-emerald-400 font-bold">https://www.s-tech-store.tech/km/rok-mix-khernh/chat</span></div>
                      <div>Button Text: <span className="text-sky-300 font-bold">⚡ S Tech Live Chat</span></div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="font-bold text-sky-400">2. /setcommands (Staff Commands)</div>
                    <div className="bg-black/70 p-2.5 rounded-lg border border-slate-800 text-slate-300 select-all leading-relaxed max-h-24 overflow-y-auto">
                      chat - Live Chat Support Mini App<br/>
                      orders - Manage Orders Mini App<br/>
                      dashboard - Admin Dashboard Mini App<br/>
                      stock - Scan Low Stock Items<br/>
                      report - Daily Business Summary Report<br/>
                      start - Staff Menu and Mini App Hub
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 🤖 COLLAPSIBLE DUAL BOTS & BOTFATHER REFERENCE (HIDDEN BY DEFAULT AS ADMIN REQUESTED) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden transition-all shadow-2xs">
            <button
              type="button"
              onClick={() => setShowBotDetails(!showBotDetails)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors cursor-pointer bg-transparent border-none"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-sky-400 flex items-center justify-center shrink-0 shadow-md shadow-slate-900/10">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      ព័ត៌មានលម្អិត Telegram Bots ទាំង២ (Bot 01 &amp; Bot 02)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold">
                      Advanced
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium m-0 mt-0.5">
                    @{botUsername} (Staff Bot) &amp; @{customerBotUsername} (Customer &amp; Mini App Bot)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <span>{showBotDetails ? "លាក់ព័ត៌មាន Bot" : "ចុចមើលព័ត៌មាន Bot"}</span>
                <span className="text-[11px] text-slate-400 font-mono">{showBotDetails ? "▲" : "▼"}</span>
              </div>
            </button>

            {showBotDetails && (
              <div className="p-5 sm:p-6 border-t border-slate-200 bg-white space-y-5 animate-in fade-in slide-in-from-top-2">
                {/* DUAL BOT ARCHITECTURE SYSTEM */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  
                  {/* BOT 1: STAFF & ORDER NOTIFICATIONS SENTINEL */}
                  <div className="relative rounded-2xl border-2 border-slate-200 hover:border-sky-400/80 bg-gradient-to-b from-white via-sky-50/20 to-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />

                    <div>
                      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] font-mono font-black uppercase text-sky-800 bg-sky-100 px-3 py-1 rounded-lg border border-sky-200">
                            BOT 01 / STAFF DISPATCH
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 font-mono">
                          Group Alerts &amp; Topics
                        </span>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-sky-950 text-sky-400 flex items-center justify-center shrink-0 shadow-md shadow-sky-950/20 ring-4 ring-sky-500/10">
                          <Send size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-tight">
                              @{botUsername}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" /> Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1.5">
                            ទទួលបន្ទុកបាញ់ Alert ការបញ្ជាទិញថ្មី (Orders), ជួសជុល (Repairs), ស្តុកទំនិញ (Stock), និង Chat ចូលក្នុង Telegram Group
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                      <span className="font-bold text-slate-700">
                        {status?.connected ? `ភ្ជាប់ទៅ Group: ${status.chat_title || 'Store Team'}` : 'រង់ចាំការភ្ជាប់ទៅកាន់ Group'}
                      </span>
                      <a
                        href={`https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm active:scale-95 no-underline shrink-0"
                      >
                        <ExternalLink size={13} />
                        <span>បើកមើល Bot 1</span>
                      </a>
                    </div>
                  </div>

                  {/* BOT 2: CUSTOMER ASSISTANT & MINI APP BOT */}
                  <div className="relative rounded-2xl border-2 border-slate-200 hover:border-indigo-400/80 bg-gradient-to-b from-white via-indigo-50/20 to-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                    <div>
                      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] font-mono font-black uppercase text-indigo-800 bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200">
                            BOT 02 / CUSTOMER ASSISTANT
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/80 font-mono">
                          Mini App &amp; Customer Auth
                        </span>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-950 to-purple-950 text-purple-300 flex items-center justify-center shrink-0 shadow-md shadow-purple-950/20 ring-4 ring-purple-500/10">
                          <Bot size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-tight">
                              @{customerBotUsername}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" /> 11 Commands &amp; Mini App
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1.5">
                            ទទួលបន្ទុក Private Chat អតិថិជន, 1-Click Login, បើក Mini App, ពិនិត្យកាបូបលុយ, S-Coins, និងតាមដាន Orders
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3.5 border-t border-slate-100 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSyncCustomerBot}
                          disabled={syncingCustomerBot}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                          <RefreshCw size={13} className={syncingCustomerBot ? "animate-spin" : ""} />
                          <span>{syncingCustomerBot ? "កំពុង Sync..." : "Sync Commands & Menu"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBotFatherGuide(!showBotFatherGuide)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition-all active:scale-95 cursor-pointer"
                        >
                          <Terminal size={13} />
                          <span>{showBotFatherGuide ? "បិទ Guide" : "BotFather Guide"}</span>
                        </button>
                      </div>

                      <a
                        href={`https://t.me/${customerBotUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-purple-100/70 hover:bg-purple-100 text-purple-900 border border-purple-300 transition-all active:scale-95 no-underline shrink-0"
                      >
                        <ExternalLink size={13} />
                        <span>បើក Bot 2</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* BOTFATHER COMMANDS DOCUMENTATION (CLEAN DEVELOPER STYLE) */}
                {showBotFatherGuide && (
                  <div className="p-6 rounded-2xl bg-[#090e1a] text-slate-200 border-2 border-indigo-900/50 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <Terminal size={18} className="text-indigo-400" />
                        <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider m-0">
                          BotFather Configuration Reference (@{customerBotUsername})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBotFatherGuide(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-medium m-0">
                      ប្រព័ន្ធបានកំណត់ Commands និង Menu Button ដោយស្វ័យប្រវត្តិតាមរយៈ Telegram API រួចរាល់។ ប្រសិនបើចង់កំណត់ដោយផ្ទាល់ក្នុង @BotFather សូមប្រើប្រាស់តម្លៃខាងក្រោម៖
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Step 1: Menu Button */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-slate-200">1. /setmenubutton</span>
                          <span className="text-indigo-400 font-bold text-[10px] uppercase">WEB APP BUTTON</span>
                        </div>
                        <div className="text-[11px] font-mono bg-black/70 p-3 rounded-lg border border-slate-800 space-y-1 text-slate-300">
                          <div>URL: <span className="text-emerald-400 font-bold select-all">https://www.s-tech-store.tech</span></div>
                          <div>Button Text: <span className="text-sky-300 font-bold select-all">S Tech Store</span></div>
                        </div>
                      </div>

                      {/* Step 2: Commands */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-slate-200">2. /setcommands</span>
                          <span className="text-indigo-400 font-bold text-[10px] uppercase">COMMANDS LIST</span>
                        </div>
                        <div className="text-[10px] font-mono bg-black/70 p-3 rounded-lg border border-slate-800 max-h-36 overflow-y-auto text-slate-300 leading-relaxed select-all">
                          start - Main Menu and Mini App Launcher<br/>
                          shop - Browse Laptops, PC, and Components<br/>
                          orders - Track Orders and History<br/>
                          wallet - Check Balance and Top-up<br/>
                          points - S-Coins and VIP Loyalty<br/>
                          promo - Active Promotions and Discounts<br/>
                          repair - Hardware Repair Services<br/>
                          ask - Frequently Asked Questions<br/>
                          contact - Store Information and Hotline<br/>
                          help - User Manual and Support<br/>
                          unlink - Disconnect Telegram Account
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MASTER UX GUIDED CONNECT MODAL */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-slate-200 overflow-hidden relative max-h-[90vh] flex flex-col">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setWizardOpen(false);
                if (status?.connected) setPairData(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* If connected -> SUCCESS SCREEN */}
            {status?.connected ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-black uppercase tracking-wider mb-2 border border-emerald-300">
                    <CheckSquare size={13} />
                    <span>Connected Successfully</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Telegram Group &amp; Bot បានភ្ជាប់ជោគជ័យ
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed font-medium">
                    Bot <b>@{botUsername}</b> ត្រូវបានភ្ជាប់ជាមួយគ្រុប <b>{status.chat_title || "Team Group"}</b> រួចរាល់។
                  </p>
                </div>

                {/* Group Details Strip */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left font-mono text-xs text-slate-700 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Group Name:</span>
                    <span className="font-bold text-slate-900">{status.chat_title || "S Tech Store Group"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Chat ID:</span>
                    <span className="font-bold text-slate-900">{status.chat_id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-emerald-600 font-bold">Active &amp; Listening 24/7</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={testing}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={14} className={testing ? "animate-spin" : ""} />
                    <span>{testing ? "កំពុងផ្ញើ..." : "ផ្ញើសារសាកល្បងទៅ Group"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWizardOpen(false);
                      setPairData(null);
                    }}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-slate-200"
                  >
                    <Check size={14} />
                    <span>រួចរាល់ • បិទផ្ទាំង</span>
                  </button>
                </div>
              </div>
            ) : (
              /* AWAITING CONNECTION GUIDED RADAR */
              <div className="space-y-4 overflow-y-auto pr-1">
                <div className="text-center pt-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-[11px] font-mono font-black uppercase tracking-wider mb-2 border border-sky-200">
                    <Smartphone size={13} />
                    <span>2-STEP FAST CONNECT</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    របៀបភ្ជាប់ Telegram Bot ទៅកាន់គ្រុប
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed font-medium">
                    គ្រាន់តែ Add Bot ចូល Group និងបើកមុខងារ Topics ក្នុង Group Settings ជាការស្រេច
                  </p>
                </div>

                {/* Step Tabs Navigation (2 Steps) */}
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className={`flex-1 py-2 px-2 rounded-lg transition-all cursor-pointer ${
                      wizardStep === 1 ? "bg-white text-slate-900 shadow-sm font-black" : "bg-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    1. Add Bot ចូល Group
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className={`flex-1 py-2 px-2 rounded-lg transition-all cursor-pointer ${
                      wizardStep === 2 ? "bg-white text-slate-900 shadow-sm font-black" : "bg-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    2. បើក Topics ក្នុង Group
                  </button>
                </div>

                {/* Step Content */}
                {wizardStep === 1 && (
                  <div className="space-y-3.5">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                      <div className="font-black text-slate-900 flex items-center gap-2">
                        <Smartphone size={16} className="text-slate-700" />
                        <span>ជំហានទី១: បើក Telegram ហើយ Add Bot ចូល Group ដែលទើបបង្កើត</span>
                      </div>
                      <p className="m-0 leading-relaxed font-medium">
                        ចុចប៊ូតុងខាងក្រោមដើម្បីជ្រើសរើស Group របស់ហាង ហើយចុច Add ទៅជាការស្រេច (លេខកូដ Pairing Code <code>{pairData?.pair_code}</code> ត្រូវបានភ្ជាប់ស្រាប់)។
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <a
                        href={pairData?.tg_app_url || pairData?.group_url || `https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 no-underline"
                      >
                        <Smartphone size={15} />
                        <span>បើកក្នុង Telegram App (@{botUsername})</span>
                        <ExternalLink size={14} />
                      </a>

                      {pairData?.group_url && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pairData.group_url)}
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 transition-all active:scale-95 cursor-pointer"
                        >
                          <Copy size={13} />
                          <span>{copied ? "បានចម្លងរួចរាល់!" : "Copy Direct Invitation Link"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-3.5">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                      <div className="font-black text-slate-900 flex items-center gap-2">
                        <Layers size={16} className="text-slate-700" />
                        <span>ជំហានទី២: បើកមុខងារ Topics ក្នុង Group Settings</span>
                      </div>
                      <p className="m-0 leading-relaxed font-medium">
                        ដើម្បីឱ្យ Telegram Group មាន Forum Topics ស្វ័យប្រវត្តិតាមផ្នែកនីមួយៗ៖
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs text-slate-700 font-medium">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                        <div>ចុចលើឈ្មោះ Group (Group Profile) → ចុចលើសញ្ញា Edit (<b>Edit</b>)</div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                        <div>រកមើលពាក្យ <b>Topics</b> រួចចុចបើក (<b>Turn ON</b>)</div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                        <div>ចុច <b>Done / Save</b> រួចរាល់!</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed font-medium">
                      💡 <b>រួចរាល់ជាការស្រេច!</b> មិនបាច់រៀបចំសិទ្ធិបន្ថែមឱ្យឈឺក្បាលទេ ឱ្យតែ Group បើក Topics នោះ Bot នឹងចាប់ auto ទទួលសិទ្ធិ Manage Topics និងរៀបចំ Forum Topics ជូនភ្លាមៗ។
                    </div>
                  </div>
                )}

                {/* Radar Real-time Strip */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <div>
                      <div className="text-xs font-black text-white">
                        Radar Active • Auto-Detecting...
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        កំពុងរង់ចាំ Bot ចូលគ្រុប (ត្រួតពិនិត្យរៀងរាល់ 1.8 វិនាទី)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-sky-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                    {pairData?.pair_code}
                  </span>
                </div>

                {/* Footer Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    disabled={wizardStep === 1}
                    className="px-4 py-2 rounded-xl text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <ArrowLeft size={13} />
                    <span>ត្រឡប់</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    disabled={wizardStep === 2}
                    className="px-4 py-2 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>បន្ទាប់</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
