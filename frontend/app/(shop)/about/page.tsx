"use client";

const STATS = [
  { value: "2015", label: "Founded", sub: "Est. in Phnom Penh" },
  { value: "5,000+", label: "Happy Customers", sub: "Across Cambodia" },
  { value: "200+", label: "Products", sub: "Laptops, PCs & Parts" },
  { value: "98%", label: "Satisfaction Rate", sub: "Based on reviews" },
];

const VALUES = [
  { icon: "✅", title: "100% Genuine", desc: "Every product is authentic and sourced directly from authorized distributors. No clones, no fakes — ever." },
  { icon: "🛡️", title: "Warranty Backed", desc: "All products come with official warranty. Our in-house repair team handles any post-sale issues fast." },
  { icon: "💡", title: "Expert Advice", desc: "Our staff are certified tech specialists who help you choose the right product for your exact needs and budget." },
  { icon: "🇰🇭", title: "Local Payment", desc: "We accept ABA PAY, Wing, Bakong, and cash — making it easy and convenient for every Cambodian customer." },
  { icon: "🚀", title: "Fast Delivery", desc: "Same-day delivery across Phnom Penh. Province delivery via Vireak Buntham and J&T Express in 1–2 days." },
  { icon: "🔧", title: "Repair Service", desc: "Professional repair center for laptops, desktops, and gaming PCs. Walk-in or pickup available." },
];

const TEAM = [
  { name: "Sopheak Rith", role: "Founder & CEO", emoji: "👨‍💼" },
  { name: "Chanthy Vong", role: "Head of Sales", emoji: "👩‍💻" },
  { name: "Piseth Lim", role: "Lead Technician", emoji: "👨‍🔧" },
  { name: "Sreyleak Mao", role: "Customer Support", emoji: "👩‍🎓" },
];

const PARTNERS = [
  { name: "ASUS", color: "#00539b" },
  { name: "Dell", color: "#007db8" },
  { name: "Lenovo", color: "#e2231a" },
  { name: "HP", color: "#0096d6" },
  { name: "MSI", color: "#e2231a" },
  { name: "Logitech", color: "#00b140" },
];

export default function AboutPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>

      {/* ── Hero ── */}
      <section style={{ position: "relative", height: 420, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1400&q=85"
          alt="S Tech Store interior"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)" }} />
        <div style={{ position: "relative", textAlign: "center", padding: "0 24px" }}>
          <h1 style={{ fontSize: 46, fontWeight: 900, color: "#fff", marginBottom: 14, letterSpacing: "-0.02em" }}>
            About S Tech Store
          </h1>
          <p className="font-khmer" style={{ fontSize: 18, color: "rgba(255,255,255,0.75)" }}>
            អំពីយើង – ហាងលក់គណ្ឌករណ៍បច្ចេកវិទ្យាណានមុខនៅកម្ពុជា
          </p>
        </div>
      </section>

      {/* ── Mission ── */}
      <section style={{ padding: "56px 0", background: "#fff", borderBottom: "1px solid #f0f0f0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32, alignItems: "center" }}>
            <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a", marginBottom: 8 }}>Our Mission</h2>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#8B1A1A", marginBottom: 14 }}>បេសកម្មរបស់យើង</p>
              <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, marginBottom: 16 }}>
                To empower Cambodia's digital transformation by providing access to world-class, genuine
                computing hardware with uncompromising technical expertise and reliable customer service. We
                bridge the gap between high-end global tech and local professionals.
              </p>
              <p className="font-khmer" style={{ fontSize: 14, color: "#888", lineHeight: 2 }}>
                ដើម្បីជំរុញការផ្លាស់ប្ដូរឌីជីថលរបស់កម្ពុជាតាមរយៈផ្ដល់ជូននូវវត្ថុបញ្ជាំស្ដីអំពីក្រុមហ៊ុន
                បច្ចេកវិទ្យា និងសេវាកម្មអតិថិជនដ៏ជុំរឹងជំនាញត្រឹមត្រូវ។
              </p>
            </div>
            <div style={{ background: "#f5f8ff", border: "1px solid #dbeafe", borderRadius: 12, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ display: "inline-block" }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#1a4fa0" opacity=".15" stroke="#1a4fa0" strokeWidth="1.5"/>
                  <path d="M9 12l2 2 4-4" stroke="#1a4fa0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a4fa0", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Since 2015</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: "#8B1A1A", marginBottom: 4 }}>100% Genuine</p>
              <p style={{ fontSize: 14, color: "#777" }}>Authorized Reseller</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ background: "#1a1a1a", padding: "48px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
            {STATS.map((s, i) => (
              <div key={i} style={{
                textAlign: "center", padding: "24px 20px",
                borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}>
                <p style={{ fontSize: 34, fontWeight: 900, color: "#fff", marginBottom: 4, letterSpacing: "-0.02em" }}>{s.value}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#8B1A1A", marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted Partners ── */}
      <section style={{ background: "#f9f9f9", padding: "48px 0", borderBottom: "1px solid #eee" }}>
        <div className="container">
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 28 }}>
            Trusted Partners
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
            {PARTNERS.map(p => (
              <div key={p.name} style={{
                padding: "10px 24px", background: "#fff", border: "1px solid #e5e5e5",
                borderRadius: 8, fontSize: 16, fontWeight: 900, color: p.color,
                letterSpacing: p.name === "Dell" ? ".05em" : "0",
                transition: "box-shadow 150ms",
                cursor: "default",
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              >{p.name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Values ── */}
      <section style={{ background: "#fff", padding: "60px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8B1A1A", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Why Choose Us</p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a" }}>Our Core Values</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {VALUES.map((v, i) => (
              <div key={i} style={{
                padding: 24, border: "1px solid #e5e5e5", borderRadius: 10, background: "#fff",
                transition: "box-shadow 200ms, transform 200ms",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{v.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>{v.title}</h3>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.7 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section style={{ background: "#f9f9f9", padding: "60px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8B1A1A", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>The People Behind</p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a" }}>Meet Our Team</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            {TEAM.map((m, i) => (
              <div key={i} style={{
                background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "28px 20px",
                textAlign: "center", transition: "box-shadow 200ms, transform 200ms",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
              >
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#8B1A1A,#1a4fa0)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 30 }}>
                  {m.emoji}
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 }}>{m.name}</p>
                <p style={{ fontSize: 12, color: "#8B1A1A", fontWeight: 600 }}>{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "linear-gradient(135deg,#1a1a1a 0%,#1a4fa0 100%)", padding: "56px 0" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 10 }}>Ready to find your perfect tech?</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 28 }}>Browse our full catalog or visit us at St. 271, Phnom Penh.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/products" style={{ padding: "12px 28px", background: "#8B1A1A", color: "#fff", borderRadius: 8, fontWeight: 800, fontSize: 14, textDecoration: "none", transition: "background 150ms" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#6B1010")}
              onMouseLeave={e => (e.currentTarget.style.background = "#8B1A1A")}>
              Shop Now
            </a>
            <a href="/contact" style={{ padding: "12px 28px", background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)", transition: "background 150ms" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
              Contact Us
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
