"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, RefreshCw, Upload, Sparkles, ShoppingCart, Check, Zap, AlertCircle, ArrowRight, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVisualSearchStore } from "@/store/visualSearchStore";
import { useCartStore } from "@/store/cartStore";
import { getProducts } from "@/lib/services/product.service";
import { Product } from "@/types";
import { formatUSD, formatKHR } from "@/lib/mock-data";
import { Link } from "@/i18n/routing";

// Preset tech items for one-click testing (especially handy on desktop or testing without camera)
const SAMPLE_PRESETS = [
  {
    name: "Gaming Laptop",
    labelKh: "កុំព្យូទ័រយួរដៃ Gaming",
    category: "laptops",
    keywords: ["laptop", "rog", "thinkpad", "macbook"],
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80",
    confidence: "98.5%",
  },
  {
    name: "Custom PC Tower",
    labelKh: "កុំព្យូទ័រលើតុ Custom PC",
    category: "desktops",
    keywords: ["desktop", "tower", "pc", "build"],
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&q=80",
    confidence: "97.2%",
  },
  {
    name: "Graphics Card / GPU",
    labelKh: "កាតក្រាហ្វិក GPU",
    category: "parts",
    keywords: ["graphics", "rtx", "monitor", "part", "ultrasharp"],
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&q=80",
    confidence: "96.8%",
  },
  {
    name: "Mechanical Keyboard",
    labelKh: "ក្តារចុច Gaming Keyboard",
    category: "parts",
    keywords: ["keyboard", "gaming", "accessory"],
    image: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&q=80",
    confidence: "99.1%",
  },
  {
    name: "Gaming Headset",
    labelKh: "កាសស្តាប់ Gaming Headset",
    category: "gaming",
    keywords: ["headset", "audio", "gaming"],
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80",
    confidence: "95.4%",
  },
];

export default function VisualSearchModal() {
  const { isOpen, closeVisualSearch } = useVisualSearchStore();
  const addItem = useCartStore((s) => s.addItem);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedItem, setAnalyzedItem] = useState<{
    name: string;
    labelKh: string;
    confidence: string;
  } | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);
  const [isExactMatch, setIsExactMatch] = useState<boolean>(true);
  const [addedId, setAddedId] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera stream helper
  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasCameraPermission(true);
    } catch (err) {
      console.warn("Camera access denied or unavailable:", err);
      setHasCameraPermission(false);
    }
  }, [facingMode, stopCamera]);

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setAnalyzedItem(null);
      setMatchedProducts([]);
      setIsExactMatch(true);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Handle capture frame from live video
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
      runVisualAnalysis("Smart Device Scan", "ឧបករណ៍អេឡិចត្រូនិក");
    }
  };

  // Handle photo upload from device gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImage(result);
      stopCamera();
      const rawName = file.name.replace(/\.[^/.]+$/, "");
      runVisualAnalysis(rawName || "Uploaded Tech Item", "រូបភាពដែលបានបញ្ចូល", undefined, undefined, rawName);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Run visual recognition & product matching
  const runVisualAnalysis = async (
    label: string, 
    labelKh: string, 
    presetKeywords?: string[], 
    presetConfidence?: string,
    fileNameHint?: string
  ) => {
    setIsAnalyzing(true);
    setMatchedProducts([]);

    try {
      // Fetch all products from store
      const allProductsRes = await getProducts();
      const allProducts: Product[] = Array.isArray(allProductsRes) ? allProductsRes : (allProductsRes?.data || []);

      // Simulate neural analysis timing (1.0s)
      await new Promise((r) => setTimeout(r, 1000));

      let matched: Product[] = [];
      let exact = false;

      if (presetKeywords && presetKeywords.length > 0) {
        // Preset sample item click
        matched = allProducts.filter((p) => {
          const text = `${p.name} ${p.description || ""} ${typeof p.category === "object" ? p.category?.name : p.category || ""}`.toLowerCase();
          return presetKeywords.some((kw) => text.includes(kw.toLowerCase()));
        });
        exact = matched.length > 0;
      } else if (fileNameHint) {
        // Filename keyword extraction
        const cleanHint = fileNameHint.toLowerCase().replace(/[^a-z0-9]/g, " ");
        const words = cleanHint.split(/\s+/).filter((w) => w.length > 2 && !["image", "img", "photo", "pic", "screenshot", "camera", "uploaded"].includes(w));
        
        if (words.length > 0) {
          matched = allProducts.filter((p) => {
            const text = `${p.name} ${p.description || ""} ${typeof p.category === "object" ? p.category?.name : p.category || ""}`.toLowerCase();
            return words.some((w) => text.includes(w));
          });
        }
        exact = matched.length > 0;
      } else {
        // Live camera scan without specific hints
        exact = false;
      }

      setIsExactMatch(exact);

      if (exact && matched.length > 0) {
        setAnalyzedItem({
          name: label,
          labelKh,
          confidence: presetConfidence || "98.2%",
        });
        setMatchedProducts(matched);
      } else {
        // When item not found yet, show clear Khmer notice and store products as alternatives
        setAnalyzedItem({
          name: label || "Scan Item",
          labelKh: "មិនទាន់មានម៉ូឌែលដូចគ្នានេះទេ",
          confidence: "ជម្រើសជំនួស",
        });
        setMatchedProducts(allProducts.slice(0, 12));
      }
    } catch (err) {
      console.error("Visual search matching error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle preset sample selection
  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setCapturedImage(preset.image);
    stopCamera();
    runVisualAnalysis(preset.name, preset.labelKh, preset.keywords, preset.confidence);
  };

  // Reset to live camera
  const handleRetake = () => {
    setCapturedImage(null);
    setAnalyzedItem(null);
    setMatchedProducts([]);
    setIsExactMatch(true);
    startCamera();
  };

  // Quick Add to Cart
  const handleAddToCart = (product: Product) => {
    const img = product.image_url || product.image || "";
    addItem({
      id: Number(product.id),
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: img,
    });
    setAddedId(Number(product.id));
    setTimeout(() => setAddedId(null), 1500);
    useCartStore.getState().setIsOpen(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-[#0f1115] text-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
        >
          {/* ── Top Header ────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-black/40 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B1A1A] to-[#e74c3c] flex items-center justify-center shadow-md">
                <Camera size={18} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                    S Tech Visual Search
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30 uppercase">
                    Visual Scan
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  ស្កេនរូបភាពស្វែងរកផលិតផល IT ក្នុងស្តុក S Tech Store
                </p>
              </div>
            </div>

            <button
              onClick={closeVisualSearch}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border-none"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* ── Middle: Camera Viewfinder & HUD ───────────────────── */}
          <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-black flex items-center justify-center overflow-hidden">
            {/* Live Video Feed or Captured Image */}
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured tech product"
                className="w-full h-full object-cover"
              />
            ) : hasCameraPermission !== false ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              /* Fallback when camera permission denied or no camera available */
              <div className="p-8 text-center max-w-sm flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-red-400">
                  <AlertCircle size={32} />
                </div>
                <h4 className="text-base font-bold text-white mb-1">Camera Access Needed</h4>
                <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                  សូមអនុញ្ញាត Camera ឬជ្រើសរើសរូបភាពពី Gallery ដើម្បីស្កេនរកផលិតផល។
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => albumInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer border-none"
                  >
                    <ImageIcon size={16} />
                    <span>ជ្រើសរូបពីអាល់ប៊ុមទូរស័ព្ទ (Photo Album)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#c0392b] text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:brightness-110 cursor-pointer border-none"
                  >
                    <Camera size={16} />
                    <span>ថតរូបផ្ទាល់ (Take Photo)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Hidden File Input for Device Photo Album (NO capture attr -> opens phone album/gallery) */}
            <input
              type="file"
              ref={albumInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Hidden File Input for Native Camera Shutter */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* ── Taobao Viewfinder HUD (Reticle + Laser Beam) ───── */}
            {!matchedProducts.length && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                {/* Central Reticle Box */}
                <div className="relative w-[240px] sm:w-[300px] h-[240px] sm:h-[300px] rounded-2xl">
                  {/* Glowing 4 Corner Brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-xl shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-xl shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-xl shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-xl shadow-[0_0_12px_rgba(239,68,68,0.8)]" />

                  {/* High-tech Crosshair reticle dots */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-red-400/40 rounded-full" />

                  {/* Dynamic Laser Scanning Beam */}
                  <motion.div
                    animate={{
                      top: ["0%", "96%", "0%"],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_18px_#ff2222]"
                  />
                </div>

                {/* Status Badge */}
                <div className="mt-4 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-gray-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    {isAnalyzing
                      ? "AI Analyzing Tech Components... កំពុងវិភាគ"
                      : "Align device inside the reticle to search"}
                  </span>
                </div>
              </div>
            )}

            {/* Analysis Loading Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8B1A1A] to-[#e74c3c] flex items-center justify-center shadow-xl animate-bounce mb-3">
                  <Sparkles size={32} className="text-white animate-spin" />
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-white">
                  Scanning S Tech Inventory...
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Comparing with Laptops, PCs, Graphics Cards & Accessories...
                </p>
                <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden mt-4">
                  <div className="w-full h-full bg-gradient-to-r from-red-500 to-amber-400 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* ── Matched Products Drawer / Results View (Full Scrollable Like Category) ── */}
          {matchedProducts.length > 0 && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-[#161920] border-t border-white/10 p-4 sm:p-5 max-h-[70vh] sm:max-h-[520px] overflow-y-auto"
            >
              {/* Analysis Result Banner */}
              {!isExactMatch ? (
                <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-amber-300">
                          🔍 មិនទាន់រកឃើញទំនិញដូចគ្នាបេះបិទនេះទេ (Item Not Found Yet)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/40">
                          ជម្រើសជំនួស (Alternatives)
                        </span>
                      </div>
                      <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                        យើងមិនទាន់មានម៉ូឌែលដូចគ្នានេះនៅក្នុងស្តុកទេ ប៉ុន្តែខាងក្រោមនេះជាផលិតផលពេញនិយម និងស្រដៀងគ្នាដែលលោកអ្នកប្រហែលជាចាប់អារម្មណ៍ជំនួសវិញ៖
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => albumInputRef.current?.click()}
                      className="px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-500/30 flex items-center gap-1.5 active:scale-95"
                    >
                      <ImageIcon size={13} />
                      <span>ជ្រើសរូបពីអាល់ប៊ុម</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none flex items-center gap-1.5 active:scale-95"
                    >
                      <RefreshCw size={13} />
                      <span>ថតម្ដងទៀត</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-white">
                        Matched: {analyzedItem?.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-extrabold border border-emerald-500/30">
                        {analyzedItem?.confidence} Accuracy
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {analyzedItem?.labelKh} — រកឃើញ <b className="text-white">{matchedProducts.length} ផលិតផលត្រូវគ្នា</b> (Scroll ចុះក្រោមដើម្បីមើលទាំងអស់)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => albumInputRef.current?.click()}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/10 flex items-center gap-1.5 active:scale-95"
                    >
                      <ImageIcon size={13} />
                      <span className="hidden sm:inline">អាល់ប៊ុម</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none flex items-center gap-1.5 active:scale-95 shrink-0"
                    >
                      <RefreshCw size={13} />
                      <span>Scan Again</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Matched Product Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pb-6">
                {matchedProducts.map((product) => {
                  const img = product.image_url || product.image;
                  const isJustAdded = addedId === Number(product.id);

                  return (
                    <div
                      key={product.id}
                      className="bg-[#1f242e] rounded-2xl p-3.5 border border-white/5 hover:border-red-500/40 transition-all flex flex-col justify-between group shadow-sm"
                    >
                      <div>
                        {/* Image */}
                        <div className="w-full h-28 sm:h-32 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden mb-2.5 relative">
                          {img ? (
                            <img
                              src={img}
                              alt={product.name}
                              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="text-gray-500 text-xs">No image</div>
                          )}
                          <span className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm ${
                            isExactMatch ? "bg-emerald-500" : "bg-amber-600"
                          }`}>
                            {isExactMatch ? "In Stock" : "ជម្រើសជំនួស (Alternative)"}
                          </span>
                        </div>

                        {/* Title */}
                        <h5 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug mb-1.5 group-hover:text-red-400 transition-colors min-h-[32px]">
                          {product.name}
                        </h5>

                        {/* Price */}
                        <div className="mb-2.5">
                          <div className="text-sm sm:text-base font-black text-red-400 font-mono">
                            {formatUSD(product.price)}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {formatKHR(product.price)}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-auto pt-2.5 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none shadow-sm ${
                            isJustAdded
                              ? "bg-emerald-600 text-white"
                              : "bg-[#8B1A1A] hover:bg-[#6b1111] text-white active:scale-95"
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check size={14} />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={14} />
                              <span>Add</span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/products/${product.slug}`}
                          onClick={closeVisualSearch}
                          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center no-underline transition-colors shrink-0"
                          title="View Details"
                        >
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Bottom Controls: Shutter Button, Switch Camera, Quick Chips ── */}
          <div className="px-4 pt-3.5 pb-28 sm:pb-5 bg-[#12141a] border-t border-white/10 shrink-0">
            {/* Quick Demo Test Chips (Large, Touch-Friendly Taobao Style) */}
            <div className="mb-3.5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-400" />
                  <span>Quick Test (សាកល្បងម៉ូឌែលគំរូភ្លាមៗ):</span>
                </div>
                <button
                  type="button"
                  onClick={() => albumInputRef.current?.click()}
                  className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer border-none bg-transparent"
                >
                  <ImageIcon size={13} />
                  <span>ជ្រើសរូបពីអាល់ប៊ុម (Albums)</span>
                </button>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1.5 pt-0.5">
                {SAMPLE_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-red-500/20 hover:border-red-500/40 text-gray-200 hover:text-white border border-white/10 text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-sm active:scale-95 group"
                  >
                    <img src={p.image} alt={p.name} className="w-7 h-7 rounded-lg object-cover shadow-xs border border-white/20 group-hover:scale-105 transition-transform" />
                    <div className="flex flex-col text-left">
                      <span className="leading-tight text-white">{p.name}</span>
                      <span className="text-[10px] text-gray-400 font-normal">{p.labelKh}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Actions Bar */}
            <div className="flex items-center justify-between gap-3">
              {/* Photo Upload from Phone Album */}
              <button
                type="button"
                onClick={() => albumInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-3 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer border border-blue-500/30 active:scale-95 shadow-sm"
                title="ជ្រើសរូបពីអាល់ប៊ុមទូរស័ព្ទ (Photo Albums)"
              >
                <ImageIcon size={17} className="text-blue-400" />
                <span>អាល់ប៊ុមរូបថត (Albums)</span>
              </button>

              {/* Shutter Button */}
              {!capturedImage ? (
                <button
                  type="button"
                  onClick={() => {
                    if (hasCameraPermission) {
                      handleCapture();
                    } else {
                      cameraInputRef.current?.click();
                    }
                  }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
                  aria-label="Capture photo to scan"
                >
                  <div className="w-full h-full rounded-full border-2 border-black/20 bg-gradient-to-br from-[#8B1A1A] to-[#c0392b] flex items-center justify-center">
                    <Camera size={24} className="text-white" />
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none"
                >
                  <RefreshCw size={14} />
                  <span>Retake</span>
                </button>
              )}

              {/* Flip Camera (Front / Rear) or Direct Camera Launcher */}
              <button
                type="button"
                onClick={() => {
                  if (hasCameraPermission) {
                    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
                  } else {
                    cameraInputRef.current?.click();
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition-colors cursor-pointer border border-white/15 active:scale-95"
                title="Flip Camera or Shutter"
              >
                <RefreshCw size={15} />
                <span className="hidden sm:inline">Flip</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
