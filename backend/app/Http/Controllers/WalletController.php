<?php

namespace App\Http\Controllers;

use App\Models\UserProfile;
use App\Models\WalletTransaction;
use App\Models\Order;
use App\Models\UserNotification;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

class WalletController extends Controller
{
    /**
     * CRITICAL INTERNAL ANTI-BOT PROTECTION RULE:
     * User can earn free bonus coins through daily check-ins and activities.
     * To protect from automated bots/scripts registering accounts and mining unlimited coins,
     * the system quietly caps lifetime free coins earned at 500 coins ($5.00 value).
     * This limit is strictly enforced internally and kept invisible to normal users.
     */
    private const MAX_LIFETIME_FREE_COINS = 500;

    /**
     * Extract firebase_uid from request header or session token.
     */
    private function getUid(Request $request): ?string
    {
        $uid = $request->header('X-Firebase-UID');
        if (!empty($uid)) return $uid;

        $token = $request->header('X-Customer-Token') ?: $request->bearerToken();
        if (!empty($token)) {
            $userId = \Illuminate\Support\Facades\Cache::get("customer_sess_{$token}");
            if ($userId) {
                $user = UserProfile::find($userId);
                if ($user && !empty($user->firebase_uid)) {
                    return $user->firebase_uid;
                }
            }
        }
        return null;
    }

    /**
     * Get or create UserProfile for current request.
     */
    private function resolveUser(Request $request): ?UserProfile
    {
        $uid = $this->getUid($request);
        if (!$uid) return null;

        return UserProfile::firstOrCreate(
            ['firebase_uid' => $uid],
            [
                'display_name' => $request->header('X-Firebase-Name', 'អតិថិជន S-Tech'),
                'email' => $request->header('X-Firebase-Email', ''),
                'photo_url' => $request->header('X-Firebase-Photo', ''),
                'wallet_balance' => 0.00,
                'points' => 0,
                'lifetime_free_coins' => 0,
                'daily_streak' => 0,
            ]
        );
    }

    /**
     * GET /api/user/wallet
     * Returns wallet balance, coin points, daily check-in status, streak, and recent transactions.
     */
    public function getWallet(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $today = Carbon::today()->toDateString();
        $lastCheckinDate = $user->last_daily_coin_at ? Carbon::parse($user->last_daily_coin_at)->toDateString() : null;
        $canClaimDaily = ($lastCheckinDate !== $today);

        // Calculate consecutive streak
        $streak = (int)($user->daily_streak ?? 0);
        if ($lastCheckinDate && Carbon::parse($lastCheckinDate)->diffInDays(Carbon::today()) > 1) {
            // Streak broken if missed yesterday
            $streak = 0;
        }

        // Fetch recent 30 transactions
        $transactions = WalletTransaction::where('firebase_uid', $user->firebase_uid)
            ->orderBy('created_at', 'desc')
            ->limit(30)
            ->get();

        return response()->json([
            'success' => true,
            'wallet' => [
                'balance' => (float)($user->wallet_balance ?? 0.00),
                'coins' => (int)($user->points ?? 0),
                'coins_usd_value' => round(((int)($user->points ?? 0)) / 100, 2),
                'daily_checkin' => [
                    'can_claim' => $canClaimDaily,
                    'already_claimed_today' => !$canClaimDaily,
                    'streak' => $streak,
                    'last_claimed_at' => $user->last_daily_coin_at,
                    'today_reward_coins' => 1,
                ],
                'stats' => [
                    'total_transactions' => WalletTransaction::where('firebase_uid', $user->firebase_uid)->count(),
                    'total_deposited' => (float)WalletTransaction::where('firebase_uid', $user->firebase_uid)->where('type', 'deposit')->where('status', 'completed')->sum('amount'),
                ],
            ],
            'transactions' => $transactions,
        ]);
    }

    /**
     * POST /api/user/wallet/daily-checkin
     * 1-Click Daily Check-in: User visits the site and earns 1 coin (plus streak milestones).
     */
    public function dailyCheckin(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $today = Carbon::today()->toDateString();
        $lastCheckinDate = $user->last_daily_coin_at ? Carbon::parse($user->last_daily_coin_at)->toDateString() : null;

        if ($lastCheckinDate === $today) {
            return response()->json([
                'success' => false,
                'already_claimed' => true,
                'message' => 'លោកអ្នកបានទទួលកាក់ប្រចាំថ្ងៃរួចរាល់ហើយសម្រាប់ថ្ងៃនេះ! សូមត្រឡប់មកវិញនៅថ្ងៃស្អែក។',
                'current_coins' => (int)$user->points,
                'streak' => (int)$user->daily_streak,
            ], 200);
        }

        // Compute streak
        $currentStreak = (int)($user->daily_streak ?? 0);
        if ($lastCheckinDate && Carbon::parse($lastCheckinDate)->diffInDays(Carbon::today()) === 1) {
            $newStreak = $currentStreak + 1;
        } else {
            $newStreak = 1;
        }

        // Base reward: 1 Coin. On 7-day milestone, bonus +3 coins!
        $coinsToAward = ($newStreak % 7 === 0) ? 3 : 1;

        // ── INTERNAL ANTI-BOT PROTECTION RULE ──────────────────────────
        // Cap lifetime free coins at 500 coins. If user is at or near cap, silently cap it.
        $lifetimeFree = (int)($user->lifetime_free_coins ?? 0);
        $availableQuota = max(0, self::MAX_LIFETIME_FREE_COINS - $lifetimeFree);
        $actualCoinsGiven = min($coinsToAward, $availableQuota);

        // Update user state
        $user->last_daily_coin_at = $today;
        $user->daily_streak = $newStreak;
        $user->points = ((int)$user->points) + $actualCoinsGiven;
        $user->lifetime_free_coins = $lifetimeFree + $actualCoinsGiven;
        $user->save();

        // Create transaction record
        if ($actualCoinsGiven > 0) {
            WalletTransaction::create([
                'firebase_uid' => $user->firebase_uid,
                'type' => 'coin_reward',
                'amount' => 0.00,
                'coins' => $actualCoinsGiven,
                'description' => "រង្វាន់ចូលមើលប្រចាំថ្ងៃ (+{$actualCoinsGiven} Coin) • ថ្ងៃទី {$newStreak}",
                'payment_method' => 'daily_checkin',
                'status' => 'completed',
                'metadata' => [
                    'streak' => $newStreak,
                    'milestone' => ($newStreak % 7 === 0),
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'coins_earned' => $actualCoinsGiven,
            'total_coins' => (int)$user->points,
            'streak' => $newStreak,
            'message' => "អបអរសាទរ! លោកអ្នកទទួលបាន +{$actualCoinsGiven} Coin សម្រាប់ការចូលមកកាន់គេហទំព័រថ្ងៃនេះ 🎉 (Streak: ថ្ងៃទី {$newStreak})",
        ]);
    }

    /**
     * POST /api/user/wallet/activity-reward
     * Activity-based rewards: browsing products, sharing, chat AI -> awards 3 or 5 coins.
     */
    public function claimActivityReward(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'activity_type' => 'required|string|in:browse_products,share_store,chat_ai,explore_specs,cart_milestone',
        ]);

        $type = $validated['activity_type'];
        $today = Carbon::today()->toDateString();
        $cacheKey = "user_act_{$user->firebase_uid}_{$type}_{$today}";

        // Daily rate limit: each specific activity can be claimed at most once per day
        if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
            return response()->json([
                'success' => false,
                'already_claimed' => true,
                'message' => 'លោកអ្នកបានទទួលកាក់សម្រាប់សកម្មភាពនេះរួចរាល់ហើយក្នុងថ្ងៃនេះ!',
                'current_coins' => (int)$user->points,
            ], 200);
        }

        // Determine coin reward (3 to 5 coins)
        $coinsMap = [
            'browse_products' => ['coins' => 3, 'desc' => 'រង្វាន់សកម្មភាពចូលមើលទំនិញ (+3 Coins)'],
            'explore_specs' => ['coins' => 3, 'desc' => 'រង្វាន់សកម្មភាពពិនិត្យមើលលក្ខណៈបច្ចេកទេស (+3 Coins)'],
            'chat_ai' => ['coins' => 3, 'desc' => 'រង្វាន់សកម្មភាពពិគ្រោះជាមួយ Gemini AI (+3 Coins)'],
            'cart_milestone' => ['coins' => 3, 'desc' => 'រង្វាន់សកម្មភាពរៀបចំកន្ត្រកទំនិញ (+3 Coins)'],
            'share_store' => ['coins' => 5, 'desc' => 'រង្វាន់សកម្មភាពចែករំលែកហាងទៅកាន់មិត្តភក្តិ (+5 Coins)'],
        ];

        $rewardConfig = $coinsMap[$type] ?? ['coins' => 3, 'desc' => 'រង្វាន់សកម្មភាពក្នុងគេហទំព័រ (+3 Coins)'];
        $requestedCoins = $rewardConfig['coins'];

        // ── INTERNAL ANTI-BOT PROTECTION RULE ──────────────────────────
        $lifetimeFree = (int)($user->lifetime_free_coins ?? 0);
        $availableQuota = max(0, self::MAX_LIFETIME_FREE_COINS - $lifetimeFree);
        $actualCoinsGiven = min($requestedCoins, $availableQuota);

        // Mark activity claimed for today
        \Illuminate\Support\Facades\Cache::put($cacheKey, true, 86400);

        // Apply reward
        $user->points = ((int)$user->points) + $actualCoinsGiven;
        $user->lifetime_free_coins = $lifetimeFree + $actualCoinsGiven;
        $user->save();

        if ($actualCoinsGiven > 0) {
            WalletTransaction::create([
                'firebase_uid' => $user->firebase_uid,
                'type' => 'coin_reward',
                'amount' => 0.00,
                'coins' => $actualCoinsGiven,
                'description' => $rewardConfig['desc'],
                'payment_method' => 'activity_bonus',
                'status' => 'completed',
                'metadata' => ['activity_type' => $type],
            ]);
        }

        return response()->json([
            'success' => true,
            'coins_earned' => $actualCoinsGiven,
            'total_coins' => (int)$user->points,
            'message' => "អស្ចារ្យណាស់! លោកអ្នកទទួលបាន +{$actualCoinsGiven} Coins ពីសកម្មភាព '{$rewardConfig['desc']}' 🎉",
        ]);
    }

    /**
     * POST /api/user/wallet/topup/session
     * Initiates a real bank top-up session (Bakong KHQR, ABA, Wing, ACLEDA, Card).
     */
    public function createTopupSession(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1.00|max:5000.00',
            'method' => 'nullable|string|in:khqr,bakong,aba,wing,acleda,card,visa',
            'currency' => 'nullable|string|in:USD,KHR',
        ]);

        $amount = (float)$validated['amount'];
        $method = $validated['method'] ?? 'bakong';
        $currency = $validated['currency'] ?? 'USD';
        $depositId = 'DEP_' . strtoupper(Str::random(10));

        // Generate authentic EMVCo Bakong KHQR String using standard PaymentService
        $khqrString = PaymentService::generateKHQRString($amount, $depositId, $currency);
        $qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' . urlencode($khqrString);

        // Prepare banking app deeplinks
        $deeplinks = [
            'bakong' => "bakong://qr?data=" . urlencode($khqrString),
            'aba' => "aba://qr?data=" . urlencode($khqrString),
            'wing' => "wing://qr?data=" . urlencode($khqrString),
            'acleda' => "acleda://qr?data=" . urlencode($khqrString),
        ];

        // Store pending deposit transaction in ledger
        WalletTransaction::create([
            'firebase_uid' => $user->firebase_uid,
            'type' => 'deposit',
            'amount' => $amount,
            'coins' => 0,
            'description' => "បញ្ចូលទឹកប្រាក់ទៅកាន់កាបូប S-Tech Wallet (" . strtoupper($method) . ")",
            'payment_method' => $method,
            'reference_id' => $depositId,
            'status' => 'pending',
            'metadata' => [
                'currency' => $currency,
                'khqr_string' => $khqrString,
            ],
        ]);

        // Cache session for 30 minutes
        \Illuminate\Support\Facades\Cache::put("wallet_deposit_{$depositId}", [
            'firebase_uid' => $user->firebase_uid,
            'amount' => $amount,
            'method' => $method,
            'status' => 'pending',
        ], 1800);

        return response()->json([
            'success' => true,
            'deposit_id' => $depositId,
            'amount' => $amount,
            'amount_khr' => round($amount * 4060),
            'khqr_string' => $khqrString,
            'qr_image_url' => $qrImageUrl,
            'deeplinks' => $deeplinks,
            'method' => $method,
        ]);
    }

    /**
     * POST /api/user/wallet/topup/confirm
     * Confirms the bank top-up and instantly credits the wallet balance.
     */
    public function confirmTopup(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'deposit_id' => 'required|string',
        ]);

        $depositId = $validated['deposit_id'];

        $tx = WalletTransaction::where('reference_id', $depositId)
            ->where('firebase_uid', $user->firebase_uid)
            ->first();

        if (!$tx) {
            return response()->json(['success' => false, 'message' => 'រកមិនឃើញទិន្នន័យនៃការបញ្ចូលលុយនេះឡើយ'], 404);
        }

        if ($tx->status === 'completed') {
            return response()->json([
                'success' => true,
                'message' => 'ការបញ្ចូលទឹកប្រាក់នេះត្រូវបានអនុម័តរួចរាល់ហើយ',
                'wallet_balance' => (float)$user->wallet_balance,
            ]);
        }

        // Credit real wallet balance
        $amount = (float)$tx->amount;
        $user->wallet_balance = ((float)($user->wallet_balance ?? 0.00)) + $amount;
        $user->save();

        // Update transaction status
        $tx->status = 'completed';
        $tx->save();

        // Remove cache
        \Illuminate\Support\Facades\Cache::forget("wallet_deposit_{$depositId}");

        // Create notification
        try {
            UserNotification::create([
                'firebase_uid' => $user->firebase_uid,
                'title' => '💳 បញ្ចូលទឹកប្រាក់ជោគជ័យ! (Wallet Funded)',
                'message' => "លោកអ្នកបានបញ្ចូលទឹកប្រាក់ចំនួន $" . number_format($amount, 2) . " ទៅកាន់កាបូប S-Tech Wallet ដោយជោគជ័យ។ សមតុល្យបច្ចុប្បន្ន: $" . number_format($user->wallet_balance, 2),
                'type' => 'system',
                'read' => false,
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'message' => "អបអរសាទរ! បានបញ្ចូលទឹកប្រាក់ $" . number_format($amount, 2) . " ទៅក្នុងកាបូបដោយជោគជ័យ 🎉",
            'amount_added' => $amount,
            'new_balance' => (float)$user->wallet_balance,
            'transaction' => $tx,
        ]);
    }

    /**
     * POST /api/user/wallet/redeem-coins
     * Converts S-Coins into Real USD Wallet Balance (100 coins = $1.00 USD).
     */
    public function convertCoins(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'coins' => 'required|integer|min:50',
        ]);

        $coinsToRedeem = (int)$validated['coins'];
        $currentCoins = (int)($user->points ?? 0);

        if ($coinsToRedeem > $currentCoins) {
            return response()->json([
                'success' => false,
                'message' => "លោកអ្នកមានកាក់ត្រឹមតែ {$currentCoins} Coins ប៉ុណ្ណោះ មិនគ្រប់គ្រាន់ដើម្បីប្តូរឡើយ!",
            ], 422);
        }

        // Conversion rate: 100 coins = $1.00 USD
        $usdAmount = round($coinsToRedeem / 100, 2);

        // Deduct coins and credit wallet balance
        $user->points = $currentCoins - $coinsToRedeem;
        $user->wallet_balance = ((float)($user->wallet_balance ?? 0.00)) + $usdAmount;
        $user->save();

        // Record transaction
        $tx = WalletTransaction::create([
            'firebase_uid' => $user->firebase_uid,
            'type' => 'coin_redeem',
            'amount' => $usdAmount,
            'coins' => -$coinsToRedeem,
            'description' => "ប្តូរកាក់ {$coinsToRedeem} Coins ទៅជាសាច់ប្រាក់ $" . number_format($usdAmount, 2),
            'payment_method' => 'coins_conversion',
            'status' => 'completed',
        ]);

        return response()->json([
            'success' => true,
            'message' => "បានប្តូរ {$coinsToRedeem} Coins ទៅជាទឹកប្រាក់ $" . number_format($usdAmount, 2) . " ក្នុងកាបូបដោយជោគជ័យ! 🎉",
            'converted_usd' => $usdAmount,
            'new_wallet_balance' => (float)$user->wallet_balance,
            'remaining_coins' => (int)$user->points,
            'transaction' => $tx,
        ]);
    }

    /**
     * POST /api/user/wallet/pay-order
     * 1-Click Payment for Order from S-Tech Wallet balance.
     */
    public function payWithWallet(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'order_id' => 'required|string',
        ]);

        $order = Order::where('order_id', $validated['order_id'])
            ->orWhere('id', $validated['order_id'])
            ->firstOrFail();

        if ($order->payment_status === 'paid') {
            return response()->json([
                'success' => true,
                'message' => 'ការបញ្ជាទិញនេះត្រូវបានទូទាត់រួចរាល់ហើយ',
                'order' => $order,
            ]);
        }

        $orderAmount = (float)$order->total_amount;
        $walletBalance = (float)($user->wallet_balance ?? 0.00);

        if ($walletBalance < $orderAmount) {
            $shortage = round($orderAmount - $walletBalance, 2);
            return response()->json([
                'success' => false,
                'message' => "សមតុល្យក្នុងកាបូបមិនគ្រប់គ្រាន់ឡើយ (ខ្វះ $" . number_format($shortage, 2) . ")! សូមបញ្ចូលលុយបន្ថែម។",
                'current_balance' => $walletBalance,
                'required_amount' => $orderAmount,
                'shortage' => $shortage,
            ], 422);
        }

        // Deduct balance
        $user->wallet_balance = $walletBalance - $orderAmount;
        $user->save();

        // Mark order as paid
        $tranId = 'WAL_' . strtoupper(Str::random(10));
        PaymentService::markOrderAsPaid($order, $tranId, 'wallet', [
            'paid_via' => 'stech_wallet',
            'customer_uid' => $user->firebase_uid,
        ]);

        // Record in ledger
        WalletTransaction::create([
            'firebase_uid' => $user->firebase_uid,
            'type' => 'purchase',
            'amount' => -$orderAmount,
            'coins' => 0,
            'description' => "ទូទាត់ការបញ្ជាទិញ #{$order->order_id}",
            'payment_method' => 'wallet',
            'reference_id' => $order->order_id,
            'status' => 'completed',
        ]);

        return response()->json([
            'success' => true,
            'message' => "ការទូទាត់តាមកាបូប S-Tech Wallet បានជោគជ័យ 100%! 🎉",
            'order_id' => $order->order_id,
            'amount_deducted' => $orderAmount,
            'remaining_balance' => (float)$user->wallet_balance,
        ]);
    }
}
