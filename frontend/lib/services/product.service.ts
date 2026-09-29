import { Category, Product, ApiResponse } from "@/types";

const BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL ?? "/api")
  : (process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000/api");

// Revalidate disabled to ensure Admin changes reflect immediately on Home
const REVALIDATE = 0;

export async function getCategories(): Promise<Category[] | ApiResponse<Category[]>> {
  const res = await fetch(`${BASE}/categories`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function getProducts(params?: Record<string, any>): Promise<Product[] | ApiResponse<Product[]>> {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${BASE}/products${query}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function getProduct(id: string | number): Promise<Product | ApiResponse<Product>> {
  const res = await fetch(`${BASE}/products/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}
