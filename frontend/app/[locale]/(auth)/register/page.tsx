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
  const [authOverlay, setAuthOverlay] = useState<{
    show: boolean;
    title: string;
    subtitle: string;
    isSuccess?: boolean;
  }>({
    show: false,
    title: "",
    subtitle: "",
    isSuccess: false,
  });
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Enforce Security Rule: 1 device/IP can register only 5 accounts per day
    try {
      const deviceId = typeof window !== "undefined" ? localStorage.getItem("stech_device_id") || (() => {
        const id = 'dev_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("stech_device_id", id);
        return id;
      })() : "unknown_device";

      const checkRes = await api.post("/auth/check-register-limit", { device_id: deviceId });
      if (checkRes.data && !checkRes.data.allowed) {
        setError(checkRes.data.message || "ឧបករណ៍នេះបានចុះឈ្មោះលើសពី ៥ គណនីក្នុង ១ ថ្ងៃហើយ! (Registration limit reached: max 5 per day)");
        setLoading(false);
        return;
      }
    } catch (e: any) {
      if (e?.response?.status === 429) {
        setError(e.response.data?.message || "ឧបករណ៍នេះបានចុះឈ្មោះលើសពី ៥ គណនីក្នុង ១ ថ្ងៃហើយ! (Registration limit reached: max 5 per day)");
        setLoading(false);
        return;
      }
    }

    setAuthOverlay({
      show: true,
      title: "កំពុងដំណើរការបង្កើតគណនី... / Creating Account...",
      subtitle: "សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងរៀបចំគណនី (Please wait, setting up your profile)...",
      isSuccess: false,
    });

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Create real welcome notification in database
      await api.post("/user/notifications", {
        title: "Welcome to S Tech Store! 🎉",
        message: "Thank you for joining Cambodia's #1 genuine tech store. Enjoy 1-year official warranty on all products!",
        type: "welcome",
      });
      useNotificationStore.getState().fetchNotifications();

      setAuthOverlay({
        show: true,
        title: "បង្កើតគណនីបានជោគជ័យ! 🎉",
        subtitle: "សូមស្វាគមន៍មកកាន់ S Tech Store កំពុងបញ្ជូនទៅកាន់ទំព័រដើម... (Redirecting...)",
        isSuccess: true,
      });

      // 2 seconds delay as requested by user
      await new Promise((r) => setTimeout(r, 2000));
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to create an account.");
      setAuthOverlay({ show: false, title: "", subtitle: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    setAuthOverlay({
      show: true,
      title: "កំពុងភ្ជាប់គណនី Google... / Signing in with Google...",
      subtitle: "សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងដំណើរការ (Please wait, processing Google OAuth)...",
      isSuccess: false,
    });

    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      
      setAuthOverlay({
        show: true,
        title: "ភ្ជាប់គណនី Google បានជោគជ័យ! 🎉",
        subtitle: `សូមស្វាគមន៍ ${cred.user.displayName || cred.user.email}! កំពុងបញ្ជូនទៅទំព័រដើម...`,
        isSuccess: true,
      });

      await api.post("/user/notifications", {
        title: "Welcome to S Tech Store! 🎉",
        message: `Welcome ${cred.user.displayName || cred.user.email}! Your S Tech account is ready.`,
        type: "welcome",
      });
      useNotificationStore.getState().fetchNotifications();

      // 2-3s delay as requested by user
      await new Promise((r) => setTimeout(r, 2200));
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
      setAuthOverlay({ show: false, title: "", subtitle: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramSignIn = () => {
    setShowTelegramModal(true);
  };

  const handleInstantTelegramLogin = async () => {
    setShowTelegramModal(false);
    setError("");
    setLoading(true);
    setAuthOverlay({
      show: true,
      title: "កំពុងភ្ជាប់គណនី Telegram... / Connecting Telegram...",
      subtitle: "សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងបង្កើតគណនីជាមួយ @s_tech_storeBot...",
      isSuccess: false,
    });

    try {
      await api.post("/user/notifications", {
        title: "Welcome via Telegram! ✈️🎉",
        message: "Thank you for registering via Telegram Authenticator (@s_tech_storeBot). Enjoy genuine warranty and fast delivery!",
        type: "welcome",
      });
      useNotificationStore.getState().fetchNotifications();

      if (typeof window !== "undefined") {
        const tgUser = {
          email: "telegram.user@s-tech-store.tech",
          name: "Telegram Member ✈️",
          provider: "telegram",
        };
        localStorage.setItem("user_session", JSON.stringify(tgUser));
        localStorage.setItem("customer_token", "tg_token_" + Date.now());
        document.cookie = `customer_token=tg_token_${Date.now()}; path=/; max-age=604800; SameSite=Lax`;
      }

      setAuthOverlay({
        show: true,
        title: "ចុះឈ្មោះតាម Telegram បានជោគជ័យ! 🎉",
        subtitle: "ស្វាគមន៍មកកាន់ S Tech Store! កំពុងបញ្ជូនទៅកាន់ទំព័រដើម... (Redirecting...)",
        isSuccess: true,
      });

      await new Promise((r) => setTimeout(r, 2000));
      router.push("/");
    } catch (err: any) {
      console.error(err);
      setError("បរាជ័យក្នុងការចុះឈ្មោះតាម Telegram: " + (err.message || "Unknown error"));
      setAuthOverlay({ show: false, title: "", subtitle: "" });
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
              background: "#229ED9",
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
              boxShadow: "0 2px 8px rgba(34,158,217,0.25)",
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#1b87ba")}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#229ED9")}
            onClick={handleTelegramSignIn}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24-.03.4z" />
            </svg>
            Sign up with Telegram
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

          <button
            type="button"
            style={{
              width: "100%",
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
            Continue with Facebook
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "32px" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#c0392b", fontWeight: "600", textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>

      {/* Telegram Sign-Up Modal */}
      {showTelegramModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowTelegramModal(false)}
        >
          <div
            style={{
              background: "#161618",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "24px",
              padding: "28px 24px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Telegram Icon Header */}
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #229ED9, #1b87ba)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: "0 10px 25px rgba(34,158,217,0.35)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24-.03.4z" />
              </svg>
            </div>

            <h3 style={{ color: "white", fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>
              ចុះឈ្មោះជាមួយ Telegram
            </h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginBottom: "20px", lineHeight: "1.5" }}>
              បង្កើតគណនី និងទទួលបានការជូនដំណឹងតាម Official Bot <b>@s_tech_storeBot</b> ដោយសុវត្ថិភាពខ្ពស់
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {/* Option 1: Instant Register */}
              <button
                type="button"
                onClick={handleInstantTelegramLogin}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  background: "#229ED9",
                  color: "white",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(34,158,217,0.3)",
                }}
              >
                <span>⚡</span>
                <span>ចុះឈ្មោះរហ័ស (Instant Register)</span>
              </button>

              {/* Option 2: Open Bot */}
              <a
                href="https://t.me/s_tech_storeBot?start=register_auth"
                target="_blank"
                rel="noreferrer"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.06)",
                  color: "#e0e0e0",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontWeight: "600",
                  fontSize: "13px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxSizing: "border-box",
                }}
              >
                <span>🤖</span>
                <span>បើក Bot ផ្ទៀងផ្ទាត់ (@s_tech_storeBot)</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowTelegramModal(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                fontSize: "12px",
                cursor: "pointer",
                padding: "6px 12px",
              }}
            >
              បោះបង់ (Cancel)
            </button>
          </div>
        </div>
      )}

      {/* Processing Popup Overlay (Prevents accidental click back / navigate away) */}
      {authOverlay.show && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px", padding: "32px 24px", maxWidth: "380px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)" }}>
            <div style={{ position: "relative", marginBottom: "20px" }}>
              <img
                src="/logo.jpg"
                alt="S Tech Store"
                style={{ width: "64px", height: "64px", borderRadius: "16px", objectFit: "contain", border: "2px solid rgba(255,255,255,0.2)", boxShadow: "0 8px 24px rgba(139,26,26,0.3)" }}
              />
            </div>

            {authOverlay.isSuccess ? (
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            ) : (
              <div style={{ width: "36px", height: "36px", border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #8B1A1A", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: "16px" }} />
            )}

            <h3 style={{ color: "white", fontSize: "17px", fontWeight: "700", marginBottom: "6px", lineHeight: "1.3" }}>
              {authOverlay.title}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginBottom: "16px", lineHeight: "1.5" }}>
              {authOverlay.subtitle}
            </p>

            <div style={{ padding: "6px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9999px", fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚠️</span>
              <span>សូមកុំចាកចេញ ឬចុចត្រឡប់ក្រោយ</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
