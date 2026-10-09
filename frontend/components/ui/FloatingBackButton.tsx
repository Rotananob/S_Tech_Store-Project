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

  if (pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/stech-hq-portal")) {
    return null;
  }

  const label = mounted && lang === "KM" ? "ត្រឡប់ក្រោយ" : "Go back";
  const text = mounted && lang === "KM" ? "ត្រឡប់ក្រោយ" : "Back";

  return (
    <button
      onClick={() => router.back()}
      className="lg:hidden fixed top-[70px] left-3 z-40 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-xl text-gray-800 border border-gray-200/80 rounded-[14px] shadow-sm hover:shadow-md hover:bg-gray-50 active:scale-95 transition-all duration-300 cursor-pointer"
      aria-label={label}
      title={label}
    >
      <ArrowLeft className="w-5 h-5 text-[#8B1A1A]" strokeWidth={2.5} />
      <span className="text-[13px] font-bold text-gray-800">{text}</span>
    </button>
  );
}

