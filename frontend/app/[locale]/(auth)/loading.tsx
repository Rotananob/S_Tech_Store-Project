// Loading skeleton for the auth route group (login, register).
export default function AuthLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#fff",
          borderRadius: "16px",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          animation: "pulse 1.6s ease-in-out infinite",
        }}
      >
        <div style={{ height: "28px", width: "60%", background: "#e5e5e5", borderRadius: "6px", margin: "0 auto" }} />
        <div style={{ height: "14px", width: "80%", background: "#efefef", borderRadius: "4px", margin: "0 auto" }} />
        {[1, 2].map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ height: "12px", width: "80px", background: "#efefef", borderRadius: "4px" }} />
            <div style={{ height: "44px", background: "#f3f3f3", borderRadius: "8px" }} />
          </div>
        ))}
        <div style={{ height: "48px", background: "#8B1A1A", borderRadius: "8px", opacity: 0.4 }} />
      </div>

      <style>{`
        @keyframes progress-slide {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
