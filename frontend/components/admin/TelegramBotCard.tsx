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
  pairTelegramGroup, setupCustomerBot, triggerDailyReport, triggerWeeklyReport,
  scanLowStock, TelegramStatus, TelegramPairLink 
} from "@/lib/services/admin.service";

// =============================================================================
// TELEGRAM BOT ARCHITECTURE:
// 1. STAFF BOT (@s_tech_storeBot): Used exclusively for Admin/Staff group forum alerts.
// 2. CUSTOMER BOT (@S_TECH_ASSISTANTBOT): Used exclusively for Customer Mini App, Chat, Orders, & Auth.
// =============================================================================
const OFFICIAL_STAFF_BOT_USERNAME = "s_tech_storeBot";
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
  const [showBotFatherGuide, setShowBotFatherGuide] = useState(false);
  const [pairData, setPairData] = useState<TelegramPairLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Guided Wizard States
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [justConnected, setJustConnected] = useState(false);

  // Manual Direct Connect State
  const [manualChatId, setManualChatId] = useState("");
  const [manualChatTitle, setManualChatTitle] = useState("");
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
      const res = await pairTelegramGroup(manualChatId.trim(), undefined, manualChatTitle.trim() || "Store Group");
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

  const fetchStatus = async (checkNow: boolean = false) => {
    try {
      const data = await getTelegramStatus(checkNow);
      setStatus(data);
      if (data.connected && (pairData || wizardOpen) && !justConnected) {
        setJustConnected(true);
        setWizardStep(4);
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        
        {/* Enterprise Header Surface */}
        <div className="bg-slate-900 text-white p-6 sm:p-7 border-b border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 text-sky-400 shadow-inner">
                <Bot size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    DISPATCH & FORUM SENTINEL
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Telegram Bot Center & Forum Topics
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                  ប្រព័ន្ធស្វ័យប្រវត្តិនៃការបញ្ជូនដំណឹងការបញ្ជាទិញ (Orders), សេវាជួសជុល (Repairs), ស្តុកទំនិញ (Inventory), និងការតម្រៀបតាម Forum Topics ក្នុង Telegram Group
                </p>
              </div>
            </div>

            {/* Real-time Status Badge */}
            <div className="shrink-0 flex items-center">
              {status?.connected ? (
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                  <span>Group Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Ready for Setup</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">

          {/* DUAL BOT ARCHITECTURE SYSTEM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* BOT 1: STAFF & ORDER NOTIFICATIONS SENTINEL */}
            <div className="p-5 rounded-xl border border-gray-200 bg-slate-50/50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-600 tracking-wider">
                      BOT 01 / STAFF DISPATCH
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                    Group Alerts &amp; Topics
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Send size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 font-mono">
                        @{botUsername}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      ទទួលបន្ទុកបាញ់ Alert ការបញ្ជាទិញថ្មី (Orders), ជួសជុល (Repairs), ស្តុកទំនិញ (Stock), និង Chat ចូលក្នុង Telegram Group
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200/80 text-xs">
                <span className="text-gray-500 font-medium">
                  {status?.connected ? `ភ្ជាប់ទៅ Group: ${status.chat_title || 'Store Team'}` : 'រង់ចាំការភ្ជាប់ទៅកាន់ Group'}
                </span>
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-gray-100 text-slate-800 border border-gray-300 transition-colors no-underline shrink-0"
                >
                  <ExternalLink size={12} />
                  <span>បើកមើល Bot 1</span>
                </a>
              </div>
            </div>

            {/* BOT 2: CUSTOMER ASSISTANT & MINI APP BOT */}
            <div className="p-5 rounded-xl border border-gray-200 bg-slate-50/50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-600 tracking-wider">
                      BOT 02 / CUSTOMER ASSISTANT
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Mini App &amp; Customer Auth
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-900 text-white flex items-center justify-center shrink-0">
                    <Bot size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 font-mono">
                        @{customerBotUsername}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> 11 Commands &amp; Mini App
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      ទទួលបន្ទុក Private Chat អតិថិជន, 1-Click Login, បើក Mini App, ពិនិត្យកាបូបលុយ, S-Coins, និងតាមដាន Orders
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncCustomerBot}
                    disabled={syncingCustomerBot}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={12} className={syncingCustomerBot ? "animate-spin" : ""} />
                    <span>{syncingCustomerBot ? "កំពុង Sync..." : "Sync Commands & Menu"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBotFatherGuide(!showBotFatherGuide)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-gray-100 text-slate-700 border border-gray-300 transition-colors cursor-pointer"
                  >
                    <Terminal size={12} />
                    <span>{showBotFatherGuide ? "បិទ Guide" : "BotFather Guide"}</span>
                  </button>
                </div>

                <a
                  href={`https://t.me/${customerBotUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-gray-100 text-indigo-700 border border-gray-300 transition-colors no-underline shrink-0"
                >
                  <ExternalLink size={12} />
                  <span>បើក Bot 2</span>
                </a>
              </div>
            </div>
          </div>

          {/* BOTFATHER COMMANDS DOCUMENTATION (CLEAN DEVELOPER STYLE) */}
          {showBotFatherGuide && (
            <div className="p-5 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-slate-400" />
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider m-0">
                    BotFather Configuration Reference (@{customerBotUsername})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBotFatherGuide(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed m-0">
                ប្រព័ន្ធបានកំណត់ Commands និង Menu Button ដោយស្វ័យប្រវត្តិតាមរយៈ Telegram API រួចរាល់។ ប្រសិនបើចង់កំណត់ដោយផ្ទាល់ក្នុង @BotFather សូមប្រើប្រាស់តម្លៃខាងក្រោម៖
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1: Menu Button */}
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-300">1. /setmenubutton</span>
                    <span className="text-slate-500 text-[10px]">WEB APP BUTTON</span>
                  </div>
                  <div className="text-[11px] font-mono bg-black/60 p-2.5 rounded border border-slate-800 space-y-1 text-slate-300">
                    <div>URL: <span className="text-emerald-400 select-all">https://www.s-tech-store.tech</span></div>
                    <div>Button Text: <span className="text-sky-300 select-all">S Tech Store</span></div>
                  </div>
                </div>

                {/* Step 2: Commands */}
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-300">2. /setcommands</span>
                    <span className="text-slate-500 text-[10px]">COMMANDS LIST</span>
                  </div>
                  <div className="text-[10px] font-mono bg-black/60 p-2.5 rounded border border-slate-800 max-h-32 overflow-y-auto text-slate-300 leading-relaxed select-all">
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

          {/* CASE 1: GROUP CONNECTED */}
          {status?.connected ? (
            <div className="space-y-6">
              
              {/* Connected Group Details Bar */}
              <div className="p-5 rounded-xl border border-gray-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                        ACTIVE GROUP
                      </span>
                    </div>
                    <div className="text-base font-bold text-gray-900 mt-0.5">
                      {status.chat_title || "S Tech Store Official Team"}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-mono mt-1">
                      <span>Chat ID: <b className="text-gray-700">{status.chat_id}</b></span>
                      <span>•</span>
                      <span>Bot: <b className="text-gray-700">@{botUsername}</b></span>
                      {status.connected_at && (
                        <>
                          <span>•</span>
                          <span>Connected: {status.connected_at}</span>
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
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={13} className={testing ? "animate-spin" : ""} />
                    <span>{testing ? "កំពុងផ្ញើ..." : "ផ្ញើសារសាកល្បង"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-red-50 text-red-600 text-xs font-semibold border border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Unlink size={13} />
                    <span>ផ្តាច់ការតភ្ជាប់</span>
                  </button>
                </div>
              </div>

              {/* FORUM TOPICS STATUS & AUTO-CREATE PANEL */}
              <div className="p-5 rounded-xl border border-gray-200 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 m-0">
                        Telegram Forum Topics (ការបែងចែកប្រធានបទស្វ័យប្រវត្តិ)
                      </h3>
                      <p className="text-xs text-gray-500 m-0 mt-0.5">
                        សារ Notification នីមួយៗនឹងត្រូវបានតម្រៀបចូលតាម Forum Topic ដាច់ដោយឡែកពីគ្នា
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSetupTopics}
                    disabled={settingUpTopics || Boolean(status?.topics?.orders && status?.topics?.repairs && status?.topics?.stock && status?.topics?.chat)}
                    className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      Boolean(status?.topics?.orders && status?.topics?.repairs && status?.topics?.stock && status?.topics?.chat)
                        ? "bg-slate-100 text-slate-700 border border-gray-200 cursor-default"
                        : "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                    } disabled:opacity-70`}
                  >
                    {Boolean(status?.topics?.orders && status?.topics?.repairs && status?.topics?.stock && status?.topics?.chat) ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>ប្រធានបទ Topics រៀបចំរួចរាល់</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} className={settingUpTopics ? "animate-spin" : ""} />
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
                      <div key={top.key} className="p-3.5 rounded-xl border border-gray-200 bg-slate-50/30 flex flex-col justify-between gap-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-slate-700 flex items-center justify-center">
                            <TopIcon size={16} />
                          </div>
                          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                            top.created ? 'bg-slate-900 text-white' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {top.created ? "Ready" : "Pending"}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900">{top.title}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{top.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Technical Requirement Notice */}
                <div className="p-3 bg-slate-50 rounded-lg border border-gray-200 text-xs text-gray-600 flex items-start gap-2 leading-relaxed">
                  <Info size={15} className="text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <b>លក្ខខណ្ឌបង្កើត Topic:</b> Telegram Group ត្រូវតែបើកមុខងារ <b>Topics</b> ក្នុង Group Settings ហើយ <b>Bot ត្រូវតែមានសិទ្ធិជា Administrator</b> ជាមួយមុខងារ <b>&quot;Manage Topics&quot;</b>។ ប្រសិនបើ Bot មិនទាន់មានសិទ្ធិ ប្រព័ន្ធនឹងណែនាំជំហានដោយស្វ័យប្រវត្តិតាមរយៈ Telegram Chat។
                  </div>
                </div>
              </div>

              {/* Notification Event Toggles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-slate-600" />
                  <h3 className="text-sm font-bold text-gray-900 m-0">
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
                        className="p-3.5 rounded-xl border border-gray-200 hover:border-slate-400 bg-white hover:bg-slate-50/50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                            <ItemIcon size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 leading-snug">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                              {item.desc}
                            </div>
                          </div>
                        </div>
                        <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${item.value ? 'bg-slate-900' : 'bg-gray-300'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${item.value ? 'left-4.5' : 'left-0.5'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* QUICK ACTIONS & INSTANT REPORT TESTERS */}
                <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        សកម្មភាពរហ័ស &amp; ការធ្វើតេស្តរបាយការណ៍ (Quick Actions)
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        ផ្ញើរបាយការណ៍ ឬស្កេនពិនិត្យស្តុកទំនិញភ្លាមៗដោយមិនចាំបាច់រង់ចាំដល់ម៉ោងកំណត់
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={handleTriggerDailyReport}
                      disabled={sendingDailyReport}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-gray-300 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <BarChart3 size={13} className={sendingDailyReport ? "animate-spin text-slate-600" : "text-slate-600"} />
                      <span>ផ្ញើរបាយការណ៍ថ្ងៃនេះ (Daily)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerWeeklyReport}
                      disabled={sendingWeeklyReport}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-gray-300 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Calendar size={13} className={sendingWeeklyReport ? "animate-spin text-slate-600" : "text-slate-600"} />
                      <span>ផ្ញើរបាយការណ៍សប្តាហ៍ (Weekly)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleScanLowStock}
                      disabled={scanningStock}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-gray-300 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <PackageCheck size={13} className={scanningStock ? "animate-spin text-slate-600" : "text-slate-600"} />
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
              <div className="p-6 sm:p-7 rounded-xl border border-gray-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono font-semibold uppercase tracking-wider">
                    <Smartphone size={13} />
                    <span>1-CLICK AUTOMATION</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                    ភ្ជាប់ Telegram Bot ទៅកាន់ Telegram Group របស់ហាង
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    ចុចប៊ូតុងខាងក្រោមដើម្បីបើក Telegram រួចជ្រើសរើស Group របស់ហាង ហើយបន្ថែម Bot <b>@{botUsername}</b> ជា Administrator ជាមួយសិទ្ធិ <b>&quot;Manage Topics&quot;</b> ជាការស្រេច។ ប្រព័ន្ធនឹងតភ្ជាប់ និងរៀបចំ Forum Topics ជូនភ្លាមៗ។
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleOneClickConnect}
                      disabled={connecting}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Send size={15} className={connecting ? "animate-spin" : ""} />
                      <span>{connecting ? "កំពុងបើក Telegram..." : "បើក Telegram ដើម្បីភ្ជាប់ Group"}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-xs flex flex-col items-center justify-center text-center shrink-0 w-full md:w-52">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center mb-2">
                    <Send size={22} />
                  </div>
                  <span className="text-xs font-bold text-gray-900">Direct Connect</span>
                  <span className="text-[11px] font-mono text-slate-500 mt-0.5">
                    @{botUsername}
                  </span>
                </div>
              </div>

              {/* Direct Connect by Group ID (Drawer) */}
              <div className="p-4 sm:p-5 rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setShowManualConnect(!showManualConnect)}
                  className="w-full flex items-center justify-between text-left text-xs font-semibold text-gray-700 hover:text-gray-900 bg-transparent border-none cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Key size={14} className="text-slate-500" />
                    <span>ជម្រើសភ្ជាប់ដោយផ្ទាល់តាមរយៈ Group Chat ID (Direct Connect)</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{showManualConnect ? "បិទវិញ ▲" : "បើកមើល ▼"}</span>
                </button>

                {showManualConnect && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <p className="text-xs text-gray-500 m-0 leading-relaxed">
                      បញ្ចូល Chat ID របស់ Telegram Group ឬ Supergroup (ឧទាហរណ៍: <code>-100xxxxxxxxxx</code>) ដើម្បីភ្ជាប់ភ្លាមៗ៖
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Telegram Chat ID</label>
                        <input
                          type="text"
                          value={manualChatId}
                          onChange={(e) => setManualChatId(e.target.value)}
                          placeholder="-100xxxxxxxxxx"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono focus:border-slate-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Group Title / ឈ្មោះគ្រុប</label>
                        <input
                          type="text"
                          value={manualChatTitle}
                          onChange={(e) => setManualChatTitle(e.target.value)}
                          placeholder="S Tech Store Team Group"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:border-slate-900 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleDirectConnect}
                        disabled={manualConnecting}
                        className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Zap size={13} className={manualConnecting ? "animate-spin" : ""} />
                        <span>{manualConnecting ? "កំពុងភ្ជាប់..." : "ភ្ជាប់ Group ភ្លាមៗ (Instant Connect)"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Waiting Radar Panel */}
              {pairData && !status?.connected && (
                <div className="p-6 rounded-xl border border-slate-900 bg-white shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                      <span className="text-xs sm:text-sm font-bold text-gray-900">
                        កំពុងរង់ចាំការតភ្ជាប់ពី Telegram Group (Radar Active)
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded border border-gray-200">
                      Pair Code: {pairData.pair_code}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                    <div className="space-y-3">
                      <p className="text-xs text-gray-600 leading-relaxed m-0">
                        សូមបើកកម្មវិធី Telegram ហើយជ្រើសរើស Group របស់ហាង ដើម្បីបន្ថែម Bot <b>@{botUsername}</b> ជា Admin។
                      </p>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setWizardOpen(true)}
                          className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>បើកផ្ទាំងណែនាំ 1-Click Guided Connect</span>
                          <ExternalLink size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(pairData.group_url)}
                          className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 border border-gray-200 transition-colors cursor-pointer"
                        >
                          <Copy size={13} />
                          <span>{copied ? "បានចម្លងរួចរាល់!" : "Copy Direct Invitation Link"}</span>
                        </button>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-gray-200 text-xs text-gray-600 leading-relaxed flex items-start gap-2">
                        <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <b>ចំណាំ:</b> Telegram នឹងផ្ញើបញ្ជា <code>/start {pairData.pair_code}</code> ដោយស្វ័យប្រវត្តិ។ ប្រព័ន្ធនឹងធ្វើការតភ្ជាប់ក្នុងរយៈពេល ២ វិនាទី។
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-lg bg-slate-50 border border-gray-200 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center mx-auto">
                        <RefreshCw size={18} className="animate-spin text-slate-700" />
                      </div>
                      <div className="text-xs font-bold text-gray-900">
                        Radar Active — Auto Detecting...
                      </div>
                      <div className="text-[11px] text-gray-500 max-w-xs mx-auto leading-relaxed">
                        ផ្ទាំងនេះកំពុងត្រួតពិនិត្យស្វ័យប្រវត្តិ។ នៅពេល Bot ចូលដល់ក្នុង Group វានឹងប្តូរទៅជា &quot;Connected&quot; ដោយស្វ័យប្រវត្តិ។
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MASTER UX GUIDED CONNECT MODAL */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 overflow-hidden relative max-h-[90vh] flex flex-col">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setWizardOpen(false);
                if (status?.connected) setPairData(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* If connected -> SUCCESS SCREEN */}
            {status?.connected && (wizardStep === 4 || justConnected) ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
                    <CheckSquare size={12} />
                    <span>Connected Successfully</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                    Telegram Group &amp; Bot បានភ្ជាប់ជោគជ័យ
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                    Bot <b>@{botUsername}</b> ត្រូវបានភ្ជាប់ជាមួយគ្រុប <b>{status.chat_title || "Team Group"}</b> រួចរាល់។
                  </p>
                </div>

                {/* Group Details Strip */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-gray-200 text-left font-mono text-xs text-gray-700 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Group Name:</span>
                    <span className="font-bold text-gray-900">{status.chat_title || "S Tech Store Group"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Chat ID:</span>
                    <span className="font-bold text-slate-900">{status.chat_id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status:</span>
                    <span className="text-emerald-600 font-bold">Active &amp; Listening 24/7</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={testing}
                    className="w-full sm:flex-1 py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} className={testing ? "animate-spin" : ""} />
                    <span>{testing ? "កំពុងផ្ញើ..." : "ផ្ញើសារសាកល្បងទៅ Group"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWizardOpen(false);
                      setPairData(null);
                    }}
                    className="w-full sm:flex-1 py-2.5 px-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check size={13} />
                    <span>រួចរាល់ • បិទផ្ទាំង</span>
                  </button>
                </div>
              </div>
            ) : (
              /* AWAITING CONNECTION GUIDED RADAR */
              <div className="space-y-4 overflow-y-auto pr-1">
                <div className="text-center pt-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5">
                    <Smartphone size={12} />
                    <span>TELEGRAM PAIRING WIZARD</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                    របៀបភ្ជាប់ Telegram Bot ទៅកាន់គ្រុប
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    បើក Telegram ជ្រើសរើស Group របស់ហាង ហើយ Add Bot ជា Admin ជាមួយសិទ្ធិ Manage Topics
                  </p>
                </div>

                {/* Step Tabs Navigation */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className={`flex-1 py-1.5 px-2 rounded-md transition-colors cursor-pointer ${
                      wizardStep === 1 ? "bg-white text-gray-900 shadow-xs" : "bg-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    1. រើស Group
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className={`flex-1 py-1.5 px-2 rounded-md transition-colors cursor-pointer ${
                      wizardStep === 2 ? "bg-white text-gray-900 shadow-xs" : "bg-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    2. បើក Topics
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className={`flex-1 py-1.5 px-2 rounded-md transition-colors cursor-pointer ${
                      wizardStep === 3 ? "bg-white text-gray-900 shadow-xs" : "bg-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    3. សិទ្ធិ Bot
                  </button>
                </div>

                {/* Step Content */}
                {wizardStep === 1 && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-gray-200 text-xs text-gray-600 space-y-1">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <Smartphone size={14} className="text-slate-700" />
                        <span>ជំហានទី១: បើក Telegram App ហើយជ្រើសរើស Group របស់ហាង</span>
                      </div>
                      <p className="m-0 leading-relaxed">
                        តំណភ្ជាប់ខាងក្រោមបានបង្កប់លេខកូដ Pairing Code (<code>{pairData?.pair_code}</code>) និងសិទ្ធិ Manage Topics ស្រាប់។
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <a
                        href={pairData?.tg_app_url || pairData?.group_url || `https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors no-underline"
                      >
                        <Smartphone size={14} />
                        <span>បើកក្នុង Telegram App (@{botUsername})</span>
                        <ExternalLink size={13} />
                      </a>

                      {pairData?.group_url && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pairData.group_url)}
                          className="w-full py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs flex items-center justify-center gap-1.5 border border-gray-200 transition-colors cursor-pointer"
                        >
                          <Copy size={12} />
                          <span>{copied ? "បានចម្លងរួចរាល់!" : "Copy Direct Invitation Link"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-gray-200 text-xs text-gray-600 space-y-1">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <Layers size={14} className="text-slate-700" />
                        <span>ជំហានទី២: បើកមុខងារ Topics ក្នុង Group Settings</span>
                      </div>
                      <p className="m-0 leading-relaxed">
                        ដើម្បីឱ្យ Telegram អនុញ្ញាតឱ្យបង្កើត Forum Topics បាន សូមបើកមុខងារនេះក្នុង Group របស់អ្នក៖
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-white border border-gray-200 space-y-2 text-xs text-gray-700">
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                        <div>ចុចលើឈ្មោះ Group (Group Profile) → ចុចលើសញ្ញា Edit (<b>Edit</b>)</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                        <div>រកមើលពាក្យ <b>Topics</b> រួចចុចបើក (<b>Turn ON</b>)</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                        <div>ចុច Done ឬ Save ដើម្បីរក្សាទុក</div>
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-gray-200 text-xs text-gray-600 space-y-1">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-slate-700" />
                        <span>ជំហានទី៣: ផ្តល់សិទ្ធិ Manage Topics ឱ្យ Bot</span>
                      </div>
                      <p className="m-0 leading-relaxed">
                        នៅពេលបន្ថែម Bot ចូលក្នុងគ្រុប សូមបើកសិទ្ធិ Administrator ខាងក្រោម៖
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1.5 text-xs text-gray-700">
                      <div className="flex items-center justify-between p-2 rounded bg-slate-50 font-semibold">
                        <span>Manage Topics</span>
                        <span className="text-emerald-700 text-xs inline-flex items-center gap-1"><Check className="w-3 h-3" /> Enabled</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-50 font-semibold">
                        <span>Change Group Info</span>
                        <span className="text-emerald-700 text-xs inline-flex items-center gap-1"><Check className="w-3 h-3" /> Enabled</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-50 font-semibold">
                        <span>Pin Messages</span>
                        <span className="text-emerald-700 text-xs inline-flex items-center gap-1"><Check className="w-3 h-3" /> Enabled</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Radar Real-time Strip */}
                <div className="p-3 rounded-lg bg-slate-900 text-white flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                    <div>
                      <div className="text-xs font-bold text-white">
                        Radar Active • Auto-Detecting...
                      </div>
                      <div className="text-[10px] text-slate-400">
                        កំពុងរង់ចាំ Bot ចូលគ្រុប (ត្រួតពិនិត្យរៀងរាល់ 1.8 វិនាទី)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {pairData?.pair_code}
                  </span>
                </div>

                {/* Footer Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => prev > 1 ? (prev - 1 as any) : 1)}
                    disabled={wizardStep === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft size={12} />
                    <span>ត្រឡប់</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => prev < 3 ? (prev + 1 as any) : 3)}
                    disabled={wizardStep === 3}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <span>បន្ទាប់</span>
                    <ChevronRight size={13} />
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
