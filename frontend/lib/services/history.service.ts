export interface ViewedProduct {
  id: number | string;
  slug?: string;
  name: string;
  price: number | string;
  sale_price?: number | string | null;
  image?: string;
  category_name?: string;
  viewed_at: string;
}

export interface SearchHistoryItem {
  query: string;
  searched_at: string;
}

const VIEWED_KEY = "stech_viewed_products";
const SEARCH_KEY = "stech_search_history";

export const recordProductView = (product: {
  id: number | string;
  slug?: string;
  name: string;
  price: number | string;
  sale_price?: number | string | null;
  images?: any[];
  image?: string;
  category?: any;
}) => {
  if (typeof window === "undefined" || !product?.id || !product?.name) return;

  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    const existing: ViewedProduct[] = raw ? JSON.parse(raw) : [];

    let image = product.image || "";
    if (!image && Array.isArray(product.images) && product.images.length > 0) {
      image = typeof product.images[0] === "string" ? product.images[0] : product.images[0]?.url || "";
    }

    const categoryName = typeof product.category === "string" ? product.category : product.category?.name || "";

    const newItem: ViewedProduct = {
      id: product.id,
      slug: product.slug || String(product.id),
      name: product.name,
      price: product.price,
      sale_price: product.sale_price,
      image,
      category_name: categoryName,
      viewed_at: new Date().toISOString(),
    };

    // Filter out previous entry of the same product to move it to the top
    const updated = [newItem, ...existing.filter((item) => String(item.id) !== String(product.id))].slice(0, 50);
    localStorage.setItem(VIEWED_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("stech_history_updated"));
  } catch (e) {
    console.warn("Failed to record viewed product:", e);
  }
};

export const getViewedProducts = (): ViewedProduct[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearViewedProducts = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VIEWED_KEY);
  window.dispatchEvent(new Event("stech_history_updated"));
};

export const recordSearchQuery = (query: string) => {
  if (typeof window === "undefined" || !query || !query.trim()) return;

  try {
    const clean = query.trim();
    if (clean.length < 2) return;

    const raw = localStorage.getItem(SEARCH_KEY);
    const existing: SearchHistoryItem[] = raw ? JSON.parse(raw) : [];

    const newItem: SearchHistoryItem = {
      query: clean,
      searched_at: new Date().toISOString(),
    };

    const updated = [newItem, ...existing.filter((item) => item.query.toLowerCase() !== clean.toLowerCase())].slice(0, 30);
    localStorage.setItem(SEARCH_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("stech_history_updated"));
  } catch (e) {
    console.warn("Failed to record search query:", e);
  }
};

export const getSearchHistory = (): SearchHistoryItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearSearchHistory = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SEARCH_KEY);
  window.dispatchEvent(new Event("stech_history_updated"));
};

export const removeSearchQuery = (query: string) => {
  if (typeof window === "undefined" || !query) return;
  try {
    const raw = localStorage.getItem(SEARCH_KEY);
    const existing: SearchHistoryItem[] = raw ? JSON.parse(raw) : [];
    const updated = existing.filter((item) => item.query.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(SEARCH_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("stech_history_updated"));
  } catch (e) {
    console.warn("Failed to remove search query:", e);
  }
};
