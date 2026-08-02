import { create } from 'zustand';
import api from '@/lib/api';
import { getAuth } from 'firebase/auth';

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
      const res = await api.get('/user/cart');
      set({ items: res.data || [], loading: false });
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

      await api.post('/user/cart', {
        product_id: item.id,
        quantity: item.quantity || 1,
      });

      // Update state
      const { items } = get();
      const existing = items.find((i) => i.id === item.id);
      if (existing) {
        set({
          items: items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
          ),
        });
      } else {
        set({ items: [...items, item] });
      }
      return true;
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
      await api.delete(`/user/cart/${id}`);
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      }));
    } catch (e) {
      console.error('Failed to remove item from cart', e);
    }
  },

  updateQuantity: async (id, quantity) => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) return;

      await api.put(`/user/cart/${id}`, { quantity });
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
      }));
    } catch (e) {
      console.error('Failed to update cart item quantity', e);
    }
  },

  clearCart: async () => {
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await api.delete('/user/cart');
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
