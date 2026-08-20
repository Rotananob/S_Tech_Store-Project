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
  name: string;
  phone?: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method?: string;
  delivery_type?: string;
  address?: string;
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
    const params = limit ? { limit, sort: "desc" } : { sort: "desc" };
    const response = await api.get("/orders", { params });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch recent orders:", error);
    return [];
  }
};

export const updateOrderStatus = async (orderId: number, status: string): Promise<boolean> => {
  try {
    await api.patch(`/orders/${orderId}`, { status });
    return true;
  } catch (error) {
    console.error("Failed to update order status:", error);
    return false;
  }
};
