"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNotificationStore } from "@/store/notificationStore";
import api from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Create real welcome notification in database
      await api.post("/user/notifications", {
        title: "Welcome to S Tech Store! 🎉",
        message: "Thank you for joining Cambodia's #1 genuine tech store. Enjoy 1-year official warranty on all products!",
        type: "welcome",
      });
      useNotificationStore.getState().fetchNotifications();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to create an account.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await api.post("/user/notifications", {
        title: "Welcome to S Tech Store! 🎉",
        message: `Welcome ${cred.user.displayName || cred.user.email}! Your S Tech account is ready.`,
        type: "welcome",
      });
      useNotificationStore.getState().fetchNotifications();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    alert("មុខងារនេះកំពុងកែតម្រូវបន្ថែម ឬមានឆាប់ៗនេះ។ សូមអធ្យាស្រ័យ! (This feature is coming soon)");
  };

  const handleAppleSignIn = async () => {
    alert("មុខងារនេះកំពុងកែតម្រូវបន្ថែម ឬមានឆាប់ៗនេះ។ សូមអធ្យាស្រ័យ! (This feature is coming soon)");
  };

  const handleTikTokSignIn = async () => {
    alert("មុខងារនេះកំពុងកែតម្រូវបន្ថែម ឬមានឆាប់ៗនេះ។ សូមអធ្យាស្រ័យ! (This feature is coming soon)");
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
      {/* Background creative elements */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(circle, rgba(139,26,26,0.15) 0%, rgba(13,13,13,0) 70%)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(circle, rgba(26,79,160,0.15) 0%, rgba(13,13,13,0) 70%)",
          zIndex: 0,
        }}
      />

      {/* Header / Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px", zIndex: 1, textDecoration: "none" }}>
        <img
          src="/logo.jpg"
          alt="S Tech Store"
          style={{ width: "54px", height: "54px", objectFit: "contain", borderRadius: "10px", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
        />
        <div>
          <div className="font-dangrek" style={{ fontSize: "28px", color: "white", lineHeight: "1", marginBottom: "2px", letterSpacing: "0.02em" }}>
            S <span style={{ color: "#c0392b" }}>Tech</span> <span style={{ color: "#4a8ff0" }}>Store</span>
          </div>
          <div className="font-khmer" style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", lineHeight: "1" }}>
            ហាងបច្ចេកវិទ្យា
          </div>
        </div>
      </Link>

      {/* Register Card */}
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
          Create an Account
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: "32px" }}>
          Join S Tech Store to start shopping
        </p>

        {error && (
          <div style={{ background: "rgba(255, 0, 0, 0.1)", border: "1px solid rgba(255, 0, 0, 0.3)", color: "#ff4d4d", padding: "10px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Name */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "12px 16px",
                color: "white",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#c0392b")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>

          {/* Email */}
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
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#c0392b")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "12px 40px 12px 16px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#c0392b")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "4px",
                }}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              background: "linear-gradient(135deg, #8B1A1A, #c0392b)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "14px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              marginTop: "8px",
              boxShadow: "0 4px 12px rgba(139,26,26,0.3)",
              transition: "transform 0.1s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 16px rgba(139,26,26,0.5)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,26,26,0.3)")}
            onMouseDown={(e) => !loading && (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => !loading && (e.currentTarget.style.transform = "scale(1)")}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "24px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            type="button"
            style={{
              width: "100%",
              background: "white",
              color: "#1a1a1a",
              border: "none",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#f5f5f5")}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "white")}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: "20px", height: "20px" }} />
            Sign up with Google
          </button>

          <button
            type="button"
            style={{
              width: "100%",
              background: "#000000",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#333333")}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#000000")}
            onClick={handleAppleSignIn}
            disabled={loading}
          >
            <img src="https://www.svgrepo.com/show/511330/apple-173.svg" alt="Apple" style={{ width: "20px", height: "20px", filter: "invert(1)" }} />
            Sign up with Apple
          </button>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              style={{
                flex: 1,
                background: "#1877F2",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#166fe5")}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#1877F2")}
              onClick={handleFacebookSignIn}
              disabled={loading}
            >
              <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" style={{ width: "20px", height: "20px" }} />
              Facebook
            </button>

            <button
              type="button"
              style={{
                flex: 1,
                background: "#25F4EE",
                color: "black",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#20e2dc")}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#25F4EE")}
              onClick={handleTikTokSignIn}
              disabled={loading}
            >
              <svg fill="#000000" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.97-1.561 4.956 4.956 0 0 1-1.234-3.128h-3.619v14.156a3.252 3.252 0 1 1-3.256-3.25 3.25 3.25 0 0 1 2.394 1.05v-3.805a7.02 7.02 0 0 0-2.394-.42 7.054 7.054 0 1 0 7.059 7.049V7.32a8.675 8.675 0 0 0 4.996 1.543V5.042a4.82 4.82 0 0 1-.024-2.905z"/></svg>
              TikTok
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "32px" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#c0392b", fontWeight: "600", textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
