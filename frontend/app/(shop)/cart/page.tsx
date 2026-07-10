"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Lock, Truck, ArrowRight, Check } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";

export default function CartPage() {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Razer Blade 16 (2024)",
      specs: "RTX 4090, 32GB RAM, 2TB NVMe",
      subtitle: "កុំព្យូទ័រយួរដៃសម្រាប់លេងហ្គេម",
      price: 4299.0,
      qty: 1,
      image: "https://images.unsplash.com/photo-1593640408182-31c228b7f4c4?w=600&q=80",
    },
    {
      id: 2,
      name: "Dell UltraSharp 32 4K USB-C Hub Monitor",
      specs: "U3223QE, IPS Black, 98% DCI-P3",
      subtitle: "អេក្រង់កុំព្យូទ័រ",
      price: 850.0,
      qty: 2,
      image: "https://images.unsplash.com/photo-1527443224154-c4a573d3b9e5?w=600&q=80",
    },
  ]);

  const updateQty = (id: number, delta: number) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  const removeItem = (id: number) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalItems = cartItems.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div style={{ background: "#fdfdfd", minHeight: "100vh", color: "#1a1a1a" }}>
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        
        {/* ── Checkout Stepper ────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", fontWeight: "600", color: "#888" }}>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a92020" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#a92020", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                1
              </div>
              Cart
            </div>
            
            <span>›</span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                2
              </div>
              Delivery
            </div>

            <span>›</span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                3
              </div>
              Payment
            </div>

            <span>›</span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                4
              </div>
              Done
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">
          
          {/* LEFT — Cart Items */}
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "36px", fontWeight: "700", marginBottom: "32px", color: "#111" }}>
              Your Cart
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row border border-[#eaeaea] bg-white p-4 rounded-md gap-4 sm:gap-0"
                >
                  <div style={{ width: "100px", height: "100px", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", flexShrink: 0, marginRight: "20px" }}>
                    <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111", marginBottom: "6px" }}>{item.name}</h3>
                    <p style={{ fontFamily: "monospace", fontSize: "12px", color: "#666", marginBottom: "4px" }}>{item.specs}</p>
                    <p className="font-khmer" style={{ fontSize: "13px", color: "#888" }}>{item.subtitle}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#111", fontFamily: "monospace" }}>
                      ${(item.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: "3px", overflow: "hidden" }}>
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          style={{ width: "28px", height: "28px", background: "white", border: "none", borderRight: "1px solid #ddd", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}
                        >
                          -
                        </button>
                        <div style={{ width: "32px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "600", background: "white" }}>
                          {item.qty}
                        </div>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          style={{ width: "28px", height: "28px", background: "white", border: "none", borderLeft: "1px solid #ddd", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}
                        >
                          +
                        </button>
                      </div>

                      <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {cartItems.length === 0 && (
                <div style={{ padding: "48px", textAlign: "center", border: "1px solid #eaeaea", background: "white", borderRadius: "4px" }}>
                  <p style={{ fontSize: "15px", color: "#666", marginBottom: "16px" }}>Your cart is empty.</p>
                  <Link href="/category/laptops" className="btn-outline-blue">
                    Continue Shopping
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Order Summary */}
          <div className="bg-[#fafbfd] border border-[#dbe3ed] p-6 rounded-md lg:mt-[78px]">
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111", marginBottom: "24px" }}>
              Order Summary
            </h2>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "14px", color: "#555" }}>
              <span>Subtotal ({totalItems} items)</span>
              <span style={{ fontWeight: "700", color: "#111" }}>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#555" }}>
              <span>Delivery</span>
              <span style={{ fontWeight: "700", color: "#111" }}>Free</span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", color: "#2563eb", fontSize: "12px", fontWeight: "500", marginBottom: "24px" }}>
              <Truck size={14} />
              Phnom Penh Same-Day
            </div>

            <div style={{ height: "1px", background: "#dbe3ed", marginBottom: "24px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#111", marginTop: "4px" }}>Total</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#a92020", fontFamily: "monospace" }}>
                  ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                  {formatKHR(subtotal)}
                </div>
              </div>
            </div>

            <button
              style={{
                width: "100%",
                background: "#a92020",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "14px",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                marginBottom: "16px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#8b1a1a")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#a92020")}
            >
              Proceed to Checkout
              <ArrowRight size={16} />
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", color: "#888" }}>
              <Lock size={12} />
              Secure encrypted checkout
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
