// PC Builder Data — Mock components with compatibility rules
// USD_TO_KHR rate from mock-data.ts

export const USD_TO_KHR = 4060;

export type ComponentSlot = "cpu" | "motherboard" | "ram" | "gpu" | "storage" | "psu" | "case";

export interface PCComponent {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  specs: string;
  socket?: string;       // CPU / Motherboard socket
  memType?: string;      // RAM / Motherboard memory type
  formFactor?: string;   // Motherboard / Case form factor
  tdp?: number;          // CPU/GPU TDP watts
  wattage?: number;      // PSU wattage
  badge?: string;
}

export interface SlotMeta {
  id: ComponentSlot;
  label: string;
  sublabel: string;
  icon: string;
}

export const SLOTS: SlotMeta[] = [
  { id: "cpu",         label: "CPU Processor",     sublabel: "Choose a processor",           icon: "cpu" },
  { id: "motherboard", label: "Motherboard",        sublabel: "Must match CPU socket",         icon: "motherboard" },
  { id: "ram",         label: "Memory (RAM)",       sublabel: "Choose system memory",          icon: "ram" },
  { id: "gpu",         label: "Graphics Card",      sublabel: "Choose a GPU",                  icon: "gpu" },
  { id: "storage",     label: "Storage (SSD/HDD)",  sublabel: "Choose primary storage",        icon: "storage" },
  { id: "psu",         label: "Power Supply (PSU)", sublabel: "Choose a power supply",         icon: "psu" },
  { id: "case",        label: "PC Case",            sublabel: "Choose a compatible case",      icon: "case" },
];

// ─── CPU Components ───────────────────────────────────────────────────────────
export const CPU_COMPONENTS: PCComponent[] = [
  { id: "cpu-1", name: "Intel Core i7-13700K", brand: "Intel", price: 419, specs: "16-Core, 24-Thread, 5.4 GHz Max Boost", socket: "LGA1700", tdp: 125, badge: "HOT",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80" },
  { id: "cpu-2", name: "Intel Core i9-14900K", brand: "Intel", price: 589, specs: "24-Core, 32-Thread, 6.0 GHz Max Boost", socket: "LGA1700", tdp: 253,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80" },
  { id: "cpu-3", name: "AMD Ryzen 9 7950X", brand: "AMD", price: 699, specs: "16-Core, 32-Thread, 5.7 GHz Max Boost", socket: "AM5", tdp: 170, badge: "NEW",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80" },
  { id: "cpu-4", name: "AMD Ryzen 5 7600X", brand: "AMD", price: 249, specs: "6-Core, 12-Thread, 5.3 GHz Max Boost", socket: "AM5", tdp: 105,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80" },
  { id: "cpu-5", name: "Intel Core i5-13600K", brand: "Intel", price: 319, specs: "14-Core, 20-Thread, 5.1 GHz Max Boost", socket: "LGA1700", tdp: 125,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80" },
];

// ─── Motherboard Components ───────────────────────────────────────────────────
export const MOTHERBOARD_COMPONENTS: PCComponent[] = [
  { id: "mb-1", name: "ASUS ROG MAXIMUS Z790 Hero", brand: "ASUS", price: 629, specs: "Z790, LGA1700, DDR5, ATX", socket: "LGA1700", memType: "DDR5", formFactor: "ATX",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80" },
  { id: "mb-2", name: "MSI MAG Z790 Tomahawk WiFi", brand: "MSI", price: 299, specs: "Z790, LGA1700, DDR5, ATX", socket: "LGA1700", memType: "DDR5", formFactor: "ATX", badge: "HOT",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80" },
  { id: "mb-3", name: "Gigabyte X670E AORUS Master", brand: "Gigabyte", price: 499, specs: "X670E, AM5, DDR5, ATX", socket: "AM5", memType: "DDR5", formFactor: "ATX",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80" },
  { id: "mb-4", name: "ASUS TUF Gaming B650-Plus", brand: "ASUS", price: 199, specs: "B650, AM5, DDR5, ATX", socket: "AM5", memType: "DDR5", formFactor: "ATX",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80" },
];

// ─── RAM Components ───────────────────────────────────────────────────────────
export const RAM_COMPONENTS: PCComponent[] = [
  { id: "ram-1", name: "Corsair Dominator Titanium 32GB", brand: "Corsair", price: 189, specs: "DDR5-6000, 2x16GB, CL30", memType: "DDR5", badge: "NEW",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&q=80" },
  { id: "ram-2", name: "G.Skill Trident Z5 32GB", brand: "G.Skill", price: 149, specs: "DDR5-5600, 2x16GB, CL36",  memType: "DDR5",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&q=80" },
  { id: "ram-3", name: "Kingston Fury Beast 64GB", brand: "Kingston", price: 229, specs: "DDR5-5200, 2x32GB, CL40", memType: "DDR5",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&q=80" },
  { id: "ram-4", name: "Corsair Vengeance 16GB", brand: "Corsair", price: 69, specs: "DDR5-4800, 2x8GB, CL40", memType: "DDR5",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&q=80" },
];

// ─── GPU Components ───────────────────────────────────────────────────────────
export const GPU_COMPONENTS: PCComponent[] = [
  { id: "gpu-1", name: "NVIDIA RTX 4090 24GB", brand: "NVIDIA", price: 1599, specs: "Ada Lovelace, 24GB GDDR6X, 16384 CUDA Cores", tdp: 450, badge: "HOT",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&q=80" },
  { id: "gpu-2", name: "NVIDIA RTX 4070 Ti 12GB", brand: "NVIDIA", price: 799, specs: "Ada Lovelace, 12GB GDDR6X, 7680 CUDA Cores", tdp: 285,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&q=80" },
  { id: "gpu-3", name: "AMD RX 7900 XTX 24GB", brand: "AMD", price: 999, specs: "RDNA 3, 24GB GDDR6, 6144 CUs", tdp: 355, badge: "NEW",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&q=80" },
  { id: "gpu-4", name: "NVIDIA RTX 4060 8GB", brand: "NVIDIA", price: 299, specs: "Ada Lovelace, 8GB GDDR6, 3072 CUDA Cores", tdp: 115,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&q=80" },
];

// ─── Storage Components ───────────────────────────────────────────────────────
export const STORAGE_COMPONENTS: PCComponent[] = [
  { id: "ssd-1", name: "Samsung 990 Pro 2TB", brand: "Samsung", price: 179, specs: "PCIe 4.0 NVMe M.2, 7450 MB/s Read", badge: "HOT",
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&q=80" },
  { id: "ssd-2", name: "WD Black SN850X 1TB", brand: "WD", price: 109, specs: "PCIe 4.0 NVMe M.2, 7300 MB/s Read",
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&q=80" },
  { id: "ssd-3", name: "Seagate Barracuda 4TB HDD", brand: "Seagate", price: 89, specs: "3.5\" SATA, 7200 RPM, 256MB Cache",
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&q=80" },
  { id: "ssd-4", name: "Kingston KC3000 2TB", brand: "Kingston", price: 139, specs: "PCIe 4.0 NVMe M.2, 7000 MB/s Read",
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&q=80" },
];

// ─── PSU Components ───────────────────────────────────────────────────────────
export const PSU_COMPONENTS: PCComponent[] = [
  { id: "psu-1", name: "Corsair RM1000x 1000W", brand: "Corsair", price: 189, specs: "80+ Gold, Fully Modular, ATX 3.0", wattage: 1000, badge: "HOT",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80" },
  { id: "psu-2", name: "EVGA SuperNOVA 850W G6", brand: "EVGA", price: 139, specs: "80+ Gold, Fully Modular", wattage: 850,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80" },
  { id: "psu-3", name: "Seasonic Focus GX-750", brand: "Seasonic", price: 119, specs: "80+ Gold, Fully Modular", wattage: 750,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80" },
  { id: "psu-4", name: "be quiet! Straight Power 12 650W", brand: "be quiet!", price: 99, specs: "80+ Platinum, Semi-Modular", wattage: 650,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80" },
];

// ─── Case Components ──────────────────────────────────────────────────────────
export const CASE_COMPONENTS: PCComponent[] = [
  { id: "case-1", name: "Lian Li O11 Dynamic EVO", brand: "Lian Li", price: 169, specs: "Mid Tower, ATX/mATX/ITX, Tempered Glass", formFactor: "ATX", badge: "HOT",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=300&q=80" },
  { id: "case-2", name: "NZXT H7 Flow", brand: "NZXT", price: 149, specs: "Mid Tower, ATX, Tempered Glass, White", formFactor: "ATX",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=300&q=80" },
  { id: "case-3", name: "Fractal Design Torrent", brand: "Fractal", price: 189, specs: "Full Tower, ATX, High Airflow", formFactor: "ATX",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=300&q=80" },
  { id: "case-4", name: "Cooler Master MasterBox NR400", brand: "Cooler Master", price: 79, specs: "Mid Tower, mATX, Mesh Front", formFactor: "ATX",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=300&q=80" },
];

export const COMPONENTS_BY_SLOT: Record<ComponentSlot, PCComponent[]> = {
  cpu: CPU_COMPONENTS,
  motherboard: MOTHERBOARD_COMPONENTS,
  ram: RAM_COMPONENTS,
  gpu: GPU_COMPONENTS,
  storage: STORAGE_COMPONENTS,
  psu: PSU_COMPONENTS,
  case: CASE_COMPONENTS,
};

// ─── Compatibility Check ──────────────────────────────────────────────────────
export interface CompatibilityIssue {
  type: "error" | "warning";
  message: string;
}

export function checkCompatibility(
  selected: Partial<Record<ComponentSlot, PCComponent>>
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];
  const { cpu, motherboard, ram, gpu, psu } = selected;

  // Socket check
  if (cpu && motherboard && cpu.socket !== motherboard.socket) {
    issues.push({ type: "error", message: `CPU socket (${cpu.socket}) does not match Motherboard socket (${motherboard.socket}).` });
  }

  // RAM type check
  if (motherboard && ram && motherboard.memType !== ram.memType) {
    issues.push({ type: "error", message: `RAM type (${ram.memType}) is not compatible with this motherboard (${motherboard.memType}).` });
  }

  // Power check
  if (cpu && gpu && psu) {
    const totalTdp = (cpu.tdp || 0) + (gpu.tdp || 0) + 100; // +100W system overhead
    if (psu.wattage && totalTdp > psu.wattage) {
      issues.push({ type: "error", message: `PSU (${psu.wattage}W) is insufficient. Estimated system power: ~${totalTdp}W.` });
    } else if (psu.wattage && totalTdp > psu.wattage * 0.85) {
      issues.push({ type: "warning", message: `PSU headroom is low. Consider a higher wattage PSU for stability.` });
    }
  }

  return issues;
}
