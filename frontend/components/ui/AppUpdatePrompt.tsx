"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DownloadCloud, X } from "lucide-react";

export default function AppUpdatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Simulate checking for an update after 10 seconds of app load
    // In a real app, this would poll an endpoint or listen to a service worker event
    const lastPrompt = sessionStorage.getItem("update_prompted");
    if (!lastPrompt) {
      const timer = setTimeout(() => {
        // Randomly simulate an update available 20% of the time for demo purposes
        // Or if explicitly triggered
        const shouldShow = Math.random() > 0.8; 
        if (shouldShow) {
          setShow(true);
        }
        sessionStorage.setItem("update_prompted", "true");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleUpdate = () => {
    // Force reload to get new assets
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            className="bg-white rounded-2xl w-full max-w-[320px] p-5 shadow-2xl relative overflow-hidden text-center"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-50 rounded-full mix-blend-multiply opacity-70" />
            
            <button 
              onClick={() => setShow(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 z-10"
            >
              <X size={18} />
            </button>
            
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4 relative z-10">
              <DownloadCloud size={24} />
            </div>
            
            <h3 className="text-base font-bold text-gray-900 mb-2 relative z-10">New Version Available!</h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed relative z-10">
              We've just released a new update with improvements and bug fixes. Update now for the best experience.
            </p>
            
            <div className="flex gap-2 relative z-10">
              <button 
                onClick={() => setShow(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-3 rounded-xl transition-colors border-none cursor-pointer"
              >
                Later
              </button>
              <button 
                onClick={handleUpdate}
                className="flex-[1.5] bg-[#1a4fa0] hover:bg-[#153e7a] text-white text-xs font-bold py-3 rounded-xl transition-colors border-none cursor-pointer shadow-md shadow-blue-900/20"
              >
                Update Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
