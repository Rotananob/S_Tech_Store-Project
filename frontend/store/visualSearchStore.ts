import { create } from 'zustand';

interface VisualSearchState {
  isOpen: boolean;
  openVisualSearch: () => void;
  closeVisualSearch: () => void;
  toggleVisualSearch: () => void;
}

export const useVisualSearchStore = create<VisualSearchState>((set) => ({
  isOpen: false,
  openVisualSearch: () => set({ isOpen: true }),
  closeVisualSearch: () => set({ isOpen: false }),
  toggleVisualSearch: () => set((state) => ({ isOpen: !state.isOpen })),
}));
