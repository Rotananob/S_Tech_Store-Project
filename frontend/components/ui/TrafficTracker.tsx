"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getDeviceDescription(): string {
  if (typeof window === "undefined") return "Web Browser";
  const ua = navigator.userAgent;

  let deviceType = "Desktop Computer 💻";
  if (/mobile/i.test(ua)) deviceType = "Mobile Phone 📱";
  else if (/tablet|ipad/i.test(ua)) deviceType = "Tablet Device 📟";

  let os = "Unknown OS";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";

  return `${deviceType} (${os} • ${browser})`;
}

export default function TrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Strict Home Page Only Check
    // Home page is root '/' or localized '/km', '/en', '/km/', '/en/'
    const currentPath = pathname || window.location.pathname || "/";
    const cleanPath = currentPath.replace(/^\/(en|km)/, "").replace(/\/$/, "") || "/";
    const isHomePage = cleanPath === "/";

    // Strictly ignore any non-homepage visits (e.g. /products, /cart, /checkout, etc.)
    if (!isHomePage) return;

    try {
      // 2. Tab/App Session-Level Deduplication
      // sessionStorage resets automatically when user closes tab, quits browser, or closes phone app.
      // While user browses between pages in the same session, this flag prevents duplicate counts!
      const SESSION_KEY = "stech_hp_session_tracked";
      if (sessionStorage.getItem(SESSION_KEY)) {
        return;
      }

      // Mark session immediately to prevent race conditions
      sessionStorage.setItem(SESSION_KEY, "true");

      // Generate or retrieve persistent device fingerprint to prevent rapid spam pings
      let deviceUuid = "";
      try {
        deviceUuid = localStorage.getItem("stech_device_uuid") || "";
        if (!deviceUuid) {
          deviceUuid = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
          localStorage.setItem("stech_device_uuid", deviceUuid);
        }
      } catch {}

      const screen = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
      const referrer = document.referrer || "Direct Visit (URL or Bookmark)";
      const device = getDeviceDescription();

      const payload = {
        page: "Home Page 🏠",
        referrer,
        device,
        screen,
        device_id: deviceUuid,
        country: "Cambodia 🇰🇭",
      };

      fetch("/api/analytics/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silent catch: Non-blocking analytics
      });
    } catch {
      // Storage restricted: ignore
    }
  }, [pathname]);

  // Keep-alive heartbeat: Ensures Render backend never spins down while active users browse
  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/cron/keepalive", { cache: "no-store" }).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/cron/keepalive", { cache: "no-store" }).catch(() => {});
    }, 8 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
