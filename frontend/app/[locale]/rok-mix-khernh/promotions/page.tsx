"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import api from "@/lib/api";
import { 
  Plus, Filter, Clock, Tag, TrendingUp, Trash2, ChevronDown, 
  CheckCircle2, X, Edit, Upload, Image as ImageIcon, Sparkles, 
  ExternalLink, Layers, Loader2, AlertCircle
} from "lucide-react";

type Promotion = {
  id: number | string;
  name: string;
  code?: string;
  type: string;
  value: string | number;
  valid_from?: string | null;
  valid_until?: string | null;
  usage_count?: number;
  usage_max?: number | null;
  status: string;
  auto_applied?: boolean;
  image_url?: string | null;
  show_popup?: boolean;
  description?: string | null;
  target_url?: string | null;
};

const DEFAULT_FORM_STATE = {
  name: "",
  code: "",
  type: "percentage",
  value: "",
  valid_from: "",
  valid_until: "",
  usage_max: "",
  status: "active",
  auto_applied: false,
  image_url: "",
  show_popup: false,
  description: "",
  target_url: "",
};

export default function PromotionManagementPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [newPromo, setNewPromo] = useState(DEFAULT_FORM_STATE);
  const [createUploadingImg, setCreateUploadingImg] = useState(false);
  const createFileRef = useRef<HTMLInputElement>(null);

  // Edit Modal State
  const [showEdit, setShowEdit] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editPromo, setEditPromo] = useState(DEFAULT_FORM_STATE);
  const [editUploadingImg, setEditUploadingImg] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const res = await api.get("/promo-codes");
      setPromos(res.data || []);
    } catch (e) {
      showToast("បរាជ័យក្នុងការទាញទិន្នន័យប្រូម៉ូសិន", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const filtered = useMemo(() => {
    return promos.filter(p => {
      const pType = (p.type || "").toLowerCase();
      const matchType = typeFilter === "All Types" || 
        (typeFilter === "Percentage" && pType.includes("percent")) ||
        (typeFilter === "Fixed Amount" && pType.includes("fix"));
      
      const pStatus = (p.status || "").toLowerCase();
      const matchStatus = statusFilter === "All Status" || 
        pStatus === statusFilter.toLowerCase();
      return matchType && matchStatus;
    });
  }, [promos, typeFilter, statusFilter]);

  // Upload image handler
  const handleUploadImage = async (file: File, isEdit: boolean) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("ទំហំរូបភាពមិនត្រូវលើសពី 10MB ទេ", "error");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    if (isEdit) setEditUploadingImg(true);
    else setCreateUploadingImg(true);

    try {
      const res = await api.post("/promo-codes/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.url) {
        if (isEdit) {
          setEditPromo(prev => ({ ...prev, image_url: res.data.url }));
        } else {
          setNewPromo(prev => ({ ...prev, image_url: res.data.url }));
        }
        showToast("បាន Upload រូបភាពប្រូម៉ូសិនជោគជ័យ! • Image uploaded");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "បរាជ័យក្នុងការ Upload រូបភាព", "error");
    } finally {
      if (isEdit) setEditUploadingImg(false);
      else setCreateUploadingImg(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setEditPromo({
      name: promo.name || "",
      code: promo.code || "",
      type: promo.type || "percentage",
      value: String(promo.value ?? ""),
      valid_from: promo.valid_from ? promo.valid_from.substring(0, 10) : "",
      valid_until: promo.valid_until ? promo.valid_until.substring(0, 10) : "",
      usage_max: promo.usage_max ? String(promo.usage_max) : "",
      status: promo.status || "active",
      auto_applied: Boolean(promo.auto_applied),
      image_url: promo.image_url || "",
      show_popup: Boolean(promo.show_popup),
      description: promo.description || "",
      target_url: promo.target_url || "",
    });
    setShowEdit(true);
  };

  // Submit Create
  const handleCreateSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.name || !newPromo.value) {
      showToast("សូមបំពេញឈ្មោះយុទ្ធនាការ និងតម្លៃបញ្ចុះតម្លៃ", "error");
      return;
    }

    setSubmittingCreate(true);
    try {
      const numVal = parseFloat(String(newPromo.value).replace(/[^0-9.]/g, '')) || 0;
      await api.post("/promo-codes", {
        name: newPromo.name.trim(),
        code: newPromo.code ? newPromo.code.toUpperCase().trim() : null,
        type: newPromo.type,
        value: numVal,
        valid_from: newPromo.valid_from || null,
        valid_until: newPromo.valid_until || null,
        usage_max: newPromo.usage_max ? parseInt(newPromo.usage_max) : null,
        status: newPromo.status,
        auto_applied: Boolean(newPromo.auto_applied),
        image_url: newPromo.image_url ? newPromo.image_url.trim() : null,
        show_popup: Boolean(newPromo.show_popup),
        description: newPromo.description ? newPromo.description.trim() : null,
        target_url: newPromo.target_url ? newPromo.target_url.trim() : null,
      });

      await fetchPromos();
      setShowCreate(false);
      setNewPromo(DEFAULT_FORM_STATE);
      showToast("បានបង្កើតប្រូម៉ូសិនថ្មីដោយជោគជ័យ! • Promotion created!");
    } catch (e: any) {
      const err = e.response?.data?.message || "បរាជ័យក្នុងការបង្កើតប្រូម៉ូសិន";
      showToast(err, "error");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Submit Edit
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;
    if (!editPromo.name || !editPromo.value) {
      showToast("សូមបំពេញឈ្មោះយុទ្ធនាការ និងតម្លៃបញ្ចុះតម្លៃ", "error");
      return;
    }

    setSubmittingEdit(true);
    try {
      const numVal = parseFloat(String(editPromo.value).replace(/[^0-9.]/g, '')) || 0;
      await api.put(`/promo-codes/${editingPromo.id}`, {
        name: editPromo.name.trim(),
        code: editPromo.code ? editPromo.code.toUpperCase().trim() : null,
        type: editPromo.type,
        value: numVal,
        valid_from: editPromo.valid_from || null,
        valid_until: editPromo.valid_until || null,
        usage_max: editPromo.usage_max ? parseInt(editPromo.usage_max) : null,
        status: editPromo.status,
        auto_applied: Boolean(editPromo.auto_applied),
        image_url: editPromo.image_url ? editPromo.image_url.trim() : null,
        show_popup: Boolean(editPromo.show_popup),
        description: editPromo.description ? editPromo.description.trim() : null,
        target_url: editPromo.target_url ? editPromo.target_url.trim() : null,
      });

      await fetchPromos();
      setShowEdit(false);
      setEditingPromo(null);
      showToast("បានកែប្រែប្រូម៉ូសិនដោយជោគជ័យ! • Promotion updated!");
    } catch (e: any) {
      const err = e.response?.data?.message || "បរាជ័យក្នុងការកែប្រែប្រូម៉ូសិន";
      showToast(err, "error");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleTogglePopup = async (promo: Promotion) => {
    try {
      showToast("កំពុងកែប្រែស្ថានភាព Popup...", "success");
      const nextVal = !promo.show_popup;
      await api.put(`/promo-codes/${promo.id}`, { show_popup: nextVal });
      setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, show_popup: nextVal } : p));
      showToast(nextVal ? "បានបើកបង្ហាញ Popup នៅលើ Website! • Popup enabled" : "បានបិទ Popup នៅលើ Website! • Popup disabled");
    } catch (e) {
      showToast("បរាជ័យក្នុងការប្តូរស្ថានភាព Popup", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបប្រូម៉ូសិននេះមែនទេ?")) return;
    showToast("កំពុងលុបប្រូម៉ូសិន...", "success");
    try {
      await api.delete(`/promo-codes/${id}`);
      setPromos(prev => prev.filter(p => p.id !== id));
      showToast("បានលុបប្រូម៉ូសិនដោយជោគជ័យ! • Promotion deleted.");
    } catch (e) {
      showToast("បរាជ័យក្នុងការលុបប្រូម៉ូសិន", "error");
    }
  };

  // Real stats
  const activeCount = promos.filter(p => (p.status || "").toLowerCase() === "active").length;
  const totalUses = promos.reduce((sum, p) => sum + (p.usage_count || 0), 0);
  const scheduledCount = promos.filter(p => (p.status || "").toLowerCase() === "scheduled").length;

  return (
    <div className="font-sans">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-lg shadow-lg font-medium text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'} transition-opacity`}>
          {toast.msg}
        </div>
      )}

      {/* CREATE PROMOTION MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-[9000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-xl w-full shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="p-2 bg-red-50 text-[#8B1A1A] rounded-lg">
                  <Tag size={18} />
                </span>
                <span>បង្កើតប្រូម៉ូសិនថ្មី • Create Promotion</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ឈ្មោះយុទ្ធនាការ • Campaign Name *
                </label>
                <input 
                  type="text"
                  required
                  value={newPromo.name} 
                  onChange={e => setNewPromo({ ...newPromo, name: e.target.value })} 
                  placeholder="ឧទាហរណ៍៖ October Tech Mega Sale" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ប្រភេទ • Type
                  </label>
                  <select 
                    value={newPromo.type} 
                    onChange={e => setNewPromo({ ...newPromo, type: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] bg-white"
                  >
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed Amount $</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    តម្លៃ • Value *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPromo.value} 
                    onChange={e => setNewPromo({ ...newPromo, value: e.target.value })} 
                    placeholder="20 or 50" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    កូដប្រូម៉ូសិន • Promo Code
                  </label>
                  <input 
                    type="text"
                    value={newPromo.code} 
                    onChange={e => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })} 
                    placeholder="STECH20" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] font-mono uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ចំនួនប្រើអតិបរមា • Max Uses
                  </label>
                  <input 
                    type="number" 
                    value={newPromo.usage_max} 
                    onChange={e => setNewPromo({ ...newPromo, usage_max: e.target.value })} 
                    placeholder="មិនកំណត់" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    សុពលភាពចាប់ពី • Valid From
                  </label>
                  <input 
                    type="date"
                    value={newPromo.valid_from} 
                    onChange={e => setNewPromo({ ...newPromo, valid_from: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    សុពលភាពដល់ • Valid Until
                  </label>
                  <input 
                    type="date"
                    value={newPromo.valid_until} 
                    onChange={e => setNewPromo({ ...newPromo, valid_until: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ស្ថានភាព • Status
                </label>
                <select 
                  value={newPromo.status} 
                  onChange={e => setNewPromo({ ...newPromo, status: e.target.value })} 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] bg-white"
                >
                  <option value="active">Active (កំពុងដំណើរការ)</option>
                  <option value="scheduled">Scheduled (គ្រោងទុក)</option>
                  <option value="disabled">Disabled (ផ្អាកដំណើរការ)</option>
                </select>
              </div>
              
              {/* Image Input (URL + Direct File Upload) */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-gray-700" />
                    <span>រូបភាព Slide Banner / Hero Banner (URL & File Upload)</span>
                  </label>
                  {newPromo.image_url && (
                    <button 
                      type="button" 
                      onClick={() => setNewPromo({ ...newPromo, image_url: "" })}
                      className="text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      លុបរូបភាព
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newPromo.image_url} 
                    onChange={e => setNewPromo({ ...newPromo, image_url: e.target.value })} 
                    placeholder="បញ្ចូល URL រូបភាព (https://... ឬ /images/...)" 
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#8B1A1A] bg-white" 
                  />
                  <input 
                    type="file" 
                    ref={createFileRef}
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file, false);
                    }}
                  />
                  <button
                    type="button"
                    disabled={createUploadingImg}
                    onClick={() => createFileRef.current?.click()}
                    className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    {createUploadingImg ? (
                      <Loader2 size={14} className="animate-spin text-[#8B1A1A]" />
                    ) : (
                      <Upload size={14} className="text-[#8B1A1A]" />
                    )}
                    <span>{createUploadingImg ? "កំពុង Upload..." : "Upload File"}</span>
                  </button>
                </div>

                {newPromo.image_url && (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-900/5 h-28 flex items-center justify-center">
                    <img 
                      src={newPromo.image_url} 
                      alt="Banner Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <span className="absolute bottom-1 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                      Live Preview
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ពិពណ៌នាសង្ខេប / Slogan • Description
                </label>
                <input 
                  type="text"
                  value={newPromo.description} 
                  onChange={e => setNewPromo({ ...newPromo, description: e.target.value })} 
                  placeholder="បញ្ចុះតម្លៃពិសេសលើគ្រប់ទំនិញ IT និង Gaming!" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Target Link • Shop URL
                </label>
                <input 
                  type="text"
                  value={newPromo.target_url} 
                  onChange={e => setNewPromo({ ...newPromo, target_url: e.target.value })} 
                  placeholder="/category/all ឬ /build-pc" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                />
              </div>

              {/* Placement Options (Popup + Hero Banner) */}
              <div className="space-y-3">
                <div className="p-3 bg-red-50/70 rounded-xl border border-red-200/60">
                  <label className="flex items-center gap-2.5 text-sm font-bold text-red-950 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newPromo.show_popup} 
                      onChange={e => setNewPromo({ ...newPromo, show_popup: e.target.checked })} 
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" 
                    />
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-red-600" />
                      <span>បង្ហាញជា Popup លើ Website Real-time • Live Homepage Popup</span>
                    </span>
                  </label>
                  <p className="text-[11px] text-red-700 mt-1 pl-6">
                    នៅពេលបើក ផ្ទាំងនេះនឹងលោត Pop up នៅលើ Home page នៃ Website ជូនអតិថិជន Real-time ភ្លាមៗ!
                  </p>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/60">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-950">
                    <ImageIcon size={14} className="text-blue-600" />
                    <span>បង្ហាញក្នុង Hero Slide Banner លើ Website • Live Hero Carousel Slide</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1 pl-5">
                    {newPromo.image_url 
                      ? "ប្រូម៉ូសិននេះមានរូបភាព Banner រួចរាល់ ហើយនឹងបង្ហាញជា Slide នៅលើ Hero Carousel នៃទំព័រដើម website ដោយស្វ័យប្រវត្តិ!" 
                      : "សូមបញ្ចូល Image URL ឬ Upload File រូបភាពខាងលើ ដើម្បីឲ្យ Banner បង្ហាញលើ Hero Carousel!"}
                  </p>
                </div>
              </div>
              
              <div className="pt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newPromo.auto_applied} 
                    onChange={e => setNewPromo({ ...newPromo, auto_applied: e.target.checked })} 
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" 
                  />
                  <span>ដាក់បញ្ចុះតម្លៃស្វ័យប្រវត្តដោយមិនបាច់វាយកូដ • Auto-apply without code</span>
                </label>
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowCreate(false)} 
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  បោះបង់ • Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingCreate}
                  className="flex-1 py-2.5 border-none rounded-xl bg-[#8B1A1A] hover:bg-[#6B1010] text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingCreate ? "កំពុងរក្សាទុក..." : "បង្កើតប្រូម៉ូសិន • Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROMOTION MODAL */}
      {showEdit && editingPromo && (
        <div className="fixed inset-0 bg-black/60 z-[9000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-xl w-full shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Edit size={18} />
                </span>
                <span>កែប្រែប្រូម៉ូសិន • Edit Promotion</span>
              </h3>
              <button 
                type="button" 
                onClick={() => { setShowEdit(false); setEditingPromo(null); }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ឈ្មោះយុទ្ធនាការ • Campaign Name *
                </label>
                <input 
                  type="text"
                  required
                  value={editPromo.name} 
                  onChange={e => setEditPromo({ ...editPromo, name: e.target.value })} 
                  placeholder="ឧទាហរណ៍៖ October Tech Mega Sale" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ប្រភេទ • Type
                  </label>
                  <select 
                    value={editPromo.type} 
                    onChange={e => setEditPromo({ ...editPromo, type: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] bg-white"
                  >
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed Amount $</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    តម្លៃ • Value *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPromo.value} 
                    onChange={e => setEditPromo({ ...editPromo, value: e.target.value })} 
                    placeholder="20 or 50" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    កូដប្រូម៉ូសិន • Promo Code
                  </label>
                  <input 
                    type="text"
                    value={editPromo.code} 
                    onChange={e => setEditPromo({ ...editPromo, code: e.target.value.toUpperCase() })} 
                    placeholder="STECH20" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] font-mono uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    ចំនួនប្រើអតិបរមា • Max Uses
                  </label>
                  <input 
                    type="number" 
                    value={editPromo.usage_max} 
                    onChange={e => setEditPromo({ ...editPromo, usage_max: e.target.value })} 
                    placeholder="មិនកំណត់" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    សុពលភាពចាប់ពី • Valid From
                  </label>
                  <input 
                    type="date"
                    value={editPromo.valid_from} 
                    onChange={e => setEditPromo({ ...editPromo, valid_from: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    សុពលភាពដល់ • Valid Until
                  </label>
                  <input 
                    type="date"
                    value={editPromo.valid_until} 
                    onChange={e => setEditPromo({ ...editPromo, valid_until: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ស្ថានភាព • Status
                </label>
                <select 
                  value={editPromo.status} 
                  onChange={e => setEditPromo({ ...editPromo, status: e.target.value })} 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A] bg-white"
                >
                  <option value="active">Active (កំពុងដំណើរការ)</option>
                  <option value="scheduled">Scheduled (គ្រោងទុក)</option>
                  <option value="disabled">Disabled (ផ្អាកដំណើរការ)</option>
                </select>
              </div>
              
              {/* Image Input (URL + Direct File Upload) */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-gray-700" />
                    <span>រូបភាព Slide Banner / Hero Banner (URL & File Upload)</span>
                  </label>
                  {editPromo.image_url && (
                    <button 
                      type="button" 
                      onClick={() => setEditPromo({ ...editPromo, image_url: "" })}
                      className="text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      លុបរូបភាព
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={editPromo.image_url} 
                    onChange={e => setEditPromo({ ...editPromo, image_url: e.target.value })} 
                    placeholder="បញ្ចូល URL រូបភាព (https://... ឬ /images/...)" 
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#8B1A1A] bg-white" 
                  />
                  <input 
                    type="file" 
                    ref={editFileRef}
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file, true);
                    }}
                  />
                  <button
                    type="button"
                    disabled={editUploadingImg}
                    onClick={() => editFileRef.current?.click()}
                    className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    {editUploadingImg ? (
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                    ) : (
                      <Upload size={14} className="text-blue-600" />
                    )}
                    <span>{editUploadingImg ? "កំពុង Upload..." : "Upload File"}</span>
                  </button>
                </div>

                {editPromo.image_url && (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-900/5 h-28 flex items-center justify-center">
                    <img 
                      src={editPromo.image_url} 
                      alt="Banner Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <span className="absolute bottom-1 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                      Live Preview
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ពិពណ៌នាសង្ខេប / Slogan • Description
                </label>
                <input 
                  type="text"
                  value={editPromo.description} 
                  onChange={e => setEditPromo({ ...editPromo, description: e.target.value })} 
                  placeholder="បញ្ចុះតម្លៃពិសេសលើគ្រប់ទំនិញ IT និង Gaming!" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Target Link • Shop URL
                </label>
                <input 
                  type="text"
                  value={editPromo.target_url} 
                  onChange={e => setEditPromo({ ...editPromo, target_url: e.target.value })} 
                  placeholder="/category/all ឬ /build-pc" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B1A1A]" 
                />
              </div>

              {/* Placement Options (Popup + Hero Banner) */}
              <div className="space-y-3">
                <div className="p-3 bg-red-50/70 rounded-xl border border-red-200/60">
                  <label className="flex items-center gap-2.5 text-sm font-bold text-red-950 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editPromo.show_popup} 
                      onChange={e => setEditPromo({ ...editPromo, show_popup: e.target.checked })} 
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" 
                    />
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-red-600" />
                      <span>បង្ហាញជា Popup លើ Website Real-time • Live Homepage Popup</span>
                    </span>
                  </label>
                  <p className="text-[11px] text-red-700 mt-1 pl-6">
                    នៅពេលបើក ផ្ទាំងនេះនឹងលោត Pop up នៅលើ Home page នៃ Website ជូនអតិថិជន Real-time ភ្លាមៗ!
                  </p>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/60">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-950">
                    <ImageIcon size={14} className="text-blue-600" />
                    <span>បង្ហាញក្នុង Hero Slide Banner លើ Website • Live Hero Carousel Slide</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1 pl-5">
                    {editPromo.image_url 
                      ? "ប្រូម៉ូសិននេះមានរូបភាព Banner រួចរាល់ ហើយនឹងបង្ហាញជា Slide នៅលើ Hero Carousel នៃទំព័រដើម website ដោយស្វ័យប្រវត្តិ!" 
                      : "សូមបញ្ចូល Image URL ឬ Upload File រូបភាពខាងលើ ដើម្បីឲ្យ Banner បង្ហាញលើ Hero Carousel!"}
                  </p>
                </div>
              </div>
              
              <div className="pt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editPromo.auto_applied} 
                    onChange={e => setEditPromo({ ...editPromo, auto_applied: e.target.checked })} 
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" 
                  />
                  <span>ដាក់បញ្ចុះតម្លៃស្វ័យប្រវត្តដោយមិនបាច់វាយកូដ • Auto-apply without code</span>
                </label>
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => { setShowEdit(false); setEditingPromo(null); }} 
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  បោះបង់ • Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 border-none rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingEdit ? "កំពុងរក្សាទុក..." : "រក្សាទុកការកែប្រែ • Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Promotion Management</h1>
          <p className="text-gray-500 text-sm">Create and manage sales campaigns, discount coupons, hero slide banners, and limited-time offers.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)} 
          className="px-4 py-2.5 bg-[#8B1A1A] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#6B1010] transition-colors cursor-pointer shadow-sm"
        >
          <Plus size={16} />
          Create New Promotion
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Tag size={20} />
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded">Current</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 mb-1">Active Campaigns</div>
          <div className="text-3xl font-bold text-gray-900">{activeCount}</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">Live</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 mb-1">Total Promo Usages</div>
          <div className="text-3xl font-bold text-gray-900 tracking-tight">{totalUses}</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded">Planned</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 mb-1">Scheduled Promotions</div>
          <div className="text-3xl font-bold text-gray-900">{scheduledCount}</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-10">
        
        {/* Filters Row */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 font-semibold text-sm">
            <Filter size={18} />
            Filters:
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value)} 
                className="w-full py-2 pl-3 pr-8 border border-gray-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 text-gray-700"
              >
                <option>All Types</option>
                <option>Percentage</option>
                <option>Fixed Amount</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
            <div className="relative flex-1 sm:flex-none">
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)} 
                className="w-full py-2 pl-3 pr-8 border border-gray-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 text-gray-700"
              >
                <option>All Status</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="disabled">Disabled</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">CAMPAIGN NAME</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">TYPE & VALUE</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">VALIDITY PERIOD</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">USAGE</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">LIVE POPUP</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <div className="w-8 h-8 border-2 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    កំពុងទាញទិន្នន័យពី Database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">No promotions found in database.</td>
                </tr>
              ) : filtered.map((promo) => {
                const isFixed = (promo.type || "").toLowerCase().includes("fix");
                const valStr = isFixed ? `-$${promo.value}` : `${promo.value}%`;
                const isActive = (promo.status || "").toLowerCase() === "active";
                const dateStr = promo.valid_from && promo.valid_until 
                  ? `${new Date(promo.valid_from).toLocaleDateString()} - ${new Date(promo.valid_until).toLocaleDateString()}` 
                  : (promo.valid_until ? `Ends ${new Date(promo.valid_until).toLocaleDateString()}` : "No expiry");

                return (
                  <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {promo.image_url ? (
                          <div className="relative group shrink-0">
                            <img 
                              src={promo.image_url} 
                              alt={promo.name} 
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200" 
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" title="Hero Banner Ready" />
                          </div>
                        ) : null}
                        <div>
                          <div className="text-sm font-bold text-gray-900 mb-0.5 flex items-center gap-2">
                            <span>{promo.name}</span>
                            {promo.image_url && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                                Hero Banner
                              </span>
                            )}
                          </div>
                          {promo.description && (
                            <div className="text-[11px] text-gray-500 mb-1 max-w-xs truncate">{promo.description}</div>
                          )}
                          <div className={`text-xs ${promo.auto_applied ? 'text-gray-500' : 'text-gray-600'}`}>
                            {promo.auto_applied ? "Auto-applied" : <>Code: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded font-bold text-[#8B1A1A]">{promo.code || "N/A"}</span></>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center rounded overflow-hidden">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 uppercase">{promo.type}</span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1">{valStr}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {dateStr}
                    </td>
                    <td className="p-4 w-48">
                      {promo.usage_max ? (
                        <>
                          <div className="text-sm font-bold text-gray-900 mb-1.5 flex justify-between">
                            {promo.usage_count || 0} <span className="font-normal text-gray-400">/ {promo.usage_max}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${(promo.usage_count || 0) / promo.usage_max > 0.8 ? 'bg-red-500' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(100, ((promo.usage_count || 0) / promo.usage_max) * 100)}%` }}
                            ></div>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {(promo.usage_count || 0) === 0 ? "Not started" : `${promo.usage_count} uses`}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold capitalize">
                          <Clock size={12} /> {promo.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePopup(promo)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          promo.show_popup
                            ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-xs"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-500 border border-transparent"
                        }`}
                        title="ចុចដើម្បីបើក/បិទ Popup លើទំព័រដើម website"
                      >
                        <span className={`w-2 h-2 rounded-full ${promo.show_popup ? "bg-amber-500 animate-pulse" : "bg-gray-400"}`} />
                        {promo.show_popup ? "Popup ON" : "Off"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(promo)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" 
                          title="កែប្រែ • Edit Promotion"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(promo.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                          title="លុប • Delete Promotion"
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
      </div>
    </div>
  );
}
