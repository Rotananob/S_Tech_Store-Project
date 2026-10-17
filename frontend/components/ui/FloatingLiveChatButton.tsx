"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/store/chatStore";
import { getActiveCustomerChatId, subscribeToChatMeta, markChatReadByUser } from "@/lib/services/chat.service";

export default function FloatingLiveChatButton() {
  const pathname = usePathname();
  const { isOpen, openChat } = useChatStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissBubble, setDismissBubble] = useState(false);

  useEffect(() => {
    try {
      const activeChatId = getActiveCustomerChatId();
      const unsub = subscribeToChatMeta(activeChatId, (meta) => {
        if (meta && typeof meta.unreadUserCount === "number") {
          setUnreadCount(meta.unreadUserCount);
          if (meta.unreadUserCount > 0) {
            setDismissBubble(false);
          }
        } else {
          setUnreadCount(0);
        }
      });
      return () => unsub();
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleTrigger = () => openChat();
    window.addEventListener("stech_trigger_open_chat", handleTrigger);
    return () => window.removeEventListener("stech_trigger_open_chat", handleTrigger);
  }, [openChat]);

  const handleClick = () => {
    try {
      const activeChatId = getActiveCustomerChatId();
      markChatReadByUser(activeChatId).catch(() => {});
    } catch (e) {}
    setUnreadCount(0);
    openChat();
  };

  // If already open, on checkout, or on mobile (handled by BottomNav), hide button
  if (isOpen || pathname?.includes("/checkout")) return null;

  return (
    <div className="hidden lg:flex fixed bottom-7 right-7 z-[8000] flex-col items-end pointer-events-auto">
      {/* Speech Bubble Notice when Admin replies */}
      <AnimatePresence>
        {unreadCount > 0 && !dismissBubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="mb-2 relative bg-gray-900 text-white text-xs px-3.5 py-2 rounded-2xl shadow-xl border border-gray-700 flex items-center gap-2 max-w-[240px]"
          >
            <span className="flex-1 font-medium leading-tight">
              💬 <strong>មានសារឆ្លើយតប!</strong> បុគ្គលិកបានឆ្លើយតបសាររបស់អ្នក ({unreadCount})
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDismissBubble(true);
              }}
              className="text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X size={13} />
            </button>
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-gray-900 rotate-45 border-r border-b border-gray-700" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#8B1A1A] via-red-600 to-rose-500 text-white shadow-2xl flex items-center justify-center cursor-pointer border-2 border-white/80 group"
        aria-label="Open Live Chat"
      >
        <MessageSquare size={24} className="group-hover:rotate-6 transition-transform" />

        {/* Real Unread Badge (1, 2, 3...) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-6 w-6 bg-red-600 text-white font-extrabold text-[11px] items-center justify-center border-2 border-white shadow-sm font-mono">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </motion.button>
    </div>
  );
}
