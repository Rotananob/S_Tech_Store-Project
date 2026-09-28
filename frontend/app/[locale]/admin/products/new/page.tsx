"use client";
import React, { useState } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { Package, DollarSign, Image as ImageIcon, Link as LinkIcon, Star, X } from "lucide-react";

export default function AddNewProductPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("1"); // Default to Laptops
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);

  type MediaItem = {
    id: string;
    type: "file" | "url";
    file?: File;
    url?: string;
    preview?: string;
  };
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

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
      formData.append("name", name);
      formData.append("category_id", categoryId);
      formData.append("price", price);
      formData.append("stock", stock);
      formData.append("description", description);
      formData.append("is_featured", featured ? "1" : "0");
      
      mediaList.forEach(item => {
        if (item.type === "file" && item.file) {
          formData.append("images[]", item.file);
        } else if (item.type === "url" && item.url) {
          formData.append("image_urls[]", item.url);
        }
      });

      await api.post("/products", formData);

      showToast("Product saved successfully! Redirecting...");
      setTimeout(() => {
        router.push("/admin/products");
      }, 1500);
    } catch (e) {
      showToast("Failed to save product", "error");
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Add New Product</h1>
          <p className="text-gray-500 text-sm">Fill in the details below to add a new item to the inventory.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link 
            href="/admin/products" 
            className="flex-1 md:flex-none text-center px-6 py-2.5 bg-white text-blue-700 border border-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            Cancel
          </Link>
          <button 
            onClick={handleSave} 
            className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] text-white border border-transparent rounded-lg text-sm font-medium transition-colors"
          >
            <Package size={16} />
            Save Product
          </button>
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
            
            <div className="mb-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select 
                value={categoryId} 
                onChange={e => setCategoryId(e.target.value)} 
                className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              >
                <option value="1">Laptops</option>
                <option value="2">Smartphones</option>
                <option value="3">Accessories</option>
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
                placeholder="Enter a detailed description of the product..." 
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* Media */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">Media</h2>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setMediaList([...mediaList, { id: Math.random().toString(), type: "file" }])} 
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1"
                >
                  <ImageIcon size={12} /> Add File
                </button>
                <button 
                  type="button" 
                  onClick={() => setMediaList([...mediaList, { id: Math.random().toString(), type: "url", url: "" }])} 
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1"
                >
                  <LinkIcon size={12} /> Add URL
                </button>
              </div>
            </div>

            {mediaList.length === 0 && (
              <div className="py-10 px-4 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500">
                No media added. Click the buttons above to add images.
              </div>
            )}

            {mediaList.map((media, index) => (
              <div key={media.id} className="mb-4 p-4 border border-gray-200 rounded-lg relative bg-white">
                <button 
                  type="button"
                  onClick={() => setMediaList(mediaList.filter(m => m.id !== media.id))}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-50 hover:bg-red-100 text-red-500 rounded-full flex items-center justify-center transition-colors"
                  title="Remove Image"
                >
                  <X size={14} />
                </button>
                
                {media.type === "file" ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Upload File {index + 1}</label>
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
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                    />
                    {media.preview && (
                      <div className="mt-3 p-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex justify-center">
                        <img src={media.preview} alt="Preview" className="max-w-full max-h-32 object-contain rounded" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Image URL {index + 1}</label>
                    <input 
                      type="text" 
                      value={media.url || ""} 
                      onChange={e => {
                        const newMediaList = [...mediaList];
                        newMediaList[index] = { ...newMediaList[index], url: e.target.value };
                        setMediaList(newMediaList);
                      }} 
                      placeholder="https://..." 
                      className="w-full pr-8 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                    />
                    {media.url && (
                      <div className="mt-3 p-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex justify-center">
                        <img 
                          src={media.url} 
                          alt="Preview" 
                          className="max-w-full max-h-32 object-contain rounded" 
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
