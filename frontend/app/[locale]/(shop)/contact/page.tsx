"use client";
import { useState } from "react";
import { 
  Phone, Mail, MapPin, Clock, Send, CheckCircle2, 
  MessageSquare, Sparkles, ExternalLink, HelpCircle 
} from "lucide-react";
import { Link } from "@/i18n/routing";

const TOPICS = ["General Inquiry", "Order Support", "Repair & Services", "Product Question", "Wholesale / Business", "Other"];

const CONTACT_CARDS = [
  {
    icon: <Phone size={22} />,
    label: "Phone / Telegram",
    value: "+855 12 345 678",
    sub: "Mon–Sat, 8AM – 6PM",
    colorClass: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/40",
    href: "tel:+85512345678",
  },
  {
    icon: <Mail size={22} />,
    label: "Email",
    value: "support@stechstore.com.kh",
    sub: "We reply within 24 hours",
    colorClass: "bg-red-50 text-[#8B1A1A] dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40",
    href: "mailto:support@stechstore.com.kh",
  },
  {
    icon: <MapPin size={22} />,
    label: "Store Address",
    value: "St. 271, Phnom Penh",
    sub: "Near Russian Market",
    colorClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40",
    href: "https://maps.google.com",
  },
  {
    icon: <Clock size={22} />,
    label: "Business Hours",
    value: "Mon – Sat: 8AM – 6PM",
    sub: "Sunday: 9AM – 4PM",
    colorClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40",
    href: null,
  },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) { alert("Please fill in all required fields."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  };

  return (
    <div className="bg-gray-50 dark:bg-[#0c0e12] min-h-screen text-gray-900 dark:text-gray-100 transition-colors pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-[#12151e] border-b border-gray-200 dark:border-white/10 py-8 lg:py-10">
        <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A] animate-pulse" />
            <span className="text-xs font-bold text-[#8B1A1A] dark:text-red-400 uppercase tracking-wider">Official Tech Support</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Contact Us <span className="text-[#8B1A1A] dark:text-red-500">.</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl font-khmer">
            យើងត្រៀមខ្លួនជួយលោកអ្នកជានិច្ច។ សូមទាក់ទងមកយើងតាមរយៈទម្រង់ខាងក្រោម ឬបណ្តាញទំនាក់ទំនងផ្ទាល់
          </p>
        </div>
      </div>

      <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Contact Cards (4-Column on Desktop) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {CONTACT_CARDS.map(card => (
            <div 
              key={card.label}
              onClick={() => card.href && window.open(card.href, "_blank")}
              className={`p-5 rounded-3xl bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
                card.href ? "cursor-pointer group hover:-translate-y-1 hover:border-[#8B1A1A]/40" : ""
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${card.colorClass} shadow-2xs`}>
                {card.icon}
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{card.label}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-0.5 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 transition-colors font-mono">{card.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Grid (2-Column Desktop: Left Form, Right Map & Social) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-8 items-start">

          {/* Contact Form */}
          <div className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1">
              ផ្ញើសារមកកាន់យើង • Send Us a Message
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Fill out the form and our technical team will get back to you shortly.
            </p>

            {sent ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Message Sent!</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Thank you, <strong>{name}</strong>! We'll reply to <strong className="font-mono">{email}</strong> within 24 hours.
                </p>
                <button 
                  onClick={() => { setSent(false); setName(""); setEmail(""); setPhone(""); setTopic(""); setMessage(""); }}
                  className="px-6 py-2.5 rounded-xl bg-[#8B1A1A] text-white text-xs font-bold cursor-pointer border-none shadow-sm hover:bg-[#6b1010] transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
                    <input 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Sok San" 
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Email Address *</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="you@email.com" 
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A]" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Phone (optional)</label>
                    <input 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="012 345 678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A] font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Topic</label>
                    <select 
                      value={topic} 
                      onChange={e => setTopic(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A]"
                    >
                      <option value="">Select topic...</option>
                      {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Message *</label>
                  <textarea 
                    value={message} 
                    onChange={e => setMessage(e.target.value)} 
                    rows={5} 
                    required
                    placeholder="Write your question, inquiry or request here..."
                    className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A] resize-none" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6b1010] hover:to-[#8B1A1A] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>{loading ? "Sending Message..." : "Send Message"}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Sidebar: Location & Quick Channels */}
          <div className="space-y-6">

            {/* Map Card */}
            <div className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-xs">
              <div className="bg-gradient-to-br from-red-950/20 via-gray-100 to-gray-200 dark:from-[#1b212f] dark:to-[#12151e] h-48 relative flex items-center justify-center p-4">
                <div className="text-center z-10">
                  <div className="w-12 h-12 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center mx-auto mb-2 shadow-lg ring-4 ring-white/50 dark:ring-black/40">
                    <MapPin size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">S Tech Store</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Street 271, Phnom Penh, Cambodia</p>
                </div>
              </div>
              <div className="p-4">
                <a 
                  href="https://maps.google.com/?q=S+Tech+Store+Phnom+Penh" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold text-[#8B1A1A] dark:text-red-400 transition-colors border border-gray-200/80 dark:border-white/10 no-underline shadow-2xs"
                >
                  <ExternalLink size={14} />
                  <span>Open in Google Maps</span>
                </a>
              </div>
            </div>

            {/* Quick Contact Links */}
            <div className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Direct Contact Channels
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: "Telegram Assistant Bot", handle: "@S_TECH_ASSISTANTBOT", color: "text-sky-500", href: "https://t.me/S_TECH_ASSISTANTBOT" },
                  { label: "Facebook Page", handle: "S Tech Store Cambodia", color: "text-blue-600", href: "https://facebook.com" },
                  { label: "Direct Phone Call", handle: "+855 12 345 678", color: "text-emerald-600", href: "tel:+85512345678" },
                ].map(s => (
                  <a 
                    key={s.label} 
                    href={s.href} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all no-underline group"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 transition-colors">{s.label}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{s.handle}</p>
                    </div>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white transition-colors" />
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
