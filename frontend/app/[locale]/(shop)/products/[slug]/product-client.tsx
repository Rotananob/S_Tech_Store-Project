"use client";

import { useState, useEffect } from "react";
import ChatBot from "@/components/ui/ChatBot";
import { Link, useRouter } from "@/i18n/routing";
import { ShoppingCart, ChevronLeft, ChevronRight, Heart, MessageCircle, Store, Share, CheckCircle2, MapPin, X, Copy, Send, Image as ImageIcon, Star, Sparkles, ThumbsUp, Laptop, User } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { triggerFlyToCart } from "@/lib/flyToCart";
import { auth } from "@/lib/firebase";
import { submitProductReview } from "@/lib/services/product.service";
import PublicProfileModal from "@/components/ui/PublicProfileModal";
import SocialShareModal from "@/components/ui/SocialShareModal";

export function ProductDetailClient({ product: initialProduct }: { product: any }) {
  const [product, setProduct] = useState(initialProduct);

  useEffect(() => {
    setProduct(initialProduct);
  }, [initialProduct]);

  useEffect(() => {
    const handleProductUpdated = (e: any) => {
      const updated = e.detail || e;
      if (!updated) return;
      if (Number(updated.id) === Number(product.id) || (updated.slug && updated.slug === product.slug)) {
        setProduct((prev: any) => ({ ...prev, ...updated }));
      }
    };

    const handleProductDeleted = (e: any) => {
      const delId = e.detail?.id ?? e.productId ?? e.detail?.rawId ?? e;
      if (!delId) return;
      if (Number(delId) === Number(product.id) || String(delId) === product.slug) {
        setProduct((prev: any) => ({ ...prev, in_stock: false, stock: 0, is_deleted: true }));
      }
    };

    window.addEventListener("stech:product-updated", handleProductUpdated as EventListener);
    window.addEventListener("stech:product-deleted", handleProductDeleted as EventListener);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("stech_products_channel");
        channel.onmessage = (event) => {
          if (event.data?.type === "PRODUCT_UPDATED" && event.data.product) {
            handleProductUpdated({ detail: event.data.product });
          } else if (event.data?.type === "PRODUCT_DELETED") {
            handleProductDeleted({ detail: { id: event.data.productId, rawId: event.data.rawId } });
          }
        };
      }
    } catch (_) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "stech_last_product_update" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.product) {
            handleProductUpdated({ detail: data.product });
          }
        } catch (_) {}
      } else if (e.key === "stech_last_product_delete" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.productId || data?.rawId) {
            handleProductDeleted({ detail: { id: data.productId, rawId: data.rawId } });
          }
        } catch (_) {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("stech:product-updated", handleProductUpdated as EventListener);
      window.removeEventListener("stech:product-deleted", handleProductDeleted as EventListener);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
    };
  }, [product?.id, product?.slug]);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [heartPulsing, setHeartPulsing] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{
    id: string | number | null;
    name?: string;
    avatar?: string | null;
  } | null>(null);

  // 3D Spatial Visualizer State
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  // Reviews submission state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    import("@/lib/services/product.service").then(async ({ getProductReviews, getProducts }) => {
      try {
        const revs = await getProductReviews(product.id);
        if (Array.isArray(revs)) {
          setReviews(revs);
        } else if (revs && Array.isArray(revs.data)) {
          setReviews(revs.data);
        }
        
        // Fetch suggested (filter out test spam or empty products)
        const prodsRes = await getProducts();
        let allProds: any[] = [];
        if (Array.isArray(prodsRes)) {
           allProds = prodsRes;
        } else if (prodsRes && Array.isArray(prodsRes.data)) {
           allProds = prodsRes.data;
        }
        
        // Filter out current product, empty names, and test spam like 'aaaa'
        const validProds = allProds.filter(
          p => p.id !== product.id && p.name && p.name.trim().length > 1 && !["aaaa", "rotana", "testt"].includes(p.name.trim().toLowerCase())
        );

        // First prioritize same category, then others
        let related = validProds.filter(p => p.category_id === product.category_id).slice(0, 8);
        if (related.length < 8) {
           const others = validProds.filter(p => p.category_id !== product.category_id).slice(0, 8 - related.length);
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
    import("@/lib/services/history.service").then(({ recordProductView }) => {
      recordProductView(product);
    }).catch(() => {});

    import("@/lib/services/user.service").then(({ getWishlist }) => {
      getWishlist().then(res => {
         if (res.data && res.data.some(p => p.id === product.id)) {
            setIsSaved(true);
         }
      }).catch(e => console.log("User not logged in or error fetching wishlist"));
    });
  }, [product]);

  // 0ms Optimistic Wishlist Toggle
  const toggleWishlist = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setHeartPulsing(true);
    setTimeout(() => setHeartPulsing(false), 350);

    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([25]);
      }
    } catch (e) {}

    import("@/lib/services/user.service").then(async ({ addToWishlist, removeFromWishlist }) => {
      try {
        if (nextSaved) {
          await addToWishlist(product.id);
        } else {
          await removeFromWishlist(product.id);
        }
      } catch (e) {
        // Rollback on network failure
        setIsSaved(!nextSaved);
        alert("Please login first to save items to your wishlist");
      }
    });
  };

  const handleBuyNow = (e?: React.MouseEvent) => {
    const activeImg = images[activeImage] || images[0] || product.image_url || product.image;
    if (e) {
      triggerFlyToCart(e.currentTarget as HTMLElement, activeImg);
    }
    addItemToCart({
      id: product.id,
      product_id: product.id,
      name: product.name,
      price: product.sale_price || product.price,
      quantity: Math.max(1, quantity),
      image_url: activeImg,
      product: {
        ...product,
        image: activeImg,
        image_url: activeImg,
      },
    });
    setTimeout(() => {
      router.push("/checkout");
    }, 350);
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

  // Parabolic Fly-To-Cart Animation Trigger
  const handleAddToCart = (e: React.MouseEvent) => {
    const activeImg = images[activeImage] || images[0] || product.image_url || product.image;
    triggerFlyToCart(e.currentTarget as HTMLElement, activeImg);
    addItemToCart({
      id: product.id,
      product_id: product.id,
      name: product.name,
      price: product.sale_price || product.price,
      quantity: Math.max(1, quantity),
      image_url: activeImg,
      product: {
        ...product,
        image: activeImg,
        image_url: activeImg,
      },
    });

    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([25, 40]);
      }
    } catch (err) {}

    // Allow fly animation to arc into cart badge before opening slide-over cart
    setTimeout(() => {
      useCartStore.getState().setIsOpen(true);
    }, 850);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setIsSubmittingReview(true);
    try {
      const currentUser = auth.currentUser;
      await submitProductReview(product.id, {
        rating: ratingInput,
        comment: commentInput.trim(),
        user_name: currentUser?.displayName || "S Tech Customer",
      });

      const newReviewItem = {
        id: Date.now(),
        rating: ratingInput,
        comment: commentInput.trim(),
        user_name: currentUser?.displayName || "S Tech Customer",
        user_avatar: currentUser?.photoURL || null,
        created_at: new Date().toISOString(),
        verified: true,
      };
      setReviews((prev) => [newReviewItem, ...prev]);
      setCommentInput("");
      setShowReviewForm(false);
      setReviewSubmitted(true);
      setTimeout(() => setReviewSubmitted(false), 4000);
    } catch (err) {
      console.error("Failed to submit review", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const images = product.images?.length > 0 ? product.images : (product.image_url ? [product.image_url] : ["/placeholder.jpg"]);
  const specs = [
    { key: "Category", value: product.category?.name || "Laptops" },
    { key: "Brand", value: product.brand || "S Tech" },
    { key: "Condition", value: product.condition || ((product.name || "").toLowerCase().includes("used") || (product.description || "").toLowerCase().includes("used") ? "Used (99%)" : "New") },
  ];

  // Check if promo/sale is currently active and not expired in real-time
  const promoEnd = product.promo_end || product.valid_until || product.discount_until;
  const isExpired = promoEnd ? new Date(promoEnd).getTime() <= Date.now() : false;
  const hasSale = !isExpired && product.sale_price && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price);
  const activeSalePrice = hasSale ? Number(product.sale_price) : null;
  const activeOriginalPrice = Number(product.price || 0);
  const discountPct = hasSale ? Math.round(((activeOriginalPrice - activeSalePrice!) / activeOriginalPrice) * 100) : null;

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
          
          {/* LEFT: 3D Interactive Product Visualizer & Image Slider */}
          <div className="relative bg-white lg:rounded-3xl lg:overflow-hidden lg:border lg:border-gray-100 lg:shadow-xl group">
            {/* Mobile Top Navigation Overlays */}
            <div className="absolute top-4 left-4 z-20 lg:hidden">
              <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-md shadow-lg active:scale-95 transition-transform">
                <ChevronLeft size={22} />
              </button>
            </div>
            <div className="absolute top-4 right-4 z-20 flex gap-2 lg:hidden">
              <button 
                onClick={toggleWishlist} 
                className={`w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-md shadow-lg active:scale-125 transition-all ${isSaved ? 'text-red-500' : 'text-white'}`}
                title="Save product"
              >
                <Heart size={18} fill={isSaved ? "currentColor" : "none"} className={heartPulsing ? "scale-125 transition-transform" : ""} />
              </button>
              <button onClick={() => setShowShare(true)} className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-md shadow-lg active:scale-95 transition-transform">
                <Share size={18} />
              </button>
            </div>

            {/* 3D Interactive Stage container */}
            <div 
              className="w-full aspect-square relative flex items-center justify-center bg-gradient-to-b from-gray-50/80 via-white to-gray-100/50 p-6 sm:p-10 overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={{ perspective: 1200 }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                setTiltY((x - 0.5) * 26);
                setTiltX(-(y - 0.5) * 26);
                setGlare({ x: x * 100, y: y * 100, opacity: 0.35 });
                setIsHovered(true);
              }}
              onMouseLeave={() => {
                setTiltX(0);
                setTiltY(0);
                setGlare((g) => ({ ...g, opacity: 0 }));
                setIsHovered(false);
              }}
            >
              {/* Subtle 3D Depth Grid */}
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

              {/* 3D Perspective Canvas */}
              <motion.div
                animate={{
                  rotateX: tiltX,
                  rotateY: tiltY,
                  scale: isHovered ? 1.05 : 1,
                  y: isHovered ? -6 : 0,
                }}
                transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative w-full h-full flex items-center justify-center pointer-events-none"
              >
                {/* 3D Dynamic Ambient Shadow */}
                <motion.div
                  animate={{
                    scale: isHovered ? 1.1 : 0.95,
                    opacity: isHovered ? 0.35 : 0.2,
                    y: isHovered ? 28 : 18,
                  }}
                  className="absolute bottom-4 w-3/4 h-8 bg-black/40 rounded-full blur-xl pointer-events-none"
                />

                <img
                  src={images[activeImage]}
                  alt={product.name}
                  style={{ transform: "translateZ(35px)" }}
                  className="w-full h-full object-contain mix-blend-multiply drop-shadow-2xl transition-all duration-300 pointer-events-auto"
                />

                {/* 3D Specular Light Glare */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-3xl transition-opacity duration-300"
                  style={{
                    opacity: glare.opacity,
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 60%)`,
                    transform: "translateZ(40px)",
                  }}
                />
              </motion.div>

              {/* 3D Tech Spatial Tag */}
              <div 
                className="absolute top-4 left-4 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md border border-gray-200/80 shadow-md text-[11px] font-bold text-gray-800 dark:text-gray-200 pointer-events-none transition-transform group-hover:scale-105"
              >
                <Sparkles size={12} className="text-amber-500 animate-pulse" />
                <span>3D Spatial View</span>
                <span className="text-[9px] text-gray-400 font-mono">Move Cursor</span>
              </div>

              {/* Pagination Badge */}
              <div className="absolute bottom-4 right-4 bg-black/50 text-white text-[11px] font-mono px-3 py-1 rounded-full backdrop-blur-md z-10 pointer-events-none border border-white/10 shadow-sm">
                {activeImage + 1} / {images.length}
              </div>
            </div>
            
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2.5 p-3.5 overflow-x-auto no-scrollbar bg-white/70 backdrop-blur-sm border-t border-gray-100">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl border-2 flex-shrink-0 overflow-hidden bg-gray-50 transition-all cursor-pointer ${
                      i === activeImage 
                        ? 'border-[#8B1A1A] scale-105 shadow-md shadow-red-900/10 ring-2 ring-red-500/20' 
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
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
            <div className="bg-white dark:bg-[#151922] p-4 sm:p-6 mb-3 lg:rounded-2xl lg:shadow-sm border border-gray-100 dark:border-white/10">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[#e02e24] dark:text-red-400 text-2xl sm:text-3xl lg:text-4xl font-black leading-none font-mono">
                      {formatUSD(hasSale ? activeSalePrice! : activeOriginalPrice)}
                    </span>
                    {hasSale && (
                      <span className="text-gray-400 dark:text-gray-500 text-sm sm:text-base line-through font-mono">
                        {formatUSD(activeOriginalPrice)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1 font-khmer">
                    {formatKHR(hasSale ? activeSalePrice! : activeOriginalPrice)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {hasSale && discountPct && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-sm animate-pulse">
                    🔥 -{discountPct}% OFF PROMO
                  </span>
                )}
                {Number(product.stock) > 0 ? (
                  Number(product.stock) <= 5 ? (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 px-3 py-1 rounded-full text-[11px] font-extrabold shadow-xs animate-pulse">
                      <span>⚡ សល់តិច: {product.stock} គ្រឿងចុងក្រោយ</span>
                      <span className="text-[10px] opacity-75">(Only {product.stock} left)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-[#eefdf4] dark:bg-emerald-950/40 text-[#16a34a] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 rounded-full text-[11px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span>មានក្នុងស្តុក: {product.stock} គ្រឿង</span>
                      <span className="text-[10px] opacity-75 font-medium">(In Stock: {product.stock})</span>
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 px-3 py-1 rounded-full text-[11px] font-bold">
                    <span>❌ អស់ពីស្តុក (Out of Stock)</span>
                  </span>
                )}
              </div>

              <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2.5 tracking-tight">
                {product.name}
              </h1>
              
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle2 size={13}/> Guarantee Genuine 100%</span>
                <span>• Fast 25 Provinces Delivery</span>
                <span>• Official Warranty</span>
              </div>
            </div>

            {/* Desktop Action & Purchase Panel (Prominent on lg+) */}
            <div className="hidden lg:block bg-white dark:bg-[#151922] p-5 sm:p-6 mb-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
              <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-100 dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  បរិមាណ • Quantity
                </span>
                <div className="flex items-center border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 font-bold transition-colors cursor-pointer border-none bg-transparent"
                  >
                    -
                  </button>
                  <div className="w-12 h-9 flex items-center justify-center text-sm font-black font-mono text-gray-900 dark:text-white border-x border-gray-200 dark:border-white/10">
                    {quantity}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 font-bold transition-colors cursor-pointer border-none bg-transparent"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* CTAs */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600/10 to-[#8B1A1A]/10 hover:bg-red-50 dark:hover:bg-red-950/40 text-[#8B1A1A] dark:text-red-400 border border-red-300 dark:border-red-900/60 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <ShoppingCart size={17} strokeWidth={2.3} />
                  <span>ដាក់ចូលកន្ត្រក</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95 border-none"
                >
                  <span>ទិញភ្លាមៗ (Buy Now)</span>
                </button>
              </div>

              {/* Quick Actions (Wishlist & Telegram Specialist Consultation) */}
              <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={toggleWishlist}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSaved
                      ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-[#8B1A1A] dark:text-red-400"
                      : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                  }`}
                >
                  <Heart size={14} fill={isSaved ? "currentColor" : "none"} className={heartPulsing ? "scale-125 transition-transform" : ""} />
                  <span>{isSaved ? "បានរក្សាទុក (Saved)" : "រក្សាទុក (Wishlist)"}</span>
                </button>

                <a
                  href="https://t.me/S_TECH_ASSISTANTBOT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all no-underline shadow-xs"
                >
                  <Send size={13} />
                  <span>Telegram Specialist</span>
                </a>
              </div>

              {/* Genuine Warranty Perks */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>ធានាផលិតផលសុទ្ធ ១០០%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>ដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត-ក្រុង</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>ធានាប្តូរថ្មីក្នុងរយៈពេល ៧ ថ្ងៃ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>ដំឡើង Software ឥតគិតថ្លៃ</span>
                </div>
              </div>
            </div>

            {/* Store Section */}
            <div className="bg-white dark:bg-[#151922] p-4 sm:p-5 mb-3 lg:rounded-2xl lg:shadow-sm border border-gray-100 dark:border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-gray-100 dark:border-white/10 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-white/5 shadow-sm">
                    <img src="/logo.jpg" alt="S Tech Store" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src="/logo.jpg" }} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">S Tech Store</h3>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      <span className="text-yellow-400">★★★★★</span>
                      <span>(99% Positive)</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      <MapPin size={10} className="text-gray-400" /> Phnom Penh, Cambodia
                    </div>
                  </div>
                </div>
                <button className="border border-[#8B1A1A] dark:border-red-500 text-[#8B1A1A] dark:text-red-400 px-3.5 py-1.5 rounded-full text-[12px] font-bold hover:bg-[#8B1A1A] hover:text-white transition-colors cursor-pointer">
                  View Store
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 border-t border-gray-50 dark:border-white/5 pt-3 text-center">
                <div>
                  <div className="text-[13px] font-bold text-gray-900 dark:text-white">99+</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Products</div>
                </div>
                <div className="border-l border-r border-gray-50 dark:border-white/5">
                  <div className="text-[13px] font-bold text-gray-900 dark:text-white">100%</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Response</div>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-gray-900 dark:text-white">Fast</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Delivery</div>
                </div>
              </div>
            </div>

            {/* Product Details Specs */}
            <div className="bg-white dark:bg-[#151922] p-4 sm:p-5 mb-2 lg:rounded-2xl lg:shadow-sm border border-gray-100 dark:border-white/10">
              <h2 className="text-[14px] sm:text-[15px] font-bold mb-3 text-gray-900 dark:text-white">Product specifications</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 border-b border-gray-100 dark:border-white/5 pb-4 mb-4">
                {specs.map((spec, i) => (
                  <div key={i} className="p-2 rounded-xl bg-gray-50/70 dark:bg-white/5 text-center">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{spec.key}</div>
                    <div className="text-[12px] font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{spec.value}</div>
                  </div>
                ))}
              </div>
              <div className="text-[13px] sm:text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {(product as any).description || "Genuine product provided by S Tech Store Cambodia. Contact us for more details."}
              </div>
            </div>
            
          </div>
        </div>

        {/* Customer Reviews Section (Full width, placed ABOVE Suggested Products) */}
        <div className="bg-white dark:bg-[#151922] p-5 sm:p-8 mt-6 lg:rounded-3xl lg:shadow-sm border border-gray-100 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-gray-100 dark:border-white/5 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center font-black">
                <Star size={20} fill="currentColor" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                    Customer Reviews
                  </h2>
                  <span className="text-xs font-black text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                    {reviews.length > 0 
                      ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
                      : (product.rating || "4.9")} / 5.0
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Verified feedback from genuine S Tech Store buyers ({reviews.length > 0 ? reviews.length : (product.reviews || 0)} total reviews)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="self-start sm:self-auto text-white bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] hover:from-[#a02222] hover:to-[#d04030] text-xs font-bold flex items-center gap-1.5 transition-all px-4 py-2 rounded-xl shadow-sm cursor-pointer active:scale-95"
            >
              <Sparkles size={14} />
              <span>{showReviewForm ? "Cancel Review" : "Write a Review"}</span>
            </button>
          </div>

          {reviewSubmitted && (
            <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Review published successfully! Thank you for sharing your experience.</span>
            </div>
          )}

          {/* Review Submission Form */}
          <AnimatePresence>
            {showReviewForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmitReview}
                className="mb-6 p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Rate this product:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingInput(star)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer text-amber-400"
                      >
                        <Star size={20} fill={star <= ratingInput ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Share your experience (build quality, performance, temperature, delivery speed)..."
                  rows={3}
                  required
                  className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12151e] text-gray-900 dark:text-white focus:border-[#8B1A1A] outline-none transition-all resize-none shadow-xs"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !commentInput.trim()}
                    className="px-5 py-2 bg-[#8B1A1A] hover:bg-[#a02222] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
                  >
                    {isSubmittingReview ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Submit Review</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5">
            <span className="bg-[#fff0f0] dark:bg-red-950/40 text-[#e02e24] dark:text-red-400 px-3 py-1 rounded-full text-[11px] font-bold border border-red-200 dark:border-red-900/40">★ Verified Buyers</span>
            <span className="bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-[11px] font-medium">Genuine Guarantee</span>
            <span className="bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-[11px] font-medium">Fast Cambodia Delivery</span>
          </div>

          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev) => (
                <div key={rev.id || Math.random()} className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div 
                      onClick={() => {
                        setSelectedProfileUser({
                          id: rev.firebase_uid || rev.user_id || rev.id,
                          name: rev.user_name || "S Tech Customer",
                          avatar: rev.user_avatar || null,
                        });
                      }}
                      className="flex items-center gap-2.5 cursor-pointer group/user select-none"
                      title="Click to view public tech profile"
                    >
                      {rev.user_avatar ? (
                        <img
                          src={rev.user_avatar}
                          alt={rev.user_name || "Customer"}
                          className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-white/10 shadow-sm group-hover/user:ring-2 ring-[#8B1A1A]/40 transition-all"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center text-[12px] font-black shadow-sm group-hover/user:scale-105 transition-transform">
                          {(rev.user_name || "C")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-gray-900 dark:text-white leading-none group-hover/user:text-[#8B1A1A] dark:group-hover/user:text-red-400 group-hover/user:underline transition-colors">
                            {rev.user_name || "S Tech Customer"}
                          </span>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <span>{rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent Purchase"}</span>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-[#8B1A1A] dark:text-red-400 font-medium">View Profile</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex text-amber-400 text-xs">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} size={13} fill="currentColor" />
                      ))}
                    </div>
                  </div>

                  <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed pl-11">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-gray-500 py-6 text-center bg-gray-50/50 dark:bg-white/5 rounded-2xl">
              No reviews yet. Be the first to share your experience with this tech product!
            </div>
          )}
        </div>

            {/* Suggested Products with Luxury Styling and Zero Blank Cards */}
            {suggested.length > 0 && (
              <div className="bg-white dark:bg-[#151922] p-4 sm:p-6 mt-6 lg:rounded-3xl lg:shadow-md border border-gray-100 dark:border-white/10">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">You might also like</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Top related tech hardware & gear</p>
                  </div>
                  <span className="text-[11px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-200 dark:border-red-900/40">
                    Recommended
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
                  {suggested.map((item) => {
                    const itemImg = item.images?.[0] || item.image_url;
                    const hasValidImg = Boolean(itemImg && typeof itemImg === "string" && itemImg.startsWith("http"));
                    return (
                      <Link 
                        key={item.id} 
                        href={`/products/${item.slug}`} 
                        className="flex flex-col group p-3 rounded-2xl bg-gray-50/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-gray-200/70 dark:border-white/10 hover:border-red-300 dark:hover:border-red-500/40 transition-all shadow-xs hover:shadow-lg hover:-translate-y-1 no-underline"
                      >
                        <div className="h-36 sm:h-44 w-full bg-white dark:bg-[#12151e] rounded-xl overflow-hidden mb-3 p-2.5 relative flex items-center justify-center border border-gray-100 dark:border-white/5">
                          {hasValidImg ? (
                            <img 
                              src={itemImg} 
                              alt={item.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const parent = (e.currentTarget as HTMLElement).parentElement;
                                if (parent) {
                                  const fallback = parent.querySelector(".img-fallback");
                                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                                }
                              }}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                            />
                          ) : null}
                          <div 
                            className={`img-fallback w-full h-full ${hasValidImg ? 'hidden' : 'flex'} flex-col items-center justify-center text-gray-400 gap-1.5`}
                          >
                            <Laptop size={32} className="text-[#8B1A1A]/40" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">S Tech Device</span>
                          </div>
                          {item.sale_price && (
                            <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                              Sale
                            </div>
                          )}
                        </div>
                        <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug mb-2 group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 transition-colors">
                          {item.name}
                        </h3>
                        <div className="mt-auto flex items-baseline justify-between gap-1 pt-1">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-[#8B1A1A] dark:text-red-400 font-black text-sm font-mono">
                              {formatUSD(item.sale_price || item.price)}
                            </span>
                            {item.sale_price && (
                              <span className="text-gray-400 text-[10px] line-through font-mono">
                                {formatUSD(item.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

      </div>

      {/* Sticky Bottom Action Bar (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 flex h-[62px] lg:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        {/* Icons */}
        <div className="flex w-[38%] bg-white justify-evenly items-center px-1">
          <button onClick={() => router.push("/")} className="flex flex-col items-center justify-center text-gray-500 w-full gap-0.5 hover:text-gray-900 transition-colors">
            <Store size={20} />
            <span className="text-[9px]">Store</span>
          </button>
          <button 
            type="button"
            onClick={toggleWishlist} 
            className={`flex flex-col items-center justify-center w-full gap-0.5 active:scale-125 transition-transform ${isSaved ? 'text-[#e02e24]' : 'text-gray-500'}`}
          >
            <motion.div animate={{ scale: heartPulsing ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.3 }}>
              <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
            </motion.div>
            <span className="text-[9px]">{isSaved ? "Saved" : "Save"}</span>
          </button>
          <button onClick={() => setShowChatOptions(true)} className="flex flex-col items-center justify-center text-gray-500 w-full gap-0.5 hover:text-[#8B1A1A] transition-colors">
            <MessageCircle size={20} />
            <span className="text-[9px]">Chat</span>
          </button>
        </div>
        
        {/* Buttons */}
        <div className="flex w-[62%]">
          <button 
            onClick={handleAddToCart} 
            className="flex-1 bg-[#f89c9c] active:bg-[#f48484] text-white flex flex-col items-center justify-center leading-tight transition-colors cursor-pointer"
          >
            <span className="text-[11px] opacity-90">Est. {formatUSD(product.sale_price || product.price)}</span>
            <span className="text-[13px] font-bold">Add to Cart</span>
          </button>
          <button 
            onClick={handleBuyNow} 
            className="flex-1 bg-[#e02e24] active:bg-[#c82218] text-white flex flex-col items-center justify-center leading-tight transition-colors cursor-pointer shadow-sm"
          >
            <span className="text-[11px] opacity-90">Est. {formatUSD(product.sale_price || product.price)}</span>
            <span className="text-[13px] font-bold">Buy Now</span>
          </button>
        </div>
      </div>

      {/* Desktop Fixed Action Bar (Hidden on Mobile) */}
      <div className="hidden lg:flex fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#12151e]/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 z-50 h-[80px] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] items-center justify-center transition-colors">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <img src={images[0]} className="w-12 h-12 rounded-xl object-contain border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5" alt=""/>
             <div>
                <h3 className="text-[14px] font-bold text-gray-900 dark:text-white line-clamp-1">{product.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[#e02e24] dark:text-red-400 font-extrabold text-base font-mono">{formatUSD(hasSale ? activeSalePrice! : activeOriginalPrice)}</span>
                  {hasSale && (
                    <span className="text-gray-400 dark:text-gray-500 text-xs line-through font-mono">{formatUSD(activeOriginalPrice)}</span>
                  )}
                </div>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleWishlist}
              className={`p-3 rounded-full border transition-all cursor-pointer ${
                isSaved ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-[#e02e24] dark:text-red-400" : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
              title="Save to Wishlist"
            >
              <Heart size={20} fill={isSaved ? "currentColor" : "none"} className={heartPulsing ? "scale-125 transition-transform" : ""} />
            </button>
            <button 
              onClick={handleAddToCart} 
              className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-[#8B1A1A] dark:text-red-400 px-7 py-3 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Add to Cart
            </button>
            <button 
              onClick={handleBuyNow} 
              className="bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-red-600/20 active:scale-95 cursor-pointer border-none"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
      


      {/* Chat Options Modal - Elevated and Centered to Avoid Phone Bottom Bars */}
      <AnimatePresence>
        {showChatOptions && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#151922] w-full max-w-sm rounded-2xl p-6 relative shadow-2xl border border-gray-100 dark:border-white/10"
            >
              <button 
                onClick={() => setShowChatOptions(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-red-600 text-white flex items-center justify-center mx-auto mb-2.5 shadow-md">
                  <MessageCircle size={24} />
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Customer Support</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Connect directly with our tech team</p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowChatOptions(false);
                    window.open('https://t.me/S_TECH_ASSISTANTBOT', '_blank');
                  }} 
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 rounded-xl font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Send size={18} /> Chat via Telegram Bot
                </button>
                <button 
                  onClick={() => {
                    setShowChatOptions(false);
                    setShowChatBot(true);
                  }} 
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 rounded-xl font-bold transition-all border border-gray-200 dark:border-white/10 shadow-sm cursor-pointer"
                >
                  <MessageCircle size={18} className="text-[#8B1A1A] dark:text-red-400" /> Live Chat on Website
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120]"
          >
            <ChatBot 
              onClose={() => setShowChatBot(false)} 
              productInfo={{
                name: product.name,
                slug: product.slug,
                price: product.sale_price || product.price,
                image: images[0] || product.image_url,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Universal Direct-to-Post Social Share Modal with Live Preview */}
      <SocialShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        title={`${product.name} ${product.sale_price ? `($${product.sale_price})` : (product.price ? `($${product.price})` : "")}`}
        text={`ស្វែងរកទិញ ${product.name} ${product.sale_price ? `តម្លៃត្រឹមតែ $${product.sale_price}` : (product.price ? `តម្លៃត្រឹមតែ $${product.price}` : "")} ជាមួយការធានាផ្លូវការនៅ S Tech Store Cambodia! ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង`}
        url={typeof window !== "undefined" ? window.location.href : `https://www.s-tech-store.tech/products/${product.slug}`}
        imageUrl={images[activeImage] || images[0] || product.image_url}
      />

      {/* Public Profile View Modal */}
      <PublicProfileModal
        isOpen={Boolean(selectedProfileUser)}
        userId={selectedProfileUser?.id ?? null}
        fallbackName={selectedProfileUser?.name}
        fallbackAvatar={selectedProfileUser?.avatar}
        onClose={() => setSelectedProfileUser(null)}
      />
    </div>
  );
}
