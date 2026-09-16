"use client";
import React, { useState } from "react";
import { Store, Globe, Shield, Bell, Upload, Trash2 } from "lucide-react";

const ACTIVE_TABS = ["Store Profile", "Regional & Currency", "Security", "Notification Settings"];

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState("Store Profile");
  const [storeName, setStoreName] = useState("S Tech Store");
  const [phone, setPhone] = useState("+855 12 345 678");
  const [address, setAddress] = useState("123 Monivong Blvd, Phnom Penh, Cambodia");
  const [telegram, setTelegram] = useState("STechSupport");
  const [language, setLanguage] = useState("English (EN)");
  const [currency, setCurrency] = useState("US Dollar (USD)");
  const [exchangeRate, setExchangeRate] = useState("4100");
  const [featured, setFeatured] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFA, setTwoFA] = useState(false);
  const [emailNotify, setEmailNotify] = useState(true);
  const [orderNotify, setOrderNotify] = useState(true);
  const [lowStockNotify, setLowStockNotify] = useState(true);
  const [repairNotify, setRepairNotify] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = () => {
    if (!storeName.trim()) return showToast("Store name cannot be empty.", "error");
    showToast("Store profile saved successfully!");
  };

  const handleSaveRegional = () => {
    const rate = parseFloat(exchangeRate);
    if (isNaN(rate) || rate <= 0) return showToast("Please enter a valid exchange rate.", "error");
    showToast("Regional & currency settings saved!");
  };

  const handleSaveSecurity = () => {
    if (!currentPassword) return showToast("Please enter your current password.", "error");
    if (newPassword.length < 6) return showToast("New password must be at least 6 characters.", "error");
    if (newPassword !== confirmPassword) return showToast("Passwords do not match.", "error");
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    showToast("Password changed successfully!");
  };

  const handleSaveNotifications = () => {
    showToast("Notification preferences saved!");
  };

  const TAB_ICONS: Record<string, React.ReactNode> = {
    "Store Profile": <Store size={18} />,
    "Regional & Currency": <Globe size={18} />,
    "Security": <Shield size={18} />,
    "Notification Settings": <Bell size={18} />,
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button 
      type="button"
      onClick={onChange} 
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${value ? 'bg-[#991b1b]' : 'bg-gray-300'}`}
    >
      <div 
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${value ? 'left-6' : 'left-1'}`}
      />
    </button>
  );

  return (
    <div className="font-sans max-w-5xl mx-auto">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">System Settings</h1>
        <p className="text-gray-500 text-sm">Configure store information, regional settings, currency, and security preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left Nav */}
        <div className="w-full md:w-60 flex flex-col gap-1 flex-shrink-0 bg-white md:bg-transparent rounded-xl md:rounded-none p-2 md:p-0 border border-gray-100 md:border-none shadow-sm md:shadow-none">
          {ACTIVE_TABS.map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg md:rounded-none md:border-l-4 text-sm font-medium transition-all text-left ${
                activeTab === tab 
                  ? 'bg-gray-100 md:bg-transparent md:border-[#991b1b] text-gray-900 font-semibold' 
                  : 'md:border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={activeTab === tab ? "text-[#991b1b]" : "text-gray-400"}>
                {TAB_ICONS[tab]}
              </span>
              {tab}
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div className="flex-1 w-full flex flex-col gap-6">

          {/* ── STORE PROFILE ── */}
          {activeTab === "Store Profile" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Store className="text-blue-600" size={20} />
                Store Profile
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-8">
                <div className="w-20 h-20 bg-[#991b1b] rounded-xl flex items-center justify-center text-white text-4xl font-black italic shadow-md shrink-0">
                  S
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-3">Store Logo</div>
                  <div className="flex gap-3 mb-2">
                    <button 
                      onClick={() => showToast("Logo upload coming soon!")} 
                      className="px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                    >
                      <Upload size={14} /> Change Logo
                    </button>
                    <button 
                      onClick={() => showToast("Logo removed!")} 
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">Recommended: 512×512px. JPG, PNG.</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store Name</label>
                  <input 
                    value={storeName} 
                    onChange={e => setStoreName(e.target.value)} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Phone</label>
                  <input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  />
                </div>
              </div>
              
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Physical Address</label>
                <input 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                />
              </div>
              
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telegram Support Link</label>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                  <span className="px-4 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 whitespace-nowrap">t.me/</span>
                  <input 
                    value={telegram} 
                    onChange={e => setTelegram(e.target.value)} 
                    className="flex-1 px-4 py-2 text-sm outline-none" 
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-5 border-t border-gray-100">
                <button 
                  onClick={handleSaveProfile} 
                  className="px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* ── REGIONAL & CURRENCY ── */}
          {activeTab === "Regional & Currency" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Globe className="text-blue-600" size={20} />
                Regional & Currency
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default Interface Language</label>
                  <select 
                    value={language} 
                    onChange={e => setLanguage(e.target.value)} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                  >
                    <option>English (EN)</option>
                    <option>Khmer (KM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Primary Currency</label>
                  <select 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                  >
                    <option>US Dollar (USD)</option>
                    <option>Cambodian Riel (KHR)</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">Exchange Rate (USD to KHR)</div>
                  <div className="text-xs text-gray-500">Used for secondary pricing display.</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">$1 = </span>
                  <input 
                    type="number" 
                    value={exchangeRate} 
                    onChange={e => setExchangeRate(e.target.value)} 
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-right font-bold transition-all" 
                  />
                  <span className="text-sm font-bold text-gray-500">៛</span>
                </div>
              </div>
              
              <div className="flex justify-end pt-5 border-t border-gray-100">
                <button 
                  onClick={handleSaveRegional} 
                  className="px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === "Security" && (
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Shield className="text-blue-600" size={20} />
                  Change Password
                </h2>
                
                <div className="flex flex-col gap-5 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
                    <input 
                      type="password" 
                      value={currentPassword} 
                      onChange={e => setCurrentPassword(e.target.value)} 
                      placeholder="••••••••" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="Min. 6 characters" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      placeholder="Re-enter new password" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                  <button 
                    onClick={handleSaveSecurity} 
                    className="px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Two-Factor Authentication</h2>
                <div className="flex justify-between items-center p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <div className="text-sm font-bold text-gray-900 mb-1">Enable 2FA</div>
                    <div className="text-xs text-gray-500">Add an extra layer of security to your admin account.</div>
                  </div>
                  <Toggle value={twoFA} onChange={() => { setTwoFA(!twoFA); showToast(twoFA ? "2FA disabled." : "2FA enabled!"); }} />
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "Notification Settings" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Bell className="text-blue-600" size={20} />
                Notification Settings
              </h2>
              
              <div className="flex flex-col gap-4">
                {[
                  { label: "Email Notifications", desc: "Receive all admin alerts to your email.", value: emailNotify, set: () => setEmailNotify(!emailNotify) },
                  { label: "New Order Alerts", desc: "Get notified whenever a new order is placed.", value: orderNotify, set: () => setOrderNotify(!orderNotify) },
                  { label: "Low Stock Warnings", desc: "Alert when product stock falls below 5 units.", value: lowStockNotify, set: () => setLowStockNotify(!lowStockNotify) },
                  { label: "Repair Status Updates", desc: "Send notifications on repair ticket status changes.", value: repairNotify, set: () => setRepairNotify(!repairNotify) },
                ].map(({ label, desc, value, set }) => (
                  <div key={label} className="flex justify-between items-center p-5 bg-gray-50 rounded-xl border border-gray-200 transition-colors hover:bg-gray-100">
                    <div>
                      <div className="text-sm font-bold text-gray-900 mb-1">{label}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                    <Toggle value={value} onChange={set} />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                <button 
                  onClick={handleSaveNotifications} 
                  className="px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
