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

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      isOpen: false,
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setIsOpen: (open: boolean) => set({ isOpen: open }),

      fetchCart: async () => {
        const user = getEffectiveUser();
        if (!user) {
          // Guest users retain their locally persisted cart items
          return;
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

            if (mappedItems.length > 0) {
              set({ items: mappedItems, loading: false });
            } else {
              // If server returns empty but local cart has items, sync local items to user's database cart
              const localItems = get().items;
              if (localItems.length > 0) {
                for (const li of localItems) {
                  const pid = (li as any).product_id || li.id;
                  if (pid) {
                    await addToCart(pid, li.quantity).catch(() => {});
                  }
                }
              }
              set({ loading: false });
            }
          } else {
            set({ loading: false });
          }
        } catch {
          set({ loading: false });
        }
      },

      addItem: async (item) => {
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

        set({ items: updated });

        // If authenticated, sync with server cart in background
        const user = getEffectiveUser();
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
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          const price = item.product?.sale_price ?? item.product?.price ?? item.price ?? 0;
          return total + price * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'stech_cart_storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
