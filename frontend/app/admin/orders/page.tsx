"use client";
import React, { useState, useMemo } from "react";

type Order = {
  id: string;
  customer: string;
  email: string;
  date: string;
  time: string;
  paymentMethod: string;
  totalUsd: number;
  totalKhr: number;
  status: string;
};

const INITIAL_ORDERS: Order[] = [
  { id: "#ORD-5092", customer: "Sok Makara", email: "sok.m@example.com", date: "Oct 24, 2023", time: "14:30", paymentMethod: "ABA Pay", totalUsd: 1249.00, totalKhr: 5120900, status: "Processing" },
  { id: "#ORD-5091", customer: "Rithy Odom", email: "rithy.o@example.com", date: "Oct 23, 2023", time: "09:15", paymentMethod: "Wing Pay", totalUsd: 85.50, totalKhr: 350550, status: "Completed" },
  { id: "#ORD-5090", customer: "Nita Chhay", email: "nita.ch@example.com", date: "Oct 23, 2023", time: "16:45", paymentMethod: "Credit Card", totalUsd: 2100.00, totalKhr: 8610000, status: "Pending" },
  { id: "#ORD-5089", customer: "Vannak Keo", email: "vannak.k@example.com", date: "Oct 22, 2023", time: "10:05", paymentMethod: "Cash on Delivery", totalUsd: 45.00, totalKhr: 184500, status: "Cancelled" },
  { id: "#ORD-5088", customer: "Dara Phon", email: "dara.p@example.com", date: "Oct 21, 2023", time: "11:30", paymentMethod: "ABA Pay", totalUsd: 550.00, totalKhr: 2255000, status: "Completed" },
  { id: "#ORD-5087", customer: "Sreymom Heng", email: "sreymom.h@example.com", date: "Oct 20, 2023", time: "08:45", paymentMethod: "Wing Pay", totalUsd: 320.00, totalKhr: 1312000, status: "Processing" },
];

const STATUSES = ["All Statuses", "Processing", "Completed", "Pending", "Cancelled"];
const ITEMS_PER_PAGE = 4;

const getStatusStyle = (status: string) => {
  switch (status) {
    case "Processing": return { bg: "#e0f2fe", color: "#0284c7" };
    case "Completed": return { bg: "#dcfce7", color: "#16a34a" };
    case "Pending": return { bg: "#fef3c7", color: "#d97706" };
    case "Cancelled": return { bg: "#fee2e2", color: "#dc2626" };
    default: return { bg: "#f3f4f6", color: "#4b5563" };
  }
};

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = statusFilter === "All Statuses" || o.status === statusFilter;
      const matchSearch = !searchQuery || o.id.toLowerCase().includes(searchQuery.toLowerCase()) || o.customer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleClear = () => { setSearchQuery(""); setStatusFilter("All Statuses"); setCurrentPage(1); };

  const handleEditSave = () => {
    if (!editOrder) return;
    setOrders(prev => prev.map(o => o.id === editOrder.id ? { ...o, status: editStatus } : o));
    setEditOrder(null);
    showToast("Order status updated!");
  };

  const handleExportCSV = () => {
    const rows = [["Order ID", "Customer", "Email", "Date", "Payment", "USD", "Status"]];
    orders.forEach(o => rows.push([o.id, o.customer, o.email, `${o.date} ${o.time}`, o.paymentMethod, `$${o.totalUsd}`, o.status]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "orders.csv"; a.click();
    showToast("CSV exported successfully!");
  };

  return (
    <div style={{ padding: "0 8px" }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, padding: "12px 20px", backgroundColor: "#16a34a", color: "#fff", borderRadius: 8, fontWeight: 500, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{toast}</div>}

      {/* View Modal */}
      {viewOrder && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: 32, borderRadius: 12, maxWidth: 480, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Order Details — {viewOrder.id}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["Customer", viewOrder.customer], ["Email", viewOrder.email], ["Date", `${viewOrder.date} ${viewOrder.time}`], ["Payment", viewOrder.paymentMethod], ["Total (USD)", `$${viewOrder.totalUsd.toFixed(2)}`], ["Total (KHR)", `${viewOrder.totalKhr.toLocaleString()} ៛`]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 4, letterSpacing: "0.5px" }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 8, letterSpacing: "0.5px" }}>STATUS</div>
              <span style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, backgroundColor: getStatusStyle(viewOrder.status).bg, color: getStatusStyle(viewOrder.status).color }}>{viewOrder.status}</span>
            </div>
            <button onClick={() => setViewOrder(null)} style={{ marginTop: 24, width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#444", fontWeight: 500, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {editOrder && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: 32, borderRadius: 12, maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Update Status</h3>
            <p style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>Order: <strong>{editOrder.id}</strong> — {editOrder.customer}</p>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8, display: "block" }}>New Status</label>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, marginBottom: 20 }}>
              {STATUSES.filter(s => s !== "All Statuses").map(s => <option key={s}>{s}</option>)}
            </select>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setEditOrder(null)} style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#444", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleEditSave} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 6, background: "#1d4ed8", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111", margin: "0 0 8px 0", fontFamily: "Georgia, serif" }}>Order Management</h1>
          <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Manage and process customer orders, track shipments, and handle returns.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleExportCSV} style={{ padding: "8px 16px", backgroundColor: "#fff", color: "#333", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export CSV
          </button>
          <button onClick={() => showToast("Create Order form coming soon!")} style={{ padding: "8px 16px", backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            <span>+</span> Create Order
          </button>
        </div>
      </div>

      {/* Filters Box */}
      <div style={{ backgroundColor: "#fff", borderRadius: 4, border: "1px solid #eaeaea", padding: "20px", marginBottom: 24, display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 8 }}>Search Orders</label>
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Order ID or Customer Name" style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13, outline: "none" }} />
          </div>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 8 }}>Status</label>
          <div style={{ position: "relative" }}>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} style={{ width: "100%", padding: "8px 32px 8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13, color: "#333", appearance: "none", outline: "none", cursor: "pointer", backgroundColor: "#fff" }}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#888", width: 14, height: 14, pointerEvents: "none" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleClear} style={{ padding: "8px 24px", backgroundColor: "#f5f5f5", border: "1px solid #eaeaea", borderRadius: 4, fontSize: 13, fontWeight: 500, color: "#555", cursor: "pointer" }}>Clear</button>
          <button onClick={() => setCurrentPage(1)} style={{ padding: "8px 24px", backgroundColor: "#1d4ed8", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer" }}>Apply Filters</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "#fff", borderRadius: 4, border: "1px solid #eaeaea", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9f9f9", borderBottom: "1px solid #eaeaea" }}>
                <th style={{ padding: "16px", width: 40 }}><input type="checkbox" style={{ width: 16, height: 16, cursor: "pointer" }} /></th>
                <th style={{ padding: "16px 12px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px" }}>ORDER ID</th>
                <th style={{ padding: "16px 12px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px" }}>CUSTOMER</th>
                <th style={{ padding: "16px 12px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px" }}>DATE</th>
                <th style={{ padding: "16px 12px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px" }}>PAYMENT</th>
                <th style={{ padding: "16px 12px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px", textAlign: "right" }}>TOTAL</th>
                <th style={{ padding: "16px 12px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px", textAlign: "center" }}>STATUS</th>
                <th style={{ padding: "16px 12px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "#888" }}>No orders match your search.</td></tr>
              ) : paginated.map((order, i) => {
                const s = getStatusStyle(order.status);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #eaeaea" }}>
                    <td style={{ padding: "16px" }}><input type="checkbox" style={{ width: 16, height: 16, cursor: "pointer" }} /></td>
                    <td style={{ padding: "16px 12px", fontSize: 13, fontWeight: 700, color: "#222" }}>{order.id}</td>
                    <td style={{ padding: "16px 12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#222", marginBottom: 2 }}>{order.customer}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>{order.email}</div>
                    </td>
                    <td style={{ padding: "16px 12px" }}>
                      <div style={{ fontSize: 13, color: "#444", marginBottom: 2 }}>{order.date}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>{order.time}</div>
                    </td>
                    <td style={{ padding: "16px 12px" }}><span style={{ backgroundColor: "#f3f4f6", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, color: "#444" }}>{order.paymentMethod}</span></td>
                    <td style={{ padding: "16px 12px", textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 2 }}>${order.totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>~ {order.totalKhr.toLocaleString()} KHR</div>
                    </td>
                    <td style={{ padding: "16px 12px", textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, backgroundColor: s.bg, color: s.color }}>{order.status}</span>
                    </td>
                    <td style={{ padding: "16px 12px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                        <button onClick={() => setViewOrder(order)} style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }} title="View">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button onClick={() => { setEditOrder(order); setEditStatus(order.status); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8" }} title="Edit Status">
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
        <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #eaeaea" }}>
          <div style={{ fontSize: 13, color: "#666" }}>Showing {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #eaeaea", borderRadius: 4, color: currentPage === 1 ? "#aaa" : "#666", fontSize: 13, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)} style={{ padding: "6px 12px", background: p === currentPage ? "#eff6ff" : "#fff", border: p === currentPage ? "1px solid #3b82f6" : "1px solid #eaeaea", borderRadius: 4, color: p === currentPage ? "#3b82f6" : "#666", fontSize: 13, fontWeight: p === currentPage ? 500 : 400, cursor: "pointer" }}>{p}</button>
            ))}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #eaeaea", borderRadius: 4, color: currentPage === totalPages ? "#aaa" : "#666", fontSize: 13, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
