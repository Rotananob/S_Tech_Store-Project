"use client";

import { useEffect } from "react";
import api from "@/lib/api";

export default function TrafficTracker() {
  useEffect(() => {
    // Only track once per browser session to prevent unnecessary requests
    if (typeof window === "undefined") return;

    try {
      const alreadyTracked = sessionStorage.getItem("stech_visit_tracked");
      if (alreadyTracked) return;

      sessionStorage.setItem("stech_visit_tracked", "true");

      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const payload = {
        page: window.location.pathname || "/",
        referrer: document.referrer || "Direct Visit",
        device: isMobile ? "Mobile Phone 📱" : "Desktop Computer 💻",
      };

      api.post("/analytics/track-visit", payload).catch(() => {
        // Silent fail: Non-blocking
      });
    } catch {
      // Storage or network restricted: ignore
    }
  }, []);

  return null;
}
