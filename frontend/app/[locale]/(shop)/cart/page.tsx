"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Trash2, Lock, Truck, ArrowRight, Check, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useLangStore } from "@/store/langStore";
import { useTranslations } from "next-intl";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const { items, fetchCart, updateQuantity, removeItem } = useCartStore();
  const t = useTranslations('Cart');

  useEffect(() => {
    setMounted(true);
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchCart();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateQuantity = async (id: number, quantity: number) => {
    try {
      await updateQuantity(id, quantity);
    } catch (e) {
      console.error("Failed to update quantity", e);
    }
  };

  const handleRemoveItem = async (id: number) => {
    try {
      await removeItem(id);
    } catch (e) {
      console.error("Failed to remove item", e);
    }
  };

  const subtotal = items.reduce((acc, item) => {
    const price = item.product?.sale_price ?? item.product?.price ?? item.price;
    return acc + price * item.quantity;
  }, 0);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900 font-sans pb-24 lg:pb-12">
      <div className="max-w-6xl mx-auto px-4 pt-6 md:pt-10">
        
        {/* Checkout Stepper */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-3 sm:gap-6 text-sm font-semibold text-gray-400">
            <div className="flex items-center gap-2 text-[#8B1A1A]">
              <div className="w-6 h-6 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center text-xs shadow-sm">1</div>
              <span className="hidden sm:inline">{t('cartStep')}</span>
            </div>
            <span>›</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center text-xs">2</div>
              <span className="hidden sm:inline">{t('checkoutStep')}</span>
            </div>
            <span>›</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center text-xs">3</div>
              <span className="hidden sm:inline">{t('doneStep')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          
          {/* LEFT: Cart Items */}
          <div className="space-y-6">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              {t('shoppingCart')} 
              <span className="text-base font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{totalItems} {t('items')}</span>
            </h1>

            <div className="space-y-4">
              {items.map((item) => {
                const price = item.product?.sale_price ?? item.product?.price ?? item.price;
                const name = item.product?.name ?? item.name;
                const image = item.product?.image ?? item.image_url;
                
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row bg-white border border-gray-100 p-4 sm:p-5 rounded-2xl gap-4 sm:gap-6 shadow-sm hover:shadow-md transition-shadow relative group"
                  >
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 rounded-xl flex items-center justify-center p-2 flex-shrink-0 relative overflow-hidden group-hover:bg-gray-100 transition-colors">
                      <Image 
                        src={image || "/placeholder.png"} 
                        alt={name || "Product"} 
                        fill
                        className="object-contain p-2 mix-blend-multiply transition-transform group-hover:scale-105"
                      />
                    </div>

                    <div className="flex flex-col flex-1 justify-center">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 leading-snug pr-8">{name}</h3>
                      <div className="flex items-center gap-2 text-xs font-semibold text-green-600 mb-4 bg-green-50 w-fit px-2 py-1 rounded-md">
                        <Check size={14} /> In Stock
                      </div>
                      
                      <div className="flex flex-wrap items-end justify-between gap-4 mt-auto">
                        <div className="flex flex-col">
                          <span className="text-lg font-black text-[#8B1A1A] font-mono leading-none tracking-tight">
                            ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              -
                            </button>
                            <div className="w-10 h-8 flex items-center justify-center text-sm font-bold border-x border-gray-100">
                              {item.quantity}
                            </div>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <button 
                      onClick={() => handleRemoveItem(item.id)} 
                      className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer bg-white"
                      title="Remove item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="py-20 text-center bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Image src="/cart-empty.svg" alt="Empty Cart" width={40} height={40} className="opacity-50" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-sm text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
                  <Link href="/category/all" className="bg-[#8B1A1A] hover:bg-[#a62222] text-white px-8 py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all cursor-pointer">
                    Continue Shopping
                  </Link>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT: Order Summary */}
          {items.length > 0 && (
            <div className="lg:mt-[52px]">
              <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm sticky top-24">
                <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                  {t('orderSummary')}
                </h2>

                <div className="space-y-4 text-sm font-medium text-gray-600">
                  <div className="flex justify-between items-center">
                    <span>{t('subtotal')} ({totalItems} items)</span>
                    <span className="font-bold text-gray-900">${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>{t('delivery')}</span>
                    <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs uppercase tracking-wider">{t('free')}</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-dashed border-gray-200">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-base font-bold text-gray-900">{t('total')}</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#8B1A1A] font-mono tracking-tight">
                        ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-bold text-right mb-6">
                    {formatKHR(subtotal)}
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="w-full bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#a62222] hover:to-[#e04030] text-white py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  {t('proceedToCheckout')}
                  <ArrowRight size={18} strokeWidth={2.5} />
                </Link>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 py-2 rounded-lg">
                    <ShieldCheck size={14} className="text-green-600" />
                    {t('secureCheckout')}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#1a4fa0]">
                    <Truck size={14} />
                    {t('sameDayPhnomPenh')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Mobile Checkout Bar */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-gray-200/60 px-4 py-3 sm:py-4 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{totalItems} {t('items')}</span>
            <span className="text-xl sm:text-2xl font-black text-[#8B1A1A] font-mono leading-none tracking-tight mt-0.5">
              ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <Link 
            href="/checkout" 
            className="flex-1 max-w-[220px] bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] text-white rounded-xl py-3.5 px-6 font-bold text-sm sm:text-base text-center shadow-md active:scale-95 transition-transform"
          >
            {t("proceedToCheckout")}
          </Link>
        </div>
      )}
    </div>
  );
}
