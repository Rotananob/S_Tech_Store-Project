import { Category, Product, ApiResponse } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://stech-backend-xz6j.onrender.com/api";

// Revalidate cached data every 60 seconds (ISR-compatible)
const REVALIDATE = 60;

export async function getCategories(): Promise<Category[] | ApiResponse<Category[]>> {
  const res = await fetch(`${BASE}/categories`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function getProducts(params?: Record<string, any>): Promise<Product[] | ApiResponse<Product[]>> {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${BASE}/products${query}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function getProduct(id: string | number): Promise<Product | ApiResponse<Product>> {
  const res = await fetch(`${BASE}/products/${id}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}
