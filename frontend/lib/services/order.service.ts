import api from "@/lib/api";

export interface OrderItemPayload {
  product_id: number;
  quantity: number;
  price: number;
}

export interface CreateOrderPayload {
  delivery_type: "pnompenh" | "province";
  payment_method: string;
  name: string;
  phone: string;
  address: string;
  items: OrderItemPayload[];
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
}

export const createOrder = async (payload: CreateOrderPayload) => {
  try {
    const response = await api.post("/orders", payload);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("Failed to create order:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Failed to create order",
    };
  }
};
