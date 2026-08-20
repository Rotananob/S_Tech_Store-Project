import api from "@/lib/api";
import { Product, User, ApiResponse } from "@/types";

export async function getWishlist() {
  const { data } = await api.get<ApiResponse<Product[]>>("/wishlist");
  return data;
}

export async function addToWishlist(productId: number) {
  const { data } = await api.post<ApiResponse<any>>("/wishlist", { product_id: productId });
  return data;
}

export async function removeFromWishlist(productId: number) {
  const { data } = await api.delete<ApiResponse<any>>(`/wishlist/${productId}`);
  return data;
}

export async function getProfile() {
  const { data } = await api.get<ApiResponse<User>>("/profile");
  return data;
}

export async function updateProfile(profileData: Partial<User>) {
  const { data } = await api.put<ApiResponse<User>>("/profile", profileData);
  return data;
}
