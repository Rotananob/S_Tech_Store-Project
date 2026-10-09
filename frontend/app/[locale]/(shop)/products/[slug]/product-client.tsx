"use client";

import { useState, useEffect } from "react";
import ChatBot from "@/components/ui/ChatBot";
import { Link, useRouter } from "@/i18n/routing";
import { ShoppingCart, ChevronLeft, ChevronRight, Heart, MessageCircle, Store, Share, CheckCircle2, MapPin, X, Copy, Send, Image as ImageIcon, Star, Sparkles, ThumbsUp } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { useCartStore } from "@/store/cartStore";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { triggerFlyToCart } from "@/lib/flyToCart";
import { auth } from "@/lib/firebase";
import { submitProductReview } from "@/lib/services/product.service";

export function ProductDetailClient({ product }: { product: any }) {
  const [activeImage, setActiveImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [heartPulsing, setHeartPulsing] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);

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
    if (e) {
      triggerFlyToCart(e.currentTarget as HTMLElement, images[activeImage] || product.image_url);
    }
    addItemToCart({
      id: product.id,
      name: product.name,
      price: product.sale_price || product.price,
      quantity: 1,
      image_url: product.image_url,
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
    triggerFlyToCart(e.currentTarget as HTMLElement, images[activeImage] || product.image_url);
    addItemToCart({
      id: product.id,
      name: product.name,
      price: product.sale_price || product.price,
      quantity: 1,
      image_url: product.image_url,
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

            {/* Reviews Section with Real User Profiles & Submission Form */}
            <div className="bg-white p-4 sm:p-5 mb-2 lg:rounded-2xl lg:shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900">
                    Item Reviews ({reviews.length > 0 ? reviews.length : (product.reviews || 0)})
                  </h2>
                  <div className="flex items-center text-amber-400 text-xs gap-0.5">
                    <Star size={13} fill="currentColor" />
                    <span className="font-bold text-gray-800 text-xs ml-0.5">
                      {reviews.length > 0 
                        ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
                        : (product.rating || "4.9")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="text-[#8B1A1A] hover:text-[#a02222] text-[12px] font-bold flex items-center gap-1 transition-colors px-3 py-1 rounded-full bg-red-50 hover:bg-red-100/80 cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>{showReviewForm ? "Cancel" : "Write Review"}</span>
                </button>
              </div>

              {reviewSubmitted && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Review published successfully! Thank you for your feedback.</span>
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
                    className="mb-4 p-4 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Your Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRatingInput(star)}
                            className="p-1 hover:scale-125 transition-transform cursor-pointer text-amber-400"
                          >
                            <Star size={18} fill={star <= ratingInput ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Share your experience with this tech product (quality, performance, packaging)..."
                      rows={3}
                      required
                      className="w-full text-xs p-3 rounded-lg border border-gray-200 bg-white focus:border-[#8B1A1A] outline-none transition-all resize-none"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReview || !commentInput.trim()}
                        className="px-4 py-1.5 bg-[#8B1A1A] hover:bg-[#a02222] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        {isSubmittingReview ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Posting...</span>
                          </>
                        ) : (
                          <>
                            <Send size={12} />
                            <span>Post Review</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                <span className="bg-[#fff0f0] text-[#e02e24] px-3 py-1 rounded-full text-[11px] font-bold">★ Verified Buyers</span>
                <span className="bg-[#f5f5f5] text-gray-700 px-3 py-1 rounded-full text-[11px]">Recommended</span>
                <span className="bg-[#f5f5f5] text-gray-700 px-3 py-1 rounded-full text-[11px]">High Quality</span>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-3.5 divide-y divide-gray-100">
                  {reviews.map((rev) => (
                    <div key={rev.id || Math.random()} className="pt-3 first:pt-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          {rev.user_avatar ? (
                            <img
                              src={rev.user_avatar}
                              alt={rev.user_name || "Customer"}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center text-[11px] font-black shadow-sm">
                              {(rev.user_name || "C")[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-bold text-gray-900 leading-none">
                                {rev.user_name || "S Tech Customer"}
                              </span>
                              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <CheckCircle2 size={10} /> Verified
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent Purchase"}
                            </span>
                          </div>
                        </div>

                        <div className="flex text-amber-400 text-xs">
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} size={13} fill="currentColor" />
                          ))}
                        </div>
                      </div>

                      <p className="text-[13px] text-gray-700 whitespace-pre-line leading-relaxed pl-10">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                product.reviews > 0 ? (
                  <div className="border-b border-gray-50 pb-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-600">S</div>
                      <span className="text-[13px] font-bold text-gray-800">S Tech User</span>
                    </div>
                    <div className="flex text-amber-400 text-xs mb-1">★★★★★</div>
                    <p className="text-[13px] text-gray-600 line-clamp-2">
                      Excellent product! Arrived in perfect condition with official warranty.
                    </p>
                  </div>
                ) : (
                  <div className="text-[13px] text-gray-500 py-3 text-center">No reviews yet. Be the first to share your experience!</div>
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
      <div className="hidden lg:flex fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 h-[80px] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] items-center justify-center">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <img src={images[0]} className="w-12 h-12 rounded-xl object-contain border border-gray-100 bg-gray-50" alt=""/>
             <div>
                <h3 className="text-[14px] font-bold text-gray-900 line-clamp-1">{product.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[#e02e24] font-extrabold text-base">{formatUSD(product.sale_price || product.price)}</span>
                  {product.sale_price && (
                    <span className="text-gray-400 text-xs line-through">{formatUSD(product.price)}</span>
                  )}
                </div>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleWishlist}
              className={`p-3 rounded-full border transition-all cursor-pointer ${
                isSaved ? "bg-red-50 border-red-200 text-[#e02e24]" : "border-gray-200 text-gray-500 hover:text-gray-800"
              }`}
              title="Save to Wishlist"
            >
              <Heart size={20} fill={isSaved ? "currentColor" : "none"} className={heartPulsing ? "scale-125 transition-transform" : ""} />
            </button>
            <button 
              onClick={handleAddToCart} 
              className="bg-[#f89c9c] text-white px-8 py-3 rounded-full font-bold hover:bg-[#f48484] transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
            >
              Add to Cart
            </button>
            <button 
              onClick={handleBuyNow} 
              className="bg-[#e02e24] text-white px-8 py-3 rounded-full font-bold hover:bg-[#c82218] transition-all shadow-md shadow-red-600/20 active:scale-95 cursor-pointer"
            >
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
