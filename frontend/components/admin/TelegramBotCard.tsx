"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, CheckCircle2, AlertCircle, RefreshCw, Unlink, ExternalLink, 
  Copy, ShieldCheck, Bell, Smartphone, QrCode, Sparkles, Layers, MessageSquare, Wrench, AlertTriangle, Check
} from "lucide-react";
import { 
  getTelegramStatus, generateTelegramLink, testTelegramNotification, 
  disconnectTelegram, updateTelegramSettings, setupTelegramTopics, 
  TelegramStatus, TelegramPairLink 
} from "@/lib/services/admin.service";

export default function TelegramBotCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
        setPairData(null); // clear pairing once connected
        showToast("Telegram Group បានភ្ជាប់ជោគជ័យ! 🎉");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll for connection while pairData is active
  useEffect(() => {
    if (!pairData || status?.connected) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [pairData, status?.connected]);

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const res = await generateTelegramLink();
      setPairData(res);
      showToast("លេខកូដភ្ជាប់ត្រូវបានបង្កើត! សូមចុចបើក Telegram។");
    } catch (e) {
      showToast("មិនអាចបង្កើត Link ភ្ជាប់បានទេ សូមព្យាយាមម្តងទៀត", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleTestPing = async () => {
    setTesting(true);
    try {
      const res = await testTelegramNotification();
      if (res.success) {
        showToast("សារសាកល្បងត្រូវបានផ្ញើទៅ Telegram Group រួចរាល់! ✅");
      } else {
        showToast(res.message || "Failed to send test ping", "error");
      }
    } catch (e) {
      showToast("ការផ្ញើសារសាកល្បងបានបរាជ័យ", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleSetupTopics = async () => {
    setSettingUpTopics(true);
    try {
      const res = await setupTelegramTopics();
      if (res.success) {
        showToast("Forum Topics ត្រូវបានបង្កើត និងរៀបចំជោគជ័យ! 🎉");
        await fetchStatus();
      } else {
        showToast(res.message || "សូមផ្តល់សិទ្ធិ Manage Topics ដល់ Bot សិន", "error");
      }
    } catch (e: any) {
      const msg = e.response?.data?.error || e.response?.data?.message || "បរាជ័យក្នុងការបង្កើត Topics សូមពិនិត្យសិទ្ធិ Admin របស់ Bot";
      showToast(msg, "error");
    } finally {
      setSettingUpTopics(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("តើអ្នកពិតជាចង់ផ្តាច់ Telegram Bot ចេញពីគ្រុបនេះមែនទេ?")) return;
    setDisconnecting(true);
    try {
      await disconnectTelegram();
      await fetchStatus();
      showToast("បានផ្តាច់ Telegram Bot រួចរាល់");
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
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex items-center justify-center min-h-[220px]">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw size={20} className="animate-spin text-[#0088cc]" />
          <span className="text-sm font-semibold">កំពុងផ្ទុកព័ត៌មាន Telegram Bot...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-xl font-bold text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'} transition-all animate-in fade-in slide-in-from-top-4`}>
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0088cc] via-[#0077b5] to-[#1a4fa0] p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-md">
              <Send size={28} className="text-white fill-white/20" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 border border-white/20 text-xs font-bold text-sky-200 mb-1">
                <Sparkles size={12} /> ABA Merchant Style One-Click
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight">
                Telegram Bot Notifications & Forum Topics
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1 leading-relaxed">
                ទទួលការជូនដំណឹងពីការបញ្ជាទិញថ្មី (New Orders) និងគ្រប់គ្រងតាម Forum Topics ស្វ័យប្រវត្តក្នុង Telegram Group។
              </p>
            </div>
          </div>

          {/* Current Status Pill */}
          <div className="shrink-0">
            {status?.connected ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-200 text-xs sm:text-sm font-black shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active 🟢 已连接</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white/90 text-xs sm:text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Not Connected ⚪</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {/* ── CASE 1: CONNECTED ── */}
        {status?.connected ? (
          <div className="flex flex-col gap-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Connected Telegram Group
                  </div>
                  <div className="text-lg font-black text-gray-900 mt-0.5">
                    {status.chat_title || "S Tech Store Official Team"}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1.5 font-mono">
                    <span>Chat ID: <b>{status.chat_id}</b></span>
                    <span>•</span>
                    <span>Bot: <b>@{status.bot_username}</b></span>
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
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  <Send size={15} className={testing ? "animate-pulse" : ""} />
                  <span>{testing ? "កំពុងផ្ញើ..." : "ផ្ញើសារសាកល្បង (Test)"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs sm:text-sm font-bold border border-red-200 transition-all cursor-pointer disabled:opacity-50"
                  title="ផ្តាច់ Bot ចេញពីគ្រុបនេះ"
                >
                  <Unlink size={15} />
                  <span>ផ្តាច់ (Disconnect)</span>
                </button>
              </div>
            </div>

            {/* ── FORUM TOPICS STATUS & AUTO-CREATE CARD ── */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 border border-sky-100 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0088cc] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 m-0">
                      Telegram Forum Topics (បែងចែកប្រធានបទដោយស្វ័យប្រវត្តិ)
                    </h3>
                    <p className="text-xs text-gray-500 m-0 mt-0.5">
                      Bot នឹងបង្កើត និងតម្រៀបសារ Notification ចូលតាម Topic នីមួយៗយ៉ាងមានរបៀប។
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSetupTopics}
                  disabled={settingUpTopics}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0077b5] hover:from-[#0077b5] hover:to-[#006699] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  <RefreshCw size={14} className={settingUpTopics ? "animate-spin" : ""} />
                  <span>{settingUpTopics ? "កំពុងរៀបចំ Topics..." : "🗂️ Auto-create Topics (បង្កើត Topics ស្វ័យប្រវត្តិ)"}</span>
                </button>
              </div>

              {/* 4 Topic Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    key: "orders",
                    icon: "🛒",
                    title: "ការបញ្ជាទិញថ្មី (New Orders)",
                    desc: "វិក្កយបត្រ & ព័ត៌មានដឹកជញ្ជូន",
                    color: "border-sky-200 bg-sky-50/80 text-sky-800",
                    created: Boolean(status?.topics?.orders),
                  },
                  {
                    key: "repairs",
                    icon: "🛠️",
                    title: "សេវាជួសជុល (Repairs)",
                    desc: "ប័ណ្ណទទួលជួសជុល & Status",
                    color: "border-amber-200 bg-amber-50/80 text-amber-800",
                    created: Boolean(status?.topics?.repairs),
                  },
                  {
                    key: "stock",
                    icon: "⚠️",
                    title: "ការជូនដំណឹងស្តុក (Stock)",
                    desc: "ដឹងភ្លាមពេលទំនិញជិតអស់",
                    color: "border-red-200 bg-red-50/80 text-red-800",
                    created: Boolean(status?.topics?.stock),
                  },
                  {
                    key: "chat",
                    icon: "💬",
                    title: "សេវាអតិថិជន (Customer Chat)",
                    desc: "សម្រាប់សន្ទនាទូទៅក្នុងក្រុម",
                    color: "border-purple-200 bg-purple-50/80 text-purple-800",
                    created: Boolean(status?.topics?.chat),
                  },
                ].map((top) => (
                  <div key={top.key} className={`p-3.5 rounded-xl border ${top.color} flex flex-col justify-between gap-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{top.icon}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${top.created ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
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
              <div className="mt-4 p-3 bg-white rounded-xl border border-sky-100 flex items-start gap-2.5 text-xs text-gray-600">
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
                <span>Notification Triggers (ជ្រើសរើសប្រភេទការជូនដំណឹង)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    key: "notify_orders" as const,
                    title: "🛒 ការបញ្ជាទិញថ្មី (New Orders)",
                    desc: "ផ្ញើព័ត៌មានលម្អិតពីអតិថិជន និងទំនិញភ្លាមៗពេលមានការកុម្ម៉ង់",
                    value: status.notify_orders,
                  },
                  {
                    key: "notify_low_stock" as const,
                    title: "⚠️ ទំនិញជិតអស់ពីស្តុក (Low Stock Alert)",
                    desc: "ប្រកាសអាសន្នពេលចំនួនទំនិញក្នុងស្តុកសល់តិចជាង ៥ គ្រឿង",
                    value: status.notify_low_stock,
                  },
                  {
                    key: "notify_repairs" as const,
                    title: "🔧 សំណើជួសជុល (Repair Tickets)",
                    desc: "ជូនដំណឹងពេលមានអតិថិជនដាក់សំណើសុំជួសជុលឧបករណ៍",
                    value: status.notify_repairs,
                  },
                  {
                    key: "notify_shifts" as const,
                    title: "⏰ វេនការងារបុគ្គលិក (Staff Shift Updates)",
                    desc: "ជូនដំណឹងអំពីកាលវិភាគផ្លាស់ប្តូរវេនរបស់បុគ្គលិក",
                    value: status.notify_shifts,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => handleToggle(item.key)}
                    className="p-4 rounded-xl border border-gray-200 hover:border-[#0088cc] hover:bg-sky-50/20 transition-all cursor-pointer flex items-center justify-between gap-4"
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
          /* ── CASE 2: NOT CONNECTED (ABA Merchant Connect Flow) ── */
          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-gray-50 to-sky-50/40 p-6 sm:p-8 rounded-2xl border border-sky-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-[#0088cc] text-xs font-bold mb-3">
                  <Smartphone size={13} /> របៀបភ្ជាប់ងាយស្រួលបំផុត (ដូច ABA Merchant)
                </div>
                <h3 className="text-lg sm:text-xl font-black text-gray-900">
                  ភ្ជាប់ Telegram Bot ទៅកាន់ Group របស់ហាង
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                  គ្រាន់តែចុចប៊ូតុងខាងក្រោម វានឹងបើកកម្មវិធី Telegram នៅលើទូរស័ព្ទ ឬកុំព្យូទ័ររបស់អ្នកដោយស្វ័យប្រវត្តិ។ បន្ទាប់មកជ្រើសរើស Group ណាមួយដែលចង់បន្ថែម Bot នោះវានឹង Auto-command ភ្ជាប់គ្នាភ្លាមៗ!
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <button
                    type="button"
                    onClick={handleGenerateLink}
                    disabled={generating}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer border-none hover:scale-105 active:scale-95"
                  >
                    <Send size={18} className={generating ? "animate-spin" : ""} />
                    <span>{generating ? "កំពុងបង្កើត Link..." : "Connect Telegram Bot (ភ្ជាប់ឥឡូវនេះ)"}</span>
                  </button>
                </div>
              </div>

              {/* Graphical Device Indicator */}
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-white border border-sky-200/80 shadow-md p-4 flex flex-col items-center justify-center text-center shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center mb-2">
                  <Send size={32} />
                </div>
                <span className="text-xs font-bold text-gray-800">1-Click Group Connect</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Supports Mobile & Desktop</span>
              </div>
            </div>

            {/* If Pair Data is generated, show active connect modal/panel */}
            {pairData && (
              <div className="p-6 sm:p-8 rounded-2xl bg-white border-2 border-[#0088cc] shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-sm font-bold text-gray-900">
                      កំពុងរង់ចាំការភ្ជាប់ពី Telegram (Waiting for Group Start...)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#0088cc] bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                    Code: {pairData.pair_code}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-center">
                  <div>
                    <h4 className="text-sm font-black text-gray-900 mb-3">
                      ជំហានទី ១: បើក Telegram ហើយជ្រើសរើស Group
                    </h4>
                    
                    <div className="flex flex-col gap-3">
                      <a
                        href={pairData.group_url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all no-underline hover:scale-102"
                      >
                        <Smartphone size={18} />
                        <span>បើកក្នុង Telegram (Open & Add to Group)</span>
                        <ExternalLink size={15} />
                      </a>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(pairData.group_url)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 border border-gray-200 transition-colors cursor-pointer"
                      >
                        <Copy size={14} />
                        <span>{copied ? "បានចម្លងរួចរាល់! ✓" : "Copy Direct Invitation Link"}</span>
                      </button>
                    </div>

                    <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
                      💡 <b>ចំណាំ:</b> នៅពេលអ្នកចុច Add Bot ទៅក្នុង Group ណាមួយ Telegram នឹងផ្ញើ <code>/start {pairData.pair_code}</code> ដោយស្វ័យប្រវត្តិ។ ប្រព័ន្ធនឹងភ្ជាប់គ្នាភ្លាមៗក្នុងរយៈពេល ២ វិនាទី!
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-gray-200/80 text-center">
                    <div className="w-12 h-12 rounded-full bg-sky-100 text-[#0088cc] flex items-center justify-center mb-2 animate-bounce">
                      <RefreshCw size={22} className="animate-spin" />
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      System Auto-detecting...
                    </div>
                    <div className="text-xs text-gray-500 mt-1 max-w-xs">
                      ផ្ទាំងនេះកំពុងត្រួតពិនិត្យការភ្ជាប់ស្វ័យប្រវត្ត។ នៅពេល Bot ចូលដល់ក្នុងគ្រុប វានឹងលោតប្តូរទៅជា "Active" ដោយមិនបាច់ Refresh ទំព័រឡើយ។
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
