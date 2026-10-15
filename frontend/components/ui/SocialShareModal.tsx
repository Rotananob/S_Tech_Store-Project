"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Share2, ExternalLink, Globe, Sparkles } from "lucide-react";

export interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  url?: string;
  imageUrl?: string;
  onShareSuccess?: (platform: string) => void;
}

export default function SocialShareModal({
  isOpen,
  onClose,
  title,
  text,
  url,
  imageUrl,
  onShareSuccess,
}: SocialShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Resolve absolute clean URL
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://www.s-tech-store.tech";
  const rawUrl = url || (typeof window !== "undefined" ? window.location.href : "https://www.s-tech-store.tech");
  const shareUrl = rawUrl.startsWith("http") ? rawUrl : `${currentOrigin}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
  const shareTitle = title || "S Tech Store Cambodia";
  const shareText = text || "ចូលមកមើលទំនិញបច្ចេកវិទ្យា Laptops, Gaming PC & គ្រឿងបន្លាស់គុណភាពខ្ពស់នៅ S Tech Store!";
  const previewImage = imageUrl || `${currentOrigin}/og-image.png`;

  const openShareWindow = (targetUrl: string, platform: string) => {
    onShareSuccess?.(platform);

    // On mobile devices, navigate directly or open in new tab
    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(targetUrl, "_blank");
      return;
    }

    // Centered pop-up window for desktop Direct-to-Post dialogs
    const width = 640;
    const height = 620;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      targetUrl,
      `share_${platform}`,
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,status=no,resizable=yes`
    );
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        onShareSuccess?.("copy");
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const handleNativeShare = () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      (navigator as any)
        .share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        .then(() => onShareSuccess?.("native"))
        .catch(() => {});
    }
  };

  const platforms = [
    {
      id: "telegram",
      name: "Telegram",
      actionLabel: "Direct Post / Share",
      color: "bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9] hover:text-white border-[#229ED9]/20",
      iconBg: "bg-[#229ED9]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      ),
      onClick: () => {
        const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        openShareWindow(tgUrl, "telegram");
      },
    },
    {
      id: "facebook",
      name: "Facebook",
      actionLabel: "Create Post",
      color: "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border-[#1877F2]/20",
      iconBg: "bg-[#1877F2]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      onClick: () => {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        openShareWindow(fbUrl, "facebook");
      },
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      actionLabel: "Send Message",
      color: "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border-[#25D366]/20",
      iconBg: "bg-[#25D366]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
          <path d="M17.472 14.382c-.301-.15-1.781-.878-2.057-.978-.276-.1-.477-.15-.678.15-.201.3-.778.978-.954 1.179-.176.2-.352.226-.653.075-1.788-.895-2.96-1.597-4.137-3.62-.313-.538.313-.5.897-1.666.099-.201.05-.376-.025-.527-.075-.15-.678-1.631-.93-2.235-.244-.589-.493-.509-.678-.518-.176-.009-.377-.009-.578-.009s-.527.075-.803.376c-.276.3-1.054 1.03-1.054 2.512 0 1.482 1.079 2.912 1.23 3.113.15.2 2.124 3.243 5.145 4.549 1.942.84 2.703.921 3.67.778.735-.11 2.259-.923 2.578-1.815.319-.893.319-1.657.224-1.816-.095-.159-.296-.251-.597-.402zM12.04 2C6.516 2 2.022 6.494 2.022 12.018c0 1.936.554 3.743 1.516 5.275L2 22l4.877-1.492c1.474.887 3.2 1.392 5.04 1.392 5.524 0 10.018-4.494 10.018-10.018C21.935 6.494 17.564 2 12.04 2z" />
        </svg>
      ),
      onClick: () => {
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
        openShareWindow(waUrl, "whatsapp");
      },
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      actionLabel: "Post to Feed",
      color: "bg-black/10 dark:bg-white/10 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-black/20 dark:border-white/20",
      iconBg: "bg-black dark:bg-white text-white dark:text-black",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      onClick: () => {
        const twUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}&via=STechStore`;
        openShareWindow(twUrl, "twitter");
      },
    },
    {
      id: "threads",
      name: "Threads",
      actionLabel: "Share to Threads",
      color: "bg-zinc-800/10 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-900 hover:text-white border-zinc-500/20",
      iconBg: "bg-zinc-900 text-white",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
          <path d="M12.186 24C5.597 24 0 18.635 0 12.046 0 5.457 5.597 0 12.186 0c6.48 0 11.832 5.093 12.174 11.554h-3.02C21 6.837 17.06 3.012 12.186 3.012c-4.99 0-9.034 4.044-9.034 9.034 0 4.99 4.044 9.034 9.034 9.034 4.013 0 7.42-2.67 8.58-6.388-1.13.567-2.45.882-3.854.882-4.707 0-7.85-2.883-7.85-7.228 0-4.346 3.143-7.228 7.85-7.228 4.707 0 7.85 2.882 7.85 7.228 0 .807-.11 1.603-.322 2.373C23.084 17.382 18.17 24 12.186 24zm4.846-13.626c0-2.61-1.89-4.216-4.846-4.216-2.955 0-4.846 1.606-4.846 4.216 0 2.61 1.89 4.216 4.846 4.216 2.956 0 4.846-1.606 4.846-4.216z" />
        </svg>
      ),
      onClick: () => {
        const thUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
        openShareWindow(thUrl, "threads");
      },
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      actionLabel: "Share to Feed",
      color: "bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white border-[#0A66C2]/20",
      iconBg: "bg-[#0A66C2]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      ),
      onClick: () => {
        const inUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        openShareWindow(inUrl, "linkedin");
      },
    },
  ];

  const hasNativeShare = typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
        {/* Backdrop click to dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#121620] rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#8B1A1A]/10 text-[#8B1A1A] dark:text-red-400 flex items-center justify-center">
                <Share2 size={16} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                  ចែករំលែកទៅកាន់បណ្តាញសង្គម (Share Direct to Post)
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  ចុចលើ Platform ណាមួយដើម្បីបើកផ្ទាំង Post ភ្លាមៗ (Auto Rich Preview)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* Live Social Card Preview (What friends & followers will see!) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/[0.03] dark:to-white/[0.06] border border-gray-200 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-bold flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>ការបង្ហាញគំរូជាក់ស្តែង (Social Preview Card)</span>
                </span>
                <span className="text-[10px] bg-white dark:bg-black/40 px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/10 font-mono">
                  1200 x 630 HD
                </span>
              </div>

              {/* Realistic Preview Snippet Card */}
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#181d28] shadow-sm">
                <div className="relative aspect-[1.91/1] w-full bg-gray-900 overflow-hidden">
                  <img
                    src={previewImage}
                    alt={shareTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/og-image.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md font-mono font-bold text-[10px] flex items-center gap-1">
                      <Globe size={11} className="text-red-400" />
                      <span>s-tech-store.tech</span>
                    </span>
                    <span className="text-[10px] opacity-80">Official Store</span>
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white line-clamp-1">
                    {shareTitle}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {shareText}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                💡 ពេលបង្ហោះលើ Facebook, Telegram, WhatsApp ឬ X រូបភាពនិងព័ត៌មានខាងលើនឹងបង្ហាញដោយស្វ័យប្រវត្តិ។
              </p>
            </div>

            {/* Direct-to-Post Platform Buttons Grid */}
            <div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">
                ជ្រើសរើស Platform ដើម្បីបង្ហោះភ្លាមៗ (1-Click Direct to Post):
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={p.onClick}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] border border-gray-200 dark:border-white/10 transition-all flex items-center gap-3 group cursor-pointer text-left active:scale-95"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${p.iconBg} text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}
                    >
                      {p.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {p.actionLabel}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick URL Copy Bar & Native Device Share */}
            <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-2">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent border-none text-xs text-gray-700 dark:text-gray-300 px-2.5 focus:outline-none font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    copied
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-[#8B1A1A] hover:bg-[#701515] text-white shadow-sm"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      <span>ចម្លងជោគជ័យ!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>ចម្លង Link</span>
                    </>
                  )}
                </button>
              </div>

              {hasNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all border border-gray-200 dark:border-white/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 size={14} />
                  <span>បើកផ្ទាំងកម្មវិធីទូរស័ព្ទ (Device Share Sheet)</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
