import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart as clearCartService } from '@/lib/services/cart.service';
import { getEffectiveUser } from '@/lib/auth-user';

export interface CartItem {
  id: number;
  product_id?: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  product?: any;
}

interface CartState {
  items: CartItem[];
  cartUserId: string | null;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (item: CartItem) => Promise<boolean>;
  removeItem: (id: number) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  resetLocalCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isOpen: boolean;
  toggleCart: () => void;
  setIsOpen: (open: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartUserId: null,
      loading: false,
      isOpen: false,
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setIsOpen: (open: boolean) => set({ isOpen: open }),

      resetLocalCart: () => {
        set({ items: [], cartUserId: null, loading: false });
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('stech_cart_storage');
          } catch (_) {}
        }
      },

      fetchCart: async () => {
        const user = getEffectiveUser();
        const currentUserId = user ? String(user.firebase_uid || user.uid || user.id) : null;
        const previousCartUserId = get().cartUserId;

        // If guest (not logged in):
        if (!currentUserId) {
          // If items in local storage belonged to an authenticated account that is now logged out,
          // immediately reset local cart so guest visitors never see an old account's cart!
          if (previousCartUserId) {
            get().resetLocalCart();
          }
          return;
        }

        // If account switched, do not retain previous account's items
        if (previousCartUserId && previousCartUserId !== currentUserId) {
          set({ items: [], cartUserId: currentUserId });
        }

        try {
          set({ loading: true });
          const res = await getCart();
          const rawList = Array.isArray(res) ? res : (res && (res as any).success ? (res as any).data : null);

          if (Array.isArray(rawList)) {
            const mappedItems: CartItem[] = rawList.map((item: any) => ({
              id: item.id,
              product_id: item.product_id || item.product?.id,
              product: item.product,
              quantity: item.quantity,
              name: item.product?.name || item.name || '',
              price: item.product?.sale_price ?? item.product?.price ?? item.price ?? 0,
              image_url: item.product?.image || item.product?.image_url || item.image_url,
            }));

            // Only merge local items if they were accumulated as an anonymous guest before login
            const localItems = previousCartUserId === null ? get().items : [];
            const mergedMap = new Map<number, CartItem>();

            for (const si of mappedItems) {
              const pid = si.product_id || si.id;
              if (pid) mergedMap.set(pid, si);
            }

            if (previousCartUserId === null && localItems.length > 0) {
              for (const li of localItems) {
                const pid = (li as any).product_id || (li as any).product?.id || li.id;
                if (pid) {
                  if (!mergedMap.has(pid)) {
                    mergedMap.set(pid, li);
                    addToCart(pid, li.quantity).catch(() => {});
                  }
                }
              }
            }

            set({
              items: Array.from(mergedMap.values()),
              cartUserId: currentUserId,
              loading: false,
            });
          } else {
            set({ cartUserId: currentUserId, loading: false });
          }
        } catch {
          set({ cartUserId: currentUserId, loading: false });
        }
      },

      addItem: async (item) => {
        const user = getEffectiveUser();
        const currentUserId = user ? String(user.firebase_uid || user.uid || user.id) : null;
        const productId = (item as any).product_id || (item as any).product?.id || item.id;
        const qtyToAdd = item.quantity || 1;
        const prevItems = get().items;

        const existingIndex = prevItems.findIndex(
          (i) => ((i as any).product?.id ?? (i as any).product_id ?? i.id) === productId
        );

        let updated: CartItem[];
        const img = item.image_url || (item as any).image || item.product?.image || item.product?.image_url || null;
        const price = item.price ?? item.product?.sale_price ?? item.product?.price ?? 0;
        const name = item.name || item.product?.name || 'Product';

        if (existingIndex >= 0) {
          updated = prevItems.map((i, idx) =>
            idx === existingIndex ? { ...i, quantity: i.quantity + qtyToAdd } : i
          );
        } else {
          const newItem: CartItem = {
            id: productId,
            product_id: productId,
            name,
            price,
            quantity: qtyToAdd,
            image_url: img,
            product: item.product || {
              id: productId,
              name,
              price,
              image: img,
              image_url: img,
            },
          };
          updated = [...prevItems, newItem];
        }

        set({ items: updated, cartUserId: currentUserId });

        // If authenticated, sync with server cart in background
        if (user) {
          try {
            await addToCart(productId, qtyToAdd);
            get().fetchCart().catch(() => {});
          } catch {
            // Keep local state intact
          }
        }

        return true;
      },

      removeItem: async (id) => {
        const prevItems = get().items;
        const targetItem = prevItems.find((i) => i.id === id);
        const prodId = (targetItem as any)?.product?.id ?? (targetItem as any)?.product_id;

        set({
          items: prevItems.filter(
            (i) => i.id !== id && (!prodId || ((i as any)?.product?.id !== prodId && (i as any)?.product_id !== prodId))
          ),
        });

        const user = getEffectiveUser();
        if (user) {
          try {
            await removeFromCart(id);
            if (prodId && prodId !== id) {
              await removeFromCart(prodId).catch(() => {});
            }
          } catch {}
        }
      },

      updateQuantity: async (id, quantity) => {
        if (quantity <= 0) {
          return get().removeItem(id);
        }

        const prevItems = get().items;
        const targetItem = prevItems.find((i) => i.id === id);
        const prodId = (targetItem as any)?.product?.id ?? (targetItem as any)?.product_id;

        set({
          items: prevItems.map((i) => (i.id === id ? { ...i, quantity } : i)),
        });

        const user = getEffectiveUser();
        if (user) {
          try {
            await updateCartItem(id, quantity);
            if (prodId && prodId !== id) {
              await updateCartItem(prodId, quantity).catch(() => {});
            }
          } catch {}
        }
      },

      clearCart: async () => {
        try {
          const user = getEffectiveUser();
          if (user) {
            await clearCartService();
          }
        } catch {}
        set({ items: [] });
      },

      getTotalItems: () => {
        return (get().items || []).reduce((total, item) => total + (item.quantity || 1), 0);
      },

      getTotalPrice: () => {
        return (get().items || []).reduce((total, item) => {
          const price = item.product?.sale_price ?? item.product?.price ?? item.price ?? 0;
          return total + price * (item.quantity || 1);
        }, 0);
      },
    }),
    {
      name: 'stech_cart_storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, cartUserId: state.cartUserId }),
    }
  )
);

// Global browser listener: When user logs out or session changes, immediately reconcile cart state
if (typeof window !== 'undefined') {
  window.addEventListener('user_session_updated', () => {
    try {
      const user = getEffectiveUser();
      const store = useCartStore.getState();
      if (!user) {
        if (store.cartUserId) {
          store.resetLocalCart();
        }
      } else {
        const uid = String(user.firebase_uid || user.uid || user.id);
        if (store.cartUserId && store.cartUserId !== uid) {
          store.resetLocalCart();
        }
        store.fetchCart();
      }
    } catch (_) {}
  });
}
