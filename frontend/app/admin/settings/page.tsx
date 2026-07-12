"use client";
import React, { useState } from "react";

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
    "Store Profile": <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
    "Regional & Currency": <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
    "Security": <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
    "Notification Settings": <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <div onClick={onChange} style={{ width: 44, height: 24, backgroundColor: value ? "#991b1b" : "#cbd5e1", borderRadius: 12, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, backgroundColor: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: value ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}></div>
    </div>
  );

  return (
    <div style={{ padding: "0 8px", fontFamily: "sans-serif", maxWidth: 1100 }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, padding: "12px 20px", backgroundColor: toast.type === "success" ? "#16a34a" : "#dc2626", color: "#fff", borderRadius: 8, fontWeight: 500, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{toast.msg}</div>}

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#111", margin: "0 0 8px 0" }}>System Settings</h1>
        <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Configure store information, regional settings, currency, and security preferences.</p>
      </div>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        {/* Left Nav */}
        <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          {ACTIVE_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px",
              backgroundColor: activeTab === tab ? "#f3f4f6" : "transparent",
              border: "none",
              borderLeft: activeTab === tab ? "3px solid #991b1b" : "3px solid transparent",
              color: activeTab === tab ? "#111" : "#666",
              fontSize: 14, fontWeight: activeTab === tab ? 600 : 500,
              cursor: "pointer", textAlign: "left", transition: "all 0.15s"
            }}>
              {TAB_ICONS[tab]} {tab}
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── STORE PROFILE ── */}
          {activeTab === "Store Profile" && (
            <div style={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 24px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Store Profile
              </h2>
              <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 32 }}>
                <div style={{ width: 80, height: 80, backgroundColor: "#991b1b", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 48, fontWeight: 900, fontStyle: "italic" }}>S</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>Store Logo</div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                    <button onClick={() => showToast("Logo upload coming soon!")} style={{ padding: "6px 16px", backgroundColor: "#fff", border: "1px solid #3b82f6", color: "#3b82f6", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Change Logo</button>
                    <button onClick={() => showToast("Logo removed!")} style={{ padding: "6px 16px", backgroundColor: "#fff", border: "1px solid #ddd", color: "#666", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Remove</button>
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>Recommended: 512×512px. JPG, PNG.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>Store Name</label>
                  <input value={storeName} onChange={e => setStoreName(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>Contact Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>Physical Address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
              <div style={{ marginBottom: 32 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>Telegram Support Link</label>
                <div style={{ display: "flex", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                  <span style={{ padding: "10px 12px", backgroundColor: "#f3f4f6", color: "#666", fontSize: 14, borderRight: "1px solid #ddd", whiteSpace: "nowrap" }}>t.me/</span>
                  <input value={telegram} onChange={e => setTelegram(e.target.value)} style={{ flex: 1, padding: "10px 12px", border: "none", fontSize: 14, outline: "none" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSaveProfile} style={{ padding: "10px 24px", backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Save Changes</button>
              </div>
            </div>
          )}

          {/* ── REGIONAL & CURRENCY ── */}
          {activeTab === "Regional & Currency" && (
            <div style={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 24px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                Regional & Currency
              </h2>
              <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>Default Interface Language</label>
                  <div style={{ position: "relative" }}>
                    <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: "100%", padding: "10px 32px 10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, appearance: "none", outline: "none", backgroundColor: "#fff", cursor: "pointer" }}>
                      <option>English (EN)</option>
                      <option>Khmer (KM)</option>
                    </select>
                    <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#888", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>Primary Currency</label>
                  <div style={{ position: "relative" }}>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: "100%", padding: "10px 32px 10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, appearance: "none", outline: "none", backgroundColor: "#fff", cursor: "pointer" }}>
                      <option>US Dollar (USD)</option>
                      <option>Cambodian Riel (KHR)</option>
                    </select>
                    <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#888", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: "#f9f9f9", border: "1px solid #eaeaea", borderRadius: 4, padding: "20px 24px", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>Exchange Rate (USD to KHR)</div>
                  <div style={{ fontSize: 13, color: "#666" }}>Used for secondary pricing display.</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>$1 = </span>
                  <input type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} style={{ width: 90, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none", textAlign: "right", fontWeight: 600 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#888" }}>៛</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSaveRegional} style={{ padding: "10px 24px", backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Save Changes</button>
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === "Security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 24px 0", display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Change Password
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                  <button onClick={handleSaveSecurity} style={{ padding: "10px 24px", backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Change Password</button>
                </div>
              </div>
              <div style={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 20px 0" }}>Two-Factor Authentication</h2>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#f9f9f9", borderRadius: 6, border: "1px solid #eaeaea" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Enable 2FA</div>
                    <div style={{ fontSize: 13, color: "#666" }}>Add an extra layer of security to your admin account.</div>
                  </div>
                  <Toggle value={twoFA} onChange={() => { setTwoFA(!twoFA); showToast(twoFA ? "2FA disabled." : "2FA enabled!"); }} />
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "Notification Settings" && (
            <div style={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 24px 0" }}>Notification Settings</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "Email Notifications", desc: "Receive all admin alerts to your email.", value: emailNotify, set: () => setEmailNotify(!emailNotify) },
                  { label: "New Order Alerts", desc: "Get notified whenever a new order is placed.", value: orderNotify, set: () => setOrderNotify(!orderNotify) },
                  { label: "Low Stock Warnings", desc: "Alert when product stock falls below 5 units.", value: lowStockNotify, set: () => setLowStockNotify(!lowStockNotify) },
                  { label: "Repair Status Updates", desc: "Send notifications on repair ticket status changes.", value: repairNotify, set: () => setRepairNotify(!repairNotify) },
                ].map(({ label, desc, value, set }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", backgroundColor: "#f9f9f9", borderRadius: 6, border: "1px solid #eaeaea" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, color: "#666" }}>{desc}</div>
                    </div>
                    <Toggle value={value} onChange={set} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <button onClick={handleSaveNotifications} style={{ padding: "10px 24px", backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Save Preferences</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
