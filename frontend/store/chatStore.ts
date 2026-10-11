import { create } from "zustand";

interface ChatState {
  isOpen: boolean;
  productInfo: {
    name?: string;
    slug?: string;
    price?: number;
    image?: string;
  } | null;
  openChat: (productInfo?: { name?: string; slug?: string; price?: number; image?: string }) => void;
  closeChat: () => void;
  toggleChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  productInfo: null,
  openChat: (productInfo) => set({ isOpen: true, productInfo: productInfo || null }),
  closeChat: () => set({ isOpen: false, productInfo: null }),
  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
}));
