import { create } from "zustand";
import api from "@/lib/api";

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: "welcome" | "login" | "promo" | "order" | "system";
  link?: string | null;
  image?: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  loading: boolean;
  activePopupNotif: NotificationItem | null;
  setActivePopupNotif: (notif: NotificationItem | null) => void;
  fetchNotifications: () => Promise<void>;
  addNotification: (title: string, message: string, type: string, link?: string, image?: string) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  (set, get) => ({
    notifications: [],
    loading: false,
    activePopupNotif: null,

    setActivePopupNotif: (notif) => set({ activePopupNotif: notif }),

    fetchNotifications: async () => {
      try {
        set({ loading: true });
        const auth = (await import("firebase/auth")).getAuth();
        if (!auth.currentUser) {
          set({ notifications: [], loading: false });
          return;
        }
        const res = await api.get("/user/notifications");
        set({ notifications: res.data || [], loading: false });
      } catch (e) {
        set({ loading: false });
      }
    },

    addNotification: async (title: string, message: string, type: string, link?: string, image?: string) => {
      try {
        const res = await api.post("/user/notifications", { title, message, type, link, image });
        set((state) => ({
          notifications: [res.data, ...state.notifications],
        }));
      } catch (e) {
        // Silently fail if user not logged in
      }
    },

    markAsRead: async (id: number) => {
      try {
        await api.put(`/user/notifications/${id}/read`);
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      } catch (e) {}
    },

    markAllAsRead: async () => {
      try {
        await api.put("/user/notifications/read-all");
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      } catch (e) {}
    },

    clearAll: async () => {
      try {
        await api.delete("/user/notifications");
        set({ notifications: [] });
      } catch (e) {}
    },

    getUnreadCount: () => {
      return get().notifications.filter((n) => !n.read).length;
    },
  })
);
