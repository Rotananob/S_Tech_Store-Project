"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeDropdown() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 animate-pulse" />
    );
  }

  const currentIcon = () => {
    if (theme === "dark") return <Moon size={16} className="text-amber-400" />;
    if (theme === "light") return <Sun size={16} className="text-amber-500" />;
    return <Monitor size={16} className="text-blue-500" />;
  };

  const currentLabel = () => {
    if (theme === "dark") return "Dark";
    if (theme === "light") return "Light";
    return "Auto";
  };

  const options = [
    { id: "light", label: "Light Mode", icon: Sun, color: "text-amber-500" },
    { id: "dark", label: "Dark Mode", icon: Moon, color: "text-amber-400" },
    { id: "system", label: "System Auto", icon: Monitor, color: "text-blue-500" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 font-bold text-xs sm:text-sm border border-gray-200 dark:border-white/10 transition-all shadow-sm cursor-pointer min-h-[40px]"
        title="Theme Mode / ប្ដូរពន្លឺ"
        aria-label="Toggle theme"
      >
        {currentIcon()}
        <span className="hidden sm:inline font-semibold">{currentLabel()}</span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#151922] text-gray-900 dark:text-white rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden z-50 p-1.5 space-y-1"
          >
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Theme Mode
            </div>
            {options.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-none text-left ${
                    active
                      ? "bg-red-50 dark:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 font-bold"
                      : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={opt.color} />
                    <span>{opt.label}</span>
                  </div>
                  {active && <Check size={14} className="text-[#8B1A1A] dark:text-red-400" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
