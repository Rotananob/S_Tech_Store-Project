import api from "@/lib/api";
import { CartItem, ApiResponse } from "@/types";

export async function getCart() {
  const { data } = await api.get<ApiResponse<CartItem[]>>("/cart");
  return data;
}

export async function addToCart(productId: number, quantity: number = 1) {
  const { data } = await api.post<ApiResponse<CartItem>>("/cart", { product_id: productId, quantity });
  return data;
}

export async function updateCartItem(id: number, quantity: number) {
  const { data } = await api.put<ApiResponse<CartItem>>(`/cart/${id}`, { quantity });
  return data;
}

export async function removeFromCart(id: number) {
  const { data } = await api.delete<ApiResponse<null>>(`/cart/${id}`);
  return data;
}

export async function clearCart() {
  const { data } = await api.delete<ApiResponse<null>>("/cart");
  return data;
}
