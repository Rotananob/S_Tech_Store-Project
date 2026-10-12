import api from "@/lib/api";

export interface AdminStats {
  totalSales: number;
  salesGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  pendingRepairs: number;
  activePromotions: number;
  monthlySales?: { name: string; sales: number }[];
}

export interface CustomerAccount {
  id: number;
  firebase_uid: string;
  display_name: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  telegram?: string | null;
  telegram_chat_id?: string | null;
  has_telegram: boolean;
}

export interface Order {
  id: number;
  order_id: string;
  user_id?: string | null;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_account?: CustomerAccount | null;
  created_at: string;
  total_amount: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
  delivery_type?: string;
  shipping_address?: string;
  tracking_number?: string;
  admin_notes?: string;
  items?: any[];
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
    await api.patch(`/admin/orders/${orderId}/status`, { status });
    return true;
  } catch (error) {
    console.error("Failed to update order status:", error);
    return false;
  }
};

export const updateOrder = async (
  orderId: number,
  data: {
    status?: string;
    payment_status?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    shipping_address?: string;
    delivery_type?: string;
    payment_method?: string;
    total_amount?: number;
    tracking_number?: string;
    admin_notes?: string;
    notify_customer?: boolean;
  }
): Promise<{ success: boolean; message?: string; order?: Order; sent_to_web?: boolean; sent_to_telegram?: boolean }> => {
  try {
    const res = await api.put(`/admin/orders/${orderId}`, data);
    return {
      success: true,
      message: res.data?.message || "បានកែប្រែការបញ្ជាទិញជោគជ័យ!",
      order: res.data?.order,
      sent_to_web: res.data?.sent_to_web,
      sent_to_telegram: res.data?.sent_to_telegram,
    };
  } catch (error: any) {
    console.error("Failed to update order:", error);
    return {
      success: false,
      message: error.response?.data?.message || error.response?.data?.error || "បរាជ័យក្នុងការកែប្រែការបញ្ជាទិញ",
    };
  }
};

export const pushOrderNotification = async (
  orderId: number,
  data: { title?: string; message: string; status?: string }
): Promise<{
  success: boolean;
  message?: string;
  has_customer?: boolean;
  sent_to_web?: boolean;
  sent_to_telegram?: boolean;
  has_telegram?: boolean;
  customer?: any;
}> => {
  try {
    const res = await api.post(`/admin/orders/${orderId}/notify`, data);
    return {
      success: true,
      message: res.data?.message || "បានផ្ញើការជូនដំណឹងជោគជ័យ!",
      has_customer: res.data?.has_customer,
      sent_to_web: res.data?.sent_to_web,
      sent_to_telegram: res.data?.sent_to_telegram,
      has_telegram: res.data?.has_telegram,
      customer: res.data?.customer,
    };
  } catch (error: any) {
    console.error("Failed to push order notification:", error);
    return {
      success: false,
      message: error.response?.data?.message || "បរាជ័យក្នុងការផ្ញើការជូនដំណឹង",
    };
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

export const pairTelegramGroup = async (chatId: string, pairCode?: string, chatTitle?: string): Promise<{ success: boolean; message?: string }> => {
  const res = await api.post("/admin/telegram/pair", {
    chat_id: chatId,
    pair_code: pairCode,
    chat_title: chatTitle,
  });
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

export const broadcastTelegramMessage = async (message: string, topic: string = "chat", sender?: string): Promise<{ success: boolean; message: string; error?: string }> => {
  const res = await api.post("/admin/telegram/broadcast", { message, topic, sender });
  return res.data;
};

