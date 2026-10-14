"use client";

import { Link } from "@/i18n/routing";
import { 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  Database, 
  Trash2, 
  FileText, 
  Mail, 
  Globe, 
  Phone, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  KeyRound
} from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0c0d12] text-gray-900 dark:text-gray-100 transition-colors">
      {/* ── Hero Header ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-16 sm:py-20 px-4 border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(#8B1A1A_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-500/30 text-rose-300 text-xs font-bold mb-4 tracking-wide uppercase">
            <ShieldCheck size={14} className="text-red-400" />
            <span>Official Policy • Cambodia</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3 font-sans">
            Privacy Policy
          </h1>
          <p className="text-base sm:text-lg text-gray-300 font-khmer font-medium mb-6">
            គោលនយោបាយឯកជនភាព និងសុវត្ថិភាពទិន្នន័យ
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 font-mono">
              Last Updated: October 2026
            </span>
            <span>•</span>
            <span className="font-mono">S Tech Store (s-tech-store.tech)</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} />
              <span>TikTok OAuth & App Compliant</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Main Content Container ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        {/* Concise Overview Statement */}
        <div className="bg-white dark:bg-[#131620] rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm leading-relaxed text-sm sm:text-base text-gray-600 dark:text-gray-300">
          <p>
            At <strong className="text-gray-900 dark:text-white font-bold">S Tech Store</strong> (
            <a href="https://www.s-tech-store.tech" className="text-red-600 dark:text-red-400 font-mono underline">
              www.s-tech-store.tech
            </a>
            ), we are committed to safeguarding your personal data and ensuring complete transparency. 
            This Privacy Policy clearly outlines what information we collect, how it is used to provide our retail and IT services in Cambodia, 
            and how users can easily manage or request the deletion of their data at any time.
          </p>
        </div>

        {/* Section 1: Information We Collect */}
        <section className="bg-white dark:bg-[#131620] rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                1. Information We Collect
              </h2>
              <p className="text-xs text-gray-500 font-khmer">ព័ត៌មានដែលយើងប្រមូល</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p>We only collect information necessary to facilitate your orders and secure your user account:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-gray-900 dark:text-white">Account Details:</strong> Name, email address, and phone number provided upon registration or checkout.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">Delivery Information:</strong> Physical delivery address (Phnom Penh or provincial destination) and delivery preferences.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">Transaction Records:</strong> Product order histories, warranty registrations, and payment transaction identifiers (we do not store personal credit card numbers or private bank credentials).
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">Customer Support:</strong> Messages or inquiries submitted via our contact form, official Telegram channel, or email.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Third-Party & Social Sign-In (TikTok Login Compliance) */}
        <section className="bg-white dark:bg-[#131620] rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-4 ring-1 ring-red-500/10">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                2. Third-Party Sign-In & Social Services (TikTok Login)
              </h2>
              <p className="text-xs text-gray-500 font-khmer">ការចូលប្រើប្រាស់តាមរយៈគណនីបណ្តាញសង្គម</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p>
              To offer a fast and seamless experience, S Tech Store supports third-party sign-in options, including 
              <strong className="text-gray-900 dark:text-white font-semibold"> TikTok Login</strong> and Google Sign-In.
            </p>

            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/10 space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Scope of Data Accessed via TikTok:</span>
              </h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-600 dark:text-gray-400 pl-1">
                <li><strong className="text-gray-800 dark:text-gray-200">Public Profile Information:</strong> Display name and profile avatar.</li>
                <li><strong className="text-gray-800 dark:text-gray-200">Unique Identifier:</strong> An anonymized TikTok User OpenID used solely to authenticate and bind your S Tech Store customer account.</li>
                <li><strong className="text-gray-800 dark:text-gray-200">Email Address:</strong> If explicitly authorized by you during the authorization prompt.</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>What We Do NOT Access:</strong> S Tech Store does <u>not</u> request or access your private TikTok videos, draft media, direct messages, followers, or sensitive credentials. Access is strictly limited to basic identity authentication.
              </span>
            </div>
          </div>
        </section>

        {/* Section 3: How We Use Your Information */}
        <section className="bg-white dark:bg-[#131620] rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                3. How We Use Your Information
              </h2>
              <p className="text-xs text-gray-500 font-khmer">របៀបដែលយើងប្រើប្រាស់ព័ត៌មាន</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>To create and manage your secure S Tech customer profile.</li>
              <li>To process and deliver orders to your specified address across all 25 provinces and cities in Cambodia.</li>
              <li>To provide order confirmation receipts, tracking updates, and warranty verification.</li>
              <li>To respond to customer service requests and hardware repair inquiries.</li>
              <li>To prevent fraudulent transactions and maintain system integrity.</li>
            </ul>
          </div>
        </section>

        {/* Section 4: Data Sharing & Protection */}
        <section className="bg-white dark:bg-[#131620] rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                4. Data Protection & Non-Disclosure
              </h2>
              <p className="text-xs text-gray-500 font-khmer">ការការពារ និងមិនលក់ទិន្នន័យ</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p>
              <strong className="text-gray-900 dark:text-white">We do not sell, rent, or trade your personal data.</strong> Your information is only shared with verified operational partners essential to completing your order:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm">
              <li><strong className="text-gray-800 dark:text-gray-200">Express Delivery Couriers:</strong> (e.g., Vireak Buntham, J&T Express) strictly for package dispatch.</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Official Brand Service Centers:</strong> (e.g., ASUS, Dell, MSI) strictly when processing authorized warranty claims on your behalf.</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Financial Gateways:</strong> Standard National Bank of Cambodia Bakong KHQR and ABA PAY protocols for encrypted payment verification.</li>
            </ul>
            <p className="text-xs text-gray-500 pt-1">
              All communications between your device and S Tech Store servers are encrypted using modern Transport Layer Security (TLS/HTTPS).
            </p>
          </div>
        </section>

        {/* Section 5: User Rights & Data Deletion (Crucial for TikTok App Audit) */}
        <section id="data-deletion" className="bg-white dark:bg-[#131620] rounded-2xl p-6 sm:p-8 border border-red-200 dark:border-red-950/50 shadow-md space-y-4 bg-gradient-to-b from-white to-red-50/20 dark:from-[#131620] dark:to-red-950/10">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                5. User Rights & Data Deletion Policy
              </h2>
              <p className="text-xs text-gray-500 font-khmer">សិទ្ធិរបស់អ្នកប្រើប្រាស់ និងការស្នើសុំលុបទិន្នន័យ</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p>
              In accordance with international privacy standards and TikTok developer platform guidelines, 
              users have the fundamental right to access, export, or permanently delete their personal information from our system.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Direct Email Request */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wide">
                  <Mail size={14} className="text-red-600 dark:text-red-400" />
                  <span>Option 1: Email Request (Direct)</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Send an email to{" "}
                  <a href="mailto:privacy@s-tech-store.tech" className="text-red-600 dark:text-red-400 font-mono font-bold underline">
                    privacy@s-tech-store.tech
                  </a>{" "}
                  with the subject line <em>"Request Data Deletion"</em>. Include your registered email or phone number.
                </p>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Account and OAuth tokens deleted within 24–48 hours.
                </div>
              </div>

              {/* Option B: Revoke via TikTok App */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wide">
                  <ExternalLink size={14} className="text-purple-600 dark:text-purple-400" />
                  <span>Option 2: Revoke via TikTok App</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Open your TikTok App &rarr; Go to <strong>Settings and Privacy</strong> &rarr; <strong>Security and Login</strong> &rarr; <strong>Manage App Permissions</strong> &rarr; Select <strong>S Tech Store</strong> &rarr; Tap <strong>Remove Access</strong>.
                </p>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Instantly disconnects your TikTok account.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Official Contact Information */}
        <section className="bg-gray-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-white/10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-rose-400 border border-white/10">
            <Mail size={24} />
          </div>

          <div>
            <h2 className="text-xl font-bold">Contact Our Privacy Team</h2>
            <p className="text-xs text-gray-400 mt-1">
              For any questions regarding this Privacy Policy or your personal data:
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="mailto:privacy@s-tech-store.tech"
              className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <Mail size={14} />
              <span>privacy@s-tech-store.tech</span>
            </a>

            <a
              href="mailto:support@s-tech-store.tech"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-2"
            >
              <Mail size={14} />
              <span>support@s-tech-store.tech</span>
            </a>

            <Link
              href="/contact"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-2"
            >
              <Globe size={14} />
              <span>Contact Page</span>
            </Link>
          </div>

          <p className="text-[11px] text-gray-500 pt-2 font-mono">
            S Tech Store • Phnom Penh, Kingdom of Cambodia • Support: +855 12 345 678
          </p>
        </section>
      </main>
    </div>
  );
}
