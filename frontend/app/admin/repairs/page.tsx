"use client";
import React, { useState, useMemo } from "react";

type Ticket = {
  id: string;
  customer: string;
  phone: string;
  device: string;
  issue: string;
  dateIn: string;
  estCost: number;
  status: string;
  technician: string;
};

const INITIAL_REPAIRS: Ticket[] = [
  { id: "#REP-1024", customer: "Chantha Ros", phone: "012 345 678", device: "MacBook Pro 14\"", issue: "Screen replacement", dateIn: "Oct 24, 2023", estCost: 450, status: "In Progress", technician: "Bora" },
  { id: "#REP-1023", customer: "Sovannarith K.", phone: "098 765 432", device: "ASUS ROG Zephyrus", issue: "Fan noise / Overheating", dateIn: "Oct 23, 2023", estCost: 85, status: "Pending Assessment", technician: "Unassigned" },
  { id: "#REP-1022", customer: "Lina Mey", phone: "087 654 321", device: "iPhone 13 Pro", issue: "Battery replacement", dateIn: "Oct 22, 2023", estCost: 65, status: "Ready", technician: "Sokha" },
  { id: "#REP-1021", customer: "Pheakdey S.", phone: "011 223 344", device: "Dell XPS 13", issue: "Keyboard not working", dateIn: "Oct 21, 2023", estCost: 120, status: "Completed", technician: "Bora" },
  { id: "#REP-1020", customer: "Sreyneth H.", phone: "099 887 766", device: "iPad Air 5", issue: "Water damage", dateIn: "Oct 20, 2023", estCost: 0, status: "Pending Assessment", technician: "Unassigned" },
];

const STATUSES = ["All Statuses", "Pending Assessment", "In Progress", "Ready", "Completed"];

const getStatusStyle = (status: string) => {
  switch (status) {
    case "Pending Assessment": return { bg: "#fef3c7", color: "#d97706" };
    case "In Progress": return { bg: "#e0f2fe", color: "#0284c7" };
    case "Ready": return { bg: "#dcfce7", color: "#16a34a" };
    case "Completed": return { bg: "#f3f4f6", color: "#6b7280" };
    default: return { bg: "#f3f4f6", color: "#4b5563" };
  }
};

export default function RepairManagementPage() {
  const [repairs, setRepairs] = useState<Ticket[]>(INITIAL_REPAIRS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [editForm, setEditForm] = useState<Ticket | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    return repairs.filter(r => {
      const matchStatus = statusFilter === "All Statuses" || r.status === statusFilter;
      const matchSearch = !searchQuery || r.id.toLowerCase().includes(searchQuery.toLowerCase()) || r.customer.toLowerCase().includes(searchQuery.toLowerCase()) || r.device.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [repairs, statusFilter, searchQuery]);

  const handleEditSave = () => {
    if (!editForm) return;
    setRepairs(prev => prev.map(r => r.id === editForm.id ? editForm : r));
    setEditTicket(null);
    setEditForm(null);
    showToast("Repair ticket updated!");
  };

  return (
    <div style={{ padding: "0 8px" }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, padding: "12px 20px", backgroundColor: toast.type === "success" ? "#16a34a" : "#dc2626", color: "#fff", borderRadius: 8, fontWeight: 500, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{toast.msg}</div>}

      {/* View Modal */}
      {viewTicket && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: 32, borderRadius: 12, maxWidth: 500, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Ticket Details — {viewTicket.id}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[["Customer", viewTicket.customer], ["Phone", viewTicket.phone], ["Device", viewTicket.device], ["Date In", viewTicket.dateIn], ["Est. Cost", `$${viewTicket.estCost}`], ["Technician", viewTicket.technician]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 4, letterSpacing: "0.5px" }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>{v}</div>
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 4, letterSpacing: "0.5px" }}>Reported Issue</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#111", backgroundColor: "#f9f9f9", padding: 12, borderRadius: 6, border: "1px solid #eaeaea" }}>{viewTicket.issue}</div>
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 8, letterSpacing: "0.5px" }}>STATUS</div>
              <span style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, backgroundColor: getStatusStyle(viewTicket.status).bg, color: getStatusStyle(viewTicket.status).color }}>{viewTicket.status}</span>
            </div>
            <button onClick={() => setViewTicket(null)} style={{ marginTop: 32, width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#444", fontWeight: 500, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTicket && editForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: 32, borderRadius: 12, maxWidth: 450, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Update Ticket {editForm.id}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }}>
                  {STATUSES.filter(s => s !== "All Statuses").map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Technician</label>
                <input value={editForm.technician} onChange={e => setEditForm({ ...editForm, technician: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Estimated Cost ($)</label>
                <input type="number" value={editForm.estCost} onChange={e => setEditForm({ ...editForm, estCost: parseFloat(e.target.value) || 0 })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => { setEditTicket(null); setEditForm(null); }} style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#444", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleEditSave} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 6, background: "#1d4ed8", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#111", margin: "0 0 8px 0" }}>Repair & Services</h1>
          <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Manage customer repair tickets, assignments, and service statuses.</p>
        </div>
        <button onClick={() => showToast("New ticket form coming soon!")} style={{ padding: "10px 16px", backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          <span>+</span> New Repair Ticket
        </button>
      </div>

      {/* Filters Box */}
      <div style={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: "20px", marginBottom: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 300px" }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Ticket ID, Customer, or Device" style={{ width: "100%", padding: "10px 12px 10px 32px", border: "1px solid #eaeaea", borderRadius: 4, fontSize: 14, outline: "none", backgroundColor: "#f9f9f9" }} />
        </div>
        <div style={{ position: "relative" }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "10px 32px 10px 12px", border: "1px solid #eaeaea", borderRadius: 4, fontSize: 14, color: "#333", appearance: "none", outline: "none", cursor: "pointer", backgroundColor: "#f9f9f9" }}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#888", width: 14, height: 14, pointerEvents: "none" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <button onClick={() => { setSearchQuery(""); setStatusFilter("All Statuses"); }} style={{ padding: "10px 16px", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: 4, fontSize: 14, fontWeight: 500, color: "#666", cursor: "pointer" }}>Clear Filters</button>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eaeaea", backgroundColor: "#fafafa" }}>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px" }}>TICKET ID</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px" }}>CUSTOMER</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px" }}>DEVICE / ISSUE</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px" }}>DATE IN</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px" }}>STATUS</th>
                <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "#888" }}>No repair tickets found.</td></tr>
              ) : filtered.map((ticket) => {
                const s = getStatusStyle(ticket.status);
                return (
                  <tr key={ticket.id} style={{ borderBottom: "1px solid #eaeaea" }}>
                    <td style={{ padding: "16px 24px" }}><span style={{ fontSize: 13, fontWeight: 700, color: "#111", fontFamily: "monospace" }}>{ticket.id}</span></td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#222", marginBottom: 2 }}>{ticket.customer}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{ticket.phone}</div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#111", marginBottom: 2 }}>{ticket.device}</div>
                      <div style={{ fontSize: 12, color: "#dc2626" }}>{ticket.issue}</div>
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: 13, color: "#555" }}>{ticket.dateIn}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, backgroundColor: s.bg, color: s.color }}>{ticket.status}</span>
                      {ticket.technician !== "Unassigned" && <div style={{ fontSize: 11, color: "#888", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>{ticket.technician}</div>}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                        <button onClick={() => setViewTicket(ticket)} style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }} title="View Details">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button onClick={() => { setEditTicket(ticket); setEditForm(ticket); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8" }} title="Update Ticket">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
