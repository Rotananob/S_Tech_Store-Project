<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\ShiftController;
use App\Models\Category;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\SuperAdminMiddleware;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Routes
Route::get('/categories', function () {
    return response()->json(Category::withCount('products')->get());
});

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/products/{id}/reviews', [\App\Http\Controllers\ProductReviewController::class, 'index']);
Route::post('/products/{id}/reviews', [\App\Http\Controllers\ProductReviewController::class, 'store'])->middleware('throttle:10,1');

// Public Store Branches & Shifts (Read Only)
Route::get('/branches', [BranchController::class, 'index']);
Route::get('/shifts', [ShiftController::class, 'index']);

// Customer Live Chat Support Alert to Telegram (with Admin Direct 1-Click Access Link)
Route::post('/chat/request-agent', function (Request $request) {
    $validated = $request->validate([
        'name' => 'nullable|string|max:150',
        'phone' => 'nullable|string|max:50',
        'email' => 'nullable|string|max:150',
        'telegram' => 'nullable|string|max:100',
        'message' => 'nullable|string|max:2000',
        'product_name' => 'nullable|string|max:255',
        'product_url' => 'nullable|string|max:500',
        'chat_id' => 'nullable|string|max:100',
    ]);

    // Generate secure 1-click token for Admin/Staff Direct Chat Access
    $bypassToken = \Illuminate\Support\Str::random(40);
    $chatId = $request->input('chat_id') ?: ($request->input('email') ?: ('visitor_' . time()));

    \Illuminate\Support\Facades\Cache::put("bypass_chat_token_{$bypassToken}", [
        'chat_id' => $chatId,
        'user_name' => $validated['name'] ?? 'Website Customer',
        'uses' => 3, // Max 3 uses
        'created_at' => now()->toIso8601String(),
    ], 120 * 60); // 2 hours expiration

    $validated['bypass_token'] = $bypassToken;
    $validated['chat_id'] = $chatId;

    $res = \App\Services\TelegramService::sendCustomerChatAlert($validated);
    return response()->json([
        'success' => true,
        'message' => 'Your request has been forwarded to our support team on Telegram! We will reach out shortly.',
        'chat_id' => $chatId,
        'telegram_result' => $res,
    ]);
});

// Admin Live Chat Real-Time Reply Alert to Customer Telegram (Bot 2 Companion)
Route::post('/chat/admin-reply-alert', function (Request $request) {
    $validated = $request->validate([
        'chat_id' => 'required|string',
        'reply_text' => 'required|string',
        'staff_name' => 'nullable|string|max:100',
        'customer_name' => 'nullable|string|max:100',
        'customer_email' => 'nullable|string|max:150',
        'customer_phone' => 'nullable|string|max:50',
    ]);

    $chatId = $validated['chat_id'];
    $user = null;

    // Check if chat_id starts with tg_
    if (str_starts_with($chatId, 'tg_')) {
        $tgRaw = substr($chatId, 3);
        $user = \App\Models\UserProfile::where('firebase_uid', $chatId)
            ->orWhere('telegram_chat_id', $tgRaw)
            ->first();
    } elseif (!empty($chatId) && !str_starts_with($chatId, 'visitor_')) {
        $user = \App\Models\UserProfile::where('firebase_uid', $chatId)->first();
    }

    // Fallback to phone / email
    if (!$user && !empty($validated['customer_phone'])) {
        $user = \App\Models\UserProfile::where('phone', $validated['customer_phone'])->first();
    }
    if (!$user && !empty($validated['customer_email'])) {
        $user = \App\Models\UserProfile::where('email', $validated['customer_email'])->first();
    }

    $targetChatId = \App\Services\TelegramService::resolveCustomerChatId(
        $user ?: $chatId,
        $validated['customer_phone'] ?? null,
        $validated['customer_email'] ?? null
    );

    if ($targetChatId) {
        $res = \App\Services\TelegramService::sendAdminChatReplyAlertToCustomer(
            $targetChatId,
            $validated['reply_text'],
            $validated['staff_name'] ?? 'S Tech Staff'
        );

        return response()->json([
            'success' => true,
            'telegram_alerted' => ($res['ok'] ?? false) === true,
            'chat_id' => $targetChatId,
            'message' => 'បានផ្ញើការជូនដំណឹងទៅកាន់ Telegram របស់អតិថិជនជោគជ័យ!',
        ]);
    }

    return response()->json([
        'success' => true,
        'telegram_alerted' => false,
        'reason' => 'not_connected',
        'message' => 'អតិថិជនមិនទាន់ភ្ជាប់ Telegram ទេ (បានអាប់ដេតសារក្នុង Live Chat)',
    ]);
});

// Admin Verify & Consume Live Chat Bypass Token (One-Click Telegram Redirect - Max 3 Uses)
Route::post('/admin/verify-bypass-token', function (Request $request) {
    $token = trim((string)($request->input('bypass_token') ?: $request->input('token') ?: ''));
    if (!$token) {
        return response()->json(['success' => false, 'error' => 'Token is required'], 400);
    }

    $cacheKey = "bypass_chat_token_{$token}";
    $data = \Illuminate\Support\Facades\Cache::get($cacheKey);

    if (!$data || !is_array($data)) {
        return response()->json([
            'success' => false,
            'error' => 'តំណភ្ជាប់ Bypass នេះមិនត្រឹមត្រូវ ឬបានផុតកំណត់សុពលភាពហើយ (Invalid or expired token)!',
        ], 403);
    }

    $usesLeft = (int)($data['uses'] ?? 1);
    if ($usesLeft <= 0) {
        \Illuminate\Support\Facades\Cache::forget($cacheKey);
        return response()->json([
            'success' => false,
            'error' => 'តំណភ្ជាប់នេះត្រូវបានប្រើប្រាស់គ្រប់ចំនួនកំណត់ ៣ ដងរួចហើយ (Max uses exceeded)! សូម Login តាមទម្រង់ធម្មតា។',
        ], 403);
    }

    // Decrement usage
    $usesLeft -= 1;
    if ($usesLeft <= 0) {
        \Illuminate\Support\Facades\Cache::forget($cacheKey);
    } else {
        $data['uses'] = $usesLeft;
        \Illuminate\Support\Facades\Cache::put($cacheKey, $data, 120 * 60);
    }

    // Authenticate as active admin/staff user or fallback
    $adminUser = \App\Models\User::whereIn('role', ['admin', 'super_admin', 'staff'])
        ->where('status', 'active')
        ->first();

    if ($adminUser) {
        $apiToken = bin2hex(random_bytes(32));
        $adminUser->api_token = $apiToken;
        $adminUser->last_login_at = now();
        $adminUser->save();

        $userData = [
            'id' => $adminUser->id,
            'name' => $adminUser->name,
            'email' => $adminUser->email,
            'role' => $adminUser->role,
            'branch' => $adminUser->branch ?? 'Headquarters',
            'shift' => $adminUser->shift ?? 'Live Chat On-Duty',
            'permissions' => $adminUser->permissions ?? ['*'],
        ];
    } else {
        $apiToken = 'admin_bypass_' . md5($token . time());
        $userData = [
            'id' => 999,
            'name' => 'Live Support Agent',
            'email' => 'support@s-tech-store.tech',
            'role' => 'admin',
            'branch' => 'Headquarters',
            'shift' => 'Live Chat On-Duty',
            'permissions' => ['*'],
        ];
    }

    return response()->json([
        'success' => true,
        'chat_id' => $data['chat_id'] ?? null,
        'user_name' => $data['user_name'] ?? 'Customer',
        'uses_remaining' => $usesLeft,
        'token' => $apiToken,
        'admin_token' => $apiToken,
        'admin_user' => $userData,
    ]);
})->middleware('throttle:5,1');

// Admin Send Password Reset / Magic Login Token Link to Customer (Telegram & In-App - Guarded by AdminMiddleware)
Route::post('/admin/users/{id}/send-reset-token', function (Request $request, $id) {
    $user = \App\Models\UserProfile::findOrFail($id);

    // Generate 24-hr token
    $token = \Illuminate\Support\Str::random(60);
    $user->magic_login_token = $token;
    $user->magic_token_expires_at = now()->addHours(24);
    $user->last_password_reset_at = now();
    $user->save();

    $frontendUrl = 'https://www.s-tech-store.tech';
    $magicLink = "{$frontendUrl}/km/magic-login?token={$token}";

    // Dispatch Telegram alert to users topic with forwardable template
    $tgRes = \App\Services\TelegramService::sendCustomerMagicLinkAlert($user, $magicLink);

    // Also create in-app notification for the user
    if (!empty($user->firebase_uid)) {
        try {
            \App\Models\UserNotification::create([
                'firebase_uid' => $user->firebase_uid,
                'title' => '🔑 តំណភ្ជាប់ចូលគណនី និងកំណត់ពាក្យសម្ងាត់ឡើងវិញ',
                'message' => 'Admin បានបង្កើតតំណភ្ជាប់ចូលគណនី និងកំណត់ពាក្យសម្ងាត់ជូនលោកអ្នក (មានសុពលភាព ២៤ ម៉ោង)។',
                'type' => 'system',
                'link' => "/magic-login?token={$token}",
                'read' => false,
            ]);
        } catch (\Throwable $e) {}
    }

    return response()->json([
        'success' => true,
        'message' => "បានបង្កើត និងបញ្ជូនតំណភ្ជាប់ Reset Token ទៅកាន់ Telegram & Profile របស់ {$user->display_name} ជោគជ័យ!",
        'magic_link' => $magicLink,
        'telegram_alert' => $tgRes,
    ]);
})->middleware([AdminMiddleware::class, 'throttle:10,1']);

// Real Telegram OAuth Signature Handshake & Automatic Account Login (Public)
Route::post('/auth/telegram/verify', function (Request $request) {
    $data = $request->validate([
        'id' => 'required',
        'first_name' => 'required|string|max:150',
        'last_name' => 'nullable|string|max:150',
        'username' => 'nullable|string|max:150',
        'photo_url' => 'nullable|string|max:500',
        'auth_date' => 'required',
        'hash' => 'required|string',
    ]);

    $botToken = env('TELEGRAM_AUTH_BOT_TOKEN') ?: env('TELEGRAM_BOT_TOKEN', '');
    if (empty($botToken)) {
        return response()->json([
            'success' => false,
            'error' => 'Telegram Bot Token is not configured on the server.',
        ], 500);
    }

    // 1. Verify Telegram Cryptographic Signature (HMAC-SHA256 Handshake)
    $checkHash = $data['hash'];
    $checkData = [
        'auth_date' => $data['auth_date'],
        'first_name' => $data['first_name'],
        'id' => $data['id'],
    ];
    if (!empty($data['last_name'])) $checkData['last_name'] = $data['last_name'];
    if (!empty($data['photo_url'])) $checkData['photo_url'] = $data['photo_url'];
    if (!empty($data['username'])) $checkData['username'] = $data['username'];

    ksort($checkData);
    $dataCheckArr = [];
    foreach ($checkData as $k => $v) {
        $dataCheckArr[] = "{$k}={$v}";
    }
    $dataCheckString = implode("\n", $dataCheckArr);

    $secretKey = hash('sha256', $botToken, true);
    $calculatedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

    if (strcmp($calculatedHash, $checkHash) !== 0) {
        return response()->json([
            'success' => false,
            'error' => 'ការផ្ទៀងផ្ទាត់ Telegram Hash Handshake មិនត្រឹមត្រូវ (Signature mismatch)។',
        ], 403);
    }

    // Expiration check (24 hours)
    if ((time() - (int)$data['auth_date']) > 86400) {
        return response()->json([
            'success' => false,
            'error' => 'ការផ្ទៀងផ្ទាត់បានផុតកំណត់សុពលភាព (Telegram Auth expired)។ សូមព្យាយាមម្តងទៀត។',
        ], 410);
    }

    // 2. Find or Create User Profile in Neon DB (Preserves existing account data just like Google Sign-In)
    $tgId = (string)$data['id'];
    $firebaseUid = 'tg_' . $tgId;
    $fullName = trim($data['first_name'] . ' ' . ($data['last_name'] ?? ''));
    $tgUsername = !empty($data['username']) ? '@' . ltrim($data['username'], '@') : null;
    $email = !empty($data['username'])
        ? ($data['username'] . '@telegram.s-tech-store.tech')
        : ("tg_{$tgId}@s-tech-store.tech");

    $user = \App\Models\UserProfile::where('telegram_chat_id', $tgId)
        ->orWhere('firebase_uid', $firebaseUid)
        ->first();

    if (!$user) {
        $user = new \App\Models\UserProfile();
        $user->firebase_uid = $firebaseUid;
        $user->email = $email;
    }

    $user->display_name = $user->display_name ?: ($fullName ?: "Telegram User #{$tgId}");
    if (empty($user->email)) {
        $user->email = $email;
    }
    $user->telegram_chat_id = $tgId;
    if (empty($user->telegram)) {
        $user->telegram = $tgUsername ?: ("ID: {$tgId}");
    }
    if (!empty($data['photo_url']) && empty($user->photo_url)) {
        $user->photo_url = $data['photo_url'];
        $user->avatar_url = $data['photo_url'];
    }
    $user->is_active = true;
    $user->status = 'active';
    $user->save();

    // 3. Issue Session Token
    $token = 'tg_sess_' . \Illuminate\Support\Str::random(60);
    \Illuminate\Support\Facades\Cache::put("customer_sess_{$token}", $user->id, 30 * 24 * 60 * 60);

    // 4. Send Customer Login Activity Notification (Topic: Users)
    \App\Services\TelegramService::sendCustomerLoginAlert([
        'method' => '👤 Telegram OAuth Login (ចូលតាមគេហទំព័រ)',
        'ip' => $request->ip() ?? '127.0.0.1',
        'device' => $request->header('User-Agent') ?? 'Telegram Client',
        'user' => "{$user->display_name} (" . ($user->telegram ?: "ID: {$tgId}") . ")",
        'action' => 'TELEGRAM_OAUTH_SUCCESS',
        'details' => "អតិថិជនបាន Login តាមរយៈ Real Telegram OAuth Handshake ជោគជ័យ។ ឈ្មោះពិត: {$user->display_name}, Username: {$user->telegram}, Telegram ID: {$tgId}។",
    ]);

    // 5. Send Welcome & Companion Hub activation to customer Telegram (Bot 2)
    try {
        \App\Services\TelegramService::sendCustomerDirectWelcomeHub($user, $tgId);
    } catch (\Throwable $t) {}

    return response()->json([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user->id,
            'uid' => $user->firebase_uid,
            'name' => $user->display_name,
            'display_name' => $user->display_name,
            'email' => $user->email,
            'telegram' => $user->telegram,
            'telegram_id' => $tgId,
            'photo_url' => $user->photo_url,
            'avatar' => $user->photo_url,
            'provider' => 'telegram',
        ]
    ]);
});

// Telegram 1-Click App Handshake Login (Bypasses Bot Domain Invalid & Web Widget completely)
Route::post('/auth/telegram/handshake-init', function (Request $request) {
    $token = 'tgauth_' . strtolower(\Illuminate\Support\Str::random(24));
    $botUsername = env('TELEGRAM_AUTH_BOT_USERNAME', 'S_TECH_ASSISTANTBOT');

    $initPayload = [
        'status' => 'pending',
        'created_at' => time(),
        'ip' => $request->ip() ?? '127.0.0.1',
    ];

    \Illuminate\Support\Facades\Cache::put("tg_handshake_{$token}", $initPayload, 600); // 10 minutes
    try {
        \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
            ['key' => "tg_handshake_{$token}"],
            ['value' => json_encode($initPayload), 'updated_at' => now()]
        );
    } catch (\Throwable $t) {}

    return response()->json([
        'success' => true,
        'handshake_token' => $token,
        'bot_username' => $botUsername,
        'deep_link' => "https://t.me/{$botUsername}?start={$token}",
        'app_link' => "tg://resolve?domain={$botUsername}&start={$token}",
    ]);
});

Route::get('/auth/telegram/handshake-check', function (Request $request) {
    $token = trim((string)$request->query('token', ''));
    if (!$token) {
        return response()->json(['success' => false, 'error' => 'Token required'], 400);
    }

    $data = \Illuminate\Support\Facades\Cache::get("tg_handshake_{$token}");
    if (!$data) {
        try {
            $row = \Illuminate\Support\Facades\DB::table('system_settings')->where('key', "tg_handshake_{$token}")->first();
            if ($row && !empty($row->value)) {
                $data = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
            }
        } catch (\Throwable $t) {}
    }

    if (!$data || !is_array($data)) {
        return response()->json([
            'success' => false,
            'completed' => false,
            'status' => 'expired',
            'error' => 'Handshake session expired or invalid',
        ], 200);
    }

    $status = $data['status'] ?? 'pending';

    if ($status === 'completed' && !empty($data['user']) && !empty($data['token'])) {
        return response()->json([
            'success' => true,
            'completed' => true,
            'status' => 'completed',
            'token' => $data['token'],
            'user' => $data['user'],
        ]);
    }

    if ($status === 'conflict' || $status === 'rejected') {
        return response()->json([
            'success' => false,
            'completed' => false,
            'status' => 'conflict',
            'error' => $data['error'] ?? 'គណនី Telegram នេះត្រូវបានភ្ជាប់រួចហើយជាមួយគណនីផ្សេង!',
            'already_linked_name' => $data['already_linked_name'] ?? null,
            'already_linked_email' => $data['already_linked_email'] ?? null,
        ]);
    }

    return response()->json([
        'success' => true,
        'completed' => false,
        'status' => $status,
    ]);
});

// Customer Private Telegram Companion Bot Linking (For Gmail, Email, and all users)
Route::post('/user/telegram/link-init', function (Request $request) {
    $uid = $request->header('X-Firebase-UID') ?: $request->input('firebase_uid');
    $email = $request->header('X-Firebase-Email') ?: $request->input('email');
    $token = $request->header('X-Customer-Token') ?: $request->input('customer_token');

    $user = null;
    if ($uid) {
        $user = \App\Models\UserProfile::where('firebase_uid', $uid)->first();
    }
    if (!$user && $token) {
        $userId = \Illuminate\Support\Facades\Cache::get("customer_sess_{$token}");
        if ($userId) $user = \App\Models\UserProfile::find($userId);
    }
    if (!$user && $email) {
        $user = \App\Models\UserProfile::where('email', $email)->first();
    }

    if (!$user) {
        $user = \App\Models\UserProfile::firstOrCreate(
            ['firebase_uid' => $uid ?: ('usr_' . \Illuminate\Support\Str::random(16))],
            [
                'display_name' => $request->header('X-Firebase-Name') ?: $request->input('name', 'Valued Customer'),
                'email' => $email ?: 'user@s-tech-store.tech',
                'is_active' => true,
                'status' => 'active',
            ]
        );
    }

    $linkToken = 'tglink_' . strtolower(\Illuminate\Support\Str::random(24));
    $linkPayload = [
        'user_id' => $user->id,
        'firebase_uid' => $user->firebase_uid,
        'status' => 'pending',
        'created_at' => time(),
    ];

    \Illuminate\Support\Facades\Cache::put("tg_link_{$linkToken}", $linkPayload, 600); // 10 minutes
    try {
        \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
            ['key' => "tg_link_{$linkToken}"],
            ['value' => json_encode($linkPayload), 'updated_at' => now()]
        );
    } catch (\Throwable $t) {}

    $botUsername = \App\Services\TelegramService::getCustomerBotUsername();
    $deepLink = "https://t.me/{$botUsername}?start={$linkToken}";
    $appLink = "tg://resolve?domain={$botUsername}&start={$linkToken}";

    return response()->json([
        'success' => true,
        'link_token' => $linkToken,
        'bot_username' => $botUsername,
        'deep_link' => $deepLink,
        'app_link' => $appLink,
    ]);
});

Route::get('/user/telegram/link-check', function (Request $request) {
    $token = strtolower(trim((string)$request->query('token', '')));
    if (!$token) {
        return response()->json(['success' => false, 'error' => 'Token required'], 400);
    }

    $data = \Illuminate\Support\Facades\Cache::get("tg_link_{$token}");
    if (!$data) {
        try {
            $row = \Illuminate\Support\Facades\DB::table('system_settings')->where('key', "tg_link_{$token}")->first();
            if ($row && !empty($row->value)) {
                $data = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
            }
        } catch (\Throwable $t) {}
    }

    if (!$data || !is_array($data)) {
        return response()->json(['success' => false, 'error' => 'Link session expired or invalid'], 404);
    }

    $status = $data['status'] ?? 'pending';

    if ($status === 'completed') {
        return response()->json([
            'success' => true,
            'completed' => true,
            'status' => 'completed',
            'telegram' => $data['telegram_username'] ?? null,
            'telegram_id' => $data['telegram_id'] ?? null,
            'display_name' => $data['display_name'] ?? null,
            'photo_url' => $data['photo_url'] ?? null,
        ]);
    }

    if ($status === 'conflict' || $status === 'rejected') {
        return response()->json([
            'success' => false,
            'completed' => false,
            'status' => 'conflict',
            'error' => $data['error'] ?? 'គណនី Telegram នេះត្រូវបានភ្ជាប់រួចហើយជាមួយគណនីផ្សេង!',
            'already_linked_name' => $data['already_linked_name'] ?? null,
            'already_linked_email' => $data['already_linked_email'] ?? null,
        ]);
    }

    return response()->json([
        'success' => true,
        'completed' => false,
        'status' => 'pending',
    ]);
});

Route::post('/user/telegram/unlink', function (Request $request) {
    $uid = $request->header('X-Firebase-UID') ?: $request->input('firebase_uid') ?: $request->input('uid');
    $email = $request->header('X-Firebase-Email') ?: $request->input('email');
    $token = $request->header('X-Customer-Token') ?: $request->input('customer_token') ?: $request->cookie('customer_token') ?: $request->bearerToken();
    $chatId = $request->input('telegram_chat_id') ?: $request->input('chat_id');
    $telegram = $request->input('telegram');

    $user = null;
    if ($uid) {
        $user = \App\Models\UserProfile::where('firebase_uid', $uid)
            ->orWhere('id', is_numeric($uid) ? (int)$uid : 0)
            ->first();
    }
    if (!$user && $token) {
        $userId = \Illuminate\Support\Facades\Cache::get("customer_sess_{$token}");
        if ($userId) $user = \App\Models\UserProfile::find($userId);
        if (!$user) $user = \App\Models\UserProfile::where('magic_login_token', $token)->first();
    }
    if (!$user && $chatId) {
        $user = \App\Models\UserProfile::where('telegram_chat_id', (string)$chatId)
            ->orWhere('firebase_uid', 'tg_' . $chatId)
            ->first();
    }
    if (!$user && $email) {
        $user = \App\Models\UserProfile::where('email', $email)->first();
    }
    if (!$user && $telegram) {
        $cleanTg = ltrim(trim($telegram), '@');
        $user = \App\Models\UserProfile::where('telegram', '@' . $cleanTg)
            ->orWhere('telegram', $cleanTg)
            ->first();
    }

    if ($user) {
        $oldChatId = $user->telegram_chat_id ?: $chatId;
        if (empty($oldChatId) && !empty($user->firebase_uid) && str_starts_with($user->firebase_uid, 'tg_')) {
            $oldChatId = substr($user->firebase_uid, 3);
        }
        if (empty($oldChatId)) {
            $oldChatId = \App\Services\TelegramService::resolveCustomerChatId($user);
        }

        $user->telegram = null;
        $user->telegram_chat_id = null;
        $user->notif_telegram = false;

        $oldUid = $user->firebase_uid;
        if (str_starts_with((string)$user->firebase_uid, 'tg_')) {
            $user->firebase_uid = 'stech_u_' . $user->id . '_' . \Illuminate\Support\Str::random(10);
        }
        $user->save();

        // Clear cache mappings for this chat ID
        if (!empty($oldChatId)) {
            \Illuminate\Support\Facades\Cache::forget("tg_u_prof_{$oldChatId}");
            \Illuminate\Support\Facades\Cache::forget("tg_link_{$oldChatId}");
            \Illuminate\Support\Facades\Cache::forget("customer_sess_{$oldChatId}");
        }
        if (!empty($oldUid)) {
            \Illuminate\Support\Facades\Cache::forget("tg_u_prof_{$oldUid}");
        }

        // Send final confirmation alert to customer's private Telegram chat via Customer Bot (@S_TECH_ASSISTANTBOT)
        if (!empty($oldChatId)) {
            try {
                $botToken = \App\Services\TelegramService::getCustomerBotToken();
                $custName = htmlspecialchars($user->display_name ?: 'អតិថិជន');
                $alertText = "ℹ️ <b>[S TECH STORE] គណនី Telegram របស់អ្នកត្រូវបានផ្តាច់ជោគជ័យ!</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "ជម្រាបសួរ <b>{$custName}</b>!\n\n"
                    . "គណនី Telegram នេះត្រូវបានផ្តាច់ចេញពីគេហទំព័រ S Tech Store ដោយជោគជ័យ ១០០%។\n\n"
                    . "🔒 <b>ព័ត៌មានសុវត្ថិភាព៖</b>\n"
                    . "• Bot នឹងលែងផ្ញើវិក្កយបត្រ (E-Receipts) ឬដំណឹងបញ្ជាទិញចូល Telegram នេះទៀតហើយ\n"
                    . "• គណនី Telegram នេះឥឡូវនេះនៅទំនេរ និងអាចយកទៅភ្ជាប់ជាមួយគណនី Website ផ្សេងបានគ្រប់ពេល\n\n"
                    . "👉 <i>ប្រសិនបើលោកអ្នកចង់ភ្ជាប់ឡើងវិញ សូមចូលទៅកាន់ទំព័រ Profile Setting លើ Website ឬ Mini App ហើយចុច \"ភ្ជាប់ Official Bot\"។</i>";

                $kb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ បើកមើលហាងទំនិញ (Store)', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                        [['text' => '🌐 ចូលគេហទំព័រផ្លូវការ', 'url' => 'https://www.s-tech-store.tech/account/profile']],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ]
                ];
                \App\Services\TelegramService::sendMessageWithKeyboard($oldChatId, $alertText, $kb, 'HTML', null, $botToken);
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning("Telegram unlink alert warning: " . $t->getMessage());
            }
        }

        try {
            \App\Models\UserNotification::create([
                'firebase_uid' => $user->firebase_uid,
                'title' => 'ផ្តាច់ Telegram ជោគជ័យ 🔓',
                'message' => 'គណនី Telegram ត្រូវបានផ្តាច់ចេញពីគណនី S Tech Store របស់អ្នកដោយជោគជ័យ។',
                'type' => 'security',
                'read' => false,
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'message' => 'គណនី Telegram ត្រូវបានផ្តាច់ចេញពីគណនីរបស់អ្នកដោយជោគជ័យ ១០០%!',
            'new_firebase_uid' => $user->firebase_uid,
            'user' => [
                'id' => $user->id,
                'firebase_uid' => $user->firebase_uid,
                'display_name' => $user->display_name,
                'email' => $user->email,
                'telegram' => null,
                'telegram_chat_id' => null,
                'has_telegram' => false,
                'provider' => 'email',
            ],
        ]);
    }

    return response()->json(['success' => false, 'error' => 'User not found'], 404);
});

// Instant 1-Click Telegram Token Login (from Bot Web links & Mini App)
Route::get('/auth/telegram/token-login', function (Request $request) {
    $token = trim((string)$request->query('token', ''));
    if (!$token) {
        return response()->json(['success' => false, 'error' => 'Token required'], 400);
    }

    $userId = \Illuminate\Support\Facades\Cache::get("customer_sess_{$token}");
    if (!$userId) {
        return response()->json(['success' => false, 'error' => 'Token expired or invalid'], 401);
    }

    $user = \App\Models\UserProfile::find($userId);
    if (!$user) {
        return response()->json(['success' => false, 'error' => 'User not found'], 404);
    }

    if (!($user->is_active ?? true)) {
        return response()->json([
            'success' => false,
            'error' => 'គណនីនេះត្រូវបានផ្អាកដំណើរការបណ្ដោះអាសន្ន។ សូមទាក់ទងមកកាន់ក្រុមការងារ Admin តាមរយៈ Telegram ឬទូរស័ព្ទដើម្បីបើកដំណើរការឡើងវិញ។'
        ], 403);
    }

    return response()->json([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user->id,
            'uid' => $user->firebase_uid,
            'firebase_uid' => $user->firebase_uid,
            'name' => $user->display_name,
            'display_name' => $user->display_name,
            'email' => $user->email,
            'telegram' => $user->telegram,
            'telegram_chat_id' => $user->telegram_chat_id,
            'telegram_id' => $user->telegram_chat_id,
            'phone' => $user->phone,
            'photo_url' => $user->photo_url,
            'avatar' => $user->photo_url,
            'provider' => 'telegram',
        ],
    ]);
});

// Telegram Mini App Instant Sync & Auto-Login
Route::post('/auth/telegram/miniapp-sync', function (Request $request) {
    $tgUser = $request->input('telegram_user') ?? [];
    $tgId = (string)($tgUser['id'] ?? '');
    if (!$tgId) {
        return response()->json(['success' => false, 'error' => 'Invalid telegram user data'], 400);
    }

    $fullName = trim(($tgUser['first_name'] ?? '') . ' ' . ($tgUser['last_name'] ?? '')) ?: 'Telegram Customer';
    $tgUsername = !empty($tgUser['username']) ? '@' . ltrim($tgUser['username'], '@') : null;
    $email = !empty($tgUser['username'])
        ? ($tgUser['username'] . '@telegram.s-tech-store.tech')
        : ("tg_{$tgId}@s-tech-store.tech");

    $user = \App\Models\UserProfile::where('telegram_chat_id', (string)$tgId)
        ->orWhere('firebase_uid', 'tg_' . $tgId)
        ->first();

    if ($user && !($user->is_active ?? true)) {
        return response()->json([
            'success' => false,
            'error' => 'គណនីនេះត្រូវបានផ្អាកដំណើរការបណ្ដោះអាសន្ន។ សូមទាក់ទងមកកាន់ក្រុមការងារ Admin តាមរយៈ Telegram ឬទូរស័ព្ទដើម្បីបើកដំណើរការឡើងវិញ។'
        ], 403);
    }

    if (!$user) {
        $user = new \App\Models\UserProfile();
        $user->firebase_uid = 'tg_' . $tgId;
        $user->email = $email;
        $user->is_active = true;
        $user->status = 'active';
    }

    $user->telegram_chat_id = (string)$tgId;
    $user->display_name = $user->display_name ?: $fullName;
    if (empty($user->email)) $user->email = $email;
    if (empty($user->telegram)) $user->telegram = $tgUsername ?: ("ID: {$tgId}");
    if (!empty($tgUser['photo_url'])) {
        $user->photo_url = $tgUser['photo_url'];
        $user->avatar_url = $tgUser['photo_url'];
    } else {
        $realPhoto = \App\Services\TelegramService::getUserAvatarUrl($tgId);
        if ($realPhoto) {
            $user->photo_url = $realPhoto;
            $user->avatar_url = $realPhoto;
        }
    }
    if (!empty($tgUser['phone_number'])) {
        $user->phone = $tgUser['phone_number'];
    } elseif ($request->filled('phone')) {
        $user->phone = trim($request->input('phone'));
    }

    $token = 'tg_sess_' . \Illuminate\Support\Str::random(60);
    \Illuminate\Support\Facades\Cache::put("customer_sess_{$token}", $user->id, 30 * 24 * 60 * 60);

    // Send Welcome & Companion Hub activation once
    if (!\Illuminate\Support\Facades\Cache::has("welcomed_tg_{$tgId}")) {
        \Illuminate\Support\Facades\Cache::put("welcomed_tg_{$tgId}", true, 86400 * 30);
        try {
            \App\Services\TelegramService::sendCustomerDirectWelcomeHub($user, $tgId);
        } catch (\Throwable $t) {}
    }

    return response()->json([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user->id,
            'uid' => $user->firebase_uid,
            'name' => $user->display_name,
            'display_name' => $user->display_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'telegram' => $user->telegram,
            'telegram_id' => $tgId,
            'photo_url' => $user->photo_url,
            'avatar' => $user->photo_url,
            'provider' => 'telegram',
        ],
    ]);
});

// Telegram Mini App Phone Sync (Real phone attachment)
Route::post('/auth/telegram/sync-phone', function (Request $request) {
    $phone = trim((string)$request->input('phone'));
    if (!$phone) {
        return response()->json(['success' => false, 'error' => 'Phone number is required'], 400);
    }

    $uid = $request->header('X-Firebase-UID');
    $token = $request->header('X-Customer-Token');
    $tgId = $request->input('telegram_id');

    $user = null;
    if ($uid) {
        $user = \App\Models\UserProfile::where('firebase_uid', $uid)->first();
    }
    if (!$user && $tgId) {
        $user = \App\Models\UserProfile::where('firebase_uid', 'tg_' . $tgId)
            ->orWhere('telegram_chat_id', (string)$tgId)
            ->first();
    }
    if (!$user && $token) {
        $userId = \Illuminate\Support\Facades\Cache::get("customer_sess_{$token}");
        if ($userId) {
            $user = \App\Models\UserProfile::find($userId);
        }
    }

    if ($user) {
        $user->phone = $phone;
        $user->save();
        return response()->json(['success' => true, 'phone' => $phone]);
    }

    return response()->json(['success' => false, 'error' => 'User not found'], 404);
});

// Official TikTok OAuth Redirect & Callback (100% Free - TikTok Login Kit)
Route::get('/auth/tiktok/redirect', function (Request $request) {
    $clientKey = env('TIKTOK_CLIENT_KEY') ?: 'aw19o3ok60albxxy';
    $clientSecret = env('TIKTOK_CLIENT_SECRET') ?: 'LMEnC3OjLmX5Giz2b2vgT0Qmq6kbpJ7V';

    $origin = $request->query('origin') ?: $request->headers->get('referer') ?: 'https://www.s-tech-store.tech';
    $returnTo = $request->query('return_to') ?: (rtrim($origin, '/') . '/login');
    $redirectUri = $request->query('redirect_uri') ?: env('TIKTOK_REDIRECT_URI', 'https://www.s-tech-store.tech/api/auth/tiktok/callback');

    // Generate PKCE code_verifier and code_challenge (Required by TikTok Login Kit v2)
    $verifierBytes = random_bytes(48);
    $codeVerifier = rtrim(strtr(base64_encode($verifierBytes), '+/', '-_'), '=');
    $codeChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');

    $state = \Illuminate\Support\Str::random(32);
    \Illuminate\Support\Facades\Cache::put("tiktok_oauth_{$state}", [
        'verifier' => $codeVerifier,
        'redirect_uri' => $redirectUri,
        'return_to' => $returnTo,
    ], 600);

    $encodedRedirectUri = urlencode($redirectUri);
    $authUrl = "https://www.tiktok.com/v2/auth/authorize/?client_key={$clientKey}&scope=user.info.basic&response_type=code&redirect_uri={$encodedRedirectUri}&state={$state}&code_challenge={$codeChallenge}&code_challenge_method=S256";

    if ($request->wantsJson() || $request->query('format') === 'json') {
        return response()->json([
            'success' => true,
            'url' => $authUrl,
            'client_key' => $clientKey,
        ]);
    }

    return redirect()->away($authUrl);
});

// Generic Customer Session Token Login (TikTok & Telegram)
Route::get('/auth/session/token-login', function (Request $request) {
    $token = trim((string)$request->query('token', ''));
    if (!$token) {
        return response()->json(['success' => false, 'error' => 'Token required'], 400);
    }

    $userId = \Illuminate\Support\Facades\Cache::get("customer_sess_{$token}");
    $user = null;
    if ($userId) {
        $user = \App\Models\UserProfile::find($userId);
    }
    // Database fallback in case cache restarted or expired
    if (!$user) {
        $user = \App\Models\UserProfile::where('magic_login_token', $token)->first();
    }

    if (!$user) {
        return response()->json(['success' => false, 'error' => 'User not found or token expired'], 404);
    }

    if (!($user->is_active ?? true) || ($user->status ?? '') === 'suspended') {
        return response()->json(['success' => false, 'error' => 'គណនីនេះត្រូវបានផ្អាកដំណើរការបណ្ដោះអាសន្ន។ សូមទាក់ទងមកកាន់ក្រុមការងារ Admin តាមរយៈ Telegram ឬទូរស័ព្ទដើម្បីបើកដំណើរការឡើងវិញ។'], 403);
    }

    return response()->json([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user->id,
            'uid' => $user->firebase_uid,
            'name' => $user->display_name,
            'display_name' => $user->display_name,
            'email' => $user->email,
            'avatar_url' => $user->photo_url ?? $user->avatar_url,
            'photo_url' => $user->photo_url ?? $user->avatar_url,
            'phone' => $user->phone,
            'status' => $user->status,
            'provider' => str_starts_with($token, 'tt_') ? 'tiktok' : 'telegram',
        ]
    ]);
});

Route::get('/auth/tiktok/callback', function (Request $request) {
    $code = $request->query('code', '');
    $state = $request->query('state', '');
    $error = $request->query('error', '');
    $errorDesc = $request->query('error_description', '');

    $clientKey = env('TIKTOK_CLIENT_KEY') ?: 'aw19o3ok60albxxy';
    $clientSecret = env('TIKTOK_CLIENT_SECRET') ?: 'LMEnC3OjLmX5Giz2b2vgT0Qmq6kbpJ7V';

    $oauthData = \Illuminate\Support\Facades\Cache::get("tiktok_oauth_{$state}");
    $codeVerifier = is_array($oauthData) ? ($oauthData['verifier'] ?? '') : '';
    $redirectUri = is_array($oauthData) ? ($oauthData['redirect_uri'] ?? null) : null;
    $returnTo = is_array($oauthData) ? ($oauthData['return_to'] ?? 'https://www.s-tech-store.tech/login') : 'https://www.s-tech-store.tech/login';

    if (!$redirectUri) {
        $redirectUri = env('TIKTOK_REDIRECT_URI', 'https://www.s-tech-store.tech/api/auth/tiktok/callback');
    }

    $separator = str_contains($returnTo, '?') ? '&' : '?';

    if (!empty($error) || empty($code)) {
        \Illuminate\Support\Facades\Log::warning("TikTok OAuth Cancelled or Denied: error={$error}, desc={$errorDesc}");
        return redirect("{$returnTo}{$separator}error=tiktok_cancelled&error_msg=" . urlencode($errorDesc ?: $error ?: 'User cancelled'));
    }

    try {
        $tokenParams = [
            'client_key' => $clientKey,
            'client_secret' => $clientSecret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirectUri,
        ];
        if (!empty($codeVerifier)) {
            $tokenParams['code_verifier'] = $codeVerifier;
        }

        $resp = \Illuminate\Support\Facades\Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', $tokenParams);
        $tokenData = $resp->json();

        \Illuminate\Support\Facades\Log::info("TikTok Token Response: " . json_encode($tokenData));

        $accessToken = $tokenData['data']['access_token'] ?? $tokenData['access_token'] ?? null;
        $openId = $tokenData['data']['open_id'] ?? $tokenData['open_id'] ?? null;

        if (!$accessToken || !$openId) {
            $errMsg = $tokenData['error']['message'] ?? $tokenData['error_description'] ?? $tokenData['message'] ?? 'Token exchange failed';
            \Illuminate\Support\Facades\Log::error("TikTok OAuth Token Failed: " . json_encode($tokenData));
            return redirect("{$returnTo}{$separator}error=tiktok_token_failed&error_msg=" . urlencode($errMsg));
        }

        // Fetch User Info from TikTok Login Kit v2
        $userResp = \Illuminate\Support\Facades\Http::withHeaders([
            'Authorization' => "Bearer {$accessToken}",
        ])->get('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name');

        $userBody = $userResp->json();
        $userData = $userBody['data']['user'] ?? $userBody['user'] ?? [];
        $displayName = !empty($userData['display_name']) ? trim($userData['display_name']) : ('TikTok User #' . substr($openId, 0, 6));
        $avatarUrl = $userData['avatar_large_url'] ?? $userData['avatar_url'] ?? $userData['avatar_url_100'] ?? '';

        $firebaseUid = 'tt_' . $openId;
        $user = \App\Models\UserProfile::firstOrNew(['firebase_uid' => $firebaseUid]);
        $isNewUser = !$user->exists;

        $user->display_name = $displayName;
        if (empty($user->email)) {
            $user->email = "tiktok_{$openId}@s-tech-store.tech";
        }
        if (!empty($avatarUrl)) {
            $user->photo_url = $avatarUrl;
            $user->avatar_url = $avatarUrl;
        }
        $user->is_active = true;
        $user->status = 'active';

        $token = 'tt_sess_' . \Illuminate\Support\Str::random(60);
        $user->magic_login_token = $token;
        $user->save();

        \Illuminate\Support\Facades\Cache::put("customer_sess_{$token}", $user->id, 30 * 24 * 60 * 60);

        if ($isNewUser) {
            try {
                \App\Services\TelegramService::sendNewUserRegistrationNotification([
                    'id' => $user->id,
                    'name' => $displayName,
                    'email' => $user->email,
                    'phone' => 'TikTok Account',
                    'role' => 'tiktok_customer',
                ]);
            } catch (\Throwable $t) {}

            try {
                \App\Models\UserNotification::create([
                    'firebase_uid' => $firebaseUid,
                    'title' => 'Welcome via TikTok! 🎵🎉',
                    'message' => "ស្វាគមន៍មកកាន់ S Tech Store! គណនី TikTok របស់អ្នក ({$displayName}) ត្រូវបានតភ្ជាប់ដោយជោគជ័យ។",
                    'type' => 'welcome',
                    'is_read' => false,
                ]);
            } catch (\Throwable $t) {}
        }

        return redirect("{$returnTo}{$separator}tiktok_token={$token}&name=" . urlencode($displayName));
    } catch (\Throwable $e) {
        \Illuminate\Support\Facades\Log::error('TikTok OAuth Callback Error: ' . $e->getMessage());
        return redirect("{$returnTo}{$separator}error=tiktok_exception&error_msg=" . urlencode($e->getMessage()));
    }
});

// Customer Direct Magic Login & Password Reset (Public)
Route::post('/auth/magic-login', [UserController::class, 'magicLogin']);

// Real-time Traffic & Registration Tracking to Telegram (Public)
Route::post('/analytics/track-visit', function (Request $request) {
    // 1. Detect Real IP Address
    $rawIp = $request->header('cf-connecting-ip')
        ?? $request->header('x-real-ip')
        ?? $request->header('x-forwarded-for')
        ?? $request->ip()
        ?? '127.0.0.1';

    $ip = trim(explode(',', $rawIp)[0]);

    // 2. Extract Location & Device Info
    $city = $request->input('city') 
        ?? $request->header('cf-ipcity') 
        ?? $request->header('x-vercel-ip-city') 
        ?? '';

    $country = $request->input('country') 
        ?? $request->header('cf-ipcountry') 
        ?? 'Cambodia 🇰🇭';

    $data = [
        'ip' => $ip,
        'page' => $request->input('page', 'Home Page 🏠'),
        'referrer' => $request->input('referrer', 'Direct Visit'),
        'device' => $request->input('device', 'Web Browser'),
        'device_id' => $request->input('device_id', ''),
        'country' => $country,
        'city' => $city,
        'isp' => $request->input('isp', ''),
        'screen' => $request->input('screen', ''),
    ];

    $sent = \App\Services\TelegramService::sendWebsiteTrafficAlert($data);

    $today = date('Y-m-d');
    $hitsToday = (int)\Illuminate\Support\Facades\Cache::get('site_daily_pageviews_' . $today, 1);
    $uniqueCount = count(\Illuminate\Support\Facades\Cache::get('site_daily_unique_ips_' . $today, []));
    if ($hitsToday < $uniqueCount) $hitsToday = $uniqueCount;
    if ($hitsToday < 1) $hitsToday = 1;

    return response()->json([
        'success' => true,
        'notified' => $sent,
        'hits_today' => $hitsToday,
        'unique_today' => $uniqueCount,
        'real_ip' => $ip,
    ]);
});

Route::get('/analytics/today', function () {
    $today = date('Y-m-d');
    $hitsToday = (int)\Illuminate\Support\Facades\Cache::get('site_daily_pageviews_' . $today, 1);
    $uniqueCount = count(\Illuminate\Support\Facades\Cache::get('site_daily_unique_ips_' . $today, []));
    if ($hitsToday < $uniqueCount) $hitsToday = $uniqueCount;
    if ($hitsToday < 1) $hitsToday = 1;

    return response()->json([
        'date' => $today,
        'hits_today' => $hitsToday,
        'unique_today' => $uniqueCount,
    ]);
});

Route::post('/analytics/track-register', function (Request $request) {
    $data = $request->validate([
        'id' => 'nullable',
        'name' => 'nullable|string|max:150',
        'email' => 'nullable|string|max:150',
        'phone' => 'nullable|string|max:50',
        'role' => 'nullable|string|max:50',
    ]);
    $sent = \App\Services\TelegramService::sendNewUserRegistrationNotification($data);
    return response()->json(['success' => true, 'notified' => $sent]);
});

// Security & Anti-Abuse Alerts (Frontend Rate Limiter / DDoS Sentinel)
Route::post('/security/alert', function (Request $request) {
    $data = $request->validate([
        'type' => 'required|string|max:150',
        'ip' => 'nullable|string|max:60',
        'device' => 'nullable|string|max:255',
        'user' => 'nullable|string|max:150',
        'action' => 'nullable|string|max:150',
        'details' => 'nullable|string|max:1000',
    ]);
    $sent = \App\Services\TelegramService::sendSecurityAlert($data);
    return response()->json(['success' => true, 'notified' => $sent]);
});

// Device Registration Rate Limiter Rule: Max 5 accounts per device/IP per day
Route::post('/auth/check-register-limit', function (Request $request) {
    $ip = $request->ip() ?? '127.0.0.1';
    $deviceId = $request->header('X-Device-Id') ?? md5($ip . ($request->userAgent() ?? ''));
    $today = date('Y-m-d');
    $cacheKey = "reg_limit_{$deviceId}_{$today}";
    $currentCount = (int)\Illuminate\Support\Facades\Cache::get($cacheKey, 0);

    if ($currentCount >= 5) {
        \App\Services\TelegramService::sendSecurityAlert([
            'type' => 'Spam Register Blocked (Max 5 accs/day reached)',
            'ip' => $ip,
            'device' => $request->userAgent() ?? 'Unknown Device',
            'user' => 'Visitor registering beyond daily quota',
            'action' => 'Registration Blocked (429)',
            'details' => "ឧបករណ៍នេះបានចុះឈ្មោះគណនីលើស ៥ ក្នុងថ្ងៃតែមួយ ({$currentCount}/5 accounts created today).",
        ]);

        return response()->json([
            'allowed' => false,
            'error' => 'ឧបករណ៍ ឬបណ្តាញរបស់អ្នកបានចុះឈ្មោះលើសកំណត់ ៥ គណនីក្នុងមួយថ្ងៃហើយ (Device limit: max 5 accounts/day)! សូមសាកល្បងម្ដងទៀតនៅថ្ងៃស្អែក។',
        ], 429);
    }

    if ($request->input('confirm_register') === true) {
        \Illuminate\Support\Facades\Cache::put($cacheKey, $currentCount + 1, 86400);
    }

    return response()->json([
        'allowed' => true,
        'registered_today' => $currentCount,
        'remaining' => 5 - $currentCount,
    ]);
});

// Real-time Active Promotion Popup & Banner (Public)
Route::get('/promotions/active-popup', [\App\Http\Controllers\PromoCodeController::class, 'activePopup']);
Route::get('/promotions/hero-banners', [\App\Http\Controllers\PromoCodeController::class, 'heroBanners']);
Route::post('/promo-codes/validate', [\App\Http\Controllers\PromoCodeController::class, 'validatePromo'])->middleware('throttle:20,1');

// Real Payment Gateways (Bakong KHQR, ABA PayWay, Deeplinks, Visa/Mastercard)
Route::post('/payment/session', [\App\Http\Controllers\PaymentController::class, 'createSession'])->middleware('throttle:15,1');
Route::post('/payment/card', [\App\Http\Controllers\PaymentController::class, 'processCard'])->middleware('throttle:10,1');
Route::get('/payment/check/{orderId}', [\App\Http\Controllers\PaymentController::class, 'checkStatus'])->middleware('throttle:60,1');
Route::post('/payment/confirm-manual/{orderId}', [\App\Http\Controllers\PaymentController::class, 'confirmManual'])->middleware('throttle:10,1');
Route::post('/payment/webhook', [\App\Http\Controllers\PaymentController::class, 'webhook'])->middleware('throttle:60,1');

// Admin & Staff Authentication (Login Form Only — Strictly No Public Registration)
Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:5,1');

// Firebase-authenticated Routes (uses X-Firebase-UID header)
// The UserController handles its own auth via getUid() method

// Profile
Route::get('/user/public/{identifier}', [UserController::class, 'getPublicProfile']);
Route::get('/user/profile', [UserController::class, 'getProfile']);
Route::put('/user/profile', [UserController::class, 'updateProfile']);
Route::post('/user/profile/avatar', [UserController::class, 'uploadAvatar']);
Route::post('/user/claim-welcome-gift', [UserController::class, 'claimWelcomeGift']);
Route::post('/user/send-welcome-email', [UserController::class, 'sendWelcomeEmail']);
Route::post('/user/send-reset-email', [UserController::class, 'sendResetEmail'])->middleware('throttle:5,1');
Route::post('/user/request-2fa-otp', [UserController::class, 'requestTwoFactorOtp'])->middleware('throttle:5,1');
Route::post('/user/verify-2fa-otp', [UserController::class, 'verifyTwoFactorOtp'])->middleware('throttle:10,1');

// Real S-Tech Wallet & Coin Rewards System (Guarded by Atomic Throttle)
Route::get('/user/wallet', [\App\Http\Controllers\WalletController::class, 'getWallet'])->middleware('throttle:60,1');
Route::post('/user/wallet/daily-checkin', [\App\Http\Controllers\WalletController::class, 'dailyCheckin'])->middleware('throttle:10,1');
Route::post('/user/wallet/activity-reward', [\App\Http\Controllers\WalletController::class, 'claimActivityReward'])->middleware('throttle:15,1');
Route::post('/user/wallet/topup/session', [\App\Http\Controllers\WalletController::class, 'createTopupSession'])->middleware('throttle:10,1');
Route::get('/user/wallet/topup/status/{depositId}', [\App\Http\Controllers\WalletController::class, 'checkTopupStatus'])->middleware('throttle:60,1');
Route::post('/user/wallet/topup/confirm', [\App\Http\Controllers\WalletController::class, 'confirmTopup'])->middleware('throttle:10,1');
Route::post('/user/wallet/topup/card', [\App\Http\Controllers\WalletController::class, 'processCardTopup'])->middleware('throttle:10,1');
Route::post('/user/wallet/redeem-coins', [\App\Http\Controllers\WalletController::class, 'convertCoins'])->middleware('throttle:10,1');
Route::post('/user/wallet/pay-order', [\App\Http\Controllers\WalletController::class, 'payWithWallet'])->middleware('throttle:15,1');

// App Version & Real-Time Release Check
Route::get('/app-version', function () {
    $settings = \Illuminate\Support\Facades\DB::table('system_settings')->where('key', 'app_version')->first();
    $data = $settings && !empty($settings->value) ? (is_string($settings->value) ? json_decode($settings->value, true) : (array)$settings->value) : null;
    if (!$data) {
        $data = [
            'version' => '1.0.0',
            'build' => '20261013.01',
            'release_name' => 'S Tech Store Official Release v1.0.0',
            'release_date' => '2026-10-13',
            'min_supported_version' => '1.0.0',
            'changelog' => [
                'Official Release v1.0.0 with universal Bakong KHQR & ABA PAY',
                'Real-Time Coin Reward & Auto-Popup for product browsing',
                '$5.00 USD Welcome Gift directly credited to S-Tech Wallet',
                'World-Class Credit / Debit Card (Visa, Mastercard, JCB) checkout',
                'Enhanced Security with 2FA OTP confirmation via Telegram & Gmail'
            ],
            'force_update' => false,
        ];
    }
    return response()->json($data);
});

// Notifications
Route::get('/notifications', [UserController::class, 'getNotifications']);
Route::post('/notifications', [UserController::class, 'createNotification']);
Route::put('/notifications/read-all', [UserController::class, 'markAllNotificationsRead']);
Route::put('/notifications/{id}/read', [UserController::class, 'markNotificationRead']);
Route::delete('/notifications', [UserController::class, 'clearNotifications']);

Route::get('/user/notifications', [UserController::class, 'getNotifications']);
Route::post('/user/notifications', [UserController::class, 'createNotification']);
Route::put('/user/notifications/read-all', [UserController::class, 'markAllNotificationsRead']);
Route::put('/user/notifications/{id}/read', [UserController::class, 'markNotificationRead']);
Route::delete('/user/notifications', [UserController::class, 'clearNotifications']);

// Wishlist
Route::get('/wishlist', [UserController::class, 'getWishlist']);
Route::post('/wishlist', [UserController::class, 'addToWishlist']);
Route::delete('/wishlist/{productId}', [UserController::class, 'removeFromWishlist']);

Route::get('/user/wishlist', [UserController::class, 'getWishlist']);
Route::post('/user/wishlist', [UserController::class, 'addToWishlist']);
Route::delete('/user/wishlist/{productId}', [UserController::class, 'removeFromWishlist']);

// Cart
Route::get('/cart', [UserController::class, 'getCart']);
Route::post('/cart', [UserController::class, 'addToCart']);
Route::put('/cart/{productId}', [UserController::class, 'updateCartItem']);
Route::delete('/cart/{productId}', [UserController::class, 'removeFromCart']);
Route::delete('/cart', [UserController::class, 'clearCart']);

Route::get('/user/cart', [UserController::class, 'getCart']);
Route::post('/user/cart', [UserController::class, 'addToCart']);
Route::put('/user/cart/{productId}', [UserController::class, 'updateCartItem']);
Route::delete('/user/cart/{productId}', [UserController::class, 'removeFromCart']);
Route::delete('/user/cart', [UserController::class, 'clearCart']);

// User Orders
Route::get('/user/orders', [UserController::class, 'getUserOrders']);
Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:30,1');

// PC Builds
Route::get('/user/pc-builds', [\App\Http\Controllers\PcBuildController::class, 'index']);
Route::post('/user/pc-builds', [\App\Http\Controllers\PcBuildController::class, 'store']);
Route::delete('/user/pc-builds/{id}', [\App\Http\Controllers\PcBuildController::class, 'destroy']);



// Admin & Staff Protected Routes (Guarded by AdminMiddleware)
Route::middleware(AdminMiddleware::class)->group(function () {
    // Current Admin / Staff Profile & Session
    Route::get('/admin/me', [AdminAuthController::class, 'me']);
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);

    // Dashboard Overview Statistics
    Route::get('/admin/stats', [\App\Http\Controllers\AdminController::class, 'stats']);

    // Inventory & Products Management
    Route::post('/products', [ProductController::class, 'store']);
    Route::match(['put', 'post'], '/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Order Fulfillment & Status Management
    Route::get('/admin/orders', [OrderController::class, 'index']);
    Route::match(['put', 'patch'], '/admin/orders/{id}', [OrderController::class, 'update']);
    Route::patch('/admin/orders/{id}/status', [OrderController::class, 'updateStatus']);
    Route::post('/admin/orders/{id}/notify', [OrderController::class, 'pushNotification']);
    Route::delete('/admin/orders/{id}', [OrderController::class, 'destroy']);

    // Staff & Account Management (Admin Role Only)
    Route::get('/admin/staff', [AdminAuthController::class, 'staffList']);
    Route::post('/admin/staff', [AdminAuthController::class, 'createStaff']);
    Route::put('/admin/staff/{id}', [AdminAuthController::class, 'updateStaff']);
    Route::delete('/admin/staff/{id}', [AdminAuthController::class, 'deleteStaff']);

    // Branch Management (សាខាហាង)
    Route::get('/admin/branches', [BranchController::class, 'index']);
    Route::post('/admin/branches', [BranchController::class, 'store']);
    Route::put('/admin/branches/{id}', [BranchController::class, 'update']);
    Route::delete('/admin/branches/{id}', [BranchController::class, 'destroy']);

    // Shift & Schedule Management (វេនធ្វើការ)
    Route::get('/admin/shifts', [ShiftController::class, 'index']);
    Route::post('/admin/shifts', [ShiftController::class, 'store']);
    Route::put('/admin/shifts/{id}', [ShiftController::class, 'update']);
    Route::delete('/admin/shifts/{id}', [ShiftController::class, 'destroy']);

    // Promotions & Promo Codes
    Route::get('/promo-codes', [\App\Http\Controllers\PromoCodeController::class, 'index']);
    Route::post('/promo-codes', [\App\Http\Controllers\PromoCodeController::class, 'store']);
    Route::post('/promo-codes/upload-image', [\App\Http\Controllers\PromoCodeController::class, 'uploadImage']);
    Route::put('/promo-codes/{id}', [\App\Http\Controllers\PromoCodeController::class, 'update']);
    Route::delete('/promo-codes/{id}', [\App\Http\Controllers\PromoCodeController::class, 'destroy']);

    // Repairs & Maintenance Management (សេវាជួសជុល)
    Route::get('/admin/repairs', [\App\Http\Controllers\RepairController::class, 'index']);
    Route::post('/admin/repairs', [\App\Http\Controllers\RepairController::class, 'store']);
    Route::put('/admin/repairs/{id}', [\App\Http\Controllers\RepairController::class, 'update']);
    Route::post('/admin/repairs/{id}/send-email', [\App\Http\Controllers\RepairController::class, 'sendEmail']);
    Route::delete('/admin/repairs/{id}', [\App\Http\Controllers\RepairController::class, 'destroy']);

    // Customer Users Management (គ្រប់គ្រងអតិថិជន)
    Route::get('/admin/users', [\App\Http\Controllers\UserController::class, 'index']);
    Route::post('/admin/users', [\App\Http\Controllers\UserController::class, 'store']);
    Route::put('/admin/users/{id}', [\App\Http\Controllers\UserController::class, 'update']);
    Route::patch('/admin/users/{id}/admin-status', [\App\Http\Controllers\UserController::class, 'updateAdminStatus']);
    Route::put('/admin/users/{id}/toggle-status', [\App\Http\Controllers\UserController::class, 'toggleStatus']);
    Route::post('/admin/users/{id}/reset-password', [\App\Http\Controllers\UserController::class, 'resetPassword']);
    Route::post('/admin/users/{id}/magic-link', [\App\Http\Controllers\UserController::class, 'generateMagicLink']);
    Route::post('/admin/users/{id}/send-magic-link-telegram', [\App\Http\Controllers\UserController::class, 'sendMagicLinkViaTelegram']);
    Route::post('/admin/users/{id}/adjust-points', [\App\Http\Controllers\UserController::class, 'adjustPoints']);
    Route::get('/admin/users/{id}/orders', [\App\Http\Controllers\UserController::class, 'getUserOrdersForAdmin']);
    Route::delete('/admin/users/{id}', [\App\Http\Controllers\UserController::class, 'destroy']);

    // Telegram Bot Integration (1-Click Group Pairing)
    Route::get('/admin/telegram/status', [\App\Http\Controllers\TelegramController::class, 'status']);
    Route::post('/admin/telegram/generate-link', [\App\Http\Controllers\TelegramController::class, 'generateLink']);
    Route::post('/admin/telegram/pair', [\App\Http\Controllers\TelegramController::class, 'pair']);
    Route::post('/admin/telegram/test', [\App\Http\Controllers\TelegramController::class, 'test']);
    Route::post('/admin/telegram/setup-topics', [\App\Http\Controllers\TelegramController::class, 'setupTopics']);
    Route::post('/admin/telegram/disconnect', [\App\Http\Controllers\TelegramController::class, 'disconnect']);
    Route::post('/admin/telegram/settings', [\App\Http\Controllers\TelegramController::class, 'updateSettings']);
    Route::post('/admin/telegram/broadcast', [\App\Http\Controllers\TelegramController::class, 'broadcast']);

    // System Settings & Real 2FA (Two-Factor Authentication)
    Route::get('/admin/settings', [\App\Http\Controllers\AdminSettingsController::class, 'getSettings']);
    Route::post('/admin/settings', [\App\Http\Controllers\AdminSettingsController::class, 'updateSettings']);
    Route::post('/admin/settings/change-password', [\App\Http\Controllers\AdminSettingsController::class, 'changePassword']);
    Route::post('/admin/settings/toggle-2fa', [\App\Http\Controllers\AdminSettingsController::class, 'toggle2FA']);
    Route::post('/admin/settings/send-2fa-code', [\App\Http\Controllers\AdminSettingsController::class, 'send2FACode']);
    Route::post('/admin/settings/verify-2fa-code', [\App\Http\Controllers\AdminSettingsController::class, 'verify2FACode']);

    // Master System Status (Viewable by Admin & Super Admin)
    Route::get('/admin/master/status', [\App\Http\Controllers\MasterSystemController::class, 'status']);
});

// Grand Master Privileges - Exclusively Reserved for System Owner (Super Admin)
Route::middleware(SuperAdminMiddleware::class)->group(function () {
    Route::post('/admin/master/toggle-maintenance', [\App\Http\Controllers\MasterSystemController::class, 'toggleMaintenance']);
    Route::post('/admin/master/purge-caches', [\App\Http\Controllers\MasterSystemController::class, 'purgeCaches']);
    Route::post('/admin/master/toggle-financial-freeze', [\App\Http\Controllers\MasterSystemController::class, 'toggleFinancialFreeze']);
    Route::post('/admin/master/backup-database', [\App\Http\Controllers\MasterSystemController::class, 'backupDatabase']);
    Route::post('/admin/master/force-client-update', [\App\Http\Controllers\MasterSystemController::class, 'forceClientUpdate']);
    Route::post('/admin/master/sos-broadcast', [\App\Http\Controllers\MasterSystemController::class, 'sosBroadcast']);
    Route::post('/admin/master/revoke-all-staff-sessions', [\App\Http\Controllers\MasterSystemController::class, 'revokeAllStaffSessions']);
    Route::post('/admin/master/coin-multiplier', [\App\Http\Controllers\MasterSystemController::class, 'updateCoinMultiplier']);
});

// Public Telegram Webhook Endpoint
Route::post('/telegram/webhook', [\App\Http\Controllers\TelegramController::class, 'webhook'])->middleware('throttle:120,1');
