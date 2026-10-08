'use client';

import { Link, usePathname } from '@/i18n/routing';
import { Home, Layers, Camera, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useVisualSearchStore } from '@/store/visualSearchStore';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.getTotalItems());
  const openVisualSearch = useVisualSearchStore((s) => s.openVisualSearch);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  // Hide BottomNav on Product Detail and Checkout pages to allow for specific action bars
  if (pathname.includes('/products/') || pathname.includes('/checkout')) {
    return null;
  }

  const tabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Category', path: '/category/all', icon: Layers },
    { label: 'Camera', path: '/scan', icon: Camera, isCenter: true },
    { label: 'Cart', path: '/cart', icon: ShoppingCart, badge: cartCount },
    { label: 'Account', path: '/account/profile', icon: User },
  ];

  return (
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
                aria-label="Scan products with Camera (Taobao Style)"
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

          // Cart tab - open slide-over instead of navigating
          if (tab.path === '/cart') {
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => useCartStore.getState().setIsOpen(true)}
                className="flex flex-col items-center justify-end h-full w-[20%] pb-[6px] border-none bg-transparent cursor-pointer touch-manipulation group"
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
    </nav>
  );
}
