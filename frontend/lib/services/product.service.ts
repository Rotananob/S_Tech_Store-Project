import api from "@/lib/api";
import { Category, Product, ApiResponse } from "@/types";

export async function getCategories() {
  const { data } = await api.get<ApiResponse<Category[]>>("/categories");
  return data;
}

export async function getProducts(params?: Record<string, any>) {
  const { data } = await api.get<ApiResponse<Product[]>>("/products", { params });
  return data;
}

export async function getProduct(id: string | number) {
  const { data } = await api.get<ApiResponse<Product>>(`/products/${id}`);
  return data;
}
