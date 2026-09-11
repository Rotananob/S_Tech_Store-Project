"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { useLangStore } from "@/store/langStore";

export default function FloatingBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLangStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname === "/") {
    return null;
  }

  const label = mounted && lang === "KM" ? "ត្រឡប់ក្រោយ" : "Go back";
  const text = mounted && lang === "KM" ? "ត្រឡប់ក្រោយ" : "Back";

  return (
    <button
      onClick={() => router.back()}
      className="fixed top-24 left-4 md:top-28 md:left-8 z-40 flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-white/90 backdrop-blur-md text-[#1a1a1a] border border-gray-200/50 rounded-xl shadow-lg shadow-black/5 hover:shadow-xl hover:-translate-x-1 hover:text-[#8B1A1A] transition-all duration-300 cursor-pointer"
      aria-label={label}
      title={label}
    >
      <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
      <span className="text-xs md:text-sm font-bold tracking-wide">{text}</span>
    </button>
  );
}

