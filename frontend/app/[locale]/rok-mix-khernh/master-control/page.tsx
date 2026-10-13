"use client";

import React, { useState, useEffect } from "react";
import GrandMasterCommandConsole from "@/components/admin/GrandMasterCommandConsole";
import { 
  Crown, 
  ShieldCheck, 
  Lock, 
  Server, 
  Cpu, 
  Database, 
  Terminal, 
  History, 
  Radio, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Flame,
  UserCheck,
  Building2,
  CalendarCheck
} from "lucide-react";
import { Link } from "@/i18n/routing";

export default function MasterControlPage() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      try {
        const u = localStorage.getItem("stech_admin_user");
        if (u) setUser(JSON.parse(u));
      } catch (e) {}
    }
  }, []);

  const isSuperAdmin = user?.role === "super_admin" || user?.email === "nobrothana180703@gmail.com";

  if (!mounted) {
    return (
      <div className="p-16 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="font-sans space-y-7 max-w-7xl mx-auto pb-12">
      
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-xl">
              <Crown size={18} />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-700">
              Grand Master Control Console
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              isSuperAdmin 
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                : "bg-gray-100 text-gray-700 border border-gray-200"
            }`}>
              {isSuperAdmin ? "Owner Verified" : "Admin View-Only"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight m-0">
            មហាសិទ្ធិម្ចាស់ប្រព័ន្ធ • Master Operations
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            ផ្ទាំងបញ្ជាកំពូលសម្រាប់គ្រប់គ្រង Store Infrastructure, Maintenance Mode, Killswitches, 
            និងសិទ្ធិបុគ្គលិកទូទាំងប្រព័ន្ធ S Tech Store។
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/rok-mix-khernh"
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all no-underline flex items-center gap-1.5"
          >
            <span>ត្រឡប់ទៅ Dashboard</span>
          </Link>
          <Link
            href="/rok-mix-khernh/staff"
            className="px-4 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6b1111] text-white text-xs font-bold transition-all no-underline flex items-center gap-1.5 shadow-sm"
          >
            <UserCheck size={14} />
            <span>គ្រប់គ្រងបុគ្គលិក</span>
          </Link>
        </div>
      </div>

      {/* ── THE GRAND MASTER COMMAND CONSOLE WIDGET ── */}
      <GrandMasterCommandConsole isSuperAdminProp={isSuperAdmin} />

      {/* ── ROLE PRIVILEGE COMPARISON MATRIX ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-xs space-y-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 m-0 flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#8B1A1A]" />
            <span>តារាងបែងចែកសិទ្ធិ និងមហាសិទ្ធិប្រព័ន្ធ (Role & Permission Matrix)</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ការបែងចែកកម្រិតសិទ្ធិយ៉ាងតឹងរ៉ឹងរវាង ម្ចាស់ប្រព័ន្ធ (Super Admin), Administrator, និងបុគ្គលិកទូទៅ (Staff)។
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase font-black tracking-wider text-[10px] border-b border-gray-200">
              <tr>
                <th className="p-3.5">មុខងារ / ប្រតិបត្តិការ (Operations)</th>
                <th className="p-3.5 text-center text-amber-700 bg-amber-50/50">
                  👑 ម្ចាស់ប្រព័ន្ធ (Super Admin)
                </th>
                <th className="p-3.5 text-center text-blue-700 bg-blue-50/30">
                  🛡️ Administrator
                </th>
                <th className="p-3.5 text-center text-gray-600">
                  👥 បុគ្គលិក (Staff)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
              <tr>
                <td className="p-3.5 font-bold">បិទ/បើក Store Maintenance Mode (Lockdown)</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-amber-50/20">✅ មហាសិទ្ធិពេញលេញ</td>
                <td className="p-3.5 text-center text-gray-400 bg-blue-50/10">🔒 បានត្រឹមមើល (View-Only)</td>
                <td className="p-3.5 text-center text-rose-500">❌ គ្មានសិទ្ធិ</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold">កម្ទេច Global System Cache & Redis Storage</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-amber-50/20">✅ មហាសិទ្ធិពេញលេញ</td>
                <td className="p-3.5 text-center text-gray-400 bg-blue-50/10">🔒 បានត្រឹមមើល (View-Only)</td>
                <td className="p-3.5 text-center text-rose-500">❌ គ្មានសិទ្ធិ</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold">បង្កកប្រតិបត្តិការហិរញ្ញវត្ថុបន្ទាន់ (Financial Freeze)</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-amber-50/20">✅ មហាសិទ្ធិពេញលេញ</td>
                <td className="p-3.5 text-center text-gray-400 bg-blue-50/10">🔒 បានត្រឹមមើល (View-Only)</td>
                <td className="p-3.5 text-center text-rose-500">❌ គ្មានសិទ្ធិ</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold">ទាញយក Live Database Snapshot & Cloud Backup</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-amber-50/20">✅ មហាសិទ្ធិពេញលេញ</td>
                <td className="p-3.5 text-center text-gray-400 bg-blue-50/10">🔒 បានត្រឹមមើល (View-Only)</td>
                <td className="p-3.5 text-center text-rose-500">❌ គ្មានសិទ្ធិ</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold">កាត់ផ្តាច់ Session Login បុគ្គលិកទាំងអស់ (Revoke Tokens)</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-amber-50/20">✅ មហាសិទ្ធិពេញលេញ</td>
                <td className="p-3.5 text-center text-gray-400 bg-blue-50/10">🔒 បានត្រឹមមើល (View-Only)</td>
                <td className="p-3.5 text-center text-rose-500">❌ គ្មានសិទ្ធិ</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold">កែប្រែអត្រាពិន្ទុ Coin Reward Promotion</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-amber-50/20">✅ មហាសិទ្ធិពេញលេញ</td>
                <td className="p-3.5 text-center text-gray-400 bg-blue-50/10">🔒 បានត្រឹមមើល (View-Only)</td>
                <td className="p-3.5 text-center text-rose-500">❌ គ្មានសិទ្ធិ</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold">គ្រប់គ្រងការបញ្ជាទិញ (Orders & Shipping)</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-amber-50/20">✅ ពេញលេញ</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-blue-50/10">✅ ពេញលេញ</td>
                <td className="p-3.5 text-center text-emerald-600">✅ ដំណើរការបាន</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold">គ្រប់គ្រងទំនិញ & ស្តុក (Inventory Catalog)</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-amber-50/20">✅ ពេញលេញ</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-blue-50/10">✅ ពេញលេញ</td>
                <td className="p-3.5 text-center text-gray-400">👀 មើលស្តុកបាន</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold">ឆាតផ្ទាល់ជាមួយអតិថិជន (Live Customer Support)</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-amber-50/20">✅ ពេញលេញ</td>
                <td className="p-3.5 text-center text-emerald-600 font-bold bg-blue-50/10">✅ ពេញលេញ</td>
                <td className="p-3.5 text-center text-emerald-600">✅ ឆ្លើយតបបាន</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
