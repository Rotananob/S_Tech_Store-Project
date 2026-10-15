"use client";

import React, { useState } from "react";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, LogIn, AlertTriangle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const loginEmail = email.trim();
    const loginPass = password;

    if (!loginEmail || !loginPass) {
      setError("សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់ • Please enter email & password");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/admin/login", {
        email: loginEmail,
        password: loginPass,
      });

      const { token, user } = res.data;

      // Persist auth session (90 days unbreakable signed session)
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("stech_admin_token", token);
          localStorage.setItem("stech_admin_user", JSON.stringify(user));
          sessionStorage.setItem("stech_admin_token", token);
          sessionStorage.setItem("stech_admin_user", JSON.stringify(user));
          document.cookie = `stech_admin_token=${token}; path=/; max-age=7776000; SameSite=Lax`;
        } catch (e) {}
      }

      const isOwner = user.role === "super_admin" || user.email === "nobrothana180703@gmail.com";
      const cleanName = !isOwner && user.name ? user.name.replace(/Super Admin/gi, "Admin") : (user.name || "Admin");
      const roleLabel = isOwner ? "OWNER" : user.role === "admin" ? "ADMIN" : "STAFF";
      setSuccessMsg(`សូមស្វាគមន៍ ${cleanName} • [${roleLabel}]! កំពុងចូលប្រព័ន្ធ...`);

      setTimeout(() => {
        router.push("/rok-mix-khernh");
      }, 1000);
    } catch (err: any) {
      console.error("Admin login error:", err);
      const msg = err.response?.data?.message || "ការចូលគណនីមិនត្រឹមត្រូវ សូមពិនិត្យឡើងវិញ • Invalid credentials";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-theme min-h-screen bg-[#0a0a0c] text-white flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
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
            ច្រកចូលសុវត្ថិភាពខ្ពស់ • Zero-Trust Operations Console
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#141417]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          
          {error && (
            <div className="mb-5 p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
              <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                គណនីអ៊ីមែលផ្លូវការ (Official Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@stechstore.com"
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
                  placeholder="••••••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A] focus:border-transparent transition-all"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#8B1A1A] to-[#b32424] hover:from-[#731515] hover:to-[#961e1e] active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#8B1A1A]/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-3"
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
        </div>

        {/* Back to Client Store Link */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 no-underline transition-colors"
          >
            ← ត្រឡប់ទៅកាន់ទំព័រដើមហាង • Back to Public Store
          </a>
        </div>
      </div>
    </div>
  );
}
