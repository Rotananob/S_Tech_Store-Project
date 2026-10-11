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

  // Hide FloatingBackButton on primary bottom navigation tabs and admin routes to prevent header collisions
  if (
    pathname === "/" || 
    pathname.startsWith("/category") ||
    pathname.startsWith("/scan") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/promotions") ||
    pathname.startsWith("/admin") || 
    pathname.startsWith("/stech-hq-portal") ||
    pathname.startsWith("/rok-mix-khernh")
  ) {
    return null;
  }

  const label = mounted && lang === "KM" ? "ត្រឡប់ក្រោយ" : "Go back";
  const text = mounted && lang === "KM" ? "ត្រឡប់ក្រោយ" : "Back";

  return (
    <button
      onClick={() => router.back()}
      className="lg:hidden fixed bottom-[84px] left-4 z-40 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white/95 dark:bg-[#151922]/95 backdrop-blur-xl text-gray-800 dark:text-gray-100 border border-gray-200/90 dark:border-white/10 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95 transition-all duration-300 cursor-pointer"
      aria-label={label}
      title={label}
    >
      <ArrowLeft className="w-4 h-4 text-[#8B1A1A] dark:text-red-400" strokeWidth={2.5} />
      <span className="text-[12px] font-bold text-gray-800 dark:text-white">{text}</span>
    </button>
  );
}

