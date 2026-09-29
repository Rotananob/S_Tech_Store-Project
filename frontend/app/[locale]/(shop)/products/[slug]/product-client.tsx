"use client";

import { useState, useEffect } from "react";
import ChatBot from "@/components/ui/ChatBot";
import { Link, useRouter } from "@/i18n/routing";
import { ShoppingCart, ChevronLeft, ChevronRight, Heart, MessageCircle, Store, Share, CheckCircle2, MapPin, X, Copy, Send, Image as ImageIcon } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

export function ProductDetailClient({ product }: { product: any }) {
  const [activeImage, setActiveImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);

  useEffect(() => {
    import("@/lib/services/product.service").then(async ({ getProductReviews, getProducts }) => {
      try {
        const revs = await getProductReviews(product.id);
        if (Array.isArray(revs)) {
          setReviews(revs);
        } else if (revs && Array.isArray(revs.data)) {
          setReviews(revs.data);
        }
        
        // Fetch suggested
        const prodsRes = await getProducts();
        let allProds: any[] = [];
        if (Array.isArray(prodsRes)) {
           allProds = prodsRes;
        } else if (prodsRes && Array.isArray(prodsRes.data)) {
           allProds = prodsRes.data;
        }
        
        // filter same category, remove current
        const related = allProds.filter(p => p.id !== product.id && p.category_id === product.category_id).slice(0, 4);
        // if not enough, fill with random
        if (related.length < 4) {
           const others = allProds.filter(p => p.id !== product.id && p.category_id !== product.category_id).slice(0, 4 - related.length);
           related.push(...others);
        }
        setSuggested(related);
      } catch (e) {
        console.error("Failed to load extra product data", e);
      }
    });
  }, [product.id, product.category_id]);
  const router = useRouter();

  useEffect(() => {
    import("@/lib/services/user.service").then(({ getWishlist }) => {
      getWishlist().then(res => {
         if (res.data && res.data.some(p => p.id === product.id)) {
            setIsSaved(true);
         }
      }).catch(e => console.log("User not logged in or error fetching wishlist"));
    });
  }, [product.id]);

  const toggleWishlist = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const { addToWishlist, removeFromWishlist } = await import("@/lib/services/user.service");
      if (isSaved) {
        await removeFromWishlist(product.id);
        setIsSaved(false);
      } else {
        await addToWishlist(product.id);
        setIsSaved(true);
      }
    } catch (e) {
      alert("Please login first to save items");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuyNow = () => {
    addItemToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
    });
    router.push("/checkout");
  };

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(product.name);
    if (platform === 'copy') {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    } else if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    } else if (platform === 'image') {
      window.open(images[activeImage] || images[0] || product.image_url, '_blank');
    } else if (platform === 'fake') {
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    }
    setShowShare(false);
  };
  
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
    { key: "Condition", value: product.condition || ((product.name || "").toLowerCase().includes("used") || (product.description || "").toLowerCase().includes("used") ? "Used (99%)" : "New") },
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
              <button onClick={() => setShowShare(true)} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-sm">
                <Share size={18} />
              </button>
            </div>

            <div 
              className="w-full aspect-square relative flex bg-gray-50 overflow-x-auto snap-x snap-mandatory no-scrollbar" 
              style={{ scrollBehavior: 'smooth' }}
              onScroll={(e) => {
                 const scrollLeft = e.currentTarget.scrollLeft;
                 const width = e.currentTarget.clientWidth;
                 const index = Math.round(scrollLeft / width);
                 if (index !== activeImage) setActiveImage(index);
              }}
            >
              {images.map((img: string, i: number) => (
                <div key={i} className="w-full h-full flex-shrink-0 snap-center relative flex items-center justify-center p-4">
                  <img
                    src={img}
                    alt={product.name + " " + (i+1)}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
              ))}
              {/* Pagination Badge */}
              <div className="absolute bottom-4 right-4 bg-black/40 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm z-10 pointer-events-none">
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
                <h2 className="text-[14px] font-bold">Item Reviews ({reviews.length > 0 ? reviews.length : (product.reviews || 0)})</h2>
                <span className="text-gray-400 text-[12px] flex items-center">See all <ChevronRight size={14}/></span>
              </div>
              
              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                <span className="bg-[#fff0f0] text-[#e02e24] px-3 py-1.5 rounded-full text-[11px]">Recommended</span>
                <span className="bg-[#f5f5f5] text-gray-700 px-3 py-1.5 rounded-full text-[11px]">High Quality</span>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map(rev => (
                    <div key={rev.id} className="border-b border-gray-50 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-600">
                            {(rev.user_name || "C")[0].toUpperCase()}
                          </div>
                          <span className="text-[13px] font-bold text-gray-800">{rev.user_name || "Customer"}</span>
                        </div>
                        <div className="flex text-yellow-400 text-[10px]">
                           {Array.from({length: rev.rating || 5}).map((_, i) => (
                             <span key={i}>?</span>
                           ))}
                        </div>
                      </div>
                      <p className="text-[13px] text-gray-600 whitespace-pre-line leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                product.reviews > 0 ? (
                  <div className="border-b border-gray-50 pb-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-600">S</div>
                      <span className="text-[13px] font-bold text-gray-800">S Tech User</span>
                    </div>
                    <div className="flex text-yellow-400 text-[10px] mb-1">?????</div>
                    <p className="text-[13px] text-gray-600 line-clamp-2">
                      Excellent product! Arrived in perfect condition.
                    </p>
                  </div>
                ) : (
                  <div className="text-[13px] text-gray-500 py-2 text-center">No reviews yet.</div>
                )
              )}
            </div>

            {/* Store Section */}
            <div className="bg-white p-4 mb-2 lg:rounded-2xl lg:shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-gray-100 overflow-hidden flex items-center justify-center bg-gray-50 shadow-sm">
                    <img src="/logo.jpg" alt="S Tech Store" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src="https://placehold.co/100x100?text=S+Tech" }} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 leading-tight">S Tech Store</h3>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                      <span className="text-yellow-400">★★★★★</span>
                      <span>(99% Positive)</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                      <MapPin size={10} className="text-gray-400" /> Phnom Penh, Cambodia
                    </div>
                  </div>
                </div>
                <button className="border border-[#8B1A1A] text-[#8B1A1A] px-3 py-1.5 rounded-full text-[12px] font-bold hover:bg-[#8B1A1A] hover:text-white transition-colors">
                  View Store
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 border-t border-gray-50 pt-3 text-center">
                <div>
                  <div className="text-[13px] font-bold text-gray-900">99+</div>
                  <div className="text-[10px] text-gray-500">Products</div>
                </div>
                <div className="border-l border-r border-gray-50">
                  <div className="text-[13px] font-bold text-gray-900">100%</div>
                  <div className="text-[10px] text-gray-500">Response</div>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-gray-900">Fast</div>
                  <div className="text-[10px] text-gray-500">Delivery</div>
                </div>
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
              <div className="text-[14px] text-gray-700 leading-loose whitespace-pre-line">
                {(product as any).description || "Genuine product provided by S Tech Store Cambodia. Contact us for more details."}
              </div>
            </div>
            
          </div>
        </div>

            {/* Suggested Products */}
            {suggested.length > 0 && (
              <div className="bg-white p-4 lg:rounded-2xl lg:shadow-sm">
                <h2 className="text-[14px] font-bold mb-4">You might also like</h2>
                <div className="grid grid-cols-2 gap-3">
                  {suggested.map(item => (
                    <Link key={item.id} href={`/products/${item.slug}`} className="flex flex-col group block">
                      <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-2 p-2 relative">
                        <img src={item.images?.[0] || item.image_url} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" />
                        {item.sale_price && (
                          <div className="absolute top-2 left-2 bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded">Sale</div>
                        )}
                      </div>
                      <h3 className="text-[12px] font-medium text-gray-800 line-clamp-2 leading-tight mb-1">{item.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[#8B1A1A] font-bold text-[14px]">${item.sale_price || item.price}</span>
                        {item.sale_price && <span className="text-gray-400 text-[11px] line-through">${item.price}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

      </div>

      {/* Sticky Bottom Action Bar (Mobile & Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 flex h-[60px] lg:hidden">
        {/* Icons */}
        <div className="flex w-[40%] bg-white justify-evenly items-center px-1">
          <button className="flex flex-col items-center justify-center text-gray-500 w-full gap-0.5">
            <Store size={20} />
            <span className="text-[9px]">Store</span>
          </button>
          <button onClick={toggleWishlist} disabled={isSaving} className={`flex flex-col items-center justify-center w-full gap-0.5 ${isSaved ? 'text-[#e02e24]' : 'text-gray-500'}`}>
            <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
            <span className="text-[9px]">Save</span>
          </button>
          <button onClick={() => setShowChatOptions(true)} className="flex flex-col items-center justify-center text-gray-500 w-full gap-0.5 hover:text-[#8B1A1A] transition-colors">
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
          <button onClick={handleBuyNow} className="flex-1 bg-[#e02e24] text-white flex flex-col items-center justify-center leading-tight hover:bg-[#c82218] transition-colors">
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
            <button onClick={handleBuyNow} className="bg-[#e02e24] text-white px-8 py-3 rounded-full font-bold hover:bg-[#c82218] transition-colors shadow-sm">
              Buy Now
            </button>
          </div>
        </div>
      </div>
      


      {/* Chat Options Modal */}
      <AnimatePresence>
        {showChatOptions && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 relative"
            >
              <button onClick={() => setShowChatOptions(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
              <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Contact Us</h3>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowChatOptions(false);
                    window.open('https://t.me/stechstore', '_blank');
                  }} 
                  className="w-full flex items-center justify-center gap-3 py-4 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl font-bold transition-colors"
                >
                  <Send size={20} /> Chat on Telegram
                </button>
                <button 
                  onClick={() => {
                    setShowChatOptions(false);
                    setShowChatBot(true);
                  }} 
                  className="w-full flex items-center justify-center gap-3 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-bold transition-colors border border-gray-200"
                >
                  <MessageCircle size={20} /> Chat on Website
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Website ChatBot Fullscreen Modal */}
      <AnimatePresence>
        {showChatBot && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[110]"
          >
            <ChatBot onClose={() => setShowChatBot(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShare && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 relative"
            >
              <button onClick={() => setShowShare(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
              <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Share Product</h3>
              
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => handleShare('copy')} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-200 transition-colors">
                    <Copy size={24} />
                  </div>
                  <span className="text-[11px] font-medium text-gray-600">Copy Link</span>
                </button>
                <button onClick={() => handleShare('fb')} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                    
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>

                  </div>
                  <span className="text-[11px] font-medium text-gray-600">Facebook</span>
                </button>
                <button onClick={() => handleShare('telegram')} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center text-sky-500 group-hover:bg-sky-100 transition-colors">
                    <Send size={24} />
                  </div>
                  <span className="text-[11px] font-medium text-gray-600">Telegram</span>
                </button>
                <button onClick={() => handleShare('image')} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <ImageIcon size={24} />
                  </div>
                  <span className="text-[11px] font-medium text-gray-600">Save Image</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
