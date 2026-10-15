"use client";

import React from "react";
import { Bot } from "lucide-react";
import TelegramBotCard from "@/components/admin/TelegramBotCard";

export default function TelegramBotPage() {
  return (
    <div className="font-sans max-w-7xl mx-auto space-y-6">
      {/* Enterprise Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-sky-600 mb-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#0088cc] animate-ping inline-block" />
            <Bot size={14} className="text-[#0088cc]" />
            <span>ADMIN SETTINGS • INTEGRATIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight m-0">
            Telegram Bot Integration
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 max-w-2xl leading-relaxed font-medium">
            គ្រប់គ្រងការតភ្ជាប់ប្រព័ន្ធ Telegram Bot ផ្លូវការសម្រាប់ Group Alert របស់បុគ្គលិក និង Customer Assistant Mini App
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-bold self-start md:self-auto shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
          <span>System Active · 24/7 Monitoring</span>
        </div>
      </div>

      {/* Main Telegram Bot Configuration Card */}
      <TelegramBotCard />
    </div>
  );
}

