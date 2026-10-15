"use client";
import React, { useState, useEffect, use } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { invalidateProductCache, bumpProduct } from "@/lib/services/product.service";
import { 
  Package, DollarSign, Image as ImageIcon, Link as LinkIcon, Star, X, Check, Globe, 
  ArrowLeft, CheckCircle2, Sparkles, LayoutDashboard, Tag, UploadCloud, RefreshCw, AlertCircle,
  ChevronDown, Pin, Zap, Loader2
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

export default function EditProductPage(props: {
  params?: Promise<{ id: string; locale: string }> | { id: string; locale: string };
}) {
  const router = useRouter();
  const routeParams = useParams();

  // Resilient resolution of productId across Next.js 15/16 and React 19
  const unwrappedParams = props?.params && typeof (props.params as any).then === "function"
    ? use(props.params as Promise<{ id: string; locale: string }>)
    : props?.params;
  const productId = String((routeParams?.id as string) || (unwrappedParams as any)?.id || "");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // Loading & Error states
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [originalProduct, setOriginalProduct] = useState<any>(null);

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
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [isBumping, setIsBumping] = useState(false);
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("Brand New");
  const [badge, setBadge] = useState("");

  // Primary Image State (Link address OR uploaded File)
  const [primaryImageUrl, setPrimaryImageUrl] = useState("");
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [primaryImagePreview, setPrimaryImagePreview] = useState<string | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Additional Media Gallery
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch categories
  const fetchCats = async () => {
    try {
      setLoadingCats(true);
      const res = await api.get('/categories');
      const data: Category[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (data.length > 0) {
        setCategories(data);
      }
    } catch {
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

  // 2. Fetch product details
  const fetchProduct = async () => {
    if (!productId || productId === "undefined") {
      setFetchError("មិនមានលេខសម្គាល់ទំនិញ (Product ID Missing)");
      setLoadingProduct(false);
      return;
    }

    try {
      setLoadingProduct(true);
      setFetchError(null);
      const res = await api.get(`/products/${productId}`);
      const p = res.data?.data || res.data;
      
      if (!p) {
        throw new Error("មិនអាចទាញយកទិន្នន័យទំនិញបានទេ");
      }

      setOriginalProduct(p);
      setName(p.name || "");
      setCategoryId(p.category_id ? String(p.category_id) : "1");
      setPrice(p.price ? String(p.price) : "");
      setSalePrice(p.sale_price !== null && p.sale_price !== undefined ? String(p.sale_price) : "");
      setStock(p.stock !== undefined && p.stock !== null ? String(p.stock) : "0");
      setDescription(p.description || "");
      setFeatured(Boolean(p.is_featured));
      setPinned(Boolean(p.pinned_to_top));
      setBrand(p.brand || "");
      setCondition(p.condition || "Brand New");
      setBadge(p.badge || "");
      
      // Primary image
      if (p.image_url) {
        setPrimaryImageUrl(p.image_url);
        setPrimaryImagePreview(p.image_url);
      } else {
        setPrimaryImageUrl("");
        setPrimaryImagePreview(null);
      }
      setPrimaryImageFile(null);
      setImagePreviewError(false);

      // Additional Gallery images (filter out primary image to prevent duplicate view)
      const existingMedia: MediaItem[] = [];
      const rawImages = Array.isArray(p.images) 
        ? p.images 
        : (typeof p.images === "string" ? JSON.parse(p.images || "[]") : []);

      if (Array.isArray(rawImages)) {
        rawImages.forEach((img: string) => {
          if (img && typeof img === "string" && img.trim() !== "" && img.trim() !== p.image_url?.trim()) {
            existingMedia.push({ id: Math.random().toString(), type: "url", url: img.trim() });
          }
        });
      }
      setMediaList(existingMedia);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "បរាជ័យក្នុងការទាញយកទិន្នន័យទំនិញ";
      setFetchError(msg);
      showToast(msg, "error");
    } finally {
      setLoadingProduct(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  useEffect(() => {
    if (productId && productId !== "undefined") {
      fetchProduct();
    }
  }, [productId]);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("សូមបញ្ចូលឈ្មោះទំនិញ (Product Name)", "error");
      return;
    }
    if (!price.trim()) {
      showToast("សូមបញ្ចូលតម្លៃទំនិញ (Price)", "error");
      return;
    }
    if (stock === "" || isNaN(Number(stock))) {
      showToast("សូមបញ្ចូលចំនួនស្តុកត្រឹមត្រូវ (Stock)", "error");
      return;
    }
    
    setModalState("saving");
    setSavingStep(1);

    try {
      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("name", name.trim());
      formData.append("category_id", categoryId);
      formData.append("price", price.trim());
      formData.append("stock", String(Math.max(0, parseInt(stock, 10))));
      
      if (salePrice.trim()) {
        formData.append("sale_price", salePrice.trim());
      } else {
        formData.append("sale_price", "");
      }

      formData.append("description", description);
      formData.append("is_featured", featured ? "1" : "0");
      formData.append("pinned_to_top", pinned ? "1" : "0");
      formData.append("brand", brand.trim());
      formData.append("condition", condition.trim());
      formData.append("badge", badge.trim());
      
      // Primary image URL or File
      if (primaryImageFile) {
        formData.append("image", primaryImageFile);
      } else if (primaryImageUrl.trim()) {
        formData.append("image_url", primaryImageUrl.trim());
        formData.append("image_urls[]", primaryImageUrl.trim());
      }

      // Additional gallery media
      mediaList.forEach(item => {
        if (item.type === "file" && item.file) {
          formData.append("images[]", item.file);
        } else if (item.type === "url" && item.url && item.url.trim()) {
          formData.append("image_urls[]", item.url.trim());
        }
      });

      setSavingStep(2);

      const targetId = productId || originalProduct?.id;
      const res = await api.post(`/products/${targetId}`, formData);
      const updatedData = res.data?.data || res.data || { name, price, stock };

      setSavingStep(3);
      setSavedProduct(updatedData);
      setOriginalProduct(updatedData);
      invalidateProductCache();
      setModalState("success");
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || "បរាជ័យក្នុងការកែប្រែទំនិញ";
      setModalError(errorMsg);
      setModalState("error");
      showToast(errorMsg, "error");
    }
  };

  const handleBumpNow = async () => {
    const targetId = productId || originalProduct?.id;
    if (!targetId) return;
    try {
      setIsBumping(true);
      const res = await bumpProduct(Number(targetId));
      if (res.success) {
        showToast("⚡ បានរុញទំនិញនេះទៅលើគេបង្អស់ជោគជ័យ!");
      } else {
        showToast(res.message || "មិនអាចរុញទំនិញបានទេ", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "មានបញ្ហាក្នុងការរុញទំនិញ", "error");
    } finally {
      setIsBumping(false);
    }
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

  const khrEquivalent =
    price && !isNaN(Number(price)) && Number(price) > 0
      ? Math.round(Number(price) * 4100).toLocaleString()
      : null;

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
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[99999] px-5 py-3 rounded-xl shadow-xl font-medium text-sm text-white flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'} animate-in fade-in slide-in-from-top-4 duration-200`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* UX Modal for Updating Product */}
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
                      <Check size={11} strokeWidth={3} />
                    </span>
                    <span className={savingStep >= 1 ? "font-bold text-gray-900" : "text-gray-400"}>
                      ផ្ទៀងផ្ទាត់ទិន្នន័យ និងតម្លៃថ្មី
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${savingStep >= 2 ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      {savingStep >= 2 ? <Check size={11} strokeWidth={3} /> : "2"}
                    </span>
                    <span className={savingStep >= 2 ? "font-bold text-gray-900" : "text-gray-400"}>
                      ធ្វើបច្ចុប្បន្នភាពរូបភាព និង PostgreSQL Cloud
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${savingStep >= 3 ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      {savingStep >= 3 ? <Check size={11} strokeWidth={3} /> : "3"}
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
                    {savedProduct?.image_url || primaryImagePreview || primaryImageUrl ? (
                      <img 
                        src={savedProduct?.image_url || primaryImagePreview || primaryImageUrl} 
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
                      តម្លៃ: <b className="text-emerald-700">${savedProduct?.price || price}</b> {savedProduct?.sale_price && <span className="text-red-600 line-through text-[11px] ml-1">${savedProduct.sale_price}</span>} • ស្តុក: <b>{savedProduct?.stock || stock} គ្រឿង</b>
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
                    onClick={() => setModalState("idle")}
                    className="py-3 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>បន្តកែប្រែទំនិញនេះ</span>
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
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 mb-1 flex items-center gap-2">
              <span>Edit Product</span>
              {originalProduct?.id && (
                <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                  #{originalProduct.id}
                </span>
              )}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              កែប្រែឈ្មោះទំនិញ តម្លៃ ស្តុក លក្ខណៈបច្ចេកទេស និងរូបភាព
            </p>
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
              disabled={loadingProduct}
              className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6B1010] active:scale-[0.98] text-white border border-transparent rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#8B1A1A]/20 cursor-pointer disabled:opacity-50"
            >
              <Package size={16} />
              Save Product
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loadingProduct && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center animate-pulse">
          <div className="w-14 h-14 rounded-full bg-gray-200 mb-4 flex items-center justify-center">
            <RefreshCw size={24} className="text-gray-400 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-gray-700 mb-1">
            កំពុងទាញយកព័ត៌មានទំនិញ...
          </h3>
          <p className="text-xs text-gray-400 max-w-sm">
            សូមរង់ចាំមួយភ្លែត ប្រព័ន្ធកំពុងទាញយកទិន្នន័យជាក់ស្តែងពី Cloud Server។
          </p>
        </div>
      )}

      {/* Error state */}
      {!loadingProduct && fetchError && (
        <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 mb-4 flex items-center justify-center">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-1">
            មិនអាចផ្ទុកទិន្នន័យទំនិញបានទេ
          </h3>
          <p className="text-xs text-red-600 mb-6 max-w-md">
            {fetchError}
          </p>
          <div className="flex gap-3">
            <button
              onClick={fetchProduct}
              className="px-5 py-2.5 bg-[#8B1A1A] text-white rounded-xl text-xs font-bold hover:bg-[#6B1010] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>ព្យាយាមម្តងទៀត</span>
            </button>
            <Link
              href="/rok-mix-khernh/products"
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors no-underline"
            >
              ត្រឡប់ទៅបញ្ជីទំនិញ
            </Link>
          </div>
        </div>
      )}

      {/* Main Form (Rendered once loaded) */}
      {!loadingProduct && !fetchError && (
        <>
          <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column */}
          <div className="w-full lg:w-2/3 flex flex-col gap-6">
            {/* Basic Information */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-6 flex items-center justify-between">
                <span>Basic Information</span>
                {originalProduct?.slug && (
                  <span className="text-[11px] text-gray-400 font-mono font-normal">
                    Slug: {originalProduct.slug}
                  </span>
                )}
              </h2>
              
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. ASUS ROG Strix G16 (2025)" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900" 
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  អ្នកអាចសរសេរឈ្មោះថ្មី ឬកែប្រែឈ្មោះចាស់បានភ្លាមៗ។ Slug នឹងត្រូវបានអាប់ដេតស្វ័យប្រវត្តិ។
                </p>
              </div>
              
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
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Brand with suggestion chips */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Brand / Manufacturer (ម៉ាកផលិតផល)
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. ASUS, Apple, MSI, Lenovo..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#8B1A1A] transition-all bg-gray-50/30 focus:bg-white"
                />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Condition</label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="Brand New">Brand New (100% Genuine)</option>
                    <option value="Like New (99%)">Like New (99%)</option>
                    <option value="Second-Hand / Used">Second-Hand / Used</option>
                    <option value="Refurbished">Refurbished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Badge / Tag (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag size={15} className="text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      value={badge} 
                      onChange={e => setBadge(e.target.value)} 
                      placeholder="e.g. HOT, SALE, BEST SELLER" 
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-6">Pricing & Inventory</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Regular Price (USD) <span className="text-red-500">*</span>
                  </label>
                  <div className="h-12 flex items-center bg-gray-50/60 hover:bg-white focus-within:bg-white border border-gray-300 focus-within:border-[#8B1A1A] focus-within:ring-2 focus-within:ring-red-500/20 rounded-xl transition-all px-3.5">
                    <span className="font-extrabold text-[#8B1A1A] bg-red-50 px-2 py-0.5 rounded-md text-xs mr-2">
                      $
                    </span>
                    <input 
                      type="text" 
                      value={price} 
                      onChange={e => setPrice(e.target.value)} 
                      placeholder="1199.00" 
                      className="w-full bg-transparent outline-none font-mono font-bold text-base text-gray-900" 
                    />
                    <span className="text-xs font-bold text-gray-400 uppercase">USD</span>
                  </div>
                  {khrEquivalent && (
                    <div className="mt-2 text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 flex items-center justify-between">
                      <span>សមមូល:</span>
                      <span>~ {khrEquivalent} KHR</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sale Price (USD)
                  </label>
                  <div className="h-12 flex items-center bg-gray-50/60 hover:bg-white focus-within:bg-white border border-gray-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-xl transition-all px-3.5">
                    <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs mr-2">
                      $
                    </span>
                    <input 
                      type="text" 
                      value={salePrice} 
                      onChange={e => setSalePrice(e.target.value)} 
                      placeholder="999.00 (Optional)" 
                      className="w-full bg-transparent outline-none font-mono font-bold text-base text-emerald-700" 
                    />
                    <span className="text-xs font-bold text-gray-400 uppercase">USD</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Stock Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="h-12 flex items-center bg-gray-50/60 hover:bg-white focus-within:bg-white border border-gray-300 focus-within:border-[#8B1A1A] focus-within:ring-2 focus-within:ring-red-500/20 rounded-xl transition-all px-3.5">
                    <input 
                      type="number" 
                      value={stock} 
                      onChange={e => setStock(e.target.value)} 
                      placeholder="0" 
                      min="0"
                      className="w-full bg-transparent outline-none font-mono font-bold text-base text-gray-900" 
                    />
                    <span className="text-xs font-bold text-gray-400 uppercase">Units</span>
                  </div>

                  {/* Quick Add Stock Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-gray-400 font-bold mr-0.5">រហ័ស:</span>
                    {[5, 10, 20, 50].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setStock(qty.toString())}
                        className="h-7 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 text-xs font-mono font-bold transition-all cursor-pointer border border-gray-200/50"
                      >
                        +{qty}
                      </button>
                    ))}
                    <button
                      key="clear"
                      type="button"
                      onClick={() => setStock("0")}
                      className="h-7 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 text-xs font-bold transition-all cursor-pointer border border-rose-200/60"
                    >
                      អស់ស្តុក
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-6">Description</h2>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Description</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Enter detailed description of the product specifications, features, warranty info, etc..." 
                  className="w-full h-40 px-4 py-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y leading-relaxed"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6">
            {/* Media / Image Address Link & Uploads */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-1">Product Media</h2>
              <p className="text-xs text-gray-500 mb-4">
                កែប្រែរូបភាពចម្បង ឬបន្ថែមរូបភាព Gallery ថ្មី។
              </p>

              {/* Primary Image Section */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl mb-5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-2">
                  <Globe size={14} className="text-blue-600" />
                  Primary Image (រូបភាពចម្បង)
                </label>

                {/* Option 1: URL */}
                <input 
                  type="url" 
                  value={primaryImageUrl} 
                  onChange={e => {
                    setPrimaryImageUrl(e.target.value);
                    setPrimaryImageFile(null);
                    setPrimaryImagePreview(e.target.value);
                    setImagePreviewError(false);
                  }} 
                  placeholder="Paste image link address (Cloudinary, Web)..." 
                  className="w-full px-3 py-2 border border-blue-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-white mb-2" 
                />

                {/* Option 2: Upload File */}
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-blue-100/50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                    <UploadCloud size={14} />
                    <span>Upload Image File</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setPrimaryImageFile(file);
                          setPrimaryImagePreview(URL.createObjectURL(file));
                          setImagePreviewError(false);
                        }
                      }}
                    />
                  </label>
                  {(primaryImageUrl || primaryImagePreview) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPrimaryImageUrl("");
                        setPrimaryImageFile(null);
                        setPrimaryImagePreview(null);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Clear image"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Live Preview Card */}
                {primaryImagePreview && (
                  <div className="mt-2 p-2 bg-white rounded-xl border border-blue-100 flex flex-col items-center">
                    <div className="text-[10px] font-bold text-emerald-700 mb-1 flex items-center gap-1">
                      <Check size={12} className="text-emerald-600" /> 
                      {primaryImageFile ? "Uploaded File Preview" : "Current Image Preview"}
                    </div>
                    {!imagePreviewError ? (
                      <img 
                        src={primaryImagePreview} 
                        alt="Primary Preview" 
                        className="max-h-36 max-w-full object-contain rounded-lg" 
                        onError={() => setImagePreviewError(true)} 
                      />
                    ) : (
                      <div className="text-[11px] text-red-500 py-3 text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={13} className="text-red-500 shrink-0" />
                        <span>មិនអាចផ្ទុករូបភាពពីតំណភ្ជាប់នេះបានទេ។ សូមពិនិត្យតំណភ្ជាប់ឡើងវិញ។</span>
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
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon size={12} /> + File
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMediaList([...mediaList, { id: Math.random().toString(), type: "url", url: "" }])} 
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <LinkIcon size={12} /> + URL
                  </button>
                </div>
              </div>

              {mediaList.length === 0 && (
                <div className="py-6 px-4 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-xs text-gray-400">
                  មិនទាន់មានរូបភាព Gallery បន្ថែមទេ។ ចុច + File ឬ + URL ដើម្បីបញ្ចូល។
                </div>
              )}

              {mediaList.map((media, index) => (
                <div key={media.id} className="mb-3 p-3 border border-gray-200 rounded-xl relative bg-white shadow-2xs">
                  <button 
                    type="button" 
                    onClick={() => setMediaList(mediaList.filter(m => m.id !== media.id))} 
                    className="absolute top-2 right-2 w-5 h-5 bg-red-50 hover:bg-red-100 text-red-500 rounded-full flex items-center justify-center transition-colors cursor-pointer" 
                    title="Remove Image"
                  >
                    <X size={12} />
                  </button>
                  
                  {media.type === "file" ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Gallery File #{index + 1}
                      </label>
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
                        <div className="mt-2 p-1.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex justify-center">
                          <img src={media.preview} alt="Preview" className="max-h-24 object-contain rounded" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Gallery URL #{index + 1}
                      </label>
                      <input 
                        type="url" 
                        value={media.url || ""} 
                        onChange={e => {
                          const newMediaList = [...mediaList];
                          newMediaList[index] = { ...newMediaList[index], url: e.target.value };
                          setMediaList(newMediaList);
                        }} 
                        placeholder="https://..." 
                        className="w-full pr-7 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono" 
                      />
                      {media.url && (
                        <div className="mt-2 p-1.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex justify-center">
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

            {/* Visibility & Pin/Bump */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <h2 className="text-base font-bold text-gray-900">Visibility & Promotion</h2>
              
              {/* Featured Product */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex gap-3 items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${featured ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>
                    <Star size={17} className={featured ? 'fill-amber-500 text-amber-500' : ''} />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-gray-900 mb-0.5">Featured Product</div>
                    <div className="text-[11px] text-gray-500">បង្ហាញលើទំព័រដើម (Homepage Highlight)</div>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  onClick={() => setFeatured(!featured)} 
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${featured ? 'bg-[#8B1A1A]' : 'bg-gray-300'}`}
                >
                  <div 
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${featured ? 'left-6' : 'left-1'}`}
                  />
                </button>
              </div>

              {/* Pin to Top */}
              <div className="flex justify-between items-center p-4 bg-amber-50/50 rounded-xl border border-amber-200/80">
                <div className="flex gap-3 items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${pinned ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-500'}`}>
                    <Pin size={17} className={pinned ? 'fill-amber-700 text-amber-700' : ''} />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-gray-900 mb-0.5">Pin to Top (ខ្ទាស់លើគេបង្អស់)</div>
                    <div className="text-[11px] text-gray-600">ស្ថិតនៅលើគេបង្អស់ជានិច្ចក្នុងបញ្ជីទំនិញ</div>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  onClick={() => setPinned(!pinned)} 
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${pinned ? 'bg-amber-600' : 'bg-gray-300'}`}
                >
                  <div 
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${pinned ? 'left-6' : 'left-1'}`}
                  />
                </button>
              </div>

              {/* 1-Click Instant Bump Button */}
              <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-[#8B1A1A]" />
                  <span className="text-xs font-bold text-gray-900">រុញទំនិញឡើងលើភ្លាមៗ (Bump Now)</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  ធ្វើឱ្យទំនិញចាស់នេះលោតទៅលើគេបង្អស់នៃ Catalog ហាងភ្លាមៗ ដូចទើបនឹងបញ្ចូលថ្មី ដោយមិនចាំបាច់រក្សាទុកឡើងវិញឡើយ។
                </p>
                <button
                  type="button"
                  onClick={handleBumpNow}
                  disabled={isBumping || !productId}
                  className="w-full py-2.5 px-4 bg-white hover:bg-red-50 text-[#8B1A1A] border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:border-red-300 disabled:opacity-50"
                >
                  {isBumping ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#8B1A1A]" />
                      <span>កំពុងរុញទំនិញទៅលើគេ...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="text-[#8B1A1A]" />
                      <span>⚡ រុញទំនិញនេះទៅលើគេបង្អស់ឥឡូវនេះ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Dedicated Bottom Action Footer Card (Desktop & Tablets Only) ─── */}
        <div className="mt-8 hidden md:flex bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#8B1A1A] flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">
                កែប្រែព័ត៌មានទំនិញ #{originalProduct?.id || productId}
              </div>
              <div className="text-xs text-gray-500">
                សូមផ្ទៀងផ្ទាត់ការកែប្រែទាំងអស់ មុនពេលចុចរក្សាទុកទិន្នន័យ
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Link
              href="/rok-mix-khernh/products"
              className="flex-1 sm:flex-none text-center px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors no-underline cursor-pointer"
            >
              បោះបង់ (Cancel)
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={loadingProduct}
              className="flex-1 sm:flex-none min-h-[46px] px-8 py-3 bg-gradient-to-r from-[#8B1A1A] via-red-700 to-rose-600 hover:from-[#6B1010] hover:to-red-700 active:scale-98 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Package size={17} />
              <span>រក្សាទុកការកែប្រែ (Update Product)</span>
            </button>
          </div>
        </div>

        {/* ─── Mobile Sticky Floating Bottom Action Bar (Native Mobile App Quality) ─── */}
        <div className="block md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl px-3.5 pt-2.5 pb-[max(env(safe-area-inset-bottom),12px)] border-t border-gray-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-2 max-w-lg mx-auto">
            <Link
              href="/rok-mix-khernh/products"
              className="h-11 px-4 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-xl font-bold text-xs text-center no-underline cursor-pointer flex items-center justify-center shrink-0 border border-gray-200/60"
            >
              បោះបង់
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={loadingProduct}
              className="flex-1 h-11 px-4 bg-gradient-to-r from-[#8B1A1A] via-red-700 to-rose-600 hover:from-[#6B1010] hover:to-red-700 active:scale-98 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/25 cursor-pointer disabled:opacity-50"
            >
              <Package size={17} />
              <span>រក្សាទុកការកែប្រែ (Update)</span>
            </button>
          </div>
        </div>
      </>
    )}
    </div>
  );
}
