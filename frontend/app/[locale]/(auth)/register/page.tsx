"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load official Telegram Login Widget SDK dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("telegram-widget-sdk")) {
      const script = document.createElement("script");
      script.id = "telegram-widget-sdk";
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Intercept Telegram & TikTok OAuth redirect return if query params contain tokens
  useEffect(() => {
    const tgHash = searchParams?.get("hash");
    const tgId = searchParams?.get("id");
    if (tgHash && tgId) {
      const payload = {
        id: tgId,
        first_name: searchParams.get("first_name") || "",
        last_name: searchParams.get("last_name") || "",
        username: searchParams.get("username") || "",
        photo_url: searchParams.get("photo_url") || "",
        auth_date: searchParams.get("auth_date") || "",
        hash: tgHash,
      };
      handleTelegramVerification(payload);
    }

    const tgToken = searchParams?.get("tg_token");
    if (tgToken) {
      setAuthOverlay({
        show: true,
        title: "⚡ កំពុងផ្ទៀងផ្ទាត់ Telegram...",
        subtitle: "សូមរង់ចាំបន្តិច កំពុងទាញយកទិន្នន័យគណនី...",
        isSuccess: false,
      });

      api.get(`/auth/telegram/token-login?token=${encodeURIComponent(tgToken)}`)
        .then((res) => {
          if (res.data?.success && res.data?.user) {
            const rawUser = res.data.user;
            const userObj = {
              ...rawUser,
              firebase_uid: rawUser.firebase_uid || rawUser.uid || `tg_${rawUser.id || rawUser.telegram_id}`,
              uid: rawUser.uid || rawUser.firebase_uid || `tg_${rawUser.id || rawUser.telegram_id}`,
              display_name: rawUser.display_name || rawUser.name,
              provider: "telegram",
            };
            localStorage.setItem("user_session", JSON.stringify(userObj));
            localStorage.setItem("stech_user_session", JSON.stringify(userObj));
            localStorage.setItem("customer_token", res.data.token);
            document.cookie = `customer_token=${res.data.token}; path=/; max-age=2592000; SameSite=Lax`;
            localStorage.removeItem("stech_pending_tg_handshake");
            sessionStorage.removeItem("stech_pending_tg_handshake");
            window.dispatchEvent(new Event("user_session_updated"));

            setAuthOverlay({
              show: true,
              title: `ស្វាគមន៍ ${userObj.display_name || "អតិថិជន"}! 🎉`,
              subtitle: "ចុះឈ្មោះ និងចូលគណនី Telegram ជោគជ័យ! កំពុងបញ្ជូនទៅកាន់ទំព័រដើម...",
              isSuccess: true,
            });

            setTimeout(() => {
              router.push("/");
            }, 200);
          }
        })
        .catch(() => {
          setError("Token ចូលគណនី Telegram មិនត្រឹមត្រូវ ឬបានផុតកំណត់។");
          setAuthOverlay({ show: false, title: "", subtitle: "" });
        });
    }

    const errorParam = searchParams?.get("error");
    if (errorParam) {
      const errorMsg = searchParams?.get("error_msg");
      if (errorParam.includes("cancelled")) {
        setError("ការចុះឈ្មោះជាមួយគណនី TikTok ត្រូវបានបោះបង់ (TikTok sign-up cancelled).");
      } else if (errorParam.includes("tiktok")) {
        setError(`ការចុះឈ្មោះតាម TikTok បរាជ័យ: ${errorMsg ? decodeURIComponent(errorMsg) : "សូមព្យាយាមម្តងទៀត"}`);
      } else {
        setError(errorMsg ? decodeURIComponent(errorMsg) : "ការផ្ទៀងផ្ទាត់គណនីមានបញ្ហា");
      }
      setAuthOverlay({ show: false, title: "", subtitle: "" });
    }

    const ttToken = searchParams?.get("tiktok_token");
    if (ttToken) {
      const name = searchParams?.get("name") || "TikTok Member";
      const decodedName = decodeURIComponent(name);
      const ttUser = {
        id: "tt_" + Math.random().toString(36).substring(2, 9),
        name: decodedName,
        display_name: decodedName,
        provider: "tiktok",
      };
      localStorage.setItem("user_session", JSON.stringify(ttUser));
      localStorage.setItem("stech_user_session", JSON.stringify(ttUser));
      localStorage.setItem("customer_token", ttToken);
      document.cookie = `customer_token=${ttToken}; path=/; max-age=2592000; SameSite=Lax`;
      window.dispatchEvent(new Event("user_session_updated"));

      setAuthOverlay({
        show: true,
        title: `ចុះឈ្មោះជាមួយ TikTok ជោគជ័យ! 🎉`,
        subtitle: `សូមស្វាគមន៍ ${decodedName}! កំពុងបញ្ជូនទៅកាន់ទំព័រដើម...`,
        isSuccess: true,
      });

      api.get(`/auth/session/token-login?token=${ttToken}`)
        .then((res) => {
          if (res.data?.success && res.data?.user) {
            localStorage.setItem("user_session", JSON.stringify(res.data.user));
            localStorage.setItem("stech_user_session", JSON.stringify(res.data.user));
            window.dispatchEvent(new Event("user_session_updated"));
          }
        })
        .catch(() => {});

      setTimeout(() => {
        router.push("/");
      }, 1500);
    }
  }, [searchParams]);

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

  const getDeviceName = () => {
    if (typeof navigator === "undefined") return "Smart Device";
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return "Apple iPhone";
    if (/iPad/i.test(ua)) return "Apple iPad";
    if (/Macintosh|Mac OS X/i.test(ua)) return "Apple Mac";
    if (/Android/i.test(ua)) return "Android Phone";
    if (/Windows NT/i.test(ua)) return "Windows PC";
    if (/Linux/i.test(ua)) return "Linux Device";
    return "Mobile Device";
  };

  const getBrowserName = () => {
    if (typeof navigator === "undefined") return "Web Browser";
    const ua = navigator.userAgent;
    if (/Telegram/i.test(ua)) return "Telegram In-App";
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return "Chrome";
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
    if (/Edg/i.test(ua)) return "Edge";
    if (/Firefox/i.test(ua)) return "Firefox";
    return "Browser";
  };

  // ─── Real Telegram Cryptographic Handshake Verification ────────────────────
  const handleTelegramVerification = async (tgData: any) => {
    setError("");
    setLoading(true);
    setAuthOverlay({
      show: true,
      title: "🔐 កំពុងផ្ទៀងផ្ទាត់ Telegram Handshake...",
      subtitle: `កំពុងផ្ទៀងផ្ទាត់ហត្ថលេខា Real Account (${tgData.first_name || "User"})...`,
      isSuccess: false,
    });

    try {
      const res = await api.post("/auth/telegram/verify", tgData);
      if (res.data?.success && res.data?.user) {
        // Persist genuine customer session
        const rawUser = res.data.user;
        const userObj = {
          ...rawUser,
          firebase_uid: rawUser.firebase_uid || rawUser.uid || `tg_${rawUser.id || rawUser.telegram_id}`,
          uid: rawUser.uid || rawUser.firebase_uid || `tg_${rawUser.id || rawUser.telegram_id}`,
          display_name: rawUser.display_name || rawUser.name,
          provider: "telegram",
        };
        localStorage.setItem("user_session", JSON.stringify(userObj));
        localStorage.setItem("stech_user_session", JSON.stringify(userObj));
        localStorage.setItem("customer_token", res.data.token);
        document.cookie = `customer_token=${res.data.token}; path=/; max-age=2592000; SameSite=Lax`;
        window.dispatchEvent(new Event("user_session_updated"));

        setAuthOverlay({
          show: true,
          title: `ស្វាគមន៍ ${userObj.display_name || "អតិថិជន"}! 🎉`,
          subtitle: "ចុះឈ្មោះ និងចូលគណនីជាមួយ Telegram ពិតប្រាកដជោគជ័យ! កំពុងបញ្ជូនទៅកាន់ទំព័រដើម...",
          isSuccess: true,
        });

        await new Promise((r) => setTimeout(r, 1200));
        router.push("/");
      } else {
        throw new Error(res.data?.error || "ការផ្ទៀងផ្ទាត់ Telegram បរាជ័យ");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "បរាជ័យក្នុងការចុះឈ្មោះតាម Telegram");
      setAuthOverlay({ show: false, title: "", subtitle: "" });
    } finally {
      setLoading(false);
    }
  };

  // ─── High-Performance Real-Time Telegram Polling (Synchronized with Bot) ───
  const telegramPollIntervalRef = useRef<any>(null);
  const isPollingCompletedRef = useRef<boolean>(false);
  const lastResumeTimeRef = useRef<number>(0);

  const startOrResumeTelegramPolling = (token: string, isReturning = false) => {
    if (isPollingCompletedRef.current) return;

    if (telegramPollIntervalRef.current) {
      clearInterval(telegramPollIntervalRef.current);
      telegramPollIntervalRef.current = null;
    }

    setAuthOverlay({
      show: true,
      title: isReturning
        ? "⚡ កំពុងផ្ទៀងផ្ទាត់ជាមួយ Telegram Bot..."
        : "✈️ កំពុងផ្ទៀងផ្ទាត់ Telegram...",
      subtitle: isReturning
        ? "សូមរង់ចាំមួយភ្លែត កំពុងឆែកមើលស្ថានភាពជោគជ័យពី Telegram..."
        : 'សូមចុចប៊ូតុង "START" លើ Telegram របស់លោកអ្នក ដើម្បីចុះឈ្មោះភ្លាមៗ...',
      isSuccess: false,
    });

    const checkStatus = async () => {
      if (isPollingCompletedRef.current) return true;
      try {
        const checkRes = await api.get(`/auth/telegram/handshake-check?token=${encodeURIComponent(token)}`);
        if (checkRes.data?.success && checkRes.data?.completed && checkRes.data?.user) {
          isPollingCompletedRef.current = true;
          if (telegramPollIntervalRef.current) {
            clearInterval(telegramPollIntervalRef.current);
            telegramPollIntervalRef.current = null;
          }

          const rawUser = checkRes.data.user;
          const userObj = {
            ...rawUser,
            firebase_uid: rawUser.firebase_uid || rawUser.uid || `tg_${rawUser.id || rawUser.telegram_id}`,
            uid: rawUser.uid || rawUser.firebase_uid || `tg_${rawUser.id || rawUser.telegram_id}`,
            display_name: rawUser.display_name || rawUser.name,
            provider: "telegram",
          };
          localStorage.setItem("user_session", JSON.stringify(userObj));
          localStorage.setItem("stech_user_session", JSON.stringify(userObj));
          localStorage.setItem("customer_token", checkRes.data.token);
          document.cookie = `customer_token=${checkRes.data.token}; path=/; max-age=2592000; SameSite=Lax`;
          localStorage.removeItem("stech_pending_tg_handshake");
          sessionStorage.removeItem("stech_pending_tg_handshake");
          window.dispatchEvent(new Event("user_session_updated"));

          setAuthOverlay({
            show: true,
            title: `ស្វាគមន៍ ${userObj.display_name || "អតិថិជន"}! 🎉`,
            subtitle: "ចុះឈ្មោះជាមួយ Telegram ជោគជ័យ! កំពុងបញ្ជូនទៅកាន់ទំព័រដើម...",
            isSuccess: true,
          });

          // Ultra snappy 200ms entry transition
          setTimeout(() => {
            router.push("/");
          }, 200);
          return true;
        } else if (checkRes.data?.status === "expired" || checkRes.data?.status === "rejected") {
          isPollingCompletedRef.current = true;
          if (telegramPollIntervalRef.current) {
            clearInterval(telegramPollIntervalRef.current);
            telegramPollIntervalRef.current = null;
          }
          localStorage.removeItem("stech_pending_tg_handshake");
          sessionStorage.removeItem("stech_pending_tg_handshake");
          setError("ការផ្ទៀងផ្ទាត់ Telegram បានផុតកំណត់ ឬមិនត្រឹមត្រូវ។ សូមព្យាយាមម្តងទៀត។");
          setAuthOverlay({ show: false, title: "", subtitle: "" });
          return false;
        }
      } catch (e) {}
      return false;
    };

    // Immediate check on trigger (0ms delay)
    checkStatus();

    // High-frequency snappy polling: 350ms (sub-second sync with bot)
    let attempts = 0;
    telegramPollIntervalRef.current = setInterval(async () => {
      if (isPollingCompletedRef.current) {
        clearInterval(telegramPollIntervalRef.current);
        return;
      }
      attempts++;
      if (attempts > 35) {
        if (telegramPollIntervalRef.current) {
          clearInterval(telegramPollIntervalRef.current);
          telegramPollIntervalRef.current = null;
        }
        localStorage.removeItem("stech_pending_tg_handshake");
        sessionStorage.removeItem("stech_pending_tg_handshake");
        setError("ការផ្ទៀងផ្ទាត់ Telegram លើសកំណត់ពេល។ សូមចុចព្យាយាមម្តងទៀត។");
        setAuthOverlay({ show: false, title: "", subtitle: "" });
        return;
      }
      await checkStatus();
    }, 350);
  };

  // Mount & Visibility listener to lock page and resume login immediately upon return
  useEffect(() => {
    const resumeIfPending = (isReturning = true) => {
      const now = Date.now();
      if (now - lastResumeTimeRef.current < 300) return; // Debounce rapid focus + visibilitychange
      lastResumeTimeRef.current = now;

      if (isPollingCompletedRef.current) return;

      try {
        const saved = localStorage.getItem("stech_pending_tg_handshake") || sessionStorage.getItem("stech_pending_tg_handshake");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.token && (Date.now() - (parsed.createdAt || 0)) < 600000) {
            startOrResumeTelegramPolling(parsed.token, isReturning);
          } else {
            localStorage.removeItem("stech_pending_tg_handshake");
            sessionStorage.removeItem("stech_pending_tg_handshake");
          }
        }
      } catch (e) {}
    };

    resumeIfPending(false);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        resumeIfPending(true);
      }
    };

    const handleFocus = () => {
      resumeIfPending(true);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (telegramPollIntervalRef.current) {
        clearInterval(telegramPollIntervalRef.current);
      }
    };
  }, []);

  // ─── Trigger Real Telegram OAuth (1-Click App Handshake OR Widget) ───────────────
  const handleTelegramSignIn = async () => {
    setError("");
    const botId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID || "8929556298";
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Stech_store_LoginBot";
    const deviceName = getDeviceName();

    setAuthOverlay({
      show: true,
      title: "✈️ កំពុងភ្ជាប់ Telegram App...",
      subtitle: "សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងបើក Telegram ដើម្បី Confirm ចុះឈ្មោះ...",
      isSuccess: false,
    });

    try {
      // 1. Initialize instant App Handshake from backend (Bypasses Bot domain invalid!)
      const res = await api.post("/auth/telegram/handshake-init");
      if (res.data?.success && res.data?.handshake_token) {
        const token = res.data.handshake_token;
        const deepLink = res.data.deep_link;
        const appLink = res.data.app_link;

        // Lock & persist pending handshake session so refresh or backgrounding NEVER loses state
        const pendingSession = {
          token,
          createdAt: Date.now(),
        };
        localStorage.setItem("stech_pending_tg_handshake", JSON.stringify(pendingSession));
        sessionStorage.setItem("stech_pending_tg_handshake", JSON.stringify(pendingSession));

        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = appLink || deepLink;
        } else {
          window.open(deepLink, "_blank");
        }

        startOrResumeTelegramPolling(token);
        return;
      }
    } catch (err: any) {
      console.warn("Handshake init fallback to widget/oauth:", err);
    }

    // 2. Fallback to Telegram Web Widget or Direct Redirect Gateway
    const origin = window.location.origin.includes("s-tech-store.tech")
      ? window.location.origin
      : "https://www.s-tech-store.tech";
    const callbackUrl = window.location.origin + window.location.pathname;
    const oauthUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(origin)}&embed=0&request_access=write&return_to=${encodeURIComponent(callbackUrl)}`;
    window.location.href = oauthUrl;
  };

  // ─── Real Official TikTok OAuth 2.0 Sign Up ──────────────────────────────────
  const handleTikTokSignIn = async () => {
    setError("");
    setLoading(true);
    const deviceName = getDeviceName();

    setAuthOverlay({
      show: true,
      title: `🎵 កំពុងភ្ជាប់ TikTok Login Kit (${deviceName})...`,
      subtitle: "សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងបើកផ្ទាំងចុះឈ្មោះផ្លូវការរបស់ TikTok...",
      isSuccess: false,
    });

    try {
      const returnTo = window.location.origin + window.location.pathname;
      const res = await api.get(
        `/auth/tiktok/redirect?format=json&origin=${encodeURIComponent(window.location.origin)}&return_to=${encodeURIComponent(returnTo)}`
      );
      if (res.data?.success && res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
    } catch (err: any) {
      console.warn("Direct JSON oauth lookup failed, redirecting via browser navigation:", err);
    }

    // Direct browser navigation to API redirect route with origin params
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://stech-backend-xz6j.onrender.com/api";
    const returnTo = window.location.origin + window.location.pathname;
    window.location.href = `${backendUrl}/auth/tiktok/redirect?origin=${encodeURIComponent(window.location.origin)}&return_to=${encodeURIComponent(returnTo)}`;
  };

  const handleFacebookSignIn = async () => {
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

          {/* TikTok Sign Up */}
          <button
            type="button"
            style={{
              width: "100%",
              background: "#010101",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#0d0d0d";
                e.currentTarget.style.borderColor = "rgba(238, 29, 82, 0.7)";
                e.currentTarget.style.boxShadow = "0 0 14px rgba(238, 29, 82, 0.28), 0 0 14px rgba(105, 201, 208, 0.28)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#010101";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
            onClick={handleTikTokSignIn}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.89 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3 15.67 6.34 6.34 0 0 0 9.34 22a6.34 6.34 0 0 0 6.34-6.33V9.2a8.28 8.28 0 0 0 3.91 1.05v-3.56z"/>
            </svg>
            Sign up with TikTok
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
