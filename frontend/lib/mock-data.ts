// Mock data for UI — replace with real API calls after backend is ready
// All prices in USD. KHR rate ~4,060 per $1

export const mockCategories = [
  { id: 1, name: "Laptops", slug: "laptops", icon: "💻", count: 48 },
  { id: 2, name: "Desktops", slug: "desktops", icon: "🖥️", count: 32 },
  { id: 3, name: "Parts", slug: "parts", icon: "⚙️", count: 75 },
  { id: 4, name: "Gaming", slug: "gaming", icon: "🎮", count: 41 },
  { id: 5, name: "Services", slug: "services", icon: "🔧", count: 12 },
];

export const USD_TO_KHR = 4060;

export function toKHR(usd: number): string {
  const khr = Math.round(usd * USD_TO_KHR);
  return `~${khr.toLocaleString()} ៛`;
}

export const mockProducts = [
  {
    id: 1,
    name: "ThinkPad X1 Carbon Gen 11",
    slug: "thinkpad-x1-carbon-gen-11",
    specs: "i7-1355U / 16GB / 512GB SSD",
    price: 1299,
    sale_price: null,
    rating: 4.8,
    reviews: 48,
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
      "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600&q=80",
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80",
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&q=80",
    ],
    category: "Laptops",
    brand: "Lenovo",
    badge: "HOT",
    in_stock: true,
    is_featured: true,
    description: "The ultimate business laptop with legendary ThinkPad durability, Intel Core i7 performance, and ultra-light carbon fiber construction.",
    specs_detail: [
      { key: "Processor (CPU)", value: "Intel® Core™ i7-1355U Processor 1.7 GHz (up to 5.0 GHz Turbo)" },
      { key: "Graphics (GPU)", value: "Intel® Iris® Xᵉ Graphics" },
      { key: "Memory (RAM)", value: "16GB LPDDR5-6000 Soldered" },
      { key: "Storage (SSD)", value: "512GB PCIe® 4.0 NVMe™ M.2 SSD" },
      { key: "Display", value: "14-inch, WUXGA IPS, Anti-glare, 400 nits, 60Hz" },
      { key: "Operating System", value: "Windows 11 Pro" },
      { key: "Battery", value: "57Wh, Up to 15 hours" },
      { key: "Weight", value: "1.12 kg (2.48 lbs)" },
    ],
  },
  {
    id: 2,
    name: "ROG Zephyrus G14 (2024)",
    slug: "rog-zephyrus-g14-2024",
    specs: "Ryzen 9 / RTX 4060 / 32GB",
    price: 1649,
    sale_price: null,
    rating: 4.9,
    reviews: 72,
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80",
      "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600&q=80",
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80",
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&q=80",
    ],
    category: "Laptops",
    brand: "ASUS",
    badge: "NEW",
    in_stock: true,
    is_featured: true,
    description: "Ultimate gaming powerhouse with AMD Ryzen 9 and NVIDIA RTX 4060, featuring a stunning 165Hz OLED display.",
    specs_detail: [
      { key: "Processor (CPU)", value: "AMD Ryzen™ 9 8945HS Processor 4.0 GHz (up to 5.2 GHz)" },
      { key: "Graphics (GPU)", value: "NVIDIA® GeForce RTX™ 4060 Laptop GPU, 8GB GDDR6" },
      { key: "Memory (RAM)", value: "32GB LPDDR5X-7500" },
      { key: "Storage (SSD)", value: "1TB PCIe® 4.0 NVMe™ M.2 SSD" },
      { key: "Display", value: "14-inch, OLED, 2.8K (2880 x 1800), 120Hz, 0.2ms" },
      { key: "Operating System", value: "Windows 11 Home" },
      { key: "Battery", value: "73Wh, Up to 9.4 hours" },
      { key: "Weight", value: "1.65 kg (3.64 lbs)" },
    ],
  },
  {
    id: 3,
    name: "S-Tech Creator Pro Build",
    slug: "s-tech-creator-pro-build",
    specs: "i9-14900K / 64GB / RTX 4080",
    price: 2899,
    sale_price: null,
    rating: 4.7,
    reviews: 33,
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&q=80",
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&q=80",
      "https://images.unsplash.com/photo-1593640408182-31c228b7f4c4?w=600&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    ],
    category: "Desktops",
    brand: "S-Tech",
    badge: null,
    in_stock: true,
    is_featured: true,
    description: "Our flagship custom desktop build optimized for content creation and professional workflows.",
    specs_detail: [
      { key: "Processor (CPU)", value: "Intel® Core™ i9-14900K Processor 3.2 GHz (up to 6.0 GHz)" },
      { key: "Graphics (GPU)", value: "NVIDIA® GeForce RTX™ 4080 16GB GDDR6X" },
      { key: "Memory (RAM)", value: "64GB DDR5-6000 (2x32GB)" },
      { key: "Storage (SSD)", value: "2TB PCIe® 5.0 NVMe™ + 4TB HDD" },
      { key: "Motherboard", value: "ASUS ROG MAXIMUS Z790 Hero" },
      { key: "Power Supply", value: "1000W 80+ Platinum" },
      { key: "Cooling", value: "360mm AIO Liquid Cooler" },
      { key: "Case", value: "Lian Li O11 Dynamic EVO White" },
    ],
  },
  {
    id: 4,
    name: "UltraSharp 27\" 4K Monitor",
    slug: "ultrasharp-27-4k-monitor",
    specs: "27\" / 4K UHD / IPS Black",
    price: 599,
    sale_price: null,
    rating: 4.6,
    reviews: 91,
    image: "https://images.unsplash.com/photo-1527443224154-c4a573d3b9e5?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1527443224154-c4a573d3b9e5?w=600&q=80",
      "https://images.unsplash.com/photo-1598452963314-b09f397a5c48?w=600&q=80",
      "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80",
    ],
    category: "Parts",
    brand: "Dell",
    badge: null,
    in_stock: true,
    is_featured: true,
    description: "Professional-grade 4K monitor with IPS Black technology for stunning contrast and color accuracy.",
    specs_detail: [
      { key: "Panel Type", value: "IPS Black Technology" },
      { key: "Resolution", value: "3840 x 2160 (4K UHD)" },
      { key: "Screen Size", value: "27 inches (68.47 cm)" },
      { key: "Refresh Rate", value: "60Hz" },
      { key: "Response Time", value: "8ms (GtG), 5ms (Fast)" },
      { key: "Color Coverage", value: "100% sRGB, 98% DCI-P3" },
      { key: "Brightness", value: "400 cd/m² (typical)" },
      { key: "Ports", value: "2x HDMI 2.0, 1x DisplayPort 1.4, 4x USB-A 3.2" },
    ],
  },
  // ASUS ROG Strix G16 (for product detail demo)
  {
    id: 5,
    name: "ASUS ROG Strix G16",
    slug: "asus-rog-strix-g16",
    specs: "i7-13650HX / 16GB / 512GB SSD",
    price: 1299,
    sale_price: null,
    rating: 4.8,
    reviews: 12,
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=700&q=80",
    images: [
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=700&q=80",
      "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=700&q=80",
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=700&q=80",
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=700&q=80",
    ],
    category: "Laptops",
    brand: "ASUS",
    badge: "NEW",
    model: "G614JU-N3111W (Eclipse Gray)",
    in_stock: true,
    is_featured: false,
    description: "ASUS ROG Strix G16 gaming laptop with Intel Core i7-13650HX and NVIDIA RTX 4050, designed to dominate every game at high settings.",
    specs_detail: [
      { key: "Processor (CPU)", value: "Intel® Core™ i7-13650HX Processor 2.6 GHz" },
      { key: "Graphics (GPU)", value: "NVIDIA® GeForce RTX™ 4050 Laptop GPU, 6GB GDDR6" },
      { key: "Memory (RAM)", value: "16GB DDR5-4800 SO-DIMM" },
      { key: "Storage (SSD)", value: "512GB PCIe® 4.0 NVMe™ M.2 SSD" },
      { key: "Display", value: "16-inch, FHD+ 16:10 (1920 x 1200, WUXGA), 165Hz" },
      { key: "Operating System", value: "Windows 11 Home" },
      { key: "Battery", value: "90Wh Li-ion, Up to 8 hours" },
      { key: "Weight", value: "2.5 kg (5.51 lbs)" },
    ],
  },
];

export const features = [
  { icon: "✓", label: "Genuine Products" },
  { icon: "🛡", label: "1-Year Warranty" },
  { icon: "💳", label: "Local Payments" },
  { icon: "🚚", label: "Same-Day Delivery" },
];

export function formatKHR(usd: number): string {
  return `≈${(Math.round(usd * USD_TO_KHR / 1000) * 1000).toLocaleString()} ៛`;
}

export function formatUSD(price: number): string {
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 0 })} USD`;
}
