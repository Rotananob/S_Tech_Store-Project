import { create } from "zustand";

interface ChatState {
  isOpen: boolean;
  unreadCount: number;
  productInfo: {
    name?: string;
    slug?: string;
    price?: number;
    image?: string;
  } | null;
  openChat: (productInfo?: { name?: string; slug?: string; price?: number; image?: string }) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setUnreadCount: (count: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  unreadCount: 0,
  productInfo: null,
  openChat: (productInfo) => set({ isOpen: true, unreadCount: 0, productInfo: productInfo || null }),
  closeChat: () => set({ isOpen: false, productInfo: null }),
  toggleChat: () => set((s) => ({ isOpen: !s.isOpen, unreadCount: s.isOpen ? s.unreadCount : 0 })),
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
