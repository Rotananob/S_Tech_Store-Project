"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={label}
      title={label}
    >
      <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
      <span className="text-sm md:text-lg font-medium">{text}</span>
    </button>
  );
}

