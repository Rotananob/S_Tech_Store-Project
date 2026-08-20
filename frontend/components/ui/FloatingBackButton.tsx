"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function FloatingBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Hide the back button on the home page
  if (pathname === "/") {
    return null;
  }

  return (
    <button
      onClick={() => router.back()}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Go back"
      title="Go back"
    >
      <ArrowLeft size={24} />
    </button>
  );
}
