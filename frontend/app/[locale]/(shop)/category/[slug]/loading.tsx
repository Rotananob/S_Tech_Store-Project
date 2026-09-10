// Loading skeleton for the category listing page.
export default function CategoryLoading() {
  return (
    <div style={{ background: "#f8f9fb", minHeight: "100vh" }}>
      {/* Progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          zIndex: 9999,
          background: "linear-gradient(90deg, #8B1A1A, #c0392b, #1a4fa0)",
          backgroundSize: "200% 100%",
          animation: "progress-slide 1.2s linear infinite",
        }}
      />

      <div className="container" style={{ paddingTop: "24px", paddingBottom: "60px" }}>
        {/* Header skeleton */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ height: "28px", width: "180px", background: "#e0e0e0", borderRadius: "6px", animation: "pulse 1.6s ease-in-out infinite" }} />
          <div style={{ height: "36px", width: "120px", background: "#e0e0e0", borderRadius: "8px", animation: "pulse 1.6s ease-in-out 0.1s infinite" }} />
        </div>

        {/* Search bar skeleton */}
        <div style={{ height: "48px", background: "#e0e0e0", borderRadius: "16px", marginBottom: "20px", animation: "pulse 1.6s ease-in-out 0.15s infinite" }} />

        {/* Layout: sidebar + grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar skeleton — desktop only */}
          <div className="hidden lg:block" style={{ background: "#fff", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {[140, 100, 120, 90, 110].map((w, i) => (
              <div key={i} style={{ height: "14px", width: w, background: "#e0e0e0", borderRadius: "4px", animation: `pulse 1.6s ease-in-out ${i * 0.08}s infinite` }} />
            ))}
          </div>

          {/* Product grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #eaeaea",
                  animation: `pulse 1.6s ease-in-out ${i * 0.06}s infinite`,
                }}
              >
                <div style={{ aspectRatio: "1/1", background: "#f0f0f0" }} />
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ height: "12px", background: "#e8e8e8", borderRadius: "4px", width: "70%" }} />
                  <div style={{ height: "12px", background: "#e8e8e8", borderRadius: "4px", width: "50%" }} />
                  <div style={{ height: "18px", background: "#dce3ed", borderRadius: "4px", width: "40%", marginTop: "4px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress-slide {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
