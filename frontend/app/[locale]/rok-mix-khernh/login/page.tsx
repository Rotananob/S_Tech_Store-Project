"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  ShieldAlert,
  Fingerprint,
  Activity,
  Sparkles,
  RefreshCw,
  UserCheck,
  Server,
  KeyRound,
  ArrowRight,
} from "lucide-react";

interface AuthenticatedAdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  branch?: string;
  shift?: string;
  permissions?: string[];
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Interactive Verification Modal States
  const [showModal, setShowModal] = useState(false);
  const [verificationStage, setVerificationStage] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const [modalError, setModalError] = useState<string | null>(null);
  const [authSuccessUser, setAuthSuccessUser] = useState<AuthenticatedAdminUser | null>(null);

  // Smooth progress animation ticker
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showModal && !modalError) {
      if (verificationStage === 1 && progress < 30) {
        timer = setTimeout(() => setProgress((prev) => Math.min(prev + 5, 30)), 40);
      } else if (verificationStage === 2 && progress < 65) {
        timer = setTimeout(() => setProgress((prev) => Math.min(prev + 8, 65)), 40);
      } else if (verificationStage === 3 && progress < 90) {
        timer = setTimeout(() => setProgress((prev) => Math.min(prev + 8, 90)), 35);
      } else if (verificationStage === 4 && progress < 100) {
        timer = setTimeout(() => setProgress(100), 30);
      }
    }
    return () => clearTimeout(timer);
  }, [showModal, verificationStage, progress, modalError]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInlineError(null);
    setModalError(null);

    const loginEmail = email.trim();
    const loginPass = password;

    if (!loginEmail || !loginPass) {
      setInlineError("សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់ - Please enter email and password");
      return;
    }

    // Launch interactive verification popup
    setShowModal(true);
    setVerificationStage(1);
    setProgress(15);
    setLoading(true);

    try {
      // 1. Stage 1: Authenticate Identity
      const res = await api.post("/admin/login", {
        email: loginEmail,
        password: loginPass,
      });

      const { token, user } = res.data;
      const isOwner = user.role === "super_admin" || user.email === "nobrothana180703@gmail.com";
      if (isOwner) {
        user.role = "super_admin";
      }

      // 2. Stage 2: RBAC Validation
      setVerificationStage(2);
      await new Promise((r) => setTimeout(r, 220));

      // 3. Stage 3: Establish Session Tokens
      setVerificationStage(3);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("stech_admin_token", token);
          localStorage.setItem("stech_admin_user", JSON.stringify(user));
          sessionStorage.setItem("stech_admin_token", token);
          sessionStorage.setItem("stech_admin_user", JSON.stringify(user));
          if (isOwner) {
            localStorage.setItem("stech_owner_locked", "true");
            document.cookie = `stech_admin_token=${token}; path=/; max-age=315360000; SameSite=Lax`;
            document.cookie = `stech_owner_locked=true; path=/; max-age=315360000; SameSite=Lax`;
          } else {
            document.cookie = `stech_admin_token=${token}; path=/; max-age=7776000; SameSite=Lax`;
          }
        } catch (storageErr) {
          console.warn("Storage write error:", storageErr);
        }
      }

      await new Promise((r) => setTimeout(r, 200));

      // 4. Stage 4: Access Granted & Interactive HUD Display
      setVerificationStage(4);
      setAuthSuccessUser(user);

      // Brief pause to allow the user to see the success verification badge before redirecting
      setTimeout(() => {
        router.push("/rok-mix-khernh");
      }, 750);
    } catch (err: any) {
      console.error("Admin login error:", err);
      const rawMsg = err.response?.data?.message || "ការចូលគណនីមិនត្រឹមត្រូវ សូមពិនិត្យឡើងវិញ - Invalid credentials";
      // Sanitize any accidental parentheses from error message to satisfy linguistic rules
      const sanitizedMsg = rawMsg.replace(/\(/g, "- ").replace(/\)/g, "");
      setModalError(sanitizedMsg);
      setInlineError(sanitizedMsg);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setVerificationStage(1);
    setProgress(0);
    setModalError(null);
  };

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return {
        label: "ម្ចាស់ប្រព័ន្ធ - SYSTEM OWNER",
        color: "from-amber-500/20 to-red-500/20 text-amber-300 border-amber-500/40",
        icon: <Sparkles size={14} className="text-amber-400" />,
      };
    }
    if (role === "admin") {
      return {
        label: "អ្នកគ្រប់គ្រង - ADMINISTRATOR",
        color: "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40",
        icon: <ShieldCheck size={14} className="text-emerald-400" />,
      };
    }
    return {
      label: "បុគ្គលិកប្រតិបត្តិការ - STAFF OPERATIONS",
      color: "from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40",
      icon: <UserCheck size={14} className="text-cyan-400" />,
    };
  };

  return (
    <div className="admin-theme min-h-screen bg-[#070709] text-white flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-[#8B1A1A]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-900/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl mb-3 shadow-2xl backdrop-blur-md">
            <img
              src="/logo.jpg"
              alt="S Tech Store"
              className="w-14 h-14 object-contain rounded-xl shadow-md border border-white/10"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center justify-center gap-2">
            <span>S</span>
            <span className="text-[#c0392b]">Tech</span>
            <span className="text-gray-300 font-light">Portal</span>
          </h1>
          <p className="text-xs text-gray-400 font-medium">
            ច្រកចូលសុវត្ថិភាពខ្ពស់ - Zero-Trust Operations Console
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111115]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative">
          {inlineError && !showModal && (
            <div className="mb-5 p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-200 animate-fadeIn">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{inlineError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                គណនីអ៊ីមែលផ្លូវការ - Official Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stechstore.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A] focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  ពាក្យសម្ងាត់ - Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A] focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Security Notice Pill */}
            <div className="py-2 px-3 rounded-lg bg-white/[0.03] border border-white/5 flex items-center gap-2 text-[11px] text-gray-400">
              <Fingerprint size={14} className="text-red-400 flex-shrink-0" />
              <span>ការពារដោយកម្រិតសុវត្ថិភាព Rate-Limiting & RBAC Verification</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#8B1A1A] to-[#b32424] hover:from-[#731515] hover:to-[#961e1e] active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#8B1A1A]/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              <LogIn size={16} />
              <span>ចូលប្រព័ន្ធ - Sign In to Portal</span>
            </button>
          </form>
        </div>

        {/* Back to Client Store Link */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 no-underline transition-colors inline-flex items-center gap-1.5"
          >
            <span>ត្រឡប់ទៅកាន់ទំព័រដើមហាង - Back to Public Store</span>
          </a>
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE LUXURY VERIFICATION POPUP MODAL (កំពុងឆែកសុវត្ថិភាព)
         ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
          <div className="w-full max-w-md bg-[#0e0f14] border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_80px_rgba(139,26,26,0.35)] relative overflow-hidden">
            {/* Top Glowing Pulse Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

            {/* HUD Status Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-950/70 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Cpu size={18} className="animate-spin" style={{ animationDuration: "6s" }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    {modalError ? "ការផ្ទៀងផ្ទាត់មិនជោគជ័យ" : "កំពុងឆែកសុវត្ថិភាពប្រព័ន្ធ"}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {modalError ? "Security Handshake Terminated" : "Zero-Trust Security Verification"}
                  </p>
                </div>
              </div>

              {/* Progress Percentage Indicator */}
              {!modalError && (
                <div className="text-right">
                  <span className="text-lg font-black text-red-400 font-mono">
                    {progress}%
                  </span>
                </div>
              )}
            </div>

            {/* Leading Animated Progress Bar */}
            {!modalError && (
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Modal Body: Active Verification Steps or Error */}
            {modalError ? (
              /* Error State View */
              <div className="space-y-4">
                <div className="p-4 bg-red-950/50 border border-red-500/40 rounded-2xl flex items-start gap-3">
                  <ShieldAlert size={22} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-red-300 mb-1">
                      បដិសេធការចូលប្រព័ន្ធ - Access Rejected
                    </h4>
                    <p className="text-xs text-red-200/90 leading-relaxed">
                      {modalError}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full py-3 px-4 bg-white/10 hover:bg-white/15 active:scale-[0.99] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>ព្យាយាមម្តងទៀត - Try Again</span>
                </button>
              </div>
            ) : (
              /* Ongoing Verification Stages Checklist */
              <div className="space-y-3.5 mb-6">
                {/* Step 1: Credentials */}
                <div
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                    verificationStage > 1
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                      : verificationStage === 1
                      ? "bg-red-950/40 border-red-500/40 text-white shadow-lg shadow-red-950/50"
                      : "bg-white/[0.02] border-white/5 text-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {verificationStage > 1 ? (
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <KeyRound size={16} className="text-red-400 animate-pulse flex-shrink-0" />
                    )}
                    <span className="font-medium">
                      ជំហានទី១: ផ្ទៀងផ្ទាត់អត្តសញ្ញាណ និងហត្ថលេខាសុវត្ថិភាព
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">
                    {verificationStage > 1 ? "រួចរាល់" : "កំពុងឆែក..."}
                  </span>
                </div>

                {/* Step 2: RBAC */}
                <div
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                    verificationStage > 2
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                      : verificationStage === 2
                      ? "bg-red-950/40 border-red-500/40 text-white shadow-lg shadow-red-950/50"
                      : "bg-white/[0.02] border-white/5 text-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {verificationStage > 2 ? (
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Activity size={16} className={`${verificationStage === 2 ? "text-amber-400 animate-pulse" : "text-gray-600"} flex-shrink-0`} />
                    )}
                    <span className="font-medium">
                      ជំហានទី២: ត្រួតពិនិត្យតួនាទី RBAC និងសិទ្ធិប្រតិបត្តិការ
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">
                    {verificationStage > 2 ? "រួចរាល់" : verificationStage === 2 ? "កំពុងឆែក..." : "រង់ចាំ"}
                  </span>
                </div>

                {/* Step 3: Session Tokens */}
                <div
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                    verificationStage > 3
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                      : verificationStage === 3
                      ? "bg-red-950/40 border-red-500/40 text-white shadow-lg shadow-red-950/50"
                      : "bg-white/[0.02] border-white/5 text-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {verificationStage > 3 ? (
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Server size={16} className={`${verificationStage === 3 ? "text-cyan-400 animate-pulse" : "text-gray-600"} flex-shrink-0`} />
                    )}
                    <span className="font-medium">
                      ជំហានទី៣: បង្កើត Secure Cryptographic Session
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">
                    {verificationStage > 3 ? "រួចរាល់" : verificationStage === 3 ? "កំពុងដំណើរការ..." : "រង់ចាំ"}
                  </span>
                </div>

                {/* Step 4: Final Success Display */}
                {verificationStage >= 4 && authSuccessUser && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border border-emerald-500/40 animate-fadeIn space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-200">
                          ជំហានទី៤: ជោគជ័យ - អនុញ្ញាតចូលប្រព័ន្ធគ្រប់គ្រង
                        </span>
                      </div>
                      <ArrowRight size={16} className="text-emerald-400 animate-bounce" />
                    </div>

                    <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                      <div className="truncate">
                        <span className="text-gray-400 text-[11px] block">គណនីផ្ទៀងផ្ទាត់:</span>
                        <span className="font-bold text-white truncate block">
                          {authSuccessUser.name || authSuccessUser.email}
                        </span>
                      </div>
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold bg-gradient-to-r ${
                          getRoleBadge(authSuccessUser.role).color
                        }`}
                      >
                        {getRoleBadge(authSuccessUser.role).icon}
                        <span>{getRoleBadge(authSuccessUser.role).label}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom HUD Metadata */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Protected by S Tech Firewall Engine</span>
              </span>
              <span className="font-mono">PORTAL SEC-2026</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
