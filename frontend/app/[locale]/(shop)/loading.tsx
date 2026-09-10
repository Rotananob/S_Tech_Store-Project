// Global loading UI for the shop route group.
// Next.js renders this instantly while server components fetch their data.
export default function ShopLoading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        background: "#fdfdfd",
      }}
    >
      {/* Animated progress bar at the top of the viewport */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          zIndex: 9999,
          background: "linear-gradient(90deg, #8B1A1A 0%, #c0392b 50%, #1a4fa0 100%)",
          backgroundSize: "200% 100%",
          animation: "progress-slide 1.2s linear infinite",
        }}
      />

      {/* Skeleton cards grid */}
      <div
        className="container"
        style={{ paddingTop: "40px", paddingBottom: "60px" }}
      >
        {/* Skeleton heading */}
        <div
          style={{
            height: "20px",
            width: "160px",
            background: "#e5e5e5",
            borderRadius: "6px",
            marginBottom: "28px",
            animation: "pulse 1.6s ease-in-out infinite",
          }}
        />

        {/* Skeleton product grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                borderRadius: "8px",
                overflow: "hidden",
                background: "#f3f3f3",
                animation: `pulse 1.6s ease-in-out ${i * 0.1}s infinite`,
              }}
            >
              {/* Image skeleton */}
              <div style={{ aspectRatio: "1/1", background: "#e5e5e5" }} />
              {/* Text skeleton */}
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ height: "13px", background: "#e5e5e5", borderRadius: "4px", width: "80%" }} />
                <div style={{ height: "13px", background: "#e5e5e5", borderRadius: "4px", width: "60%" }} />
                <div style={{ height: "18px", background: "#dce3ed", borderRadius: "4px", width: "45%", marginTop: "4px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes progress-slide {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
