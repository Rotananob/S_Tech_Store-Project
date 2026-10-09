"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, CheckCircle2, AlertCircle, RefreshCw, Unlink, ExternalLink, 
  Copy, ShieldCheck, Bell, Smartphone, Sparkles, Layers, Key, Bot, 
  Settings, Check, ArrowRight, Zap, QrCode
} from "lucide-react";
import { 
  getTelegramStatus, generateTelegramLink, testTelegramNotification, 
  disconnectTelegram, updateTelegramSettings, setupTelegramTopics, 
  TelegramStatus, TelegramPairLink 
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

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStatus = async () => {
    try {
      const data = await getTelegramStatus();
      setStatus(data);
      if (data.connected && pairData) {
        setPairData(null);
        showToast("🎉 Telegram Group បានភ្ជាប់ជោគជ័យ!");
      }
    } catch (e) {
      console.error("Failed to fetch telegram status", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll for connection while awaiting group pairing
  useEffect(() => {
    if (!pairData || status?.connected) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 2500);
    return () => clearInterval(interval);
  }, [pairData, status?.connected]);

  // ABA Merchant Style 1-Click Connect
  const handleOneClickConnect = async () => {
    setConnecting(true);
    try {
      const res = await generateTelegramLink();
      setPairData(res);
      showToast("🚀 កំពុងបើកកម្មវិធី Telegram... សូមជ្រើសរើស Group របស់ហាង");

      // Auto-launch Telegram App directly on Mobile or Desktop
      if (res.group_url) {
        const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = res.group_url;
        } else {
          window.open(res.group_url, "_blank");
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
      if (res.success) {
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

      {/* Header Banner — Apple & ABA Merchant Premium Theme */}
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
                <span>ABA Merchant Style 1-Click Connect</span>
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
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected 🟢 Group Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500/20 backdrop-blur-md border border-sky-300/40 text-sky-100 text-xs sm:text-sm font-bold">
                <span className="w-3 h-3 rounded-full bg-sky-300 animate-ping" />
                <span>Bot Ready 🔵 1-Click Connect</span>
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
                      <span>{settingUpTopics ? "កំពុងរៀបចំ Topics..." : "🗂️ បង្កើត Topics ស្វ័យប្រវត្តិ"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4 Topic Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    key: "orders",
                    icon: "🛒",
                    title: "ការបញ្ជាទិញថ្មី",
                    desc: "វិក្កយបត្រ និងព័ត៌មានដឹកជញ្ជូន",
                    color: "border-sky-200 bg-sky-50/80 text-sky-900",
                    created: Boolean(status?.topics?.orders),
                  },
                  {
                    key: "repairs",
                    icon: "🛠️",
                    title: "សេវាជួសជុល",
                    desc: "ប័ណ្ណទទួលជួសជុល និងស្ថានភាព",
                    color: "border-amber-200 bg-amber-50/80 text-amber-900",
                    created: Boolean(status?.topics?.repairs),
                  },
                  {
                    key: "stock",
                    icon: "⚠️",
                    title: "ការជូនដំណឹងស្តុក",
                    desc: "ដឹងភ្លាមពេលទំនិញជិតអស់ពីស្តុក",
                    color: "border-red-200 bg-red-50/80 text-red-900",
                    created: Boolean(status?.topics?.stock),
                  },
                  {
                    key: "chat",
                    icon: "💬",
                    title: "សេវាអតិថិជន",
                    desc: "សម្រាប់សន្ទនាទូទៅក្នុងក្រុម",
                    color: "border-purple-200 bg-purple-50/80 text-purple-900",
                    created: Boolean(status?.topics?.chat),
                  },
                ].map((top) => (
                  <div key={top.key} className={`p-4 rounded-xl border ${top.color} flex flex-col justify-between gap-2 shadow-xs`}>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{top.icon}</span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        top.created ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {top.created ? "Ready ✓" : "Pending ⏳"}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{top.title}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{top.desc}</div>
                    </div>
                  </div>
                ))}
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
                    title: "🛒 ការបញ្ជាទិញថ្មី",
                    desc: "ផ្ញើព័ត៌មានលម្អិតពីអតិថិជន និងទំនិញភ្លាមៗពេលមានការកុម្ម៉ង់",
                    value: status.notify_orders,
                  },
                  {
                    key: "notify_low_stock" as const,
                    title: "⚠️ ទំនិញជិតអស់ពីស្តុក",
                    desc: "ប្រកាសអាសន្នពេលចំនួនទំនិញក្នុងស្តុកសល់តិចជាង ៥ គ្រឿង",
                    value: status.notify_low_stock,
                  },
                  {
                    key: "notify_repairs" as const,
                    title: "🔧 សំណើជួសជុល",
                    desc: "ជូនដំណឹងពេលមានអតិថិជនដាក់សំណើសុំជួសជុលឧបករណ៍",
                    value: status.notify_repairs,
                  },
                  {
                    key: "notify_shifts" as const,
                    title: "⏰ វេនការងារបុគ្គលិក",
                    desc: "ជូនដំណឹងអំពីកាលវិភាគផ្លាស់ប្តូរវេនរបស់បុគ្គលិក",
                    value: status.notify_shifts,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => handleToggle(item.key)}
                    className="p-4 rounded-2xl border border-gray-200 hover:border-[#0088cc] hover:bg-sky-50/20 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                        {item.desc}
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${item.value ? 'bg-[#0088cc]' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${item.value ? 'left-6' : 'left-1'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── CASE 2: NOT CONNECTED (PRE-CONFIGURED ABA MERCHANT 1-CLICK FLOW) ── */
          <div className="flex flex-col gap-6">
            
            {/* Main 1-Click Connect Hero Banner */}
            <div className="bg-gradient-to-br from-gray-50 via-sky-50/30 to-blue-50/50 p-6 sm:p-8 rounded-3xl border border-sky-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-[#0088cc] text-xs font-bold mb-3">
                  <Smartphone size={14} /> ងាយស្រួលបំផុត ១-ចុច ABA Merchant Style
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-snug">
                  ភ្ជាប់ Telegram Bot ទៅកាន់ Group របស់ហាង
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                  គ្រាន់តែចុចប៊ូតុងខាងក្រោម នោះវានឹងរត់ចូលទៅក្នុង <b>Telegram App</b> លើទូរស័ព្ទរបស់អ្នកភ្លាមៗ! បន្ទាប់មកគ្រាន់តែ Add Bot <b>@{botUsername}</b> ចូលក្នុង Group ណាមួយ នោះវានឹងភ្ជាប់ និងបង្កើត <b>Forum Topics</b> ដោយស្វ័យប្រវត្តិ។
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
                    <span>{connecting ? "កំពុងបើក Telegram..." : "⚡ បើក Telegram ដើម្បីភ្ជាប់ Group"}</span>
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

            {/* Waiting Radar Modal/Panel if pairData is generated */}
            {pairData && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#0088cc] shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-sm sm:text-base font-black text-gray-900">
                      កំពុងរង់ចាំការភ្ជាប់ពី Telegram Group
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
                      <a
                        href={pairData.group_url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all no-underline active:scale-98"
                      >
                        <Smartphone size={18} />
                        <span>បើកក្នុង Telegram App (@{pairData.bot_username})</span>
                        <ExternalLink size={16} />
                      </a>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(pairData.group_url)}
                        className="w-full py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 border border-gray-200 transition-colors cursor-pointer"
                      >
                        <Copy size={14} />
                        <span>{copied ? "បានចម្លងរួចរាល់! ✓" : "Copy Direct Invitation Link"}</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                      💡 <b>ចំណាំ:</b> នៅពេលអ្នក Add Bot ចូលក្នុង Group នោះ Telegram នឹងផ្ញើបញ្ជា <code>/start {pairData.pair_code}</code> ដោយស្វ័យប្រវត្តិ។ ប្រព័ន្ធនឹងភ្ជាប់គ្នាភ្លាមៗក្នុងរយៈពេល ២ វិនាទី!
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
                      ផ្ទាំងនេះកំពុងត្រួតពិនិត្យស្វ័យប្រវត្តិ។ នៅពេល Bot ចូលដល់ក្នុង Group វានឹងលោតប្តូរទៅជា &quot;Connected 🟢&quot; ដោយស្វ័យប្រវត្ត។
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
