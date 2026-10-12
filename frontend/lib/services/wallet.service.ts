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

export const getWalletData = async (): Promise<{ wallet: WalletData; transactions: WalletTransaction[] }> => {
  const res = await api.get("/user/wallet");
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
  return res.data;
};

export const payOrderWithWallet = async (orderId: string): Promise<{
  success: boolean;
  message: string;
  order_id: string;
  amount_deducted: number;
  remaining_balance: number;
}> => {
  const res = await api.post("/user/wallet/pay-order", { order_id: orderId });
  return res.data;
};
