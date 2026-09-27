export default function ShopLoading() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", zIndex: 9999, background: "linear-gradient(90deg, #8B1A1A 0%, #c0392b 50%, #1a4fa0 100%)", backgroundSize: "200% 100%", animation: "progress-slide 1.2s linear infinite" }} />
      
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
        <h1 className="font-dangrek text-4xl" style={{ color: "#8B1A1A", margin: 0, letterSpacing: "1px" }}>
          S TECH
        </h1>
        
        <div style={{ width: "32px", height: "32px", border: "3px solid #f3f3f3", borderTop: "3px solid #1a4fa0", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>

      <style>{`
        @keyframes progress-slide { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
