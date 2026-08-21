"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  category: Category | null;
  category_id: number;
};

const ITEMS_PER_PAGE = 4;

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [stockFilter, setStockFilter] = useState("Stock Status (All)");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (e) {
      showToast("Failed to fetch products", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getStockStatus = (stock: number) => {
    if (stock > 10) return "In Stock";
    if (stock > 0) return "Low Stock";
    return "Out of Stock";
  };

  const filtered = useMemo(() => {
    return products.filter(p => {
      const pCatName = p.category?.name || "Uncategorized";
      const matchCat = categoryFilter === "All Categories" || pCatName === categoryFilter;
      const status = getStockStatus(p.stock);
      const matchStock = stockFilter === "Stock Status (All)" || status === stockFilter;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStock && matchSearch;
    });
  }, [products, categoryFilter, stockFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setCategoryFilter("All Categories");
    setStockFilter("Stock Status (All)");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      showToast(`"${deleteTarget.name}" deleted successfully.`);
    } catch (e) {
      showToast("Failed to delete product.", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEditOpen = (p: Product) => {
    setEditTarget(p);
    setEditForm({ name: p.name, price: p.price, stock: p.stock });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    try {
      const res = await api.put(`/products/${editTarget.id}`, editForm);
      setProducts(prev => prev.map(p => p.id === editTarget.id ? res.data.data : p));
      showToast("Product updated successfully!");
    } catch (e) {
      showToast("Failed to update product.", "error");
    } finally {
      setEditTarget(null);
      setEditForm({});
    }
  };

  const stockBadge = (status: string) => {
    if (status === "In Stock") return { bg: "#e0e7ff", color: "#3730a3" };
    if (status === "Low Stock") return { bg: "#fee2e2", color: "#991b1b" };
    return { bg: "#f3f4f6", color: "#4b5563" };
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, padding: "12px 20px", backgroundColor: toast.type === "success" ? "#16a34a" : "#dc2626", color: "#fff", borderRadius: 8, fontWeight: 500, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", animation: "fadeIn 0.2s" }}>
          {toast.msg}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: 32, borderRadius: 12, maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ width: 48, height: 48, backgroundColor: "#fee2e2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>
            <h3 style={{ textAlign: "center", fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>Delete Product?</h3>
            <p style={{ textAlign: "center", color: "#666", fontSize: 14, marginBottom: 24 }}>Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#444", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 6, background: "#dc2626", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: 32, borderRadius: 12, maxWidth: 520, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Edit Product</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Product Name</label>
                <input value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Price (USD)</label>
                  <input type="number" value={editForm.price || 0} onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Stock Count</label>
                  <input type="number" value={editForm.stock || 0} onChange={e => setEditForm({ ...editForm, stock: parseInt(e.target.value) })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => { setEditTarget(null); setEditForm({}); }} style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#444", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleEditSave} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 6, background: "#991b1b", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111", margin: "0 0 8px 0" }}>Product Management</h1>
          <p style={{ color: "#666", margin: 0 }}>Manage inventory, pricing, and specifications.</p>
        </div>
        <button onClick={() => router.push("/admin/products/new")} style={{ padding: "10px 16px", backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          <span>+</span> Add New Product
        </button>
      </div>

      {/* Main Card */}
      <div style={{ backgroundColor: "#fff", borderRadius: 8, border: "1px solid #eaeaea", overflow: "hidden" }}>
        {/* Filters */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #eaeaea", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search products..." style={{ width: "100%", padding: "9px 12px 9px 32px", border: "1px solid #eaeaea", borderRadius: 4, fontSize: 14, outline: "none", backgroundColor: "#f9f9f9" }} />
          </div>
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }} style={{ padding: "10px 32px", backgroundColor: "#f9f9f9", border: "1px solid #eaeaea", borderRadius: 4, fontSize: 14, color: "#333", appearance: "none", outline: "none", cursor: "pointer" }}>
              <option>All Categories</option>
              {Array.from(new Set(products.map(p => p.category?.name || "Uncategorized"))).map(cat => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
            <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#888", width: 14, height: 14, pointerEvents: "none" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div style={{ position: "relative" }}>
            <select value={stockFilter} onChange={e => { setStockFilter(e.target.value); setCurrentPage(1); }} style={{ padding: "10px 32px 10px 16px", backgroundColor: "#f9f9f9", border: "1px solid #eaeaea", borderRadius: 4, fontSize: 14, color: "#333", appearance: "none", outline: "none", cursor: "pointer" }}>
              <option>Stock Status (All)</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
            <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#888", width: 14, height: 14, pointerEvents: "none" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <button onClick={handleClearFilters} style={{ padding: "9px 16px", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: 4, fontSize: 14, color: "#666", cursor: "pointer" }}>Clear Filters</button>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eaeaea" }}>
                <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "#666", width: "35%" }}>Product Name</th>
                <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "#666" }}>Category</th>
                <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "#666" }}>Price</th>
                <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "#666" }}>Stock</th>
                <th style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "#666", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "#888", fontSize: 14 }}>Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "#888", fontSize: 14 }}>No products match your filters.</td></tr>
              ) : paginated.map((prod) => {
                const status = getStockStatus(prod.stock);
                const badge = stockBadge(status);
                return (
                  <tr key={prod.id} style={{ borderBottom: "1px solid #eaeaea" }}>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 40, height: 40, backgroundColor: "#f5f5f5", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                            {prod.image_url ? <img src={prod.image_url} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <span style={{fontSize: 20}}>💻</span>}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>{prod.name}</div>
                          <div style={{ fontSize: 13, color: "#888" }}>{prod.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: 14, color: "#333" }}>{prod.category?.name || "Uncategorized"}</td>
                    <td style={{ padding: "16px 24px", fontSize: 14, fontWeight: 600, color: "#111" }}>${Number(prod.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500, backgroundColor: badge.bg, color: badge.color }}>
                        {status} ({prod.stock})
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                        <button onClick={() => handleEditOpen(prod)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8" }} title="Edit">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onClick={() => setDeleteTarget(prod)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }} title="Delete">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, color: "#666" }}>
            Showing <strong>{filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</strong> of <strong>{filtered.length}</strong> results
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #eaeaea", borderRadius: 4, background: "#fff", color: currentPage === 1 ? "#ccc" : "#666", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: page === currentPage ? "1px solid #2563eb" : "1px solid #eaeaea", borderRadius: 4, background: page === currentPage ? "#eff6ff" : "#fff", color: page === currentPage ? "#2563eb" : "#666", fontSize: 13, fontWeight: page === currentPage ? 600 : 400, cursor: "pointer" }}>{page}</button>
            ))}
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #eaeaea", borderRadius: 4, background: "#fff", color: currentPage === totalPages || totalPages === 0 ? "#ccc" : "#666", cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
