"use client";

import { useCartStore } from "@/store/cartStore";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/translations";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { auth } from "@/lib/firebase";
import { getEffectiveUser } from "@/lib/auth-user";

export default function SlideOverCart() {
  const router = useRouter();
  const { isOpen, setIsOpen, items, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const { lang } = useLangStore();
  const t = translations[lang].cart;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Cart Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white dark:bg-[#121622] text-gray-900 dark:text-white h-full shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[#1a1a1a] dark:text-white">
                <ShoppingCart size={22} className="text-[#8B1A1A] dark:text-red-400" />
                {t.title}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer border-none bg-transparent"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-4">
                  <ShoppingCart size={48} className="text-gray-300 dark:text-gray-600" />
                  <p>{t.emptyCart}</p>
                  <button 
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn-outline-blue mt-2 border-gray-300 dark:border-white/20 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                  >
                    {t.continueShopping}
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-white dark:bg-[#181d2a] border border-gray-100 dark:border-white/10 p-3 rounded-2xl shadow-sm relative group">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {(item.image_url || item.product?.image || item.product?.image_url) ? (
                        <Image src={item.image_url || item.product?.image || item.product?.image_url} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart size={20} className="text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="pr-6">
                        <h3 className="text-sm font-bold text-[#1a1a1a] dark:text-white line-clamp-2">{item.name}</h3>
                        <p className="text-[#8B1A1A] dark:text-red-400 font-bold text-sm mt-1">{formatPrice(item.price)}</p>
                      </div>
                      
                      {/* Quantity Control */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden h-8 w-[90px] bg-white dark:bg-[#1a1f2c]">
                          <button
                            type="button"
                            className="w-8 h-full flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer border-none bg-transparent font-bold transition-colors select-none"
                            onClick={() => {
                              if (item.quantity > 1) updateQuantity(item.id, item.quantity - 1);
                            }}
                          >
                            -
                          </button>
                          <div className="flex-1 text-center text-xs font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-[#151924] h-full flex items-center justify-center border-x border-gray-200 dark:border-white/10 select-none">
                            {item.quantity}
                          </div>
                          <button
                            type="button"
                            className="w-8 h-full flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer border-none bg-transparent font-bold transition-colors select-none"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Remove Item */}
                    <button
                      type="button"
                      className="absolute top-3 right-3 text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 cursor-pointer border-none bg-transparent"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#0e121a] pb-[calc(env(safe-area-inset-bottom)+24px)] md:pb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">{t.total}:</span>
                  <span className="text-[22px] font-black text-[#1a1a1a] dark:text-white font-mono tracking-tight">{formatPrice(getTotalPrice())}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/cart" onClick={() => setIsOpen(false)} className="w-full">
                    <button type="button" className="w-full py-4 bg-white dark:bg-[#1a1f2c] border border-gray-200 dark:border-white/10 rounded-xl text-[15px] font-bold text-[#1a1a1a] dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.98]">
                      {t.viewCart}
                    </button>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsOpen(false);
                      if (!getEffectiveUser()) {
                        router.push("/login?redirect=/checkout");
                        return;
                      }
                      router.push("/checkout");
                    }}
                    className="w-full py-4 bg-[#8B1A1A] hover:bg-[#a62222] text-white rounded-xl text-[15px] font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border-none flex justify-center items-center gap-2 active:scale-[0.98]"
                  >
                    {t.checkout}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}