"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { bumpProduct, togglePinProduct, removeProductFromCache } from "@/lib/services/product.service";
import { Search, Plus, Filter, Edit2, Trash2, ChevronLeft, ChevronRight, AlertCircle, Laptop, Zap, Pin, Loader2, RefreshCw } from "lucide-react";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  category: Category | null;
  category_id: number;
  pinned_to_top?: boolean;
  bumped_at?: string | null;
};

const ITEMS_PER_PAGE = 10;

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bumpingId, setBumpingId] = useState<number | null>(null);
  const [pinningId, setPinningId] = useState<number | null>(null);
  
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [stockFilter, setStockFilter] = useState("All Stock Status");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await api.get('/products', {
        params: { _t: Date.now(), fresh: 1 },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProducts(list);
      try {
        sessionStorage.setItem('admin_cached_products', JSON.stringify(list));
      } catch (e) {}
    } catch (e) {
      showToast("Failed to fetch products", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial render from cache for 0ms blank screen
    let hasCache = false;
    try {
      const cached = sessionStorage.getItem('admin_cached_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
          setLoading(false);
          hasCache = true;
        }
      }
    } catch (e) {}

    // 2. Immediately trigger fresh fetch from database
    fetchProducts(!hasCache);

    // 3. Real-time In-Page & Cross-Tab Synchronizer
    const handleProductUpdated = (e: any) => {
      const updated = e.detail || e;
      if (!updated || !updated.id) return;
      const numId = Number(updated.id);
      
      setProducts(prev => {
        const exists = prev.some(p => Number(p.id) === numId);
        let next: Product[];
        if (exists) {
          next = prev.map(p => Number(p.id) === numId ? { ...p, ...updated } : p);
        } else {
          next = [updated, ...prev];
        }
        try {
          sessionStorage.setItem('admin_cached_products', JSON.stringify(next));
        } catch (_) {}
        return next;
      });

      showToast(`⚡ ផលិតផល "${updated.name}" បាន update ក្នុងតារាងភ្លាមៗ!`);
    };

    window.addEventListener('stech:product-updated', handleProductUpdated as EventListener);

    const handleProductDeleted = (e: any) => {
      const delId = e.detail?.id ?? e.productId ?? e.detail?.rawId ?? e;
      if (!delId) return;
      const numId = Number(delId);
      setProducts(prev => {
        const next = prev.filter(p => Number(p.id) !== numId && (p as any).slug !== String(delId));
        try {
          sessionStorage.setItem('admin_cached_products', JSON.stringify(next));
        } catch (_) {}
        return next;
      });
    };

    window.addEventListener('stech:product-deleted', handleProductDeleted as EventListener);

    // 4. BroadcastChannel for cross-tab instant sync
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('stech_products_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'PRODUCT_UPDATED' && event.data.product) {
            handleProductUpdated({ detail: event.data.product });
          } else if (event.data?.type === 'PRODUCT_DELETED') {
            handleProductDeleted({ detail: { id: event.data.productId, rawId: event.data.rawId } });
          }
        };
      }
    } catch (_) {}

    // 5. Storage event fallback (different browser windows)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'stech_last_product_update' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.product) {
            handleProductUpdated({ detail: data.product });
          }
        } catch (_) {}
      } else if (e.key === 'stech_last_product_delete' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.productId || data?.rawId) {
            handleProductDeleted({ detail: { id: data.productId, rawId: data.rawId } });
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('stech:product-updated', handleProductUpdated as EventListener);
      window.removeEventListener('stech:product-deleted', handleProductDeleted as EventListener);
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  const getStockStatus = (stock: number) => {
    if (stock > 10) return "In Stock";
    if (stock > 0) return "Low Stock";
    return "Out of Stock";
  };

  const filtered = useMemo(() => {
    return products.filter(p => {
      const pCatName = p.category?.name || "Uncategorized";
      const matchCat = categoryFilter === "All Categories" || pCatName === categoryFilter;
      const status = getStockStatus(p.stock);
      const matchStock = stockFilter === "All Stock Status" || status === stockFilter;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStock && matchSearch;
    });
  }, [products, categoryFilter, stockFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setCategoryFilter("All Categories");
    setStockFilter("All Stock Status");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    showToast("កំពុងលុបទំនិញពីប្រព័ន្ធ...", "success");
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      removeProductFromCache(deleteTarget.id);
      setProducts(prev => {
        const next = prev.filter(p => p.id !== deleteTarget.id);
        try {
          sessionStorage.setItem('admin_cached_products', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      showToast(`បានលុបទំនិញ "${deleteTarget.name}" ដោយជោគជ័យ!`);
    } catch (e) {
      showToast("បរាជ័យក្នុងការលុបទំនិញ សូមព្យាយាមម្តងទៀត។", "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleBump = async (prod: Product) => {
    try {
      setBumpingId(prod.id);
      const res = await bumpProduct(prod.id);
      if (res.success) {
        showToast(`⚡ បានរុញទំនិញ "${prod.name}" ទៅលើគេបង្អស់ជោគជ័យ!`);
        await fetchProducts(false);
      } else {
        showToast(res.message || "មិនអាចរុញទំនិញបានទេ", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "មានបញ្ហាក្នុងការរុញទំនិញ", "error");
    } finally {
      setBumpingId(null);
    }
  };

  const handleTogglePin = async (prod: Product) => {
    try {
      setPinningId(prod.id);
      const res = await togglePinProduct(prod.id);
      if (res.success) {
        const isPinned = res.data?.pinned_to_top ?? !prod.pinned_to_top;
        showToast(isPinned ? `📌 បានខ្ទាស់ទំនិញ "${prod.name}" នៅលើគេបង្អស់ជានិច្ច!` : `បានដោះខ្ទាស់ "${prod.name}" រួចរាល់`);
        await fetchProducts(false);
      } else {
        showToast(res.message || "មិនអាចខ្ទាស់ទំនិញបានទេ", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "មានបញ្ហាក្នុងការខ្ទាស់ទំនិញ", "error");
    } finally {
      setPinningId(null);
    }
  };


  const stockBadge = (status: string) => {
    if (status === "In Stock") return "bg-indigo-100 text-indigo-700";
    if (status === "Low Stock") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      {/* Delete Confirmation Modal (Bilingual & High Warning) */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151922] p-6 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl text-center border border-gray-100 dark:border-white/10 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <AlertCircle size={32} />
            </div>
            
            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-2">
              តើបងប្រាកដជាចង់លុបទំនិញនេះមែនទេ?
            </h3>
            <p className="text-xs text-red-600 dark:text-red-400 font-bold mb-4 uppercase tracking-wider">
              Warning: Permanent Product Deletion
            </p>

            <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200/60 dark:border-white/10 mb-5 flex items-center gap-3 text-left">
              {deleteTarget.image_url ? (
                <img
                  src={deleteTarget.image_url}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border bg-white shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-500 font-bold shrink-0">
                  IMG
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-gray-900 dark:text-white text-sm truncate">
                  {deleteTarget.name}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">
                  ID: #{deleteTarget.id} • ${deleteTarget.price} • ស្តុក: {deleteTarget.stock}
                </div>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mb-6 leading-relaxed">
              ទំនិញនេះនឹងត្រូវ<strong>លុបចេញពីប្រព័ន្ធ</strong>ទាំងស្រុង ហើយអតិថិជននឹង<strong>លែងឃើញនៅលើគេហទំព័រ</strong>ទៀតហើយ! តើអ្នកចង់បន្តលុបឬទេ?
            </p>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDeleteTarget(null)} 
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-white/15 rounded-xl bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                បោះបង់ (Cancel)
              </button>
              <button 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span>កំពុងលុប...</span>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>បាទ/ចាស លុបទំនិញ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
          <p className="text-gray-500 text-sm">Manage inventory, pricing, and specifications.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => fetchProducts(true)} 
            disabled={loading}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-[#8B1A1A]" : ""} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => router.push("/rok-mix-khernh/products/new")} 
            className="px-4 py-2 bg-[#8B1A1A] text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-[#6B1010] transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Add New Product
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-10">
        
        {/* Filters */}
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row gap-4 items-end">
          <div className="w-full lg:flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              value={searchQuery} 
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
              placeholder="Search products..." 
              className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50" 
            />
          </div>
          
          <div className="w-full sm:w-1/2 lg:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={categoryFilter} 
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }} 
              className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
            >
              <option>All Categories</option>
              {Array.from(new Set(products.map(p => p.category?.name || "Uncategorized"))).map(cat => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full sm:w-1/2 lg:w-48 relative">
            <select 
              value={stockFilter} 
              onChange={e => { setStockFilter(e.target.value); setCurrentPage(1); }} 
              className="w-full py-2.5 px-4 border border-gray-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
            >
              <option>All Stock Status</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
          </div>

          <button 
            onClick={handleClearFilters} 
            className="w-full lg:w-auto px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Product</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500 animate-pulse">Loading products...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">No products match your filters.</td>
                </tr>
              ) : paginated.map((prod) => {
                const status = getStockStatus(prod.stock);
                return (
                  <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Laptop size={20} className="text-gray-400" />
                            )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className="text-sm font-bold text-gray-900">{prod.name}</span>
                            {prod.pinned_to_top && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                <Pin size={10} className="fill-amber-600 text-amber-600" />
                                <span>ខ្ទាស់លើគេ</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{prod.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-700">
                      {prod.category?.name || "Uncategorized"}
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-900">
                      ${Number(prod.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${stockBadge(status)}`}>
                        {status} • {prod.stock}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {/* 1-Click Bump to Top */}
                        <button 
                          type="button"
                          onClick={() => handleBump(prod)} 
                          disabled={bumpingId === prod.id}
                          className="p-2 text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer" 
                          title="⚡ រុញទៅលើគេបង្អស់ (Bump to Top)"
                        >
                          {bumpingId === prod.id ? (
                            <Loader2 size={16} className="animate-spin text-amber-600" />
                          ) : (
                            <Zap size={16} className="hover:scale-110 transition-transform" />
                          )}
                        </button>

                        {/* Toggle Pin to Top */}
                        <button 
                          type="button"
                          onClick={() => handleTogglePin(prod)} 
                          disabled={pinningId === prod.id}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer ${
                            prod.pinned_to_top 
                              ? 'text-amber-700 bg-amber-100 hover:bg-amber-200' 
                              : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={prod.pinned_to_top ? "📌 ដោះខ្ទាស់ពីលើគេ (Unpin)" : "📌 ខ្ទាស់នៅខាងលើគេបង្អស់ជានិច្ច (Pin to Top)"}
                        >
                          {pinningId === prod.id ? (
                            <Loader2 size={16} className="animate-spin text-amber-600" />
                          ) : (
                            <Pin size={16} className={prod.pinned_to_top ? "fill-amber-600 text-amber-600" : ""} />
                          )}
                        </button>

                        <button 
                          onClick={() => router.push(`/rok-mix-khernh/products/${prod.id}/edit`)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" 
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteTarget(prod)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 gap-4">
          <div className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-semibold text-gray-900">{filtered.length}</span> results
          </div>
          <div className="flex gap-1.5">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)} 
              className={`p-1.5 border rounded-md transition-colors ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'}`}
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page} 
                onClick={() => setCurrentPage(page)} 
                className={`w-8 h-8 flex items-center justify-center border rounded-md text-sm font-medium transition-colors ${page === currentPage ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {page}
              </button>
            ))}
            <button 
              disabled={currentPage === totalPages || totalPages === 0} 
              onClick={() => setCurrentPage(p => p + 1)} 
              className={`p-1.5 border rounded-md transition-colors ${currentPage === totalPages || totalPages === 0 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
