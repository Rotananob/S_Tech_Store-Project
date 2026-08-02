import { create } from "zustand";
import api from "@/lib/api";
import { getAuth } from "firebase/auth";

export interface WishlistItem {
  id: number;
  name: string;
  price: number;
  image?: string;
  slug?: string;
  added_at?: string;
}

interface WishlistStore {
  items: WishlistItem[];
  loading: boolean;
  fetchWishlist: () => Promise<void>;
  addItem: (item: WishlistItem) => Promise<boolean>;
  removeItem: (id: number) => Promise<void>;
  isInWishlist: (id: number) => boolean;
  clearWishlist: () => void;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  (set, get) => ({
    items: [],
    loading: false,

    fetchWishlist: async () => {
      try {
        set({ loading: true });
        const auth = getAuth();
        if (!auth.currentUser) {
          set({ items: [], loading: false });
          return;
        }
        const res = await api.get("/user/wishlist");
        set({ items: res.data || [], loading: false });
      } catch (e) {
        set({ loading: false });
      }
    },

    addItem: async (item) => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return false;
        }
        await api.post("/user/wishlist", { product_id: item.id });
        const { items } = get();
        if (!items.some((i) => i.id === item.id)) {
          set({ items: [...items, item] });
        }
        return true;
      } catch (e) {
        console.error("Failed to add to wishlist", e);
        return false;
      }
    },

    removeItem: async (id) => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return;
        }
        await api.delete(`/user/wishlist/${id}`);
        set({ items: get().items.filter((i) => i.id !== id) });
      } catch (e) {
        console.error("Failed to remove from wishlist", e);
      }
    },

    isInWishlist: (id) => {
      return get().items.some((i) => i.id === id);
    },

    clearWishlist: () => {
      set({ items: [] });
    },

    getTotalItems: () => {
      return get().items.length;
    },
  })
);
