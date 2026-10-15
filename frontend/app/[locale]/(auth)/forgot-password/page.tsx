"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address (សូមបញ្ចូលអាសយដ្ឋាន Gmail/Email របស់អ្នក)។");
      return;
    }

    setLoading(true);
    let sentSuccess = false;

    try {
      // 1. Dispatch official luxury branded reset email via S Tech Backend Email Service
      try {
        const res = await api.post("/user/send-reset-email", {
          email: email.trim(),
          channel: "email",
        });
        if (res.data?.success) {
          sentSuccess = true;
          setMessage(res.data.message || "បានផ្ញើតំណភ្ជាប់ផ្លាស់ប្តូរពាក្យសម្ងាត់ទៅកាន់ Gmail របស់អ្នករួចរាល់ហើយ! សូមពិនិត្យមើលប្រអប់សំបុត្រ Inbox ឬ Spam។ 📩");
          setEmail("");
        }
      } catch (backendErr: any) {
        console.warn("Backend reset email notice:", backendErr);
      }

      // 2. Also trigger Firebase client reset email as companion/fallback
      try {
        await sendPasswordResetEmail(auth, email.trim());
        if (!sentSuccess) {
          sentSuccess = true;
          setMessage("បានផ្ញើតំណភ្ជាប់ផ្លាស់ប្តូរពាក្យសម្ងាត់រួចរាល់ហើយ! Please check your inbox or spam folder.");
          setEmail("");
        }
      } catch (firebaseErr: any) {
        if (!sentSuccess) {
          throw firebaseErr;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to send reset email. សូមព្យាយាមម្តងទៀត ឬទាក់ទងមកកាន់ Admin។");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(circle, rgba(139,26,26,0.15) 0%, rgba(13,13,13,0) 70%)",
          zIndex: 0,
        }}
      />
      
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px", zIndex: 1, textDecoration: "none" }}>
        <img
          src="/logo.jpg"
          alt="S Tech Store"
          style={{ width: "54px", height: "54px", objectFit: "contain", borderRadius: "10px" }}
        />
        <div>
          <div className="font-dangrek" style={{ fontSize: "28px", color: "white", lineHeight: "1", marginBottom: "2px", letterSpacing: "0.02em" }}>
            S <span style={{ color: "#c0392b" }}>Tech</span> <span style={{ color: "#4a8ff0" }}>Store</span>
          </div>
        </div>
      </Link>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(25,25,25,0.7)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "40px",
          zIndex: 1,
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "800", color: "white", marginBottom: "8px", textAlign: "center" }}>
          Reset Password
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: "32px" }}>
          Enter your email and we'll send you a link to reset your password.
        </p>

        {error && (
          <div style={{ background: "rgba(255, 0, 0, 0.1)", border: "1px solid rgba(255, 0, 0, 0.3)", color: "#ff4d4d", padding: "10px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", textAlign: "center" }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: "rgba(0, 255, 0, 0.1)", border: "1px solid rgba(0, 255, 0, 0.3)", color: "#4ade80", padding: "10px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", textAlign: "center" }}>
            {message}
          </div>
        )}

        <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "12px 16px",
                color: "white",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #8B1A1A, #c0392b)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "14px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
            }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "12px", lineHeight: "1.5" }}>
            មិនទទួលបានអ៊ីមែល ឬត្រូវការជំនួយបន្ទាន់? ស្នើសុំ Magic Login Link ពី Admin:
          </p>
          <a
            href="https://t.me/S_TECH_ASSISTANTBOT"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "10px 16px",
              borderRadius: "8px",
              background: "#229ED9",
              color: "white",
              fontSize: "13px",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            <span>💬</span>
            <span>ទាក់ទង Admin តាម Telegram</span>
          </a>
        </div>

        <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "24px" }}>
          Remember your password?{" "}
          <Link href="/login" style={{ color: "#4a8ff0", fontWeight: "600", textDecoration: "none" }}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
