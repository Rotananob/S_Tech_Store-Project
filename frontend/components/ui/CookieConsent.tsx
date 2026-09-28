"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasConsented = localStorage.getItem("cookie_consent");
    if (!hasConsented) {
      // Small delay so it doesn't fight with splash screen
      const timer = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.2 }}
          className="fixed bottom-0 left-0 right-0 z-[60] p-4 pb-safe md:pb-4 md:left-4 md:right-auto md:max-w-sm pointer-events-none"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        >
          <div className="bg-white rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-xl border border-gray-100 p-4 pointer-events-auto flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                  <Cookie size={16} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Cookie Policy</h3>
              </div>
              <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1">
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              We use cookies to improve your experience, personalize content, and analyze our traffic. By continuing to use S Tech Store, you agree to our privacy policy.
            </p>
            <div className="flex gap-2 mt-1">
              <button 
                onClick={handleAccept}
                className="flex-1 bg-[#8B1A1A] hover:bg-[#6b1111] text-white text-xs font-bold py-2.5 rounded-xl transition-colors border-none cursor-pointer"
              >
                Accept All
              </button>
              <button 
                onClick={() => setShow(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition-colors border-none cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
