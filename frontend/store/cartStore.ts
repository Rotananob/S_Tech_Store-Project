import { create } from 'zustand';
import { getAuth } from 'firebase/auth';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart as clearCartService } from '@/lib/services/cart.service';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (item: CartItem) => Promise<boolean>;
  removeItem: (id: number) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    try {
      set({ loading: true });
      const auth = getAuth();
      if (!auth.currentUser) {
        set({ items: [], loading: false });
        return;
      }
      const res = await getCart();
      if (Array.isArray(res)) {
        // Backend returns array of items directly
        const mappedItems: CartItem[] = res.map((item: any) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          name: item.product?.name, // fallback for other usages
          price: item.product?.sale_price ?? item.product?.price ?? 0,
          image_url: item.product?.image
        }));
        set({ items: mappedItems as any, loading: false });
      } else if (res && (res as any).success) {
        // Fallback if backend wraps it
        const mappedItems: CartItem[] = (res as any).data.map((item: any) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          name: item.product?.name,
          price: item.product?.sale_price ?? item.product?.price ?? 0,
          image_url: item.product?.image
        }));
        set({ items: mappedItems as any, loading: false });
      } else {
        set({ items: [], loading: false });
      }
    } catch (e) {
      set({ loading: false });
    }
  },

  addItem: async (item) => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return false;
      }

      // Add to API
      const productId = (item as any).product_id || item.id;
      const res = await addToCart(productId, item.quantity || 1);
      
      if (res && ((res as any).success || (res as any).item || (res as any).message)) {
        // Optimistic UI update or fetch from server again
        await get().fetchCart();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to add item to cart', e);
      return false;
    }
  },

  removeItem: async (id) => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }
      await removeFromCart(id);
      await get().fetchCart();
    } catch (e) {
      console.error('Failed to remove item from cart', e);
    }
  },

  updateQuantity: async (id, quantity) => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) return;

      await updateCartItem(id, quantity);
      await get().fetchCart();
    } catch (e) {
      console.error('Failed to update cart item quantity', e);
    }
  },

  clearCart: async () => {
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await clearCartService();
      }
      set({ items: [] });
    } catch (e) {
      console.error('Failed to clear cart', e);
    }
  },

  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  getTotalPrice: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },
}));
