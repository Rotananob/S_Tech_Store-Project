"use client";
import React, { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { Package, DollarSign, Image as ImageIcon, Link as LinkIcon, Star, X, Check, Globe, ArrowLeft } from "lucide-react";

type Category = {
  id: number;
  name: string;
};

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
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
          { id: 6, name: "Memory (RAM)" },
          { id: 7, name: "Graphics Card" },
          { id: 8, name: "Storage (SSD/HDD)" },
          { id: 9, name: "Power Supply (PSU)" },
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
            // If it's different from primary, or add all
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
      showToast("Please fill in all required fields (*).", "error");
      return;
    }
    
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

      await api.post(`/products/${params.id}`, formData);

      showToast("Product saved successfully! Redirecting...");
      setTimeout(() => {
        router.push("/stech-hq-portal/products");
      }, 1500);
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || "Failed to save product";
      showToast(errorMsg, "error");
      console.error(e);
    }
  };

  return (
    <div className="font-sans max-w-6xl mx-auto pb-12">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      {/* Header section */}
      <div className="mb-6">
        <Link 
          href="/stech-hq-portal/products" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-3 transition-colors no-underline group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>ត្រឡប់ទៅបញ្ជីទំនិញ (Back to Products)</span>
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Edit Product</h1>
            <p className="text-gray-500 text-xs sm:text-sm">កែប្រែព័ត៌មានទំនិញ តម្លៃ ស្តុក និងរូបភាព (Update product details, pricing, and stock).</p>
          </div>
          <div className="flex gap-2.5 w-full md:w-auto">
            <Link 
              href="/stech-hq-portal/products" 
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
