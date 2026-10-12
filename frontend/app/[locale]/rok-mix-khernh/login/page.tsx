"use client";

import React, { useState } from "react";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { ShieldCheck, Shield, Lock, Mail, Eye, EyeOff, LogIn, ArrowRight, Store, Clock, AlertTriangle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showTelegramNotice, setShowTelegramNotice] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError(null);

    const loginEmail = (customEmail || email).trim();
    const loginPass = customPass || password;

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

      // Persist auth session
      if (typeof window !== "undefined") {
        localStorage.setItem("stech_admin_token", token);
        localStorage.setItem("stech_admin_user", JSON.stringify(user));
        document.cookie = `stech_admin_token=${token}; path=/; max-age=604800; SameSite=Lax`;
      }

      setSuccessMsg(`សូមស្វាគមន៍ ${user.name} • ${user.role.toUpperCase()}! កំពុងដំណើរការ...`);

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
            ប្រព័ន្ធគ្រប់គ្រងបុគ្គលិក និងរដ្ឋបាលហាង • Admin & Staff Management
          </p>
        </div>

        {/* Security Notice Pill */}
        <div className="mb-5 flex items-center justify-center gap-2 py-1.5 px-3 bg-[#8B1A1A]/10 border border-[#8B1A1A]/30 rounded-full text-[11px] text-[#ff8080] font-medium mx-auto w-fit">
          <ShieldCheck size={14} className="text-[#ff4d4d]" />
          <span>ច្រកចូលផ្លូវការបុគ្គលិក — គ្មានទម្រង់ចុះឈ្មោះសាធារណៈ • Internal Login Only</span>
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

            {/* Telegram Authenticator Direct Action */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => setShowTelegramNotice(true)}
                className="w-full py-2.5 px-3 bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/40 text-[#5bc0ee] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24-.03.4z" />
                </svg>
                <span>ចូលតាម Telegram Authenticator • Zero-Trust Pair</span>
              </button>
            </div>
          </form>

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
            ← ត្រឡប់ទៅកាន់ទំព័រដើមហាង • Back to Public Store
          </a>
        </div>
      </div>

      {/* Telegram Security Pairing Directive Modal */}
      {showTelegramNotice && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowTelegramNotice(false)}
        >
          <div
            className="bg-[#151518] border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#229ED9]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24-.03.4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Zero-Trust Telegram Security
                </h3>
                <p className="text-xs text-gray-400">
                  គោលការណ៍ផ្ទៀងផ្ទាត់ «Admin ពិត ១០០%»
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-300 bg-white/5 p-4 rounded-xl border border-white/10 mb-5">
              <div className="flex items-start gap-2">
                <span className="text-[#229ED9] font-bold">1.</span>
                <span>
                  Bot ផ្លូវការ <b>@s_tech_storeBot</b> ដាច់ខាតមិនបោះ URL ឬ Token ភ្ជាប់សម្ងាត់ក្នុង Personal Chat ឡើយ ដើម្បីការពារការក្លែងបន្លំ (Phishing)។
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#229ED9] font-bold">2.</span>
                <span>
                  លុះត្រាតែ Admin ចូលទៅក្នុង Website ផ្លូវការ (Admin Portal) រួចចុចភ្ជាប់ចេញពីក្នុង <b>Settings</b> ផ្ទាល់ ទើប Bot ជឿជាក់ ១០០% ថាជា <b>«Admin ពិត ១០០%»</b>។
                </span>
              </div>
              <div className="p-2.5 bg-black/40 rounded-lg border border-white/10 font-mono text-[11px] text-gray-400">
                <span className="text-gray-500 block text-[10px] uppercase font-sans">ឧទាហរណ៍ទីតាំងកំណត់ (Example URL Only):</span>
                https://www.s-tech-store.tech/rok-mix-khernh/settings
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href="https://t.me/s_tech_storeBot"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 bg-[#229ED9] hover:bg-[#1b87ba] text-white font-semibold rounded-xl text-xs text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <span>បើកមើល Bot (@s_tech_storeBot)</span>
              </a>
              <button
                type="button"
                onClick={() => setShowTelegramNotice(false)}
                className="py-2.5 px-4 bg-white/10 hover:bg-white/15 text-gray-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                យល់ព្រម (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
