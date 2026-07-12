"use client";
import { useState } from "react";

const SERVICES = [
  { id: "screen", label: "Screen Replacement", price: 45, time: "1–2 hrs", icon: "🖥️", desc: "Cracked or dead display replacement for laptops & phones." },
  { id: "battery", label: "Battery Replacement", price: 25, time: "30 min", icon: "🔋", desc: "Original battery swap to restore full battery life." },
  { id: "keyboard", label: "Keyboard Repair", price: 30, time: "1 hr", icon: "⌨️", desc: "Fix sticky, broken, or unresponsive keys." },
  { id: "virus", label: "Virus / Malware Removal", price: 20, time: "2–3 hrs", icon: "🛡️", desc: "Deep scan, clean malware and optimize Windows." },
  { id: "upgrade", label: "RAM / SSD Upgrade", price: 15, time: "45 min", icon: "⚡", desc: "Boost your PC speed with more RAM or a faster SSD." },
  { id: "data", label: "Data Recovery", price: 60, time: "1–3 days", icon: "💾", desc: "Recover lost files from damaged or formatted drives." },
  { id: "cooling", label: "Cooling / Fan Cleaning", price: 18, time: "1 hr", icon: "❄️", desc: "Deep clean thermal paste & fans to stop overheating." },
  { id: "os", label: "OS Reinstall", price: 20, time: "2 hrs", icon: "💿", desc: "Fresh Windows 11 install with drivers and activation." },
];

const DEVICE_TYPES = ["Laptop", "Desktop PC", "Gaming PC", "MacBook", "All-in-One", "Other"];
const BRANDS = ["ASUS", "Lenovo", "HP", "Dell", "Acer", "MSI", "Apple", "Other"];
const TIME_SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

export default function ServicesPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [device, setDevice] = useState("");
  const [brand, setBrand] = useState("");
  const [issue, setIssue] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dropoff, setDropoff] = useState<"walkin" | "pickup">("walkin");
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const totalFee = selected.reduce((s, id) => {
    const svc = SERVICES.find(x => x.id === id);
    return s + (svc?.price ?? 0);
  }, 0);

  const handleSubmit = () => {
    if (!selected.length || !name || !phone || !date || !time) {
      alert("Please fill all required fields and select at least one service.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "28px 0" }}>
          <div className="container">
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a" }}>Repair & Services</h1>
          </div>
        </div>
        <div className="container" style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "56px 40px", maxWidth: 480, margin: "0 auto", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>Booking Confirmed!</h2>
            <p style={{ fontSize: 14, color: "#777", marginBottom: 4 }}>We'll contact <strong style={{ color: "#1a1a1a" }}>{name}</strong> at <strong style={{ color: "#1a1a1a" }}>{phone}</strong></p>
            <p style={{ fontSize: 13, color: "#aaa", marginBottom: 24 }}>Appointment: {date} at {time}</p>
            <div style={{ background: "#f9f9f9", borderRadius: 8, padding: "14px 18px", marginBottom: 24, textAlign: "left" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Services Booked</p>
              {selected.map(id => {
                const svc = SERVICES.find(x => x.id === id)!;
                return <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span>{svc.icon} {svc.label}</span><span style={{ fontWeight: 700 }}>${svc.price}</span></div>;
              })}
              <div style={{ borderTop: "1px solid #e5e5e5", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#8B1A1A" }}>
                <span>Est. Total</span><span>${totalFee}</span>
              </div>
            </div>
            <a href="/" style={{ display: "block", padding: "12px", background: "#8B1A1A", color: "#fff", borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Back to Home</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "28px 0 0" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a" }}>Repair & Services</h1>
          </div>
          <p style={{ fontSize: 14, color: "#777", marginBottom: 16 }}>Book a professional repair. Same-day service available in Phnom Penh.</p>
          <div style={{ width: 48, height: 3, background: "linear-gradient(90deg,#8B1A1A,#1a4fa0)", borderRadius: 2, marginBottom: 0 }} />
        </div>
      </div>

      <div className="container" style={{ padding: "28px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Step 1: Services */}
            <section style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#8B1A1A", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a1a" }}>Select Services</h2>
                <span style={{ fontSize: 12, color: "#aaa" }}>(choose one or more)</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {SERVICES.map(svc => {
                  const active = selected.includes(svc.id);
                  return (
                    <button key={svc.id} onClick={() => toggle(svc.id)}
                      style={{
                        padding: "14px 16px", border: `2px solid ${active ? "#8B1A1A" : "#e5e5e5"}`,
                        borderRadius: 8, background: active ? "#fff5f5" : "#fff",
                        cursor: "pointer", textAlign: "left", transition: "all 150ms", position: "relative",
                      }}>
                      <div style={{ position: "absolute", top: 12, right: 12, width: 18, height: 18, borderRadius: 4, border: `2px solid ${active ? "#8B1A1A" : "#ccc"}`, background: active ? "#8B1A1A" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {active && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="2 6 5 9 10 3"/></svg>}
                      </div>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{svc.icon}</div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 2, paddingRight: 24 }}>{svc.label}</p>
                      <p style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>{svc.desc}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#8B1A1A" }}>From ${svc.price}</span>
                        <span style={{ fontSize: 11, color: "#bbb" }}>· {svc.time}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 2: Device Info */}
            <section style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#8B1A1A", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a1a" }}>Device Information</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Device Type *</label>
                  <select value={device} onChange={e => setDevice(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: device ? "#1a1a1a" : "#aaa", background: "#fafafa", outline: "none" }}>
                    <option value="">Select device...</option>
                    {DEVICE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Brand</label>
                  <select value={brand} onChange={e => setBrand(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: brand ? "#1a1a1a" : "#aaa", background: "#fafafa", outline: "none" }}>
                    <option value="">Select brand...</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Describe the Issue</label>
                <textarea value={issue} onChange={e => setIssue(e.target.value)} rows={3}
                  placeholder="e.g. Screen has black spots, laptop won't turn on, keyboard keys not working..."
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: "#1a1a1a", background: "#fafafa", resize: "vertical", fontFamily: "inherit", outline: "none" }}
                  onFocus={e => (e.target.style.borderColor = "#8B1A1A")}
                  onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
              </div>
            </section>

            {/* Step 3: Appointment */}
            <section style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#8B1A1A", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>3</div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a1a" }}>Appointment & Contact</h2>
              </div>

              {/* Drop-off options */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                {[
                  { id: "walkin", label: "Walk-in / Drop-off", sub: "Bring device to our store", icon: "🏪" },
                  { id: "pickup", label: "Pickup Service", sub: "We collect from your location (+$2)", icon: "🚗" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setDropoff(opt.id as typeof dropoff)}
                    style={{
                      padding: "14px 16px", border: `2px solid ${dropoff === opt.id ? "#1a4fa0" : "#e5e5e5"}`,
                      borderRadius: 8, background: dropoff === opt.id ? "#f0f5ff" : "#fff",
                      cursor: "pointer", textAlign: "left", transition: "all 150ms", position: "relative",
                    }}>
                    <div style={{ position: "absolute", top: 12, right: 12, width: 18, height: 18, borderRadius: "50%", border: `2px solid ${dropoff === opt.id ? "#1a4fa0" : "#ccc"}`, background: dropoff === opt.id ? "#1a4fa0" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {dropoff === opt.id && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", paddingRight: 24 }}>{opt.label}</p>
                    <p style={{ fontSize: 11, color: "#999" }}>{opt.sub}</p>
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Full Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Sok San"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: "#1a1a1a", background: "#fafafa", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = "#8B1A1A")}
                    onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Phone Number *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="012 345 678"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: "#1a1a1a", background: "#fafafa", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = "#8B1A1A")}
                    onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Preferred Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: "#1a1a1a", background: "#fafafa", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = "#8B1A1A")}
                    onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Time Slot *</label>
                  <select value={time} onChange={e => setTime(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: time ? "#1a1a1a" : "#aaa", background: "#fafafa", outline: "none" }}>
                    <option value="">Select time...</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT — Booking Summary */}
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24, position: "sticky", top: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a1a", marginBottom: 18 }}>Booking Summary</h2>

            {selected.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#ccc" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
                <p style={{ fontSize: 13 }}>No services selected yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                {selected.map(id => {
                  const svc = SERVICES.find(x => x.id === id)!;
                  return (
                    <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{svc.icon} {svc.label}</p>
                        <p style={{ fontSize: 11, color: "#aaa" }}>{svc.time}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>${svc.price}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {dropoff === "pickup" && selected.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f0f0f0", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: "#777" }}>🚗 Pickup Fee</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>$2.00</span>
              </div>
            )}

            {selected.length > 0 && (
              <div style={{ borderTop: "2px solid #e5e5e5", paddingTop: 14, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>Est. Total</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#8B1A1A" }}>${(totalFee + (dropoff === "pickup" ? 2 : 0)).toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>≈{((totalFee + (dropoff === "pickup" ? 2 : 0)) * 4060).toLocaleString()} ៛</div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleSubmit}
              style={{
                width: "100%", padding: "13px", fontSize: 14, fontWeight: 800,
                background: selected.length > 0 ? "#8B1A1A" : "#ccc",
                color: "#fff", border: "none", borderRadius: 8,
                cursor: selected.length > 0 ? "pointer" : "not-allowed",
                letterSpacing: ".03em", transition: "background 150ms",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12,
              }}
              onMouseEnter={e => { if (selected.length > 0) e.currentTarget.style.background = "#6B1010"; }}
              onMouseLeave={e => { if (selected.length > 0) e.currentTarget.style.background = "#8B1A1A"; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Book Appointment
            </button>

            <div style={{ background: "#f9f9f9", borderRadius: 6, padding: "12px 14px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Store Info</p>
              <p style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>📍 St. 271, Phnom Penh<br/>⏰ Mon–Sat: 8AM – 6PM<br/>📞 +855 12 345 678</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
