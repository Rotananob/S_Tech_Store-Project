// Loading skeleton for the product detail page.
export default function ProductLoading() {
  return (
    <div style={{ background: "#111", minHeight: "100vh", color: "white" }}>
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
        {/* Breadcrumb skeleton */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
          {[80, 40, 120].map((w, i) => (
            <div key={i} style={{ height: "13px", width: w, background: "rgba(255,255,255,0.12)", borderRadius: "4px", animation: "pulse 1.6s ease-in-out infinite" }} />
          ))}
        </div>

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left — Image skeleton */}
          <div>
            <div style={{ aspectRatio: "4/3", background: "rgba(255,255,255,0.07)", borderRadius: "8px", animation: "pulse 1.6s ease-in-out infinite" }} />
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ width: 80, height: 60, background: "rgba(255,255,255,0.07)", borderRadius: "4px", animation: "pulse 1.6s ease-in-out 0.2s infinite" }} />
              ))}
            </div>
          </div>

          {/* Right — Info skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ height: "32px", width: "75%", background: "rgba(255,255,255,0.12)", borderRadius: "6px", animation: "pulse 1.6s ease-in-out infinite" }} />
            <div style={{ height: "32px", width: "50%", background: "rgba(255,255,255,0.12)", borderRadius: "6px", animation: "pulse 1.6s ease-in-out 0.1s infinite" }} />
            <div style={{ height: "56px", background: "rgba(255,255,255,0.07)", borderRadius: "6px", animation: "pulse 1.6s ease-in-out 0.15s infinite" }} />
            <div style={{ height: "48px", background: "rgba(139,26,26,0.4)", borderRadius: "6px", animation: "pulse 1.6s ease-in-out 0.2s infinite" }} />
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
          50%       { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
