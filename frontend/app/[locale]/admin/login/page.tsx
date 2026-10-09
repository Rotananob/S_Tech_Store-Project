"use client";

import React, { useState } from "react";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, LogIn, ArrowRight, Store, Clock, AlertTriangle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError(null);

    const loginEmail = (customEmail || email).trim();
    const loginPass = customPass || password;

    if (!loginEmail || !loginPass) {
      setError("សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់ (Please enter email & password).");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/admin/login", {
        email: loginEmail,
        password: loginPass,
      });

      const { token, user } = res.data;

      // Persist auth session
      if (typeof window !== "undefined") {
        localStorage.setItem("stech_admin_token", token);
        localStorage.setItem("stech_admin_user", JSON.stringify(user));
        document.cookie = `stech_admin_token=${token}; path=/; max-age=604800; SameSite=Lax`;
      }

      setSuccessMsg(`សូមស្វាគមន៍ ${user.name} (${user.role.toUpperCase()})! កំពុងដំណើរការ...`);

      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    } catch (err: any) {
      console.error("Admin login error:", err);
      const msg = err.response?.data?.message || "ការចូលគណនីមិនត្រឹមត្រូវ សូមពិនិត្យឡើងវិញ (Invalid credentials).";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    handleLogin(undefined, targetEmail, targetPass);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#8B1A1A]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-900/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl mb-3 shadow-xl backdrop-blur-md">
            <img 
              src="/logo.jpg" 
              alt="S Tech Store" 
              className="w-14 h-14 object-contain rounded-xl shadow-md border border-white/10" 
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">
            S <span className="text-[#c0392b]">Tech</span> Portal
          </h1>
          <p className="text-xs text-gray-400">
            ប្រព័ន្ធគ្រប់គ្រងបុគ្គលិក និងរដ្ឋបាលហាង (Admin & Staff Management)
          </p>
        </div>

        {/* Security Notice Pill */}
        <div className="mb-5 flex items-center justify-center gap-2 py-1.5 px-3 bg-[#8B1A1A]/10 border border-[#8B1A1A]/30 rounded-full text-[11px] text-[#ff8080] font-medium mx-auto w-fit">
          <ShieldCheck size={14} className="text-[#ff4d4d]" />
          <span>ច្រកចូលផ្លូវការបុគ្គលិក — គ្មានទម្រង់ចុះឈ្មោះសាធារណៈ (Internal Login Only)</span>
        </div>

        {/* Login Card */}
        <div className="bg-[#141417]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
          
          {error && (
            <div className="mb-5 p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-green-950/60 border border-green-500/40 rounded-xl flex items-start gap-2.5 text-xs text-green-200">
              <ShieldCheck size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                គណនីអ៊ីមែល (Work Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stechstore.com ឬ staff@stechstore.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  ពាក្យសម្ងាត់ (Password)
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
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#8B1A1A] to-[#b32424] hover:from-[#731515] hover:to-[#961e1e] active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#8B1A1A]/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  <span>ចូលប្រព័ន្ធ (Sign In to Portal)</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Access Badges (For instant 1-click test) */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">
              គណនីសាកល្បងរហ័ស (Quick Login Accounts)
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickFill("admin@stechstore.com", "STech#Admin_98X$kQ29@2026!Sec")}
                className="p-2.5 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-red-400 flex items-center justify-between">
                  <span>👑 Admin Account</span>
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 truncate">admin@stechstore.com</div>
                <div className="text-[9px] text-gray-500 mt-0.5">Ultra Secure • Full Access</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("staff@stechstore.com", "STech#Staff_74Wp@81K!2026$Shift")}
                className="p-2.5 rounded-xl bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/30 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-blue-400 flex items-center justify-between">
                  <span>💼 Staff Account</span>
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 truncate">staff@stechstore.com</div>
                <div className="text-[9px] text-gray-500 mt-0.5">Ultra Secure • Staff Ops</div>
              </button>
            </div>
          </div>

          {/* Security Features Info */}
          <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <Store size={12} className="text-gray-400" />
              <span>Phnom Penh Main Branch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-gray-400" />
              <span>24/7 Shift Automation</span>
            </div>
          </div>
        </div>

        {/* Back to Client Store Link */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 no-underline transition-colors"
          >
            ← ត្រឡប់ទៅកាន់ទំព័រដើមហាង (Back to Public Store)
          </a>
        </div>
      </div>
    </div>
  );
}
