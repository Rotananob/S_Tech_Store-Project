'use client';

import { Link, usePathname } from '@/i18n/routing';
import { Home, Layers, Search, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.getTotalItems());

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const tabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Category', path: '/category/all', icon: Layers },
    { label: 'Search', path: '/search', icon: Search, isCenter: true },
    { label: 'Cart', path: '/cart', icon: ShoppingCart, badge: cartCount },
    { label: 'Account', path: '/account/profile', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Glass background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}
      />

      <div className="relative flex items-end justify-around" style={{ height: '60px', maxWidth: '500px', margin: '0 auto' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          // Center Search button - elevated FAB style
          if (tab.isCenter) {
            return (
              <Link
                key={tab.path}
                href={tab.path as any}
                className="flex flex-col items-center no-underline touch-manipulation"
                style={{ position: 'relative', bottom: '12px' }}
              >
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B1A1A 0%, #c0392b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(139,26,26,0.35)',
                    border: '3px solid white',
                  }}
                >
                  <Icon size={22} color="white" strokeWidth={2.5} />
                </motion.div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    marginTop: '2px',
                    color: active ? '#8B1A1A' : '#9ca3af',
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

          // Cart tab - open slide-over instead of navigating
          if (tab.path === '/cart') {
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => useCartStore.getState().setIsOpen(true)}
                className="flex flex-col items-center justify-center border-none bg-transparent cursor-pointer touch-manipulation"
                style={{ minWidth: '60px', height: '60px', padding: '6px 0' }}
              >
                <motion.div
                  animate={{ scale: active ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  style={{ position: 'relative' }}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 1.8}
                    color={active ? '#8B1A1A' : '#9ca3af'}
                  />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-8px',
                        background: '#8B1A1A',
                        color: 'white',
                        fontSize: '9px',
                        fontWeight: 700,
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        border: '2px solid white',
                        lineHeight: 1,
                      }}
                    >
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </motion.span>
                  )}
                </motion.div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: active ? 600 : 500,
                    marginTop: '3px',
                    color: active ? '#8B1A1A' : '#9ca3af',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          // Regular tab
          return (
            <Link
              key={tab.path}
              href={tab.path as any}
              className="flex flex-col items-center justify-center no-underline touch-manipulation"
              style={{ minWidth: '60px', height: '60px', padding: '6px 0' }}
            >
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  color={active ? '#8B1A1A' : '#9ca3af'}
                />
              </motion.div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: active ? 600 : 500,
                  marginTop: '3px',
                  color: active ? '#8B1A1A' : '#9ca3af',
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
