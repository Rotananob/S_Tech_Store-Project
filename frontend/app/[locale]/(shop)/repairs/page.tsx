"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import api from "@/lib/api";
import {
  Wrench,
  Search,
  CheckCircle2,
  Clock,
  Laptop,
  User,
  Phone,
  DollarSign,
  AlertTriangle,
  RotateCw,
  MessageCircle,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Check,
  Layers,
  ArrowRight
} from "lucide-react";

interface RepairTicket {
  id: number;
  ticket_code: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  device_name: string;
  issue_description?: string;
  technician_name: string;
  estimated_cost: number;
  status: string;
  status_kh: string;
  step_index: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const STEPS = [
  { key: "Pending Assessment", title: "ពិនិត្យរោគសញ្ញា", desc: "Received & Assessment", icon: Clock },
  { key: "In Progress", title: "កំពុងជួសជុល", desc: "In Repair / Diagnostics", icon: Wrench },
  { key: "Ready", title: "រួចរាល់អាចមកយក", desc: "Ready for Pickup", icon: CheckCircle2 },
  { key: "Completed", title: "បានប្រគល់ជូន", desc: "Delivered / Closed", icon: ShieldCheck },
];

function RepairTrackerContent() {
  const searchParams = useSearchParams();
  const initialTicket = searchParams.get("ticket") || searchParams.get("code") || searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialTicket);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [otherTickets, setOtherTickets] = useState<RepairTicket[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchTicket = async (codeToSearch: string) => {
    const q = codeToSearch.trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg(null);
    setHasSearched(true);

    try {
      const res = await api.get("/repairs/track", {
        params: { ticket: q }
      });

      if (res.data?.success && res.data?.found && res.data?.type === "repair") {
        setTicket(res.data.ticket);
        setOtherTickets(res.data.other_tickets || []);
      } else {
        setTicket(null);
        setErrorMsg(res.data?.message || `រកមិនឃើញសំបុត្រជួសជុលសម្រាប់ "${q}" ឡើយ។`);
      }
    } catch (err: any) {
      setTicket(null);
      if (err.response?.status === 404) {
        setErrorMsg(`រកមិនឃើញសំបុត្រជួសជុលសម្រាប់លេខកូដ "${q}" ឡើយ។ សូមពិនិត្យលេខកូដសំបុត្រ (ឧទាហរណ៍ REP-1007) ឬលេខទូរស័ព្ទរបស់អ្នកឡើងវិញ។`);
      } else {
        setErrorMsg("មានបញ្ហាក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ។ សូមព្យាយាមម្តងទៀត។");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTicket) {
      fetchTicket(initialTicket);
    }
  }, [initialTicket]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTicket(searchQuery);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Ready":
        return {
          bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
          dot: "bg-emerald-500",
          text: "រួចរាល់អាចមកទទួលយកបាន (Ready for Pickup)"
        };
      case "In Progress":
        return {
          bg: "bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400",
          dot: "bg-blue-500 animate-pulse",
          text: "កំពុងជួសជុល (In Progress)"
        };
      case "Completed":
        return {
          bg: "bg-gray-500/15 border-gray-500/30 text-gray-700 dark:text-gray-300",
          dot: "bg-gray-500",
          text: "បានប្រគល់ជូនរួចរាល់ (Completed)"
        };
      default:
        return {
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400",
          dot: "bg-amber-500 animate-pulse",
          text: "កំពុងពិនិត្យរោគសញ្ញា (Pending Assessment)"
        };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0c0e12] text-gray-900 dark:text-gray-100 py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Breadcrumb & Navigation ── */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">ទំព័រដើម</Link>
          <ChevronRight size={14} />
          <Link href="/services" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">សេវាកម្ម</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 dark:text-white font-semibold">តាមដានការជួសជុល (Repair Tracker)</span>
        </div>

        {/* ── Top Header Hero ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-[#151922] to-red-950 p-6 sm:p-10 text-white shadow-xl border border-white/10">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <Wrench size={14} className="text-red-400" />
              S Tech Lab & Repair Center
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              ពិនិត្យស្ថានភាពជួសជុលឧបករណ៍
            </h1>
            <p className="text-sm sm:text-base text-gray-300 max-w-2xl font-light">
              តាមដានដំណើរការត្រួតពិនិត្យ ជួសជុល និងកាលបរិច្ឆេទទទួលយកកុំព្យូទ័រ Laptop, Desktop ឬទូរស័ព្ទរបស់អ្នកផ្ទាល់ជាមួយជាងជំនាញ S Tech Store
            </p>

            {/* Quick search form */}
            <form onSubmit={handleSearchSubmit} className="pt-3 max-w-xl flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="វាយបញ្ចូលលេខ Ticket (ឧ. REP-1007) ឬលេខទូរស័ព្ទ..."
                  className="w-full pl-10 pr-4 py-3 bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all text-sm shrink-0 active:scale-95"
              >
                {loading ? (
                  <>
                    <RotateCw size={16} className="animate-spin" />
                    <span>កំពុងស្វែងរក...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>ស្វែងរក Ticket</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Decorative glowing gradient circle */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* ── Error Message ── */}
        {errorMsg && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" size={20} />
            <div className="space-y-1 text-sm">
              <p className="font-bold">មិនមានទិន្នន័យត្រូវបានរកឃើញ</p>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">{errorMsg}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 pt-1">
                គន្លឹះ៖ លោកអ្នកអាចស្វែងរកតាមលេខកូដសំបុត្រ (ដូចជា <strong>REP-1007</strong>) ឬលេខទូរស័ព្ទដែលបានចុះឈ្មោះទុកជាមួយហាង។
              </p>
            </div>
          </div>
        )}

        {/* ── Active Ticket Display ── */}
        {ticket && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#151922] rounded-3xl border border-gray-200/80 dark:border-white/10 p-6 sm:p-8 shadow-xl space-y-6">
              
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-white/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-mono font-bold text-sm tracking-wide border border-red-500/20">
                      #{ticket.ticket_code}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString("km-KH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Laptop className="text-red-600 dark:text-red-400 shrink-0" size={24} />
                    {ticket.device_name}
                  </h2>
                </div>

                {/* Status Badge */}
                <div>
                  {(() => {
                    const badge = getStatusBadge(ticket.status);
                    return (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs sm:text-sm font-bold ${badge.bg}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`} />
                        <span>{ticket.status_kh || badge.text}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 4-Step Visual Timeline */}
              <div className="py-4">
                <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-6">
                  ដំណើរការជួសជុលបច្ចុប្បន្ន (Repair Progress)
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                  {STEPS.map((s, idx) => {
                    const StepIcon = s.icon;
                    const isPassed = ticket.step_index >= idx;
                    const isCurrent = ticket.step_index === idx;

                    return (
                      <div
                        key={s.key}
                        className={`relative p-4 rounded-2xl border transition-all ${
                          isCurrent
                            ? "bg-red-50 dark:bg-red-950/30 border-red-500/40 ring-2 ring-red-500/20 shadow-md"
                            : isPassed
                            ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30 text-gray-900 dark:text-gray-200"
                            : "bg-gray-50/50 dark:bg-white/[0.02] border-gray-200/60 dark:border-white/5 opacity-60 text-gray-400"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isPassed
                                ? "bg-emerald-500 text-white shadow-sm"
                                : isCurrent
                                ? "bg-red-600 text-white shadow-md shadow-red-600/30 animate-pulse"
                                : "bg-gray-200 dark:bg-gray-800 text-gray-500"
                            }`}
                          >
                            {isPassed && !isCurrent ? <Check size={16} /> : <StepIcon size={16} />}
                          </div>
                          <span className="text-[11px] font-mono font-bold text-gray-400">
                            0{idx + 1}
                          </span>
                        </div>
                        <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-1">
                          {s.title}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {s.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                
                {/* Issue Description */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5 space-y-1.5">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-500" />
                    បញ្ហារាយការណ៍ (Reported Issue)
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {ticket.issue_description || "ពិនិត្យទូទៅ / មិនបានបញ្ជាក់"}
                  </p>
                </div>

                {/* Assigned Technician */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5 space-y-1.5">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <User size={14} className="text-blue-500" />
                    ជាងជំនាញទទួលបន្ទុក (Technician)
                  </span>
                  <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{ticket.technician_name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-normal">
                      S Tech Lab
                    </span>
                  </p>
                </div>

                {/* Estimated Cost */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5 space-y-1.5">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-500" />
                    តម្លៃជួសជុលប៉ាន់ស្មាន (Estimated Cost)
                  </span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    ${ticket.estimated_cost.toFixed(2)} USD
                  </p>
                </div>

                {/* Customer Info */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5 space-y-1.5">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Phone size={14} className="text-purple-500" />
                    ព័ត៌មានអតិថិជន (Customer)
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {ticket.customer_name} {ticket.customer_phone ? `(${ticket.customer_phone})` : ""}
                  </p>
                </div>

              </div>

              {/* Technician Notes if available */}
              {ticket.notes && (
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/30 space-y-1">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-300">
                    📝 កំណត់សម្គាល់បន្ថែមពីជាងជំនាញ៖
                  </p>
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                    {ticket.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <a
                  href="https://t.me/stech_support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  <MessageCircle size={16} />
                  <span>ទាក់ទងជាងបច្ចេកទេស (Telegram Support)</span>
                </a>

                <button
                  type="button"
                  onClick={() => fetchTicket(ticket.ticket_code)}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-800 dark:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <RotateCw size={16} className={loading ? "animate-spin" : ""} />
                  <span>ពិនិត្យស្ថានភាពឡើងវិញ (Refresh)</span>
                </button>
              </div>

            </div>

            {/* Other Tickets linked to this user/phone */}
            {otherTickets && otherTickets.length > 0 && (
              <div className="bg-white dark:bg-[#151922] rounded-3xl border border-gray-200/80 dark:border-white/10 p-6 shadow-md space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers size={16} className="text-red-500" />
                  <span>សំបុត្រជួសជុលផ្សេងទៀតរបស់អ្នក ({otherTickets.length})</span>
                </h3>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {otherTickets.map((ot) => (
                    <div
                      key={ot.id}
                      onClick={() => {
                        setSearchQuery(ot.ticket_code);
                        fetchTicket(ot.ticket_code);
                      }}
                      className="py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span>#{ot.ticket_code}</span>
                          <span className="text-xs font-normal text-gray-500">· {ot.device_name}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {ot.issue_description || "គ្មានការពិពណ៌នា"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 font-medium">
                          {ot.status}
                        </span>
                        <ArrowRight size={14} className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── Help & Contact Section ── */}
        <div className="bg-white dark:bg-[#151922] rounded-3xl border border-gray-200/80 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin size={18} className="text-red-500" />
            <span>ព័ត៌មានមជ្ឈមណ្ឌលជួសជុល S Tech Lab</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            រាល់ការជួសជុលទាំងអស់នៅ S Tech Store ត្រូវបានធ្វើឡើងដោយជាងជំនាញបច្ចេកទេសខ្ពស់ ជាមួយគ្រឿងបន្លាស់ស្តង់ដារ និងមានការធានាត្រឹមត្រូវ។ ប្រសិនបើលោកអ្នកមានចម្ងល់ ឬចង់សាកសួរតម្លៃបន្ថែម សូមទំនាក់ទំនងមកកាន់ក្រុមការងារយើងខ្ញុំ។
          </p>
          <div className="flex flex-wrap gap-4 pt-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <Phone size={15} className="text-red-500" />
              <span>+855 87 986 045 / +855 12 345 678</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-blue-500" />
              <span>ច័ន្ទ - អាទិត្យ: 8:30 ព្រឹក - 7:00 ល្ងាច</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function RepairTrackerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0c0e12]">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          <RotateCw size={18} className="animate-spin text-red-600" />
          <span>កំពុងដំណើរការ...</span>
        </div>
      </div>
    }>
      <RepairTrackerContent />
    </Suspense>
  );
}
