"use client";

import React from "react";
import { Send, Bot, ShieldCheck, Zap, Sparkles, MessageSquare } from "lucide-react";
import TelegramBotCard from "@/components/admin/TelegramBotCard";

export default function TelegramBotPage() {
  return (
    <div className="font-sans max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0088cc]/10 via-[#0088cc]/5 to-transparent border border-[#0088cc]/20 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0088cc] text-xs font-bold uppercase tracking-wider mb-2">
            <Bot size={14} />
            <span>Store Automation & Real-time Alerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#0088cc] text-white shadow-md shadow-[#0088cc]/20">
              <Send size={24} />
            </span>
            Telegram Bot Center
          </h1>
          <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
            គ្រប់គ្រងការតភ្ជាប់ Telegram Bot ផ្លូវការរបស់ហាង S Tech Store ដើម្បីទទួលដំណឹងទាន់ហេតុការណ៍ (Real-time Notifications) ដូចជា ការបញ្ជាទិញថ្មី, ការជួសជុល, ស្តុកទំនិញ, និង Live Support ជូនអតិថិជន។
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Bot Status: Ready & Live</span>
        </div>
      </div>

      {/* Main Telegram Bot Configuration Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <TelegramBotCard />
      </div>
    </div>
  );
}
