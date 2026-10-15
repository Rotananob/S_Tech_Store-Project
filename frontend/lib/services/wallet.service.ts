import api from "@/lib/api";

export interface WalletTransaction {
  id: number;
  firebase_uid: string;
  type: "deposit" | "purchase" | "coin_reward" | "coin_redeem" | "refund" | "admin_adjustment";
  amount: number;
  coins: number;
  description: string;
  payment_method?: string;
  reference_id?: string;
  status: "completed" | "pending" | "failed";
  metadata?: any;
  created_at: string;
}

export interface WalletData {
  balance: number;
  coins: number;
  coins_usd_value: number;
  daily_checkin: {
    can_claim: boolean;
    already_claimed_today: boolean;
    streak: number;
    last_claimed_at: string | null;
    today_reward_coins: number;
  };
  stats: {
    total_transactions: number;
    total_deposited: number;
  };
}

export interface TopupSessionResponse {
  success: boolean;
  deposit_id: string;
  amount: number;
  amount_khr: number;
  khqr_string: string;
  qr_image_url: string;
  deeplinks: {
    universal?: string;
    bakong?: string;
    aba?: string;
    wing?: string;
    acleda?: string;
  };
  merchant?: {
    name?: string;
    bank?: string;
    usd_account?: string;
    khr_account?: string;
  };
  method: string;
}

export const getCachedWalletData = (): WalletData | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("stech_cached_wallet");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

export const updateCachedWallet = (partial: Partial<WalletData>) => {
  if (typeof window === "undefined") return;
  try {
    const existing = getCachedWalletData() || {
      balance: 0,
      coins: 0,
      coins_usd_value: 0,
      daily_checkin: {
        can_claim: true,
        already_claimed_today: false,
        streak: 0,
        last_claimed_at: null,
        today_reward_coins: 1,
      },
      stats: {
        total_transactions: 0,
        total_deposited: 0,
      },
    };
    const updated = { ...existing, ...partial };
    localStorage.setItem("stech_cached_wallet", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("stech_wallet_updated", { detail: updated }));
  } catch (e) {}
};

export const getWalletData = async (params?: { date?: string; type?: string; limit?: number }): Promise<{ wallet: WalletData; transactions: WalletTransaction[] }> => {
  const res = await api.get("/user/wallet", { params });
  if (res.data?.wallet) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("stech_cached_wallet", JSON.stringify(res.data.wallet));
        window.dispatchEvent(new CustomEvent("stech_wallet_updated", { detail: res.data.wallet }));
      } catch (e) {}
    }
  }
  return {
    wallet: res.data?.wallet,
    transactions: res.data?.transactions || [],
  };
};

export const claimDailyCheckin = async (): Promise<{
  success: boolean;
  coins_earned: number;
  total_coins: number;
  streak: number;
  message: string;
  already_claimed?: boolean;
}> => {
  const res = await api.post("/user/wallet/daily-checkin");
  return res.data;
};

export const claimActivityReward = async (activityType: string): Promise<{
  success: boolean;
  coins_earned: number;
  total_coins: number;
  message: string;
  already_claimed?: boolean;
}> => {
  const res = await api.post("/user/wallet/activity-reward", { activity_type: activityType });
  return res.data;
};

export const createTopupSession = async (
  amount: number,
  method = "bakong"
): Promise<TopupSessionResponse> => {
  const res = await api.post("/user/wallet/topup/session", {
    amount,
    method,
    currency: "USD",
  });
  return res.data;
};

export const checkTopupStatus = async (depositId: string): Promise<{
  success: boolean;
  paid: boolean;
  status: string;
  amount?: number;
  wallet_balance?: number;
  message?: string;
}> => {
  const res = await api.get(`/user/wallet/topup/status/${depositId}`);
  return res.data;
};

export const confirmTopup = async (depositId: string): Promise<{
  success: boolean;
  message: string;
  amount_added: number;
  new_balance: number;
}> => {
  const res = await api.post("/user/wallet/topup/confirm", { deposit_id: depositId });
  if (res.data?.success && res.data?.new_balance !== undefined) {
    updateCachedWallet({ balance: Number(res.data.new_balance) });
  }
  return res.data;
};

export const alertAdminTopup = async (depositId: string): Promise<{
  success: boolean;
  message: string;
  already_completed?: boolean;
  wallet_balance?: number;
}> => {
  const res = await api.post("/user/wallet/topup/alert-admin", { deposit_id: depositId });
  if (res.data?.already_completed && res.data?.wallet_balance !== undefined) {
    updateCachedWallet({ balance: Number(res.data.wallet_balance) });
  }
  return res.data;
};

export interface CardTopupPayload {
  amount: number;
  card_number: string;
  cardholder_name: string;
  exp_month: string | number;
  exp_year: string | number;
  cvv: string;
}

export interface CardTopupResponse {
  success: boolean;
  message: string;
  amount_added: number;
  new_balance: number;
  deposit_id: string;
  card_brand: string;
  masked_card: string;
  auth_code: string;
}

export const processCardTopup = async (data: CardTopupPayload): Promise<CardTopupResponse> => {
  const res = await api.post("/user/wallet/topup/card", data);
  if (res.data?.success && res.data?.new_balance !== undefined) {
    updateCachedWallet({ balance: Number(res.data.new_balance) });
  }
  return res.data;
};

export const convertCoinsToUSD = async (coins: number): Promise<{
  success: boolean;
  message: string;
  converted_usd: number;
  new_wallet_balance: number;
  remaining_coins: number;
}> => {
  const res = await api.post("/user/wallet/redeem-coins", { coins });
  if (res.data?.success) {
    updateCachedWallet({
      balance: Number(res.data.new_wallet_balance),
      coins: Number(res.data.remaining_coins),
      coins_usd_value: round(Number(res.data.remaining_coins) / 100, 2),
    });
  }
  return res.data;
};

function round(val: number, decimals: number) {
  return Number(Math.round(Number(val + "e" + decimals)) + "e-" + decimals);
}

export const payOrderWithWallet = async (orderId: string): Promise<{
  success: boolean;
  message: string;
  order_id: string;
  amount_deducted: number;
  remaining_balance: number;
}> => {
  const res = await api.post("/user/wallet/pay-order", { order_id: orderId });
  if (res.data?.success && res.data?.remaining_balance !== undefined) {
    updateCachedWallet({ balance: Number(res.data.remaining_balance) });
  }
  return res.data;
};

export const deleteWalletTransaction = async (id: number): Promise<{ success: boolean; message: string; deleted_id?: number }> => {
  const res = await api.delete(`/user/wallet/transactions/${id}`);
  return res.data;
};

export const clearWalletTransactions = async (params?: { date?: string; type?: string }): Promise<{ success: boolean; message: string; deleted_count?: number }> => {
  const res = await api.post("/user/wallet/transactions/clear", {}, { params });
  return res.data;
};
