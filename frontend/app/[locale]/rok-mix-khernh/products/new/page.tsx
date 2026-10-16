"use client";
import React, { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { invalidateProductCache } from "@/lib/services/product.service";
import {
  Package,
  DollarSign,
  Image as ImageIcon,
  Link as LinkIcon,
  Star,
  X,
  Check,
  Globe,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Send,
  PlusCircle,
  LayoutDashboard,
  UploadCloud,
  Copy,
  Layers,
  Tag,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Clock,
  Trash2,
  Pin,
  Loader2,
} from "lucide-react";

type Category = {
  id: number;
  name: string;
  slug?: string;
};

type MediaItem = {
  id: string;
  type: "file" | "url";
  file?: File;
  url?: string;
  preview?: string;
};

const BRAND_SUGGESTIONS = [
  "Apple",
  "ASUS",
  "MSI",
  "Lenovo",
  "Dell",
  "Acer",
  "Razer",
  "Logitech",
  "Samsung",
  "Corsair",
  "Gigabyte",
];

export default function AddNewProductPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // UX Modal state for validating, saving, and instant success confirmation
  const [modalState, setModalState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [isSaving, setIsSaving] = useState(false);
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
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("Brand New");
  const [badge, setBadge] = useState("");

  // Primary Image: Support direct URL OR uploaded file
  const [primaryImageMode, setPrimaryImageMode] = useState<"url" | "file">("url");
  const [primaryImageUrl, setPrimaryImageUrl] = useState("");
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [primaryImagePreview, setPrimaryImagePreview] = useState<string | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Additional Media Gallery
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoadingCats(true);
        const res = await api.get("/categories");
        const data: Category[] = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (data.length > 0) {
          setCategories(data);
          setCategoryId(data[0].id.toString());
        }
      } catch (err) {
        // Fallback default categories (all Shop by Category & PC Components)
        setCategories([
          { id: 1, name: "Laptops (កុំព្យូទ័រយួរដៃ)", slug: "laptops" },
          { id: 4, name: "Desktops (កុំព្យូទ័រលើតុ & Custom PC)", slug: "desktops" },
          { id: 5, name: "Components (គ្រឿងបន្លាស់)", slug: "parts" },
          { id: 6, name: "Gaming Gear (ឧបករណ៍ហ្គេម)", slug: "gaming" },
          { id: 7, name: "Monitors (អេក្រង់)", slug: "monitors" },
          { id: 3, name: "Accessories (គ្រឿងបន្ថែម)", slug: "accessories" },
          { id: 8, name: "Second-Hand (ទំនិញមួយទឹក)", slug: "secondhand" },
          { id: 9, name: "Services (សេវាកម្មជួសជុល)", slug: "services" },
          { id: 10, name: "CPU Processor", slug: "cpu" },
          { id: 11, name: "Motherboard", slug: "motherboard" },
          { id: 12, name: "Memory (RAM)", slug: "ram" },
          { id: 13, name: "Graphics Card (GPU)", slug: "gpu" },
          { id: 14, name: "Storage (SSD/HDD)", slug: "storage" },
          { id: 15, name: "Power Supply (PSU)", slug: "psu" },
          { id: 16, name: "PC Case", slug: "case" },
        ]);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCats();
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleResetForm = () => {
    setName("");
    setPrice("");
    setSalePrice("");
    setStock("");
    setDescription("");
    setFeatured(false);
    setPinned(false);
    setBrand("");
    setCondition("Brand New");
    setBadge("");
    setPrimaryImageUrl("");
    if (primaryImagePreview) URL.revokeObjectURL(primaryImagePreview);
    setPrimaryImageFile(null);
    setPrimaryImagePreview(null);
    setMediaList([]);
    setModalState("idle");
    setSavedProduct(null);
    showToast("បានសម្អាតទម្រង់ជោគជ័យ!");
  };

  const handleCategorySelect = (idStr: string) => {
    setCategoryId(idStr);
    const selectedCat = categories.find((c) => c.id.toString() === idStr);
    if (
      selectedCat &&
      (selectedCat.slug === "secondhand" ||
        selectedCat.name.toLowerCase().includes("second") ||
        selectedCat.name.includes("មួយទឹក"))
    ) {
      setCondition("Second-Hand / Used");
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
        setPrimaryImageUrl(text.trim());
        setImagePreviewError(false);
        showToast("បានបិទភ្ជាប់ Link រូបភាពជោគជ័យ!");
      } else {
        showToast("Clipboard មិនមែនជា Link URL រូបភាពឡើយ", "error");
      }
    } catch {
      showToast("មិនអាចទាញយក Link ពី Clipboard បានទេ", "error");
    }
  };

  const handleSave = async () => {
    const cleanPrice = price.trim().replace(/[^0-9.]/g, "");
    const cleanSalePrice = salePrice.trim().replace(/[^0-9.]/g, "");

    if (!name.trim()) {
      showToast("សូមបញ្ចូលឈ្មោះផលិតផល (Product Name)", "error");
      return;
    }
    if (!cleanPrice || isNaN(Number(cleanPrice)) || Number(cleanPrice) <= 0) {
      showToast("សូមបញ្ចូលតម្លៃលក់ត្រឹមត្រូវ (Price)", "error");
      return;
    }
    if (stock === "" || isNaN(Number(stock)) || Number(stock) < 0) {
      showToast("សូមបញ្ចូលចំនួនស្តុក (Stock Quantity)", "error");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("category_id", categoryId);
      formData.append("price", cleanPrice);
      formData.append("stock", String(Math.max(0, parseInt(stock, 10))));
      
      if (cleanSalePrice) {
        formData.append("sale_price", cleanSalePrice);
      } else {
        formData.append("sale_price", "");
      }

      formData.append("description", description);
      formData.append("is_featured", featured ? "1" : "0");
      formData.append("pinned_to_top", pinned ? "1" : "0");
      if (brand.trim()) formData.append("brand", brand.trim());
      if (condition.trim()) formData.append("condition", condition.trim());
      if (badge.trim()) formData.append("badge", badge.trim());

      // 1. Primary Image
      if (primaryImageMode === "file" && primaryImageFile) {
        formData.append("image", primaryImageFile);
      } else if (primaryImageUrl.trim()) {
        formData.append("image_url", primaryImageUrl.trim());
        formData.append("image_urls[]", primaryImageUrl.trim());
      }

      // 2. Additional media files or URLs
      mediaList.forEach((item) => {
        if (item.type === "file" && item.file) {
          formData.append("images[]", item.file);
        } else if (item.type === "url" && item.url && item.url.trim()) {
          formData.append("image_urls[]", item.url.trim());
        }
      });

      const res = await api.post("/products", formData);
      const createdData = res.data?.data || res.data || { 
        name: name.trim(), 
        price: cleanPrice, 
        sale_price: cleanSalePrice || null, 
        stock: parseInt(stock, 10),
        badge: badge.trim() || null,
        brand: brand.trim() || null
      };

      setSavedProduct(createdData);
      invalidateProductCache(createdData);
      showToast("✓ បានបញ្ចូលទំនិញថ្មីជោគជ័យ!", "success");
      setModalState("success");
    } catch (e: any) {
      const errorMsg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        "បរាជ័យក្នុងការរក្សាទុកទំនិញ សូមពិនិត្យព័ត៌មានម្តងទៀត";
      setModalError(errorMsg);
      setModalState("error");
      showToast(errorMsg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const khrEquivalent =
    price && !isNaN(Number(price)) && Number(price) > 0
      ? Math.round(Number(price) * 4100).toLocaleString()
      : null;

  // Curated Popular Shop By Category items for quick chips
  const shopByCategories = categories.filter((c) =>
    [
      "laptops",
      "desktops",
      "parts",
      "gaming",
      "monitors",
      "accessories",
      "secondhand",
      "services",
    ].includes(c.slug || "")
  );

  const pcComponents = categories.filter((c) =>
    ["cpu", "motherboard", "ram", "gpu", "storage", "psu", "case"].includes(c.slug || "")
  );

  return (
    <div className="font-sans max-w-6xl mx-auto pb-36 sm:pb-20 relative">
      {/* ─── UX Popup Modal for Adding Product ─── */}
      {modalState !== "idle" && modalState !== "saving" && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 duration-200">
            {modalState === "success" && (
              <div className="flex flex-col items-center text-center py-2">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-inner animate-in zoom-in duration-300">
                  <CheckCircle2 size={44} />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black mb-2 border border-emerald-200">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>រក្សាទុកជោគជ័យ ១០០%</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
                  ទំនិញត្រូវបានបន្ថែមជោគជ័យ!
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-5 leading-relaxed">
                  ទំនិញថ្មីត្រូវបានដាក់បញ្ចូលទៅក្នុងស្តុក និងបានផ្សព្វផ្សាយជាសាធារណៈលើគេហទំព័ររួចរាល់។
                </p>

                {/* Product Snapshot Card */}
                <div className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200/80 mb-5 flex items-center gap-3.5 text-left">
                  <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {savedProduct?.image_url || primaryImageUrl || primaryImagePreview ? (
                      <img
                        src={savedProduct?.image_url || primaryImageUrl || primaryImagePreview || ""}
                        alt="Product"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-gray-900 truncate">
                      {savedProduct?.name || name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 font-mono">
                      តម្លៃ: <b className="text-emerald-700">${savedProduct?.price || price}</b> •
                      ស្តុក: <b>{savedProduct?.stock || stock} គ្រឿង</b>
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 mt-1">
                      <Send size={10} /> បានធ្វើបច្ចុប្បន្នភាពទិន្នន័យលើគេហទំព័រ
                    </div>
                  </div>
                </div>

                {/* Quick Navigation Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => router.push("/rok-mix-khernh/products")}
                    className="py-3 px-3 rounded-xl bg-[#8B1A1A] hover:bg-[#6B1010] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Package size={14} />
                    <span>មើលបញ្ជីទំនិញ</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="py-3 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle size={14} />
                    <span>បន្ថែមទំនិញទៀត</span>
                  </button>
                  <button
                    type="button"
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
                <h3 className="text-lg font-black text-gray-900 mb-2">បរាជ័យក្នុងការរក្សាទុក</h3>
                <p className="text-xs text-red-600 mb-6 max-w-sm">
                  {modalError || "មានបញ្ហាបច្ចេកទេស សូមព្យាយាមម្តងទៀត។"}
                </p>
                <button
                  type="button"
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

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-xl font-semibold text-xs sm:text-sm text-white flex items-center gap-2 ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          } transition-opacity`}
        >
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── Top Header Section ─── */}
      <div className="mb-7">
        <Link
          href="/rok-mix-khernh/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-3 transition-colors no-underline group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>ត្រឡប់ទៅបញ្ជីទំនិញ (Back to Products)</span>
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
                Add New Product
              </h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold">
                បន្ថែមទំនិញថ្មី
              </span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              បំពេញព័ត៌មានលម្អិត តម្លៃ ស្តុក និងរូបភាពដើម្បីផ្សព្វផ្សាយទំនិញលើគេហទំព័រ
            </p>
          </div>

          {/* Top Action Buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <Link
              href="/rok-mix-khernh/products"
              className="flex-1 md:flex-none text-center px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold transition-all no-underline cursor-pointer"
            >
              Cancel (បោះបង់)
            </Link>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#8B1A1A] via-red-700 to-rose-600 hover:from-[#6B1010] hover:to-red-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-red-900/20 cursor-pointer"
            >
              <Package size={16} />
              <span>Save Product (រក្សាទុក)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Form Grid ─── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Core Product Info (2/3) */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          {/* 1. Basic Information */}
          <div className="bg-white p-5 sm:p-7 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#8B1A1A] flex items-center justify-center font-bold">
                <Package size={17} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  ព័ត៌មានផលិតផល (Basic Information)
                </h2>
                <p className="text-[11px] text-gray-400">ឈ្មោះ ម៉ាក ប្រភេទ និងស្ថានភាពទំនិញ</p>
              </div>
            </div>

            {/* Product Name */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Product Name (ឈ្មោះទំនិញ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ឧ. ASUS ROG Strix G16 (2026), MacBook Pro M3..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#8B1A1A] transition-all font-medium text-gray-900 bg-gray-50/30 focus:bg-white"
              />
            </div>

            {/* Category Section with Quick Select Chips */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Category (ប្រភេទផលិតផល) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">ចុចជ្រើសរើស ឬរើសពី Dropdown</span>
              </div>

              {/* Quick Select Category Pills (Shop By Category) */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {shopByCategories.map((c) => {
                  const isSelected = categoryId === c.id.toString();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCategorySelect(c.id.toString())}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-[#8B1A1A] to-red-600 text-white shadow-sm"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200/80"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                      <span>{c.name.split("(")[0].trim()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Full Category Dropdown with Clear Optgroups */}
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  disabled={loadingCats}
                  className="w-full appearance-none px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#8B1A1A] transition-all bg-white font-semibold text-gray-800"
                >
                  <optgroup label="Shop by Category (ប្រភេទពេញនិយម)">
                    {shopByCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="PC Builder Components (គ្រឿងតម្លើងកុំព្យូទ័រ)">
                    {pcComponents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  {categories.filter(
                    (c) =>
                      ![
                        "laptops",
                        "desktops",
                        "parts",
                        "gaming",
                        "monitors",
                        "accessories",
                        "secondhand",
                        "services",
                        "cpu",
                        "motherboard",
                        "ram",
                        "gpu",
                        "storage",
                        "psu",
                        "case",
                        "smartphones",
                      ].includes(c.slug || "")
                  ).length > 0 && (
                    <optgroup label="ប្រភេទផ្សេងៗ (Other Categories)">
                      {categories
                        .filter(
                          (c) =>
                            ![
                              "laptops",
                              "desktops",
                              "parts",
                              "gaming",
                              "monitors",
                              "accessories",
                              "secondhand",
                              "services",
                              "cpu",
                              "motherboard",
                              "ram",
                              "gpu",
                              "storage",
                              "psu",
                              "case",
                              "smartphones",
                            ].includes(c.slug || "")
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Brand / Manufacturer with Suggestion Chips */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Brand / Manufacturer (ម៉ាកផលិតផល)
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="ឧ. ASUS, Apple, MSI, Lenovo..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#8B1A1A] transition-all bg-gray-50/30 focus:bg-white"
              />
              {/* Quick Brand Suggestions */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase">ម៉ាកពេញនិយម:</span>
                {BRAND_SUGGESTIONS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrand(b)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      brand.toLowerCase() === b.toLowerCase()
                        ? "bg-red-50 text-[#8B1A1A] font-bold border border-red-200"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition & Badge / Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Condition (ស្ថានភាពទំនិញ)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "Brand New", label: "Brand New (100% Genuine)" },
                    { value: "Like New (99%)", label: "Like New (99%)" },
                    { value: "Second-Hand / Used", label: "Second-Hand (មួយទឹក)" },
                    { value: "Refurbished", label: "Refurbished" },
                  ].map((cond) => {
                    const isSel = condition === cond.value;
                    return (
                      <button
                        key={cond.value}
                        type="button"
                        onClick={() => setCondition(cond.value)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                          isSel
                            ? "bg-red-50 border-red-300 text-[#8B1A1A] font-bold shadow-xs"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {cond.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag size={13} className="text-[#8B1A1A]" />
                  <span>Badge / Tag 🏷️ (ជម្រើស Tag សម្គាល់)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag size={15} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="ឧ. HOT, SALE, BEST SELLER..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#8B1A1A] transition-all bg-gray-50/30 focus:bg-white"
                  />
                </div>
                {/* Tag Suggestion Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Tag ពេញនិយម:</span>
                  {["HOT", "NEW", "SALE", "BEST SELLER", "POPULAR", "LIMITED"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setBadge(tag)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        badge.toUpperCase() === tag
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {badge && (
                    <button
                      type="button"
                      onClick={() => setBadge("")}
                      className="text-[10px] text-gray-400 hover:text-red-500 ml-1 underline cursor-pointer"
                    >
                      សម្អាត
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Pricing & Inventory */}
          <div className="bg-white p-5 sm:p-7 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  តម្លៃ និងស្តុកទំនិញ (Pricing &amp; Inventory)
                </h2>
                <p className="text-[11px] text-gray-400">
                  កំណត់តម្លៃលក់ជាដុល្លារ ($), តម្លៃបញ្ចុះតម្លៃ (Sale Price) និងចំនួនទំនិញក្នុងស្តុក
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Regular Price USD */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Price (USD) <span className="text-rose-500">*</span>
                </label>
                <div className="h-12 flex items-center bg-gray-50/60 hover:bg-white focus-within:bg-white border border-gray-200 focus-within:border-[#8B1A1A] focus-within:ring-2 focus-within:ring-red-500/20 rounded-xl transition-all px-3.5">
                  <span className="font-extrabold text-[#8B1A1A] bg-red-50 px-2 py-0.5 rounded-md text-xs mr-2">
                    $
                  </span>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent outline-none font-mono font-bold text-base sm:text-lg text-gray-900"
                  />
                  <span className="text-xs font-extrabold text-gray-400 shrink-0 uppercase tracking-wider">
                    USD
                  </span>
                </div>

                {/* Live KHR Riel conversion badge */}
                {khrEquivalent && (
                  <div className="mt-2.5 text-xs font-mono text-emerald-700 font-bold bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Sparkles size={12} className="text-emerald-600" /> សមមូល:
                    </span>
                    <span className="text-emerald-800">~ {khrEquivalent} KHR</span>
                  </div>
                )}
              </div>

              {/* Sale Price USD */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Sale Price (USD) <span className="text-[11px] text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="h-12 flex items-center bg-gray-50/60 hover:bg-white focus-within:bg-white border border-gray-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-xl transition-all px-3.5">
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs mr-2">
                    $
                  </span>
                  <input
                    type="text"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent outline-none font-mono font-bold text-base sm:text-lg text-emerald-700"
                  />
                  <span className="text-xs font-extrabold text-gray-400 shrink-0 uppercase tracking-wider">
                    USD
                  </span>
                </div>

                {/* Sale discount badge */}
                {salePrice && !isNaN(Number(salePrice.replace(/[^0-9.]/g, ""))) && Number(salePrice.replace(/[^0-9.]/g, "")) > 0 && price && Number(price.replace(/[^0-9.]/g, "")) > Number(salePrice.replace(/[^0-9.]/g, "")) && (
                  <div className="mt-2.5 text-xs font-mono text-rose-700 font-bold bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 flex items-center justify-between">
                    <span>បញ្ចុះតម្លៃ:</span>
                    <span>-{Math.round(((Number(price.replace(/[^0-9.]/g, "")) - Number(salePrice.replace(/[^0-9.]/g, ""))) / Number(price.replace(/[^0-9.]/g, ""))) * 100)}% OFF</span>
                  </div>
                )}
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Stock Quantity (ចំនួនក្នុងស្តុក) <span className="text-rose-500">*</span>
                </label>
                <div className="h-12 flex items-center bg-gray-50/60 hover:bg-white focus-within:bg-white border border-gray-200 focus-within:border-[#8B1A1A] focus-within:ring-2 focus-within:ring-red-500/20 rounded-xl transition-all px-3.5">
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent outline-none font-mono font-bold text-base sm:text-lg text-gray-900"
                  />
                  <span className="text-xs font-extrabold text-gray-400 shrink-0 uppercase tracking-wider">
                    Units
                  </span>
                </div>

                {/* Quick Add Stock Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[11px] text-gray-400 font-bold mr-1">រហ័ស:</span>
                  {[5, 10, 20, 50].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setStock(qty.toString())}
                      className="h-8 px-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 text-xs font-mono font-bold transition-all cursor-pointer border border-gray-200/50"
                    >
                      +{qty}
                    </button>
                  ))}
                  <button
                    key="clear"
                    type="button"
                    onClick={() => setStock("0")}
                    className="h-8 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 text-xs font-bold transition-all cursor-pointer border border-rose-200/60"
                  >
                    អស់ស្តុក
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Description & Specs */}
          <div className="bg-white p-5 sm:p-7 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between gap-2.5 mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Tag size={17} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    ការពិពណ៌នាទំនិញ (Description &amp; Specifications)
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    លក្ខណៈបច្ចេកទេស ការធានា និងព័ត៌មានបន្ថែមសម្រាប់អតិថិជន
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Specs Helper Templates */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">គំរូ Specs:</span>
              <button
                type="button"
                onClick={() => {
                  const tpl = `• CPU: Intel Core i7 / AMD Ryzen 7\n• RAM: 16GB DDR5 5600MHz\n• Storage: 512GB PCIe 4.0 NVMe SSD\n• Display: 15.6" FHD 144Hz IPS\n• GPU: NVIDIA GeForce RTX\n• OS: Windows 11 License\n• ការធានា៖ ១ ឆ្នាំពេញពី S Tech Store\n• ថែមជូន៖ Mouse Gaming, Mousepad, កាបូបស្ពាយ`;
                  setDescription((prev) => (prev ? prev + "\n\n" + tpl : tpl));
                  showToast("បានបញ្ចូលគំរូ Laptop Specs!");
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold transition-all cursor-pointer border border-purple-200/60 active:scale-95"
              >
                + Laptop Specs
              </button>
              <button
                type="button"
                onClick={() => {
                  const tpl = `• CPU: Intel Core i5 / AMD Ryzen 5\n• Motherboard: B760 / B650 Gaming\n• RAM: 32GB RGB (16GBx2)\n• Storage: 1TB NVMe Gen4\n• GPU: RTX 4060 / 4070 8GB\n• PSU: 650W 80+ Bronze\n• Case: Gaming Case + 4 ARGB Fans\n• ការធានា៖ ២ ឆ្នាំលើគ្រឿងបន្លាស់`;
                  setDescription((prev) => (prev ? prev + "\n\n" + tpl : tpl));
                  showToast("បានបញ្ចូលគំរូ PC Builder Specs!");
                }}
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold transition-all cursor-pointer border border-sky-200/60 active:scale-95"
              >
                + PC Specs
              </button>
              <button
                type="button"
                onClick={() => {
                  const tpl = `• ការធានា៖ រយៈពេល ១ ឆ្នាំពេញ ពីហាង S Tech Store\n• ផ្តល់ជូនការដំឡើង Windows និងកម្មវិធីប្រើប្រាស់ដោយឥតគិតថ្លៃ\n• សេវាដឹកជញ្ជូនរហ័សទូទាំង ២៥ ខេត្ត-ក្រុង`;
                  setDescription((prev) => (prev ? prev + "\n\n" + tpl : tpl));
                  showToast("បានបញ្ចូលព័ត៌មានការធានា!");
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition-all cursor-pointer border border-emerald-200/60 active:scale-95"
              >
                + ការធានា &amp; ដឹកជញ្ជូន
              </button>
            </div>

            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="រៀបរាប់ពីលក្ខណៈសម្បត្តិទំនិញ ឧ. CPU, RAM, Storage, ការធានារយៈពេល ១ ឆ្នាំ, របស់ដែលថែមជូន..."
                className="w-full h-44 p-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#8B1A1A] transition-all resize-y font-normal text-gray-800 leading-relaxed bg-gray-50/40 focus:bg-white"
              />
              <div className="flex justify-between items-center text-[11px] text-gray-400 mt-2 px-1">
                <span>គន្លឹះ៖ អាចសរសេរជាចំណុចៗ (Bullet points) ដើម្បីងាយស្រួលអាន</span>
                <span className="font-mono">{description.length} តួអក្សរ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Product Media & Visibility (1/3) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* 4. Product Media Studio */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                <ImageIcon size={17} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">រូបភាពផលិតផល (Product Media)</h2>
                <p className="text-[11px] text-gray-400">ដាក់រូបភាពតំណាង និងរូបភាពបន្ថែម</p>
              </div>
            </div>

            {/* Mode Selector: URL Link vs File Upload */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setPrimaryImageMode("url")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  primaryImageMode === "url"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Globe size={13} />
                <span>Link URL</span>
              </button>
              <button
                type="button"
                onClick={() => setPrimaryImageMode("file")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  primaryImageMode === "file"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <UploadCloud size={13} />
                <span>Upload File</span>
              </button>
            </div>

            {/* Mode: Image URL Link */}
            {primaryImageMode === "url" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">Image Address Link</label>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100"
                  >
                    <Copy size={11} />
                    <span>Paste Link</span>
                  </button>
                </div>
                <input
                  type="url"
                  value={primaryImageUrl}
                  onChange={(e) => {
                    setPrimaryImageUrl(e.target.value);
                    setImagePreviewError(false);
                  }}
                  placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono bg-gray-50/40 focus:bg-white"
                />

                {/* URL Live Preview Card */}
                {primaryImageUrl.trim() && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-2 text-[11px]">
                      <span className="font-bold text-gray-600 flex items-center gap-1">
                        <Check size={12} className="text-emerald-600" /> Live Preview
                      </span>
                      <button
                        type="button"
                        onClick={() => setPrimaryImageUrl("")}
                        className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        សម្អាត
                      </button>
                    </div>
                    {!imagePreviewError ? (
                      <div className="w-full h-44 bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center p-2">
                        <img
                          src={primaryImageUrl.trim()}
                          alt="Primary Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={() => setImagePreviewError(true)}
                        />
                      </div>
                    ) : (
                      <div className="text-[11px] text-rose-600 p-4 text-center bg-rose-50 rounded-lg w-full">
                        មិនអាចផ្ទុករូបភាពពី Link នេះបានទេ សូមពិនិត្យ Link ឡើងវិញ។
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mode: File Upload */}
            {primaryImageMode === "file" && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-700 block">ជ្រើសរើសរូបភាពពីម៉ាស៊ីន</label>
                <div className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-4 text-center bg-gray-50/50 hover:bg-blue-50/30 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        setPrimaryImageFile(f);
                        if (primaryImagePreview) URL.revokeObjectURL(primaryImagePreview);
                        setPrimaryImagePreview(URL.createObjectURL(f));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-1.5 py-3">
                    <UploadCloud size={24} className="text-blue-600" />
                    <span className="text-xs font-bold text-gray-700">ចុចដើម្បីជ្រើសរើសរូបភាព</span>
                    <span className="text-[10px] text-gray-400">PNG, JPG, WEBP រហូតដល់ 10MB</span>
                  </div>
                </div>

                {/* File Preview Card */}
                {primaryImagePreview && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-2 text-[11px]">
                      <span className="font-bold text-gray-700 truncate">
                        {primaryImageFile?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (primaryImagePreview) URL.revokeObjectURL(primaryImagePreview);
                          setPrimaryImageFile(null);
                          setPrimaryImagePreview(null);
                        }}
                        className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        លុប
                      </button>
                    </div>
                    <div className="w-full h-44 bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={primaryImagePreview}
                        alt="Uploaded Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional Media Gallery Section */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-700">រូបភាពបន្ថែម (Gallery)</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setMediaList([
                        ...mediaList,
                        { id: Math.random().toString(), type: "file" },
                      ])
                    }
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon size={11} /> + File
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMediaList([
                        ...mediaList,
                        { id: Math.random().toString(), type: "url", url: "" },
                      ])
                    }
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <LinkIcon size={11} /> + URL
                  </button>
                </div>
              </div>

              {mediaList.length === 0 && !primaryImageUrl && !primaryImageFile && (
                <div className="py-6 px-4 text-center bg-gray-50/70 border border-dashed border-gray-200 rounded-xl text-[11px] text-gray-400">
                  បន្ថែមរូបភាពផលិតផលខាងលើ ដើម្បីបង្ហាញទំនិញឱ្យទាក់ទាញ
                </div>
              )}

              {/* Gallery Items */}
              <div className="space-y-2.5">
                {mediaList.map((media, index) => (
                  <div
                    key={media.id}
                    className="p-3 border border-gray-200 rounded-xl bg-gray-50/50 relative"
                  >
                    <button
                      type="button"
                      onClick={() => setMediaList(mediaList.filter((m) => m.id !== media.id))}
                      className="absolute top-2 right-2 w-5 h-5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                      title="Remove Image"
                    >
                      <X size={12} />
                    </button>

                    {media.type === "file" ? (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Upload File #{index + 1}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const f = e.target.files[0];
                              const copy = [...mediaList];
                              if (copy[index].preview) URL.revokeObjectURL(copy[index].preview!);
                              copy[index] = {
                                ...copy[index],
                                file: f,
                                preview: URL.createObjectURL(f),
                              };
                              setMediaList(copy);
                            }
                          }}
                          className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-blue-50 file:text-blue-700"
                        />
                        {media.preview && (
                          <div className="mt-2 p-1 bg-white border border-gray-200 rounded-lg flex justify-center h-20">
                            <img
                              src={media.preview}
                              alt="Gallery Preview"
                              className="max-h-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Image URL #{index + 1}
                        </label>
                        <input
                          type="url"
                          value={media.url || ""}
                          onChange={(e) => {
                            const copy = [...mediaList];
                            copy[index] = { ...copy[index], url: e.target.value };
                            setMediaList(copy);
                          }}
                          placeholder="https://..."
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {media.url && (
                          <div className="mt-2 p-1 bg-white border border-gray-200 rounded-lg flex justify-center h-20">
                            <img
                              src={media.url}
                              alt="Gallery Preview"
                              className="max-h-full object-contain"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Visibility & Highlights */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Star size={17} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">ការបង្ហាញ (Visibility)</h2>
                <p className="text-[11px] text-gray-400">កំណត់ការបង្ហាញលើទំព័រដើម និងចំណាត់ថ្នាក់លើគេ</p>
              </div>
            </div>

            {/* Featured Product */}
            <div className="flex justify-between items-center p-3.5 bg-gray-50/80 rounded-xl border border-gray-200">
              <div className="flex gap-3 items-center">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    featured ? "bg-amber-100 text-amber-600" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <Star size={18} className={featured ? "fill-amber-500 text-amber-500" : ""} />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Featured Product</div>
                  <div className="text-[11px] text-gray-500">បង្ហាញលើទំព័រមុខ Home</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFeatured(!featured)}
                className={`relative w-12 h-6.5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                  featured ? "bg-[#8B1A1A]" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-1 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${
                    featured ? "left-6.5" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Pin to Top */}
            <div className="flex justify-between items-center p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80">
              <div className="flex gap-3 items-center">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    pinned ? "bg-amber-200 text-amber-800" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <Pin size={18} className={pinned ? "fill-amber-700 text-amber-700" : ""} />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Pin to Top (ខ្ទាស់លើគេ)</div>
                  <div className="text-[11px] text-gray-600">ស្ថិតនៅលើគេបង្អស់នៃ Catalog ហាងជានិច្ច</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                className={`relative w-12 h-6.5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                  pinned ? "bg-amber-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-1 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${
                    pinned ? "left-6.5" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. Dedicated Bottom Action Footer Card (Visible on Desktop / Tablets Only to Prevent Mobile Duplication) ─── */}
      <div className="mt-8 hidden md:flex bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#8B1A1A] flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">
              ត្រៀមបញ្ចូលទំនិញថ្មីចូលប្រព័ន្ធស្តុក
            </div>
            <div className="text-xs text-gray-500">
              ពិនិត្យមើលឈ្មោះ តម្លៃ និងចំនួនស្តុក មុនពេលចុចរក្សាទុក
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleResetForm}
            className="flex-1 sm:flex-none px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            សម្អាត Form (Reset)
          </button>
          <Link
            href="/rok-mix-khernh/products"
            className="flex-1 sm:flex-none text-center px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors no-underline cursor-pointer"
          >
            បោះបង់ (Cancel)
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-none min-h-[46px] px-8 py-3 bg-gradient-to-r from-[#8B1A1A] via-red-700 to-rose-600 hover:from-[#6B1010] hover:to-red-700 active:scale-98 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>កំពុងរក្សាទុក...</span>
              </>
            ) : (
              <>
                <Package size={17} />
                <span>រក្សាទុកទំនិញ (Save Product)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── 7. Mobile Sticky Floating Bottom Action Bar (Native Mobile E-Commerce App Quality) ─── */}
      <div className="block md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl px-3.5 pt-2.5 pb-[max(env(safe-area-inset-bottom),12px)] border-t border-gray-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <Link
            href="/rok-mix-khernh/products"
            className="h-11 px-3.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-xl font-bold text-xs text-center no-underline cursor-pointer flex items-center justify-center shrink-0 border border-gray-200/60"
          >
            បោះបង់
          </Link>
          <button
            type="button"
            onClick={handleResetForm}
            className="h-11 w-11 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border border-gray-200/60 cursor-pointer"
            title="សម្អាត Form"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-11 px-4 bg-gradient-to-r from-[#8B1A1A] via-red-700 to-rose-600 hover:from-[#6B1010] hover:to-red-700 active:scale-98 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/25 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>កំពុងរក្សាទុក...</span>
              </>
            ) : (
              <>
                <Package size={17} />
                <span>រក្សាទុកទំនិញ (Save Product)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
