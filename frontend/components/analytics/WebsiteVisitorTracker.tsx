"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getDeviceDescription(): string {
  if (typeof window === "undefined") return "Web Browser";
  const ua = navigator.userAgent;

  let deviceType = "Desktop";
  if (/mobile/i.test(ua)) deviceType = "Mobile";
  else if (/tablet|ipad/i.test(ua)) deviceType = "Tablet";

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

export default function WebsiteVisitorTracker() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string>("");
  const lastTrackTimeRef = useRef<number>(0);

  useEffect(() => {
    // Only track if pathname is available and in browser
    if (!pathname || typeof window === "undefined") return;

    // Skip internal static assets or Next.js internals
    if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
      return;
    }

    // Don't track admin internal back-office pages as public customer visits
    if (pathname.includes("/rok-mix-khernh")) {
      return;
    }

    const now = Date.now();
    // Prevent duplicate triggers for the exact same page within 12 seconds
    if (lastTrackedRef.current === pathname && now - lastTrackTimeRef.current < 12000) {
      return;
    }

    lastTrackedRef.current = pathname;
    lastTrackTimeRef.current = now;

    const device = getDeviceDescription();
    const screen = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
    const referrer = document.referrer || "Direct Visit (Typed URL or Bookmark)";

    // Asynchronously send traffic ping to backend
    const trackPayload = {
      page: pathname,
      referrer,
      device,
      screen,
      country: "Cambodia 🇰🇭",
    };

    try {
      fetch("/api/analytics/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackPayload),
        keepalive: true,
      }).catch(() => {
        // Silent catch to prevent any user-facing console noise
      });
    } catch {
      // Ignore network errors
    }
  }, [pathname]);

  return null;
}
