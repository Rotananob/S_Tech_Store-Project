import { Category, Product, ApiResponse } from "@/types";
import { mockCategories, mockProducts } from "@/lib/mock-data";

// Pre-normalize fallback catalog so both .image and .image_url are guaranteed
const fallbackProducts: Product[] = (mockProducts as any[]).map((p) => ({
  ...p,
  id: Number(p.id),
  image_url: p.image_url || p.image,
  image: p.image || p.image_url,
  in_stock: true,
  category: typeof p.category === "string" ? { id: 1, name: p.category, slug: p.category.toLowerCase() } : p.category,
})) as Product[];

const fallbackCategories: Category[] = mockCategories.map((c) => ({
  id: Number(c.id),
  name: c.name,
  slug: c.slug,
  icon: c.icon,
  count: c.count,
}));

// In-memory cache to guarantee zero empty states even during cold starts or transient network hiccups
let cachedProducts: Product[] = [...fallbackProducts];
let cachedCategories: Category[] = [...fallbackCategories];

function ensureApiSuffix(url: string): string {
  const clean = url.trim().replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

function getBaseUrl(): string {
  // 1. Any direct backend URL configured in environment
  const direct =
    process.env.INTERNAL_API_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  if (direct) {
    return ensureApiSuffix(direct);
  }

  // 2. In browser, check NEXT_PUBLIC_API_URL or relative /api
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("http")) {
      return ensureApiSuffix(process.env.NEXT_PUBLIC_API_URL);
    }
    return "/api";
  }

  // 3. Server-side environment
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("http")) {
    return ensureApiSuffix(process.env.NEXT_PUBLIC_API_URL);
  }

  // 4. Production cloud backend fallback
  if (process.env.NODE_ENV === "production") {
    return "https://stech-backend-xz6j.onrender.com/api";
  }

  // 5. Local dev SSR fallback
  return "http://127.0.0.1:8000/api";
}

function normalizeProduct(p: any): Product {
  const img = p.image_url || p.image || (Array.isArray(p.images) && p.images[0] ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].image_url) : '');
  return {
    ...p,
    id: Number(p.id),
    price: Number(p.price || 0),
    sale_price: p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : null,
    image_url: img,
    image: img,
    in_stock: p.stock !== undefined ? p.stock > 0 : (p.in_stock ?? true),
  };
}

let lastCategoryFetchTime = 0;
const CATEGORY_CLIENT_CACHE_TTL = 60 * 1000; // 60 seconds instant client cache
let inFlightCategoriesPromise: Promise<Category[] | ApiResponse<Category[]>> | null = null;

export async function getCategories(): Promise<Category[] | ApiResponse<Category[]>> {
  // Fast memory return for rapid navigation without network roundtrip
  if (typeof window !== "undefined" && cachedCategories.length > 0 && (Date.now() - lastCategoryFetchTime < CATEGORY_CLIENT_CACHE_TTL)) {
    return cachedCategories;
  }

  // Deduplicate concurrent in-flight requests from multiple mounting components
  if (inFlightCategoriesPromise) {
    return inFlightCategoriesPromise;
  }

  inFlightCategoriesPromise = (async () => {
    try {
      const controller = new AbortController();
      // Allow up to 12s for Render cold start or Neon SSL handshake
      const timeout = setTimeout(() => controller.abort(), 12000);
      
      const res = await fetch(`${getBaseUrl()}/categories`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        next: { revalidate: 30 },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.data || []);
        if (list && list.length > 0) {
          cachedCategories = list;
          lastCategoryFetchTime = Date.now();
          return list;
        }
      }
    } catch (error) {
      console.warn("getCategories network notice (using fallback):", (error as Error)?.message || error);
    } finally {
      inFlightCategoriesPromise = null;
    }

    return cachedCategories;
  })();

  return inFlightCategoriesPromise;
}

let lastProductFetchTime = 0;
const CLIENT_CACHE_TTL = 45 * 1000; // 45 seconds instant client cache
let inFlightProductsPromise: Promise<Product[] | ApiResponse<Product[]>> | null = null;

export function invalidateProductCache(): void {
  lastProductFetchTime = 0;
  lastCategoryFetchTime = 0;
}

export async function getProducts(params?: Record<string, any>): Promise<Product[] | ApiResponse<Product[]>> {
  const isGlobalCatalog = !params || Object.keys(params).length === 0;

  // Instant client cache return for fast navigation without redundant DB roundtrips
  if (typeof window !== "undefined" && isGlobalCatalog && cachedProducts.length > 0 && (Date.now() - lastProductFetchTime < CLIENT_CACHE_TTL)) {
    return cachedProducts;
  }

  // Deduplicate concurrent global catalog fetches across multiple components
  if (isGlobalCatalog && inFlightProductsPromise) {
    return inFlightProductsPromise;
  }

  const fetchPromise = (async () => {
    try {
      const query = params ? "?" + new URLSearchParams(params).toString() : "";
      const controller = new AbortController();
      // Allow up to 12s for Render cold start or Neon database query
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${getBaseUrl()}/products${query}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        next: { revalidate: 15 },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.data || []);
        const normalized = list.map(normalizeProduct);

        // Only update global catalog cache when fetching all products without search params
        if (isGlobalCatalog && normalized.length > 0) {
          cachedProducts = normalized;
          lastProductFetchTime = Date.now();
        }
        return normalized;
      }
    } catch (error) {
      console.warn("getProducts network notice (using resilient cache):", (error as Error)?.message || error);
    } finally {
      if (isGlobalCatalog) {
        inFlightProductsPromise = null;
      }
    }

    // Resilient fallback — only reached when network/fetch throws an error
    if (isGlobalCatalog) {
      return cachedProducts;
    }

    let filtered = [...cachedProducts];
    if (params.category) {
      const cat = String(params.category).toLowerCase();
      filtered = filtered.filter((p) => {
        const c = typeof p.category === "object" ? p.category?.slug : p.category;
        return String(c || "").toLowerCase().includes(cat);
      });
    }
    if (params.search) {
      const s = String(params.search).toLowerCase().trim();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(s) ||
        (p.description || "").toLowerCase().includes(s) ||
        (p.brand || "").toLowerCase().includes(s)
      );
    }

    return filtered;
  })();

  if (isGlobalCatalog) {
    inFlightProductsPromise = fetchPromise;
  }

  return fetchPromise;
}

const singleProductCache = new Map<string, { product: Product; time: number }>();

export async function getProduct(id: string | number): Promise<Product | ApiResponse<Product> | null> {
  const cacheKey = String(id);
  const cached = singleProductCache.get(cacheKey);
  if (cached && (Date.now() - cached.time < 60 * 1000)) {
    return cached.product;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${getBaseUrl()}/products/${id}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 15 },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const item = data?.data || data;
      if (item && item.id) {
        const normalized = normalizeProduct(item);
        singleProductCache.set(cacheKey, { product: normalized, time: Date.now() });
        return normalized;
      }
    }
  } catch (error) {
    console.warn(`getProduct(${id}) network notice:`, (error as Error)?.message || error);
  }

  // Check cached products
  const numId = Number(id);
  const found = cachedProducts.find((p) => p.id === numId || p.slug === String(id));
  return found || null;
}

export async function getProductReviews(id: string | number) {
  try {
    const res = await fetch(`${getBaseUrl()}/products/${id}/reviews`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.reviews || data;
  } catch (error) {
    console.warn(`getProductReviews(${id}) network notice:`, (error as Error)?.message || error);
    return [];
  }
}

export async function submitProductReview(id: string | number, reviewData: { rating: number; comment: string; user_name?: string }) {
  const { default: api } = await import("@/lib/api");
  const { data } = await api.post(`/products/${id}/reviews`, reviewData);
  return data;
}

