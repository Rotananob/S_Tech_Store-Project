"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { ShieldCheck, AlertCircle, ArrowRight, RefreshCw, KeyRound, CheckCircle2, MessageCircle, Home, UserCheck } from "lucide-react";
import api from "@/lib/api";
import { useNotificationStore } from "@/store/notificationStore";

function MagicLoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("កំពុងផ្ទៀងផ្ទាត់តំណភ្ជាប់សុវត្ថិភាព... សូមរង់ចាំបន្តិច");
  const [userData, setUserData] = useState<{
    display_name?: string;
    email?: string;
    phone?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("មិនមាន Token សុវត្ថិភាពនៅក្នុងតំណភ្ជាប់នេះទេ។ សូមពិនិត្យតំណភ្ជាប់ដែល Admin បានផ្ញើជូនម្តងទៀត។");
      return;
    }

    let isMounted = true;

    const verifyToken = async () => {
      try {
        setStatus("loading");
        setMessage("ប្រព័ន្ធកំពុងផ្ទៀងផ្ទាត់សិទ្ធិ និងចូលគណនីរបស់អ្នក...");

        const res = await api.post("/auth/magic-login", { token });
        
        if (res.data?.success && isMounted) {
          const user = res.data.user;
          setUserData(user);
          setStatus("success");
          setMessage(res.data.message || "ផ្ទៀងផ្ទាត់ជោគជ័យ! សូមស្វាគមន៍មកកាន់ S Tech Store");

          // Save active session for instant recognition
          if (typeof window !== "undefined") {
            localStorage.setItem("stech_user_session", JSON.stringify(user));
          }

          // Refresh in-app notifications
          try {
            useNotificationStore.getState().fetchNotifications();
          } catch (e) {}

          // Smooth redirect after 2.5 seconds
          setTimeout(() => {
            if (isMounted) {
              router.push("/account/profile");
            }
          }, 2500);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("error");
        const serverError = err.response?.data?.message || err.message || "បរាជ័យក្នុងការចូលគណនី";
        setMessage(serverError);
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

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
      {/* Background radial effects */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(circle, rgba(139,26,26,0.18) 0%, rgba(13,13,13,0) 70%)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(circle, rgba(26,79,160,0.18) 0%, rgba(13,13,13,0) 70%)",
          zIndex: 0,
        }}
      />

      {/* Header Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "36px", zIndex: 1, textDecoration: "none" }}>
        <img
          src="/logo.jpg"
          alt="S Tech Store"
          style={{ width: "54px", height: "54px", objectFit: "contain", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}
        />
        <div>
          <div className="font-dangrek" style={{ fontSize: "28px", color: "white", lineHeight: "1", marginBottom: "3px", letterSpacing: "0.02em" }}>
            S <span style={{ color: "#c0392b" }}>Tech</span> <span style={{ color: "#4a8ff0" }}>Store</span>
          </div>
          <div className="font-khmer" style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", lineHeight: "1" }}>
            ហាងបច្ចេកវិទ្យា • Magic Login Portal
          </div>
        </div>
      </Link>

      {/* Card Content */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(25,25,25,0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          padding: "36px 32px",
          zIndex: 1,
          boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
          textAlign: "center",
        }}
      >
        {status === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", marginBottom: "24px" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTop: "3px solid #c0392b",
                  borderRight: "3px solid #4a8ff0",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto",
                }}
              />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <KeyRound size={26} color="#ffffff" style={{ opacity: 0.8 }} />
              </div>
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", marginBottom: "10px" }}>
              ផ្ទៀងផ្ទាត់តំណភ្ជាប់សុវត្ថិភាព
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6", marginBottom: "20px" }}>
              {message}
            </p>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "9999px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: "12px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <span>🔒</span>
              <span>ការចូលគណនីមានសុវត្ថិភាពកម្រិតខ្ពស់ • 256-bit Token</span>
            </div>
          </div>
        )}

        {status === "success" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "2px solid rgba(16, 185, 129, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
                marginBottom: "20px",
                boxShadow: "0 0 30px rgba(16, 185, 129, 0.25)",
              }}
            >
              <CheckCircle2 size={40} />
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", marginBottom: "8px" }}>
              ចូលគណនីបានជោគជ័យ! 🎉
            </h2>
            <p style={{ fontSize: "14px", color: "#10b981", fontWeight: "600", marginBottom: "16px" }}>
              {message}
            </p>

            {userData && (
              <div
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "16px",
                  marginBottom: "24px",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <UserCheck size={18} color="#4a8ff0" />
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
                    {userData.display_name}
                  </span>
                </div>
                {userData.email && (
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", paddingLeft: "28px" }}>
                    {userData.email}
                  </div>
                )}
              </div>
            )}

            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "20px" }}>
              ប្រព័ន្ធកំពុងបញ្ជូនអ្នកទៅកាន់ទំព័រ Profile ក្នុងពេលបន្តិចទៀត...
            </p>

            <button
              type="button"
              onClick={() => router.push("/account/profile")}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #8B1A1A, #c0392b)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "14px",
                fontSize: "14px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(139,26,26,0.4)",
              }}
            >
              <span>ទៅកាន់ Profile របស់ខ្ញុំឥឡូវនេះ</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {status === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.15)",
                border: "2px solid rgba(239, 68, 68, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
                marginBottom: "20px",
                boxShadow: "0 0 30px rgba(239, 68, 68, 0.2)",
              }}
            >
              <AlertCircle size={38} />
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", marginBottom: "10px" }}>
              តំណភ្ជាប់មិនអាចប្រើប្រាស់បាន
            </h2>
            <p style={{ fontSize: "14px", color: "#fca5a5", lineHeight: "1.6", marginBottom: "24px", background: "rgba(239, 68, 68, 0.1)", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.2)", width: "100%" }}>
              {message}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
              <a
                href="https://t.me/s_tech_storeBot"
                target="_blank"
                rel="noreferrer"
                style={{
                  width: "100%",
                  background: "#229ED9",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "12px",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <MessageCircle size={16} />
                <span>ទាក់ទង Admin តាម Telegram ដើម្បីសុំតំណភ្ជាប់ថ្មី</span>
              </a>

              <Link
                href="/login"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "12px",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <ArrowRight size={16} />
                <span>ត្រឡប់ទៅទំព័រ Login ធម្មតា</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer copyright */}
      <div style={{ marginTop: "32px", fontSize: "12px", color: "rgba(255,255,255,0.3)", zIndex: 1, textAlign: "center" }}>
        © 2026 S Tech Store Cambodia. All rights reserved.
      </div>
    </div>
  );
}

export default function MagicLoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #c0392b", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>Loading Magic Login...</span>
          </div>
        </div>
      }
    >
      <MagicLoginContent />
    </Suspense>
  );
}
