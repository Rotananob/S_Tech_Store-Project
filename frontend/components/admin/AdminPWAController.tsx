"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Laptop,
} from "lucide-react";

export function AdminPWAController() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showMobileBanner, setShowMobileBanner] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Inject or update Manifest link to admin-manifest.json
    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = "/admin-manifest.json";

    // 2. Inject Apple Touch Web App Meta Tags
    const setMetaTag = (name: string, content: string) => {
      let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    setMetaTag("apple-mobile-web-app-capable", "yes");
    setMetaTag("apple-mobile-web-app-status-bar-style", "black-translucent");
    setMetaTag("apple-mobile-web-app-title", "S-Tech Admin");
    setMetaTag("mobile-web-app-capable", "yes");

    let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement("link");
      appleIcon.rel = "apple-touch-icon";
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = "/icons/icon-192.png";

    // 3. Register Service Worker if supported
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Service worker registered
        })
        .catch(() => {
          // SW registration ignored in local development if unavailable
        });
    }

    // 4. Standalone Mode Detection
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // 5. iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // 6. Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = sessionStorage.getItem("admin_pwa_banner_dismissed");
      if (!checkStandalone && !dismissed) {
        setShowMobileBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 7. Show banner for iOS if not standalone and not dismissed
    const dismissed = sessionStorage.getItem("admin_pwa_banner_dismissed");
    if (isAppleDevice && !checkStandalone && !dismissed) {
      setShowMobileBanner(true);
    }

    // 8. Listen for appinstalled
    window.addEventListener("appinstalled", () => {
      setIsStandalone(true);
      setShowMobileBanner(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowMobileBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowIOSModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowMobileBanner(false);
    sessionStorage.setItem("admin_pwa_banner_dismissed", "true");
  };

  // If already standalone, render nothing or small indicator
  if (isStandalone && !installedSuccess) {
    return null;
  }

  return (
    <>
      {/* ─── Success Toast when installed ─── */}
      {installedSuccess && (
        <div className="fixed top-6 right-6 z-[99999] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          <span>បានដំឡើង S Tech Admin លើអេក្រង់ដើមជោគជ័យ!</span>
        </div>
      )}

      {/* ─── Non-intrusive Floating Mobile Install Bar ─── */}
      {showMobileBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[9999] bg-gray-950/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl border border-white/15 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 flex items-center justify-center shrink-0 shadow-md">
              <Smartphone size={20} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>ដំឡើង App Admin</span>
                  <span className="text-[9px] bg-red-600/80 text-white px-1.5 py-0.2 rounded font-mono uppercase">
                    PWA
                  </span>
                </h4>
                <button
                  onClick={handleDismissBanner}
                  className="text-gray-400 hover:text-white p-1 rounded cursor-pointer"
                  title="Dismiss"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
                បន្ថែម S Tech Admin ទៅកាន់ Home Screen លើទូរស័ព្ទ ដើម្បីបើកប្រើប្រាស់លឿនដូច Native App!
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#8B1A1A] via-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Download size={13} />
                  <span>{isIOS ? "របៀបបន្ថែមលើ iPhone" : "Add to Home Screen"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissBanner}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  ពេលក្រោយ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── iOS Step-by-Step Installation Modal ─── */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200 text-gray-900">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#8B1A1A] flex items-center justify-center mb-4 mx-auto shadow-sm">
              <Smartphone size={28} />
            </div>

            <h3 className="text-base sm:text-lg font-black text-center mb-1 text-gray-950">
              បន្ថែមទៅកាន់ Home Screen លើ iPhone
            </h3>
            <p className="text-xs text-gray-500 text-center mb-5 leading-relaxed">
              ធ្វើតាមជំហានងាយៗទាំង ៣ នេះ ដើម្បីដំឡើង S Tech Admin លើអេក្រង់ទូរស័ព្ទ៖
            </p>

            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-bold text-gray-900 flex items-center gap-1.5">
                    ចុចប៊ូតុង Share <Share size={13} className="text-blue-600" />
                  </span>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    នៅបាតខាងក្រោមនៃ Browser Safari របស់អ្នក
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-bold text-gray-900 flex items-center gap-1.5">
                    រំកិលចុះក្រោម រួចជ្រើសរើស
                  </span>
                  <p className="text-[#8B1A1A] font-bold text-[11px] mt-0.5 flex items-center gap-1">
                    <PlusSquare size={13} />
                    <span>"Add to Home Screen" (បន្ថែមទៅអេក្រង់ដើម)</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-bold text-gray-900">ចុច "Add" នៅជ្រុងលើស្តាំ</span>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Icon កម្មវិធីនឹងលោតលើអេក្រង់ទូរស័ព្ទភ្លាមៗ!
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-5 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              យល់ព្រម (Got it)
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Header & Sidebar Quick Install Button ───
export function AdminPWAInstallButton({
  variant = "pill",
}: {
  variant?: "pill" | "sidebar" | "icon";
}) {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);

    // If on mobile browser and not standalone, show install button
    const isMobile = /iphone|ipad|ipod|android/.test(navigator.userAgent.toLowerCase());
    if (isMobile && !checkStandalone) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
    };
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  if (isStandalone) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={11} className="text-emerald-600" />
        <span>App Installed</span>
      </span>
    );
  }

  return (
    <>
      {variant === "pill" && (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-[#8B1A1A] border border-red-200 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
          title="Install S Tech Admin to Home Screen"
        >
          <Smartphone size={13} className="text-[#8B1A1A]" />
          <span className="hidden sm:inline">ដំឡើង App</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {variant === "sidebar" && (
        <button
          type="button"
          onClick={handleClick}
          className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download size={13} className="text-rose-400" />
          <span>ដំឡើង App លើទូរស័ព្ទ (PWA)</span>
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative text-gray-900 text-left">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#8B1A1A] flex items-center justify-center mb-3">
              <Download size={24} />
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1">
              ដំឡើង S Tech Admin លើអេក្រង់ដើម
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              ដើម្បីប្រើប្រាស់ Dashboard បានលឿន និងពេញអេក្រង់ (Full Screen) ដូច Native App៖
            </p>

            <div className="space-y-2.5 bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs mb-4">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#8B1A1A]">លើ iPhone:</span>
                <span className="text-gray-600">
                  ចុច Share <Share size={11} className="inline text-blue-600" /> រួចជ្រើសរើស "Add to
                  Home Screen"
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600">លើ Android:</span>
                <span className="text-gray-600">
                  ចុចសញ្ញាចុច ៣ (Menu) នៅជ្រុងលើស្តាំ រួចជ្រើសរើស "Install app" ឬ "Add to Home screen"
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">លើ Computer:</span>
                <span className="text-gray-600">
                  ចុច Icon Install <Laptop size={11} className="inline text-emerald-600" /> នៅខាងស្តាំរបារ URL
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              យល់ព្រម (Close)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
