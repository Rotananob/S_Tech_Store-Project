"use client";
import { useState, useMemo, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "@/i18n/routing";
import {
  SLOTS, COMPONENTS_BY_SLOT, checkCompatibility,
  type ComponentSlot, type PCComponent,
} from "@/lib/pc-builder-data";
import NextImage from "next/image";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/translations";
import { 
  CheckCircle2, AlertTriangle, Cpu, Wrench, ShoppingCart, 
  Bookmark, X, Search, Sparkles, ShieldCheck 
} from "lucide-react";

const USD_TO_KHR = 4060;
const fmtUSD = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtKHR = (n: number) => `≈${(Math.round(n * USD_TO_KHR / 1000) * 1000).toLocaleString()} ៛`;

// ─── Slot Icons ───────────────────────────────────────────────────────────────
function SlotIcon({ type }: { type: string }) {
  const cls = "w-5 h-5";
  if (type === "cpu") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  );
  if (type === "motherboard") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="2" width="20" height="20" rx="2"/>
      <rect x="6" y="6" width="5" height="5"/><rect x="13" y="6" width="5" height="5"/>
      <rect x="6" y="13" width="5" height="5"/><line x1="13" y1="15" x2="18" y2="15"/>
      <line x1="13" y1="18" x2="18" y2="18"/>
    </svg>
  );
  if (type === "ram") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="10" rx="1"/>
      <line x1="6" y1="7" x2="6" y2="17"/><line x1="10" y1="7" x2="10" y2="17"/>
      <line x1="14" y1="7" x2="14" y2="17"/><line x1="18" y1="7" x2="18" y2="17"/>
    </svg>
  );
  if (type === "gpu") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="10" rx="2"/>
      <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
      <line x1="12" y1="7" x2="12" y2="4"/><line x1="8" y1="4" x2="16" y2="4"/>
    </svg>
  );
  if (type === "storage") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <circle cx="17" cy="12" r="1.5"/><line x1="6" y1="9" x2="12" y2="9"/>
      <line x1="6" y1="12" x2="12" y2="12"/><line x1="6" y1="15" x2="10" y2="15"/>
    </svg>
  );
  if (type === "psu") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <line x1="12" y1="10" x2="12" y2="14"/><line x1="10" y1="12" x2="14" y2="12"/>
      <circle cx="17" cy="12" r="1.5"/>
    </svg>
  );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="2" width="18" height="20" rx="2"/>
      <rect x="7" y="6" width="10" height="6" rx="1"/>
      <line x1="7" y1="16" x2="10" y2="16"/><line x1="7" y1="19" x2="10" y2="19"/>
    </svg>
  );
}

// ─── Component Modal ──────────────────────────────────────────────────────────
function SelectModal({
  slot, components, onSelect, onClose,
}: {
  slot: ComponentSlot;
  components: PCComponent[];
  onSelect: (c: PCComponent) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const meta = SLOTS.find(s => s.id === slot)!;
  const filtered = components.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#151922] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-100 dark:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black text-[#8B1A1A] dark:text-red-400 tracking-wider uppercase">Select Component</p>
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">{meta.label}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-300 flex items-center justify-center cursor-pointer transition-colors border-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${meta.label}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12151e] text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A] dark:focus:border-red-500 transition-colors shadow-2xs"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-white/5 p-2">
          {filtered.map(c => (
            <button 
              key={c.id} 
              onClick={() => { onSelect(c); onClose(); }}
              className="flex items-center gap-4 w-full p-3.5 sm:p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer border-none bg-transparent group"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 flex-shrink-0 relative border border-gray-100 dark:border-white/10 p-1">
                <NextImage src={c.image || "/placeholder.png"} alt={c.name || "Component"} fill className="object-contain p-1 group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#8B1A1A] dark:group-hover:text-red-400 transition-colors line-clamp-1">{c.name}</span>
                  {c.badge && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white uppercase tracking-wider">
                      {c.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{c.specs}</p>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <div className="text-base font-black text-[#8B1A1A] dark:text-red-400 font-mono">${c.price.toFixed(2)}</div>
                <div className="text-[11px] text-gray-400 font-medium font-khmer">{fmtKHR(c.price)}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">No components found matching your search.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BuildPCPage() {
  const [selected, setSelected] = useState<Partial<Record<ComponentSlot, PCComponent>>>({});
  const [openSlot, setOpenSlot] = useState<ComponentSlot | null>(null);
  const [dbComponents, setDbComponents] = useState<Record<string, PCComponent[]>>({});
  const { addItem } = useCartStore();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const { lang } = useLangStore();
  const t = translations[lang].buildPc;

  const issues = useMemo(() => checked ? checkCompatibility(selected) : [], [selected, checked]);

  const totalUSD = Object.values(selected).reduce((s, c) => s + (c?.price ?? 0), 0);

  useEffect(() => {
    import("@/lib/services/product.service").then(async ({ getProducts }) => {
      try {
        const res = await getProducts();
        const items = Array.isArray(res) ? res : (res as any)?.data || [];
        if (!items || items.length === 0) return;

        const parsed = items.map((p: any) => {
          const specs = p.description || "";
          let socket = specs.match(/Socket:\s*([^\s,]+)/)?.[1];
          if (!socket && p.category?.slug === "motherboard") {
             if (specs.includes("LGA1700")) socket = "LGA1700";
             if (specs.includes("AM5")) socket = "AM5";
          }
          let memType = specs.match(/(DDR[45])/)?.[1];
          return {
            id: p.id.toString(),
            name: p.name,
            brand: p.brand || "Generic",
            price: p.sale_price || p.price,
            image: p.image_url || p.images?.[0] || "",
            specs: specs,
            socket, memType,
            categorySlug: p.category?.slug
          };
        });

        const bySlot: Record<string, PCComponent[]> = {};
        for (const slot of SLOTS) {
           bySlot[slot.id] = parsed.filter((c: any) => c.categorySlug === slot.id);
           if (bySlot[slot.id].length === 0) {
              bySlot[slot.id] = COMPONENTS_BY_SLOT[slot.id]; // fallback to mock if DB empty
           }
        }
        setDbComponents(bySlot);
      } catch (e) {
        console.error(e);
      }
    });
  }, []);

  const handleAddToCart = () => {
    Object.values(selected).forEach(comp => {
      if (comp) addItem({ id: Number(comp.id) || Date.now(), name: comp.name, price: comp.price, quantity: 1, image_url: comp.image });
    });
    router.push("/cart");
  };

  const handleSaveBuild = () => {
    alert("Build Saved Successfully!");
  };

  const remove = (slot: ComponentSlot) => {
    setSelected(prev => { const n = { ...prev }; delete n[slot]; return n; });
    setChecked(false);
  };

  const allCompatible = issues.filter(i => i.type === "error").length === 0;

  return (
    <div className="bg-gray-50 dark:bg-[#0c0e12] min-h-screen text-gray-900 dark:text-gray-100 transition-colors pb-16">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#12151e] border-b border-gray-200 dark:border-white/10 py-8 lg:py-10">
        <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A] animate-pulse" />
            <span className="text-xs font-bold text-[#8B1A1A] dark:text-red-400 uppercase tracking-wider">Custom PC Rig Builder</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">{t.title}</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{t.subtitle}</p>
        </div>
      </div>

      {/* Compatibility Banner */}
      <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-xs ${
          checked 
            ? (allCompatible 
                ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200" 
                : "bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-900 dark:text-red-200") 
            : "bg-white dark:bg-[#151922] border-gray-200/80 dark:border-white/10"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              checked 
                ? (allCompatible ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40" : "bg-red-100 text-red-600 dark:bg-red-900/40")
                : "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
            }`}>
              {checked ? (
                allCompatible ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />
              ) : (
                <Wrench size={20} />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">
                {checked ? (allCompatible ? "Hardware Compatible ✓" : "Compatibility Conflict Detected") : "Automatic Compatibility Engine"}
              </p>
              <p className="text-xs sm:text-sm mt-0.5 opacity-90">
                {!checked
                  ? "Click \"Run Compatibility Check\" to verify socket, memory type and power wattage."
                  : allCompatible
                  ? "All selected components are fully compatible and ready to build."
                  : issues.map(i => i.message).join(" • ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setChecked(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#8B1A1A] hover:bg-[#6b1010] text-white shadow-xs transition-all cursor-pointer whitespace-nowrap border-none self-end sm:self-auto"
          >
            {t.runCheck}
          </button>
        </div>
      </div>

      {/* Main Content (2-Column Desktop Grid) */}
      <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8 items-start">

          {/* LEFT: Component Slots */}
          <div className="space-y-3.5">
            {SLOTS.map(slot => {
              const comp = selected[slot.id];
              return (
                <div 
                  key={slot.id} 
                  className={`p-4 sm:p-5 rounded-2xl transition-all duration-200 border ${
                    comp 
                      ? "bg-white dark:bg-[#151922] border-[#8B1A1A]/30 dark:border-red-500/30 shadow-xs" 
                      : "bg-white/70 dark:bg-[#151922]/50 border-dashed border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  {comp ? (
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 flex-shrink-0 relative border border-gray-100 dark:border-white/10 p-1">
                        <NextImage src={comp.image || "/placeholder.png"} alt={comp.name || "Component"} fill className="object-contain p-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-[#8B1A1A] dark:text-red-400 uppercase tracking-wider">{slot.label}</p>
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white line-clamp-1">{comp.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{comp.specs}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-black text-[#8B1A1A] dark:text-red-400 font-mono">${comp.price.toFixed(2)}</div>
                          <div className="text-[10px] text-gray-400 font-khmer">{fmtKHR(comp.price)}</div>
                        </div>
                        <button 
                          onClick={() => remove(slot.id)} 
                          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 text-gray-400 flex items-center justify-center cursor-pointer transition-colors border-none"
                          title="Remove Component"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 flex items-center justify-center shrink-0">
                          <SlotIcon type={slot.icon} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{slot.label}</h4>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{slot.sublabel}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setOpenSlot(slot.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 transition-all cursor-pointer border-none shadow-xs"
                      >
                        Select
                      </button>
                    </div>
                  )}

                  {comp && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex gap-3 text-xs">
                      <button
                        onClick={() => setOpenSlot(slot.id)}
                        className="text-[#1a4fa0] dark:text-blue-400 font-bold hover:underline cursor-pointer border-none bg-transparent p-0"
                      >
                        Change Component &rarr;
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT: Build Summary Sidebar (Sticky Desktop) */}
          <div className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm sticky top-24 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4">
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[#8B1A1A] dark:text-red-400" />
                <span>{t.buildSummary}</span>
              </h2>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-white/10 px-2.5 py-1 rounded-full">
                {Object.keys(selected).length} / {SLOTS.length} Slots
              </span>
            </div>

            <div className="space-y-3">
              {SLOTS.map(slot => (
                <div key={slot.id} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{slot.label.split(" (")[0]}</span>
                  <span className={`font-mono font-bold ${selected[slot.id] ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                    {selected[slot.id] ? `$${selected[slot.id]!.price.toFixed(2)}` : "—"}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-white/10 pt-4 space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{t.totalUsd}</span>
                <span className="text-2xl font-black text-[#8B1A1A] dark:text-red-400 font-mono">{fmtUSD(totalUSD)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 font-medium font-khmer">
                <span>{t.totalKhr}</span>
                <span>{fmtKHR(totalUSD)}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={totalUSD === 0}
                className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-md disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white"
              >
                <ShoppingCart size={17} />
                <span>{t.addToCart}</span>
              </button>

              <button
                onClick={handleSaveBuild}
                className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200"
              >
                <Bookmark size={15} />
                <span>{t.saveBuild}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-2 text-[11px] text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>100% Genuine Boxed Hardware</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Free Assembly & Thermal Paste Cable Management</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Select Modal */}
      {openSlot && (
        <SelectModal
          slot={openSlot}
          components={dbComponents[openSlot] || COMPONENTS_BY_SLOT[openSlot]}
          onSelect={c => setSelected(prev => ({ ...prev, [openSlot]: c }))}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}
