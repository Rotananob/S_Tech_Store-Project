"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNotificationStore } from "@/store/notificationStore";
import { toHumanKhmerError } from "@/lib/error-translator";
import api from "@/lib/api";
import { getEffectiveUser } from "@/lib/auth-user";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authOverlay, setAuthOverlay] = useState<{
    show: boolean;
    title: string;
    subtitle: string;
    isSuccess?: boolean;
    canCancel?: boolean;
    deepLink?: string;
  }>({
    show: false,
    title: "",
    subtitle: "",
    isSuccess: false,
    canCancel: false,
    deepLink: "",
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Smart destination resolver (Preserves intended checkout, cart, or profile URL)
  const getRedirectTarget = () => {
    const fromQuery = searchParams?.get("redirect") || searchParams?.get("return_to");
    if (fromQuery && fromQuery.startsWith("/")) return fromQuery;
    const fromSession = typeof window !== "undefined" ? sessionStorage.getItem("stech_auth_redirect") : null;
    if (fromSession && fromSession.startsWith("/")) return fromSession;
    return "/";
  };

  const navigateToDestination = (delay = 200) => {
    const target = getRedirectTarget();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("stech_auth_redirect");
    }
    setTimeout(() => {
      router.push(target);
    }, delay);
  };

  const handleCancelAuth = () => {
    if (telegramPollTimeoutRef.current) {
      clearTimeout(telegramPollTimeoutRef.current);
      telegramPollTimeoutRef.current = null;
    }
    isPollingCompletedRef.current = false;
    isCheckingRef.current = false;
    activeTokenRef.current = null;
    localStorage.removeItem("stech_pending_tg_handshake");
    sessionStorage.removeItem("stech_pending_tg_handshake");
    setLoading(false);
    setAuthOverlay({ show: false, title: "", subtitle: "", isSuccess: false, canCancel: false, deepLink: "" });
  };

  // Auto-redirect if already logged in (ensures logged-in users are not trapped on register screen)
  useEffect(() => {
    // If incoming OAuth or handshake tokens, allow their verification effect to run first
    if (
      searchParams?.get("tg_token") ||
      searchParams?.get("tiktok_token") ||
      searchParams?.get("hash") ||
      searchParams?.get("magic_token")
    ) {
      return;
    }

    const checkAndRedirect = () => {
      const existingUser = getEffectiveUser();
      if (existingUser) {
        const fromQuery = searchParams?.get("redirect") || searchParams?.get("return_to");
        const target =
          fromQuery && fromQuery.startsWith("/") && fromQuery !== "/login" && fromQuery !== "/register"
            ? fromQuery
            : "/account/profile";
        router.replace(target);
      }
    };

    checkAndRedirect();

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        checkAndRedirect();
      }
    });

    const handleSessionUpdate = () => checkAndRedirect();
    window.addEventListener("user_session_updated", handleSessionUpdate);

    return () => {
      unsub();
      window.removeEventListener("user_session_updated", handleSessionUpdate);
    };
  }, [searchParams, router]);

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

            navigateToDestination(200);
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
        navigateToDestination(0);
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

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    if (!cleanUsername) {
      setError("សូមបញ្ចូល Username ឱ្យបានត្រឹមត្រូវ (អក្សរ, លេខ, _ ឬ -)");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៨ ខ្ទង់ (Password must be at least 8 characters)");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("ពាក្យសម្ងាត់ និងការបញ្ជាក់ពាក្យសម្ងាត់មិនត្រូវគ្នាទេ (Passwords do not match)");
      setLoading(false);
      return;
    }

    setAuthOverlay({
      show: true,
      title: "កំពុងដំណើរការបង្កើតគណនី... / Creating Account...",
      subtitle: "សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងរៀបចំគណនី (Please wait, setting up your profile)...",
      isSuccess: false,
    });

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      const realDisplayName = `@${cleanUsername}`;
      try {
        await updateProfile(cred.user, { displayName: realDisplayName });
      } catch (e) {
        console.warn("Failed to set Firebase displayName:", e);
      }

      // Update backend user profile immediately with real username
      try {
        await api.put("/user/profile", {
          display_name: realDisplayName,
          username: cleanUsername,
          email: email.trim(),
        }, {
          headers: { "X-Firebase-UID": cred.user.uid }
        });
      } catch (e) {
        console.warn("Failed to sync profile to backend:", e);
      }

      // Store in local sessions so profile & navbar immediately display user's real username
      const userSession = {
        uid: cred.user.uid,
        firebase_uid: cred.user.uid,
        name: realDisplayName,
        username: cleanUsername,
        display_name: realDisplayName,
        email: email.trim(),
        provider: "email",
      };
      localStorage.setItem("user_session", JSON.stringify(userSession));
      localStorage.setItem("stech_user_session", JSON.stringify(userSession));
      window.dispatchEvent(new Event("user_session_updated"));

      // 1. Dispatch Warm Khmer Welcome Email with $5 WELCOME5 voucher
      try {
        await api.post("/user/send-welcome-email", {
          email: email.trim(),
          username: cleanUsername,
        }, {
          headers: { "X-Firebase-UID": cred.user.uid }
        });
      } catch (emailErr) {
        console.warn("Auto welcome email notice:", emailErr);
      }

      // 2. Create real welcome notification in database
      try {
        await api.post("/user/notifications", {
          title: `Welcome @${cleanUsername}! 🎉`,
          message: `សូមស្វាគមន៍មកកាន់ S Tech Store! កាដូ $5 Voucher (WELCOME5) និងរង្វាន់កាក់ប្រចាំថ្ងៃបានត្រៀមរួចជាស្រេចសម្រាប់អ្នក។`,
          type: "welcome",
        });
        useNotificationStore.getState().fetchNotifications();
      } catch (notifErr) {}

      setAuthOverlay({
        show: true,
        title: `បង្កើតគណនីបានជោគជ័យ! 🎉`,
        subtitle: `សូមស្វាគមន៍ @${cleanUsername}! កំពុងបញ្ជូនទៅកាន់ទំព័រដើម... (Redirecting...)`,
        isSuccess: true,
      });

      // 2 seconds delay as requested by user
      await new Promise((r) => setTimeout(r, 2000));
      navigateToDestination(0);
    } catch (err: any) {
      setError(toHumanKhmerError(err));
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
      navigateToDestination(0);
    } catch (err: any) {
      setError(toHumanKhmerError(err));
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
        navigateToDestination(0);
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
  const telegramPollTimeoutRef = useRef<any>(null);
  const isPollingCompletedRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const activeTokenRef = useRef<string | null>(null);

  const stopTelegramPolling = () => {
    if (telegramPollTimeoutRef.current) {
      clearTimeout(telegramPollTimeoutRef.current);
      telegramPollTimeoutRef.current = null;
    }
  };

  const startOrResumeTelegramPolling = (token: string, isReturning = false, deepLinkUrl?: string) => {
    if (isPollingCompletedRef.current) return;
    activeTokenRef.current = token;
    stopTelegramPolling();

    setAuthOverlay({
      show: true,
      title: isReturning
        ? "⚡ កំពុងផ្ទៀងផ្ទាត់ជាមួយ Telegram..."
        : "✈️ កំពុងផ្ទៀងផ្ទាត់ Telegram...",
      subtitle: isReturning
        ? "សូមរង់ចាំមួយភ្លែត កំពុងឆែកមើលស្ថានភាពជោគជ័យពី Telegram..."
        : 'សូមចុចប៊ូតុង "START" លើ Telegram របស់លោកអ្នក ដើម្បីចុះឈ្មោះភ្លាមៗ...',
      isSuccess: false,
      canCancel: true,
      deepLink: deepLinkUrl || "",
    });

    const checkStatus = async (): Promise<boolean> => {
      if (isPollingCompletedRef.current || isCheckingRef.current) return false;
      const targetToken = activeTokenRef.current || token;
      if (!targetToken) return false;

      isCheckingRef.current = true;
      try {
        const checkRes = await api.get(`/auth/telegram/handshake-check?token=${encodeURIComponent(targetToken)}`);
        if (checkRes.data?.success && checkRes.data?.completed && checkRes.data?.user) {
          isPollingCompletedRef.current = true;
          stopTelegramPolling();

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
            canCancel: false,
          });

          // Snappy entry transition directly to intended destination
          navigateToDestination(200);
          return true;
        } else if (checkRes.data?.status === "expired" || checkRes.data?.status === "rejected" || checkRes.data?.status === "conflict") {
          isPollingCompletedRef.current = true;
          stopTelegramPolling();
          localStorage.removeItem("stech_pending_tg_handshake");
          sessionStorage.removeItem("stech_pending_tg_handshake");
          const errMsg = checkRes.data?.error || "ការផ្ទៀងផ្ទាត់ Telegram ត្រូវបានបដិសេធ ឬផុតកំណត់។";
          setError(errMsg);
          setAuthOverlay({ show: false, title: "", subtitle: "" });
          return false;
        }
      } catch (e) {
      } finally {
        isCheckingRef.current = false;
      }
      return false;
    };

    // Immediate check on trigger (0ms delay)
    checkStatus();

    // Smart Adaptive Progressive Polling:
    // When tab is hidden (user switched to Telegram): 6000ms gentle check
    // When tab is foreground: 1.5s -> 2.5s -> 4s
    // When user switches back to browser tab: resumeIfPending checks IMMEDIATELY in 0ms!
    let attempts = 0;
    const scheduleNext = () => {
      if (isPollingCompletedRef.current) return;
      stopTelegramPolling();

      const isHidden = typeof document !== "undefined" && document.hidden;
      // Ultra-responsive polling: 1000ms if tab is backgrounded, 500ms-1200ms when visible
      const delay = isHidden 
        ? 1000 
        : attempts < 4 
          ? 500 
          : attempts < 12 
            ? 800 
            : 1200;

      telegramPollTimeoutRef.current = setTimeout(async () => {
        if (isPollingCompletedRef.current) return;
        attempts++;
        if (attempts > 80) { // ~1.5 - 2 minutes
          stopTelegramPolling();
          setAuthOverlay((prev) => ({
            ...prev,
            title: "⏱️ ការរង់ចាំលើសកំណត់ពេល",
            subtitle: "មិនទាន់ទទួលបានការបញ្ជាក់ពី Telegram នៅឡើយទេ។ សូមចុចប៊ូតុងខាងក្រោមដើម្បីព្យាយាមម្តងទៀត ឬត្រឡប់ក្រោយ។",
            canCancel: true,
          }));
          return;
        }

        const completed = await checkStatus();
        if (!completed && !isPollingCompletedRef.current) {
          scheduleNext();
        }
      }, delay);
    };

    scheduleNext();
  };

  // Mount & Visibility listener: When user returns to tab, INSTANTLY check in 0ms!
  useEffect(() => {
    const resumeIfPending = (isReturning = true) => {
      if (isPollingCompletedRef.current) return;
      if (isCheckingRef.current) return; // Prevent concurrent checks

      try {
        const saved = localStorage.getItem("stech_pending_tg_handshake") || sessionStorage.getItem("stech_pending_tg_handshake");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.token && (Date.now() - (parsed.createdAt || 0)) < 600000) {
            stopTelegramPolling();
            startOrResumeTelegramPolling(parsed.token, isReturning, parsed.deepLink);
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
    window.addEventListener("pageshow", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      stopTelegramPolling();
    };
  }, []);

  // ─── Trigger Real Telegram OAuth (1-Click App Handshake OR Widget) ───────────────
  const handleTelegramSignIn = async () => {
    setError("");
    const botId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID || "8689597792";
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "S_TECH_ASSISTANTBOT";
    const deviceName = getDeviceName();

    // Preserve intended destination page (e.g. /checkout, /cart)
    const returnTarget = searchParams?.get("redirect") || searchParams?.get("return_to") || "/";
    if (typeof window !== "undefined") {
      sessionStorage.setItem("stech_auth_redirect", returnTarget);
    }

    setAuthOverlay({
      show: true,
      title: "✈️ កំពុងភ្ជាប់ Telegram App...",
      subtitle: "សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងបើក Telegram ដើម្បី Confirm ចុះឈ្មោះ...",
      isSuccess: false,
      canCancel: true,
    });

    try {
      // 1. Initialize instant App Handshake directly in 0ms (No blocking ipify network call!)
      const res = await api.post("/auth/telegram/handshake-init", {});
      if (res.data?.success && res.data?.handshake_token) {
        const token = res.data.handshake_token;
        const deepLink = res.data.deep_link || `https://t.me/S_TECH_ASSISTANTBOT?start=${token}`;
        const appLink = res.data.app_link || `tg://resolve?domain=S_TECH_ASSISTANTBOT&start=${token}`;

        // Lock & persist pending handshake session so refresh or backgrounding NEVER loses state
        const pendingSession = {
          token,
          createdAt: Date.now(),
          deepLink,
        };
        localStorage.setItem("stech_pending_tg_handshake", JSON.stringify(pendingSession));
        sessionStorage.setItem("stech_pending_tg_handshake", JSON.stringify(pendingSession));

        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
        if (isMobile && appLink) {
          // Native tg:// URL scheme opens Telegram app directly without navigating current browser tab away!
          window.location.href = appLink;
        } else {
          // Desktop or fallback opens in new tab so original tab stays active and listening
          window.open(deepLink, "_blank");
        }

        startOrResumeTelegramPolling(token, false, deepLink);
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

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Username (Primary Account Identity) */}
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)", marginBottom: "8px" }}>
              <span>ឈ្មោះគណនី (Username) *</span>
              <span style={{ fontSize: "11px", color: "#60a5fa" }}>@username</span>
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontWeight: "bold", fontSize: "14px", pointerEvents: "none" }}>
                @
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                placeholder="ឧ. sokha_tech, rathana99"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  padding: "12px 16px 12px 34px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#c0392b")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "5px", marginInlineStart: "2px" }}>
              ប្រព័ន្ធ និង AI នឹងប្រើប្រាស់ឈ្មោះ @{username || "username"} នេះសម្រាប់ស្វាគមន៍លោកអ្នកផ្ទាល់
            </p>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)", marginBottom: "8px" }}>
              អាសយដ្ឋានអ៊ីមែល (Email) *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>
                ពាក្យសម្ងាត់ (Password) *
              </label>
              <span style={{ fontSize: "11px", color: password.length >= 8 ? "#4ade80" : "rgba(255,255,255,0.4)" }}>
                យ៉ាងតិច ៨ ខ្ទង់ {password.length > 0 && `(${password.length}/8)`}
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="បង្កើតពាក្យសម្ងាត់ (យ៉ាងតិច ៨ ខ្ទង់)"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${password && password.length < 8 ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "10px",
                  padding: "12px 48px 12px 16px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#c0392b")}
                onBlur={(e) => (e.target.style.borderColor = password && password.length < 8 ? "#ef4444" : "rgba(255,255,255,0.1)")}
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
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: "4px",
                }}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>
                បញ្ជាក់ពាក្យសម្ងាត់ (Confirm Password) *
              </label>
              {confirmPassword.length > 0 && (
                <span style={{ fontSize: "11px", color: confirmPassword === password ? "#4ade80" : "#ef4444" }}>
                  {confirmPassword === password ? "✓ ត្រូវគ្នា" : "✗ មិនទាន់ត្រូវគ្នា"}
                </span>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="វាយបញ្ជាក់ពាក្យសម្ងាត់ម្តងទៀត"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${confirmPassword && confirmPassword !== password ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "10px",
                  padding: "12px 48px 12px 16px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#c0392b")}
                onBlur={(e) => (e.target.style.borderColor = confirmPassword && confirmPassword !== password ? "#ef4444" : "rgba(255,255,255,0.1)")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: "4px",
                }}
              >
                {showConfirmPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {/* Reassuring badge */}
          <div
            style={{
              background: "rgba(34, 197, 94, 0.08)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              borderRadius: "10px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "16px", flexShrink: 0 }}>⚡</span>
            <span style={{ fontSize: "12px", color: "#4ade80", lineHeight: "1.4", fontWeight: "600" }}>
              ចុះឈ្មោះភ្លាម ចូលប្រើប្រាស់បានភ្លាមៗ ដោយមិនបាច់រង់ចាំលេខកូដ Confirm ពី Email ឡើយ!
            </span>
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
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" style={{ flexShrink: 0 }}>
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "32px" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#c0392b", fontWeight: "600", textDecoration: "none" }}>
            Sign in
          </Link>
        </p>

        <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "16px", lineHeight: "1.6" }}>
          By creating an account, you agree to S Tech Store's{" "}
          <Link href="/terms" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline" }}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline" }}>
            Privacy Policy
          </Link>.
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

            {authOverlay.deepLink && !authOverlay.isSuccess && (
              <a
                href={authOverlay.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  background: "rgba(0, 136, 204, 0.2)",
                  border: "1px solid rgba(0, 136, 204, 0.5)",
                  borderRadius: "12px",
                  color: "#38bdf8",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  marginBottom: "14px",
                }}
              >
                <span>🚀 បើក Telegram ដោយផ្ទាល់ (Open Bot)</span>
              </a>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", alignItems: "center" }}>
              <div style={{ padding: "6px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9999px", fontSize: "11px", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{authOverlay.isSuccess ? "🎉" : "⚡"}</span>
                <span>{authOverlay.isSuccess ? "ចុះឈ្មោះជោគជ័យ! កំពុងបញ្ជូន..." : "កំពុងដំណើរការផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិ"}</span>
              </div>

              {!authOverlay.isSuccess && (
                <div style={{ display: "flex", gap: "8px", marginTop: "4px", width: "100%" }}>
                  <button
                    type="button"
                    onClick={handleCancelAuth}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: "12px",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    ✕ បោះបង់ (Cancel)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleCancelAuth();
                      const target = getRedirectTarget();
                      router.push(target !== "/register" ? target : "/");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      background: "rgba(192, 57, 43, 0.2)",
                      border: "1px solid rgba(192, 57, 43, 0.4)",
                      borderRadius: "12px",
                      color: "#ff6b6b",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    ⬅️ ត្រឡប់ក្រោយ (Back)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
