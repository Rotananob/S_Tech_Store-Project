"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import api from "@/lib/api";
import { Search, Plus, Filter, Edit2, Trash2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

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
};

const ITEMS_PER_PAGE = 5;

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [stockFilter, setStockFilter] = useState("Stock Status (All)");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProducts(list);
    } catch (e) {
      showToast("Failed to fetch products", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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
      const matchStock = stockFilter === "Stock Status (All)" || status === stockFilter;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStock && matchSearch;
    });
  }, [products, categoryFilter, stockFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setCategoryFilter("All Categories");
    setStockFilter("Stock Status (All)");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      showToast(`"${deleteTarget.name}" deleted successfully.`);
    } catch (e) {
      showToast("Failed to delete product.", "error");
    } finally {
      setDeleteTarget(null);
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Product?</h3>
            <p className="text-gray-500 text-sm mb-6">Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteTarget(null)} 
                className="flex-1 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete} 
                className="flex-1 py-2.5 border-none rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                Delete
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
        <button 
          onClick={() => router.push("/stech-hq-portal/products/new")} 
          className="px-4 py-2 bg-[#8B1A1A] text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-[#6B1010] transition-colors"
        >
          <Plus size={16} />
          Add New Product
        </button>
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
              <option>Stock Status (All)</option>
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
                              <span className="text-xl">💻</span>
                            )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 mb-0.5">{prod.name}</div>
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
                        {status} ({prod.stock})
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => router.push(`/stech-hq-portal/products/${prod.id}/edit`)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteTarget(prod)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
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
