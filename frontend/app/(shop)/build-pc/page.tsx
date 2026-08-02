"use client";
import { useState, useMemo } from "react";
import {
  SLOTS, COMPONENTS_BY_SLOT, checkCompatibility,
  type ComponentSlot, type PCComponent,
} from "@/lib/pc-builder-data";
import { useLangStore } from "@/store/langStore";
import { translations } from "@/lib/translations";

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
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "10px", width: "100%",
        maxWidth: "680px", maxHeight: "85vh", display: "flex",
        flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#8B1A1A", letterSpacing: ".08em", textTransform: "uppercase" }}>Select Component</p>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>{meta.label}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#888" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Search */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #f0f0f0" }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${meta.label}...`}
            style={{
              width: "100%", padding: "9px 14px", border: "1px solid #ddd",
              borderRadius: "6px", fontSize: "14px", outline: "none", color: "#1a1a1a",
            }}
          />
        </div>
        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map(c => (
            <button key={c.id} onClick={() => { onSelect(c); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: "14px",
                width: "100%", padding: "14px 24px", background: "none",
                border: "none", borderBottom: "1px solid #f5f5f5",
                cursor: "pointer", textAlign: "left", transition: "background 150ms",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8f8f8")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <div style={{ width: 52, height: 52, borderRadius: 6, overflow: "hidden", background: "#f0f0f0", flexShrink: 0 }}>
                <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{c.name}</span>
                  {c.badge && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 2, background: c.badge === "HOT" ? "#c0392b" : "#1a4fa0", color: "#fff" }}>{c.badge}</span>}
                </div>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{c.specs}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#8B1A1A" }}>${c.price.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>{fmtKHR(c.price)}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "#aaa", fontSize: 14 }}>No results found.</div>
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
  const [checked, setChecked] = useState(false);
  const { lang } = useLangStore();
  const t = translations[lang].buildPc;

  const issues = useMemo(() => checked ? checkCompatibility(selected) : [], [selected, checked]);

  const totalUSD = Object.values(selected).reduce((s, c) => s + (c?.price ?? 0), 0);

  const remove = (slot: ComponentSlot) => {
    setSelected(prev => { const n = { ...prev }; delete n[slot]; return n; });
    setChecked(false);
  };

  const allCompatible = issues.filter(i => i.type === "error").length === 0;

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      {/* Page Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "28px 0 0" }}>
        <div className="container">
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.02em" }}>{t.title}</h1>
          <p style={{ fontSize: 14, color: "#777", marginTop: 4, marginBottom: 16 }}>{t.subtitle}</p>
          <div style={{ width: 48, height: 3, background: "linear-gradient(90deg,#8B1A1A,#1a4fa0)", borderRadius: 2 }} />
        </div>
      </div>

      {/* Compatibility Banner */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5" }}>
        <div className="container" style={{ padding: "14px 24px" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: checked ? (allCompatible ? "#f0fdf4" : "#fff5f5") : "#f5f8ff",
            border: `1px solid ${checked ? (allCompatible ? "#86efac" : "#fca5a5") : "#bfdbfe"}`,
            borderRadius: 6, padding: "12px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {checked ? (
                allCompatible
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              )}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: checked ? (allCompatible ? "#166534" : "#991b1b") : "#1e40af", letterSpacing: ".07em", textTransform: "uppercase" }}>
                  {checked ? (allCompatible ? "Compatibility Status" : "Compatibility Issues") : "Compatibility Check"}
                </p>
                <p style={{ fontSize: 13, color: checked ? (allCompatible ? "#15803d" : "#b91c1c") : "#3b82f6" }}>
                  {!checked
                    ? "Click \"Run Check\" to verify component compatibility."
                    : allCompatible
                    ? "All selected components are compatible."
                    : issues.map(i => i.message).join(" • ")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setChecked(true)}
              style={{
                padding: "8px 18px", fontSize: 12, fontWeight: 700, letterSpacing: ".06em",
                textTransform: "uppercase", background: "#fff", border: "1px solid #1a1a1a",
                borderRadius: 4, cursor: "pointer", color: "#1a1a1a", whiteSpace: "nowrap",
                transition: "all 150ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#1a1a1a"; }}
            >
              {t.runCheck}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container" style={{ padding: "28px 24px" }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* Component Slots */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SLOTS.map(slot => {
              const comp = selected[slot.id];
              return (
                <div key={slot.id} style={{
                  background: "#fff", border: `1px dashed ${comp ? "#1a4fa0" : "#d0d0d0"}`,
                  borderRadius: 8, padding: "16px 20px",
                  transition: "border-color 200ms, box-shadow 200ms",
                  boxShadow: comp ? "0 2px 12px rgba(26,79,160,0.08)" : "none",
                }}>
                  {comp ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 6, overflow: "hidden", background: "#f0f0f0", flexShrink: 0 }}>
                        <img src={comp.image} alt={comp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#1a4fa0", letterSpacing: ".07em", textTransform: "uppercase" }}>{slot.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{comp.name}</p>
                        <p style={{ fontSize: 12, color: "#888" }}>{comp.specs}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#8B1A1A" }}>${comp.price.toFixed(2)}</div>
                        </div>
                        <button onClick={() => remove(slot.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4 }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#e53e3e")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#bbb")}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", flexShrink: 0 }}>
                        <SlotIcon type={slot.icon} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{slot.label}</p>
                        <p style={{ fontSize: 12, color: "#aaa" }}>{slot.sublabel}</p>
                      </div>
                      <button
                        onClick={() => setOpenSlot(slot.id)}
                        style={{
                          padding: "9px 22px", fontSize: 13, fontWeight: 700, background: "#1a1a1a",
                          color: "#fff", border: "none", borderRadius: 4, cursor: "pointer",
                          letterSpacing: ".04em", transition: "background 150ms",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#333")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
                      >
                        SELECT
                      </button>
                    </div>
                  )}
                  {comp && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setOpenSlot(slot.id)}
                        style={{ fontSize: 12, fontWeight: 600, color: "#1a4fa0", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >Change</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Build Summary Sidebar */}
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 24, position: "sticky", top: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 20 }}>{t.buildSummary}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {SLOTS.map(slot => (
                <div key={slot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#777" }}>{slot.label.replace(" Processor", "").replace(" (RAM)", "").replace(" (SSD/HDD)", "").replace(" (PSU)", "")}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: selected[slot.id] ? "#1a1a1a" : "#ccc" }}>
                    {selected[slot.id] ? `$${selected[slot.id]!.price.toFixed(2)}` : "——"}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "2px solid #e5e5e5", paddingTop: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{t.totalUsd}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#8B1A1A" }}>{fmtUSD(totalUSD)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#aaa" }}>{t.totalKhr}</span>
                <span style={{ fontSize: 13, color: "#aaa" }}>{fmtKHR(totalUSD)}</span>
              </div>
            </div>

            <button
              style={{
                width: "100%", padding: "13px", fontSize: 13, fontWeight: 800,
                background: totalUSD > 0 ? "#8B1A1A" : "#ccc",
                color: "#fff", border: "none", borderRadius: 6, cursor: totalUSD > 0 ? "pointer" : "not-allowed",
                letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10,
                transition: "background 150ms",
              }}
              disabled={totalUSD === 0}
              onMouseEnter={e => { if (totalUSD > 0) e.currentTarget.style.background = "#6B1010"; }}
              onMouseLeave={e => { if (totalUSD > 0) e.currentTarget.style.background = "#8B1A1A"; }}
            >
              {t.addToCart}
            </button>
            <button
              style={{
                width: "100%", padding: "13px", fontSize: 13, fontWeight: 700,
                background: "#fff", color: "#1a4fa0", border: "2px solid #1a4fa0",
                borderRadius: 6, cursor: "pointer", letterSpacing: ".07em",
                textTransform: "uppercase", transition: "all 150ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1a4fa0"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#1a4fa0"; }}
            >
              {t.saveBuild}
            </button>
          </div>
        </div>
      </div>

      {/* Select Modal */}
      {openSlot && (
        <SelectModal
          slot={openSlot}
          components={COMPONENTS_BY_SLOT[openSlot]}
          onSelect={c => setSelected(prev => ({ ...prev, [openSlot]: c }))}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}
