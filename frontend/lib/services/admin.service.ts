import api from "@/lib/api";

export interface AdminStats {
  totalSales: number;
  salesGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  pendingRepairs: number;
  activePromotions: number;
}

export interface Order {
  id: number;
  order_id: string;
  customer_name: string;
  customer_phone?: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method?: string;
  delivery_type?: string;
  shipping_address?: string;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    const response = await api.get("/admin/stats");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    // Return fallback empty stats in case of error
    return {
      totalSales: 0,
      salesGrowth: 0,
      totalOrders: 0,
      ordersGrowth: 0,
      pendingRepairs: 0,
      activePromotions: 0,
    };
  }
};

export const getRecentOrders = async (limit?: number): Promise<Order[]> => {
  try {
    const response = await api.get("/admin/orders");
    const orders = response.data;
    // Sort by created_at desc and optionally limit
    const sorted = orders.sort((a: Order, b: Order) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  } catch (error) {
    console.error("Failed to fetch recent orders:", error);
    return [];
  }
};

export const updateOrderStatus = async (orderId: number, status: string): Promise<boolean> => {
  try {
    await api.patch(`/admin/orders/${orderId}`, { status });
    return true;
  } catch (error) {
    console.error("Failed to update order status:", error);
    return false;
  }
};

export interface TelegramStatus {
  connected: boolean;
  is_configured?: boolean;
  chat_id?: string | null;
  chat_title?: string | null;
  chat_type?: string | null;
  connected_at?: string | null;
  connected_by?: string | null;
  bot_username?: string | null;
  notify_orders: boolean;
  notify_low_stock: boolean;
  notify_repairs: boolean;
  notify_shifts: boolean;
  topics?: Record<string, number>;
}

export interface TelegramPairLink {
  success: boolean;
  pair_code: string;
  bot_username: string;
  group_url: string;
  direct_url: string;
  expires_in: number;
  needs_config?: boolean;
  message?: string;
}

export const getTelegramStatus = async (): Promise<TelegramStatus> => {
  try {
    const res = await api.get("/admin/telegram/status");
    return res.data;
  } catch (e) {
    return {
      connected: false,
      is_configured: false,
      bot_username: null,
      notify_orders: true,
      notify_low_stock: true,
      notify_repairs: true,
      notify_shifts: true,
    };
  }
};

export const generateTelegramLink = async (userEmail?: string): Promise<TelegramPairLink> => {
  const res = await api.post("/admin/telegram/generate-link", { user: userEmail });
  return res.data;
};

export const testTelegramNotification = async (): Promise<{ success: boolean; message: string }> => {
  const res = await api.post("/admin/telegram/test");
  return res.data;
};

export const disconnectTelegram = async (): Promise<boolean> => {
  const res = await api.post("/admin/telegram/disconnect");
  return res.data.success;
};

export const setupTelegramTopics = async (): Promise<{ success: boolean; data?: any; message?: string }> => {
  const res = await api.post("/admin/telegram/setup-topics");
  return res.data;
};

export const updateTelegramSettings = async (settings: Partial<TelegramStatus> & { bot_token?: string }): Promise<{ success: boolean; settings?: any; error?: string }> => {
  const res = await api.post("/admin/telegram/settings", settings);
  return res.data;
};

