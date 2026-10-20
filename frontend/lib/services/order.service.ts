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
  promo_code?: string;
  discount_amount?: number;
}

export interface PromoValidationResult {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    code: string;
    name: string;
    type: "percentage" | "fixed";
    value: number;
    discount_amount: number;
  };
}

export const validatePromoCode = async (
  code: string,
  subtotal: number
): Promise<PromoValidationResult> => {
  try {
    const res = await api.post("/promo-codes/validate", {
      code,
      subtotal,
    });
    return res.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "កូដប្រូម៉ូសិនមិនត្រឹមត្រូវ (Invalid promo code)",
    };
  }
};

export const createOrder = async (payload: CreateOrderPayload) => {
  try {
    const response = await api.post("/orders", payload);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("Failed to create order:", error);
    const serverMessage = error.response?.data?.message || error.response?.data?.error;
    const isTimeout = error.code === "ECONNABORTED" || error.response?.status === 504 || (typeof error.message === "string" && error.message.toLowerCase().includes("timeout"));
    const fallbackMessage = isTimeout
      ? "ម៉ាស៊ីនមេឆ្លើយតបយឺត (Gateway Timeout)។ សូមព្យាយាមម្ដងទៀត!"
      : (error.message || "ការបង្កើតការកុម្ម៉ង់មិនជោគជ័យ (Failed to create order)");

    return {
      success: false,
      error: serverMessage || fallbackMessage,
    };
  }
};

export const createPaymentSession = async (orderId: string, method: string = "khqr", currency: string = "USD") => {
  try {
    const response = await api.post("/payment/session", {
      order_id: orderId,
      method,
      currency,
    });
    return { success: true, data: response.data?.session };
  } catch (error: any) {
    console.error("Failed to create payment session:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Failed to generate payment session",
    };
  }
};

export const processCardPayment = async (orderId: string, cardData: {
  number: string;
  exp_month: string;
  exp_year: string;
  cvv: string;
  name: string;
}) => {
  try {
    const response = await api.post("/payment/card", {
      order_id: orderId,
      ...cardData,
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("Failed to process card payment:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Card payment rejected. Please verify card details.",
    };
  }
};

export const checkPaymentStatus = async (orderId: string) => {
  try {
    const response = await api.get(`/payment/check/${orderId}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: "Failed to verify status" };
  }
};

export const confirmManualPayment = async (orderId: string, method: string = "khqr") => {
  try {
    const response = await api.post(`/payment/confirm-manual/${orderId}`, { method });
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "Failed to confirm payment",
    };
  }
};

export const markOrderFailed = async (orderId: string, reason?: string) => {
  try {
    const response = await api.post(`/orders/${orderId}/mark-failed`, { reason });
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "Failed to mark order as failed",
    };
  }
};
