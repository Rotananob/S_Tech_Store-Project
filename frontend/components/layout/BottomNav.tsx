"use client";

import { useState, useEffect } from "react";
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Home, Layers, Camera, MessageSquare, User, LogIn, X, Sparkles } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useCartStore } from '@/store/cartStore';
import { useVisualSearchStore } from '@/store/visualSearchStore';
import { useChatStore } from '@/store/chatStore';
import ChatBot from '@/components/ui/ChatBot';
import FloatingLiveChatButton from '@/components/ui/FloatingLiveChatButton';
import { getOrCreateVisitorId, subscribeToChatMeta, markChatReadByUser } from '@/lib/services/chat.service';
import { motion, AnimatePresence } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const openVisualSearch = useVisualSearchStore((s) => s.openVisualSearch);
  const { isOpen: isChatOpen, closeChat, openChat, productInfo } = useChatStore();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        // Inside Telegram Mini App
        if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
          setIsLoggedIn(true);
          return;
        }

        const sessionStr = localStorage.getItem("user_session") || localStorage.getItem("stech_user_session");
        const token = localStorage.getItem("customer_token") || localStorage.getItem("token");
        if (sessionStr || token) {
          setIsLoggedIn(true);
          return;
        }
      }

      if (auth.currentUser) {
        setIsLoggedIn(true);
        return;
      }
      setIsLoggedIn(false);
    };

    checkAuth();

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setIsLoggedIn(true);
      } else {
        checkAuth();
      }
    });

    window.addEventListener("user_session_updated", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      unsub();
      window.removeEventListener("user_session_updated", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Subscribe to real-time unread messages for customer
  useEffect(() => {
    try {
      const visitorId = getOrCreateVisitorId();
      const unsub = subscribeToChatMeta(visitorId, (meta) => {
        if (meta && typeof meta.unreadUserCount === "number") {
          setUnreadChatCount(meta.unreadUserCount);
        } else {
          setUnreadChatCount(0);
        }
      });
      return () => unsub();
    } catch (e) {}
  }, []);

  // Listen for open_chat URL param, hash #chat, or event triggers (e.g. from Telegram alert)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAutoOpenChat = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hasParam =
          urlParams.get("open_chat") === "1" ||
          urlParams.get("open_chat") === "true" ||
          urlParams.get("chat") === "open" ||
          urlParams.get("chat") === "1" ||
          window.location.hash === "#chat";

        const hasStored = sessionStorage.getItem("stech_auto_open_chat") === "1";

        if (hasParam || hasStored) {
          sessionStorage.removeItem("stech_auto_open_chat");
          openChat();
        }
      } catch (e) {}
    };

    handleAutoOpenChat();
    const t1 = setTimeout(handleAutoOpenChat, 300);
    const t2 = setTimeout(handleAutoOpenChat, 1000);

    window.addEventListener("stech_trigger_open_chat", handleAutoOpenChat);
    window.addEventListener("hashchange", handleAutoOpenChat);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("stech_trigger_open_chat", handleAutoOpenChat);
      window.removeEventListener("hashchange", handleAutoOpenChat);
    };
  }, [openChat]);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && path !== '#chat' && pathname.startsWith(path)) return true;
    return false;
  };

  // Hide BottomNav on Product Detail and Checkout pages to allow for specific action bars
  if (pathname.includes('/products/') || pathname.includes('/checkout')) {
    return (
      <>
        <FloatingLiveChatButton />
        <AnimatePresence>
          {isChatOpen && (
            <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center pointer-events-auto">
              <ChatBot onClose={closeChat} productInfo={productInfo || undefined} />
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  const tabs: Array<{
    label: string;
    path: string;
    icon: any;
    isCenter?: boolean;
    isChat?: boolean;
    badge?: number;
  }> = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Category', path: '/category/all', icon: Layers },
    { label: 'Camera', path: '/scan', icon: Camera, isCenter: true },
    { label: 'Chat', path: '#chat', icon: MessageSquare, isChat: true, badge: isChatOpen ? 0 : unreadChatCount },
    { label: 'Account', path: '/account/profile', icon: User },
  ];

  return (
    <>
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-t border-black/5 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
      <div className="relative flex items-end justify-around h-[68px] max-w-[500px] mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          // Center Camera Search button - elevated Taobao FAB style
          if (tab.isCenter) {
            return (
              <button
                key={tab.path}
                type="button"
                onClick={openVisualSearch}
                className="relative flex flex-col items-center justify-end h-full w-[20%] pb-[6px] border-none bg-transparent cursor-pointer touch-manipulation group"
                aria-label="Scan products with Camera (S Tech Visual Search)"
              >
                <div className="absolute -top-[20px] left-1/2 -translate-x-1/2 z-10">
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center bg-gradient-to-br from-[#8B1A1A] to-[#c0392b]"
                    style={{ 
                      boxShadow: '0 8px 20px rgba(139,26,26,0.35), inset 0 2px 4px rgba(255,255,255,0.2)',
                      border: '4px solid white' 
                    }}
                  >
                    <Icon size={24} color="white" strokeWidth={2.5} />
                  </motion.div>
                </div>
                <span
                  className="text-[10px] font-bold transition-colors text-[#8B1A1A]"
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          const content = (
            <>
              <motion.div
                className={`relative flex items-center justify-center w-14 h-8 rounded-full mb-1 transition-colors ${
                  active ? 'bg-[#8B1A1A]/10' : 'bg-transparent group-hover:bg-gray-100/50'
                }`}
                animate={{ scale: active ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? 'text-[#8B1A1A]' : 'text-gray-500'}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <motion.span
                    key={tab.badge}
                    initial={{ scale: 0.5, y: -10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="absolute -top-1 -right-1 bg-[#8B1A1A] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm leading-none"
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </motion.span>
                )}
              </motion.div>
              <span
                className={`text-[10px] transition-colors ${
                  active ? 'font-semibold text-[#8B1A1A]' : 'font-medium text-gray-500 group-hover:text-gray-700'
                }`}
              >
                {tab.label}
              </span>
            </>
          );

          // Chat tab - open live ChatBot modal instead of navigating
          if (tab.path === '#chat') {
            return (
              <button
                id="bottom-nav-chat-icon"
                key={tab.path}
                type="button"
                onClick={() => {
                  try {
                    const visitorId = getOrCreateVisitorId();
                    markChatReadByUser(visitorId).catch(() => {});
                  } catch (e) {}
                  setUnreadChatCount(0);
                  openChat();
                }}
                className="flex flex-col items-center justify-end h-full w-[20%] pb-[6px] border-none bg-transparent cursor-pointer touch-manipulation group"
                aria-label="Open Customer Chat"
              >
                {content}
              </button>
            );
          }

          // Account tab - check if logged in; if not, show login popup modal
          if (tab.path === '/account/profile') {
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => {
                  if (isLoggedIn) {
                    router.push('/account/profile');
                  } else {
                    setShowAuthModal(true);
                  }
                }}
                className="flex flex-col items-center justify-end h-full w-[20%] pb-[6px] border-none bg-transparent cursor-pointer touch-manipulation group"
                aria-label="Open User Account"
              >
                {content}
              </button>
            );
          }

          // Regular tab
          return (
            <Link
              key={tab.path}
              href={tab.path as any}
              className="flex flex-col items-center justify-end h-full w-[20%] pb-[6px] no-underline touch-manipulation group"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {/* ── Auth Prompt Popup Modal when user clicks Account without logging in ── */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#141720] text-gray-900 dark:text-white rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-2xl text-center"
            >
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors border-none cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Icon badge */}
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-gradient-to-tr from-[#8B1A1A] via-red-600 to-amber-500 p-0.5 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#141720] flex items-center justify-center text-[#8B1A1A] dark:text-red-400">
                  <User size={30} />
                </div>
              </div>

              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1.5">
                សូមចូលគណនីរបស់អ្នក
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6 px-2">
                ចូលគណនីដើម្បីគ្រប់គ្រងទិន្នន័យផ្ទាល់ខ្លួន តាមដានការបញ្ជាទិញ និងទទួលបានកាក់រង្វាន់ VIP Coins!
              </p>

              <div className="space-y-2.5">
                <Link
                  href="/login"
                  onClick={() => setShowAuthModal(false)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6b1111] hover:to-red-700 text-white font-bold text-sm shadow-lg hover:shadow-red-900/30 flex items-center justify-center gap-2 no-underline transition-all"
                >
                  <LogIn size={16} />
                  <span>ចូលគណនី (Sign In)</span>
                </Link>

                <Link
                  href="/register"
                  onClick={() => setShowAuthModal(false)}
                  className="w-full py-3 px-4 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-2 no-underline transition-all border border-gray-200/60 dark:border-white/10"
                >
                  <span>ចុះឈ្មោះបង្កើតគណនីថ្មី (Create Account)</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="mt-4 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors border-none bg-transparent cursor-pointer"
              >
                មើលទំនិញបន្ត (Continue Browsing)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </nav>

      {/* Desktop Floating Live Chat Button */}
      <FloatingLiveChatButton />

      {/* Global Interactive ChatBot Modal when opened */}
      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center pointer-events-auto">
            <ChatBot onClose={closeChat} productInfo={productInfo || undefined} />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
