"use client";
import React, { useState, useMemo } from "react";

type Promotion = {
  id: string;
  name: string;
  code: string;
  type: string;
  value: string;
  validity: string;
  usageCount: number;
  usageMax: number | null;
  status: string;
  autoApplied: boolean;
};

const INITIAL_PROMOS: Promotion[] = [
  { id: "1", name: "Khmer New Year Sale", code: "KNY2024", type: "Percentage", value: "15%", validity: "Apr 10 - Apr 16, 2024", usageCount: 450, usageMax: 1000, status: "Active", autoApplied: false },
  { id: "2", name: "Flash Deal: RTX 4090", code: "", type: "Fixed Amount", value: "-$200", validity: "Ends in 2 days", usageCount: 12, usageMax: 20, status: "Active", autoApplied: true },
  { id: "3", name: "Back to School Promo", code: "STUDENT24", type: "Percentage", value: "10%", validity: "Aug 1 - Sep 15, 2024", usageCount: 0, usageMax: null, status: "Scheduled", autoApplied: false },
];

export default function PromotionManagementPage() {
  const [promos, setPromos] = useState<Promotion[]>(INITIAL_PROMOS);
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [newPromo, setNewPromo] = useState<Partial<Promotion>>({ type: "Percentage", status: "Active", autoApplied: false });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    return promos.filter(p => {
      const matchType = typeFilter === "All Types" || p.type === typeFilter;
      const matchStatus = statusFilter === "All Status" || p.status === statusFilter;
      return matchType && matchStatus;
    });
  }, [promos, typeFilter, statusFilter]);

  const handleCreateSave = () => {
    if (!newPromo.name || !newPromo.value) {
      showToast("Name and Value are required.", "error");
      return;
    }
    const promo: Promotion = {
      id: Date.now().toString(),
      name: newPromo.name!,
      code: newPromo.code || "",
      type: newPromo.type || "Percentage",
      value: newPromo.value!,
      validity: newPromo.validity || "No expiry",
      usageCount: 0,
      usageMax: newPromo.usageMax || null,
      status: newPromo.status || "Active",
      autoApplied: newPromo.autoApplied || false,
    };
    setPromos([promo, ...promos]);
    setShowCreate(false);
    setNewPromo({ type: "Percentage", status: "Active", autoApplied: false });
    showToast("Promotion created successfully!");
  };

  const handleDelete = (id: string) => {
    setPromos(prev => prev.filter(p => p.id !== id));
    showToast("Promotion deleted.");
  };

  return (
    <div style={{ padding: "0 8px", fontFamily: "sans-serif" }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, padding: "12px 20px", backgroundColor: toast.type === "success" ? "#16a34a" : "#dc2626", color: "#fff", borderRadius: 8, fontWeight: 500, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{toast.msg}</div>}

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: 32, borderRadius: 12, maxWidth: 500, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Create New Promotion</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Campaign Name *</label>
                <input value={newPromo.name || ""} onChange={e => setNewPromo({ ...newPromo, name: e.target.value })} placeholder="e.g. Summer Sale" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Type</label>
                  <select value={newPromo.type} onChange={e => setNewPromo({ ...newPromo, type: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }}>
                    <option>Percentage</option>
                    <option>Fixed Amount</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Value *</label>
                  <input value={newPromo.value || ""} onChange={e => setNewPromo({ ...newPromo, value: e.target.value })} placeholder="e.g. 15% or -$200" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Promo Code (optional)</label>
                  <input value={newPromo.code || ""} onChange={e => setNewPromo({ ...newPromo, code: e.target.value })} placeholder="e.g. SUMMER24" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Validity Period</label>
                  <input value={newPromo.validity || ""} onChange={e => setNewPromo({ ...newPromo, validity: e.target.value })} placeholder="e.g. Jun 1 - Jun 30" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Status</label>
                  <select value={newPromo.status} onChange={e => setNewPromo({ ...newPromo, status: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }}>
                    <option>Active</option>
                    <option>Scheduled</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Max Uses (optional)</label>
                  <input type="number" value={newPromo.usageMax || ""} onChange={e => setNewPromo({ ...newPromo, usageMax: parseInt(e.target.value) || null })} placeholder="Unlimited" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#333", cursor: "pointer" }}>
                  <input type="checkbox" checked={newPromo.autoApplied} onChange={e => setNewPromo({ ...newPromo, autoApplied: e.target.checked })} style={{ width: 16, height: 16 }} />
                  Auto-apply without code
                </label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#444", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleCreateSave} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 6, background: "#991b1b", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Create Promotion</button>
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111", margin: "0 0 8px 0" }}>Promotion Management</h1>
          <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Create and manage sales campaigns, discount coupons, and limited-time offers.</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: "10px 16px", backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          Create New Promotion
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
        <div style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, border: "1px solid #eaeaea", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, backgroundColor: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#444", backgroundColor: "#f3f4f6", padding: "4px 10px", borderRadius: 4 }}>Current</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 8 }}>Active Campaigns</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#111" }}>{promos.filter(p => p.status === "Active").length}</div>
        </div>
        <div style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, border: "1px solid #eaeaea", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, backgroundColor: "#fef2f2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6", display: "flex", alignItems: "center", gap: 4 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>+12%</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 8 }}>Total Discounts Given</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#111", letterSpacing: "-1px" }}>$1,250</div>
        </div>
        <div style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, border: "1px solid #eaeaea", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, backgroundColor: "#f9f9f9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", backgroundColor: "#fee2e2", padding: "4px 10px", borderRadius: 4 }}>Urgent</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 8 }}>Expiring Soon</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#111" }}>2</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea" }}>
        
        {/* Filters Row */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #eaeaea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#444", fontSize: 14, fontWeight: 600 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filters:
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: "8px 32px 8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13, appearance: "none", outline: "none", backgroundColor: "#fff", cursor: "pointer", color: "#333" }}>
                <option>All Types</option>
                <option>Percentage</option>
                <option>Fixed Amount</option>
              </select>
              <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#888", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div style={{ position: "relative" }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "8px 32px 8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13, appearance: "none", outline: "none", backgroundColor: "#fff", cursor: "pointer", color: "#333" }}>
                <option>All Status</option>
                <option>Active</option>
                <option>Scheduled</option>
              </select>
              <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#888", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eaeaea" }}>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "1px", width: "25%" }}>CAMPAIGN NAME</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "1px" }}>TYPE & VALUE</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "1px" }}>VALIDITY PERIOD</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "1px" }}>USAGE</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "1px" }}>STATUS</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "1px", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "#888" }}>No promotions found.</td></tr>
              ) : filtered.map((promo, i) => (
                <tr key={promo.id} style={{ borderBottom: i === filtered.length - 1 ? "none" : "1px solid #eaeaea" }}>
                  <td style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#222", marginBottom: 4 }}>{promo.name}</div>
                    <div style={{ fontSize: 13, color: promo.autoApplied ? "#888" : "#666" }}>
                      {promo.autoApplied ? "Auto-applied" : <>Code: <span style={{ fontFamily: "monospace" }}>{promo.code}</span></>}
                    </div>
                  </td>
                  <td style={{ padding: "20px 24px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                      <span style={{ fontSize: 12, color: "#444", padding: "4px 8px" }}>{promo.type}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", padding: "4px 8px", backgroundColor: "#eff6ff" }}>{promo.value}</span>
                    </div>
                  </td>
                  <td style={{ padding: "20px 24px", fontSize: 13, color: "#555" }}>
                    {promo.validity}
                  </td>
                  <td style={{ padding: "20px 24px" }}>
                    {promo.usageMax ? (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#222", marginBottom: 6 }}>{promo.usageCount} <span style={{ fontWeight: 400, color: "#888" }}>/ {promo.usageMax}</span></div>
                        <div style={{ width: "100%", maxWidth: 120, height: 4, backgroundColor: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${(promo.usageCount / promo.usageMax) * 100}%`, height: "100%", backgroundColor: (promo.usageCount / promo.usageMax) > 0.8 ? "#dc2626" : "#1d4ed8" }}></div>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: "#888" }}>{promo.usageCount === 0 ? "Not started" : `${promo.usageCount} uses`}</div>
                    )}
                  </td>
                  <td style={{ padding: "20px 24px" }}>
                    {promo.status === "Active" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", backgroundColor: "#eff6ff", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#1d4ed8" }}></span> Active
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", backgroundColor: "#f3f4f6", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#666" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Scheduled
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "20px 24px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                      <button onClick={() => handleDelete(promo.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }} title="Delete">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
