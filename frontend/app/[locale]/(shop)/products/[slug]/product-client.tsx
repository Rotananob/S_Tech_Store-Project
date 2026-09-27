"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { ShoppingCart, ChevronLeft, ChevronRight, Heart, MessageCircle, Store, Share, CheckCircle2 } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

export function ProductDetailClient({ product }: { product: any }) {
  const [activeImage, setActiveImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const router = useRouter();
  
  const addItemToCart = useCartStore((state) => state.addItem);
  const t = useTranslations("Products");

  const handleAddToCart = (e: React.MouseEvent) => {
    // Basic Add to Cart without fly animation for simplicity in this file
    addItemToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
    });
    useCartStore.getState().setIsOpen(true);
  };

  const images = product.images?.length > 0 ? product.images : (product.image_url ? [product.image_url] : ["/placeholder.jpg"]);
  const specs = [
    { key: "Category", value: product.category?.name || "Laptops" },
    { key: "Brand", value: product.brand || "S Tech" },
    { key: "Condition", value: "New" },
  ];

  return (
    <div className="bg-[#f5f5f5] min-h-screen text-gray-900 pb-[80px] lg:pb-0">
      
      {/* Desktop Breadcrumbs */}
      <div className="hidden lg:block container mx-auto pt-6 px-4">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#8B1A1A]">Home</Link>
          <span>/</span>
          <Link href={`/category/${product.category?.name?.toLowerCase() || 'all'}`} className="hover:text-[#8B1A1A]">
            {product.category?.name || "Category"}
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">{product.name}</span>
        </nav>
      </div>

      <div className="lg:container lg:mx-auto lg:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-12 items-start">
          
          {/* LEFT: Image Slider */}
          <div className="relative bg-white lg:rounded-2xl lg:overflow-hidden lg:border lg:border-gray-100">
            {/* Mobile Top Navigation Overlays */}
            <div className="absolute top-4 left-4 z-10 lg:hidden">
              <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-sm">
                <ChevronLeft size={22} />
              </button>
            </div>
            <div className="absolute top-4 right-4 z-10 flex gap-3 lg:hidden">
              <button className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-sm">
                <Share size={18} />
              </button>
            </div>

            <div className="w-full aspect-square relative flex items-center justify-center bg-gray-50">
              <img
                src={images[activeImage]}
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply p-4"
              />
              {/* Pagination Badge */}
              <div className="absolute bottom-4 right-4 bg-black/40 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm">
                {activeImage + 1}/{images.length}
              </div>
            </div>
            
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar bg-white">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-lg border-2 flex-shrink-0 overflow-hidden bg-gray-50 ${i === activeImage ? 'border-[#8B1A1A]' : 'border-transparent'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Details */}
          <div className="lg:py-4">
            
            {/* Price Banner */}
            <div className="bg-white p-4 mb-2 lg:rounded-2xl lg:shadow-sm">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[#e02e24] text-[28px] font-bold leading-none">{formatUSD(product.sale_price || product.price)}</span>
                  {product.sale_price && (
                    <span className="text-gray-400 text-[13px] line-through">{formatUSD(product.price)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {product.sale_price && (
                  <span className="bg-[#fdefee] text-[#e02e24] px-2 py-0.5 rounded text-[11px] font-bold italic">
                    ⚡ {Math.round((1 - product.sale_price / product.price) * 100)}% off
                  </span>
                )}
                {product.stock > 0 ? (
                   <span className="bg-[#eefdf4] text-[#16a34a] px-2 py-0.5 rounded text-[11px] font-bold">
                     In Stock
                   </span>
                ) : (
                   <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[11px] font-bold">
                     Out of Stock
                   </span>
                )}
              </div>

              <h1 className="text-[16px] font-bold text-gray-900 leading-snug mb-2">
                {product.name}
              </h1>
              
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="text-[#16a34a] flex items-center gap-1"><CheckCircle2 size={12}/> Guarantee Genuine</span>
                <span className="text-gray-500">• Fast Delivery</span>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white p-4 mb-2 lg:rounded-2xl lg:shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-[14px] font-bold">Item Reviews ({product.reviews || 0})</h2>
                <span className="text-gray-400 text-[12px] flex items-center">See all <ChevronRight size={14}/></span>
              </div>
              {product.reviews > 0 ? (
                <>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                    <span className="bg-[#fff0f0] text-[#e02e24] px-3 py-1.5 rounded-full text-[11px]">Recommended</span>
                    <span className="bg-[#f5f5f5] text-gray-700 px-3 py-1.5 rounded-full text-[11px]">High Quality</span>
                  </div>
                  
                  {/* Mock Review if reviews exist */}
                  <div className="border-b border-gray-50 pb-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">CU</div>
                      <span className="text-[13px] font-medium">Customer</span>
                    </div>
                    <p className="text-[13px] text-gray-600 line-clamp-2">
                      Excellent product! Arrived in perfect condition.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-[13px] text-gray-500 py-2">No reviews yet.</div>
              )}
            </div>

            {/* Store Section */}
            <div className="bg-white p-4 mb-2 lg:rounded-2xl lg:shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-gray-100 overflow-hidden flex items-center justify-center bg-gray-50">
                    <Store className="text-gray-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold">S Tech Store</h3>
                    <div className="flex text-yellow-400 text-[10px] mt-0.5">
                      ★★★★★ <span className="text-gray-400 ml-1">Official Store</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[#f9f9f9] rounded-lg p-2.5 flex items-center gap-2 text-[11px] text-gray-600">
                <CheckCircle2 size={14} className="text-[#16a34a]"/>
                <span className="font-bold">Guarantees</span>
                <span className="text-gray-400 ml-auto">Genuine Products</span>
              </div>
            </div>

            {/* Product Details Specs */}
            <div className="bg-white p-4 mb-2 lg:rounded-2xl lg:shadow-sm">
              <h2 className="text-[14px] font-bold mb-3">Product details</h2>
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 pb-4 mb-4">
                {specs.map((spec, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[11px] text-gray-400 mb-1">{spec.key}</div>
                    <div className="text-[12px] font-medium text-gray-800 line-clamp-1">{spec.value}</div>
                  </div>
                ))}
              </div>
              <div className="text-[13px] text-gray-600 leading-relaxed">
                {(product as any).description || "Genuine product provided by S Tech Store Cambodia. Contact us for more details."}
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar (Mobile & Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 flex h-[60px] lg:hidden">
        {/* Icons */}
        <div className="flex w-[40%] bg-white justify-evenly items-center px-1">
          <button className="flex flex-col items-center justify-center text-gray-500 w-full gap-0.5">
            <Store size={20} />
            <span className="text-[9px]">Store</span>
          </button>
          <button onClick={() => setIsSaved(!isSaved)} className={`flex flex-col items-center justify-center w-full gap-0.5 ${isSaved ? 'text-[#e02e24]' : 'text-gray-500'}`}>
            <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
            <span className="text-[9px]">Save</span>
          </button>
          <button className="flex flex-col items-center justify-center text-gray-500 w-full gap-0.5">
            <MessageCircle size={20} />
            <span className="text-[9px]">Chat</span>
          </button>
        </div>
        
        {/* Buttons */}
        <div className="flex w-[60%]">
          <button onClick={handleAddToCart} className="flex-1 bg-[#f89c9c] text-white flex flex-col items-center justify-center leading-tight hover:bg-[#f48484] transition-colors">
            <span className="text-[12px]">Est. {formatUSD(product.price)}</span>
            <span className="text-[14px] font-bold">Add to Cart</span>
          </button>
          <button className="flex-1 bg-[#e02e24] text-white flex flex-col items-center justify-center leading-tight hover:bg-[#c82218] transition-colors">
            <span className="text-[12px]">Est. {formatUSD(product.price)}</span>
            <span className="text-[14px] font-bold">Buy Now</span>
          </button>
        </div>
      </div>

      {/* Desktop Fixed Action Bar (Hidden on Mobile) */}
      <div className="hidden lg:flex fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 h-[80px] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] items-center justify-center">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <img src={images[0]} className="w-12 h-12 rounded object-cover border border-gray-100" alt=""/>
             <div>
                <h3 className="text-[14px] font-bold text-gray-900">{product.name}</h3>
                <span className="text-[#e02e24] font-bold">{formatUSD(product.price)}</span>
             </div>
          </div>
          <div className="flex gap-4">
            <button onClick={handleAddToCart} className="bg-[#f89c9c] text-white px-8 py-3 rounded-full font-bold hover:bg-[#f48484] transition-colors shadow-sm">
              Add to Cart
            </button>
            <button className="bg-[#e02e24] text-white px-8 py-3 rounded-full font-bold hover:bg-[#c82218] transition-colors shadow-sm">
              Buy Now
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
