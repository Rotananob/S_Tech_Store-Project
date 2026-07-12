"use client";
import { useState } from "react";

const TOPICS = ["General Inquiry", "Order Support", "Repair & Services", "Product Question", "Wholesale / Business", "Other"];

const CONTACT_CARDS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.53 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l.62-.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
    label: "Phone / Telegram",
    value: "+855 12 345 678",
    sub: "Mon–Sat, 8AM – 6PM",
    color: "#1a4fa0",
    href: "tel:+85512345678",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    label: "Email",
    value: "support@stechstore.com.kh",
    sub: "We reply within 24 hours",
    color: "#8B1A1A",
    href: "mailto:support@stechstore.com.kh",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    label: "Store Address",
    value: "St. 271, Phnom Penh",
    sub: "Near Russian Market",
    color: "#16a34a",
    href: "https://maps.google.com",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    label: "Business Hours",
    value: "Mon – Sat: 8AM – 6PM",
    sub: "Sunday: 9AM – 4PM",
    color: "#d97706",
    href: null,
  },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) { alert("Please fill in all required fields."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  };

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "32px 0 0" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a" }}>Contact Us</h1>
          </div>
          <p style={{ fontSize: 14, color: "#777", marginBottom: 16 }}>
            We're here to help. Reach out via the form or any channel below.
          </p>
          <div style={{ width: 48, height: 3, background: "linear-gradient(90deg,#8B1A1A,#1a4fa0)", borderRadius: 2 }} />
        </div>
      </div>

      <div className="container" style={{ padding: "32px 24px" }}>

        {/* ── Contact Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
          {CONTACT_CARDS.map(card => (
            <div key={card.label}
              style={{
                background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10,
                padding: "20px", display: "flex", flexDirection: "column", gap: 10,
                transition: "box-shadow 200ms, transform 200ms", cursor: card.href ? "pointer" : "default",
              }}
              onClick={() => card.href && window.open(card.href, "_blank")}
              onMouseEnter={e => { if (card.href) { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${card.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: card.color }}>
                {card.icon}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{card.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{card.value}</p>
                <p style={{ fontSize: 12, color: "#999" }}>{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>

          {/* Contact Form */}
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 }}>Send Us a Message</h2>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 22 }}>Fill out the form and we'll get back to you shortly.</p>

            {sent ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>Message Sent!</h3>
                <p style={{ fontSize: 14, color: "#777", marginBottom: 20 }}>Thank you, <strong>{name}</strong>! We'll reply to <strong>{email}</strong> within 24 hours.</p>
                <button onClick={() => { setSent(false); setName(""); setEmail(""); setPhone(""); setTopic(""); setMessage(""); }}
                  style={{ padding: "10px 24px", background: "#8B1A1A", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Full Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Sok San" required
                      style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: "#1a1a1a", background: "#fafafa", outline: "none" }}
                      onFocus={e => (e.target.style.borderColor = "#8B1A1A")}
                      onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Email Address *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required
                      style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: "#1a1a1a", background: "#fafafa", outline: "none" }}
                      onFocus={e => (e.target.style.borderColor = "#8B1A1A")}
                      onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Phone (optional)</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="012 345 678"
                      style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: "#1a1a1a", background: "#fafafa", outline: "none" }}
                      onFocus={e => (e.target.style.borderColor = "#8B1A1A")}
                      onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Topic</label>
                    <select value={topic} onChange={e => setTopic(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: topic ? "#1a1a1a" : "#aaa", background: "#fafafa", outline: "none" }}>
                      <option value="">Select topic...</option>
                      {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Message *</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} required
                    placeholder="Write your message here..."
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 14, color: "#1a1a1a", background: "#fafafa", resize: "vertical", fontFamily: "inherit", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = "#8B1A1A")}
                    onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
                </div>
                <button type="submit" disabled={loading}
                  style={{
                    padding: "13px 28px", background: loading ? "#ccc" : "#8B1A1A", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800,
                    cursor: loading ? "not-allowed" : "pointer", letterSpacing: ".03em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 150ms", alignSelf: "flex-start",
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#6B1010"; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#8B1A1A"; }}>
                  {loading ? (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10"/></svg> Sending...</>
                  ) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message</>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Map */}
            <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: "#e8f0f8", height: 220, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, #bfdbfe 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: .5 }} />
                <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#8B1A1A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", boxShadow: "0 0 0 8px rgba(139,26,26,0.2)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a" }}>S Tech Store</p>
                  <p style={{ fontSize: 12, color: "#777" }}>St. 271, Phnom Penh</p>
                </div>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <a href="https://maps.google.com" target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", background: "#f5f5f5", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#1a4fa0", textDecoration: "none", transition: "background 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#e8f0f8")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#f5f5f5")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Open in Google Maps
                </a>
              </div>
            </div>

            {/* Social / Quick contact */}
            <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a", marginBottom: 14 }}>Quick Contact</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Telegram", handle: "@stechstore", color: "#2b9fd9", href: "https://t.me/stechstore",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
                  { label: "Facebook", handle: "S Tech Store", color: "#1877f2", href: "https://facebook.com",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                  { label: "WhatsApp", handle: "+855 12 345 678", color: "#25d366", href: "https://wa.me/85512345678",
                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> },
                ].map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid #f0f0f0", textDecoration: "none", transition: "all 150ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#f9f9f9"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e0e0e0"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#fff"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "#f0f0f0"; }}>
                    <div style={{ color: s.color, flexShrink: 0 }}>{s.icon}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{s.label}</p>
                      <p style={{ fontSize: 12, color: "#999" }}>{s.handle}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" style={{ marginLeft: "auto" }}><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                  </a>
                ))}
              </div>
            </div>

            {/* FAQ hint */}
            <div style={{ background: "linear-gradient(135deg,#8B1A1A,#1a4fa0)", borderRadius: 10, padding: 20, color: "#fff" }}>
              <p style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Need quick answers?</p>
              <p style={{ fontSize: 12, opacity: .8, marginBottom: 14, lineHeight: 1.6 }}>Check our FAQ page for instant answers about orders, warranty, repairs, and more.</p>
              <a href="/faq" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "rgba(255,255,255,0.15)", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)", transition: "background 150ms" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}>
                Browse FAQ
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
