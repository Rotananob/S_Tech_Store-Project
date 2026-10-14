"use client";

import React, { useState, useEffect } from "react";
import { 
  Mail, Send, CheckCircle2, AlertTriangle, ShieldCheck, 
  ExternalLink, Sparkles, RefreshCw, X, Key, Server, 
  Zap, HelpCircle, Check, Globe
} from "lucide-react";
import { 
  getEmailSettings, updateEmailSettings, testSendEmail, 
  EmailSettings 
} from "@/lib/services/admin.service";

interface EmailDispatcherConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipient?: string;
}

export default function EmailDispatcherConsoleModal({
  isOpen,
  onClose,
  defaultRecipient = "rothvloger@gmail.com",
}: EmailDispatcherConsoleModalProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [activeTab, setActiveTab] = useState<"resend" | "smtp" | "brevo">("resend");

  // Form fields
  const [resendKey, setResendKey] = useState("");
  const [brevoKey, setBrevoKey] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpEncryption, setSmtpEncryption] = useState<"tls" | "ssl">("tls");
  const [fromEmail, setFromEmail] = useState("orders@s-tech-store.tech");
  const [fromName, setFromName] = useState("S Tech Store");

  // Action states
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testRecipient, setTestRecipient] = useState(defaultRecipient);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await getEmailSettings();
      if (res.success && res.settings) {
        setSettings(res.settings);
        setFromEmail(res.settings.from_email || "orders@s-tech-store.tech");
        setFromName(res.settings.from_name || "S Tech Store");
        if (res.settings.smtp_host) setSmtpHost(res.settings.smtp_host);
        if (res.settings.smtp_port) setSmtpPort(res.settings.smtp_port);
        if (res.settings.smtp_username) setSmtpUsername(res.settings.smtp_username);
        if (res.settings.smtp_encryption) setSmtpEncryption(res.settings.smtp_encryption);
        
        if (res.settings.active_engine === "resend" || res.settings.has_resend_key) {
          setActiveTab("resend");
        } else if (res.settings.active_engine === "smtp") {
          setActiveTab("smtp");
        }
      }
    } catch (e: any) {
      showToast(e.message || "Failed to load email settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      if (defaultRecipient) {
        setTestRecipient(defaultRecipient);
      }
    }
  }, [isOpen, defaultRecipient]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        from_email: fromEmail.trim(),
        from_name: fromName.trim(),
      };

      if (activeTab === "resend") {
        payload.provider = "resend";
        if (resendKey.trim()) payload.resend_api_key = resendKey.trim();
      } else if (activeTab === "brevo") {
        payload.provider = "brevo";
        if (brevoKey.trim()) payload.brevo_api_key = brevoKey.trim();
      } else if (activeTab === "smtp") {
        payload.provider = "smtp";
        payload.smtp_host = smtpHost.trim();
        payload.smtp_port = smtpPort;
        payload.smtp_username = smtpUsername.trim();
        payload.smtp_encryption = smtpEncryption;
        if (smtpPassword.trim()) payload.smtp_password = smtpPassword.trim();
      }

      const res = await updateEmailSettings(payload);
      if (res.success) {
        showToast("ការកំណត់ Email ត្រូវបានរក្សាទុកជោគជ័យ!");
        setSettings(res.settings);
        setResendKey("");
        setBrevoKey("");
        setSmtpPassword("");
      } else {
        showToast(res.message || "បរាជ័យក្នុងការរក្សាទុក", "error");
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || e.message || "បរាជ័យក្នុងការរក្សាទុក", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testRecipient.trim()) {
      showToast("សូមបញ្ចូលអាសយដ្ឋាន Email ទទួល", "error");
      return;
    }
    setTesting(true);
    try {
      const res = await testSendEmail(testRecipient.trim());
      if (res.success) {
        showToast(res.message || `សារសាកល្បងបានទៅដល់ ${testRecipient} ជោគជ័យ!`);
      } else {
        showToast(res.message || "ការផ្ញើសាកល្បងបានបរាជ័យ", "error");
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.response?.data?.error || e.message || "បរាជ័យក្នុងការផ្ញើ Email សាកល្បង";
      showToast(errMsg, "error");
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-gray-900 via-rose-950 to-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>Email Delivery Engine & Gmail Verification</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Master Console
                </span>
              </h3>
              <p className="text-xs text-rose-200/80 m-0">
                ប្រព័ន្ធបញ្ជូនសារ Email ផ្លូវការ (Order Receipt & Notifications) ទៅកាន់ Real Gmail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toast alert */}
        {toast && (
          <div className={`p-3 text-xs font-bold flex items-center gap-2 ${
            toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200" : "bg-rose-50 text-rose-800 border-b border-rose-200"
          }`}>
            {toast.type === "success" ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
            <span className="flex-1">{toast.msg}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Cloud Hosting Diagnostic Notice */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <Zap size={16} className="text-amber-600" />
              <span>ព័ត៌មានបច្ចេកទេសសំខាន់សម្រាប់ Render Hosting:</span>
            </div>
            <p className="leading-relaxed m-0 text-amber-900/90">
              សេវា <strong>Render Free Tier</strong> បានបិទ Port SMTP (25, 465, 587) មិនឱ្យតភ្ជាប់ទៅខាងក្រៅឡើយ។ ដូច្នេះដើម្បីធានាថាការផ្ញើ Email ទៅកាន់ <strong>Gmail ដើរជោគជ័យ ១០០%</strong> យើងសូមណែនាំឱ្យប្រើ <strong>Resend HTTPS API (Port 443)</strong> ដែលឥតគិតថ្លៃ (3,000 emails/ខែ) ហើយអាចបញ្ជូនភ្លាមៗដោយគ្មានបញ្ហា Port Block ឡើយ!
            </p>
          </div>

          {/* Engine Status Card */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${settings?.is_ready ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"} shrink-0`} />
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <span>ម៉ាស៊ីនបញ្ជូន Email បច្ចុប្បន្ន:</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                    settings?.active_engine === "resend" ? "bg-purple-100 text-purple-800" :
                    settings?.active_engine === "brevo" ? "bg-sky-100 text-sky-800" :
                    settings?.active_engine === "smtp" ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-700"
                  }`}>
                    {settings?.active_engine || "NONE (មិនទាន់កំណត់)"}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Sender: {settings?.from_name || "S Tech Store"} &lt;{settings?.from_email || "orders@s-tech-store.tech"}&gt;
                </div>
              </div>
            </div>
            <button
              onClick={loadSettings}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>ពិនិត្យឡើងវិញ (Refresh)</span>
            </button>
          </div>

          {/* Instant Live Verification Test Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-rose-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles size={14} className="text-rose-600" />
                <span>សាកល្បងផ្ញើសារ Real Gmail ភ្លាមៗ (Live Dispatch Test)</span>
              </label>
              <span className="text-[11px] text-rose-700 font-semibold">Port 443 Verified</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="បញ្ចូល Gmail សម្រាប់តេស្ត (ឧ. rothvloger@gmail.com)..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-rose-300 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-rose-500/20 font-mono"
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testing || !testRecipient.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0"
              >
                {testing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>កំពុងផ្ញើទៅ Gmail...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>ផ្ញើសាកល្បង (Send Test)</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 m-0">
              * ប្រព័ន្ធនឹងបញ្ជូន HTML Order Receipt ផ្លូវការទៅកាន់ Gmail Inbox ភ្លាមៗដើម្បីបញ្ជាក់ថាប្រព័ន្ធដើរពិតប្រាកដ។
            </p>
          </div>

          {/* Provider Tabs */}
          <div className="space-y-4">
            <div className="flex border-b border-gray-200 gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("resend")}
                className={`pb-2.5 cursor-pointer flex items-center gap-1.5 transition-all ${
                  activeTab === "resend"
                    ? "border-b-2 border-rose-600 text-rose-600 font-extrabold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Zap size={14} />
                <span>1. Resend HTTPS (Recommended for Render)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("smtp")}
                className={`pb-2.5 cursor-pointer flex items-center gap-1.5 transition-all ${
                  activeTab === "smtp"
                    ? "border-b-2 border-rose-600 text-rose-600 font-extrabold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Server size={14} />
                <span>2. Gmail SMTP (Direct Google)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("brevo")}
                className={`pb-2.5 cursor-pointer flex items-center gap-1.5 transition-all ${
                  activeTab === "brevo"
                    ? "border-b-2 border-rose-600 text-rose-600 font-extrabold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Globe size={14} />
                <span>3. Brevo HTTPS API</span>
              </button>
            </div>

            {/* Tab 1: Resend HTTPS */}
            {activeTab === "resend" && (
              <div className="space-y-4 p-4 rounded-2xl bg-gray-50/70 border border-gray-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Key size={14} className="text-purple-600" />
                      <span>Resend API Key (re_...)</span>
                    </label>
                    <a
                      href="https://resend.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                    >
                      <span>បើកយក Key ឥតគិតថ្លៃនៅ Resend.com</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={resendKey}
                    onChange={(e) => setResendKey(e.target.value)}
                    placeholder={settings?.resend_api_key || "បិទភ្ជាប់ Resend Key (ឧ. re_1234567890abcdef)..."}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-mono text-gray-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    {settings?.has_resend_key ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span>Key ត្រូវបានរក្សាទុកក្នុងប្រព័ន្ធរួចរាល់ (អាចបញ្ចូលថ្មីដើម្បីផ្លាស់ប្តូរ)</span>
                      </>
                    ) : (
                      "មិនទាន់មាន Resend Key ទេ"
                    )}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200/60 text-xs text-purple-900 space-y-1.5">
                  <div className="font-bold">របៀបយក Resend API Key ត្រឹម ៣០ វិនាទី៖</div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-purple-950/90 pl-1">
                    <li>ចូលទៅកាន់ <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline font-bold">resend.com</a> រួចចុច Sign Up (ចូលជាមួយ GitHub ឬ Google)</li>
                    <li>ចុចលើ <strong>API Keys</strong> រួចចុច <strong>Create API Key</strong></li>
                    <li>ចម្លង Key ដែលចាប់ផ្តើមដោយ <code className="bg-white px-1 py-0.5 rounded font-mono">re_...</code> មកបិទភ្ជាប់ក្នុងប្រអប់ខាងលើ រួចចុច Save!</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Tab 2: Gmail SMTP */}
            {activeTab === "smtp" && (
              <div className="space-y-4 p-4 rounded-2xl bg-gray-50/70 border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">SMTP Port & Encryption</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-24 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-mono outline-none"
                      />
                      <select
                        value={smtpEncryption}
                        onChange={(e: any) => setSmtpEncryption(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 outline-none"
                      >
                        <option value="tls">TLS (Port 587)</option>
                        <option value="ssl">SSL (Port 465)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Gmail Address (Username)</label>
                    <input
                      type="email"
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                      placeholder="nobrothana180703@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Google App Password (16-char)</label>
                    <input
                      type="password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/60 text-xs text-blue-900 space-y-1">
                  <div className="font-bold">របៀបយក Google App Password ពីគណនី Google៖</div>
                  <p className="text-[11px] leading-relaxed m-0 text-blue-950/90">
                    ចូលទៅកាន់ <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold">myaccount.google.com/apppasswords</a> (ត្រូវបើក 2-Step Verification ជាមុន) រួចបង្កើត App Password ឈ្មោះ &quot;S Tech Store&quot; ដើម្បីទទួលបានលេខកូដ ១៦ ខ្ទង់។ <em>ចំណាំ៖ នៅលើ Render Free tier Port នេះអាចនឹងជាប់ Block ដូច្នេះសូមប្រើ Resend ជំនួសវិញប្រសិនបើ SMTP មិនឆ្លើយតប។</em>
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Brevo HTTPS */}
            {activeTab === "brevo" && (
              <div className="space-y-4 p-4 rounded-2xl bg-gray-50/70 border border-gray-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Key size={14} className="text-sky-600" />
                      <span>Brevo (Sendinblue) API Key</span>
                    </label>
                    <a
                      href="https://brevo.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                    >
                      <span>បើក Brevo.com</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={brevoKey}
                    onChange={(e) => setBrevoKey(e.target.value)}
                    placeholder={settings?.brevo_api_key || "បិទភ្ជាប់ Brevo Key (xkeysib-...)..."}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-mono text-gray-900 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  />
                </div>
              </div>
            )}

            {/* Sender Branding Profile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Sender Name (ឈ្មោះអ្នកផ្ញើ)</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="S Tech Store"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Sender Email</label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="orders@s-tech-store.tech"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 font-mono outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-100 cursor-pointer transition-colors"
          >
            បិទ (Close)
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md transition-all"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>កំពុងរក្សាទុក...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>រក្សាទុកការកំណត់ (Save Email Settings)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
