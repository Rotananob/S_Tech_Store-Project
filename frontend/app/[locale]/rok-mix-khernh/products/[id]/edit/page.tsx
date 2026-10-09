"use client";
import React, { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { 
  Package, DollarSign, Image as ImageIcon, Link as LinkIcon, Star, X, Check, Globe, 
  ArrowLeft, CheckCircle2, Sparkles, Send, LayoutDashboard 
} from "lucide-react";

type Category = {
  id: number;
  name: string;
};

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // UX Modal state
  const [modalState, setModalState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [savingStep, setSavingStep] = useState<number>(1);
  const [savedProduct, setSavedProduct] = useState<any>(null);
  const [modalError, setModalError] = useState<string>("");

  // Categories from backend
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("1");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("Brand New");

  // Primary Image Address Link
  const [primaryImageUrl, setPrimaryImageUrl] = useState("");
  const [imagePreviewError, setImagePreviewError] = useState(false);

  type MediaItem = {
    id: string;
    type: "file" | "url";
    file?: File;
    url?: string;
    preview?: string;
  };
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  useEffect(() => {
    // 1. Fetch categories
    const fetchCats = async () => {
      try {
        setLoadingCats(true);
        const res = await api.get('/categories');
        const data: Category[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        setCategories([
          { id: 1, name: "Laptops" },
          { id: 2, name: "Smartphones" },
          { id: 3, name: "Accessories" },
          { id: 4, name: "CPU Processor" },
          { id: 5, name: "Motherboard" },
          { id: 6, name: "Memory" },
          { id: 7, name: "Graphics Card" },
          { id: 8, name: "Storage" },
          { id: 9, name: "Power Supply" },
          { id: 10, name: "PC Case" },
        ]);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCats();

    // 2. Fetch product details
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${params.id}`);
        const p = res.data;
        setName(p.name || "");
        setCategoryId(p.category_id?.toString() || "1");
        setPrice(p.price?.toString() || "");
        setStock(p.stock?.toString() || "");
        setDescription(p.description || "");
        setFeatured(p.is_featured || false);
        setBrand(p.brand || "");
        setCondition(p.condition || "Brand New");
        
        if (p.image_url) {
          setPrimaryImageUrl(p.image_url);
        }

        const existingMedia: MediaItem[] = [];
        if (p.images && Array.isArray(p.images) && p.images.length > 0) {
          p.images.forEach((img: string) => {
            existingMedia.push({ id: Math.random().toString(), type: "url", url: img });
          });
        }
        setMediaList(existingMedia);
      } catch (err) {
        showToast("Failed to fetch product data", "error");
      }
    };
    fetchProduct();
  }, [params.id]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!name.trim() || !price || !stock) {
      showToast("សូមបំពេញព័ត៌មានដែលចាំបាច់ (*) ឲ្យបានគ្រប់គ្រាន់", "error");
      return;
    }
    
    setModalState("saving");
    setSavingStep(1);

    try {
      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("name", name.trim());
      formData.append("category_id", categoryId);
      formData.append("price", price);
      formData.append("stock", stock);
      formData.append("description", description);
      formData.append("is_featured", featured ? "1" : "0");
      if (brand.trim()) formData.append("brand", brand.trim());
      if (condition.trim()) formData.append("condition", condition.trim());
      
      // Primary image URL
      if (primaryImageUrl.trim()) {
        formData.append("image_url", primaryImageUrl.trim());
        formData.append("image_urls[]", primaryImageUrl.trim());
      }

      // Additional media
      mediaList.forEach(item => {
        if (item.type === "file" && item.file) {
          formData.append("images[]", item.file);
        } else if (item.type === "url" && item.url && item.url.trim()) {
          formData.append("image_urls[]", item.url.trim());
        }
      });

      setSavingStep(2);

      const res = await api.post(`/products/${params.id}`, formData);
      const updatedData = res.data?.data || { name, price, stock };

      setSavingStep(3);
      setSavedProduct(updatedData);
      setModalState("success");
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || "បរាជ័យក្នុងការកែប្រែទំនិញ";
      setModalError(errorMsg);
      setModalState("error");
      showToast(errorMsg, "error");
    }
  };

  return (
    <div className="font-sans max-w-6xl mx-auto pb-12 relative">
      {/* UX Popup Modal for Updating Product */}
      {modalState !== "idle" && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            {modalState === "saving" && (
              <div className="flex flex-col items-center text-center py-4">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-red-100 border-t-[#8B1A1A] animate-spin flex items-center justify-center" />
                  <Package size={28} className="text-[#8B1A1A] absolute inset-0 m-auto" />
                </div>

                <h3 className="text-xl font-black text-gray-900 mb-2">
                  កំពុងត្រួតពិនិត្យ និងកែប្រែទំនិញ...
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-6 leading-relaxed max-w-sm">
                  សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងផ្ទៀងផ្ទាត់ទិន្នន័យ និងធ្វើបច្ចុប្បន្នភាពស្តុកក្នុង Cloud។
                </p>

                <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-2.5 text-xs text-left">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${savingStep >= 1 ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      ✓
                    </span>
                    <span className={savingStep >= 1 ? "font-bold text-gray-900" : "text-gray-400"}>
                      ផ្ទៀងផ្ទាត់ទិន្នន័យ និងតម្លៃថ្មី
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${savingStep >= 2 ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      {savingStep >= 2 ? "✓" : "2"}
                    </span>
                    <span className={savingStep >= 2 ? "font-bold text-gray-900" : "text-gray-400"}>
                      ធ្វើបច្ចុប្បន្នភាពរូបភាព និង PostgreSQL Cloud
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${savingStep >= 3 ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      {savingStep >= 3 ? "✓" : "3"}
                    </span>
                    <span className={savingStep >= 3 ? "font-bold text-gray-900" : "text-gray-400"}>
                      ធ្វើសមកាលកម្មទិន្នន័យក្នុងប្រព័ន្ធរួចរាល់
                    </span>
                  </div>
                </div>
              </div>
            )}

            {modalState === "success" && (
              <div className="flex flex-col items-center text-center py-2">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-inner animate-in zoom-in duration-300">
                  <CheckCircle2 size={44} />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black mb-2 border border-emerald-200">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>កែប្រែជោគជ័យ ១០០%</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
                  ទំនិញត្រូវបានធ្វើបច្ចុប្បន្នភាពរួចរាល់!
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-5 leading-relaxed">
                  ព័ត៌មានទំនិញ តម្លៃ និងស្តុកត្រូវបានធ្វើបច្ចុប្បន្នភាពក្នុងប្រព័ន្ធពិតប្រាកដ។
                </p>

                {/* Product Snapshot Card */}
                <div className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200/80 mb-5 flex items-center gap-3.5 text-left">
                  <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {savedProduct?.image_url || primaryImageUrl ? (
                      <img src={savedProduct?.image_url || primaryImageUrl} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-gray-900 truncate">
                      {savedProduct?.name || name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 font-mono">
                      តម្លៃ: <b className="text-emerald-700">${savedProduct?.price || price}</b> • ស្តុក: <b>{savedProduct?.stock || stock} គ្រឿង</b>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <button
                    onClick={() => router.push("/rok-mix-khernh/products")}
                    className="py-3 px-3 rounded-xl bg-[#8B1A1A] hover:bg-[#6B1010] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Package size={14} />
                    <span>មើលបញ្ជីទំនិញ</span>
                  </button>
                  <button
                    onClick={() => router.push("/rok-mix-khernh")}
                    className="py-3 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LayoutDashboard size={14} />
                    <span>ផ្ទាំងគ្រប់គ្រង</span>
                  </button>
                </div>
              </div>
            )}

            {modalState === "error" && (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                  <X size={32} />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">
                  បរាជ័យក្នុងការកែប្រែ
                </h3>
                <p className="text-xs text-red-600 mb-6 max-w-sm">
                  {modalError || "មានបញ្ហាបច្ចេកទេស សូមព្យាយាមម្តងទៀត។"}
                </p>
                <button
                  onClick={() => setModalState("idle")}
                  className="py-2.5 px-6 rounded-xl bg-gray-900 text-white text-xs font-bold cursor-pointer"
                >
                  បិទ និងសាកល្បងឡើងវិញ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      {/* Header section */}
      <div className="mb-6">
        <Link 
          href="/rok-mix-khernh/products" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-3 transition-colors no-underline group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>ត្រឡប់ទៅបញ្ជីទំនិញ</span>
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Edit Product</h1>
            <p className="text-gray-500 text-xs sm:text-sm">កែប្រែព័ត៌មានទំនិញ តម្លៃ ស្តុក និងរូបភាព</p>
          </div>
          <div className="flex gap-2.5 w-full md:w-auto">
            <Link 
              href="/rok-mix-khernh/products" 
              className="flex-1 md:flex-none text-center px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-colors no-underline shadow-xs"
            >
              Cancel
            </Link>
            <button 
              onClick={handleSave} 
              className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] active:scale-[0.98] text-white border border-transparent rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#8B1A1A]/20 cursor-pointer"
            >
              <Package size={16} />
              Save Product
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          {/* Basic Information */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Basic Information</h2>
            
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. ASUS ROG Strix G16" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select 
                  value={categoryId} 
                  onChange={e => setCategoryId(e.target.value)} 
                  disabled={loadingCats}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand / Manufacturer</label>
                <input 
                  type="text" 
                  value={brand} 
                  onChange={e => setBrand(e.target.value)} 
                  placeholder="e.g. ASUS, Apple, MSI" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Condition</label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value)}
                className="w-full sm:w-1/2 px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              >
                <option value="Brand New">Brand New (100% Genuine)</option>
                <option value="Like New (99%)">Like New (99%)</option>
                <option value="Second-Hand / Used">Second-Hand / Used</option>
                <option value="Refurbished">Refurbished</option>
              </select>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Pricing & Inventory</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Price (USD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={16} className="text-gray-400" />
                  </div>
                  <input 
                    type="number" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)} 
                    placeholder="0.00" 
                    step="0.01"
                    min="0"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  value={stock} 
                  onChange={e => setStock(e.target.value)} 
                  placeholder="0" 
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Description</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Description</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Enter a detailed description of the product specifications, warranty info, etc..." 
                className="w-full h-36 px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* Media / Image Address Link & Uploads */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Product Media</h2>
            <p className="text-xs text-gray-500 mb-4">
              Paste an image link address directly, or upload files to Cloudinary.
            </p>

            {/* Direct Image Link Address Section */}
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl mb-5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1.5">
                <Globe size={14} className="text-blue-600" />
                Primary Image Link Address
              </label>
              <p className="text-[11px] text-blue-700/80 mb-2">
                Paste any copied image address (Cloudinary, Google, CDN, or Web):
              </p>
              <input 
                type="url" 
                value={primaryImageUrl} 
                onChange={e => {
                  setPrimaryImageUrl(e.target.value);
                  setImagePreviewError(false);
                }} 
                placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..." 
                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-white" 
              />

              {primaryImageUrl.trim() && (
                <div className="mt-3 p-2 bg-white rounded-lg border border-blue-100 flex flex-col items-center">
                  <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <Check size={12} className="text-green-600" /> Live Preview
                  </div>
                  {!imagePreviewError ? (
                    <img 
                      src={primaryImageUrl.trim()} 
                      alt="Primary Preview" 
                      className="max-h-36 max-w-full object-contain rounded" 
                      onError={() => setImagePreviewError(true)} 
                    />
                  ) : (
                    <div className="text-[11px] text-red-500 py-3 text-center">
                      ⚠️ Could not load image from this URL. Please verify the link.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Additional Media Gallery */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Additional Gallery</h3>
              <div className="flex gap-1.5">
                <button 
                  type="button" 
                  onClick={() => setMediaList([...mediaList, { id: Math.random().toString(), type: "file" }])} 
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1"
                >
                  <ImageIcon size={12} /> + File
                </button>
                <button 
                  type="button" 
                  onClick={() => setMediaList([...mediaList, { id: Math.random().toString(), type: "url", url: "" }])} 
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1"
                >
                  <LinkIcon size={12} /> + URL
                </button>
              </div>
            </div>

            {mediaList.length === 0 && !primaryImageUrl && (
              <div className="py-8 px-4 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500">
                Paste an image link address above or click + File / + URL to attach gallery photos.
              </div>
            )}

            {mediaList.map((media, index) => (
              <div key={media.id} className="mb-3 p-3 border border-gray-200 rounded-lg relative bg-white shadow-xs">
                <button 
                  type="button" 
                  onClick={() => setMediaList(mediaList.filter(m => m.id !== media.id))} 
                  className="absolute top-2 right-2 w-5 h-5 bg-red-50 hover:bg-red-100 text-red-500 rounded-full flex items-center justify-center transition-colors" 
                  title="Remove Image"
                >
                  <X size={12} />
                </button>
                
                {media.type === "file" ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Upload File #{index + 1}</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0];
                          const newMediaList = [...mediaList];
                          if (newMediaList[index].preview) URL.revokeObjectURL(newMediaList[index].preview!);
                          newMediaList[index] = { ...newMediaList[index], file, preview: URL.createObjectURL(file) };
                          setMediaList(newMediaList);
                        }
                      }} 
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                    />
                    {media.preview && (
                      <div className="mt-2 p-1.5 bg-gray-50 border border-dashed border-gray-200 rounded flex justify-center">
                        <img src={media.preview} alt="Preview" className="max-h-24 object-contain rounded" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Image URL #{index + 1}</label>
                    <input 
                      type="url" 
                      value={media.url || ""} 
                      onChange={e => {
                        const newMediaList = [...mediaList];
                        newMediaList[index] = { ...newMediaList[index], url: e.target.value };
                        setMediaList(newMediaList);
                      }} 
                      placeholder="https://..." 
                      className="w-full pr-7 px-2.5 py-1.5 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                    />
                    {media.url && (
                      <div className="mt-2 p-1.5 bg-gray-50 border border-dashed border-gray-200 rounded flex justify-center">
                        <img 
                          src={media.url} 
                          alt="Preview" 
                          className="max-h-24 object-contain rounded" 
                          onError={(e) => (e.currentTarget.style.display = 'none')} 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Visibility */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Visibility</h2>
            
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex gap-3 items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${featured ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Star size={16} className={featured ? 'fill-amber-500 text-amber-500' : ''} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-0.5">Featured Product</div>
                  <div className="text-xs text-gray-500">Show on homepage</div>
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={() => setFeatured(!featured)} 
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${featured ? 'bg-[#991b1b]' : 'bg-gray-300'}`}
              >
                <div 
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${featured ? 'left-6' : 'left-1'}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
