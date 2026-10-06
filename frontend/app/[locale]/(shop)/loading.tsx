export default function ShopLoading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
      {/* Top Gradient Progress Line */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", zIndex: 9999, background: "linear-gradient(90deg, #8B1A1A 0%, #c0392b 50%, #1a4fa0 100%)", backgroundSize: "200% 100%", animation: "progress-slide 1.2s linear infinite" }} />
      
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
        {/* Official S Tech Store Logo */}
        <div style={{ position: "relative" }}>
          <img
            src="/logo.jpg"
            alt="S Tech Store Logo"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              objectFit: "contain",
              boxShadow: "0 10px 25px -5px rgba(139, 26, 26, 0.25)",
              border: "2px solid #f3f3f3",
            }}
          />
        </div>

        {/* Brand Name */}
        <div style={{ textAlign: "center" }}>
          <h1 className="font-dangrek" style={{ fontSize: "28px", color: "#1a1a1a", margin: 0, letterSpacing: "0.5px", lineHeight: "1.2" }}>
            S <span style={{ color: "#8B1A1A" }}>Tech</span> <span style={{ color: "#1a4fa0" }}>Store</span>
          </h1>
          <p className="font-khmer" style={{ fontSize: "12px", color: "#888888", margin: "4px 0 0 0", letterSpacing: "0.5px" }}>
            ហាងបច្ចេកវិទ្យា
          </p>
        </div>
        
        {/* Modern Accent Spinner */}
        <div style={{ width: "32px", height: "32px", border: "3px solid #f0f0f0", borderTop: "3px solid #8B1A1A", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginTop: "8px" }} />
      </div>

      <style>{`
        @keyframes progress-slide { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.85; transform: scale(0.98); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
