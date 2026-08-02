import { create } from "zustand";
import api from "@/lib/api";

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: "welcome" | "login" | "promo" | "order" | "system";
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (title: string, message: string, type: string) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  (set, get) => ({
    notifications: [],
    loading: false,

    fetchNotifications: async () => {
      try {
        set({ loading: true });
        const res = await api.get("/user/notifications");
        set({ notifications: res.data || [], loading: false });
      } catch (e) {
        set({ loading: false });
      }
    },

    addNotification: async (title: string, message: string, type: string) => {
      try {
        const res = await api.post("/user/notifications", { title, message, type });
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
