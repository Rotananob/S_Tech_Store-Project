"use client";

import React from "react";
import { Bot } from "lucide-react";
import TelegramBotCard from "@/components/admin/TelegramBotCard";

export default function TelegramBotPage() {
  return (
    <div className="font-sans max-w-7xl mx-auto space-y-6">
      {/* Enterprise Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            <Bot size={14} className="text-[#0088cc]" />
            <span>Admin Settings / Integrations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Telegram Bot Integration
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            គ្រប់គ្រងការតភ្ជាប់ប្រព័ន្ធ Telegram Bot ផ្លូវការសម្រាប់ Group Alert របស់បុគ្គលិក និង Customer Assistant Mini App
          </p>
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
          <span>System Active</span>
        </div>
      </div>

      {/* Main Telegram Bot Configuration Card */}
      <TelegramBotCard />
    </div>
  );
}

