import { create } from 'zustand';
import { getAuth } from 'firebase/auth';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart as clearCartService } from '@/lib/services/cart.service';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  product?: any;
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
  isOpen: boolean;
  toggleCart: () => void;
  setIsOpen: (open: boolean) => void;
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
        const mappedItems: CartItem[] = res.map((item: any) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          name: item.product?.name,
          price: item.product?.sale_price ?? item.product?.price ?? 0,
          image_url: item.product?.image,
        }));
        set({ items: mappedItems as any, loading: false });
      } else if (res && (res as any).success) {
        const mappedItems: CartItem[] = (res as any).data.map((item: any) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          name: item.product?.name,
          price: item.product?.sale_price ?? item.product?.price ?? 0,
          image_url: item.product?.image,
        }));
        set({ items: mappedItems as any, loading: false });
      } else {
        set({ items: [], loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  addItem: async (item) => {
    const auth = getAuth();
    if (!auth.currentUser) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return false;
    }

    const productId = (item as any).product_id || item.id;
    const qtyToAdd = item.quantity || 1;
    const prevItems = get().items;

    // --- Optimistic update: update local state immediately ---
    const existingIndex = prevItems.findIndex(
      (i) => ((i as any).product?.id ?? i.id) === productId
    );

    if (existingIndex >= 0) {
      // Increase quantity of existing item instantly
      const updated = prevItems.map((i, idx) =>
        idx === existingIndex
          ? { ...i, quantity: i.quantity + qtyToAdd }
          : i
      );
      set({ items: updated });
    } else {
      // Add a temporary item instantly so the count badge updates
      const tempItem: CartItem = {
        id: productId,
        name: item.name || '',
        price: item.price || 0,
        quantity: qtyToAdd,
        image_url: item.image_url,
        product: (item as any).product ?? null,
      };
      set({ items: [...prevItems, tempItem] });
    }

    try {
      // Send to API in background — user already sees the count updated
      const res = await addToCart(productId, qtyToAdd);

      if (res && ((res as any).success || (res as any).item || (res as any).message)) {
        // Sync true server state quietly (no visible lag)
        get().fetchCart();
        return true;
      }

      // API rejected — rollback the optimistic update
      set({ items: prevItems });
      return false;
    } catch {
      // Network error — rollback
      set({ items: prevItems });
      return false;
    }
  },

  removeItem: async (id) => {
    const auth = getAuth();
    if (!auth.currentUser) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return;
    }

    const prevItems = get().items;
    // Optimistic remove
    set({ items: prevItems.filter((i) => i.id !== id) });

    try {
      await removeFromCart(id);
      // Sync quietly in background
      get().fetchCart();
    } catch {
      // Rollback on error
      set({ items: prevItems });
    }
  },

  updateQuantity: async (id, quantity) => {
    const auth = getAuth();
    if (!auth.currentUser) return;

    const prevItems = get().items;
    // Optimistic update quantity
    set({
      items: prevItems.map((i) =>
        i.id === id ? { ...i, quantity } : i
      ),
    });

    try {
      await updateCartItem(id, quantity);
      get().fetchCart();
    } catch {
      set({ items: prevItems });
    }
  },

  clearCart: async () => {
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await clearCartService();
      }
      set({ items: [] });
    } catch {
      // silently fail — local state already cleared
    }
  },

  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  getTotalPrice: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },
  isOpen: false,
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  setIsOpen: (open: boolean) => set({ isOpen: open })
}));
