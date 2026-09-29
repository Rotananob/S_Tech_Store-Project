import { Category, Product, ApiResponse } from "@/types";

function getBaseUrl(): string {
  // 1. Any direct backend URL configured for SSR or Client
  const backend =
    process.env.INTERNAL_API_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  if (backend) {
    const clean = backend.replace(/\/$/, "");
    return clean.endsWith("/api") ? clean : `${clean}/api`;
  }

  // 2. In browser, use relative /api (proxied by next.config.mjs) or NEXT_PUBLIC_API_URL
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "/api";
  }

  // 3. If NEXT_PUBLIC_API_URL is an absolute URL (e.g. https://.../api)
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("http")) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  // 4. Local dev SSR fallback
  return "http://127.0.0.1:8000/api";
}

export async function getCategories(): Promise<Category[] | ApiResponse<Category[]>> {
  try {
    const res = await fetch(`${getBaseUrl()}/categories`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("getCategories error:", error);
    return [];
  }
}

export async function getProducts(params?: Record<string, any>): Promise<Product[] | ApiResponse<Product[]>> {
  try {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetch(`${getBaseUrl()}/products${query}`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("getProducts error:", error);
    return [];
  }
}

export async function getProduct(id: string | number): Promise<Product | ApiResponse<Product> | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/products/${id}`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`getProduct(${id}) error:`, error);
    return null;
  }
}

export async function getProductReviews(id: string | number) {
  try {
    const res = await fetch(`${getBaseUrl()}/products/${id}/reviews`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.reviews || data;
  } catch (error) {
    console.error(`getProductReviews(${id}) error:`, error);
    return [];
  }
}
