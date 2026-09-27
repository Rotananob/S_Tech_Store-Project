"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "@/i18n/routing";

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Only show splash screen once per session
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) {
      setShow(false);
    } else {
      const timer = setTimeout(() => {
        setShow(false);
        sessionStorage.setItem("hasSeenSplash", "true");
      }, 3500); // 3.5 seconds loading
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
        className="fixed inset-0 z-[99999] bg-[#f5f5f5] flex flex-col items-center justify-center overflow-hidden"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
          className="relative flex flex-col items-center"
        >
          {/* Logo Animation */}
          <motion.div
            animate={{ 
              rotate: [0, -5, 5, -5, 5, 0],
              y: [0, -10, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white mb-6 relative z-10"
          >
            <img src="/logo.jpg" alt="S Tech Store" className="w-full h-full object-cover" />
          </motion.div>

          {/* Store Name */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-[32px] font-extrabold text-[#8B1A1A] tracking-tight mb-2"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            S Tech Store
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-gray-500 font-medium text-[14px]"
          >
            Genuine Tech in Cambodia
          </motion.p>
        </motion.div>

        {/* Loading Spinner at bottom */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-16 flex flex-col items-center gap-3"
        >
          <div className="w-6 h-6 border-3 border-[#8B1A1A]/30 border-t-[#8B1A1A] rounded-full animate-spin" />
          <span className="text-gray-400 text-[11px] font-medium tracking-widest uppercase">Loading Data...</span>
        </motion.div>
        
        {/* Background Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-100/50 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl pointer-events-none translate-y-1/3 -translate-x-1/3" />
      </motion.div>
    </AnimatePresence>
  );
}
