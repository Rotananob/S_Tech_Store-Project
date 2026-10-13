"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";

export default function OrderDetailsRedirectPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const rawId = params?.id ? String(params.id) : "";
    if (rawId) {
      router.replace(`/orders?order_id=${encodeURIComponent(rawId)}`);
    } else {
      router.replace("/orders");
    }
  }, [params, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-10 h-10 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
        កំពុងបញ្ជូនទៅកាន់ព័ត៌មានការបញ្ជាទិញ (Loading My Orders)...
      </p>
    </div>
  );
}
