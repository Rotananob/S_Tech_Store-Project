"use client";

import { Link } from "@/i18n/routing";
import { 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard, 
  Truck, 
  RotateCcw, 
  Award, 
  UserCheck, 
  Scale, 
  Mail, 
  Globe 
} from "lucide-react";

const SECTIONS = [
  {
    icon: <CheckCircle2 size={18} className="text-emerald-500" />,
    title: "1. Acceptance of Terms",
    khmer: "ការយល់ព្រមលើលក្ខខណ្ឌ",
    content: (
      <p>
        By accessing or using the S Tech Store website (
        <a href="https://www.s-tech-store.tech" className="text-red-600 dark:text-red-400 font-mono underline">
          www.s-tech-store.tech
        </a>
        ), mobile interface, or purchasing products from us in Cambodia, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services.
      </p>
    ),
  },
  {
    icon: <CreditCard size={18} className="text-blue-500" />,
    title: "2. Products, Pricing & Payment",
    khmer: "ផលិតផល តម្លៃ និងការទូទាត់",
    content: (
      <div className="space-y-2">
        <p>
          All product specifications and prices are listed in USD. For payments made in Khmer Riel (KHR), conversions follow standard market banking exchange rates.
        </p>
        <p>
          We accept secure digital payments via National Bank of Cambodia Bakong KHQR, ABA PAY, and Cash on Delivery (COD) for eligible deliveries in Phnom Penh.
        </p>
      </div>
    ),
  },
  {
    icon: <Truck size={18} className="text-purple-500" />,
    title: "3. Shipping & Delivery",
    khmer: "ការដឹកជញ្ជូនទំនិញ",
    content: (
      <p>
        We dispatch orders across Phnom Penh and all 25 provinces in Cambodia via trusted local couriers (e.g., Vireak Buntham, J&T). Delivery times are estimated at 1–3 business days depending on destination.
      </p>
    ),
  },
  {
    icon: <RotateCcw size={18} className="text-amber-500" />,
    title: "4. Returns & Defective Items",
    khmer: "ការប្តូរទំនិញ និងទំនិញមានបញ្ហា",
    content: (
      <p>
        We accept returns or replacements for Dead On Arrival (DOA) or factory-defective hardware reported within our official return window. Opened products with customer-induced damage are not eligible for return.
      </p>
    ),
  },
  {
    icon: <Award size={18} className="text-rose-500" />,
    title: "5. Official Warranty Coverage",
    khmer: "ការធានាគុណភាពផ្លូវការ",
    content: (
      <p>
        Hardware components, laptops, and custom PC builds carry official warranty (ranging from 3 to 36 months depending on the manufacturer). Warranty covers manufacturing defects and does not cover physical drops, liquid damage, or unauthorized component tampering.
      </p>
    ),
  },
  {
    icon: <UserCheck size={18} className="text-indigo-500" />,
    title: "6. User Accounts & Third-Party Sign-In (TikTok Login)",
    khmer: "គណនីអ្នកប្រើប្រាស់ និងការចូលតាម TikTok",
    content: (
      <div className="space-y-2">
        <p>
          You may register directly or sign in using authorized third-party OAuth providers, including <strong>TikTok Login</strong> and Google.
        </p>
        <p>
          By connecting via TikTok Login, you grant S Tech Store permission to verify your identity using basic public profile information (Display Name, Avatar, and OpenID). You are responsible for maintaining the confidentiality of your session and devices.
        </p>
      </div>
    ),
  },
  {
    icon: <Scale size={18} className="text-gray-500" />,
    title: "7. Governing Law",
    khmer: "ច្បាប់គ្រប់គ្រង",
    content: (
      <p>
        These Terms of Service are governed by and construed in accordance with the applicable commercial laws of the Kingdom of Cambodia.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0c0d12] text-gray-900 dark:text-gray-100 transition-colors">
      {/* ── Hero Header ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-16 sm:py-20 px-4 border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(#8B1A1A_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-500/30 text-rose-300 text-xs font-bold mb-4 tracking-wide uppercase">
            <FileText size={14} className="text-red-400" />
            <span>Customer Agreement • Cambodia</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3 font-sans">
            Terms of Service
          </h1>
          <p className="text-base sm:text-lg text-gray-300 font-khmer font-medium mb-6">
            លក្ខខណ្ឌនៃសេវាកម្ម និងការបញ្ជាទិញ
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 font-mono">
              Effective Date: October 2026
            </span>
            <span>•</span>
            <span className="font-mono">S Tech Store (s-tech-store.tech)</span>
          </div>
        </div>
      </section>

      {/* ── Main Content Container ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
        <div className="bg-white dark:bg-[#131620] rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm leading-relaxed text-sm sm:text-base text-gray-600 dark:text-gray-300">
          <p>
            Welcome to <strong className="text-gray-900 dark:text-white font-bold">S Tech Store</strong>. 
            Please review these terms governing your purchases, warranties, and account usage on our platform. 
            We strive to provide genuine technology products with reliable support throughout Cambodia.
          </p>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((sec, idx) => (
            <div 
              key={idx}
              className="bg-white dark:bg-[#131620] rounded-2xl p-6 sm:p-7 border border-gray-200 dark:border-white/10 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                  {sec.icon}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    {sec.title}
                  </h2>
                  <p className="text-[11px] text-gray-500 font-khmer">{sec.khmer}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 pl-11 leading-relaxed">
                {sec.content}
              </div>
            </div>
          ))}
        </div>

        {/* Support Section */}
        <div className="bg-gray-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-white/10 text-center space-y-3">
          <h3 className="text-lg font-bold">Questions Regarding Our Terms?</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Our support team is available to assist you with order inquiries, product compatibility, and warranty terms.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a 
              href="mailto:support@s-tech-store.tech"
              className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <Mail size={14} />
              <span>support@s-tech-store.tech</span>
            </a>
            <Link
              href="/privacy"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-2"
            >
              <ShieldCheck size={14} />
              <span>Privacy Policy</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
