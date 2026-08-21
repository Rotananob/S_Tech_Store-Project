"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const switchLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 text-[#1a1a1a] hover:text-[#8B1A1A] font-bold text-xs sm:text-sm border border-gray-200/80 hover:border-red-200 transition-all shadow-sm cursor-pointer"
      >
        <span className="text-sm sm:text-base">{locale === "en" ? "🇺🇸" : "🇰🇭"}</span>
        <span>{locale === "en" ? "EN" : "ខ្មែរ"}</span>
        <ChevronDown size={13} className="text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-44 bg-white text-[#1a1a1a] rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Select Language / ជ្រើសរើសភាសា
          </div>
          {(["en", "km"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => switchLanguage(l)}
              className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm font-semibold hover:bg-red-50/70 transition-colors cursor-pointer border-none flex items-center justify-between ${
                locale === l ? "text-[#8B1A1A] bg-red-50 font-bold" : "text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{l === "en" ? "🇺🇸" : "🇰🇭"}</span>
                <span>{l === "en" ? "English" : "ភាសាខ្មែរ"}</span>
              </span>
              {locale === l && <span className="w-1.5 h-1.5 rounded-full bg-[#8B1A1A]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
