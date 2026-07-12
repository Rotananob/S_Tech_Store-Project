import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  id: number;
  name: string;
  price: number;
  image?: string;
  slug?: string;
}

interface WishlistStore {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (id: number) => void;
  isInWishlist: (id: number) => boolean;
  clearWishlist: () => void;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find((i) => i.id === item.id);

        if (!existingItem) {
          set({ items: [...items, item] });
        }
      },

      removeItem: (id) => {
        const { items } = get();
        set({ items: items.filter((i) => i.id !== id) });
      },

      isInWishlist: (id) => {
        const { items } = get();
        return items.some((i) => i.id === id);
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        const { items } = get();
        return items.length;
      },
    }),
    {
      name: 'stech-wishlist-storage', // Key used in localStorage
    }
  )
);
