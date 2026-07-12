"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AddNewProductPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("1"); // Default to Laptops
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!name.trim() || !price || !stock) {
      showToast("Please fill in all required fields (*).", "error");
      return;
    }
    
    try {
      await api.post("/products", {
        name,
        category_id: parseInt(categoryId),
        price: parseFloat(price),
        stock: parseInt(stock),
        description,
        is_featured: featured,
        image_url: imageUrl || null
      });

      showToast("Product saved successfully! Redirecting...");
      setTimeout(() => {
        router.push("/admin/products");
      }, 1500);
    } catch (e) {
      showToast("Failed to save product", "error");
      console.error(e);
    }
  };

  return (
    <div style={{ padding: "0 8px", fontFamily: "sans-serif", maxWidth: 1200 }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, padding: "12px 20px", backgroundColor: toast.type === "success" ? "#16a34a" : "#dc2626", color: "#fff", borderRadius: 8, fontWeight: 500, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{toast.msg}</div>}

      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#111", margin: "0 0 8px 0" }}>Add New Product</h1>
          <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Fill in the details below to add a new item to the inventory.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/admin/products" style={{ padding: "10px 24px", backgroundColor: "#fff", color: "#1d4ed8", border: "1px solid #1d4ed8", borderRadius: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, textDecoration: "none", display: "inline-block" }}>
            Cancel
          </Link>
          <button onClick={handleSave} style={{ padding: "10px 24px", backgroundColor: "#991b1b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            Save Product
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Left Column */}
        <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Basic Information */}
          <div style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, border: "1px solid #eaeaea" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 20px 0", color: "#111" }}>Basic Information</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#444", marginBottom: 8 }}>Product Name <span style={{ color: "#dc2626" }}>*</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ASUS ROG Strix G16" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#444", marginBottom: 8 }}>Category <span style={{ color: "#dc2626" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ width: "100%", padding: "10px 32px 10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, appearance: "none", outline: "none", backgroundColor: "#fff", cursor: "pointer" }}>
                    <option value="1">Laptops</option>
                    <option value="2">Smartphones</option>
                    <option value="3">Accessories</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, border: "1px solid #eaeaea" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 20px 0", color: "#111" }}>Pricing & Inventory</h2>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#444", marginBottom: 8 }}>Price (USD) <span style={{ color: "#dc2626" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: 14 }}>$</span>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" style={{ width: "100%", padding: "10px 12px 10px 28px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#444", marginBottom: 8 }}>Stock Quantity <span style={{ color: "#dc2626" }}>*</span></label>
                <input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, border: "1px solid #eaeaea" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 20px 0", color: "#111" }}>Description</h2>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#444", marginBottom: 8 }}>Product Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter a detailed description of the product..." style={{ width: "100%", height: 120, padding: "12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit" }}></textarea>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Media */}
          <div style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, border: "1px solid #eaeaea" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 20px 0", color: "#111" }}>Media</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#444", marginBottom: 8 }}>Image URL</label>
              <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, outline: "none" }} />
            </div>
          </div>

          {/* Visibility */}
          <div style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, border: "1px solid #eaeaea" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 20px 0", color: "#111" }}>Visibility</h2>
            <div style={{ backgroundColor: "#f9f9f9", padding: 16, borderRadius: 6, border: "1px solid #eaeaea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>Featured Product</div>
                <div style={{ fontSize: 12, color: "#666" }}>Show this product on the homepage</div>
              </div>
              <div onClick={() => setFeatured(!featured)} style={{ width: 44, height: 24, backgroundColor: featured ? "#991b1b" : "#64748b", borderRadius: 12, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                <div style={{ width: 20, height: 20, backgroundColor: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: featured ? 22 : 2, transition: "left 0.2s" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
