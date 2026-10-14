"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, CheckCircle2, AlertCircle, RefreshCw, Unlink, ExternalLink, 
  Copy, ShieldCheck, Bell, Smartphone, Sparkles, Layers, Key, Bot, 
  Settings, Check, ArrowRight, Zap, QrCode, X, ChevronRight, MessageSquare, Info,
  ShoppingBag, Wrench, Clock, ArrowLeft
} from "lucide-react";
import { 
  getTelegramStatus, generateTelegramLink, testTelegramNotification, 
  disconnectTelegram, updateTelegramSettings, setupTelegramTopics, 
  pairTelegramGroup, TelegramStatus, TelegramPairLink 
} from "@/lib/services/admin.service";

const OFFICIAL_BOT_USERNAME = "s_tech_storeBot";

export default function TelegramBotCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingUpTopics, setSettingUpTopics] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [pairData, setPairData] = useState<TelegramPairLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Master UX Guided Wizard States
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [justConnected, setJustConnected] = useState(false);

  // Manual Direct Connect State
  const [manualChatId, setManualChatId] = useState("");
  const [manualChatTitle, setManualChatTitle] = useState("");
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [manualConnecting, setManualConnecting] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDirectConnect = async () => {
    if (!manualChatId.trim()) {
      showToast("សូមបញ្ចូល Telegram Chat ID", "error");
      return;
    }
    setManualConnecting(true);
    try {
      const res = await pairTelegramGroup(manualChatId.trim(), undefined, manualChatTitle.trim() || "Store Group");
      if (res.success) {
        showToast("Telegram Group បានភ្ជាប់ជោគជ័យ ១០០%!");
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

  const fetchStatus = async (checkNow: boolean = false) => {
    try {
      const data = await getTelegramStatus(checkNow);
      setStatus(data);
      if (data.connected && (pairData || wizardOpen) && !justConnected) {
        setJustConnected(true);
        setWizardStep(4); // Celebration Success Step
        showToast("Telegram Group បានតភ្ជាប់ ១០០%!");
        // Auto trigger setup topics if not all created yet
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

  // Poll for connection while awaiting group pairing (Fast 1.8s radar polling with ?check_now=1)
  useEffect(() => {
    if (!pairData || status?.connected) return;
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 1800);
    return () => clearInterval(interval);
  }, [pairData, status?.connected]);

  // Snappy 0ms check upon returning from Telegram app to the browser tab
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

  // Master UX 1-Click Connect (Opens Telegram App directly with pre-selected Admin & Topics permissions)
  const handleOneClickConnect = async () => {
    setConnecting(true);
    setJustConnected(false);
    try {
      const res = await generateTelegramLink();
      setPairData(res);
      setWizardOpen(true);
      setWizardStep(1);
      showToast("កំពុងបើកកម្មវិធី Telegram... សូមជ្រើសរើស Group របស់ហាង");

      // Auto-launch Telegram App directly via non-blocking link so this web tab remains alive and active
      const tgApp = res.tg_app_url || `tg://resolve?domain=${res.bot_username}&startgroup=${res.pair_code}&admin=manage_topics+change_info+post_messages+edit_messages+delete_messages+pin_messages+promote_members+invite_users`;
      const tgWeb = res.group_url;

      // On mobile devices (iOS / Android), direct navigation bypasses browser popup blockers cleanly
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
        showToast("✓ សារសាកល្បងត្រូវបានផ្ញើទៅ Telegram Group ជោគជ័យ!");
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
        showToast("✓ Forum Topics ត្រូវបានរៀបចំរួចរាល់ហើយ ដំណើរការល្អ!");
      } else if (res.success) {
        showToast("✓ Forum Topics ត្រូវបានបង្កើត និងរៀបចំជោគជ័យ!");
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
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex items-center justify-center min-h-[220px]">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw size={20} className="animate-spin text-[#0088cc]" />
          <span className="text-sm font-semibold">កំពុងផ្ទុកព័ត៌មាន Telegram Bot...</span>
        </div>
      </div>
    );
  }

  const botUsername = status?.bot_username || OFFICIAL_BOT_USERNAME;

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-md overflow-hidden relative">
      
      {/* Non-overlapping Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm text-white flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        } animate-in fade-in slide-in-from-bottom-4`}>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0088cc] via-[#0077b5] to-[#123970] p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-sky-300/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-lg">
              <Send size={30} className="text-white fill-white/20" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/25 text-[11px] font-extrabold text-sky-100 mb-1.5">
                <Sparkles size={12} className="text-amber-300" />
                <span>ភ្ជាប់ Group ស្វ័យប្រវត្ត (1-Click Connect)</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white m-0 tracking-tight leading-tight">
                Telegram Bot Notifications & Forum Topics
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1 leading-relaxed">
                ទទួលការជូនដំណឹងពីការបញ្ជាទិញថ្មី (New Orders) និងគ្រប់គ្រងតាម Forum Topics ស្វ័យប្រវត្តក្នុង Telegram Group
              </p>
            </div>
          </div>

          {/* Real-time Status Badge */}
          <div className="shrink-0 flex items-center">
            {status?.connected ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/25 backdrop-blur-md border border-emerald-400/50 text-emerald-100 text-xs sm:text-sm font-black shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected • Group Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500/20 backdrop-blur-md border border-sky-300/40 text-sky-100 text-xs sm:text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-300 animate-ping" />
                <span>Bot Ready • 1-Click Connect</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-8 flex flex-col gap-6">

        {/* ── STORE BOT VERIFIED IDENTITY STRIP ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50/80 via-white to-gray-50 border border-sky-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0088cc] text-white flex items-center justify-center shrink-0 shadow-md">
              <Bot size={26} />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-extrabold uppercase tracking-wider">
                Official Store Bot
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-black text-gray-900 font-mono">
                  @{botUsername}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 size={12} className="text-emerald-600" /> Pre-Configured & Verified
                </span>
              </div>
            </div>
          </div>

          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-gray-100 text-[#0088cc] border border-sky-200 transition-colors shadow-xs no-underline shrink-0"
          >
            <ExternalLink size={13} />
            <span>ពិនិត្យមើល Bot លើ Telegram</span>
          </a>
        </div>

        {/* ── CASE 1: GROUP CONNECTED ── */}
        {status?.connected ? (
          <div className="flex flex-col gap-6">
            
            {/* Connected Group Details Box */}
            <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <CheckCircle2 size={26} />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Connected Telegram Group
                  </div>
                  <div className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
                    {status.chat_title || "S Tech Store Official Team"}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1.5 font-mono">
                    <span>Chat ID: <b>{status.chat_id}</b></span>
                    <span>•</span>
                    <span>Bot: <b>@{botUsername}</b></span>
                    {status.connected_at && (
                      <>
                        <span>•</span>
                        <span>ភ្ជាប់នៅ: {status.connected_at}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={testing}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  <Send size={15} className={testing ? "animate-spin" : ""} />
                  <span>{testing ? "កំពុងផ្ញើ..." : "ផ្ញើសារសាកល្បង"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs sm:text-sm font-bold border border-red-200 transition-all cursor-pointer disabled:opacity-50"
                  title="ផ្តាច់ Bot ចេញពីគ្រុបនេះ"
                >
                  <Unlink size={15} />
                  <span>ផ្តាច់ការតភ្ជាប់</span>
                </button>
              </div>
            </div>

            {/* ── FORUM TOPICS STATUS & AUTO-CREATE CARD ── */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40 border border-sky-100 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0088cc] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-gray-900 m-0">
                      Telegram Forum Topics (បែងចែកប្រធានបទដោយស្វ័យប្រវត្តិ)
                    </h3>
                    <p className="text-xs text-gray-500 m-0 mt-0.5">
                      Bot នឹងបង្កើត និងតម្រៀបសារ Notification ចូលតាម Topic នីមួយៗយ៉ាងមានរបៀប
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSetupTopics}
                  disabled={settingUpTopics || Boolean(status?.topics?.orders && status?.topics?.repairs && status?.topics?.stock && status?.topics?.chat)}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-all border-none ${
                    Boolean(status?.topics?.orders && status?.topics?.repairs && status?.topics?.stock && status?.topics?.chat)
                      ? "bg-emerald-600/90 hover:bg-emerald-600 cursor-default"
                      : "bg-gradient-to-r from-[#0088cc] to-[#0077b5] hover:from-[#0077b5] hover:to-[#006699] cursor-pointer"
                  } disabled:opacity-80`}
                >
                  {Boolean(status?.topics?.orders && status?.topics?.repairs && status?.topics?.stock && status?.topics?.chat) ? (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-200" />
                      <span>ប្រធានបទ Topics រៀបចំរួចរាល់ ១០០%</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} className={settingUpTopics ? "animate-spin" : ""} />
                      <span>{settingUpTopics ? "កំពុងរៀបចំ Topics..." : "បង្កើត Topics ស្វ័យប្រវត្តិ"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4 Topic Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    key: "orders",
                    icon: ShoppingBag,
                    title: "ការបញ្ជាទិញថ្មី",
                    desc: "វិក្កយបត្រ និងព័ត៌មានដឹកជញ្ជូន",
                    color: "border-sky-200 bg-sky-50/80 text-sky-900",
                    created: Boolean(status?.topics?.orders),
                  },
                  {
                    key: "repairs",
                    icon: Wrench,
                    title: "សេវាជួសជុល",
                    desc: "ប័ណ្ណទទួលជួសជុល និងស្ថានភាព",
                    color: "border-amber-200 bg-amber-50/80 text-amber-900",
                    created: Boolean(status?.topics?.repairs),
                  },
                  {
                    key: "stock",
                    icon: AlertCircle,
                    title: "ការជូនដំណឹងស្តុក",
                    desc: "ដឹងភ្លាមពេលទំនិញជិតអស់ពីស្តុក",
                    color: "border-red-200 bg-red-50/80 text-red-900",
                    created: Boolean(status?.topics?.stock),
                  },
                  {
                    key: "chat",
                    icon: MessageSquare,
                    title: "សេវាអតិថិជន",
                    desc: "សម្រាប់សន្ទនាទូទៅក្នុងក្រុម",
                    color: "border-purple-200 bg-purple-50/80 text-purple-900",
                    created: Boolean(status?.topics?.chat),
                  },
                ].map((top) => {
                  const TopIcon = top.icon;
                  return (
                    <div key={top.key} className={`p-4 rounded-xl border ${top.color} flex flex-col justify-between gap-2 shadow-xs`}>
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center shadow-xs">
                          <TopIcon size={18} />
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          top.created ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {top.created ? "Ready" : "Pending"}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{top.title}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">{top.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Smart Admin Permission Notice */}
              <div className="mt-4 p-3.5 bg-white rounded-xl border border-sky-100 flex items-start gap-2.5 text-xs text-gray-600">
                <AlertCircle size={16} className="text-[#0088cc] flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <b>លក្ខខណ្ឌបង្កើត Topic:</b> គ្រុបត្រូវតែបើកមុខងារ <b>Topics</b> ក្នុង Group Settings ហើយ <b>Bot ត្រូវតែមានសិទ្ធិជា Administrator</b> ជាមួយមុខងារ <b>&quot;Manage Topics&quot;</b>។ ប្រសិនបើ Bot មិនទាន់មានសិទ្ធិទេ វានឹងផ្ញើសារប្រាប់ក្នុង Telegram ដោយស្វ័យប្រវត្តិដើម្បីឲ្យអ្នកទៅបើកសិទ្ធិជាមុនសិន។
                </div>
              </div>
            </div>

            {/* Notification Event Toggles */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Bell size={16} className="text-[#0088cc]" />
                <span>ការកំណត់ការជូនដំណឹងស្វ័យប្រវត្តិ</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    key: "notify_orders" as const,
                    icon: ShoppingBag,
                    title: "ការបញ្ជាទិញថ្មី",
                    desc: "ផ្ញើព័ត៌មានលម្អិតពីអតិថិជន និងទំនិញភ្លាមៗពេលមានការកុម្ម៉ង់",
                    value: status.notify_orders,
                  },
                  {
                    key: "notify_low_stock" as const,
                    icon: AlertCircle,
                    title: "ទំនិញជិតអស់ពីស្តុក",
                    desc: "ប្រកាសអាសន្នពេលចំនួនទំនិញក្នុងស្តុកសល់តិចជាង ៥ គ្រឿង",
                    value: status.notify_low_stock,
                  },
                  {
                    key: "notify_repairs" as const,
                    icon: Wrench,
                    title: "សំណើជួសជុល",
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
                      className="p-4 rounded-2xl border border-gray-200 hover:border-[#0088cc] hover:bg-sky-50/20 transition-all cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0088cc] flex items-center justify-center shrink-0 mt-0.5">
                          <ItemIcon size={16} />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${item.value ? 'bg-[#0088cc]' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${item.value ? 'left-6' : 'left-1'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── CASE 2: NOT CONNECTED (1-CLICK FLOW) ── */
          <div className="flex flex-col gap-6">
            
            {/* Main 1-Click Connect Hero Banner */}
            <div className="bg-gradient-to-br from-gray-50 via-sky-50/30 to-blue-50/50 p-6 sm:p-8 rounded-3xl border border-sky-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-[#0088cc] text-xs font-bold mb-3">
                  <Smartphone size={14} /> ងាយស្រួលបំផុត ១-ចុច ស្វ័យប្រវត្តិ
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-snug">
                  ភ្ជាប់ Telegram Bot ទៅកាន់ Group របស់ហាង
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                  គ្រាន់តែចុចបើក Telegram រួចជ្រើសរើស Group របស់ហាង ហើយ Add Bot <b>@{botUsername}</b> ជា Admin ជាមួយសិទ្ធិ <b>&quot;Manage Topics&quot;</b> ជាការស្រេច! ប្រព័ន្ធនឹងតភ្ជាប់ និងបង្កើត Forum Topics ជូនភ្លាមៗ។
                </p>

                {/* Main Action Trigger */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOneClickConnect}
                    disabled={connecting}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0088cc] to-[#0077b5] hover:from-[#0077b5] hover:to-[#006699] text-white text-sm sm:text-base font-black shadow-xl shadow-sky-600/25 hover:shadow-2xl transition-all cursor-pointer border-none active:scale-95 disabled:opacity-50"
                  >
                    <Send size={20} className={connecting ? "animate-spin" : ""} />
                    <span>{connecting ? "កំពុងបើក Telegram..." : "បើក Telegram ដើម្បីភ្ជាប់ Group"}</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>

              {/* Graphic Icon */}
              <div className="w-44 h-44 rounded-3xl bg-white border border-sky-200/80 shadow-lg p-5 flex flex-col items-center justify-center text-center shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center mb-2 shadow-inner">
                  <Send size={32} />
                </div>
                <span className="text-xs font-black text-gray-900">1-Click Auto Connect</span>
                <span className="text-[11px] text-[#0088cc] font-mono font-bold mt-0.5">
                  @{botUsername}
                </span>
              </div>
            </div>

            {/* Direct Connect by Group ID (Instant Alternative) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setShowManualConnect(!showManualConnect)}
                className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-bold text-gray-700 hover:text-[#0088cc] bg-transparent border-none cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-[#0088cc]" />
                  <span>ជម្រើសភ្ជាប់ដោយផ្ទាល់តាមរយៈ Group Chat ID (Direct Connect)</span>
                </div>
                <span className="text-xs text-[#0088cc]">{showManualConnect ? "បិទវិញ ▲" : "បើកមើល ▼"}</span>
              </button>

              {showManualConnect && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
                  <p className="text-xs text-gray-500 m-0">
                    បញ្ចូល Chat ID របស់ Telegram Group ឬ Supergroup (ឧទាហរណ៍: <code>-100xxxxxxxxxx</code>) ដើម្បីភ្ជាប់ភ្លាមៗដោយមិនចាំបាច់រង់ចាំ Webhook ឬ Bot Token ថ្មី:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Telegram Chat ID</label>
                      <input
                        type="text"
                        value={manualChatId}
                        onChange={(e) => setManualChatId(e.target.value)}
                        placeholder="-100xxxxxxxxxx"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm font-mono focus:border-[#0088cc] focus:ring-1 focus:ring-[#0088cc] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Group Name / ចំណងជើង</label>
                      <input
                        type="text"
                        value={manualChatTitle}
                        onChange={(e) => setManualChatTitle(e.target.value)}
                        placeholder="S Tech Store Team Group"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:border-[#0088cc] focus:ring-1 focus:ring-[#0088cc] outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={handleDirectConnect}
                      disabled={manualConnecting}
                      className="px-5 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold border-none cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      <Zap size={14} className={manualConnecting ? "animate-spin" : ""} />
                      <span>{manualConnecting ? "កំពុងភ្ជាប់..." : "ភ្ជាប់ Group ភ្លាមៗ (Instant Connect)"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Waiting Radar Panel (In-Card View) */}
            {pairData && !status?.connected && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#0088cc] shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-sm sm:text-base font-black text-gray-900">
                      កំពុងរង់ចាំការភ្ជាប់ពី Telegram Group (Radar Active)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#0088cc] bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                    Pair Code: {pairData.pair_code}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-center">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900">
                      ជំហានបន្ទាប់: បើក Telegram ហើយជ្រើសរើស Group របស់ហាង
                    </h4>

                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => setWizardOpen(true)}
                        className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer border-none active:scale-98"
                      >
                        <Sparkles size={18} className="text-amber-300" />
                        <span>បើកផ្ទាំងណែនាំ 1-Click Guided Connect</span>
                        <ExternalLink size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(pairData.group_url)}
                        className="w-full py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 border border-gray-200 transition-colors cursor-pointer"
                      >
                        <Copy size={14} />
                        <span>{copied ? "បានចម្លងរួចរាល់!" : "Copy Direct Invitation Link"}</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2">
                      <Info size={15} className="text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <b>ចំណាំ:</b> នៅពេលអ្នក Add Bot ចូលក្នុង Group នោះ Telegram នឹងផ្ញើបញ្ជា <code>/start {pairData.pair_code}</code> ដោយស្វ័យប្រវត្តិ។ ប្រព័ន្ធនឹងភ្ជាប់គ្នាភ្លាមៗក្នុងរយៈពេល ២ វិនាទី!
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-sky-50/40 rounded-2xl border border-gray-200/80 text-center">
                    <div className="w-14 h-14 rounded-full bg-sky-100 text-[#0088cc] flex items-center justify-center mb-3">
                      <RefreshCw size={26} className="animate-spin" />
                    </div>
                    <div className="text-sm font-black text-gray-900">
                      Radar Active — Auto Detecting...
                    </div>
                    <div className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                      ផ្ទាំងនេះកំពុងត្រួតពិនិត្យស្វ័យប្រវត្តិ។ នៅពេល Bot ចូលដល់ក្នុង Group វានឹងលោតប្តូរទៅជា &quot;Connected&quot; ដោយស្វ័យប្រវត្ត។
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MASTER UX 1-CLICK GUIDED CONNECT MODAL ── */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setWizardOpen(false);
                if (status?.connected) setPairData(null);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer z-10"
            >
              <X size={20} />
            </button>

            {/* If connected -> CELEBRATION SUCCESS SCREEN */}
            {status?.connected && (wizardStep === 4 || justConnected) ? (
              <div className="text-center py-4 space-y-5 animate-in zoom-in-95">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={44} className="animate-bounce" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
                    <Sparkles size={13} className="text-emerald-600" />
                    <span>តភ្ជាប់ជោគជ័យ ១០០% • Auto Connected</span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    Telegram Group & Bot បានភ្ជាប់ជោគជ័យ!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-md mx-auto leading-relaxed">
                    Bot <b>@{botUsername}</b> ត្រូវបានភ្ជាប់ជាមួយគ្រុប <b>{status.chat_title || "Team Group"}</b> រួចរាល់។ Forum Topics ទាំងអស់ត្រូវបានរៀបចំស្វ័យប្រវត្តិ!
                  </p>
                </div>

                {/* Group Details Strip */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-left font-mono text-xs text-gray-700 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Group Name:</span>
                    <span className="font-bold text-gray-900">{status.chat_title || "S Tech Store Group"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Chat ID:</span>
                    <span className="font-bold text-[#0088cc]">{status.chat_id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-emerald-600 font-bold">Active & Listening 24/7</span>
                  </div>
                </div>

                {/* 4 Topic Badges */}
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">
                    Forum Topics ត្រូវបានរៀបចំស្វ័យប្រវត្តិ៖
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs font-bold text-sky-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><ShoppingBag size={14} className="text-sky-600" /> ការបញ្ជាទិញថ្មី</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">Ready</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Wrench size={14} className="text-amber-600" /> សេវាជួសជុល</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">Ready</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><AlertCircle size={14} className="text-red-600" /> ការជូនដំណឹងស្តុក</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">Ready</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><MessageSquare size={14} className="text-purple-600" /> សេវាអតិថិជន</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">Ready</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={testing}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all border-none disabled:opacity-50"
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
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border-none"
                  >
                    <Check size={14} />
                    <span>រួចរាល់ • បិទផ្ទាំង</span>
                  </button>
                </div>
              </div>
            ) : (
              /* AWAITING CONNECTION GUIDED RADAR */
              <div className="flex flex-col gap-5 overflow-y-auto pr-1">
                {/* Header */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-[#0088cc] text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>ភ្ជាប់ Telegram Group ដោយស្វ័យប្រវត្តិ</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    របៀបភ្ជាប់ Telegram Bot ទៅកាន់គ្រុប
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                    ចុចបើក Telegram ជ្រើសរើស Group របស់ហាង ហើយ Add Bot ជា Admin ជាមួយ Manage Topics ជាការស្រេច!
                  </p>
                </div>

                {/* Step Tabs Navigation */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className={`flex-1 py-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                      wizardStep === 1 ? "bg-white text-gray-900 shadow-xs" : "bg-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <span>1. រើស Group</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className={`flex-1 py-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                      wizardStep === 2 ? "bg-white text-gray-900 shadow-xs" : "bg-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <span>2. បើក Topics</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className={`flex-1 py-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                      wizardStep === 3 ? "bg-white text-gray-900 shadow-xs" : "bg-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <span>3. សិទ្ធិ Bot</span>
                  </button>
                </div>

                {/* Step Content */}
                {wizardStep === 1 && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200">
                      <div className="text-xs font-bold text-sky-900 mb-1 flex items-center gap-1.5">
                        <Smartphone size={16} className="text-[#0088cc]" />
                        <span>ជំហានទី១: បើក Telegram App ហើយជ្រើសរើស Group របស់ហាង</span>
                      </div>
                      <p className="text-xs text-sky-800/80 leading-relaxed m-0">
                        តំណភ្ជាប់ខាងក្រោមបានបង្កប់លេខកូដ Pairing Code (<code>{pairData?.pair_code}</code>) និងសិទ្ធិ Manage Topics ស្រាប់។ គ្រាន់តែចុចបើក រួចជ្រើសរើស Group របស់ហាងអ្នក។
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <a
                        href={pairData?.tg_app_url || pairData?.group_url || `https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all no-underline active:scale-98"
                      >
                        <Smartphone size={16} />
                        <span>បើកក្នុង Telegram App (@{botUsername})</span>
                        <ExternalLink size={14} />
                      </a>

                      {pairData?.group_url && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pairData.group_url)}
                          className="w-full py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 border border-gray-200 transition-colors cursor-pointer"
                        >
                          <Copy size={13} />
                          <span>{copied ? "បានចម្លងរួចរាល់!" : "Copy Direct Invitation Link"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
                      <div className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                        <Layers size={16} className="text-amber-600" />
                        <span>ជំហានទី២ (ក្បាច់សំខាន់): បើកមុខងារ Topics ក្នុង Group Settings</span>
                      </div>
                      <p className="text-xs text-amber-800/90 leading-relaxed m-0">
                        ដើម្បីឱ្យ Telegram អនុញ្ញាតឱ្យបង្កើត Forum Topics បាន សូមបើកមុខងារនេះក្នុង Group របស់អ្នកជាមុន៖
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2.5 text-xs text-gray-700">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#0088cc] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                        <div>ចុចលើឈ្មោះ Group (Group Profile) → ចុចលើសញ្ញា Edit (<b>Edit</b>)</div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#0088cc] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                        <div>រកមើលពាក្យ <b>Topics</b> រួចចុចបើក (<b>Turn ON</b>)</div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#0088cc] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                        <div>ចុច Done ឬ Save ដើម្បីរក្សាទុក</div>
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                      <div className="text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-emerald-600" />
                        <span>ជំហានទី៣: ផ្តល់សិទ្ធិ Manage Topics ឱ្យ Bot</span>
                      </div>
                      <p className="text-xs text-emerald-800/90 leading-relaxed m-0">
                        នៅពេលអ្នក Add Bot ចូលក្នុងគ្រុប ផ្ទាំង Telegram នឹង Popup សួរអំពីសិទ្ធិ Administrator ដោយស្វ័យប្រវត្តិ៖
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs text-gray-700">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 font-bold">
                        <span>Manage Topics</span>
                        <span className="text-emerald-600 text-xs">Enabled ✓ (Auto Pre-selected)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 font-bold">
                        <span>Change Group Info</span>
                        <span className="text-emerald-600 text-xs">Enabled ✓</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 font-bold">
                        <span>Pin Messages</span>
                        <span className="text-emerald-600 text-xs">Enabled ✓</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Radar Real-time Listener Strip */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-900 to-black text-white flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                      <span className="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Radar Active • Auto-Detecting...</span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        កំពុងរង់ចាំ Bot ចូលគ្រុប (ត្រួតពិនិត្យរៀងរាល់ 1.8 វិនាទី)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-white/10 px-2.5 py-1 rounded-xl">
                    {pairData?.pair_code}
                  </span>
                </div>

                {/* Direct Connect Toggle inside Modal */}
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowManualConnect(!showManualConnect)}
                    className="text-[11px] text-[#0088cc] hover:underline font-bold bg-transparent border-none cursor-pointer flex items-center gap-1"
                  >
                    <span>{showManualConnect ? "បិទជម្រើសបញ្ចូល Chat ID ▲" : "ឬបញ្ចូល Telegram Chat ID ដោយផ្ទាល់ (ប្រសិនបើដឹងស្រាប់) ▼"}</span>
                  </button>

                  {showManualConnect && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-2">
                      <input
                        type="text"
                        value={manualChatId}
                        onChange={(e) => setManualChatId(e.target.value)}
                        placeholder="ឧ. -1003967108799"
                        className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleDirectConnect}
                        disabled={manualConnecting}
                        className="py-2 px-3 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold rounded-lg cursor-pointer border-none flex items-center justify-center gap-1.5"
                      >
                        <Zap size={13} className={manualConnecting ? "animate-spin" : ""} />
                        <span>{manualConnecting ? "កំពុងភ្ជាប់..." : "ភ្ជាប់ភ្លាមៗ (Instant Pair)"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => prev > 1 ? (prev - 1 as any) : 1)}
                    disabled={wizardStep === 1}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer border-none flex items-center gap-1"
                  >
                    <ArrowLeft size={13} />
                    <span>ត្រឡប់</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => prev < 3 ? (prev + 1 as any) : 3)}
                    disabled={wizardStep === 3}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gray-900 hover:bg-black disabled:opacity-40 cursor-pointer border-none flex items-center gap-1"
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
