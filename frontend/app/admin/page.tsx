"use client";
import React from "react";

export default function AdminDashboardOverview() {
  return (
    <div style={{ padding: "0 8px", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#111", margin: "0 0 8px 0" }}>Admin Dashboard Overview</h1>
          <p style={{ color: "#666", margin: 0, fontSize: 15 }}>Welcome back. Here's what's happening today.</p>
        </div>
        <button style={{
          padding: "8px 16px",
          backgroundColor: "#fff",
          color: "#1d4ed8",
          border: "1px solid #1d4ed8",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Export Report
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
        {/* Stat 1 */}
        <div style={{ backgroundColor: "#fff", padding: 20, borderRadius: 8, border: "1px solid #eaeaea", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, backgroundColor: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", backgroundColor: "#dcfce7", padding: "4px 8px", borderRadius: 4 }}>+12.5%</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", letterSpacing: "1px", marginBottom: 4 }}>TOTAL SALES</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#111" }}>$24,500 <span style={{ fontSize: 12, fontWeight: 500, color: "#888" }}>USD</span></div>
        </div>

        {/* Stat 2 */}
        <div style={{ backgroundColor: "#fff", padding: 20, borderRadius: 8, border: "1px solid #eaeaea", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, backgroundColor: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", backgroundColor: "#dcfce7", padding: "4px 8px", borderRadius: 4 }}>+5.2%</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", letterSpacing: "1px", marginBottom: 4 }}>TOTAL ORDERS</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#111" }}>1,248</div>
        </div>

        {/* Stat 3 */}
        <div style={{ backgroundColor: "#fff", padding: 20, borderRadius: 8, border: "1px solid #eaeaea", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, backgroundColor: "#fee2e2", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#b91c1c", backgroundColor: "#fee2e2", padding: "4px 8px", borderRadius: 4 }}>Needs Action</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", letterSpacing: "1px", marginBottom: 4 }}>PENDING REPAIRS</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#111" }}>34</div>
        </div>

        {/* Stat 4 */}
        <div style={{ backgroundColor: "#fff", padding: 20, borderRadius: 8, border: "1px solid #eaeaea", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, backgroundColor: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", backgroundColor: "#f3f4f6", padding: "4px 8px", borderRadius: 4 }}>2 Expiring</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", letterSpacing: "1px", marginBottom: 4 }}>ACTIVE PROMOTIONS</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#111" }}>12</div>
        </div>
      </div>

      {/* Middle Row */}
      <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
        {/* Sales Performance Chart */}
        <div style={{ flex: 2, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111" }}>Sales Performance</h2>
            <div style={{ position: "relative" }}>
              <select style={{ padding: "6px 24px 6px 12px", border: "1px solid #eaeaea", borderRadius: 4, fontSize: 13, backgroundColor: "#f9f9f9", appearance: "none", color: "#444" }}>
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Year</option>
              </select>
              <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#888", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          {/* Mock Chart Area */}
          <div style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 12, paddingTop: 20 }}>
            {/* Bars */}
            <div style={{ flex: 1, backgroundColor: "#dbeafe", height: "30%", borderRadius: "4px 4px 0 0" }}></div>
            <div style={{ flex: 1, backgroundColor: "#dbeafe", height: "45%", borderRadius: "4px 4px 0 0" }}></div>
            <div style={{ flex: 1, backgroundColor: "#dbeafe", height: "60%", borderRadius: "4px 4px 0 0" }}></div>
            <div style={{ flex: 1, backgroundColor: "#dbeafe", height: "25%", borderRadius: "4px 4px 0 0" }}></div>
            <div style={{ flex: 1, backgroundColor: "#dbeafe", height: "55%", borderRadius: "4px 4px 0 0" }}></div>
            <div style={{ flex: 1, backgroundColor: "#991b1b", height: "85%", borderRadius: "4px 4px 0 0" }}></div>
            <div style={{ flex: 1, backgroundColor: "#dbeafe", height: "40%", borderRadius: "4px 4px 0 0" }}></div>
            <div style={{ flex: 1, backgroundColor: "#dbeafe", height: "50%", borderRadius: "4px 4px 0 0" }}></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ flex: 1, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px 0", color: "#111" }}>Quick Actions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#222" }}>Add New Product</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            
            <button style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: 6, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#222" }}>View Pending Repairs</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ backgroundColor: "#b91c1c", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>34</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </button>
            
            <button style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: 6, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#222" }}>Update Daily Deals</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
        
        {/* Recent Orders Table */}
        <div style={{ flex: 2, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: "24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111" }}>Recent Orders</h2>
            <a href="/admin/orders" style={{ fontSize: 13, color: "#1d4ed8", textDecoration: "none", fontWeight: 500 }}>View All</a>
          </div>
          
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eaeaea" }}>
                <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "1px" }}>Order ID</th>
                <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "1px" }}>Customer</th>
                <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "1px" }}>Date</th>
                <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "1px" }}>Amount</th>
                <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "1px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #eaeaea" }}>
                <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "#222" }}>#ORD-9921</td>
                <td style={{ padding: "16px 24px", fontSize: 13, color: "#444" }}>Sokha Heng</td>
                <td style={{ padding: "16px 24px", fontSize: 13, color: "#666" }}>Today, 10:42 AM</td>
                <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "#111" }}>$1,299.00</td>
                <td style={{ padding: "16px 24px" }}>
                  <span style={{ backgroundColor: "#e0f2fe", color: "#0284c7", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>Processing</span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "#222" }}>#ORD-9920</td>
                <td style={{ padding: "16px 24px", fontSize: 13, color: "#444" }}>Vannak Rhou</td>
                <td style={{ padding: "16px 24px", fontSize: 13, color: "#666" }}>Today, 09:15 AM</td>
                <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "#111" }}>$85.50</td>
                <td style={{ padding: "16px 24px" }}>
                  <span style={{ backgroundColor: "#dcfce7", color: "#16a34a", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>Completed</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* System Status */}
        <div style={{ flex: 1, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 24px 0", color: "#111" }}>System Status</h2>
          
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#555" }}>Server Load</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>42%</span>
            </div>
            <div style={{ width: "100%", height: 6, backgroundColor: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: "42%", height: "100%", backgroundColor: "#3b82f6", borderRadius: 3 }}></div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#555" }}>Storage Capacity</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>88%</span>
            </div>
            <div style={{ width: "100%", height: 6, backgroundColor: "#f0f0f0", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ width: "88%", height: "100%", backgroundColor: "#991b1b", borderRadius: 3 }}></div>
            </div>
            <span style={{ fontSize: 11, color: "#b91c1c" }}>Warning: Nearing capacity threshold.</span>
          </div>

        </div>

      </div>

    </div>
  );
}
