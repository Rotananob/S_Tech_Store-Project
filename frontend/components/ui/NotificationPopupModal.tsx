"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Clock, Tag, ShoppingBag, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useNotificationStore, NotificationItem } from "@/store/notificationStore";

export default function NotificationPopupModal() {
  const router = useRouter();
  const activeNotif = useNotificationStore((state) => state.activePopupNotif);
  const setActiveNotif = useNotificationStore((state) => state.setActivePopupNotif);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  if (!activeNotif) return null;

  const handleClose = () => {
    setActiveNotif(null);
  };

  const handleAction = () => {
    if (activeNotif.id) {
      markAsRead(activeNotif.id);
    }
    const targetLink = activeNotif.link;
    setActiveNotif(null);
    if (targetLink) {
      router.push(targetLink);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "promo":
        return {
          icon: <Sparkles size={14} className="text-amber-500" />,
          label: "Special Promotion",
          bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
        };
      case "order":
        return {
          icon: <ShoppingBag size={14} className="text-emerald-500" />,
          label: "Order Status",
          bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
        };
      case "login":
        return {
          icon: <ShieldCheck size={14} className="text-blue-500" />,
          label: "Security & Login",
          bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
        };
      default:
        return {
          icon: <Tag size={14} className="text-red-500" />,
          label: "Store Notification",
          bg: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
        };
    }
  };

  const badge = getTypeBadge(activeNotif.type);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="w-full max-w-lg bg-white dark:bg-[#151922] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden flex flex-col"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                {badge.icon}
                <span>{badge.label}</span>
              </span>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Optional High-Res Preview Image */}
            {activeNotif.image && (
              <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-gray-50 dark:bg-[#12151e] border border-gray-100 dark:border-white/5 flex items-center justify-center relative shadow-inner">
                <img
                  src={activeNotif.image}
                  alt={activeNotif.title}
                  className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white leading-snug">
                {activeNotif.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-1">
                <Clock size={13} />
                <span>
                  {activeNotif.created_at
                    ? new Date(activeNotif.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Just now"}
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} /> S Tech Official Alert
                </span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {activeNotif.message}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>

            {activeNotif.link ? (
              <button
                type="button"
                onClick={handleAction}
                className="px-5 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#a02222] text-white text-xs font-extrabold shadow-lg shadow-red-900/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <span>View Details & Product</span>
                <ExternalLink size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (activeNotif.id) markAsRead(activeNotif.id);
                  handleClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold transition-all cursor-pointer"
              >
                Mark as Read
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
