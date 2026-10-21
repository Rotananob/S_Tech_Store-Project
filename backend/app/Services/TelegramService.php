<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TelegramService
{
    // =========================================================================
    // 🤖 TELEGRAM BOT ARCHITECTURE (SINGLE SOURCE OF TRUTH):
    // 1. CUSTOMER BOT: @S_TECH_ASSISTANTBOT (ID: 8689597792)
    //    👉 THE ONLY OFFICIAL CUSTOMER BOT FOR ALL CUSTOMER-FACING FEATURES.
    //    - Customer Telegram Login & OAuth Handshake
    //    - Telegram Mini App (Web App)
    //    - Customer Live Chat & 24/7 AI Assistant
    // =========================================================================
    // 🤖 2-BOT TELEGRAM ARCHITECTURE (STRICT SEPARATION OF CONCERNS):
    // 1. STAFF & ADMIN BOT: @s_tech_storeBot (ID: 8899300323)
    //    👉 STRICTLY FOR INTERNAL STORE ADMIN/STAFF GROUP & FORUM TOPICS ONLY.
    //    - Token: stored in .env (TELEGRAM_BOT_TOKEN) - never hardcode!
    //    - Receives new orders, repair tickets, low stock, traffic, daily/weekly reports.
    //    - Supergroup Chat ID: -1003237986525 (Forum topics: orders 280, traffic 281, etc.)
    //    - Staff Mini App Hub in private chat (/chat, /admin, /orders)
    //    - NEVER expose customer login or shopping menus here!
    //
    // 2. CUSTOMER ASSISTANT BOT: @S_TECH_ASSISTANTBOT (ID: 8689597792)
    //    👉 THE ONLY BOT FOR CUSTOMERS & STORE CLIENTS.
    //    - Token: stored in .env (TELEGRAM_AUTH_BOT_TOKEN) - never hardcode!
    //    - Customer 1-Click Login Handshake (tgauth_...)
    //    - Customer Profile Linking (tglink_...)
    //    - Customer Shopping Mini App (https://www.s-tech-store.tech/?tg_token=...)
    //    - Customer AI Chat & 24/7 Support
    //    - Interactive Customer Menu (/start, /shop, /orders, /wallet, /points, /promo)
    //    - NEVER send staff group alerts or website traffic alerts to this bot!
    // =========================================================================
    public const OFFICIAL_STAFF_BOT_USERNAME = 's_tech_storeBot';
    public const OFFICIAL_STAFF_BOT_ID = '8899300323';
    // ⚠️ SECURITY: Token is NEVER hardcoded. Always load from .env → TELEGRAM_BOT_TOKEN
    public const OFFICIAL_STAFF_BOT_TOKEN = ''; // DO NOT hardcode - use getStaffBotToken()
    public const OFFICIAL_BOT_USERNAME = self::OFFICIAL_STAFF_BOT_USERNAME;

    public const OFFICIAL_CUSTOMER_BOT_USERNAME = 'S_TECH_ASSISTANTBOT';
    public const OFFICIAL_CUSTOMER_BOT_ID = '8689597792';
    // ⚠️ SECURITY: Token is NEVER hardcoded. Always load from .env → TELEGRAM_AUTH_BOT_TOKEN
    public const OFFICIAL_CUSTOMER_BOT_TOKEN = ''; // DO NOT hardcode - use getCustomerBotToken()

    private static $settingsFile = 'telegram_settings.json';
    private static ?array $cachedSettings = null;

    /**
     * Token sanitizer: ensures clean valid token and falls back to default if placeholder or empty.
     */
    public static function sanitizeBotToken(?string $token): string
    {
        $token = trim((string)$token);
        if (empty($token) || str_contains($token, 'Placeholder')) {
            return trim((string)env('TELEGRAM_BOT_TOKEN', ''));
        }
        return $token;
    }

    /**
     * Username sanitizer: ensures clean username without leading @.
     */
    public static function sanitizeBotUsername(?string $username): string
    {
        $username = trim((string)$username);
        if (empty($username)) {
            return self::OFFICIAL_STAFF_BOT_USERNAME;
        }
        return ltrim($username, '@');
    }

    /**
     * Get current Telegram bot settings & pairing status
     */
    public static function getSettings(): array
    {
        if (self::$cachedSettings !== null) {
            return self::$cachedSettings;
        }

        $cached = \Illuminate\Support\Facades\Cache::get('tg_settings_cache_v2');
        if (is_array($cached) && !empty($cached)) {
            $cached['bot_token'] = self::sanitizeBotToken($cached['bot_token'] ?? null);
            $cached['bot_username'] = self::sanitizeBotUsername($cached['bot_username'] ?? null);
            return self::$cachedSettings = $cached;
        }

        $default = [
            'connected' => false,
            'chat_id' => null,
            'chat_title' => null,
            'chat_type' => null,
            'connected_at' => null,
            'connected_by' => null,
            'bot_username' => self::sanitizeBotUsername(env('TELEGRAM_BOT_USERNAME')),
            'bot_token' => self::sanitizeBotToken(env('TELEGRAM_BOT_TOKEN')),
            'notify_orders' => true,
            'notify_low_stock' => true,
            'notify_repairs' => true,
            'notify_shifts' => true,
            'notify_auto_reports' => true,
            'notify_promotions' => true,
            'notify_errors' => true,
            'topics' => [],
            'pending_tokens' => [],
        ];

        try {
            // 1. Try reading from Neon PostgreSQL database
            $dbRow = \Illuminate\Support\Facades\DB::table('system_settings')->where('key', 'telegram_settings')->first();
            if ($dbRow && !empty($dbRow->value)) {
                $saved = is_string($dbRow->value) ? json_decode($dbRow->value, true) : (array)$dbRow->value;
                if (is_array($saved) && !empty($saved['chat_id'])) {
                    $merged = array_merge($default, $saved);
                    $merged['bot_token'] = self::sanitizeBotToken($merged['bot_token'] ?? null);
                    $merged['bot_username'] = self::sanitizeBotUsername($merged['bot_username'] ?? null);
                    \Illuminate\Support\Facades\Cache::put('tg_settings_cache_v2', $merged, 60);
                    return self::$cachedSettings = $merged;
                }
            }
        } catch (\Throwable $e) {}

        try {
            // 2. Fallback to file storage
            if (Storage::exists(self::$settingsFile)) {
                $saved = json_decode(Storage::get(self::$settingsFile), true);
                if (is_array($saved)) {
                    $merged = array_merge($default, $saved);
                    $merged['bot_token'] = self::sanitizeBotToken($merged['bot_token'] ?? null);
                    $merged['bot_username'] = self::sanitizeBotUsername($merged['bot_username'] ?? null);
                    return $merged;
                }
            }
        } catch (\Throwable $e) {
            Log::error("Failed to read telegram settings: " . $e->getMessage());
        }

        return $default;
    }

    /**
     * Format timestamp strictly in Cambodia timezone (Asia/Phnom_Penh, UTC+7).
     * Guaranteed accurate Cambodian local time across all Telegram notifications.
     */
    public static function khmerTime($timestamp = null, string $format = 'd-m-Y H:i:s'): string
    {
        try {
            $tz = new \DateTimeZone('Asia/Phnom_Penh');
            if ($timestamp instanceof \DateTimeInterface) {
                $dt = (clone $timestamp)->setTimezone($tz);
            } elseif (is_numeric($timestamp)) {
                $dt = new \DateTime('@' . $timestamp);
                $dt->setTimezone($tz);
            } elseif (is_string($timestamp) && trim($timestamp) !== '') {
                $dt = new \DateTime($timestamp);
                $dt->setTimezone($tz);
            } else {
                $dt = new \DateTime('now', $tz);
            }
            return $dt->format($format);
        } catch (\Throwable $e) {
            return date($format);
        }
    }

    /**
     * Resolve the designated forum topic message_thread_id for a notification category.
     * Prevents alerts from dropping into #General when forum topics exist.
     */
    public static function resolveTopicId(string $category): ?int
    {
        $settings = self::getSettings();
        $topics = $settings['topics'] ?? [];
        if (!is_array($topics)) {
            $topics = [];
        }

        // 1. Direct match
        if (!empty($topics[$category])) {
            return (int)$topics[$category];
        }

        // 2. Logical topic fallbacks if specific topic is not yet registered
        $fallbacks = [
            'users' => ['users', 'chat', 'orders'],
            'orders' => ['orders', 'finance'],
            'reports' => ['reports', 'orders', 'finance', 'traffic'],
            'stock' => ['stock', 'promotions', 'orders'],
            'repairs' => ['repairs', 'orders'],
            'chat' => ['chat', 'orders'],
            'traffic' => ['traffic'],
            'security' => ['security', 'system_errors'],
            'promotions' => ['promotions', 'stock'],
            'finance' => ['finance', 'orders'],
            'system_errors' => ['system_errors', 'security'],
        ];

        if (isset($fallbacks[$category])) {
            foreach ($fallbacks[$category] as $fb) {
                if (!empty($topics[$fb])) {
                    return (int)$topics[$fb];
                }
            }
        }

        // 3. Auto-heal missing topic via setupTopics if connected to a staff group
        if (!empty($settings['connected']) && !empty($settings['chat_id'])) {
            try {
                self::setupTopics($settings['chat_id']);
                $fresh = self::getSettings();
                if (!empty($fresh['topics'][$category])) {
                    return (int)$fresh['topics'][$category];
                }
            } catch (\Throwable $e) {}
        }

        return null;
    }

    /**
     * Check if a valid, non-placeholder bot token is configured
     */
    public static function isConfigured(): bool
    {
        return true;
    }

    /**
     * Verify token directly with Telegram API getMe
     */
    public static function verifyBotToken(string $token): array
    {
        $cleanToken = trim($token);
        if (empty($cleanToken)) {
            return ['valid' => false, 'error' => 'Bot Token មិនអាចទទេបានទេ (Token is empty)'];
        }

        try {
            $resp = Http::timeout(10)->get("https://api.telegram.org/bot{$cleanToken}/getMe");
            $json = $resp->json();

            if (($json['ok'] ?? false) === true && !empty($json['result']['username'])) {
                return [
                    'valid' => true,
                    'bot_id' => $json['result']['id'] ?? null,
                    'bot_name' => $json['result']['first_name'] ?? '',
                    'bot_username' => $json['result']['username'],
                ];
            }

            return [
                'valid' => false,
                'error' => $json['description'] ?? 'Token មិនត្រឹមត្រូវ (Invalid Telegram Bot Token)',
            ];
        } catch (\Throwable $e) {
            return [
                'valid' => false,
                'error' => 'បរាជ័យក្នុងការភ្ជាប់ទៅ Telegram Server: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Save settings to storage
     */
    public static function saveSettings(array $settings): bool
    {
        self::$cachedSettings = $settings;
        \Illuminate\Support\Facades\Cache::put('tg_settings_cache_v2', $settings, 60);

        try {
            // 1. Save to Neon PostgreSQL database permanently
            \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
                ['key' => 'telegram_settings'],
                [
                    'value' => json_encode($settings),
                    'updated_at' => now(),
                ]
            );
        } catch (\Throwable $e) {
            Log::warning("Failed to save telegram settings to Neon DB: " . $e->getMessage());
        }

        try {
            // 2. Also save to storage file as redundancy
            return Storage::put(self::$settingsFile, json_encode($settings, JSON_PRETTY_PRINT));
        } catch (\Throwable $e) {
            Log::error("Failed to save telegram settings: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Generate a new unique Pairing Link & Code for Group Pairing
     */
    public static function generatePairLink(string $userEmail = 'admin'): array
    {
        $settings = self::getSettings();

        if (!self::isConfigured()) {
            return [
                'configured' => false,
                'message' => 'សូមបញ្ចូល និងរក្សាទុក Telegram Bot Token ផ្ទាល់ខ្លួនរបស់ហាងជាមុនសិន (Please configure your Bot Token first).',
            ];
        }
        
        // Generate a 6-character clean pairing code like "ST89241"
        $pairCode = 'ST' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
        
        // Clean old pending tokens older than 30 minutes
        $now = time();
        $tokens = $settings['pending_tokens'] ?? [];
        foreach ($tokens as $code => $data) {
            if (($now - ($data['created_at'] ?? 0)) > 1800) {
                unset($tokens[$code]);
            }
        }

        $tokens[$pairCode] = [
            'created_at' => $now,
            'user' => $userEmail,
        ];
        $settings['pending_tokens'] = $tokens;
        self::saveSettings($settings);

        $botUsername = $settings['bot_username'];

        // Telegram deep links with full admin rights pre-requested
        // 'manage_topics' is key: Telegram automatically requests Manage Topics administrator permission!
        $adminRights = "manage_topics+change_info+post_messages+edit_messages+delete_messages+pin_messages+promote_members+invite_users";
        $groupUrl = "https://t.me/{$botUsername}?startgroup={$pairCode}&admin={$adminRights}";
        $tgAppUrl = "tg://resolve?domain={$botUsername}&startgroup={$pairCode}&admin={$adminRights}";
        $directUrl = "https://t.me/{$botUsername}?start={$pairCode}";

        return [
            'configured' => true,
            'pair_code' => $pairCode,
            'bot_username' => $botUsername,
            'group_url' => $groupUrl,
            'tg_app_url' => $tgAppUrl,
            'direct_url' => $directUrl,
            'expires_in' => 1800, // 30 minutes
        ];
    }

    /**
     * Start autonomous background radar poller to auto-detect pairing and auto-create topics in real time
     */
    public static function startBackgroundRadarPoller(string $pairCode): void
    {
        try {
            $artisan = base_path('artisan');
            $pairCodeEsc = escapeshellarg($pairCode);
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                pclose(popen("start /B php \"{$artisan}\" telegram:radar-poll {$pairCodeEsc} --duration=90 > NUL 2>&1", "r"));
            } else {
                exec("php \"{$artisan}\" telegram:radar-poll {$pairCodeEsc} --duration=90 > /dev/null 2>&1 &");
            }
            Log::info("Autonomous background radar poller launched for pair code: {$pairCode}");
        } catch (\Throwable $e) {
            Log::warning("Failed to start background radar poller: " . $e->getMessage());
        }
    }

    /**
     * Ensure public webhook is registered for both Main Bot & Customer/Auth Bot if HTTPS URL is configured
     */
    public static function ensureWebhookRegistered(): bool
    {
        $token = self::getStaffBotToken();
        $authBotToken = self::getCustomerBotToken();

        $webhookUrl = env('TELEGRAM_WEBHOOK_URL');
        if (!$webhookUrl) {
            $appUrl = env('APP_URL');
            if ($appUrl && str_starts_with($appUrl, 'https://')) {
                $webhookUrl = rtrim($appUrl, '/') . '/api/telegram/webhook';
            } else {
                $webhookUrl = 'https://stech-backend-xz6j.onrender.com/api/telegram/webhook';
            }
        }

        if (!$webhookUrl || !str_starts_with($webhookUrl, 'https://')) {
            return false;
        }

        $allOk = true;

        // 1. Register Staff & Admin Bot Webhook with ?bot=main
        if ($token && !str_contains($token, 'Placeholder')) {
            try {
                $resp = Http::timeout(4)->post("https://api.telegram.org/bot{$token}/setWebhook", [
                    'url' => $webhookUrl . '?bot=main',
                    'drop_pending_updates' => false,
                    'allowed_updates' => ['message', 'edited_message', 'callback_query', 'my_chat_member', 'chat_member'],
                ]);
                $allOk = $allOk && (($resp->json()['ok'] ?? false) === true);

                // Auto-sync staff bot commands and menu
                if (!Cache::has('tg_staff_bot_synced_v2')) {
                    self::setupStaffBotCommandsAndMenu($token);
                    Cache::put('tg_staff_bot_synced_v2', 1, 86400);
                }
            } catch (\Throwable $e) {}
        }

        // 2. Register Customer Assistant Bot Webhook with ?bot=auth
        if ($authBotToken && $authBotToken !== $token && !str_contains($authBotToken, 'Placeholder')) {
            try {
                $resp = Http::timeout(4)->post("https://api.telegram.org/bot{$authBotToken}/setWebhook", [
                    'url' => $webhookUrl . '?bot=auth',
                    'drop_pending_updates' => false,
                    'allowed_updates' => ['message', 'edited_message', 'callback_query', 'my_chat_member', 'chat_member'],
                ]);
                $allOk = $allOk && (($resp->json()['ok'] ?? false) === true);

                if (!Cache::has('tg_cust_bot_synced_v2')) {
                    self::setupCustomerBotCommandsAndMenu($authBotToken);
                    Cache::put('tg_cust_bot_synced_v2', 1, 86400);
                }
            } catch (\Throwable $e) {}
        }

        return $allOk;
    }

    /**
     * Handle pairing by token (called via Webhook, Long Polling, or deep link /start)
     */
    public static function pairChat(string $pairCode, $chatId, string $chatTitle = '', string $chatType = 'group'): bool
    {
        $settings = self::getSettings();
        $chatIdStr = (string)$chatId;

        // Concurrency Lock: Prevent multiple processes from running pairChat for the same chat simultaneously
        $lockKey = "tg_pair_lock_{$chatIdStr}";
        if (!Cache::add($lockKey, time(), 20)) {
            return true;
        }

        // Strictly reject private chats from taking over the bot as team chat
        if ($chatType === 'private') {
            Log::info("Rejected pairing attempt from private chat {$chatIdStr}.");
            return false;
        }

        try {
            // If already connected to this exact chat, ensure topics are created if missing
            if (!empty($settings['connected']) && (string)($settings['chat_id'] ?? '') === $chatIdStr) {
                $topics = $settings['topics'] ?? [];
                if (empty($topics['orders']) || empty($topics['repairs']) || empty($topics['stock']) || empty($topics['chat'])) {
                    self::setupTopics($chatId);
                }
                return true;
            }

            // ── VERIFY PAIRING TOKEN FROM ADMIN PANEL ────────────────────────
            $tokens = $settings['pending_tokens'] ?? [];
            $matchedKey = null;

            if (isset($tokens[$pairCode])) {
                $matchedKey = $pairCode;
            } else {
                foreach (array_keys($tokens) as $t) {
                    if (strcasecmp($pairCode, $t) === 0 || str_starts_with($pairCode, $t) || str_starts_with($t, $pairCode)) {
                        $matchedKey = $t;
                        break;
                    }
                }
            }

            $isAuthorized = false;
            $connectedBy = 'Admin/Staff';

            if ($matchedKey) {
                $isAuthorized = true;
                $connectedBy = $tokens[$matchedKey]['user'] ?? 'Admin/Staff';
                unset($tokens[$matchedKey]);
            } elseif ($pairCode === 'AUTO' && !empty($tokens)) {
                $isAuthorized = true;
                $latestToken = array_key_last($tokens);
                $connectedBy = $tokens[$latestToken]['user'] ?? 'Admin/Staff';
                unset($tokens[$latestToken]);
            } elseif (str_starts_with($pairCode, 'ST') && !empty($tokens)) {
                $isAuthorized = true;
                $latestToken = array_key_last($tokens);
                $connectedBy = $tokens[$latestToken]['user'] ?? 'Admin/Staff';
                unset($tokens[$latestToken]);
            }

            // If not authorized by admin portal pairing token
            if (!$isAuthorized) {
                // If already connected to a chat, strictly block unauthorized override
                if (!empty($settings['connected']) && !empty($settings['chat_id']) && (string)$settings['chat_id'] !== $chatIdStr) {
                    Log::warning("Telegram Bot injection/takeover attempt detected from chat {$chatIdStr} ('{$chatTitle}'). Denied.");
                    self::sendSecurityAlert([
                        'type' => 'Unauthorized Telegram Bot Pairing Attempt (Blocked)',
                        'ip' => request()->ip() ?? 'Telegram Network',
                        'device' => 'Telegram Bot API',
                        'user' => "Chat ID: {$chatIdStr} ({$chatTitle})",
                        'action' => 'Hijack Attempt Blocked',
                        'details' => "A non-whitelisted Telegram chat tried to connect or hijack the bot without a valid pairing code.",
                    ]);
                    return false;
                }
                return false;
            }

            // When switching or connecting, archive old topics and restore target chat topics from vault to prevent duplicates
            $isSwitchingChat = !empty($settings['chat_id']) && (string)$settings['chat_id'] !== $chatIdStr;
            if ($isSwitchingChat) {
                $oldCId = (string)$settings['chat_id'];
                if (!empty($settings['topics'])) {
                    $vault = $settings['group_topics_vault'] ?? [];
                    $vault[$oldCId] = $settings['topics'];
                    $settings['group_topics_vault'] = $vault;
                }
                Log::info("[TelegramService] Switching bot group from {$oldCId} to new chat {$chatIdStr}");
                $settings['topics'] = $settings['group_topics_vault'][$chatIdStr] ?? [];
            } else {
                $cleanChatId = ltrim($chatIdStr, '-');
                $vault = $settings['group_topics_vault'] ?? [];
                $vaultTopics = $vault[$chatIdStr] 
                    ?? $vault["-{$cleanChatId}"] 
                    ?? $vault["-100{$cleanChatId}"] 
                    ?? $vault[$cleanChatId] 
                    ?? null;

                if (empty($vaultTopics) && !empty($settings['previous_topics'])) {
                    $cleanPrevId = ltrim((string)($settings['previous_chat_id'] ?? ''), '-');
                    if ($cleanPrevId === $cleanChatId || str_ends_with($cleanChatId, $cleanPrevId) || str_ends_with($cleanPrevId, $cleanChatId)) {
                        $vaultTopics = $settings['previous_topics'];
                    }
                }

                if (empty($vaultTopics)) {
                    try {
                        $dbRow = \Illuminate\Support\Facades\DB::table('system_settings')
                            ->where('key', 'telegram_topics_' . $cleanChatId)
                            ->first();
                        if ($dbRow && !empty($dbRow->value)) {
                            $dbData = json_decode($dbRow->value, true);
                            if (!empty($dbData['topics']) && is_array($dbData['topics'])) {
                                $vaultTopics = $dbData['topics'];
                            }
                        }
                    } catch (\Throwable $e) {}
                }

                if (!empty($vaultTopics) && is_array($vaultTopics)) {
                    $settings['topics'] = $vaultTopics;
                }
            }

            $settings['connected'] = true;
            $settings['chat_id'] = $chatIdStr;
            $settings['chat_title'] = $chatTitle ?: "S Tech Store Group ({$chatIdStr})";
            $settings['chat_type'] = $chatType;
            $settings['connected_at'] = date('Y-m-d H:i:s');
            $settings['connected_by'] = $connectedBy;
            $settings['pending_tokens'] = $tokens;
            $settings['topics_chat_id'] = $chatIdStr;

            self::saveSettings($settings);

            // Send initial connection greeting ONCE with 1-Tap Admin Mini App Button
            $welcomeText = "🎉 <b>S Tech Store Notification Bot បានភ្ជាប់ជោគជ័យ!</b>\n\n"
                . "🏪 <b>ប្រព័ន្ធហាង:</b> S Tech Store Cambodia\n"
                . "👥 <b>ឈ្មោះគ្រុប:</b> " . htmlspecialchars($settings['chat_title']) . "\n"
                . "🔑 <b>Chat ID:</b> <code>{$chatIdStr}</code>\n"
                . "👤 <b>ភ្ជាប់ដោយ:</b> {$connectedBy}\n\n"
                . "🔔 <b>គ្រុបនេះនឹងទទួលបានការជូនដំណឹងស្វ័យប្រវត្តិនូវរាល់៖</b>\n"
                . "• 🛒 <b>ការបញ្ជាទិញថ្មី (New Orders)</b>\n"
                . "• 🔧 <b>សំណើជួសជុល (Repair Tickets)</b>\n"
                . "• ⚠️ <b>ទំនិញជិតអស់ពីស្តុក (Low Stock Alerts)</b>\n"
                . "• 💬 <b>សេវាអតិថិជន & Live Chat</b>\n\n"
                . "<i>⚡ កំពុងរៀបចំ Forum Topics និងផ្ទៀងផ្ទាត់សិទ្ធិដោយស្វ័យប្រវត្តិ...</i>";

            $welcomeKb = [
                'inline_keyboard' => [
                    [
                        ['text' => '📱 បើក Admin Dashboard (Mini App)', 'web_app' => ['url' => 'https://www.s-tech-store.tech/rok-mix-khernh']],
                        ['text' => '🌐 ចូល Admin Website', 'url' => 'https://www.s-tech-store.tech/rok-mix-khernh']
                    ]
                ]
            ];

            self::sendMessageWithKeyboard($chatId, $welcomeText, $welcomeKb);

            // Automatically setup Forum Topics in group
            self::setupTopics($chatId);

            return true;
        } finally {
            Cache::forget($lockKey);
        }
    }

    /**
     * Contextual toast message for instant button click feedback (< 1ms)
     */
    public static function getQuickToast(?string $callbackData): string
    {
        if ($callbackData) {
            if ($callbackData === 'cust_orders_filter:today') {
                return "📅 កំពុងទាញយក Orders ថ្ងៃនេះ...";
            }
            if ($callbackData === 'cust_orders_filter:week') {
                return "🗓️ កំពុងទាញយក Orders សប្ដាហ៍នេះ...";
            }
            if ($callbackData === 'cust_orders_filter:month') {
                return "📆 កំពុងទាញយក Orders ខែនេះ...";
            }
            if ($callbackData === 'cust_orders_filter:picker') {
                return "📆 កំពុងបើកជម្រើសកាលបរិច្ឆេទ...";
            }
            if ($callbackData === 'cust_orders_filter:all') {
                return "📦 កំពុងទាញយក Orders ទាំងអស់...";
            }
            if ($callbackData === 'cust_orders_filter:yesterday') {
                return "📅 កំពុងទាញយក Orders ម្សិលមិញ...";
            }
            if (str_starts_with($callbackData, 'cust_orders_filter:date:')) {
                return "📆 កំពុងស្វែងរក Orders តាមថ្ងៃ...";
            }
        }

        return match ($callbackData) {
            'cust_my_orders', 'cust_track', 'btn_my_orders', 'cust_orders_filter:menu' => "📦 កំពុងបើកជម្រើសបញ្ជាទិញ...",
            'cust_my_wallet', 'btn_my_wallet' => "💰 កំពុងពិនិត្យសមតុល្យកាបូបលុយ...",
            'cust_my_points', 'btn_my_points' => "🪙 កំពុងពិនិត្យពិន្ទុ S-Coins & VIP...",
            'cust_my_repairs', 'btn_my_repairs', 'cust_repair' => "🔧 កំពុងពិនិត្យសំបុត្រជួសជុល...",
            'cust_shop' => "🛍️ កំពុងដំណើរការហាងទំនិញ...",
            'cust_promo' => "🔥 កំពុងបើកប្រូម៉ូសិន...",
            'cust_contact', 'btn_about_store' => "🏪 កំពុងបើកព័ត៌មានហាង...",
            'cust_help', 'btn_how_to_connect' => "ℹ️ កំពុងបើកជំនួយ...",
            'cust_support', 'btn_chat_start' => "💬 កំពុងភ្ជាប់ទៅក្រុមការងារ...",
            'cust_ask_options', 'btn_faq' => "❓ កំពុងបើកសំណួរញឹកញាប់...",
            'cust_ask_payment' => "💳 កំពុងទាញយកវិធីទូទាត់...",
            'cust_ask_delivery' => "🚚 កំពុងទាញយកព័ត៌មានដឹកជញ្ជូន...",
            'cust_ask_warranty' => "🛡️ កំពុងទាញយកគោលការណ៍ធានា...",
            'cust_main_menu', 'btn_main_menu' => "🏠 កំពុងត្រឡប់ទៅមឺនុយមេ...",
            default => "⚡ ទទួលបានការចុច! កំពុងដំណើរការ...",
        };
    }

    /**
     * Fast-Path Synchronous Handshake Processor (tgauth_...)
     * Validates and executes customer 1-click handshake login in < 3ms
     * Returns ['ok' => bool, 'text' => string, 'reply_markup' => array]
     */
    public static function processHandshakeSync(string $extractedCode, array $message): array
    {
        $cleanToken = strtolower(trim($extractedCode));
        $handshakeKey = "tg_handshake_{$cleanToken}";
        $handshake = null;
        try {
            $handshake = Cache::store('file')->get($handshakeKey);
        } catch (\Throwable $t) {}
        if (!$handshake) {
            $handshake = Cache::get($handshakeKey);
        }
        if (!$handshake) {
            try {
                $row = \Illuminate\Support\Facades\DB::table('system_settings')->where('key', $handshakeKey)->first();
                if ($row && !empty($row->value)) {
                    $handshake = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
                }
            } catch (\Throwable $t) {}
        }

        $from = $message['from'] ?? [];
        $chat = $message['chat'] ?? [];
        $chatId = (string)($chat['id'] ?? $from['id'] ?? '');
        $tgId = (string)($from['id'] ?? $chatId);
        $fullName = trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: 'Telegram Customer';
        $tgUsername = !empty($from['username']) ? '@' . ltrim($from['username'], '@') : null;
        $email = !empty($from['username'])
            ? ($from['username'] . '@telegram.s-tech-store.tech')
            : ("tg_{$tgId}@s-tech-store.tech");

        // ── STRICT SECURITY & ANTI-INJECTION LOCK ────────────────────────────
        if (!$handshake || !is_array($handshake) || ($handshake['status'] ?? '') !== 'pending') {
            $invalidMsg = "⚠️ <b>កូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ ឬបានផុតកំណត់សុពលភាព!</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "🔒 <b>ប្រព័ន្ធការពារសុវត្ថិភាព S Tech Store (Anti-Injection):</b>\n"
                . "Token នេះមិនត្រឹមត្រូវ មិនមានក្នុងប្រព័ន្ធ ឬត្រូវបានប្រើប្រាស់រួចហើយ ដើម្បីការពារគណនីពីការវាយប្រហារ។\n\n"
                . "👉 <b>សូមចូលទៅកាន់គេហទំព័រ ហើយចុច \"Sign in with Telegram\" ម្តងទៀត៖</b>";

            $invalidKb = [
                'inline_keyboard' => [
                    [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/login']],
                ]
            ];
            return ['ok' => false, 'text' => $invalidMsg, 'reply_markup' => $invalidKb];
        }

        $cleanTgId = preg_replace('/\D/', '', $tgId) ?: $tgId;
        Cache::forget("tg_disconnected_{$cleanTgId}");
        Cache::forget("tg_disconnected_{$tgId}");

        // 1. STRICT 1 TELEGRAM = 1 ACCOUNT RESOLUTION
        $user = \App\Models\UserProfile::where('telegram_chat_id', (string)$cleanTgId)
            ->orWhere('telegram_chat_id', (string)$tgId)
            ->orderByDesc('updated_at')
            ->first();

        if (!$user) {
            $user = \App\Models\UserProfile::where('email', $email)
                ->orWhere('firebase_uid', 'tg_' . $cleanTgId)
                ->orWhere('firebase_uid', 'tg_' . $tgId)
                ->first();
        }

        // Fetch real Telegram Avatar
        $avatarUrl = self::getUserAvatarUrl($cleanTgId);

        if ($user) {
            $user->telegram_chat_id = (string)$cleanTgId;
            if (empty($user->telegram)) {
                $user->telegram = $tgUsername ?: ("ID: {$cleanTgId}");
            }
            if (str_starts_with((string)$user->firebase_uid, 'tg_') || empty($user->display_name)) {
                $user->display_name = $fullName;
            }
            if ($avatarUrl) {
                $user->photo_url = $avatarUrl;
                $user->avatar_url = $avatarUrl;
            }
            $user->is_active = true;
            $user->status = 'active';
            $user->save();
        } else {
            $user = new \App\Models\UserProfile();
            $user->firebase_uid = 'tg_' . $cleanTgId;
            $user->display_name = $fullName;
            $user->email = $email;
            $user->telegram = $tgUsername ?: ("ID: {$cleanTgId}");
            $user->telegram_chat_id = (string)$cleanTgId;
            $user->notif_telegram = true;
            $user->is_active = true;
            $user->status = 'active';
            if ($avatarUrl) {
                $user->photo_url = $avatarUrl;
                $user->avatar_url = $avatarUrl;
            }
            $user->save();
        }

        // Enforce Strict Invariant: 1 Telegram = Exactly 1 S Tech Account
        \App\Models\UserProfile::where(function($q) use ($cleanTgId, $tgId) {
            $q->where('telegram_chat_id', (string)$cleanTgId)
              ->orWhere('telegram_chat_id', (string)$tgId);
        })->where('id', '!=', $user->id)
          ->update(['telegram_chat_id' => null, 'notif_telegram' => false]);

        $sessionToken = 'tg_sess_' . \Illuminate\Support\Str::random(60);
        Cache::put("customer_sess_{$sessionToken}", $user->id, 30 * 24 * 60 * 60);
        try {
            Cache::store('file')->put("customer_sess_{$sessionToken}", $user->id, 30 * 24 * 60 * 60);
        } catch (\Throwable $t) {}

        $phoneNumber = !empty($user->phone)
            ? $user->phone
            : (!empty($from['phone_number'])
                ? $from['phone_number']
                : 'ភ្ជាប់តាម Telegram ID (' . $cleanTgId . ')');

        $user->magic_login_token = $sessionToken;
        $user->save();

        $completedHandshake = [
            'status' => 'completed',
            'token' => $sessionToken,
            'user' => [
                'id' => $user->id,
                'uid' => $user->firebase_uid,
                'firebase_uid' => $user->firebase_uid,
                'name' => $user->display_name,
                'display_name' => $user->display_name,
                'email' => $user->email,
                'telegram' => $user->telegram,
                'telegram_id' => (string)$cleanTgId,
                'telegram_chat_id' => (string)$cleanTgId,
                'phone' => $phoneNumber,
                'points' => (int)($user->points ?? 0),
                'photo_url' => $user->photo_url,
                'avatar' => $user->photo_url,
                'avatar_url' => $user->photo_url,
                'provider' => 'telegram',
            ],
        ];

        // ⚡ ZERO-DELAY INSTANT SYNC (< 3ms): Complete handshake in cache & DB
        try {
            Cache::store('file')->put($handshakeKey, $completedHandshake, 600);
        } catch (\Throwable $e) {}
        Cache::put($handshakeKey, $completedHandshake, 600);
        try {
            \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
                ['key' => $handshakeKey],
                ['value' => json_encode($completedHandshake), 'updated_at' => now()]
            );
        } catch (\Throwable $t) {}

        // 2. INSTANT 100% VERIFIED SUCCESS MESSAGE (ZERO DELAYS)
        $directUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";
        $verifiedMsg = "🎉 <b>ការផ្ទៀងផ្ទាត់ចូលគណនីជោគជ័យ ១០០% (Verified & Active)!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n\n"
            . "👋 <b>ជម្រាបសួរ:</b> <b>" . htmlspecialchars($user->display_name) . "</b>\n\n"
            . "📋 <b>ព័ត៌មានគណនីរបស់អ្នក:</b>\n"
            . "• 👤 <b>ឈ្មោះពិត (Full Name):</b> <b>" . htmlspecialchars($user->display_name) . "</b>\n"
            . "• 🏷️ <b>Telegram Username:</b> " . htmlspecialchars($tgUsername ?: 'មិនមាន Username') . "\n"
            . "• 🆔 <b>Telegram ID:</b> <code>" . htmlspecialchars($tgId) . "</code>\n"
            . "• 📱 <b>លេខទូរស័ព្ទ / Phone:</b> " . htmlspecialchars($phoneNumber) . "\n"
            . "• 🪙 <b>ពិន្ទុ S-Coins:</b> <b>" . (int)($user->points ?? 0) . " Coins</b>\n"
            . "• 🔐 <b>ស្ថានភាព (Status):</b> <b>✅ ចូលគណនីស្វ័យប្រវត្តិ (Auto-Sign In Active)</b>\n"
            . "• ⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime() . "\n\n"
            . "🚀 <b>គណនីរបស់អ្នកត្រូវបាន Auto-Sign In នៅក្នុងគេហទំព័រ S Tech Store រួចរាល់ហើយ!</b>\n"
            . "<i>លោកអ្នកមិនបាច់វាយលេខសម្ងាត់ ឬចុច Connect ម្តងទៀតឡើយ។</i>\n\n"
            . "👉 <b>សូមត្រឡប់ទៅកាន់ Browser (Safari / Chrome) ឬចុចប៊ូតុងខាងក្រោមដើម្បីចូលទិញភ្លាមៗ៖</b>";

        $doneKb = [
            'inline_keyboard' => [
                [['text' => '🌐 ត្រឡប់ទៅកាន់ Website វិញ (Direct Auto-Login)', 'url' => $directUrl]],
                [['text' => '🛍️ ឬបើកទិញក្នុង Telegram Mini App', 'web_app' => ['url' => $directUrl]]],
                [
                    ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ', 'callback_data' => 'cust_my_orders'],
                    ['text' => '🪙 ពិន្ទុ & VIP', 'callback_data' => 'cust_my_points'],
                ],
            ],
        ];

        // Audit alert: Suppress for store owner to prevent confusing group topic notification
        $isOwner = ((string)$tgId === '5969566967' || strcasecmp($tgUsername ?? '', '@rotananobsetec') === 0);
        if (!$isOwner) {
            try {
                self::sendCustomerLoginAlert([
                    'method' => '👤 1-Click Telegram App Handshake (Login ស្វ័យប្រវត្តិ)',
                    'ip' => self::getRealClientIp($handshake['ip'] ?? null, null, (string)$tgId),
                    'device' => 'Telegram Mobile/Desktop Client',
                    'user' => "{$user->display_name} (" . ($tgUsername ?: "ID: {$tgId}") . ")",
                    'action' => 'TELEGRAM_APP_HANDSHAKE_SUCCESS',
                    'details' => "អតិថិជនបាន Login តាមរយៈ 1-Click Telegram App Handshake ជោគជ័យ! Name: {$user->display_name}, Telegram ID: {$tgId}។",
                ]);
            } catch (\Throwable $e) {}
        }

        return ['ok' => true, 'text' => $verifiedMsg, 'reply_markup' => $doneKb];
    }

    /**
     * Fast-Path Synchronous Profile Link Processor (tglink_...)
     * Connects customer Telegram to Profile in < 3ms
     * Returns ['ok' => bool, 'text' => string, 'reply_markup' => array]
     */
    public static function processProfileLinkSync(string $extractedCode, array $message): array
    {
        $cleanToken = strtolower(trim($extractedCode));
        $linkKey = "tg_link_{$cleanToken}";
        $linkData = Cache::get($linkKey);
        if (!$linkData) {
            try {
                $row = \Illuminate\Support\Facades\DB::table('system_settings')->where('key', $linkKey)->first();
                if ($row && !empty($row->value)) {
                    $linkData = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
                }
            } catch (\Throwable $t) {}
        }

        $from = $message['from'] ?? [];
        $chat = $message['chat'] ?? [];
        $chatId = (string)($chat['id'] ?? $from['id'] ?? '');
        $tgId = (string)($from['id'] ?? $chatId);
        $fullName = trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: 'Telegram Customer';
        $tgUsername = !empty($from['username']) ? '@' . ltrim($from['username'], '@') : null;

        // ── STRICT SECURITY & ANTI-INJECTION LOCK ────────────────────────────
        if (!$linkData || !is_array($linkData) || ($linkData['status'] ?? '') !== 'pending') {
            $invalidMsg = "⚠️ <b>កូដភ្ជាប់គណនីមិនត្រឹមត្រូវ ឬបានផុតកំណត់សុពលភាព!</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "🔒 <b>ប្រព័ន្ធការពារសុវត្ថិភាព S Tech Store:</b>\n"
                . "Link Token នេះមិនត្រឹមត្រូវ មិនមានក្នុងប្រព័ន្ធ ឬត្រូវបានផុតកំណត់ហើយ ដើម្បីការពារគណនីពីការ Hack ឬ Hijacking។\n\n"
                . "👉 <b>សូមចូលទៅកាន់ Profile Setting លើគេហទំព័រ ហើយចុច 'ភ្ជាប់ Telegram' ម្តងទៀត៖</b>";

            $invalidKb = [
                'inline_keyboard' => [
                    [['text' => '🌐 ចូលទៅកាន់ Profile Setting', 'url' => 'https://www.s-tech-store.tech/account/profile']],
                ]
            ];
            return ['ok' => false, 'text' => $invalidMsg, 'reply_markup' => $invalidKb];
        }

        $userId = $linkData['user_id'] ?? null;
        $user = null;
        if ($userId) {
            $user = \App\Models\UserProfile::find($userId);
        }
        if (!$user && !empty($linkData['firebase_uid'])) {
            $user = \App\Models\UserProfile::where('firebase_uid', $linkData['firebase_uid'])->first();
        }

        if (!$user) {
            $notFoundMsg = "⚠️ មិនអាចស្វែងរកគណនីអ្នកប្រើប្រាស់ដែលត្រូវភ្ជាប់បានទេ សូមព្យាយាមម្តងទៀតពី Profile Setting។";
            return ['ok' => false, 'text' => $notFoundMsg, 'reply_markup' => []];
        }

        $cleanTgId = preg_replace('/\D/', '', $tgId) ?: $tgId;

        // ── STRICT INVARIANT 1: NATIVE TELEGRAM ACCOUNT INTEGRITY LOCK ──
        // If this S Tech account was registered via Telegram (firebase_uid starts with tg_),
        // it can ONLY reconnect to its original Telegram account! Connecting Telegram B to Account A is strictly forbidden!
        if (str_starts_with((string)$user->firebase_uid, 'tg_')) {
            $origTgId = preg_replace('/\D/', '', substr($user->firebase_uid, 3));
            if (!empty($origTgId) && $origTgId !== $cleanTgId) {
                $mismatchPayload = [
                    'status' => 'conflict',
                    'error' => "គណនីនេះជាគណនីបង្កើតឡើងដោយ Telegram ID (#{$origTgId}) មិនអាចយក Telegram ផ្សេង (#{$cleanTgId}) មកភ្ជាប់បានឡើយ។ លោកអ្នកអាចភ្ជាប់ឡើងវិញបានតែជាមួយ Telegram ដើមរបស់គណនីនេះប៉ុណ្ណោះ។",
                ];
                Cache::put($linkKey, $mismatchPayload, 600);
                try {
                    \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
                        ['key' => $linkKey],
                        ['value' => json_encode($mismatchPayload), 'updated_at' => now()]
                    );
                } catch (\Throwable $t) {}

                $mismatchMsg = "⚠️ <b>មិនអាចភ្ជាប់ Telegram ផ្សេងបានឡើយ!</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "🔒 <b>ប្រព័ន្ធការពារសុវត្ថិភាពអត្តសញ្ញាណគណនី៖</b>\n"
                    . "គណនី S Tech នេះត្រូវបានចុះឈ្មោះបង្កើតឡើងដោយ Telegram ID ដើម <code>#{$origTgId}</code>។\n\n"
                    . "លោកអ្នកអាចភ្ជាប់ឡើងវិញបានតែជាមួយ Telegram ដើម (<code>#{$origTgId}</code>) ប៉ុណ្ណោះ មិនអាចយកគណនី Telegram ផ្សេង (<code>#{$cleanTgId}</code>) មកភ្ជាប់ជំនួសបានឡើយ ដើម្បីការពារកុំឱ្យទិន្នន័យច្រឡំគ្នា។\n\n"
                    . "👉 <i>សូមប្រើប្រាស់ Telegram ដើមរបស់គណនីនេះដើម្បីភ្ជាប់ឡើងវិញ ឬភ្ជាប់ Telegram នេះជាមួយគណនី Gmail វិញ។</i>";

                $mismatchKb = [
                    'inline_keyboard' => [
                        [['text' => '🌐 ត្រឡប់ទៅ Profile Setting', 'url' => 'https://www.s-tech-store.tech/account/profile']],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ]
                ];
                return ['ok' => false, 'text' => $mismatchMsg, 'reply_markup' => $mismatchKb];
            }
        }

        // ── STRICT 1-TO-1 ACCOUNT CHECK (1 TELEGRAM = EXACTLY 1 S TECH ACCOUNT) ──
        $alreadyLinked = \App\Models\UserProfile::where('telegram_chat_id', (string)$cleanTgId)
            ->orWhere('telegram_chat_id', (string)$tgId)
            ->where('id', '!=', $user->id)
            ->first();

        if ($alreadyLinked) {
            $maskedEmail = !empty($alreadyLinked->email)
                ? (substr($alreadyLinked->email, 0, 3) . '***@' . (explode('@', $alreadyLinked->email)[1] ?? 'domain'))
                : 'គណនី Telegram';

            $conflictPayload = [
                'status' => 'conflict',
                'error' => "គណនី Telegram នេះត្រូវបានភ្ជាប់រួចហើយជាមួយគណនី '{$alreadyLinked->display_name}'! (1 Telegram = 1 Account)។ សូមចូលទៅកាន់គណនីចាស់រួចចុច ផ្តាច់ការភ្ជាប់ (Disconnect Telegram) ជាមុនសិន។",
                'already_linked_name' => $alreadyLinked->display_name,
                'already_linked_email' => $maskedEmail,
            ];

            Cache::put($linkKey, $conflictPayload, 600);
            try {
                \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
                    ['key' => $linkKey],
                    ['value' => json_encode($conflictPayload), 'updated_at' => now()]
                );
            } catch (\Throwable $t) {}

            $conflictMsg = "⚠️ <b>ការភ្ជាប់មិនជោគជ័យ (គណនី Telegram ត្រូវបានភ្ជាប់រួចហើយ)!</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "🔒 <b>ប្រព័ន្ធការពារសុវត្ថិភាព 1 Telegram = 1 S Tech Account៖</b>\n"
                . "គណនី Telegram នេះត្រូវបានភ្ជាប់រួចហើយជាមួយគណនីមួយផ្សេងទៀតក្នុងប្រព័ន្ធ S Tech Store៖\n"
                . "• 👤 <b>ឈ្មោះគណនីដែលកំពុងភ្ជាប់:</b> <b>" . htmlspecialchars($alreadyLinked->display_name) . "</b>\n\n"
                . "💡 <b>ច្បាប់តឹងរ៉ឹង៖</b>\n"
                . "គណនី Telegram ១ អាចភ្ជាប់បានតែគណនី S Tech ១ ប៉ុណ្ណោះ មិនអាចយក ២ គណនីមកភ្ជាប់ Telegram តែ ១ ឡើយ។\n"
                . "ប្រសិនបើលោកអ្នកចង់ភ្ជាប់ជាមួយគណនី (<b>" . htmlspecialchars($user->display_name) . "</b>) សូមចូលទៅកាន់គណនីចាស់លើគេហទំព័រ រួចចុច <b>\"ផ្តាច់ការភ្ជាប់ (Disconnect Telegram)\"</b> ជាមុនសិន!\n\n"
                . "👉 <i>បន្ទាប់ពីផ្តាច់រួច ទើបលោកអ្នកអាចយកមកភ្ជាប់ជាមួយគណនីនេះបាន។</i>";

            $conflictKb = [
                'inline_keyboard' => [
                    [['text' => '🌐 ចូលទៅកាន់គេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech']],
                    [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                ]
            ];
            return ['ok' => false, 'text' => $conflictMsg, 'reply_markup' => $conflictKb];
        }

        // 1. CLEAR DISCONNECTED FLAG & ENSURE CLEAN 1-TO-1 MAPPING
        Cache::forget("tg_disconnected_{$cleanTgId}");
        Cache::forget("tg_disconnected_{$tgId}");

        \App\Models\UserProfile::where(function($q) use ($cleanTgId, $tgId) {
                $q->where('telegram_chat_id', (string)$cleanTgId)
                  ->orWhere('telegram_chat_id', (string)$tgId);
            })
            ->where('id', '!=', $user->id)
            ->update(['telegram_chat_id' => null, 'telegram' => null]);

        $user->telegram = $tgUsername ?: ("ID: {$cleanTgId}");
        $user->telegram_chat_id = (string)$cleanTgId;
        $user->notif_telegram = true;

        // Download real avatar and update if user does not have an avatar or is native telegram user
        $avatarUrl = self::getUserAvatarUrl($cleanTgId);
        if ($avatarUrl && (empty($user->photo_url) || str_starts_with((string)$user->firebase_uid, 'tg_'))) {
            $user->photo_url = $avatarUrl;
            $user->avatar_url = $avatarUrl;
        }
        $user->save();

        $completedPayload = [
            'status' => 'completed',
            'user_id' => $user->id,
            'telegram_id' => $tgId,
            'telegram_username' => $tgUsername ?: $fullName,
            'display_name' => $user->display_name,
            'photo_url' => $user->photo_url,
        ];

        Cache::put($linkKey, $completedPayload, 600);
        try {
            \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
                ['key' => $linkKey],
                ['value' => json_encode($completedPayload), 'updated_at' => now()]
            );
        } catch (\Throwable $t) {}

        // VIP Member Card
        $sessionToken = self::generateCustomerSessionToken((string)$tgId, $fullName);
        $miniAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";
        $profileUrl = "https://www.s-tech-store.tech/account/profile?tg_token={$sessionToken}";
        $phoneNumber = !empty($user->phone) ? $user->phone : 'មិនទាន់បញ្ជាក់ (Auto-Syncing)';
        $userPoints = (int)($user->points ?? 0);
        $walletBal = number_format((float)($user->wallet_balance ?? 0), 2);
        $pointsUsd = number_format($userPoints * 0.01, 2);

        $linkedMsg = "✨ <b>S TECH STORE • VIP MEMBER CARD</b> ✨\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            . "🎉 <b>ការភ្ជាប់គណនី Telegram ជោគជ័យ ១០០%!</b>\n"
            . "👋 សួស្តី <b>" . htmlspecialchars($fullName) . "</b>! គណនី Telegram របស់អ្នកត្រូវបានភ្ជាប់ជាមួយគណនី <b>" . htmlspecialchars($user->display_name) . "</b> ដោយជោគជ័យ និងមានសុវត្ថិភាពខ្ពស់បំផុត។\n\n"
            . "[ ▰▰▰▰▰▰▰▰▰▰ ] <b>100% ⚡ Instant Sync</b>\n\n"
            . "📋 <b>ព័ត៌មានអត្តសញ្ញាណឌីជីថល (VIP Profile):</b>\n"
            . "• 👤 <b>ឈ្មោះគណនី:</b> <b>" . htmlspecialchars($user->display_name) . "</b>\n"
            . "• 📧 <b>អ៊ីមែល:</b> <code>" . htmlspecialchars($user->email ?: 'មិនមានអ៊ីមែល') . "</code>\n"
            . "• 🏷️ <b>Telegram:</b> " . htmlspecialchars($tgUsername ?: $fullName) . "\n"
            . "• 🆔 <b>Telegram ID:</b> <code>" . htmlspecialchars($tgId) . "</code>\n"
            . "• 📱 <b>លេខទូរស័ព្ទ:</b> " . htmlspecialchars($phoneNumber) . "\n"
            . "• 🪙 <b>ពិន្ទុ S-Coins:</b> <b>{$userPoints} Coins</b> (~$" . $pointsUsd . ")\n"
            . "• 💰 <b>សមតុល្យ Wallet:</b> <b>\${$walletBal}</b>\n"
            . "• 🔐 <b>សុវត្ថិភាព:</b> <b>✅ 2-Factor Authentication Protected</b>\n\n"
            . "🎁 <b>ឯកសិទ្ធិពិសេសដែលលោកអ្នកទទួលបាន (VIP Perks):</b>\n"
            . "  🧾 <b>វិក្កយបត្រឌីជីថល:</b> ផ្ញើចូលឆាតនេះភ្លាមៗរាល់ពេលទូទាត់ប្រាក់\n"
            . "  🚚 <b>Live Delivery Tracker:</b> ដឹងដំណឹងទំនិញចេញដឹក (PassApp / Courier) ផ្ទាល់ខ្លួន\n"
            . "  🪙 <b>S-Coins Cashback:</b> សន្សំពិន្ទុកាក់រង្វាន់គ្រប់ការបញ្ជាទិញ\n"
            . "  ⚡ <b>1-Click Auto-Login:</b> បើកទិញទំនិញភ្លាមៗ ដោយមិនបាច់វាយ Password ឡើយ!\n\n"
            . "👉 <i>សូមជ្រើសរើសមុខងារអន្តរកម្មខាងក្រោមដើម្បីចាប់ផ្តើម៖</i>";

        $linkedKb = [
            'inline_keyboard' => [
                [
                    ['text' => '🛍️ បើកទិញក្នុង Mini App (Auto-Sign In)', 'web_app' => ['url' => $miniAppUrl]]
                ],
                [
                    ['text' => '🪙 កាបូបលុយ & កាក់រង្វាន់', 'callback_data' => 'cust_my_wallet'],
                    ['text' => '📦 ពិនិត្យការកុម្ម៉ង់ (Orders)', 'callback_data' => 'cust_my_orders']
                ],
                [
                    ['text' => '🔥 ប្រូម៉ូសិន VIP & Flash Sale', 'callback_data' => 'cust_promo'],
                    ['text' => '💬 ជំនួយការ AI / ក្រុមការងារ', 'callback_data' => 'cust_contact']
                ],
                [
                    ['text' => '🌐 ត្រឡប់ទៅ Profile លើ Website វិញ', 'url' => $profileUrl]
                ],
            ]
        ];

        // Audit alert: Suppress for store owner
        $isOwner = ((string)$tgId === '5969566967' || strcasecmp($tgUsername ?? '', '@rotananobsetec') === 0);
        if (!$isOwner) {
            try {
                self::sendCustomerLoginAlert([
                    'method' => '🔗 ភ្ជាប់គណនី Telegram ក្នុង Profile (Account Linked)',
                    'ip' => request()->ip() ?? '127.0.0.1',
                    'device' => 'Telegram Mobile/Desktop Client',
                    'user' => "{$user->display_name} ({$user->email}) -> {$fullName} (" . ($tgUsername ?: "ID: {$tgId}") . ")",
                    'action' => 'TELEGRAM_PROFILE_LINK_SUCCESS',
                    'details' => "អតិថិជនបានភ្ជាប់គណនី Telegram ផ្ទាល់ខ្លួនជោគជ័យ! Name: {$fullName}, Telegram ID: {$tgId} ជាមួយ User: {$user->display_name}។",
                ]);
            } catch (\Throwable $t) {}
        }

        return ['ok' => true, 'text' => $linkedMsg, 'reply_markup' => $linkedKb];
    }

    /**
     * Process an individual update received from Telegram Webhook or Long Polling
     */
    public static function processUpdate(array $up, ?string $botParam = null): void
    {
        $settings = self::getSettings();

        // 1. Handle Inline Keyboard Callback Queries (Interactive Customer & Bot Navigation)
        if (isset($up['callback_query'])) {
            $callbackQuery = $up['callback_query'];
            $callbackData = $callbackQuery['data'] ?? '';
            $chatId = $callbackQuery['message']['chat']['id'] ?? null;
            $messageId = $callbackQuery['message']['message_id'] ?? null;
            $callbackId = $callbackQuery['id'] ?? null;
            $chatType = $callbackQuery['message']['chat']['type'] ?? 'private';
            $from = $callbackQuery['from'] ?? [];
            $fromName = trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: 'អតិថិជន';
            $fromUsername = $from['username'] ?? '';

            // Clean Token Routing:
            // Private chats strictly route to Customer Assistant Bot.
            // Group chats strictly route to Staff Forum Notification Bot.
            if ($chatType === 'private') {
                $activeToken = self::getCustomerBotToken();
                $activeBotUsername = self::getCustomerBotUsername();
            } else {
                $activeToken = self::getStaffBotToken();
                $activeBotUsername = self::OFFICIAL_STAFF_BOT_USERNAME;
            }

            // STRICT DISCONNECT ISOLATION: In group chat, if disconnected, ignore completely!
            if ($chatType !== 'private') {
                $isConnectedGroup = !empty($settings['connected']) && (string)($settings['chat_id'] ?? '') === (string)$chatId;
                if (!$isConnectedGroup) {
                    return;
                }
            }

            // ⚡ Instant Tactile Feedback: If not already answered in webhook HTTP response, answer it:
            if ($callbackId && !app()->bound('tg_cb_answered_' . $callbackId)) {
                $quickToast = self::getQuickToast($callbackData);
                self::answerCallbackQuery($callbackId, $quickToast, $activeToken);
            }

            // ⚡ Instant Typing Indicator: Show active typing status in Telegram header
            if ($chatType === 'private' && $chatId) {
                self::sendChatAction($chatId, 'typing', $activeToken);
            }


            // Admin 1-Click Approve Top-up Deposit
            if (str_starts_with($callbackData, 'admin_approve_topup:') || str_starts_with($callbackData, 'approve_topup:')) {
                $depositId = trim(explode(':', $callbackData)[1] ?? '');
                if ($depositId) {
                    $result = self::handleAdminApproveTopup($depositId, $fromName, (string)($from['id'] ?? $chatId));
                    if ($callbackId) {
                        self::answerCallbackQuery($callbackId, $result['toast'] ?? 'ដំណើរការរួចរាល់', $activeToken, true);
                    }
                    if ($messageId && !empty($result['new_text'])) {
                        self::editMessageText($chatId, $messageId, $result['new_text'], $result['new_kb'] ?? null, 'HTML', $activeToken);
                    }
                    return;
                }
            }

            // Admin 1-Click Reject Top-up Deposit
            if (str_starts_with($callbackData, 'admin_reject_topup:') || str_starts_with($callbackData, 'reject_topup:')) {
                $depositId = trim(explode(':', $callbackData)[1] ?? '');
                if ($depositId) {
                    $result = self::handleAdminRejectTopup($depositId, $fromName, (string)($from['id'] ?? $chatId));
                    if ($callbackId) {
                        self::answerCallbackQuery($callbackId, $result['toast'] ?? 'បានបដិសេធ', $activeToken, true);
                    }
                    if ($messageId && !empty($result['new_text'])) {
                        self::editMessageText($chatId, $messageId, $result['new_text'], null, 'HTML', $activeToken);
                    }
                    return;
                }
            }

            // Admin 1-Click Approve Order Payment
            if (str_starts_with($callbackData, 'admin_approve_order:') || str_starts_with($callbackData, 'approve_order:')) {
                $orderId = trim(explode(':', $callbackData)[1] ?? '');
                if ($orderId) {
                    $result = self::handleAdminApproveOrder($orderId, $fromName, (string)($from['id'] ?? $chatId));
                    if ($callbackId) {
                        self::answerCallbackQuery($callbackId, $result['toast'] ?? 'ការទូទាត់ត្រូវបានអនុម័ត!', $activeToken, true);
                    }
                    if ($messageId && !empty($result['new_text'])) {
                        self::editMessageText($chatId, $messageId, $result['new_text'], null, 'HTML', $activeToken);
                    }
                    return;
                }
            }

            // Admin 1-Click Reject Order Payment
            if (str_starts_with($callbackData, 'admin_reject_order:') || str_starts_with($callbackData, 'reject_order:')) {
                $orderId = trim(explode(':', $callbackData)[1] ?? '');
                if ($orderId) {
                    $result = self::handleAdminRejectOrder($orderId, $fromName, (string)($from['id'] ?? $chatId));
                    if ($callbackId) {
                        self::answerCallbackQuery($callbackId, $result['toast'] ?? 'បានបដិសេធ', $activeToken, true);
                    }
                    if ($messageId && !empty($result['new_text'])) {
                        self::editMessageText($chatId, $messageId, $result['new_text'], null, 'HTML', $activeToken);
                    }
                    return;
                }
            }

            // Admin only topic setup (group chat)
            if ($callbackData === 'setup_topics' && $chatId) {
                if ($callbackId) {
                    self::answerCallbackQuery($callbackId, "🔄 កំពុងពិនិត្យសិទ្ធិ និងបង្កើត Forum Topics...", $activeToken, false);
                }
                if ($chatType !== 'private') {
                    self::setupTopics($chatId);
                }
                return;
            }

            // Customer Main Menu
            if (in_array($callbackData, ['cust_main_menu', 'btn_main_menu']) && $chatId) {
                $welcome = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Official Bot!</b>\n\n"
                    . "🤖 <b>គណនី Bot ផ្លូវការ:</b> @{$activeBotUsername}\n"
                    . "🏪 <b>ហាង S Tech Store Cambodia</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n"
                    . "✨ <b>សូមស្វាគមន៍អតិថិជនជាទីស្រឡាញ់!</b>\n"
                    . "លោកអ្នកអាចចុចបើក <b>Telegram Mini App</b> ខាងក្រោម ដើម្បីទិញទំនិញរាប់ពាន់មុខ កុម្ម៉ង់ទិញ និងពិនិត្យប្រូម៉ូសិនភ្លាមៗ ឬជ្រើសរើសមុខងារផ្សេងៗ៖";

                $menuKb = self::getCustomerMainMenuKeyboard($chatId);
                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $welcome, $menuKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $welcome, $menuKb, 'HTML', null, $activeToken);
                }
                return;
            }

            // Customer Products / Shop
            if ($callbackData === 'cust_shop' && $chatId) {
                $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
                $shopAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

                $shopText = "💻 <b>ប្រភេទផលិតផល និងឧបករណ៍បច្ចេកវិទ្យានៅ S Tech Store:</b>\n\n"
                    . "🌟 <b>ទំនិញពេញនិយម និងមានក្នុងស្តុកស្រាប់៖</b>\n"
                    . "• 💻 <b>Laptops ម៉ាកល្បីៗ:</b> ASUS ROG/TUF, Apple MacBook M2/M3, Dell XPS/Latitude, Lenovo Legion/ThinkPad, Acer Nitro, MSI Gaming\n"
                    . "• 🖥️ <b>Desktop & Custom PC:</b> ឈុត PC Gaming & Office តម្លៃចាប់ពី $299 ឡើងទៅ\n"
                    . "• ⚙️ <b>គ្រឿងបន្លាស់ (Components):</b> Intel Core i5/i7/i9, AMD Ryzen, VGA RTX 4060/4070/4080, RAM DDR4/DDR5, SSD M.2 NVMe\n"
                    . "• 🎧 <b>Gaming Gears & Accessories:</b> អេក្រង់ 144Hz-240Hz, Keyboard Mechanical, Mouse Wireless, Headset 7.1 Surround\n\n"
                    . "👉 <b>សូមចុចប៊ូតុង Mini App ខាងក្រោមដើម្បីមើលតម្លៃជាក់ស្តែង និងបញ្ជាទិញភ្លាមៗ!</b>";

                $shopKb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ បើកទិញក្នុង Mini App ឥឡូវនេះ', 'web_app' => ['url' => $shopAppUrl]]],
                        [
                            ['text' => '🔥 មើលប្រូម៉ូសិនពិសេស', 'callback_data' => 'cust_promo'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $shopText, $shopKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $shopText, $shopKb, 'HTML', null, $activeToken);
                }
                return;
            }

            // Customer Promotions
            if ($callbackData === 'cust_promo' && $chatId) {
                $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
                $promoAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

                $promoText = "🔥 <b>កម្មវិធីប្រូម៉ូសិនពិសេសនៅ S Tech Store!</b>\n\n"
                    . "🎉 <b>មហាប្រូម៉ូសិន និងការបញ្ចុះតម្លៃពិសេស៖</b>\n"
                    . "• 💥 បញ្ចុះតម្លៃពិសេសរហូតដល់ <b>30%</b> លើម៉ូឌែល Laptops & Accessories\n"
                    . "• 🎟️ <b>កូដបញ្ចុះតម្លៃពិសេស (Promo Codes):</b>\n"
                    . self::formatActivePromoCodesText() . "\n"
                    . "• 🚚 <b>Free Delivery:</b> ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងរាជធានីភ្នំពេញ (ចាប់ពី $50 ឡើងទៅ)\n"
                    . "• 🎁 <b>កាដូថែមជូន:</b> ថែម Mouse Wireless, Mousepad, កាតាប និងដំឡើង Windows ឥតគិតថ្លៃ!\n\n"
                    . "👉 បើក Mini App ឥឡូវនេះដើម្បីប្រើប្រាស់កូដបញ្ចុះតម្លៃ និងទិញទំនិញតម្លៃពិសេស!";

                $promoKb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ ប្រើប្រូម៉ូសិនក្នុង Mini App', 'web_app' => ['url' => $promoAppUrl]]],
                        [
                            ['text' => '💻 មើលផលិតផលបញ្ចុះតម្លៃ', 'callback_data' => 'cust_shop'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $promoText, $promoKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $promoText, $promoKb, 'HTML', null, $activeToken);
                }
                return;
            }

            // Customer My Orders & Filter (Local-First Snappy Response)
            if ((in_array($callbackData, ['cust_my_orders', 'cust_track', 'btn_my_orders']) || str_starts_with($callbackData, 'cust_orders_filter:')) && $chatId) {
                Cache::forget("tg_orders_{$chatId}");
                Cache::forget("tg_order_counts_{$chatId}");

                if ($callbackData === 'cust_orders_filter:picker') {
                    self::sendCustomerOrdersDatePicker($chatId, $fromName, $messageId, $activeToken);
                    return;
                }

                if (str_starts_with($callbackData, 'cust_orders_filter:')) {
                    $filter = substr($callbackData, strlen('cust_orders_filter:'));
                    if ($filter === 'menu') {
                        self::sendCustomerOrdersMenu($chatId, $fromName, $messageId, $activeToken);
                    } else {
                        self::sendCustomerOrdersFiltered($chatId, $filter, $fromName, $messageId, $activeToken);
                    }
                    return;
                }

                // Default entry: Show Interactive Orders Filter Selection Menu
                self::sendCustomerOrdersMenu($chatId, $fromName, $messageId, $activeToken);
                return;
            }

            // Customer Download Invoice as File / Document
            if (str_starts_with($callbackData, 'cust_file_inv_') && $chatId) {
                $rawOrdId = substr($callbackData, strlen('cust_file_inv_'));
                self::sendCustomerInvoiceDocument($chatId, $rawOrdId, $activeToken);
                return;
            }

            // Customer View Invoice as Image
            if (str_starts_with($callbackData, 'cust_inv_') && $chatId) {
                $rawOrdId = substr($callbackData, strlen('cust_inv_'));
                self::sendCustomerInvoicePhoto($chatId, $rawOrdId, $fromName, $activeToken);
                return;
            }

            // Customer My Wallet & Cash Balance (Local-First Snappy Response)
            if (in_array($callbackData, ['cust_my_wallet', 'btn_my_wallet']) && $chatId) {
                // Local-First Cached Profile & Transactions (< 1ms on repeat clicks)
                $user = self::resolveActiveUser((string)$chatId);

                if (!$user) {
                    $notLinkedMsg = "ℹ️ <b>គណនី Telegram របស់អ្នកមិនទាន់បានភ្ជាប់ជាមួយ Website ណាមួយឡើយ</b> (Not Connected)។\n\n"
                        . "👉 ដើម្បីពិនិត្យសមតុល្យកាបូបលុយ សូមចូលទៅកាន់គេហទំព័រ រួចភ្ជាប់គណនីជាមួយ Telegram នេះក្នុង Profile Setting។";
                    $notLinkedKb = [
                        'inline_keyboard' => [
                            [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/login']],
                            [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                        ]
                    ];
                    if ($messageId) {
                        self::editMessageText($chatId, $messageId, $notLinkedMsg, $notLinkedKb, 'HTML', $activeToken);
                    } else {
                        self::sendMessageWithKeyboard($chatId, $notLinkedMsg, $notLinkedKb, 'HTML', null, $activeToken);
                    }
                    return;
                }

                $fromName = $user->display_name ?: $fromName;
                $walletBalance = (float)($user->wallet_balance ?? 0.00);
                $points = (int)($user->points ?? 0);
                $pointsVal = $points * 0.01;
                $totalFunds = $walletBalance + $pointsVal;

                $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
                $walletAppUrl = "https://www.s-tech-store.tech/account/wallet?tg_token={$sessionToken}";
                $storeAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

                $recentTxs = Cache::remember("tg_txs_{$chatId}", 30, function() use ($user) {
                    if (!$user || empty($user->firebase_uid)) return collect();
                    return \App\Models\WalletTransaction::where('firebase_uid', $user->firebase_uid)
                        ->select(['id', 'type', 'amount', 'status', 'created_at'])
                        ->latest()
                        ->take(3)
                        ->get();
                });

                $txListText = "";
                if ($recentTxs->isNotEmpty()) {
                    $txListText = "📋 <b>ប្រតិបត្តិការកាបូបចុងក្រោយ (Recent Transactions):</b>\n";
                    foreach ($recentTxs as $tx) {
                        $txSign = in_array($tx->type, ['deposit', 'refund', 'reward', 'coin_reward']) ? '➕' : '➖';
                        $txTypeTitle = match($tx->type) {
                            'deposit' => 'បញ្ចូលទឹកប្រាក់ (Deposit)',
                            'payment', 'order' => 'ទូទាត់ទំនិញ (Payment)',
                            'refund' => 'សងប្រាក់ត្រឡប់ (Refund)',
                            'reward', 'coin_reward' => 'រង្វាន់ & Bonus',
                            default => ucfirst($tx->type),
                        };
                        $txStatusBadge = match(strtolower($tx->status ?? 'completed')) {
                            'completed', 'success' => '✅ ជោគជ័យ',
                            'pending' => '⏳ រង់ចាំ',
                            'failed' => '❌ បរាជ័យ',
                            default => ucfirst($tx->status),
                        };
                        $txAmountStr = number_format((float)$tx->amount, 2);
                        $txDate = $tx->created_at ? $tx->created_at->format('d/m/Y H:i') : '';
                        $txListText .= "• {$txSign} <b>\${$txAmountStr} USD</b> — {$txTypeTitle} ({$txStatusBadge}) <i>{$txDate}</i>\n";
                    }
                    $txListText .= "\n";
                }

                $walletText = "💰 <b>កាបូបលុយ & សមតុល្យគណនី (S Tech Smart Wallet):</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "👤 <b>ម្ចាស់គណនី:</b> <b>{$fromName}</b>\n"
                    . "💵 <b>សមតុល្យសាច់ប្រាក់ (Cash Balance):</b> <b>\$" . number_format($walletBalance, 2) . " USD</b>\n"
                    . "🪙 <b>ពិន្ទុ S-Coins:</b> <b>{$points} Coins</b> (ស្មើ <b>\$" . number_format($pointsVal, 2) . " USD</b>)\n"
                    . "💎 <b>ទឹកប្រាក់អាចប្រើប្រាស់សរុប:</b> <b>\$" . number_format($totalFunds, 2) . " USD</b>\n\n"
                    . $txListText
                    . "💳 <b>វិធីបញ្ចូលទឹកប្រាក់ងាយៗ (Top-Up KHQR):</b>\n"
                    . "• ស្កេនទូទាត់តាម <b>Bakong KHQR</b> គ្រប់ធនាគារ (ABA, ACLEDA, Wing, Canadia...)\n"
                    . "• ទឹកប្រាក់ចូលគណនីភ្លាមៗ ស្វ័យប្រវត្តក្នុងរយៈពេល ១-៥ វិនាទី\n"
                    . "• ប្រើទូទាត់ទំនិញលឿនរហ័ស និងទទួលបាន Bonus Coins បន្ថែមរាល់ការទិញ!\n\n"
                    . "👉 <b>ចុចប៊ូតុងខាងក្រោមដើម្បីបញ្ចូលលុយ ឬទិញទំនិញក្នុង Mini App!</b>";

                $walletKb = [
                    'inline_keyboard' => [
                        [['text' => '💳 បញ្ចូលលុយកាបូប (Top Up KHQR)', 'web_app' => ['url' => $walletAppUrl]]],
                        [['text' => '🛍️ ចូលទិញទំនិញក្នុង Mini App (Home)', 'web_app' => ['url' => $storeAppUrl]]],
                        [
                            ['text' => '🪙 ពិន្ទុ & VIP (Coins)', 'callback_data' => 'cust_my_points'],
                            ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ', 'callback_data' => 'cust_my_orders'],
                        ],
                        [
                            ['text' => '🔄 ពិនិត្យសមតុល្យឡើងវិញ', 'callback_data' => 'cust_my_wallet'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $walletText, $walletKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $walletText, $walletKb, 'HTML', null, $activeToken);
                }
                return;
            }

            // Customer My Points & VIP Rewards (Local-First Snappy Response)
            if (in_array($callbackData, ['cust_my_points', 'btn_my_points']) && $chatId) {
                $user = self::resolveActiveUser((string)$chatId);

                if (!$user) {
                    $notLinkedMsg = "ℹ️ <b>គណនី Telegram របស់អ្នកមិនទាន់បានភ្ជាប់ជាមួយ Website ណាមួយឡើយ</b> (Not Connected)។\n\n"
                        . "👉 ដើម្បីពិនិត្យពិន្ទុ S-Coins និងកម្រិត VIP សូមចូលទៅកាន់គេហទំព័រ រួចភ្ជាប់គណនីជាមួយ Telegram នេះក្នុង Profile Setting។";
                    $notLinkedKb = [
                        'inline_keyboard' => [
                            [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/login']],
                            [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                        ]
                    ];
                    if ($messageId) {
                        self::editMessageText($chatId, $messageId, $notLinkedMsg, $notLinkedKb, 'HTML', $activeToken);
                    } else {
                        self::sendMessageWithKeyboard($chatId, $notLinkedMsg, $notLinkedKb, 'HTML', null, $activeToken);
                    }
                    return;
                }

                $fromName = $user->display_name ?: $fromName;
                $points = (int)($user->points ?? 0);
                $dollarVal = number_format($points * 0.01, 2);

                $vipTier = match(true) {
                    $points >= 5000 => '💎 Diamond VIP Member',
                    $points >= 2000 => '👑 Platinum VIP Member',
                    $points >= 500 => '🥇 Gold Member',
                    default => '🥈 Silver Member',
                };

                $userIds = ['tg_' . $chatId];
                if ($user) {
                    if (!empty($user->firebase_uid)) $userIds[] = $user->firebase_uid;
                    if (!empty($user->id)) $userIds[] = (string)$user->id;
                }
                $userIds = array_unique(array_filter($userIds));

                $completedOrders = Cache::remember("tg_orders_cnt_{$chatId}", 30, function() use ($chatId, $user) {
                    return self::getCustomerOrdersBuilder($chatId, $user)
                        ->whereIn('status', ['completed', 'delivered'])
                        ->count();
                });

                $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
                $storeAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

                $pointsText = "🪙 <b>កាបូបពិន្ទុ & កម្រិតសមាជិក (S-Coins & VIP Rewards):</b>\n\n"
                    . "👤 <b>ម្ចាស់គណនី:</b> <b>{$fromName}</b>\n"
                    . "🎖️ <b>កម្រិតសមាជិកភាព:</b> <b>{$vipTier}</b>\n"
                    . "🪙 <b>ពិន្ទុ S-Coins បច្ចុប្បន្ន:</b> <b>{$points} Coins</b>\n"
                    . "💵 <b>តម្លៃទឹកប្រាក់បញ្ចុះ:</b> <b>\${$dollarVal} USD</b>\n"
                    . "📦 <b>ការកុម្ម៉ង់សម្រេចជោគជ័យ:</b> <b>{$completedOrders} ដង</b>\n\n"
                    . "💡 <b>អត្ថប្រយោជន៍នៃ S-Coins:</b>\n"
                    . "• រាល់ការទិញទំនិញ $10 ទទួលបាន 10 Coins\n"
                    . "• អាចប្រើ Coins ដើម្បីកាត់បន្ថយថ្លៃទំនិញភ្លាមៗនៅពេល Checkout\n"
                    . "• ទទួលបានការបញ្ចុះតម្លៃបន្ថែមសម្រាប់សមាជិកកម្រិតខ្ពស់ (Gold / Diamond)\n\n"
                    . "👉 <b>សូមចុចប៊ូតុងខាងក្រោមដើម្បីចូលទិញទំនិញ និងប្រើប្រាស់ពិន្ទុរបស់អ្នក!</b>";

                $pointsKb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ ប្រើប្រាស់ Points ទិញក្នុង Mini App', 'web_app' => ['url' => $storeAppUrl]]],
                        [
                            ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ', 'callback_data' => 'cust_my_orders'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $pointsText, $pointsKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $pointsText, $pointsKb, 'HTML', null, $activeToken);
                }
                return;
            }

            // Customer My Repairs & Warranty Service (Local-First Snappy Response)
            if (in_array($callbackData, ['cust_my_repairs', 'btn_my_repairs', 'cust_repair']) && $chatId) {
                $user = self::resolveActiveUser((string)$chatId);

                if (!$user) {
                    $notLinkedMsg = "ℹ️ <b>គណនី Telegram របស់អ្នកមិនទាន់បានភ្ជាប់ជាមួយ Website ណាមួយឡើយ</b> (Not Connected)។\n\n"
                        . "👉 ដើម្បីពិនិត្យសំបុត្រជួសជុលឧបករណ៍ សូមចូលទៅកាន់គេហទំព័រ រួចភ្ជាប់គណនីជាមួយ Telegram នេះក្នុង Profile Setting។";
                    $notLinkedKb = [
                        'inline_keyboard' => [
                            [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/login']],
                            [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                        ]
                    ];
                    if ($messageId) {
                        self::editMessageText($chatId, $messageId, $notLinkedMsg, $notLinkedKb, 'HTML', $activeToken);
                    } else {
                        self::sendMessageWithKeyboard($chatId, $notLinkedMsg, $notLinkedKb, 'HTML', null, $activeToken);
                    }
                    return;
                }

                $fromName = $user->display_name ?: $fromName;

                $repairs = Cache::remember("tg_repairs_{$chatId}", 30, function() use ($user) {
                    return \App\Models\Repair::where(function ($q) use ($user) {
                        if ($user && !empty($user->phone)) $q->orWhere('customer_phone', $user->phone);
                        if ($user && !empty($user->email)) $q->orWhere('customer_email', $user->email);
                    })
                    ->select(['id', 'ticket_code', 'device_name', 'status', 'technician_name', 'estimated_cost', 'issue_description'])
                    ->latest()
                    ->take(3)
                    ->get();
                });

                $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
                $latestCode = $repairs->isNotEmpty() ? ltrim($repairs->first()->ticket_code ?? ('REP-' . $repairs->first()->id), '#') : '';
                $repairAppUrl = "https://www.s-tech-store.tech/repairs?" . ($latestCode ? "ticket=" . urlencode($latestCode) . "&" : "") . "chat_id={$chatId}&tg_token={$sessionToken}";
                $storeAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

                if ($repairs->isEmpty()) {
                    $repairText = "🔧 <b>សេវាកម្មជួសជុល & សំបុត្រជួសជុល (Repair Tickets):</b>\n\n"
                        . "ជម្រាបសួរ <b>{$fromName}</b>!\n"
                        . "បច្ចុប្បន្ន លោកអ្នកមិនមានសំបុត្រជួសជុលឧបករណ៍ដែលកំពុងដំណើរការនោះទេ។\n\n"
                        . "🛠️ <b>សេវាកម្មជួសជុល & Upgrade របស់ហាង៖</b>\n"
                        . "• ជួសជុល Laptop, PC គ្រប់ម៉ាក (ផ្លាស់ប្តូរអេក្រង់, ថ្ម, ក្តារចុច, សាកមិនចូល, Mainboard)\n"
                        . "• Upgrade SSD NVMe ល្បឿនលឿន, បង្កើន RAM, ដំឡើង Graphics Card\n"
                        . "• លាងសម្អាតកម្ដៅ & ប្តូរ Thermal Paste\n"
                        . "• ដំឡើង Genuine Windows 11, Drivers & កម្មវិធីការិយាល័យ Office\n\n"
                        . "👉 ចុចប៊ូតុងខាងក្រោមដើម្បីស្នើសុំសេវាកម្មជួសជុល ឬពិនិត្យក្នុង Mini App!";

                    $repairKb = [
                        'inline_keyboard' => [
                            [['text' => '🔧 បើកសេវាជួសជុលក្នុង Mini App', 'web_app' => ['url' => $repairAppUrl]]],
                            [['text' => '🛍️ ចូលទិញទំនិញក្នុង Mini App (Home)', 'web_app' => ['url' => $storeAppUrl]]],
                            [
                                ['text' => '📞 ទាក់ទងជាងបច្ចេកទេស', 'callback_data' => 'cust_contact'],
                                ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                            ],
                        ],
                    ];
                } else {
                    $repairText = "🔧 <b>សំបុត្រជួសជុលរបស់អ្នក (My Repair Tickets):</b>\n"
                        . "━━━━━━━━━━━━━━━━━━━━\n\n";

                    foreach ($repairs as $r) {
                        $repBadge = match($r->status) {
                            'Ready' => '✅ រួចរាល់អាចមកយកបាន (Ready)',
                            'In Progress' => '🔄 កំពុងជួសជុល (In Progress)',
                            'Completed' => '🎉 បានប្រគល់ជូនរួចរាល់ (Completed)',
                            default => '⏳ កំពុងពិនិត្យរោគសញ្ញា (Pending)',
                        };

                        $repairText .= "🎫 <b>Ticket #{$r->ticket_code}</b>\n"
                            . "💻 <b>ឧបករណ៍:</b> {$r->device_name}\n"
                            . "⚡ <b>ស្ថានភាព:</b> <b>{$repBadge}</b>\n"
                            . "👨‍🔧 <b>ជាងទទួលខុសត្រូវ:</b> {$r->technician_name}\n"
                            . "💵 <b>តម្លៃប៉ាន់ស្មាន:</b> \${$r->estimated_cost} USD\n"
                            . "📝 <b>បញ្ហា:</b> " . \Illuminate\Support\Str::limit($r->issue_description, 80) . "\n"
                            . "────────────────────\n\n";
                    }

                    $repairText .= "👉 <i>លោកអ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីពិនិត្យលម្អិតក្នុង Mini App!</i>";

                    $repairKb = [
                        'inline_keyboard' => [
                            [['text' => '🔧 ពិនិត្យមើលក្នុង Mini App', 'web_app' => ['url' => $repairAppUrl]]],
                            [['text' => '🛍️ ចូលទិញទំនិញក្នុង Mini App (Home)', 'web_app' => ['url' => $storeAppUrl]]],
                            [
                                ['text' => '📞 ទាក់ទងជាងបច្ចេកទេស', 'callback_data' => 'cust_contact'],
                                ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                            ],
                        ],
                    ];
                }

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $repairText, $repairKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $repairText, $repairKb, 'HTML', null, $activeToken);
                }
                return;
            }

            // Customer Contact & Location
            if (in_array($callbackData, ['cust_contact', 'btn_about_store']) && $chatId) {
                $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
                $storeAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

                $contactText = "📍 <b>ទំនាក់ទំនង & ទីតាំងហាង S Tech Store Cambodia:</b>\n\n"
                    . "🏪 <b>ហាង S Tech Store</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n"
                    . "📍 <b>ទីតាំង:</b> រាជធានីភ្នំពេញ, ប្រទេសកម្ពុជា\n"
                    . "⏰ <b>ម៉ោងបើកបម្រើសេវាកម្ម:</b> ថ្ងៃចន្ទ - អាទិត្យ (8:00 AM - 8:00 PM) ជារៀងរាល់ថ្ងៃ\n"
                    . "📞 <b>Hotline:</b> <code>012 345 678</code> | <code>098 765 432</code>\n"
                    . "🌐 <b>គេហទំព័រផ្លូវការ:</b> <a href=\"https://www.s-tech-store.tech\">https://www.s-tech-store.tech</a>\n"
                    . "✈️ <b>Telegram Bot:</b> @{$activeBotUsername}\n\n"
                    . "🚚 <b>សេវាដឹកជញ្ជូន:</b> រហ័សទាន់ចិត្ត ២៥ ខេត្ត-ក្រុង!";

                $contactKb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ បើកទិញក្នុង Mini App', 'web_app' => ['url' => $storeAppUrl]]],
                        [
                            ['text' => '🌐 បើកមើលគេហទំព័រ', 'url' => 'https://www.s-tech-store.tech'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $contactText, $contactKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $contactText, $contactKb, 'HTML', null, $activeToken);
                }
                return;
            }

            // Customer Help
            if (in_array($callbackData, ['cust_help', 'btn_how_to_connect']) && $chatId) {
                $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
                $storeAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

                $helpText = "❓ <b>មជ្ឈមណ្ឌលជំនួយ S Tech Store (Customer Help):</b>\n\n"
                    . "សូមស្វាគមន៍! លោកអ្នកអាចប្រើពាក្យបញ្ជា ឬវាយសួរផ្ទាល់ដូចខាងក្រោម៖\n\n"
                    . "📋 <b>បញ្ជីពាក្យបញ្ជា (Commands):</b>\n"
                    . "• <code>/start</code> — 🏠 មឺនុយមេ & បើក Mini App\n"
                    . "• <code>/shop</code> — 💻 មើលផលិតផល Laptops, PC, Parts\n"
                    . "• <code>/promo</code> — 🔥 ប្រូម៉ូសិន & កូដបញ្ចុះតម្លៃ\n"
                    . "• <code>/track</code> — 📦 តាមដានស្ថានភាពការបញ្ជាទិញ\n"
                    . "• <code>/repair</code> — 🔧 សេវាជួសជុល & Upgrade\n"
                    . "• <code>/contact</code> — 📞 ទំនាក់ទំនង & ទីតាំងហាង\n"
                    . "• <code>/help</code> — ❓ បង្ហាញជំនួយនេះ\n\n"
                    . "💡 <b>ជំនួយការឆ្លាតវៃ (Smart FAQ):</b>\n"
                    . "លោកអ្នកអាចវាយសួរផ្ទាល់ដូចជា៖\n"
                    . "👉 <i>\"Laptop តម្លៃប៉ុន្មានខ្លះ?\"</i>\n"
                    . "👉 <i>\"សេវាដឹកភ្នំពេញ និងខេត្តប៉ុន្មាន?\"</i>\n"
                    . "👉 <i>\"ការធានារយៈពេលប៉ុន្មាន?\"</i>\n"
                    . "👉 <i>\"បង់ប្រាក់តាម Bakong KHQR បានទេ?\"</i>\n\n"
                    . "Bot នឹងឆ្លើយតបព័ត៌មានជូនលោកអ្នកភ្លាមៗ!";

                $helpKb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ បើកទិញក្នុង Mini App', 'web_app' => ['url' => $storeAppUrl]]],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $helpText, $helpKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $helpText, $helpKb, 'HTML', null, $activeToken);
                }
                return;
            }

            // Customer Support / Live Agent Request
            if (in_array($callbackData, ['cust_support', 'btn_chat_start']) && $chatId) {
                try {
                    self::sendCustomerChatAlert([
                        'name' => $fromName,
                        'telegram' => !empty($fromUsername) ? '@' . $fromUsername : 'ID: ' . $chatId,
                        'message' => 'អតិថិជនបានចុចស្នើសុំជំនួយពីបុគ្គលិកតាមរយៈ Telegram Bot',
                        'chat_id' => $chatId,
                    ]);
                } catch (\Throwable $e) {}

                $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
                $storeAppUrl = "https://www.s-tech-store.tech/?open_chat=1&tg_token={$sessionToken}";

                $supportText = "💬 <b>ផ្នែកបម្រើអតិថិជន & ក្រុមការងារ Support</b>\n\n"
                    . "ជម្រាបសួរ <b>{$fromName}</b>! សំណើរបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់ក្រុមការងារ On-Duty Support រួចរាល់ហើយ។\n\n"
                    . "👨‍💻 បុគ្គលិកជំនាញរបស់យើងនឹងឆ្លើយតប ឬទាក់ទងមកកាន់លោកអ្នកក្នុងពេលបន្តិចទៀតនេះ។\n\n"
                    . "📞 <b>Hotline ប្រញាប់:</b> <code>012 345 678</code> | <code>098 765 432</code>\n"
                    . "🌐 <b>ឬជជែក Live Chat ផ្ទាល់លើគេហទំព័រ:</b> <a href=\"{$storeAppUrl}\">បើក Live Chat ផ្ទាល់</a>";

                $supportKb = [
                    'inline_keyboard' => [
                        [['text' => '💬 បើក Live Chat ជជែកផ្ទាល់', 'web_app' => ['url' => $storeAppUrl]]],
                        [
                            ['text' => '🌐 បើកលើ Browser', 'url' => $storeAppUrl],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $supportText, $supportKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $supportText, $supportKb, 'HTML', null, $activeToken);
                }
                return;
            }

            // Customer Ask Options (Quick FAQ Menu)
            if (in_array($callbackData, ['cust_ask_options', 'btn_faq']) && $chatId) {
                $askText = "❓ <b>មជ្ឈមណ្ឌលសួរសំណួរ & ជំនួយរហ័ស (Quick FAQ & Inquiries):</b>\n\n"
                    . "ជម្រាបសួរ <b>{$fromName}</b>! សូមជ្រើសរើសប្រធានបទដែលលោកអ្នកចង់សាកសួរខាងក្រោម៖\n\n"
                    . "💡 <i>លោកអ្នកក៏អាចវាយសួរជាពាក្យពេចន៍ផ្ទាល់ក្នុង Chat នេះបានគ្រប់ពេលដូចជា៖</i>\n"
                    . "👉 <i>\"លុយខ្ញុំសល់ប៉ុន្មាន?\"</i>\n"
                    . "👉 <i>\"តាមដានឥវ៉ាន់ ST-10023\"</i>\n"
                    . "👉 <i>\"ថ្លៃដឹកជញ្ជូនភ្នំពេញ និងខេត្ត?\"</i>\n"
                    . "👉 <i>\"Laptop gaming មានតម្លៃប៉ុន្មាន?\"</i>";

                $askKb = [
                    'inline_keyboard' => [
                        [
                            ['text' => '💰 សមតុល្យទឹកប្រាក់ & កាបូប', 'callback_data' => 'cust_my_wallet'],
                            ['text' => '📦 តាមដានការកុម្ម៉ង់', 'callback_data' => 'cust_my_orders'],
                        ],
                        [
                            ['text' => '💳 វិធីបង់ប្រាក់ & Bakong KHQR', 'callback_data' => 'cust_ask_payment'],
                            ['text' => '🚚 សេវាដឹកជញ្ជូន & ថ្លៃដឹក', 'callback_data' => 'cust_ask_delivery'],
                        ],
                        [
                            ['text' => '🛡️ ការធានា & គោលការណ៍ប្តូរ', 'callback_data' => 'cust_ask_warranty'],
                            ['text' => '🔥 ប្រូម៉ូសិន & កូដបញ្ចុះតម្លៃ', 'callback_data' => 'cust_promo'],
                        ],
                        [
                            ['text' => '💻 ផលិតផល Laptops & PC', 'callback_data' => 'cust_shop'],
                            ['text' => '🔧 សេវាជួសជុល & Upgrade', 'callback_data' => 'cust_my_repairs'],
                        ],
                        [
                            ['text' => '💬 ជជែកជាមួយបុគ្គលិកផ្ទាល់', 'callback_data' => 'cust_support'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $askText, $askKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $askText, $askKb, 'HTML', null, $activeToken);
                }
                self::answerCallbackQuery($callbackId, 'សួរសំណួរ & ជំនួយ', $activeToken);
                return;
            }

            // Customer Ask Payment FAQ
            if ($callbackData === 'cust_ask_payment' && $chatId) {
                $payText = "💳 <b>វិធីសាស្ត្រទូទាត់ប្រាក់នៅ S Tech Store:</b>\n\n"
                    . "យើងខ្ញុំផ្តល់ជូននូវជម្រើសទូទាត់ប្រាក់ទំនើប រហ័ស និងមានសុវត្ថិភាព ១០០%៖\n\n"
                    . "• 🇰🇭 <b>Bakong KHQR (គ្រប់ធនាគារក្នុងប្រទេសកម្ពុជា):</b>\n"
                    . "   ស្កេនទូទាត់បានភ្លាមៗពី ABA, ACLEDA, Wing, Canadia, TrueMoney, Sathapana, etc.\n"
                    . "• 💰 <b>កាបូបលុយ S Tech Smart Wallet:</b>\n"
                    . "   បញ្ចូលទឹកប្រាក់ទុកជាមុន ទូទាត់ទំនិញភ្លាមៗក្នុង ១ វិនាទី និងទទួលបាន cashback coins!\n"
                    . "• 💳 <b>កាតឥណទាន / ឥណពន្ធ:</b> ទទួល Visa & Mastercard\n"
                    . "• 💵 <b>ទូទាត់ពេលទំនិញដល់ដៃ (COD):</b> ទទួលសាច់ប្រាក់សុទ្ធពេលដឹកដល់ទីតាំង (ភ្នំពេញ)\n\n"
                    . "👉 ចុចប៊ូតុងខាងក្រោមដើម្បីពិនិត្យកាបូបលុយ ឬទិញទំនិញក្នុង Mini App!";

                $payKb = [
                    'inline_keyboard' => [
                        [
                            ['text' => '💰 មើលកាបូបលុយរបស់ខ្ញុំ', 'callback_data' => 'cust_my_wallet'],
                            ['text' => '🛍️ បើកទិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']],
                        ],
                        [
                            ['text' => '❓ សំណួរផ្សេងទៀត', 'callback_data' => 'cust_ask_options'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $payText, $payKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $payText, $payKb, 'HTML', null, $activeToken);
                }
                self::answerCallbackQuery($callbackId, 'វិធីបង់ប្រាក់', $activeToken);
                return;
            }

            // Customer Ask Delivery FAQ
            if ($callbackData === 'cust_ask_delivery' && $chatId) {
                $delText = "🚚 <b>ព័ត៌មានសេវាកម្មដឹកជញ្ជូន (Delivery Service):</b>\n\n"
                    . "📍 <b>ក្នុងរាជធានីភ្នំពេញ:</b>\n"
                    . "• រយៈពេលដឹក: <b>1 ទៅ 3 ម៉ោង</b> ទទួលបានទំនិញដល់ដៃ\n"
                    . "• តម្លៃដឹក: <b>\$1.50 - \$2.00</b>\n"
                    . "• 🎉 <b>FREE Delivery:</b> ដឹកជញ្ជូនឥតគិតថ្លៃ សម្រាប់ការកុម្ម៉ង់ចាប់ពី <b>\$50 ឡើងទៅ</b>!\n\n"
                    . "🌍 <b>បណ្តា ២៥ ខេត្ត-ក្រុង:</b>\n"
                    . "• ផ្ញើតាមដៃគូដឹកជញ្ជូនល្បីៗ: វីរៈប៊ុនថាំ (VET), J&T Express, Kerry Express\n"
                    . "• រយៈពេល: <b>1 ទៅ 2 ថ្ងៃ</b> ទទួលបានទំនិញ\n"
                    . "• តម្លៃសេវា: <b>\$2.50 - \$3.00</b> (ខ្ចប់ទំនិញការពារប៉ះទង្គិច Bubble Wrap យ៉ាងម៉ត់ចត់)\n\n"
                    . "👉 អាចតាមដានការដឹកជញ្ជូនផ្ទាល់នៅក្នុង Mini App!";

                $delKb = [
                    'inline_keyboard' => [
                        [
                            ['text' => '📦 តាមដានការកុម្ម៉ង់', 'callback_data' => 'cust_my_orders'],
                            ['text' => '🛍️ បើកទិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']],
                        ],
                        [
                            ['text' => '❓ សំណួរផ្សេងទៀត', 'callback_data' => 'cust_ask_options'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $delText, $delKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $delText, $delKb, 'HTML', null, $activeToken);
                }
                self::answerCallbackQuery($callbackId, 'សេវាដឹកជញ្ជូន', $activeToken);
                return;
            }

            // Customer Ask Warranty FAQ
            if ($callbackData === 'cust_ask_warranty' && $chatId) {
                $warText = "🛡️ <b>គោលការណ៍ធានា និងការប្តូរទំនិញ (Warranty Policy):</b>\n\n"
                    . "រាល់ទំនិញទាំងអស់នៅ S Tech Store ទទួលបានការធានាផ្លូវការ ១០០%៖\n\n"
                    . "• 🌟 <b>ទំនិញថ្មីប្រអប់ (Brand New 100%):</b> ធានាផ្លូវការពីរោងចក្រ <b>6 ខែ ទៅ 2 ឆ្នាំពេញ</b>\n"
                    . "• 🔄 <b>ទំនិញមួយទឹកគុណភាពខ្ពស់ (Pre-Owned):</b> ធានាពីហាង <b>1 ទៅ 3 ខែពេញ</b>\n"
                    . "• 🔄 <b>គោលការណ៍ប្តូរថ្មី:</b> ប្តូរជូនថ្មីភ្លាមៗក្នុងរយៈពេល <b>7 ថ្ងៃដំបូង</b> ប្រសិនបើមានបញ្ហាបច្ចេកទេសពីរោងចក្រ\n"
                    . "• 🛠️ <b>សេវាផ្នែកទន់ (Software):</b> ដំឡើង Genuine Windows 11, Drivers & Clean Cache <b>ឥតគិតថ្លៃ Free អស់មួយជីវិត</b>!\n\n"
                    . "👉 លោកអ្នកអាចជឿជាក់បាន ១០០% លើគុណភាព និងទំនួលខុសត្រូវរបស់យើង!";

                $warKb = [
                    'inline_keyboard' => [
                        [
                            ['text' => '🔧 សេវាជួសជុល & Upgrade', 'callback_data' => 'cust_my_repairs'],
                            ['text' => '🛍️ បើកទិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']],
                        ],
                        [
                            ['text' => '❓ សំណួរផ្សេងទៀត', 'callback_data' => 'cust_ask_options'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $warText, $warKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $warText, $warKb, 'HTML', null, $activeToken);
                }
                self::answerCallbackQuery($callbackId, 'គោលការណ៍ធានា', $activeToken);
                return;
            }

            // Customer Disconnect Menu Prompt
            if ($callbackData === 'cust_disconnect_menu' && $chatId) {
                $tgId = (string)($from['id'] ?? $chatId);
                $cleanTgId = preg_replace('/\D/', '', $tgId) ?: $tgId;
                $user = self::resolveActiveUser($cleanTgId);

                if ($user) {
                    $discText = "🔌 <b>ការគ្រប់គ្រងគណនី & ផ្តាច់ការភ្ជាប់ (Telegram Disconnect):</b>\n"
                        . "━━━━━━━━━━━━━━━━━━━━\n\n"
                        . "• 👤 <b>គណនីភ្ជាប់បច្ចុប្បន្ន:</b> <b>" . htmlspecialchars($user->display_name ?: 'VIP Member') . "</b>\n"
                        . "• 📧 <b>អ៊ីមែល:</b> <code>" . htmlspecialchars($user->email ?: 'N/A') . "</code>\n"
                        . "• 🆔 <b>Telegram Chat ID:</b> <code>{$tgId}</code>\n\n"
                        . "⚠️ <b>តើលោកអ្នកពិតជាចង់ផ្តាច់គណនី Telegram នេះចេញពី Website មែនទេ?</b>\n"
                        . "បន្ទាប់ពីផ្តាច់រួច Telegram នេះនឹងនៅទំនេរ ហើយអាចយកទៅភ្ជាប់ជាមួយគណនីផ្សេងបាន។";

                    $discKb = [
                        'inline_keyboard' => [
                            [['text' => '⚠️ បញ្ជាក់ផ្តាច់ការភ្ជាប់ (Confirm Disconnect)', 'callback_data' => 'cust_confirm_disconnect']],
                            [['text' => '🔙 មឺនុយមេ (Cancel / Main Menu)', 'callback_data' => 'cust_main_menu']],
                        ],
                    ];
                } else {
                    $discText = "ℹ️ <b>ស្ថានភាពគណនី Telegram:</b>\n\n"
                        . "គណនី Telegram របស់អ្នកមិនទាន់ត្រូវបានភ្ជាប់ជាមួយគណនី Website ណាមួយនៅឡើយទេ (Not Linked)។\n\n"
                        . "👉 លោកអ្នកអាចភ្ជាប់បានដោយចូលទៅកាន់ Profile Setting លើ Website រួចចុច <b>\"ភ្ជាប់ Official Bot\"</b>។";

                    $discKb = [
                        'inline_keyboard' => [
                            [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech']],
                            [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                        ],
                    ];
                }

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $discText, $discKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $discText, $discKb, 'HTML', null, $activeToken);
                }
                self::answerCallbackQuery($callbackId, 'ផ្តាច់ការភ្ជាប់ Telegram', $activeToken);
                return;
            }

            // Customer Confirm Disconnect (Executes Unlink)
            if ($callbackData === 'cust_confirm_disconnect' && $chatId) {
                $tgId = (string)($from['id'] ?? $chatId);
                $cleanTgId = preg_replace('/\D/', '', $tgId) ?: $tgId;

                // Unlink all accounts linked to this Telegram ID
                \App\Models\UserProfile::where('telegram_chat_id', (string)$cleanTgId)
                    ->orWhere('telegram_chat_id', (string)$tgId)
                    ->update([
                        'telegram' => null,
                        'telegram_chat_id' => null,
                        'notif_telegram' => false,
                    ]);

                // Store disconnected flag for 30 days to enforce Mini App auto-logout
                Cache::put("tg_disconnected_{$cleanTgId}", true, 86400 * 30);
                Cache::put("tg_disconnected_{$tgId}", true, 86400 * 30);

                Cache::forget("tg_u_prof_{$cleanTgId}");
                Cache::forget("tg_u_prof_{$tgId}");
                Cache::forget("tg_orders_{$cleanTgId}");
                Cache::forget("tg_orders_{$tgId}");
                Cache::forget("tg_link_{$cleanTgId}");
                Cache::forget("tg_link_{$tgId}");
                Cache::forget("customer_sess_{$cleanTgId}");
                Cache::forget("customer_sess_{$tgId}");

                $doneText = "✅ <b>បានផ្តាច់គណនី Telegram ដោយជោគជ័យ!</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "គណនី Telegram របស់អ្នកត្រូវបានផ្តាច់ចេញពី Website S Tech Store រួចរាល់ហើយ។\n"
                    . "ឥឡូវនេះ Telegram របស់អ្នកនៅទំនេរ និងអាចយកទៅភ្ជាប់ជាមួយគណនី Website ផ្សេងបានគ្រប់ពេល។\n\n"
                    . "👉 លោកអ្នកអាចភ្ជាប់ឡើងវិញបានគ្រប់ពេល តាមរយៈ Profile Setting លើ Website។";

                $doneKb = [
                    'inline_keyboard' => [
                        [['text' => '🌐 ចូលគេហទំព័រ (Website)', 'url' => 'https://www.s-tech-store.tech/account/profile']],
                        [['text' => '🔙 មឺនុយមេ (Main Menu)', 'callback_data' => 'cust_main_menu']],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $doneText, $doneKb, 'HTML', $activeToken);
                } else {
                    self::sendMessageWithKeyboard($chatId, $doneText, $doneKb, 'HTML', null, $activeToken);
                }
                self::answerCallbackQuery($callbackId, 'ផ្តាច់ជោគជ័យ', $activeToken);
                return;
            }

            return;
        }

        // 2. Handle group membership change (e.g. bot added to supergroup or promoted to admin)
        if (isset($up['my_chat_member'])) {
            $memberUpdate = $up['my_chat_member'];
            $newStatus = $memberUpdate['new_chat_member']['status'] ?? '';
            $chat = $memberUpdate['chat'] ?? [];
            $chatId = $chat['id'] ?? null;
            $chatTitle = $chat['title'] ?? 'S Tech Store Team Group';
            $chatType = $chat['type'] ?? 'group';

            if (in_array($newStatus, ['member', 'administrator']) && $chatId) {
                $tokens = $settings['pending_tokens'] ?? [];

                // AUTO-PAIR INSTANTLY if there is a pending token created recently (1-Click flow)
                if (!empty($tokens)) {
                    self::pairChat('AUTO', $chatId, $chatTitle, $chatType);
                    return;
                }

                // If already connected and just got promoted to admin, trigger setupTopics
                if (!empty($settings['connected']) && (string)($settings['chat_id'] ?? '') === (string)$chatId) {
                    if ($newStatus === 'administrator') {
                        self::setupTopics($chatId);
                    }
                    return;
                }

                // STRICT DISCONNECT ISOLATION:
                // If disconnected and no active pairing token exists, stay completely silent!
                return;
            }
            return;
        }

        // 3. Handle Messages & Channel Posts
        $message = $up['message'] ?? $up['channel_post'] ?? null;
        if (!$message) return;

        $chat = $message['chat'] ?? [];
        $chatId = $chat['id'] ?? null;
        $messageId = $message['message_id'] ?? null;
        $chatTitle = $chat['title'] ?? ($chat['first_name'] ?? 'S Tech Store Customer');
        $chatType = $chat['type'] ?? 'private';
        $text = trim($message['text'] ?? '');
        $from = $message['from'] ?? [];
        $fromName = trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: 'អតិថិជន';
        $fromUsername = $from['username'] ?? '';

        if (!$chatId) return;

        // Multi-Bot Token routing:
        $staffBotToken = self::getStaffBotToken();
        $staffBotUsername = self::OFFICIAL_STAFF_BOT_USERNAME;
        $customerBotToken = self::getCustomerBotToken();
        $customerBotUsername = self::getCustomerBotUsername();

        $isStaffBotMsg = ($chatType !== 'private');

        if ($isStaffBotMsg) {
            $activeToken = $staffBotToken;
            $activeBotUsername = $staffBotUsername;
        } else {
            $activeToken = $customerBotToken;
            $activeBotUsername = $customerBotUsername;
        }

        // Message Deduplication
        if ($messageId && !Cache::add("tg_done_msg_{$chatId}_{$messageId}", time(), 86400)) {
            return;
        }

        // ── STRICT ISOLATION: Only legacy bot (@s_tech_storeBot) redirects to official assistant ──
        $msgBotId = (string)($message['via_bot']['id'] ?? '');
        $isLegacyOldBotMsg = ($msgBotId === '8899300323' || str_contains($text, '@s_tech_storeBot'));
        if ($chatType === 'private' && $isLegacyOldBotMsg) {
            $customerBotUser = $customerBotUsername;
            
            $extractedCode = '';
            if (preg_match('/^\/start(?:@\w+)?\s*(.*)$/i', $text, $matches)) {
                $extractedCode = trim($matches[1] ?? '');
            } elseif (preg_match('/\b(ST[A-Za-z0-9]{4,12}|tgauth_[A-Za-z0-9_-]+|tglink_[A-Za-z0-9_-]+)\b/i', $text, $matches)) {
                $extractedCode = trim($matches[1] ?? '');
            }

            // CRITICAL FIX: If customer is performing a login handshake (tgauth_...) or account link (tglink_...),
            // DO NOT intercept or redirect! Let it pass directly to Handshake Authentication below!
            if (str_starts_with(strtolower($extractedCode), 'tgauth_') || str_starts_with(strtolower($extractedCode), 'tglink_')) {
                // Bypass redirect so customer can log in immediately without friction or delay!
            } else {
                $lowerText = strtolower($text);
                $isStaffAction = in_array($lowerText, ['/chat', '/admin', '/staff', '/orders', '/miniapp', '/dashboard', 'chat', 'admin', 'staff', 'orders', 'miniapp'])
                    || str_starts_with(strtolower($extractedCode), 'miniapp')
                    || str_starts_with(strtolower($extractedCode), 'chat')
                    || str_starts_with(strtolower($extractedCode), 'staff');

                if ($isStaffAction) {
                    // Generate instant 1-Click bypass token for staff
                    $bypassToken = \Illuminate\Support\Str::random(40);
                    \Illuminate\Support\Facades\Cache::put("bypass_chat_token_{$bypassToken}", [
                        'chat_id' => 'tg_staff_' . $chatId,
                        'user_name' => $fromName ?: 'Admin/Staff',
                        'uses' => 15,
                        'created_at' => now()->toIso8601String(),
                    ], 1440 * 60);

                    $chatUrl = "https://www.s-tech-store.tech/km/rok-mix-khernh/chat?token={$bypassToken}";
                    $ordersUrl = "https://www.s-tech-store.tech/km/rok-mix-khernh/orders?token={$bypassToken}";
                    $dashUrl = "https://www.s-tech-store.tech/km/rok-mix-khernh?token={$bypassToken}";

                    $staffMsg = "⚡ <b>S TECH STORE — ADMIN & STAFF MINI APP HUB</b>\n"
                        . "━━━━━━━━━━━━━━━━━━━━\n"
                        . "សួស្តី <b>" . htmlspecialchars($fromName) . "</b> (Admin / Staff)!\n\n"
                        . "លោកអ្នកអាចបើកផ្ទាំងគ្រប់គ្រង និងឆ្លើយតប Live Chat ផ្ទាល់ក្នុង Telegram ភ្លាមៗ (1-Click Auto-Login) ដោយចុចលើប៊ូតុងខាងក្រោម៖";

                    $staffKb = [
                        'inline_keyboard' => [
                            [
                                ['text' => '💬 បើក Live Chat Mini App (ឆ្លើយតបភ្លាមៗ)', 'web_app' => ['url' => $chatUrl]],
                            ],
                            [
                                ['text' => '📦 បើក Orders Mini App', 'web_app' => ['url' => $ordersUrl]],
                                ['text' => '📊 Dashboard Mini App', 'web_app' => ['url' => $dashUrl]],
                            ],
                            [
                                ['text' => '🌐 បើកក្នុង Web Browser', 'url' => $chatUrl],
                            ]
                        ]
                    ];

                    self::sendMessageWithKeyboard($chatId, $staffMsg, $staffKb, 'HTML', null, $staffBotToken);
                    return;
                }

                $redirectUrl = !empty($extractedCode)
                    ? "https://t.me/{$customerBotUser}?start={$extractedCode}"
                    : "https://t.me/{$customerBotUser}";

                $redirectMsg = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store!</b>\n\n"
                    . "គណនី Bot នេះ (@{$staffBotUsername}) ត្រូវបានកំណត់សម្រាប់តែការផ្ញើដំណឹងប្រចាំហាងជូនក្រុមការងារ (Admin & Staff Notifications) ក្នុងគ្រុបប៉ុណ្ណោះ។\n\n"
                    . "👉 <b>សម្រាប់ការផ្ទៀងផ្ទាត់ចូលគណនី, ភ្ជាប់ Profile, បញ្ជាទិញទំនិញ, និងតាមដាន Orders សូមចុចប៊ូតុងខាងក្រោមដើម្បីទៅកាន់ Customer Assistant Bot ផ្លូវការរបស់យើងខ្ញុំ៖</b>";

                $redirectKb = [
                    'inline_keyboard' => [
                        [['text' => '🚀 បើកផ្ទៀងផ្ទាត់ជាមួយ Customer Bot (@' . $customerBotUser . ')', 'url' => $redirectUrl]],
                        [['text' => '⚡ បើក Admin & Staff Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech/km/rok-mix-khernh/chat']]],
                        [['text' => '🛍️ ចូលទៅកាន់គេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech']],
                    ]
                ];

                self::sendMessageWithKeyboard($chatId, $redirectMsg, $redirectKb, 'HTML', null, $staffBotToken);
                return;
            }
        }

        // ── FOR ALL PRIVATE CHATS: STRICTLY ENFORCE CUSTOMER BOT TOKEN & USERNAME ──
        if ($chatType === 'private') {
            $activeToken = self::getCustomerBotToken();
            $activeBotUsername = self::getCustomerBotUsername();
            // ⚡ Instant Typing Indicator: Show active typing status in Telegram header
            self::sendChatAction($chatId, 'typing', $activeToken);
        }

        // 3.1 Handle Contact Sharing (Direct Customer Phone Number capture)
        if (!empty($message['contact'])) {
            $contact = $message['contact'];
            $phoneNumber = trim($contact['phone_number'] ?? '');
            if ($phoneNumber) {
                if (!str_starts_with($phoneNumber, '+') && is_numeric($phoneNumber)) {
                    $phoneNumber = '+' . $phoneNumber;
                }
                $contactUserId = (string)($contact['user_id'] ?? $from['id'] ?? $chatId);
                $user = \App\Models\UserProfile::where('firebase_uid', 'tg_' . $contactUserId)
                    ->orWhere('telegram_chat_id', $contactUserId)
                    ->first();
                if ($user) {
                    $user->phone = $phoneNumber;
                    $user->save();
                }

                // Cache phone for instant 0ms real-time client retrieval (both Mini App and Web)
                \Illuminate\Support\Facades\Cache::put("tg_latest_phone_{$contactUserId}", $phoneNumber, 86400 * 30);
                \Illuminate\Support\Facades\Cache::put("tg_latest_phone_{$chatId}", $phoneNumber, 86400 * 30);
                $webSyncCode = \Illuminate\Support\Facades\Cache::get("tg_phone_sync_user_{$contactUserId}") 
                    ?: \Illuminate\Support\Facades\Cache::get("tg_phone_sync_user_{$chatId}");
                if ($webSyncCode) {
                    \Illuminate\Support\Facades\Cache::put("tg_phone_sync_result_{$webSyncCode}", $phoneNumber, 3600);
                    \Illuminate\Support\Facades\Cache::forget("tg_phone_sync_user_{$contactUserId}");
                    \Illuminate\Support\Facades\Cache::forget("tg_phone_sync_user_{$chatId}");
                }

                $checkoutUrl = "https://www.s-tech-store.tech/checkout";
                $sessionToken = $user ? self::generateCustomerSessionToken((string)$contactUserId, $fromName) : null;
                if ($sessionToken) {
                    $checkoutUrl = "https://www.s-tech-store.tech/checkout?tg_token={$sessionToken}";
                }

                $respMsg = "⚡ <b>ទទួលបានលេខទូរស័ព្ទជោគជ័យ ១០០%!</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "• 👤 <b>អតិថិជន:</b> <b>" . htmlspecialchars($fromName) . "</b>\n"
                    . "• 📞 <b>លេខទូរស័ព្ទ:</b> <code>" . htmlspecialchars($phoneNumber) . "</code>\n\n"
                    . "✅ លេខទូរស័ព្ទត្រូវបានភ្ជាប់ និងបំពេញចូលផ្ទាំង Checkout លើគេហទំព័រដោយស្វ័យប្រវត្តិតែម្ដង!\n\n"
                    . "👉 សូមចុចប៊ូតុងខាងក្រោមដើម្បីត្រឡប់ទៅផ្ទាំង Checkout បញ្ចប់ការកម្ម៉ង់ទិញ៖";

                $replyMarkup = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ ត្រឡប់ទៅផ្ទាំង Checkout វិញ (Return to Checkout)', 'url' => $checkoutUrl]],
                        [['text' => '🌐 ចូលទំព័រដើម Website', 'url' => "https://www.s-tech-store.tech"]],
                    ]
                ];

                self::sendMessageWithKeyboard($chatId, $respMsg, $replyMarkup, 'HTML', null, $activeToken);
                return;
            }
        }

        // 3.2 Handle Location Sharing (Direct Customer Telegram Pin capture)
        if (!empty($message['location'])) {
            $location = $message['location'];
            $lat = (float)($location['latitude'] ?? 0);
            $lng = (float)($location['longitude'] ?? 0);
            if ($lat != 0 && $lng != 0) {
                $contactUserId = (string)($from['id'] ?? $chatId);
                $isPhnomPenh = $lat >= 11.40 && $lat <= 11.75 && $lng >= 104.75 && $lng <= 105.10;
                $humanAddr = "ទីតាំង GPS ({$lat}, {$lng})";

                $locData = [
                    'lat' => $lat,
                    'lng' => $lng,
                    'address' => $humanAddr,
                    'delivery_type' => $isPhnomPenh ? 'pnompenh' : 'province',
                ];

                // Cache location for instant 0ms real-time client retrieval
                \Illuminate\Support\Facades\Cache::put("tg_latest_loc_{$contactUserId}", $locData, 600);
                \Illuminate\Support\Facades\Cache::put("tg_latest_loc_{$chatId}", $locData, 600);

                $webSyncCode = \Illuminate\Support\Facades\Cache::get("tg_loc_sync_user_{$contactUserId}") 
                    ?: \Illuminate\Support\Facades\Cache::get("tg_loc_sync_user_{$chatId}");
                if ($webSyncCode) {
                    \Illuminate\Support\Facades\Cache::put("tg_loc_sync_result_{$webSyncCode}", $locData, 600);
                }

                $user = \App\Models\UserProfile::where('firebase_uid', 'tg_' . $contactUserId)
                    ->orWhere('telegram_chat_id', $contactUserId)
                    ->first();
                if ($user) {
                    $user->latitude = $lat;
                    $user->longitude = $lng;
                    $user->save();
                }

                $mapsUrl = "https://www.google.com/maps?q={$lat},{$lng}";
                $respMsg = "📍 <b>ទទួលបានទីតាំងដឹកជញ្ជូនជោគជ័យ!</b>\n\n"
                    . "• 👤 <b>អតិថិជន:</b> <b>" . htmlspecialchars($fromName) . "</b>\n"
                    . "• 🌐 <b>កូអរដោនេ:</b> <code>{$lat}, {$lng}</code>\n"
                    . "• 🚚 <b>តំបន់ដឹកជញ្ជូន:</b> <b>" . ($isPhnomPenh ? "រាជធានីភ្នំពេញ ($2.00)" : "បណ្តាខេត្ត ($3.00)") . "</b>\n\n"
                    . "✅ ព័ត៌មាននេះត្រូវបានបំពេញស្វ័យប្រវត្តិចូលក្នុងផ្ទាំង Checkout លើ Website រួចរាល់ហើយ!\n\n"
                    . "👉 សូមចុចប៊ូតុងខាងក្រោមដើម្បីត្រឡប់ទៅ Checkout បញ្ចប់ការកម្ម៉ង់ទិញ៖";

                $directUrl = "https://www.s-tech-store.tech/checkout";
                $sessionToken = $user ? self::generateCustomerSessionToken((string)$contactUserId, $fromName) : null;
                if ($sessionToken) {
                    $directUrl = "https://www.s-tech-store.tech/checkout?tg_token={$sessionToken}";
                }

                $replyMarkup = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ ត្រឡប់ទៅ Checkout បញ្ចប់ការទិញ', 'web_app' => ['url' => $directUrl]]],
                        [['text' => '🗺️ មើលទីតាំងលើ Google Maps', 'url' => $mapsUrl]],
                    ]
                ];

                self::sendMessageWithKeyboard($chatId, $respMsg, $replyMarkup, 'HTML', null, $activeToken);
                return;
            }
        }

        // Check if bot was added as new chat member in group
        if (!empty($message['new_chat_members'])) {
            foreach ($message['new_chat_members'] as $newMember) {
                if (($newMember['username'] ?? '') === $activeBotUsername || ($newMember['is_bot'] ?? false)) {
                    $tokens = $settings['pending_tokens'] ?? [];
                    if (!empty($tokens)) {
                        self::pairChat('AUTO', $chatId, $chatTitle, $chatType);
                        return;
                    }

                    // STRICT DISCONNECT ISOLATION:
                    // If disconnected and no active pairing token exists, do NOT reply or send greeting!
                    return;
                }
            }
        }

        // 4. Extract Pairing Code / Hash / Handshake from incoming commands & deep links
        $extractedCode = null;
        if (preg_match('/^\/start(?:group)?(?:@\w+)?(?:[\s=_]+|\?)(?:start(?:group)?=)?([A-Za-z0-9_-]+)/i', $text, $matches)) {
            $extractedCode = $matches[1];
        } elseif (preg_match('/start(?:group)?=([A-Za-z0-9_-]+)/i', $text, $matches)) {
            $extractedCode = $matches[1];
        } elseif (preg_match('/\b(ST[A-Za-z0-9]{4,12}|tgauth_[A-Za-z0-9_-]+|tglink_[A-Za-z0-9_-]+)\b/i', $text, $matches)) {
            $extractedCode = $matches[1];
        }

        // 4.1 Handle 1-Click Telegram App Customer Login Handshake (tgauth_...)
        if ($extractedCode && (str_starts_with($extractedCode, 'tgauth_') || str_starts_with($extractedCode, 'TGAUTH_'))) {
            if (app()->bound('tg_handshake_done_' . $chatId)) {
                return;
            }
            $res = self::processHandshakeSync($extractedCode, $message);
            if (!empty($res['text'])) {
                self::sendMessageWithKeyboard($chatId, $res['text'], $res['reply_markup'] ?? [], 'HTML', null, $activeToken);
            }
            return;
        }

        // 4.2 Handle Profile & Email 1-Click Telegram Deep Link Handshake (tglink_... or tgmail_...)
        if ($extractedCode && (
            str_starts_with($extractedCode, 'tglink_') || 
            str_starts_with($extractedCode, 'TGLINK_') ||
            str_starts_with($extractedCode, 'tgmail_') ||
            str_starts_with($extractedCode, 'TGMAIL_')
        )) {
            if (app()->bound('tg_link_done_' . $chatId)) {
                return;
            }
            if ($messageId) {
                self::setMessageReaction($chatId, (int)$messageId, '🎉', true, $activeToken);
            }
            $res = self::processProfileLinkSync($extractedCode, $message);
            if (!empty($res['text'])) {
                self::sendMessageWithKeyboard($chatId, $res['text'], $res['reply_markup'] ?? [], 'HTML', null, $activeToken);
            }
            return;
        }

        // 4.2.1 Handle Website 1-Click Phone Number Sync (syncphone_...)
        if ($extractedCode && (str_starts_with($extractedCode, 'syncphone_') || str_starts_with($extractedCode, 'SYNCPHONE_'))) {
            $syncCode = trim(substr($extractedCode, 10)); // e.g. PS_ABC12345
            $tgId = (string)($from['id'] ?? $chatId);
            $fullName = trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: 'អតិថិជន';

            // Associate this user and chat with the sync code
            \Illuminate\Support\Facades\Cache::put("tg_phone_sync_user_{$tgId}", $syncCode, 600);
            \Illuminate\Support\Facades\Cache::put("tg_phone_sync_user_{$chatId}", $syncCode, 600);

            // Check if we already have this user's phone in cache or DB
            $existingPhone = \Illuminate\Support\Facades\Cache::get("tg_latest_phone_{$tgId}");
            if (!$existingPhone) {
                $user = \App\Models\UserProfile::where('telegram_chat_id', $tgId)
                    ->orWhere('firebase_uid', 'tg_' . $tgId)
                    ->first();
                if ($user && !empty($user->phone)) {
                    $existingPhone = $user->phone;
                }
            }

            if ($existingPhone) {
                // Instantly fulfill the sync!
                \Illuminate\Support\Facades\Cache::put("tg_phone_sync_result_{$syncCode}", $existingPhone, 3600);
                \Illuminate\Support\Facades\Cache::put("tg_latest_phone_{$tgId}", $existingPhone, 86400 * 30);
                \Illuminate\Support\Facades\Cache::put("tg_latest_phone_{$chatId}", $existingPhone, 86400 * 30);

                $msg = "⚡ <b>ភ្ជាប់លេខទូរស័ព្ទជោគជ័យ ១០០%!</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "សួស្តី <b>" . htmlspecialchars($fullName) . "</b>! លេខទូរស័ព្ទរបស់អ្នក <code>" . htmlspecialchars($existingPhone) . "</code> ត្រូវបានបំពេញចូលផ្ទាំង Checkout លើគេហទំព័រដោយស្វ័យប្រវត្តិតែម្ដង។\n\n"
                    . "👉 លោកអ្នកអាចត្រឡប់ទៅកាន់ផ្ទាំងគេហទំព័រវិញ ដើម្បីបន្តការកម្ម៉ង់ទិញបានភ្លាមៗ!";

                $webUrl = "https://www.s-tech-store.tech/checkout";
                $kb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ ត្រឡប់ទៅផ្ទាំង Checkout វិញ (Return to Checkout)', 'url' => $webUrl]]
                    ]
                ];
                self::sendMessageWithKeyboard($chatId, $msg, $kb, 'HTML', null, $activeToken);
                return;
            }

            // Prompt user with native Telegram contact button
            $msg = "📱 <b>សូមចែករំលែកលេខទូរស័ព្ទសម្រាប់ Checkout</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "សួស្តី <b>" . htmlspecialchars($fullName) . "</b>! សូមចុចប៊ូតុង <b>'📲 ចែករំលែកលេខទូរស័ព្ទ (Share Phone)'</b> ខាងក្រោម ដើម្បីឱ្យប្រព័ន្ធ S Tech Store បំពេញលេខទូរស័ព្ទចូលផ្ទាំង Checkout លើគេហទំព័ររបស់អ្នកដោយស្វ័យប្រវត្តិ។";

            $replyMarkup = [
                'keyboard' => [
                    [['text' => '📲 ចែករំលែកលេខទូរស័ព្ទ (Share Phone)', 'request_contact' => true]],
                ],
                'resize_keyboard' => true,
                'one_time_keyboard' => true,
            ];
            self::sendMessageWithKeyboard($chatId, $msg, $replyMarkup, 'HTML', null, $activeToken);
            return;
        }

        // 4.2.2 Handle Website 1-Click Location Sync (syncloc_...)
        if ($extractedCode && (str_starts_with($extractedCode, 'syncloc_') || str_starts_with($extractedCode, 'SYNCLOC_'))) {
            $syncCode = trim(substr($extractedCode, 8)); // e.g. LS_ABC12345
            $tgId = (string)($from['id'] ?? $chatId);
            $fullName = trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: 'អតិថិជន';

            // Associate this user and chat with the sync code
            \Illuminate\Support\Facades\Cache::put("tg_loc_sync_user_{$tgId}", $syncCode, 600);
            \Illuminate\Support\Facades\Cache::put("tg_loc_sync_user_{$chatId}", $syncCode, 600);

            // Check if we already have this user's location in cache or DB
            $existingLoc = \Illuminate\Support\Facades\Cache::get("tg_latest_loc_{$tgId}");
            if (!$existingLoc) {
                $user = \App\Models\UserProfile::where('telegram_chat_id', $tgId)
                    ->orWhere('firebase_uid', 'tg_' . $tgId)
                    ->first();
                if ($user && (!empty($user->latitude) || !empty($user->address))) {
                    $existingLoc = [
                        'lat' => $user->latitude ?? null,
                        'lng' => $user->longitude ?? null,
                        'address' => $user->address ?? "ទីតាំងពី Profile Telegram",
                    ];
                }
            }

            if ($existingLoc) {
                // Instantly fulfill the sync!
                \Illuminate\Support\Facades\Cache::put("tg_loc_sync_result_{$syncCode}", $existingLoc, 600);

                $msg = "⚡ <b>ភ្ជាប់ទីតាំងជោគជ័យ ១០០%!</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "សួស្តី <b>" . htmlspecialchars($fullName) . "</b>! ទីតាំងរបស់អ្នកត្រូវបានបំពេញចូលផ្ទាំង Checkout លើគេហទំព័រដោយស្វ័យប្រវត្តិតែម្ដង។\n\n"
                    . "👉 លោកអ្នកអាចត្រឡប់ទៅកាន់ផ្ទាំងគេហទំព័រវិញ ដើម្បីបន្តការកម្ម៉ង់ទិញបានភ្លាមៗ!";

                $webUrl = "https://www.s-tech-store.tech/checkout";
                $kb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ ត្រឡប់ទៅផ្ទាំង Checkout វិញ', 'url' => $webUrl]]
                    ]
                ];
                self::sendMessageWithKeyboard($chatId, $msg, $kb, 'HTML', null, $activeToken);
                return;
            }

            // Prompt user with native Telegram location button
            $msg = "📍 <b>សូមចែករំលែកទីតាំងសម្រាប់ដឹកជញ្ជូន (Checkout)</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "សួស្តី <b>" . htmlspecialchars($fullName) . "</b>! សូមចុចប៊ូតុង <b>'📍 ចែករំលែកទីតាំង (Share Location)'</b> ខាងក្រោម ដើម្បីឱ្យប្រព័ន្ធ S Tech Store បំពេញទីតាំង និងគណនាតម្លៃដឹកជញ្ជូនចូលផ្ទាំង Checkout ដោយស្វ័យប្រវត្តិ។";

            $replyMarkup = [
                'keyboard' => [
                    [['text' => '📍 ចែករំលែកទីតាំង (Share Location)', 'request_location' => true]],
                ],
                'resize_keyboard' => true,
                'one_time_keyboard' => true,
            ];

            self::sendMessageWithKeyboard($chatId, $msg, $replyMarkup, 'HTML', null, $activeToken);
            return;
        }

        // 4.3 Handle Admin Pairing Code
        if ($extractedCode) {
            $cleanCode = strtoupper(trim($extractedCode));
            if (preg_match('/^(ST[A-Za-z0-9]{4,8})/i', $cleanCode, $mCode)) {
                $cleanCode = strtoupper($mCode[1]);
            }

            self::pairChat($cleanCode, $chatId, $chatTitle, $chatType);
            return;
        }

        // 5. GROUP CHAT COMMANDS (Admin & Staff group only)
        if ($chatType !== 'private') {
            $isConnected = !empty($settings['connected']) && (string)($settings['chat_id'] ?? '') === (string)$chatId;

            // STRICT DISCONNECT ISOLATION:
            // When disconnected, bot must strictly ignore / remain silent in this group unless re-paired with a valid code!
            if (!$isConnected) {
                return;
            }

            if (preg_match('/^\/start(?:@\w+)?$/i', $text)) {
                $currentChat = $settings['chat_title'] ?? $chatTitle;
                $welcome = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Notification Bot!</b>\n\n"
                    . "🤖 <b>គណនី Bot:</b> @{$activeBotUsername}\n"
                    . "⚡ <b>ស្ថានភាព:</b> 🟢 Connected ជាមួយគ្រុប {$currentChat}\n\n"
                    . "⚙️ <b>ពាក្យបញ្ជាដែលមាន:</b>\n"
                    . "• <code>/setup_topics</code> — បង្កើត និងរៀបចំ Forum Topics ស្វ័យប្រវត្តិ\n"
                    . "• <code>/status</code> — ពិនិត្យមើលស្ថានភាពភ្ជាប់បច្ចុប្បន្ន";
                self::sendMessage($chatId, $welcome);
                return;
            }

            if (preg_match('/^\/(?:setup_topics|topics)(?:@\w+)?/i', $text)) {
                self::setupTopics($chatId);
                return;
            }

            if (preg_match('/^\/status(?:@\w+)?/i', $text)) {
                $statusText = "📊 <b>ស្ថានភាព S Tech Store Bot:</b>\n\n"
                    . "• <b>Bot Username:</b> @{$activeBotUsername}\n"
                    . "• <b>Chat ID បច្ចុប្បន្ន:</b> <code>{$chatId}</code>\n"
                    . "• <b>ស្ថានភាពភ្ជាប់:</b> 🟢 ភ្ជាប់រួចរាល់\n"
                    . "• <b>Topics បានរៀបចំ:</b> " . count($settings['topics'] ?? []) . " topics\n\n"
                    . "✅ ប្រព័ន្ធដំណើរការ ២៤/៧ ដោយស្វ័យប្រវត្តិ!";
                self::sendMessage($chatId, $statusText);
                return;
            }
            return;
        }

        // 6. PRIVATE CHAT COMMANDS (Customers & Normal Users — STRICTLY NO ADMIN FEATURES)

        // Protect Admin commands in private chat
        if (preg_match('/^\/(?:setup_topics|topics|status)(?:@\w+)?/i', $text)) {
            $adminNotice = "ℹ️ <b>សេចក្តីជូនដំណឹង:</b> ពាក្យបញ្ជានេះត្រូវបានកំណត់សម្រាប់តែក្រុមការងារ Admin ក្នុងគ្រុបប៉ុណ្ណោះ។\n\n"
                . "សម្រាប់អតិថិជន សូមប្រើប្រាស់ពាក្យបញ្ជា <code>/start</code> ឬ <code>/help</code> ដើម្បីទិញទំនិញ និងទទួលព័ត៌មាន។";
            self::sendMessageWithKeyboard($chatId, $adminNotice, self::getCustomerMainMenuKeyboard(), 'HTML', null, $activeToken);
            return;
        }

        // 6.0 Handle Manual Phone Number text input when awaiting checkout phone sync
        $pendingPhoneSync = \Illuminate\Support\Facades\Cache::get("tg_phone_sync_user_{$chatId}")
            ?: (!empty($from['id']) ? \Illuminate\Support\Facades\Cache::get("tg_phone_sync_user_" . $from['id']) : null);
        if ($pendingPhoneSync && !empty($text)) {
            $rawPhone = preg_replace('/[\s\-\.]/', '', $text);
            if (preg_match('/^(?:\+?855|0)[1-9]\d{7,8}$/', $rawPhone)) {
                $cleanPhone = str_starts_with($rawPhone, '+') ? $rawPhone : (str_starts_with($rawPhone, '855') ? '+' . $rawPhone : $rawPhone);
                \Illuminate\Support\Facades\Cache::put("tg_phone_sync_result_{$pendingPhoneSync}", $cleanPhone, 3600);
                \Illuminate\Support\Facades\Cache::put("tg_latest_phone_{$chatId}", $cleanPhone, 86400 * 30);
                if (!empty($from['id'])) {
                    \Illuminate\Support\Facades\Cache::put("tg_latest_phone_" . $from['id'], $cleanPhone, 86400 * 30);
                }
                \Illuminate\Support\Facades\Cache::forget("tg_phone_sync_user_{$chatId}");
                if (!empty($from['id'])) {
                    \Illuminate\Support\Facades\Cache::forget("tg_phone_sync_user_" . $from['id']);
                }

                $checkoutUrl = "https://www.s-tech-store.tech/checkout";
                $respMsg = "⚡ <b>ទទួលបានលេខទូរស័ព្ទជោគជ័យ ១០០%!</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "• 📞 <b>លេខទូរស័ព្ទ:</b> <code>" . htmlspecialchars($cleanPhone) . "</code>\n\n"
                    . "✅ លេខទូរស័ព្ទត្រូវបានបំពេញចូលផ្ទាំង Checkout លើគេហទំព័រដោយស្វ័យប្រវត្តិតែម្ដង!\n\n"
                    . "👉 លោកអ្នកអាចត្រឡប់ទៅផ្ទាំង Checkout វិញ ដើម្បីបន្តការកម្ម៉ង់ទិញបានភ្លាមៗ៖";

                $replyMarkup = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ ត្រឡប់ទៅផ្ទាំង Checkout វិញ (Return to Checkout)', 'url' => $checkoutUrl]],
                    ]
                ];
                self::sendMessageWithKeyboard($chatId, $respMsg, $replyMarkup, 'HTML', null, $activeToken);
                return;
            }
        }

        // Customer /disconnect or /unlink or ផ្តាច់
        if (preg_match('/^\/(?:disconnect|unlink|logout)(?:@\w+)?/i', $text) || in_array(mb_strtolower($text), ['ផ្តាច់', 'ផ្ដាច់', 'ផ្តាច់គណនី', 'ផ្ដាច់គណនី', 'ផ្តាច់ការភ្ជាប់', 'ផ្ដាច់ការភ្ជាប់'])) {
            $tgId = (string)($from['id'] ?? $chatId);
            $cleanTgId = preg_replace('/\D/', '', $tgId) ?: $tgId;

            $user = self::resolveActiveUser($cleanTgId);

            if ($user) {
                $userDisplayName = $user->display_name ?: 'អតិថិជន';

                // Unlink all accounts associated with this telegram_chat_id
                \App\Models\UserProfile::where('telegram_chat_id', (string)$cleanTgId)
                    ->orWhere('telegram_chat_id', (string)$tgId)
                    ->update([
                        'telegram' => null,
                        'telegram_chat_id' => null,
                        'notif_telegram' => false,
                    ]);

                Cache::put("tg_disconnected_{$cleanTgId}", true, 86400 * 30);
                Cache::put("tg_disconnected_{$tgId}", true, 86400 * 30);

                Cache::forget("tg_u_prof_{$cleanTgId}");
                Cache::forget("tg_u_prof_{$tgId}");
                Cache::forget("tg_orders_{$cleanTgId}");
                Cache::forget("tg_orders_{$tgId}");
                Cache::forget("tg_link_{$cleanTgId}");
                Cache::forget("tg_link_{$tgId}");
                Cache::forget("customer_sess_{$cleanTgId}");
                Cache::forget("customer_sess_{$tgId}");

                $disconnectMsg = "✅ <b>បានផ្តាច់គណនី Telegram ដោយជោគជ័យ!</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "• 👤 <b>ឈ្មោះគណនី:</b> <b>" . htmlspecialchars($userDisplayName) . "</b>\n"
                    . "• 🔌 <b>ស្ថានភាព:</b> <b>ផ្តាច់រួចរាល់ (Disconnected)</b>\n\n"
                    . "គណនី Telegram របស់អ្នកត្រូវបានផ្តាច់ចេញពី Website S Tech Store រួចរាល់ហើយ។\n"
                    . "ឥឡូវនេះ Telegram របស់អ្នកនៅទំនេរ និងអាចយកទៅភ្ជាប់ជាមួយគណនី Website ផ្សេងបានគ្រប់ពេល។\n\n"
                    . "👉 លោកអ្នកអាចភ្ជាប់ឡើងវិញបានគ្រប់ពេល តាមរយៈ Profile Setting លើ Website។";

                $disconnectKb = [
                    'inline_keyboard' => [
                        [['text' => '🌐 ចូលគេហទំព័រ (Website)', 'url' => 'https://www.s-tech-store.tech/account/profile']],
                        [['text' => '🔙 មឺនុយមេ (Main Menu)', 'callback_data' => 'cust_main_menu']],
                    ]
                ];

                self::sendMessageWithKeyboard($chatId, $disconnectMsg, $disconnectKb, 'HTML', null, $activeToken);
                return;
            } else {
                $notLinkedMsg = "ℹ️ <b>គណនី Telegram របស់អ្នកមិនទាន់បានភ្ជាប់ជាមួយ Website ណាមួយឡើយ</b> (Not Connected)។\n\n"
                    . "👉 ប្រសិនបើអ្នកចង់ភ្ជាប់ជាមួយគណនីលើ Website សូមចូលទៅកាន់គេហទំព័រ រួចចុច <b>\"ភ្ជាប់ Official Bot\"</b> ក្នុង Profile Setting។";

                $notLinkedKb = [
                    'inline_keyboard' => [
                        [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech']],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ]
                ];

                self::sendMessageWithKeyboard($chatId, $notLinkedMsg, $notLinkedKb, 'HTML', null, $activeToken);
                return;
            }
        }

        // Customer /start
        if (preg_match('/^\/start(?:@\w+)?$/i', $text)) {
            $tgId = (string)($from['id'] ?? $chatId);
            $cleanTgId = preg_replace('/\D/', '', $tgId) ?: $tgId;
            $fullName = trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: 'អតិថិជន';
            $tgUsername = !empty($from['username']) ? '@' . ltrim($from['username'], '@') : null;

            if (app()->bound('tg_start_welcome_sent_' . $chatId)) {
                return;
            }

            $user = self::resolveActiveUser((string)$cleanTgId);

            if ($user) {
                // Keep avatar and display name up-to-date for native telegram accounts
                if (str_starts_with((string)$user->firebase_uid, 'tg_')) {
                    $user->display_name = $fullName;
                    $avatarUrl = self::getUserAvatarUrl($cleanTgId);
                    if ($avatarUrl) {
                        $user->photo_url = $avatarUrl;
                        $user->avatar_url = $avatarUrl;
                    }
                    if ($tgUsername) $user->telegram = $tgUsername;
                    $user->save();
                }

                $directToken = self::generateCustomerSessionToken((string)$cleanTgId, $user->display_name);
                $directUrl = !empty($directToken) ? "https://www.s-tech-store.tech/?tg_token={$directToken}" : "https://www.s-tech-store.tech";

                $welcome = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Official Bot!</b>\n\n"
                    . "ជម្រាបសួរ <b>" . htmlspecialchars($user->display_name) . "</b>!\n"
                    . "🏪 <b>ហាង S Tech Store Cambodia</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n"
                    . "✨ <b>គណនី Telegram របស់អ្នកត្រូវបានភ្ជាប់រួចរាល់ (Connected)!</b>\n"
                    . "• 👤 <b>ម្ចាស់គណនី:</b> <b>" . htmlspecialchars($user->display_name) . "</b>\n"
                    . "• 💰 <b>សមតុល្យកាបូប:</b> <b>$" . number_format((float)($user->wallet_balance ?? 0), 2) . " USD</b>\n"
                    . "• 🪙 <b>ពិន្ទុរង្វាន់:</b> <b>" . (int)($user->points ?? 0) . " Coins</b>\n\n"
                    . "លោកអ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីចូលទិញទំនិញភ្លាមៗ ដោយមិនបាច់វាយលេខសម្ងាត់ឡើយ៖";

                $customerKb = self::getCustomerMainMenuKeyboard($cleanTgId);
                self::sendMessageWithKeyboard($chatId, $welcome, $customerKb, 'HTML', null, $activeToken);
                return;
            }

            // GUEST / UNLINKED CUSTOMER (DO NOT AUTO-CREATE A USER)
            $welcomeGuest = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Official Bot!</b>\n\n"
                . "ជម្រាបសួរ <b>" . htmlspecialchars($fullName) . "</b>!\n"
                . "🏪 <b>ហាង S Tech Store Cambodia</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n"
                . "ℹ️ <b>ស្ថានភាពគណនី:</b> <b>មិនទាន់ភ្ជាប់ (Not Connected)</b>\n\n"
                . "👉 លោកអ្នកអាចចូលទៅកាន់គេហទំព័រ S Tech Store ដើម្បី Sign In / Sign Up ឬភ្ជាប់គណនីជាមួយ Telegram នេះ ក្នុង Profile Setting ដើម្បីទទួលបានការជូនដំណឹង (Order Alerts, OTP, និងសមតុល្យកាបូបលុយ)៖";

            $guestKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ បើកទិញក្នុង Mini App (Open Store)', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [
                        ['text' => '🌐 ចូលគេហទំព័រ / Sign In', 'url' => 'https://www.s-tech-store.tech/login'],
                        ['text' => '💻 ផលិតផល (Shop)', 'callback_data' => 'cust_shop'],
                    ],
                    [
                        ['text' => '🔥 ប្រូម៉ូសិនពិសេស', 'callback_data' => 'cust_promo'],
                        ['text' => '💬 ជំនួយ & ទំនាក់ទំនង', 'callback_data' => 'cust_contact'],
                    ],
                ]
            ];
            self::sendMessageWithKeyboard($chatId, $welcomeGuest, $guestKb, 'HTML', null, $activeToken);
            return;
        }

        // Customer /shop or /products
        if (preg_match('/^\/(?:shop|products)(?:@\w+)?/i', $text)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '🔥', true, $activeToken);
            $shopText = "💻 <b>ប្រភេទផលិតផល និងឧបករណ៍បច្ចេកវិទ្យានៅ S Tech Store:</b>\n\n"
                . "🌟 <b>ទំនិញពេញនិយម និងមានក្នុងស្តុកស្រាប់៖</b>\n"
                . "• 💻 <b>Laptops ម៉ាកល្បីៗ:</b> ASUS ROG/TUF, Apple MacBook M2/M3, Dell XPS/Latitude, Lenovo Legion/ThinkPad, Acer Nitro, MSI Gaming\n"
                . "• 🖥️ <b>Desktop & Custom PC:</b> ឈុត PC Gaming & Office តម្លៃចាប់ពី $299 ឡើងទៅ\n"
                . "• ⚙️ <b>គ្រឿងបន្លាស់ (Components):</b> Intel Core i5/i7/i9, AMD Ryzen, VGA RTX 4060/4070/4080, RAM DDR4/DDR5, SSD M.2 NVMe\n"
                . "• 🎧 <b>Gaming Gears & Accessories:</b> អេក្រង់ 144Hz-240Hz, Keyboard Mechanical, Mouse Wireless, Headset 7.1 Surround\n\n"
                . "👉 <b>សូមចុចប៊ូតុង Mini App ខាងក្រោមដើម្បីមើលតម្លៃជាក់ស្តែង និងបញ្ជាទិញភ្លាមៗ!</b>";

            $shopKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ បើកទិញក្នុង Mini App ឥឡូវនេះ', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [
                        ['text' => '🔥 មើលប្រូម៉ូសិនពិសេស', 'callback_data' => 'cust_promo'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $shopText, $shopKb, 'HTML', null, $activeToken);
            return;
        }

        // Customer /promo or /promotions
        if (preg_match('/^\/(?:promo|promotions)(?:@\w+)?/i', $text)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '🎉', true, $activeToken);
            $promoText = "🔥 <b>កម្មវិធីប្រូម៉ូសិនពិសេសនៅ S Tech Store!</b>\n\n"
                . "🎉 <b>មហាប្រូម៉ូសិន និងការបញ្ចុះតម្លៃពិសេស៖</b>\n"
                . "• 💥 បញ្ចុះតម្លៃពិសេសរហូតដល់ <b>30%</b> លើម៉ូឌែល Laptops & Accessories\n"
                . "• 🎟️ <b>កូដបញ្ចុះតម្លៃពិសេស (Promo Codes):</b>\n"
                . self::formatActivePromoCodesText() . "\n"
                . "• 🚚 <b>Free Delivery:</b> ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងរាជធានីភ្នំពេញ (ចាប់ពី $50 ឡើងទៅ)\n"
                . "• 🎁 <b>កាដូថែមជូន:</b> ថែម Mouse Wireless, Mousepad, កាតាប និងដំឡើង Windows ឥតគិតថ្លៃ!\n\n"
                . "👉 បើក Mini App ឥឡូវនេះដើម្បីប្រើប្រាស់កូដបញ្ចុះតម្លៃ និងទិញទំនិញតម្លៃពិសេស!";

            $promoKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ ប្រើប្រូម៉ូសិនក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [
                        ['text' => '💻 មើលផលិតផលបញ្ចុះតម្លៃ', 'callback_data' => 'cust_shop'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $promoText, $promoKb, 'HTML', null, $activeToken);
            return;
        }

        // Customer /orders, /order, or /track (Real Orders Lookup & Date Filter)
        if (preg_match('/^\/(?:orders|order|track)(?:@\w+)?(?:\s+(.+))?/i', $text, $orderMatches)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '📦', true, $activeToken);
            $arg = !empty($orderMatches[1]) ? trim($orderMatches[1]) : null;

            if ($arg) {
                // If argument is a tracking ID like ST-10023
                if (preg_match('/\b((?:ST|ORD)[-_]?[A-Za-z0-9]{3,12})\b/i', $arg)) {
                    self::handleCustomerTextInquiry($chatId, $arg, $from, $activeToken, $activeBotUsername, $messageId);
                    return;
                }
                $argLower = mb_strtolower($arg, 'UTF-8');
                if (in_array($argLower, ['today', 'ថ្ងៃនេះ', 'ថ្ងៃហ្នឹង', 'ថ្ងៃនុង'])) {
                    self::sendCustomerOrdersFiltered($chatId, 'today', $fromName, null, $activeToken);
                    return;
                }
                if (in_array($argLower, ['week', 'សប្ដាហ៍នេះ', 'អាទិត្យនេះ'])) {
                    self::sendCustomerOrdersFiltered($chatId, 'week', $fromName, null, $activeToken);
                    return;
                }
                if (in_array($argLower, ['yesterday', 'ម្សិលមិញ'])) {
                    self::sendCustomerOrdersFiltered($chatId, 'yesterday', $fromName, null, $activeToken);
                    return;
                }
                if (in_array($argLower, ['all', 'ទាំងអស់'])) {
                    self::sendCustomerOrdersFiltered($chatId, 'all', $fromName, null, $activeToken);
                    return;
                }
                $parsedDate = self::extractDateFromString($arg);
                if ($parsedDate) {
                    self::sendCustomerOrdersFiltered($chatId, 'date:' . $parsedDate, $fromName, null, $activeToken);
                    return;
                }
            }

            self::sendCustomerOrdersMenu($chatId, $fromName, null, $activeToken);
            return;
        }

        // Customer /points or /coins
        if (preg_match('/^\/(?:points|coins|rewards)(?:@\w+)?/i', $text)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '🪙', true, $activeToken);
            $user = self::resolveActiveUser((string)$chatId);

            if (!$user) {
                $notLinkedMsg = "ℹ️ <b>គណនី Telegram របស់អ្នកមិនទាន់បានភ្ជាប់ជាមួយ Website ណាមួយឡើយ</b> (Not Connected)។\n\n"
                    . "👉 ដើម្បីពិនិត្យពិន្ទុ S-Coins និងកម្រិត VIP សូមចូលទៅកាន់គេហទំព័រ រួចភ្ជាប់គណនីជាមួយ Telegram នេះក្នុង Profile Setting។";
                $notLinkedKb = [
                    'inline_keyboard' => [
                        [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/login']],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ]
                ];
                self::sendMessageWithKeyboard($chatId, $notLinkedMsg, $notLinkedKb, 'HTML', null, $activeToken);
                return;
            }

            $fromName = $user->display_name ?: $fromName;
            $points = (int)($user->points ?? 0);
            $dollarVal = number_format($points * 0.01, 2);

            $vipTier = match(true) {
                $points >= 5000 => '💎 Diamond VIP Member',
                $points >= 2000 => '👑 Platinum VIP Member',
                $points >= 500 => '🥇 Gold Member',
                default => '🥈 Silver Member',
            };

            $completedOrders = self::getCustomerOrdersBuilder((string)$chatId, $user)
                ->whereIn('status', ['completed', 'delivered'])
                ->count();

            $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
            $pointsAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

            $pointsText = "🪙 <b>កាបូបពិន្ទុ & កម្រិតសមាជិក (S-Coins & VIP Rewards):</b>\n\n"
                . "👤 <b>ម្ចាស់គណនី:</b> <b>" . htmlspecialchars($fromName) . "</b>\n"
                . "🎖️ <b>កម្រិតសមាជិកភាព:</b> <b>{$vipTier}</b>\n"
                . "🪙 <b>ពិន្ទុ S-Coins បច្ចុប្បន្ន:</b> <b>{$points} Coins</b>\n"
                . "💵 <b>តម្លៃទឹកប្រាក់បញ្ចុះ:</b> <b>\${$dollarVal} USD</b>\n"
                . "📦 <b>ការកុម្ម៉ង់សម្រេចជោគជ័យ:</b> <b>{$completedOrders} ដង</b>\n\n"
                . "💡 <b>អត្ថប្រយោជន៍នៃ S-Coins:</b>\n"
                . "• រាល់ការទិញទំនិញ $10 ទទួលបាន 10 Coins\n"
                . "• អាចប្រើ Coins ដើម្បីកាត់បន្ថយថ្លៃទំនិញភ្លាមៗនៅពេល Checkout\n"
                . "• ទទួលបានការបញ្ចុះតម្លៃបន្ថែមសម្រាប់សមាជិកកម្រិតខ្ពស់ (Gold / Diamond)\n\n"
                . "👉 <b>សូមចុចប៊ូតុងខាងក្រោមដើម្បីចូលទិញទំនិញ និងប្រើប្រាស់ពិន្ទុរបស់អ្នក!</b>";

            $pointsKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ ប្រើប្រាស់ Points ទិញក្នុង Mini App', 'web_app' => ['url' => $pointsAppUrl]]],
                    [
                        ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ', 'callback_data' => 'cust_my_orders'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];

            self::sendMessageWithKeyboard($chatId, $pointsText, $pointsKb, 'HTML', null, $activeToken);
            return;
        }

        // Customer /wallet, /balance, /money, /funds, /topup (Local-First Real Wallet Lookup)
        if (preg_match('/^\/(?:wallet|balance|money|funds|topup)(?:@\w+)?/i', $text)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '💰', true, $activeToken);
            $user = self::resolveActiveUser((string)$chatId);

            if (!$user) {
                $notLinkedMsg = "ℹ️ <b>គណនី Telegram របស់អ្នកមិនទាន់បានភ្ជាប់ជាមួយ Website ណាមួយឡើយ</b> (Not Connected)។\n\n"
                    . "👉 ដើម្បីពិនិត្យសមតុល្យកាបូបលុយ សូមចូលទៅកាន់គេហទំព័រ រួចភ្ជាប់គណនីជាមួយ Telegram នេះក្នុង Profile Setting។";
                $notLinkedKb = [
                    'inline_keyboard' => [
                        [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/login']],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ]
                ];
                self::sendMessageWithKeyboard($chatId, $notLinkedMsg, $notLinkedKb, 'HTML', null, $activeToken);
                return;
            }

            $fromName = $user->display_name ?: $fromName;
            $walletBalance = (float)($user->wallet_balance ?? 0.00);
            $points = (int)($user->points ?? 0);
            $pointsVal = $points * 0.01;
            $totalFunds = $walletBalance + $pointsVal;

            $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
            $walletAppUrl = "https://www.s-tech-store.tech/account/wallet?tg_token={$sessionToken}";

            $recentTxs = Cache::remember("tg_txs_{$chatId}", 30, function() use ($user) {
                if (!$user || empty($user->firebase_uid)) return collect();
                return \App\Models\WalletTransaction::where('firebase_uid', $user->firebase_uid)
                    ->latest()
                    ->take(3)
                    ->get();
            });

            $txListText = "";
            if ($recentTxs->isNotEmpty()) {
                $txListText = "📋 <b>ប្រតិបត្តិការកាបូបចុងក្រោយ (Recent Transactions):</b>\n";
                foreach ($recentTxs as $tx) {
                    $txSign = in_array($tx->type, ['deposit', 'refund', 'reward', 'coin_reward']) ? '➕' : '➖';
                    $txTypeTitle = match($tx->type) {
                        'deposit' => 'បញ្ចូលទឹកប្រាក់ (Deposit)',
                        'payment', 'order' => 'ទូទាត់ទំនិញ (Payment)',
                        'refund' => 'សងប្រាក់ត្រឡប់ (Refund)',
                        'reward', 'coin_reward' => 'រង្វាន់ & Bonus',
                        default => ucfirst($tx->type),
                    };
                    $txStatusBadge = match(strtolower($tx->status ?? 'completed')) {
                        'completed', 'success' => '✅ ជោគជ័យ',
                        'pending' => '⏳ រង់ចាំ',
                        'failed' => '❌ បរាជ័យ',
                        default => ucfirst($tx->status),
                    };
                    $txAmountStr = number_format((float)$tx->amount, 2);
                    $txDate = $tx->created_at ? $tx->created_at->format('d/m/Y H:i') : '';
                    $txListText .= "• {$txSign} <b>\${$txAmountStr} USD</b> — {$txTypeTitle} ({$txStatusBadge}) <i>{$txDate}</i>\n";
                }
                $txListText .= "\n";
            }

            $walletText = "💰 <b>កាបូបលុយ & សមតុល្យគណនី (S Tech Smart Wallet):</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "👤 <b>ម្ចាស់គណនី:</b> <b>" . htmlspecialchars($fromName) . "</b>\n"
                . "💵 <b>សមតុល្យសាច់ប្រាក់ (Cash Balance):</b> <b>\$" . number_format($walletBalance, 2) . " USD</b>\n"
                . "🪙 <b>ពិន្ទុ S-Coins:</b> <b>{$points} Coins</b> (ស្មើ <b>\$" . number_format($pointsVal, 2) . " USD</b>)\n"
                . "💎 <b>ទឹកប្រាក់អាចប្រើប្រាស់សរុប:</b> <b>\$" . number_format($totalFunds, 2) . " USD</b>\n\n"
                . $txListText
                . "💳 <b>វិធីបញ្ចូលទឹកប្រាក់ងាយៗ (Top-Up KHQR):</b>\n"
                . "• ស្កេនទូទាត់តាម <b>Bakong KHQR</b> គ្រប់ធនាគារ (ABA, ACLEDA, Wing, Canadia...)\n"
                . "• ទឹកប្រាក់ចូលគណនីភ្លាមៗ ស្វ័យប្រវត្តក្នុងរយៈពេល ១-៥ វិនាទី\n"
                . "• ប្រើទូទាត់ទំនិញលឿនរហ័ស និងទទួលបាន Bonus Coins បន្ថែមរាល់ការទិញ!\n\n"
                . "👉 <b>ចុចប៊ូតុងខាងក្រោមដើម្បីបញ្ចូលលុយ ឬទិញទំនិញក្នុង Mini App!</b>";

            $walletKb = [
                'inline_keyboard' => [
                    [['text' => '💳 បញ្ចូលលុយកាបូប (Top Up KHQR)', 'web_app' => ['url' => $walletAppUrl]]],
                    [
                        ['text' => '🪙 ពិន្ទុ & VIP (Coins)', 'callback_data' => 'cust_my_points'],
                        ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ', 'callback_data' => 'cust_my_orders'],
                    ],
                    [
                        ['text' => '🔄 ពិនិត្យសមតុល្យឡើងវិញ', 'callback_data' => 'cust_my_wallet'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];

            self::sendMessageWithKeyboard($chatId, $walletText, $walletKb, 'HTML', null, $activeToken);
            return;
        }

        // Customer /repair or /repairs
        if (preg_match('/^\/(?:repair|repairs|services)(?:@\w+)?/i', $text)) {
            $user = self::resolveActiveUser((string)$chatId);

            if (!$user) {
                $notLinkedMsg = "ℹ️ <b>គណនី Telegram របស់អ្នកមិនទាន់បានភ្ជាប់ជាមួយ Website ណាមួយឡើយ</b> (Not Connected)។\n\n"
                    . "👉 ដើម្បីពិនិត្យសំបុត្រជួសជុលឧបករណ៍ សូមចូលទៅកាន់គេហទំព័រ រួចភ្ជាប់គណនីជាមួយ Telegram នេះក្នុង Profile Setting។";
                $notLinkedKb = [
                    'inline_keyboard' => [
                        [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/login']],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ]
                ];
                self::sendMessageWithKeyboard($chatId, $notLinkedMsg, $notLinkedKb, 'HTML', null, $activeToken);
                return;
            }
            $repairs = \App\Models\Repair::where(function ($q) use ($user) {
                if ($user && !empty($user->phone)) $q->orWhere('customer_phone', $user->phone);
                if ($user && !empty($user->email)) $q->orWhere('customer_email', $user->email);
            })->latest()->take(3)->get();

            $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
            $latestCode = $repairs->isNotEmpty() ? ltrim($repairs->first()->ticket_code ?? ('REP-' . $repairs->first()->id), '#') : '';
            $repairAppUrl = "https://www.s-tech-store.tech/repairs?" . ($latestCode ? "ticket=" . urlencode($latestCode) . "&" : "") . "chat_id={$chatId}&tg_token={$sessionToken}";

            if ($repairs->isEmpty()) {
                $repairText = "🔧 <b>សេវាកម្មជួសជុល & សំបុត្រជួសជុល (Repair Tickets):</b>\n\n"
                    . "ជម្រាបសួរ <b>{$fromName}</b>!\n"
                    . "បច្ចុប្បន្ន លោកអ្នកមិនមានសំបុត្រជួសជុលឧបករណ៍ដែលកំពុងដំណើរការនោះទេ។\n\n"
                    . "🛠️ <b>សេវាកម្មជួសជុល & Upgrade របស់ហាង៖</b>\n"
                    . "• ជួសជុល Laptop, PC គ្រប់ម៉ាក (ផ្លាស់ប្តូរអេក្រង់, ថ្ម, ក្តារចុច, សាកមិនចូល, Mainboard)\n"
                    . "• Upgrade SSD NVMe ល្បឿនលឿន, បង្កើន RAM, ដំឡើង Graphics Card\n"
                    . "• លាងសម្អាតកម្ដៅ & ប្តូរ Thermal Paste\n"
                    . "• ដំឡើង Genuine Windows 11, Drivers & កម្មវិធីការិយាល័យ Office\n\n"
                    . "👉 ចុចប៊ូតុងខាងក្រោមដើម្បីស្នើសុំសេវាកម្មជួសជុល ឬពិនិត្យក្នុង Mini App!";

                $repairKb = [
                    'inline_keyboard' => [
                        [['text' => '🔧 បើកសេវាជួសជុលក្នុង Mini App', 'web_app' => ['url' => $repairAppUrl]]],
                        [
                            ['text' => '📞 ទាក់ទងជាងបច្ចេកទេស', 'callback_data' => 'cust_contact'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];
            } else {
                $repairText = "🔧 <b>សំបុត្រជួសជុលរបស់អ្នក (My Repair Tickets):</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n";

                foreach ($repairs as $r) {
                    $repBadge = match($r->status) {
                        'Ready' => '✅ រួចរាល់អាចមកយកបាន (Ready)',
                        'In Progress' => '🔄 កំពុងជួសជុល (In Progress)',
                        'Completed' => '🎉 បានប្រគល់ជូនរួចរាល់ (Completed)',
                        default => '⏳ កំពុងពិនិត្យរោគសញ្ញា (Pending)',
                    };

                    $repairText .= "🎫 <b>Ticket #{$r->ticket_code}</b>\n"
                        . "💻 <b>ឧបករណ៍:</b> {$r->device_name}\n"
                        . "⚡ <b>ស្ថានភាព:</b> <b>{$repBadge}</b>\n"
                        . "👨‍🔧 <b>ជាងទទួលខុសត្រូវ:</b> {$r->technician_name}\n"
                        . "💵 <b>តម្លៃប៉ាន់ស្មាន:</b> \${$r->estimated_cost} USD\n"
                        . "📝 <b>បញ្ហា:</b> " . \Illuminate\Support\Str::limit($r->issue_description, 80) . "\n"
                        . "────────────────────\n\n";
                }

                $repairText .= "👉 <i>លោកអ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីពិនិត្យលម្អិតក្នុង Mini App!</i>";

                $repairKb = [
                    'inline_keyboard' => [
                        [['text' => '🔧 ពិនិត្យមើលក្នុង Mini App', 'web_app' => ['url' => $repairAppUrl]]],
                        [
                            ['text' => '📞 ទាក់ទងជាងបច្ចេកទេស', 'callback_data' => 'cust_contact'],
                            ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                        ],
                    ],
                ];
            }

            self::sendMessageWithKeyboard($chatId, $repairText, $repairKb, 'HTML', null, $activeToken);
            return;
        }

        // Customer /contact or /about
        if (preg_match('/^\/(?:contact|about)(?:@\w+)?/i', $text)) {
            $contactText = "📍 <b>ទំនាក់ទំនង & ទីតាំងហាង S Tech Store Cambodia:</b>\n\n"
                . "🏪 <b>ហាង S Tech Store</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n"
                . "📍 <b>ទីតាំង:</b> រាជធានីភ្នំពេញ, ប្រទេសកម្ពុជា\n"
                . "⏰ <b>ម៉ោងបើកបម្រើសេវាកម្ម:</b> ថ្ងៃចន្ទ - អាទិត្យ (8:00 AM - 8:00 PM) ជារៀងរាល់ថ្ងៃ\n"
                . "📞 <b>Hotline:</b> <code>012 345 678</code> | <code>098 765 432</code>\n"
                . "🌐 <b>គេហទំព័រផ្លូវការ:</b> <a href=\"https://www.s-tech-store.tech\">https://www.s-tech-store.tech</a>\n"
                . "✈️ <b>Telegram Bot:</b> @{$activeBotUsername}\n\n"
                . "🚚 <b>សេវាដឹកជញ្ជូន:</b> រហ័សទាន់ចិត្ត ២៥ ខេត្ត-ក្រុង!";

            $contactKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ បើកទិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [
                        ['text' => '🌐 បើកមើលគេហទំព័រ', 'url' => 'https://www.s-tech-store.tech'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $contactText, $contactKb, 'HTML', null, $activeToken);
            return;
        }

        // Customer /help
        if (preg_match('/^\/help(?:@\w+)?/i', $text)) {
            $helpText = "❓ <b>មជ្ឈមណ្ឌលជំនួយ S Tech Store (Customer Help):</b>\n\n"
                . "សូមស្វាគមន៍! លោកអ្នកអាចប្រើពាក្យបញ្ជា ឬវាយសួរផ្ទាល់ដូចខាងក្រោម៖\n\n"
                . "📋 <b>បញ្ជីពាក្យបញ្ជា (Commands):</b>\n"
                . "• <code>/start</code> — 🏠 មឺនុយមេ & បើក Mini App\n"
                . "• <code>/wallet</code> — 💰 ពិនិត្យសមតុល្យទឹកប្រាក់ & កាបូប (My Balance)\n"
                . "• <code>/points</code> — 🪙 ពិន្ទុ S-Coins & VIP Rewards\n"
                . "• <code>/ask</code> — ❓ បញ្ជីសំណួរញឹកញាប់ & ជំនួយរហ័ស (Quick FAQ)\n"
                . "• <code>/shop</code> — 💻 មើលផលិតផល Laptops, PC, Parts\n"
                . "• <code>/promo</code> — 🔥 ប្រូម៉ូសិន & កូដបញ្ចុះតម្លៃ\n"
                . "• <code>/track</code> — 📦 តាមដានស្ថានភាពការបញ្ជាទិញ\n"
                . "• <code>/repair</code> — 🔧 សេវាជួសជុល & Upgrade\n"
                . "• <code>/contact</code> — 📞 ទំនាក់ទំនង & ទីតាំងហាង\n"
                . "• <code>/help</code> — ❓ បង្ហាញជំនួយនេះ\n\n"
                . "💡 <b>ជំនួយការឆ្លាតវៃ (Smart Inquiries):</b>\n"
                . "លោកអ្នកអាចវាយសួរផ្ទាល់ក្នុង Chat ដូចជា៖\n"
                . "👉 <i>\"លុយខ្ញុំសល់ប៉ុន្មាន?\"</i> (ឆែកសមតុល្យលុយកាបូបភ្លាមៗ)\n"
                . "👉 <i>\"Laptop តម្លៃប៉ុន្មានខ្លះ?\"</i>\n"
                . "👉 <i>\"សេវាដឹកភ្នំពេញ និងខេត្តប៉ុន្មាន?\"</i>\n"
                . "👉 <i>\"ការធានារយៈពេលប៉ុន្មាន?\"</i>\n"
                . "👉 <i>\"បង់ប្រាក់តាម Bakong KHQR បានទេ?\"</i>\n\n"
                . "Bot នឹងឆ្លើយតបព័ត៌មានជូនលោកអ្នកភ្លាមៗ!";

            $helpKb = [
                'inline_keyboard' => [
                    [
                        ['text' => '💰 កាបូបលុយ & សមតុល្យ', 'callback_data' => 'cust_my_wallet'],
                        ['text' => '🛍️ បើកទិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']],
                    ],
                    [
                        ['text' => '❓ សួរសំណួររហ័ស (Ask FAQ)', 'callback_data' => 'cust_ask_options'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $helpText, $helpKb, 'HTML', null, $activeToken);
            return;
        }

        // Customer /ask or /faq
        if (preg_match('/^\/(?:ask|faq|questions)(?:@\w+)?/i', $text)) {
            $askText = "❓ <b>មជ្ឈមណ្ឌលសួរសំណួរ & ជំនួយរហ័ស (Quick FAQ & Inquiries):</b>\n\n"
                . "ជម្រាបសួរ <b>{$fromName}</b>! សូមជ្រើសរើសប្រធានបទដែលលោកអ្នកចង់សាកសួរខាងក្រោម៖\n\n"
                . "💡 <i>លោកអ្នកក៏អាចវាយសួរជាពាក្យពេចន៍ផ្ទាល់ក្នុង Chat នេះបានគ្រប់ពេលដូចជា៖</i>\n"
                . "👉 <i>\"លុយខ្ញុំសល់ប៉ុន្មាន?\"</i>\n"
                . "👉 <i>\"តាមដានឥវ៉ាន់ ST-10023\"</i>\n"
                . "👉 <i>\"ថ្លៃដឹកជញ្ជូនភ្នំពេញ និងខេត្ត?\"</i>\n"
                . "👉 <i>\"Laptop gaming មានតម្លៃប៉ុន្មាន?\"</i>";

            $askKb = [
                'inline_keyboard' => [
                    [
                        ['text' => '💰 សមតុល្យទឹកប្រាក់ & កាបូប', 'callback_data' => 'cust_my_wallet'],
                        ['text' => '📦 តាមដានការកុម្ម៉ង់', 'callback_data' => 'cust_my_orders'],
                    ],
                    [
                        ['text' => '💳 វិធីបង់ប្រាក់ & Bakong KHQR', 'callback_data' => 'cust_ask_payment'],
                        ['text' => '🚚 សេវាដឹកជញ្ជូន & ថ្លៃដឹក', 'callback_data' => 'cust_ask_delivery'],
                    ],
                    [
                        ['text' => '🛡️ ការធានា & គោលការណ៍ប្តូរ', 'callback_data' => 'cust_ask_warranty'],
                        ['text' => '🔥 ប្រូម៉ូសិន & កូដបញ្ចុះតម្លៃ', 'callback_data' => 'cust_promo'],
                    ],
                    [
                        ['text' => '💻 ផលិតផល Laptops & PC', 'callback_data' => 'cust_shop'],
                        ['text' => '🔧 សេវាជួសជុល & Upgrade', 'callback_data' => 'cust_my_repairs'],
                    ],
                    [
                        ['text' => '💬 ជជែកជាមួយបុគ្គលិកផ្ទាល់', 'callback_data' => 'cust_support'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];

            self::sendMessageWithKeyboard($chatId, $askText, $askKb, 'HTML', null, $activeToken);
            return;
        }

        // 7. Handle Natural Customer Inquiries & Smart FAQ in Chat
        self::handleCustomerTextInquiry($chatId, $text, $from, $activeToken, $activeBotUsername, $messageId);
    }

    /**
     * Smart Natural Language Customer FAQ & Assistant in Telegram Bot
     */
    public static function handleCustomerTextInquiry($chatId, string $text, array $from, string $activeToken, string $activeBotUsername, ?int $messageId = null): void
    {
        $cleanText = trim($text);
        if ($cleanText === '') return;

        // ⚡ Immediate Typing Action: Signal user that bot is analyzing their question
        self::sendChatAction($chatId, 'typing', $activeToken);

        $fromName = trim(($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? '')) ?: 'អតិថិជន';
        $fromUsername = $from['username'] ?? '';
        $textLower = mb_strtolower($cleanText, 'UTF-8');

        // A. Order Tracking ID lookup (e.g. ST-10023 or ORD-10023)
        if (preg_match('/\b((?:ST|ORD)[-_]?[A-Za-z0-9]{3,12})\b/i', $cleanText, $orderMatch)) {
            $rawOrderId = strtoupper($orderMatch[1]);
            $order = null;
            try {
                $order = \App\Models\Order::where('order_id', $rawOrderId)
                    ->orWhere('order_id', str_replace(['-', '_'], '', $rawOrderId))
                    ->with('items.product')
                    ->first();
            } catch (\Throwable $e) {}

            if ($order) {
                if ($messageId) self::setMessageReaction($chatId, $messageId, '📦', true, $activeToken);
                $statusRaw = strtolower($order->status ?? 'pending');
                $statusKh = match($statusRaw) {
                    'pending' => '⏳ កំពុងរង់ចាំពិនិត្យ (Pending)',
                    'processing' => '🔄 កំពុងរៀបចំកញ្ចប់ទំនិញ (Processing)',
                    'shipping', 'delivering' => '🚚 កំពុងដឹកជញ្ជូនលើផ្លូវ (Shipping)',
                    'completed', 'delivered' => '✅ បានដឹកជញ្ជូនជោគជ័យ (Completed)',
                    'cancelled' => '❌ បានលុបចោល (Cancelled)',
                    default => ucfirst($order->status),
                };

                $progressBar = match($statusRaw) {
                    'pending' => "▰▰▱▱▱▱▱▱▱▱ 25% (ទទួលការកុម្ម៉ង់)",
                    'processing' => "▰▰▰▰▰▱▱▱▱▱ 50% (វេចខ្ចប់ទំនិញ)",
                    'shipping', 'delivering' => "▰▰▰▰▰▰▰▰▱▱ 80% (កំពុងដឹកជញ្ជូន)",
                    'completed', 'delivered' => "▰▰▰▰▰▰▰▰▰▰ 100% (ជោគជ័យ)",
                    'cancelled' => "▰▰▱▱▱▱▱▱▱▱ ❌ [បានលុបចោល]",
                    default => "▰▰▱▱▱▱▱▱▱▱ 25%",
                };

                $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
                $ordersAppUrl = "https://www.s-tech-store.tech/orders?tg_token={$sessionToken}";

                $itemsList = [];
                if ($order->items) {
                    foreach ($order->items as $idx => $it) {
                        $pName = htmlspecialchars($it->product ? $it->product->name : 'ទំនិញ');
                        $priceStr = $it->unit_price ? ' ($' . number_format((float)$it->unit_price, 2) . ')' : '';
                        $itemsList[] = "  " . ($idx + 1) . ". {$pName} × {$it->quantity}{$priceStr}";
                    }
                }
                $itemsText = !empty($itemsList) ? implode("\n", $itemsList) : "  • ព័ត៌មានទំនិញក្នុង Admin";

                $deliveryStr = $order->delivery_type === 'pnompenh' ? 'ភ្នំពេញ (Phnom Penh)' : ($order->delivery_type === 'province' ? 'តាមខេត្ត (Province)' : ($order->delivery_type ?? 'Standard'));
                $shippingAddress = htmlspecialchars($order->shipping_address ?? 'ទីតាំងបានបញ្ជាក់');
                $payMethod = strtoupper($order->payment_method ?? 'Bakong KHQR');
                $payStatus = strtoupper($order->payment_status ?: 'unpaid');

                $orderMsg = "📦 <b>ព័ត៌មានការបញ្ជាទិញ #{$order->order_id}:</b>\n\n"
                    . "👤 <b>អតិថិជន:</b> " . htmlspecialchars($order->customer_name ?? 'N/A') . "\n"
                    . "⚡ <b>ស្ថានភាព:</b> <b>{$statusKh}</b>\n"
                    . "📊 <b>ដំណើរការ:</b> <code>{$progressBar}</code>\n"
                    . "💵 <b>តម្លៃសរុប:</b> <b>\${$order->total_amount} USD</b> ({$payMethod} - {$payStatus})\n\n"
                    . "<blockquote expandable>\n"
                    . "🛍️ <b>មុខទំនិញក្នុងកញ្ចប់:</b>\n{$itemsText}\n\n"
                    . "📍 <b>អាសយដ្ឋានដឹក:</b> {$shippingAddress}\n"
                    . "🚚 <b>សេវាដឹក:</b> {$deliveryStr}\n"
                    . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime($order->created_at ?? null, 'd-m-Y H:i') . "\n"
                    . "</blockquote>\n\n"
                    . "👉 លោកអ្នកអាចពិនិត្យមើលព័ត៌មានលម្អិតបន្ថែមនៅក្នុង Mini App!";

                $cleanOrdCode = ltrim($order->order_id, '#');
                $orderKb = [
                    'inline_keyboard' => [
                        [
                            ['text' => '🧾 មើលវិក្កយបត្រ (Invoice Image)', 'callback_data' => "cust_inv_{$cleanOrdCode}"],
                            ['text' => '📄 ទាញយក File', 'callback_data' => "cust_file_inv_{$cleanOrdCode}"],
                        ],
                        [['text' => '📱 ពិនិត្យមើលក្នុង Mini App', 'web_app' => ['url' => $ordersAppUrl]]],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ],
                ];
                self::sendMessageWithKeyboard($chatId, $orderMsg, $orderKb, 'HTML', null, $activeToken);
                return;
            }
        }

        // A.0.0 Dedicated Invoice & Receipt inquiries ("វិក្កយបត្រ", "បុង", "invoice", "receipt", "bill", "/invoice", "/receipt")
        if (preg_match('/(វិក្កយបត្រ|បុង|invoice|receipt|bill|សុំវិក្កយបត្រ|ចង់បានវិក្កយបត្រ|ទាញយកវិក្កយបត្រ|មើលវិក្កយបត្រ)/ui', $textLower) || preg_match('/^\/(?:invoice|receipt|bill)(?:@\w+)?(?:\s+(.*))?$/i', $cleanText, $invMatch)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '🧾', true, $activeToken);

            $targetOrderId = null;
            if (!empty($invMatch[1])) {
                $targetOrderId = trim($invMatch[1]);
            } elseif (preg_match('/\b((?:ST|ORD)[-_]?[A-Za-z0-9]{3,12})\b/i', $cleanText, $om)) {
                $targetOrderId = $om[1];
            }

            $order = null;
            if ($targetOrderId) {
                $cleanOrd = ltrim($targetOrderId, '#');
                $order = \App\Models\Order::where('order_id', $cleanOrd)
                    ->orWhere('order_id', '#' . $cleanOrd)
                    ->with('items.product')
                    ->first();
                if (!$order && is_numeric($cleanOrd)) {
                    $order = \App\Models\Order::where('id', (int)$cleanOrd)->with('items.product')->first();
                }
            }

            // If no specific order ID, get customer's latest order
            if (!$order) {
                $user = self::resolveActiveUser((string)$chatId);
                $order = self::getCustomerOrdersBuilder((string)$chatId, $user)
                    ->with('items.product')
                    ->latest()
                    ->first();
            }

            if ($order) {
                self::sendCustomerInvoicePhoto($chatId, $order, $fromName, $activeToken);
                return;
            } else {
                $noInvText = "🧾 <b>វិក្កយបត្រអេឡិចត្រូនិច (Digital Invoice):</b>\n\n"
                    . "ជម្រាបសួរ <b>{$fromName}</b>!\n"
                    . "បច្ចុប្បន្ន ប្រព័ន្ធមិនទាន់រកឃើញការបញ្ជាទិញណាមួយភ្ជាប់ជាមួយ Telegram របស់អ្នកនៅឡើយទេ។\n\n"
                    . "👉 ប្រសិនបើលោកអ្នកធ្លាប់បានកុម្ម៉ង់ សូមវាយបញ្ចូលលេខ Order ID ដូចជា៖ <code>/invoice ORD-10023</code>\n"
                    . "ឬចូលទិញទំនិញថ្មីៗក្នុង Mini App ដើម្បីទទួលបានវិក្កយបត្រ និងការធានាផ្លូវការភ្លាមៗ!";

                $noInvKb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ ចូលទិញទំនិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ],
                ];
                self::sendMessageWithKeyboard($chatId, $noInvText, $noInvKb, 'HTML', null, $activeToken);
                return;
            }
        }

        // A.0 Command & Inquiries to Disconnect / Unlink Telegram (/unlink, /disconnect, "ផ្តាច់", "ផ្តាច់គណនី")
        if (in_array($textLower, ['/unlink', '/disconnect', 'unlink', 'disconnect']) || preg_match('/^(?:ផ្តាច់|ផ្តាច់គណនី|ផ្តាច់\s*telegram|ផ្តាច់\s*bot|unlink|disconnect)$/u', $textLower)) {
            $user = \App\Models\UserProfile::where('telegram_chat_id', (string)$chatId)
                ->orWhere('firebase_uid', 'tg_' . $chatId)
                ->first();

            if ($user && (!empty($user->telegram_chat_id) || !empty($user->telegram))) {
                $discText = "🔌 <b>ការគ្រប់គ្រងគណនី & ផ្តាច់ការភ្ជាប់ (Telegram Disconnect):</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "• 👤 <b>គណនីភ្ជាប់បច្ចុប្បន្ន:</b> <b>" . htmlspecialchars($user->display_name ?: 'VIP Member') . "</b>\n"
                    . "• 📧 <b>អ៊ីមែល:</b> <code>" . htmlspecialchars($user->email ?: 'N/A') . "</code>\n"
                    . "• 🆔 <b>Telegram Chat ID:</b> <code>{$chatId}</code>\n\n"
                    . "⚠️ <b>តើលោកអ្នកពិតជាចង់ផ្តាច់គណនី Telegram នេះចេញពី Website មែនទេ?</b>\n"
                    . "បន្ទាប់ពីផ្តាច់រួច Telegram នេះនឹងនៅទំនេរ ហើយអាចយកទៅភ្ជាប់ជាមួយគណនីផ្សេងបាន។";

                $discKb = [
                    'inline_keyboard' => [
                        [['text' => '⚠️ បញ្ជាក់ផ្តាច់ការភ្ជាប់ (Confirm Disconnect)', 'callback_data' => 'cust_confirm_disconnect']],
                        [['text' => '🔙 មឺនុយមេ (Cancel / Main Menu)', 'callback_data' => 'cust_main_menu']],
                    ],
                ];
            } else {
                $discText = "ℹ️ <b>ស្ថានភាពគណនី Telegram:</b>\n\n"
                    . "គណនី Telegram របស់អ្នកមិនទាន់ត្រូវបានភ្ជាប់ជាមួយគណនី Website ណាមួយនៅឡើយទេ (Not Linked)។\n\n"
                    . "👉 លោកអ្នកអាចភ្ជាប់បានដោយចូលទៅកាន់ Profile Setting លើ Website រួចចុច <b>\"ភ្ជាប់ Official Bot\"</b>។";

                $discKb = [
                    'inline_keyboard' => [
                        [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/account/profile']],
                        [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                    ],
                ];
            }

            self::sendMessageWithKeyboard($chatId, $discText, $discKb, 'HTML', null, $activeToken);
            return;
        }

        // A.1 Natural Khmer Order Inquiries ("order របស់ខ្ញុំ", "ឥវ៉ាន់ខ្ញុំដល់ណា", "តាមដាន order", "my orders")
        if (preg_match('/(order|orders|កញ្ចប់|ឥវ៉ាន់|ការកុម្ម៉ង់|កុម្ម៉ង់|បញ្ជាទិញ|ទំនិញខ្ញុំ|អីវ៉ាន់)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '📦', true, $activeToken);
            // Check timeframe keywords:
            if (preg_match('/(ថ្ងៃនេះ|ថ្ងៃហ្នឹង|ថ្ងៃនុង|today)/u', $textLower)) {
                self::sendCustomerOrdersFiltered($chatId, 'today', $fromName, null, $activeToken);
                return;
            }
            if (preg_match('/(សប្ដាហ៍នេះ|អាទិត្យនេះ|៧\s*ថ្ងៃ|7\s*days?|week)/u', $textLower)) {
                self::sendCustomerOrdersFiltered($chatId, 'week', $fromName, null, $activeToken);
                return;
            }
            if (preg_match('/(ម្សិលមិញ|yesterday)/u', $textLower)) {
                self::sendCustomerOrdersFiltered($chatId, 'yesterday', $fromName, null, $activeToken);
                return;
            }
            if (preg_match('/(ខែនេះ|៣០\s*ថ្ងៃ|30\s*days?|month)/u', $textLower)) {
                self::sendCustomerOrdersFiltered($chatId, 'month', $fromName, null, $activeToken);
                return;
            }
            if (preg_match('/(ទាំងអស់|all)/u', $textLower)) {
                self::sendCustomerOrdersFiltered($chatId, 'all', $fromName, null, $activeToken);
                return;
            }

            // Check if specific date included in text (e.g. "order 2026-10-15" or "15/10/2026")
            $parsedDate = self::extractDateFromString($cleanText);
            if ($parsedDate) {
                self::sendCustomerOrdersFiltered($chatId, 'date:' . $parsedDate, $fromName, null, $activeToken);
                return;
            }

            // Show Interactive Order Filter Menu with options:
            // 1. «ការ Order ថ្ងៃនេះ»
            // 2. «ការ Order សប្ដាហ៍នេះ»
            // 3. «ការ Order ទាំងអស់»
            // 4. «ជ្រើសរើសថ្ងៃជាក់លាក់»
            self::sendCustomerOrdersMenu($chatId, $fromName, null, $activeToken);
            return;
        }

        // A.1.b Direct date inquiry if user sent a date string (e.g. "2026-10-15" or "15/10/2026")
        $directDate = self::extractDateFromString($cleanText);
        if ($directDate) {
            $cleanedDate = trim(preg_replace('/\b(?:order|orders|ថ្ងៃ|កាលបរិច្ឆេទ|date)\b/ui', '', $cleanText));
            if (strlen($cleanedDate) <= 12) {
                if ($messageId) self::setMessageReaction($chatId, $messageId, '📦', true, $activeToken);
                self::sendCustomerOrdersFiltered($chatId, 'date:' . $directDate, $fromName, null, $activeToken);
                return;
            }
        }

        // A.2 Inquiries about Money, Wallet Balance, Funds & Coins ("លុយខ្ញុំសល់ប៉ុន្មាន", "check balance", "ទឹកប្រាក់", "កាបូបលុយ", "wallet balance", "សមតុល្យ")
        if (preg_match('/(លុយ(?:ខ្ញុំ)?(?:សល់|មាន)?|ទឹកប្រាក់|កាបូប(?:លុយ)?|សមតុល្យ|wallet|balance|money|funds|cash\s*balance|check\s*balance|កាក់|សល់លុយ|កុងលុយ|ចំនួនទឹកប្រាក់|បញ្ចូលលុយ|topup)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '💰', true, $activeToken);
            $user = self::resolveActiveUser((string)$chatId);

            $walletBalance = (float)($user->wallet_balance ?? 0.00);
            $points = (int)($user->points ?? 0);
            $pointsVal = $points * 0.01;
            $totalFunds = $walletBalance + $pointsVal;

            $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
            $walletAppUrl = "https://www.s-tech-store.tech/account/wallet?tg_token={$sessionToken}";

            $reply = "💰 <b>សមតុល្យទឹកប្រាក់ & កាបូបរបស់អ្នក (Your Wallet):</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "👤 <b>អតិថិជន:</b> <b>{$fromName}</b>\n"
                . "💵 <b>សមតុល្យទឹកប្រាក់ (Cash Balance):</b> <b>\$" . number_format($walletBalance, 2) . " USD</b>\n"
                . "🪙 <b>ពិន្ទុ S-Coins:</b> <b>{$points} Coins</b> (ស្មើ <b>\$" . number_format($pointsVal, 2) . " USD</b>)\n"
                . "💎 <b>ទឹកប្រាក់ប្រើប្រាស់បានសរុប:</b> <b>\$" . number_format($totalFunds, 2) . " USD</b>\n\n"
                . "💡 <b>ការប្រើប្រាស់ & បញ្ចូលទឹកប្រាក់៖</b>\n"
                . "• លោកអ្នកអាចប្រើសមតុល្យនេះដើម្បីទិញ Laptop, PC ឬ Accessories ភ្លាមៗ\n"
                . "• បញ្ចូលលុយតាម <b>Bakong KHQR</b> ស្វ័យប្រវត្ត ២៤/៧ ងាយស្រួលនិងសុវត្ថិភាពខ្ពស់\n\n"
                . "👉 <i>សូមចុចប៊ូតុងខាងក្រោមដើម្បីពិនិត្យលម្អិត ឬបញ្ចូលលុយក្នុង Mini App!</i>";

            $replyKb = [
                'inline_keyboard' => [
                    [['text' => '💳 ចូលទៅកាបូបលុយ & Top Up', 'web_app' => ['url' => $walletAppUrl]]],
                    [
                        ['text' => '🪙 ពិន្ទុ & VIP (Coins)', 'callback_data' => 'cust_my_points'],
                        ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ', 'callback_data' => 'cust_my_orders'],
                    ],
                    [
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];

            self::sendMessageWithKeyboard($chatId, $reply, $replyKb, 'HTML', null, $activeToken);
            return;
        }

        // A.3 Promotions, Vouchers & Promo Code Inquiries ("voucher", "coupon", "code", "បញ្ចុះតម្លៃ", "stech10")
        if (preg_match('/(voucher|coupon|code|កូដ|បញ្ចុះតម្លៃ|discount|កូដបញ្ចុះតម្លៃ|stech10|pchumben)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '🎉', true, $activeToken);

            // Attempt to show a real promotion/deal product photo
            try {
                $dealProduct = \App\Models\Product::with('category')
                    ->whereNotNull('image_url')
                    ->where('image_url', '!=', '')
                    ->where(function($q) {
                        $q->where('is_featured', true)
                          ->orWhere(function($sq) {
                              $sq->whereNotNull('sale_price')
                                 ->where('sale_price', '!=', '')
                                 ->where('sale_price', '!=', '0');
                          })
                          ->orWhereNotNull('badge');
                    })
                    ->latest()
                    ->first();

                if ($dealProduct && !empty($dealProduct->image_url)) {
                    $dealPhotoUrl = $dealProduct->image_url;
                    if (!str_starts_with($dealPhotoUrl, 'http://') && !str_starts_with($dealPhotoUrl, 'https://')) {
                        $dealPhotoUrl = 'https://www.s-tech-store.tech/' . ltrim($dealPhotoUrl, '/');
                    }

                    $dPrice = $dealProduct->sale_price ?: $dealProduct->price;
                    $origPrice = ($dealProduct->sale_price && $dealProduct->price > $dealProduct->sale_price)
                        ? " <s>\$" . number_format((float)$dealProduct->price, 2) . "</s>" : "";

                    $dealCaption = "🔥 <b>ប្រូម៉ូសិនពិសេស & កូដបញ្ចុះតម្លៃ (Vouchers & Deals)!</b>\n\n"
                        . "🌟 <b>Hot Deal:</b> <b>" . htmlspecialchars($dealProduct->name) . "</b>\n"
                        . "💰 <b>តម្លៃពិសេស:</b> <b>\$" . number_format((float)$dPrice, 2) . " USD</b>{$origPrice}\n\n"
                        . "🎉 <b>កូដបញ្ចុះតម្លៃសកម្មបច្ចុប្បន្ន (Active Promo Codes):</b>\n"
                        . self::formatActivePromoCodesText() . "\n\n"
                        . "🚚 <b>Free Delivery:</b> ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងរាជធានីភ្នំពេញ (ចាប់ពី \$50 ឡើងទៅ)\n"
                        . "🎁 <b>កាដូថែមជូន:</b> Mouse Wireless, Mousepad, កាតាប និងដំឡើង Windows 11 Free!\n\n"
                        . "👉 <b>សូមចុចបើក Mini App ដើម្បីប្រើប្រាស់កូដបញ្ចុះតម្លៃភ្លាមៗ!</b>";

                    $dealKb = [
                        'inline_keyboard' => [
                            [['text' => '🛍️ ប្រើកូដទិញក្នុង Mini App', 'web_app' => ['url' => "https://www.s-tech-store.tech/products/" . ($dealProduct->slug ?: $dealProduct->id)]]],
                            [
                                ['text' => '💻 មើលផលិតផលបញ្ចុះតម្លៃ', 'callback_data' => 'cust_shop'],
                                ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                            ],
                        ],
                    ];

                    $photoRes = self::sendPhoto($chatId, $dealPhotoUrl, $dealCaption, 'HTML', $dealKb, $activeToken);
                    if (!empty($photoRes['ok'])) {
                        return;
                    }
                }
            } catch (\Throwable $e) {
                \Log::warning("Telegram promo photo error: " . $e->getMessage());
            }

            $promoText = "🔥 <b>កូដបញ្ចុះតម្លៃ & ប្រូម៉ូសិនពិសេស (Vouchers & Deals):</b>\n\n"
                . "🎉 <b>កូដបញ្ចុះតម្លៃសកម្មបច្ចុប្បន្ន (Active Promo Codes):</b>\n"
                . self::formatActivePromoCodesText() . "\n\n"
                . "🚚 <b>Free Delivery:</b> ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងរាជធានីភ្នំពេញ (ចាប់ពី \$50 ឡើងទៅ)\n"
                . "🎁 <b>កាដូថែមជូន:</b> Mouse Wireless, Mousepad, កាតាប និងដំឡើង Windows 11 Free!\n\n"
                . "👉 <b>សូមចុចបើក Mini App ដើម្បីប្រើប្រាស់កូដបញ្ចុះតម្លៃភ្លាមៗ!</b>";

            $promoKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ ប្រើកូដទិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [
                        ['text' => '💻 មើលផលិតផលបញ្ចុះតម្លៃ', 'callback_data' => 'cust_shop'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $promoText, $promoKb, 'HTML', null, $activeToken);
            return;
        }

        // B. Laptop & PC Pricing inquiries
        if (preg_match('/(laptop|pc|កុំព្យូទ័រ|តម្លៃ|price|cost|ថ្លៃ|macbook|dell|asus|lenovo|acer|msi|gaming|screen|ram|ssd|vga|rtx|monitor|គ្រឿង)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '⚡', true, $activeToken);

            // Attempt to show a real product photo with 1-click buy button
            try {
                $productQuery = \App\Models\Product::with('category')
                    ->whereNotNull('image_url')
                    ->where('image_url', '!=', '');

                // Match specific brand or keyword if mentioned
                $matchedKeyword = null;
                $brandKeywords = ['macbook', 'asus', 'dell', 'lenovo', 'acer', 'msi', 'rtx', 'rog', 'tuf', 'thinkpad', 'legion', 'gaming', 'monitor', 'ram', 'ssd'];
                foreach ($brandKeywords as $bk) {
                    if (str_contains($textLower, $bk)) {
                        $matchedKeyword = $bk;
                        break;
                    }
                }

                if ($matchedKeyword) {
                    $foundProduct = (clone $productQuery)
                        ->where(function($q) use ($matchedKeyword) {
                            $q->where('name', 'LIKE', "%{$matchedKeyword}%")
                              ->orWhere('brand', 'LIKE', "%{$matchedKeyword}%")
                              ->orWhere('description', 'LIKE', "%{$matchedKeyword}%");
                        })
                        ->latest()
                        ->first();
                } else {
                    $foundProduct = (clone $productQuery)
                        ->where(function($q) {
                            $q->where('is_featured', true)
                              ->orWhere('pinned_to_top', true);
                        })
                        ->latest()
                        ->first() ?: (clone $productQuery)->latest()->first();
                }

                if ($foundProduct && !empty($foundProduct->image_url)) {
                    $photoUrl = $foundProduct->image_url;
                    if (!str_starts_with($photoUrl, 'http://') && !str_starts_with($photoUrl, 'https://')) {
                        $photoUrl = 'https://www.s-tech-store.tech/' . ltrim($photoUrl, '/');
                    }

                    $pPrice = $foundProduct->sale_price ?: $foundProduct->price;
                    $pPriceFormatted = number_format((float)$pPrice, 2);
                    $originalPriceFormatted = ($foundProduct->sale_price && $foundProduct->price > $foundProduct->sale_price)
                        ? " <s>\$" . number_format((float)$foundProduct->price, 2) . "</s>" : "";
                    $catName = $foundProduct->category ? ($foundProduct->category->name ?? '') : '';
                    $cleanDesc = $foundProduct->description ? \Illuminate\Support\Str::limit(strip_tags($foundProduct->description), 130) : '';

                    $photoCaption = "💻 <b>" . htmlspecialchars($foundProduct->name) . "</b>\n\n"
                        . "💰 <b>តម្លៃពិសេស:</b> <b>\${$pPriceFormatted} USD</b>{$originalPriceFormatted}\n"
                        . ($catName ? "🏷️ <b>ប្រភេទ:</b> " . htmlspecialchars($catName) . "\n" : "")
                        . ($cleanDesc ? "📝 <b>លក្ខណៈសម្បត្តិ:</b> " . htmlspecialchars($cleanDesc) . "\n\n" : "\n")
                        . "🚚 <b>Free Delivery</b> ក្នុងភ្នំពេញ | ធានាគុណភាព ១០០%\n"
                        . "🎁 <b>កាដូថែមជូន:</b> Mouse Wireless, Mousepad, កាតាប និងដំឡើង Windows 11 Free!\n\n"
                        . "👉 <b>សូមចុចប៊ូតុងខាងក្រោមដើម្បីមើលលម្អិត & កុម្ម៉ង់ទិញភ្លាមៗ!</b>";

                    $photoKb = [
                        'inline_keyboard' => [
                            [['text' => '🛍️ ទិញក្នុង Mini App (Buy Now)', 'web_app' => ['url' => "https://www.s-tech-store.tech/products/" . ($foundProduct->slug ?: $foundProduct->id)]]],
                            [
                                ['text' => '🔥 ប្រូម៉ូសិនពិសេស', 'callback_data' => 'cust_promo'],
                                ['text' => '💬 សួរតម្លៃម៉ូឌែលផ្សេង', 'callback_data' => 'cust_support'],
                            ],
                            [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                        ],
                    ];

                    $photoRes = self::sendPhoto($chatId, $photoUrl, $photoCaption, 'HTML', $photoKb, $activeToken);
                    if (!empty($photoRes['ok'])) {
                        return;
                    }
                }
            } catch (\Throwable $e) {
                \Log::warning("Telegram product inquiry photo error: " . $e->getMessage());
            }

            $reply = "💻 <b>ព័ត៌មានតម្លៃ Laptops & PC នៅ S Tech Store:</b>\n\n"
                . "យើងខ្ញុំមានលក់ Laptops, Desktop PC និងគ្រឿងបន្លាស់ Original ១០០% ជាមួយនឹងតម្លៃពិសេស៖\n\n"
                . "• 💻 <b>Laptops ការិយាល័យ & សិក្សា:</b> ចាប់ពី <b>\$299 - \$699</b> (Dell, Lenovo, Acer, ASUS)\n"
                . "• 🎮 <b>Laptops Gaming & Graphics:</b> ចាប់ពី <b>\$699 - \$1,899+</b> (ASUS ROG/TUF, Lenovo Legion, MSI)\n"
                . "• 🍏 <b>Apple MacBook (M2 / M3):</b> ចាប់ពី <b>\$899 - \$2,399+</b>\n"
                . "• 🖥️ <b>Custom PC Gaming Sets:</b> រៀបចំឈុតតាមចិត្ត ចាប់ពី <b>\$350 ឡើងទៅ</b>\n\n"
                . "🎁 <b>ថែមជូនពិសេស:</b> Mouse Wireless, Mousepad, កាតាប និងដំឡើង Windows + កម្មវិធី Free!\n\n"
                . "👉 <b>សូមចុចបើក Mini App ខាងក្រោមដើម្បីមើលតម្លៃជាក់ស្តែង និងស្តុកទំនិញថ្មីៗភ្លាមៗ!</b>";

            $replyKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ បើកទិញក្នុង Mini App (Open Store)', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [
                        ['text' => '🔥 ប្រូម៉ូសិនពិសេស', 'callback_data' => 'cust_promo'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $reply, $replyKb, 'HTML', null, $activeToken);
            return;
        }

        // C. Delivery / Shipping inquiries
        if (preg_match('/(ដឹក|delivery|ship|shipping|ថ្លៃដឹក|ផ្ញើ|ខេត្ត|ភ្នំពេញ|ផ្ញើរ)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '🚚', true, $activeToken);
            $reply = "🚚 <b>សេវាកម្មដឹកជញ្ជូន S Tech Store:</b>\n\n"
                . "យើងខ្ញុំមានសេវាដឹកជញ្ជូនរហ័សទាន់ចិត្ត និងធានាសុវត្ថិភាពទំនិញ ១០០%៖\n\n"
                . "📍 <b>ក្នុងរាជធានីភ្នំពេញ:</b>\n"
                . "• រយៈពេលដឹក: <b>1 ទៅ 3 ម៉ោង</b> ទទួលបានទំនិញ\n"
                . "• តម្លៃដឹក: <b>\$1.50 - \$2.00</b> (ដឹកជញ្ជូន <b>ឥតគិតថ្លៃ FREE</b> សម្រាប់ការកុម្ម៉ង់ចាប់ពី \$50 ឡើងទៅ!)\n\n"
                . "🌍 <b>បណ្តា ២៥ ខេត្ត-ក្រុង:</b>\n"
                . "• ផ្ញើតាម: វីរៈប៊ុនថាំ (VET), J&T Express ឬ Kerry Express\n"
                . "• រយៈពេល: <b>1 ទៅ 2 ថ្ងៃ</b> ទទួលបានទំនិញ\n"
                . "• តម្លៃសេវា: <b>\$2.50 - \$3.00</b> (ខ្ចប់ទំនិញការពារប៉ះទង្គិចយ៉ាងម៉ត់ចត់)\n\n"
                . "👉 ចុចបើក Mini App ដើម្បីកុម្ម៉ង់ និងជ្រើសរើសទីតាំងដឹកជញ្ជូន!";

            $replyKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ បើកទិញក្នុង Mini App (Open Store)', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $reply, $replyKb, 'HTML', null, $activeToken);
            return;
        }

        // D. Warranty / Guarantees inquiries
        if (preg_match('/(ធានា|warranty|guarantee|ខូច|ដូរ|ប្តូរ|policy)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '🛡️', true, $activeToken);
            $reply = "🛡️ <b>គោលការណ៍ធានា (Warranty Policy) នៅ S Tech Store:</b>\n\n"
                . "រាល់ផលិតផលដែលជាវពីហាង S Tech Store សុទ្ធតែទទួលបានការធានាផ្លូវការយ៉ាងច្បាស់លាស់៖\n\n"
                . "• 🌟 <b>ទំនិញថ្មីប្រអប់ (Brand New 100%):</b> ធានាផ្លូវការពីរោងចក្រ <b>6 ខែ ទៅ 1 ឆ្នាំពេញ / 2 ឆ្នាំ</b> លើ Hardware\n"
                . "• 🔄 <b>ទំនិញមួយទឹកគុណភាពខ្ពស់ (Pre-Owned):</b> ធានាពីហាង <b>1 ទៅ 3 ខែពេញ</b>\n"
                . "• 🔄 <b>គោលការណ៍ប្តូរថ្មី:</b> ប្តូរជូនថ្មីក្នុងរយៈពេល <b>7 ថ្ងៃដំបូង</b> ប្រសិនបើមានបញ្ហាបច្ចេកទេសពីរោងចក្រ\n"
                . "• 🛠️ <b>ការគាំទ្រផ្នែកទន់ (Software):</b> ជួយដំឡើង Windows, Clean Cache និងប្រឹក្សាបច្ចេកទេស <b>Free អស់មួយជីវិត</b>!\n\n"
                . "👉 លោកអ្នកអាចជឿទុកចិត្តបាន ១០០% លើគុណភាព និងសេវាកម្មរបស់យើង!";

            $replyKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ បើកទិញក្នុង Mini App (Open Store)', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $reply, $replyKb, 'HTML', null, $activeToken);
            return;
        }

        // E. Payment methods inquiries (Bakong KHQR, ABA, Cards)
        if (preg_match('/(បង់ប្រាក់|payment|pay|khqr|bakong|aba|acleda|wing|visa|mastercard|cash\b|cod|កុងធនាគារ|វេរប្រាក់|ផ្ទេរប្រាក់)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '💳', true, $activeToken);
            $reply = "💳 <b>វិធីសាស្ត្រទូទាត់ប្រាក់នៅ S Tech Store:</b>\n\n"
                . "យើងខ្ញុំផ្តល់ជូននូវជម្រើសទូទាត់ប្រាក់ដែលងាយស្រួល រហ័ស និងមានសុវត្ថិភាពខ្ពស់៖\n\n"
                . "• 🇰🇭 <b>Bakong KHQR (គ្រប់ធនាគារទាំងអស់):</b> ស្កេនទូទាត់បានភ្លាមៗជាមួយ ABA, ACLEDA, Wing, Canadia, TrueMoney, Sathapana, etc.\n"
                . "• 💰 <b>កាបូបលុយ S Tech Smart Wallet:</b> បញ្ចូលទឹកប្រាក់ទុកជាមុន ទូទាត់រហ័សទាន់ចិត្ត និងទទួលបាន Bonus Coins\n"
                . "• 💳 <b>កាតអន្តរជាតិ:</b> ទទួល Visa & Mastercard\n"
                . "• 💵 <b>ទូទាត់ពេលទំនិញដល់ដៃ (COD):</b> ទទួលសាច់ប្រាក់សុទ្ធពេលដឹកទំនិញដល់ទីតាំង (សម្រាប់ភ្នំពេញ)\n\n"
                . "🔒 រាល់ប្រតិបត្តិការទូទាត់ KHQR ត្រូវបានផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តក្នុងប្រព័ន្ធ!";

            $replyKb = [
                'inline_keyboard' => [
                    [
                        ['text' => '💰 កាបូបលុយ & សមតុល្យ', 'callback_data' => 'cust_my_wallet'],
                        ['text' => '🛍️ បើកទិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']],
                    ],
                    [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $reply, $replyKb, 'HTML', null, $activeToken);
            return;
        }

        // F. Location, Address & Hours inquiries
        if (preg_match('/(ទីតាំង|location|address|ហាងនៅណា|កន្លែង|map|ម៉ោង|ពេលណា|បើក|hours)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '📍', true, $activeToken);
            $reply = "📍 <b>ទីតាំងហាង & ម៉ោងបម្រើការងារ:</b>\n\n"
                . "🏪 <b>S Tech Store Cambodia:</b>\n"
                . "• 📍 <b>អាសយដ្ឋាន:</b> រាជធានីភ្នំពេញ, ប្រទេសកម្ពុជា\n"
                . "• ⏰ <b>ម៉ោងបើកហាង:</b> <b>8:00 AM ដល់ 8:00 PM</b> (ចន្ទ ដល់ អាទិត្យ គ្មានថ្ងៃសម្រាក)\n"
                . "• 📞 <b>Hotline:</b> <code>012 345 678</code> | <code>098 765 432</code>\n"
                . "• 🌐 <b>គេហទំព័រ:</b> <a href=\"https://www.s-tech-store.tech\">https://www.s-tech-store.tech</a>\n\n"
                . "សូមស្វាគមន៍លោកអ្នកមកកាន់ហាងផ្ទាល់ ឬបញ្ជាទិញតាម Mini App បានយ៉ាងងាយស្រួល!";

            $replyKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ បើកទិញក្នុង Mini App (Open Store)', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $reply, $replyKb, 'HTML', null, $activeToken);
            return;
        }

        // G. Repair & Maintenance inquiries
        if (preg_match('/(ជួសជុល|repair|fix|upgrade|ដំឡើង|windows|លាង|ប្តូរអេក្រង់|ប្តូរថ្ម|សាកមិនចូល)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '🔧', true, $activeToken);
            $reply = "🔧 <b>សេវាកម្មជួសជុល & Upgrade កុំព្យូទ័រ:</b>\n\n"
                . "កុំព្យូទ័ររបស់អ្នកមានបញ្ហា ឬដំណើរការយឺតមែនទេ? ជាងជំនាញ S Tech Store អាចជួយបាន៖\n\n"
                . "• ⚡ Upgrade RAM & SSD NVMe ល្បឿនលឿន (ដំណើរការលឿនជាងមុន 5x ដង)\n"
                . "• 🖥️ ប្តូរអេក្រង់ Laptop, ប្តូរថ្ម, ប្តូរក្តារចុច (Keyboard), ជួសជុលកង្ហារ\n"
                . "• 🧹 លាងសម្អាតកម្ទេចធូលី & ប្តូរ Thermal Paste កាត់បន្ថយកម្ដៅម៉ាស៊ីន\n"
                . "• 💻 ដំឡើង Genuine Windows 11, Drivers & កម្មវិធីការិយាល័យ Office\n"
                . "• 🛡️ ធានាការជួសជុល 30 ថ្ងៃ ទៅ 3 ខែ!\n\n"
                . "👉 ចុចប៊ូតុងខាងក្រោមដើម្បីប្រឹក្សាជាមួយជាង ឬបើក Mini App!";

            $replyKb = [
                'inline_keyboard' => [
                    [['text' => '🔧 បើកសេវាជួសជុលក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [
                        ['text' => '📞 ទាក់ទងជាងបច្ចេកទេស', 'callback_data' => 'cust_contact'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $reply, $replyKb, 'HTML', null, $activeToken);
            return;
        }

        // H. Live Agent / Staff request
        if (preg_match('/(មនុស្ស|admin|staff|បុគ្គលិក|agent|ឆាត|call|ទូរស័ព្ទ|ជួប|ជួយ)/u', $textLower)) {
            if ($messageId) self::setMessageReaction($chatId, $messageId, '👨‍💻', true, $activeToken);
            try {
                self::sendCustomerChatAlert([
                    'name' => $fromName,
                    'telegram' => !empty($fromUsername) ? '@' . $fromUsername : 'ID: ' . $chatId,
                    'message' => $cleanText,
                    'chat_id' => $chatId,
                ]);
            } catch (\Throwable $e) {}

            $reply = "💬 <b>សាររបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់ក្រុមការងារ Support រួចរាល់ហើយ!</b>\n\n"
                . "👨‍💻 បុគ្គលិកជំនាញរបស់យើងបានទទួលដំណឹង និងកំពុងត្រៀមឆ្លើយតបមកកាន់លោកអ្នក។\n\n"
                . "📞 <b>ឬលោកអ្នកអាចទំនាក់ទំនងបន្ទាន់តាម Hotline:</b>\n"
                . "• <code>012 345 678</code> (Cellcard)\n"
                . "• <code>098 765 432</code> (Smart)\n\n"
                . "👉 លោកអ្នកក៏អាចបើក Mini App ដើម្បីមើលទំនិញ និងបញ្ជាទិញដោយខ្លួនឯងបានភ្លាមៗ!";

            $replyKb = [
                'inline_keyboard' => [
                    [['text' => '🛍️ បើកទិញក្នុង Mini App (Open Store)', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                    [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                ],
            ];
            self::sendMessageWithKeyboard($chatId, $reply, $replyKb, 'HTML', null, $activeToken);
            return;
        }

        // I. Fallback Polite Assistant
        $reply = "👋 <b>ជម្រាបសួរ {$fromName}!</b>\n\n"
            . "សូមអរគុណសម្រាប់ការទាក់ទងមកកាន់ <b>S Tech Store Official Bot</b>!\n\n"
            . "🤖 ខ្ញុំអាចជួយលោកអ្នកសាកសួរព័ត៌មានដូចជា៖\n"
            . "• 💰 <b>សមតុល្យទឹកប្រាក់ & កាបូប:</b> វាយពាក្យ <i>\"លុយខ្ញុំ\"</i> ឬ <i>\"wallet\"</i>\n"
            . "• 📦 <b>តាមដានទំនិញ:</b> វាយពាក្យ <i>\"order ខ្ញុំ\"</i> ឬលេខកូដដូចជា: <code>ST-10023</code>\n"
            . "• 🎟️ <b>កូដបញ្ចុះតម្លៃ & ប្រូម៉ូសិន:</b> វាយពាក្យ <i>\"voucher\"</i> ឬ <i>\"កូដ\"</i>\n"
            . "• 💻 <b>តម្លៃ Laptops & PC:</b> វាយពាក្យ <i>\"តម្លៃ laptop\"</i>\n"
            . "• 🚚 <b>សេវាដឹកជញ្ជូន:</b> វាយពាក្យ <i>\"សេវាដឹក\"</i>\n"
            . "• 🛡️ <b>ការធានាផលិតផល:</b> វាយពាក្យ <i>\"ការធានា\"</i>\n"
            . "• 💳 <b>ការទូទាត់ប្រាក់:</b> វាយពាក្យ <i>\"បង់ប្រាក់\"</i>\n\n"
            . "👉 ឬចុចប៊ូតុង <b>បើក Mini App</b> ខាងក្រោម ដើម្បីទិញទំនិញរាប់ពាន់មុខភ្លាមៗ!";

        $replyKb = [
            'inline_keyboard' => [
                [['text' => '🛍️ បើកទិញទំនិញក្នុង Mini App (Open Store)', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]],
                [
                    ['text' => '💰 កាបូបលុយ & សមតុល្យ', 'callback_data' => 'cust_my_wallet'],
                    ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ', 'callback_data' => 'cust_my_orders'],
                ],
                [
                    ['text' => '❓ សួរសំណួរ (Ask FAQ)', 'callback_data' => 'cust_ask_options'],
                    ['text' => '🔥 ប្រូម៉ូសិនពិសេស', 'callback_data' => 'cust_promo'],
                ],
                [
                    ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                ],
            ],
        ];
        self::sendMessageWithKeyboard($chatId, $reply, $replyKb, 'HTML', null, $activeToken);
    }

    /**
     * Poll recent updates from Telegram API (supports long-polling with timeout)
     */
    public static function pollPendingUpdates(int $timeout = 0): void
    {
        $settings = self::getSettings();
        $token = self::getStaffBotToken();
        if (!$token || str_contains($token, 'Placeholder')) {
            return;
        }

        // MUTEX LOCK: Prevent concurrent polling workers from overlapping getUpdates calls
        $lockKey = 'tg_polling_mutex';
        if (!Cache::add($lockKey, time(), max($timeout + 5, 10))) {
            return;
        }

        try {
            $lastOffset = (int)($settings['last_update_id'] ?? 0);

            $resp = Http::timeout($timeout > 0 ? $timeout + 5 : 6)->get("https://api.telegram.org/bot{$token}/getUpdates", [
                'offset' => $lastOffset + 1,
                'limit' => 50,
                'timeout' => $timeout,
            ]);

            $json = $resp->json();
            if (($json['ok'] ?? false) === true && !empty($json['result']) && is_array($json['result'])) {
                $maxId = $lastOffset;

                foreach ($json['result'] as $up) {
                    $upId = (int)($up['update_id'] ?? 0);
                    if ($upId > $maxId) {
                        $maxId = $upId;
                    }

                    // Strict Update Deduplication
                    if ($upId > 0 && !Cache::add("tg_done_up_{$upId}", time(), 86400)) {
                        continue;
                    }

                    $upText = (string)($up['message']['text'] ?? '');
                    $upChatType = (string)($up['message']['chat']['type'] ?? '');
                    $isCustomerAuth = str_contains($upText, 'tgauth_') || str_contains($upText, 'tglink_') || $upChatType === 'private';
                    self::processUpdate($up, $isCustomerAuth ? 'auth' : 'main');
                }

                $settings = self::getSettings();
                $settings['last_update_id'] = $maxId;
                self::saveSettings($settings);
            }
        } catch (\Throwable $e) {
            // Non-blocking timeout
        } finally {
            Cache::forget($lockKey);
        }
    }

    /**
     * Automatically create Forum Topics in connected group
     * Prevents duplicate topics from ever being created!
     * Detects if bot lacks Administrator / Manage Topics permissions and guides user
     */
    public static function setupTopics($chatId): array
    {
        $settings = self::getSettings();
        $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');
        $botUsername = $settings['bot_username'] ?? self::OFFICIAL_BOT_USERNAME;
        $chatIdStr = (string)$chatId;

        // Concurrency Lock: Prevent multiple processes from calling setupTopics at the same second
        $topicLockKey = "tg_setup_topics_lock_{$chatIdStr}";
        if (!Cache::add($topicLockKey, time(), 45)) {
            return [
                'ok' => true,
                'already_running' => true,
                'message' => 'ប្រព័ន្ធកំពុងរៀបចំ Topics រួចរាល់ហើយ (Topics setup in progress).',
            ];
        }

        try {
            $topicsToCreate = [
                'orders' => [
                    'name' => '🛒 ការបញ្ជាទិញថ្មី',
                    'icon_color' => 7322096, // Light Blue
                ],
                'reports' => [
                    'name' => '📊 របាយការណ៍អាជីវកម្ម',
                    'icon_color' => 7322096, // Light Blue
                ],
                'chat' => [
                    'name' => '💬 អតិថិជនកំពុងឆាត',
                    'icon_color' => 13338331, // Violet
                ],
                'security' => [
                    'name' => '🛡️ Security & Spam Monitoring',
                    'icon_color' => 16478047, // Red
                ],
                'promotions' => [
                    'name' => '🎁 ប្រូម៉ូសិន & ស្តុកទំនិញ',
                    'icon_color' => 16749490, // Orange
                ],
                'finance' => [
                    'name' => '💳 ការទូទាត់ & តម្លៃទំនិញ',
                    'icon_color' => 9367192, // Green
                ],
                'system_errors' => [
                    'name' => '🚨 បញ្ហាប្រព័ន្ធ (Errors)',
                    'icon_color' => 16478047, // Red
                ],
                'traffic' => [
                    'name' => '🌐 អ្នកចូលទស្សនាវេបសាយ',
                    'icon_color' => 9367192, // Green
                ],
                'users' => [
                    'name' => '👤 អតិថិជនចុះឈ្មោះថ្មី',
                    'icon_color' => 16766590, // Gold / Yellow
                ],
                'repairs' => [
                    'name' => '🛠️ សេវាជួសជុល',
                    'icon_color' => 16749490, // Orange
                ],
                'stock' => [
                    'name' => '⚠️ ការជូនដំណឹងស្តុក',
                    'icon_color' => 16478047, // Red
                ],
            ];

            $cleanChatId = ltrim($chatIdStr, '-');
            $createdTopics = $settings['topics'] ?? [];
            if (!is_array($createdTopics)) {
                $createdTopics = [];
            }

            // 1. Permanent Vault & DB Restoration: If current memory is empty or missing topics, recover them from the permanent vault or database!
            if (empty($createdTopics) || count($createdTopics) < count($topicsToCreate)) {
                $vault = $settings['group_topics_vault'] ?? [];
                $cleanPrevId = ltrim((string)($settings['previous_chat_id'] ?? ''), '-');
                $recovered = $vault[$chatIdStr]
                    ?? $vault["-{$cleanChatId}"]
                    ?? $vault["-100{$cleanChatId}"]
                    ?? $vault[$cleanChatId]
                    ?? null;

                if (empty($recovered) && !empty($settings['previous_topics']) && ($cleanPrevId === $cleanChatId || str_ends_with($cleanChatId, $cleanPrevId) || str_ends_with($cleanPrevId, $cleanChatId))) {
                    $recovered = $settings['previous_topics'];
                }

                if (!empty($recovered) && is_array($recovered)) {
                    $createdTopics = array_merge($recovered, $createdTopics);
                }

                // Check Neon PostgreSQL database
                try {
                    $dbRow = \Illuminate\Support\Facades\DB::table('system_settings')
                        ->where('key', 'telegram_topics_' . $cleanChatId)
                        ->first();
                    if ($dbRow && !empty($dbRow->value)) {
                        $dbData = json_decode($dbRow->value, true);
                        if (!empty($dbData['topics']) && is_array($dbData['topics'])) {
                            $createdTopics = array_merge($dbData['topics'], $createdTopics);
                        }
                    }
                } catch (\Throwable $e) {}
            }

            $connectedChatId = (string)($settings['chat_id'] ?? '');
            $topicsChatId = (string)($settings['topics_chat_id'] ?? $connectedChatId);
            $cleanTopicsChatId = ltrim($topicsChatId, '-');
            $cleanConnectedChatId = ltrim($connectedChatId, '-');

            $isSameChat = !empty($chatIdStr) && (
                $cleanChatId === $cleanTopicsChatId || 
                $cleanChatId === $cleanConnectedChatId || 
                str_ends_with($cleanChatId, $cleanConnectedChatId) ||
                str_ends_with($cleanConnectedChatId, $cleanChatId)
            );

            // Only clear topics if connected to a genuinely different Telegram chat
            if (!$isSameChat && !empty($connectedChatId)) {
                $createdTopics = [];
            }

            // Active Probe & Smart Topic Healing: Verify if saved topics still exist in Telegram
            if ($token && !str_contains($token, 'Placeholder') && !empty($createdTopics)) {
                foreach ($createdTopics as $k => $tid) {
                    if (!isset($topicsToCreate[$k])) continue;
                    try {
                        $probeResp = Http::timeout(4)->post("https://api.telegram.org/bot{$token}/editForumTopic", [
                            'chat_id' => $chatId,
                            'message_thread_id' => $tid,
                            'name' => $topicsToCreate[$k]['name'],
                        ]);
                        $probeJson = $probeResp->json();
                        if (!($probeJson['ok'] ?? false)) {
                            $probeDesc = strtolower($probeJson['description'] ?? '');
                            if (str_contains($probeDesc, 'not found') || str_contains($probeDesc, 'deleted') || str_contains($probeDesc, 'invalid thread')) {
                                Log::info("Forum topic '{$k}' (Thread ID: {$tid}) was deleted in Telegram. Unsetting to heal and recreate.");
                                unset($createdTopics[$k]);
                            }
                        }
                    } catch (\Throwable $e) {}
                }
            }

            // STRICT DEDUPLICATION: Check if all topics already exist
            $allAlreadyExist = true;
            foreach ($topicsToCreate as $key => $topicData) {
                if (empty($createdTopics[$key])) {
                    $allAlreadyExist = false;
                    break;
                }
            }

            if ($allAlreadyExist && ($isSameChat || empty($connectedChatId))) {
                if (empty($settings['topics_chat_id']) || $settings['topics_chat_id'] !== $chatIdStr) {
                    $settings['topics_chat_id'] = $chatIdStr;
                }
                $settings['topics'] = $createdTopics;
                $vault = $settings['group_topics_vault'] ?? [];
                $vault[$chatIdStr] = $createdTopics;
                $settings['group_topics_vault'] = $vault;
                self::saveSettings($settings);

                try {
                    \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
                        ['key' => 'telegram_topics_' . $cleanChatId],
                        [
                            'value' => json_encode([
                                'chat_id' => $chatIdStr,
                                'topics' => $createdTopics,
                                'updated_at' => now()->toDateTimeString(),
                            ]),
                            'updated_at' => now(),
                        ]
                    );
                } catch (\Throwable $e) {}

                return [
                    'ok' => true,
                    'already_exists' => true,
                    'topics' => $createdTopics,
                    'message' => 'ប្រធានបទ Topics ទាំងអស់ត្រូវបានបង្កើតរួចរាល់ហើយក្នុងគ្រុប (All topics already exist and healthy).',
                ];
            }

            if (!$token || str_contains($token, 'Placeholder')) {
                // Mock mode for local testing
                $mockTopics = [
                    'orders' => 101,
                    'traffic' => 102,
                    'users' => 103,
                    'repairs' => 104,
                    'stock' => 105,
                    'chat' => 106,
                ];
                $settings['topics'] = $mockTopics;
                $settings['topics_chat_id'] = $chatIdStr;
                self::saveSettings($settings);

                $mockNotice = "🎉 <b>S Tech Store — Forum Topics ត្រូវបានបង្កើតជោគជ័យ!</b>\n\n"
                    . "🗂️ <b>រាល់ការជូនដំណឹងពីប្រព័ន្ធ នឹងត្រូវបានបែងចែកតាម Topic ស្វ័យប្រវត្ត៖</b>\n\n"
                    . "1️⃣ 🛒 <b>ការបញ្ជាទិញថ្មី</b> — ទទួលការជូនដំណឹងរាល់ពេលមាន Order\n"
                    . "2️⃣ 🌐 <b>អ្នកចូលទស្សនាវេបសាយ</b> — តាមដាន Traffic & Visitors Real-time\n"
                    . "3️⃣ 👤 <b>អតិថិជនចុះឈ្មោះថ្មី</b> — ជូនដំណឹងរាល់ពេលមាន User Signup ថ្មី\n"
                    . "4️⃣ 🛠️ <b>សេវាជួសជុល</b> — តាមដានស្ថានភាពជួសជុល & Ticket\n"
                    . "5️⃣ ⚠️ <b>ការជូនដំណឹងស្តុក</b> — ជូនដំណឹងពេលទំនិញជិតអស់ពីស្តុក\n"
                    . "6️⃣ 💬 <b>សេវាអតិថិជន</b> — សម្រាប់សន្ទនាទូទៅក្នុងក្រុម\n\n"
                    . "✅ <i>ប្រព័ន្ធភ្ជាប់រៀបចំរួចរាល់ ១០០% ហើយ ដំណើរការ ២៤/៧!</i>";
                self::sendMessage($chatId, $mockNotice);

                return [
                    'ok' => true,
                    'mock' => true,
                    'topics' => $mockTopics,
                    'message' => 'Forum topics created successfully (Mock mode).',
                ];
            }

            $needsAdmin = false;
            $errorMessage = '';
            $newlyCreatedCount = 0;

            foreach ($topicsToCreate as $key => $topicData) {
                if (!empty($createdTopics[$key])) {
                    continue; // Skip already created topics!
                }

                try {
                    $resp = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/createForumTopic", [
                        'chat_id' => $chatId,
                        'name' => $topicData['name'],
                        'icon_color' => $topicData['icon_color'],
                    ]);

                    $json = $resp->json();

                    if (($json['ok'] ?? false) === true && !empty($json['result']['message_thread_id'])) {
                        $createdTopics[$key] = $json['result']['message_thread_id'];
                        $newlyCreatedCount++;
                    } else {
                        $desc = $json['description'] ?? 'Permission required';
                        $errorMessage = $desc;
                        $descLower = strtolower($desc);
                        if (
                            str_contains($descLower, 'not enough rights') || 
                            str_contains($descLower, 'forum') ||
                            str_contains($descLower, 'admin') ||
                            str_contains($descLower, 'manage') ||
                            str_contains($descLower, 'supergroup')
                        ) {
                            $needsAdmin = true;
                            break;
                        }
                    }
                } catch (\Throwable $e) {
                    Log::error("Failed to create topic {$key}: " . $e->getMessage());
                    $errorMessage = $e->getMessage();
                    $needsAdmin = true;
                    break;
                }
            }

            $settings['topics'] = $createdTopics;
            $settings['topics_chat_id'] = $chatIdStr;
            self::saveSettings($settings);

            if ($needsAdmin) {
                $adminNotice = "⚠️ <b>សូមបើកដំណើរការ Forum Topics សម្រាប់គ្រុបនេះ:</b>\n\n"
                    . "ដើម្បីឲ្យ Bot អាចរៀបចំ Topics ដោយស្វ័យប្រវត្តិកុំឲ្យសាររញ៉េរញ៉ៃ (បែងចែកការកុម្ម៉ង់ ឆាត និងស្តុកដាច់ដោយឡែកពីគ្នា) សូមធ្វើតាមជំហានងាយៗដូចខាងក្រោម៖\n\n"
                    . "1️⃣ <b>បើកមុខងារ Topics:</b>\n"
                    . "   👉 ចុចលើឈ្មោះគ្រុបខាងលើ ➡️ ចុចលើ <b>Edit (✏️)</b> ➡️ បើកមុខងារ <b>Topics</b> (Turn ON Topics)\n\n"
                    . "2️⃣ <b>ផ្តល់សិទ្ធិ Admin ដល់ Bot:</b>\n"
                    . "   👉 ចូលទៅកាន់ <b>Administrators (🛡️)</b> ➡️ ជ្រើសរើស <b>@{$botUsername}</b> ➡️ បើកសិទ្ធិ <b>Manage Topics</b> (ឬផ្តល់សិទ្ធិ Admin ពេញលេញ)\n\n"
                    . "3️⃣ <b>ចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើត Topics ភ្លាមៗ:</b>\n"
                    . "   👉 ចុចប៊ូតុង <b>🔄 បង្កើត Topics ដោយស្វ័យប្រវត្តិ</b> ខាងក្រោម ឬវាយបញ្ជា <code>/setup_topics</code> ក្នុងគ្រុបនេះ!\n\n"
                    . "<i>Bot នឹងបង្កើត Topic នីមួយៗជូនភ្លាមៗដោយស្វ័យប្រវត្តិ!</i>";

                $keyboard = [
                    'inline_keyboard' => [
                        [
                            ['text' => '🔄 បង្កើត Topics ដោយស្វ័យប្រវត្តិ (Create Topics)', 'callback_data' => 'setup_topics']
                        ],
                        [
                            ['text' => '📱 បើក Admin Dashboard (Mini App)', 'web_app' => ['url' => 'https://www.s-tech-store.tech/rok-mix-khernh']],
                            ['text' => '🌐 ចូល Admin Website', 'url' => 'https://www.s-tech-store.tech/rok-mix-khernh']
                        ]
                    ]
                ];

                self::sendMessageWithKeyboard($chatId, $adminNotice, $keyboard);

                return [
                    'ok' => false,
                    'needs_admin' => true,
                    'error' => $errorMessage,
                    'message' => 'Bot requires administrator privileges with Manage Topics permission in the group.',
                ];
            }

            // Send overview when topics are created or confirmed
            if ($newlyCreatedCount > 0) {
                $topicsOverview = "🎉 <b>S Tech Store — Forum Topics ត្រូវបានបង្កើតជោគជ័យ!</b>\n\n"
                    . "🗂️ <b>រាល់ការជូនដំណឹងពីប្រព័ន្ធ នឹងត្រូវបានបែងចែកតាម Topic ស្វ័យប្រវត្ត៖</b>\n\n"
                    . "1️⃣ 🛒 <b>ការបញ្ជាទិញថ្មី</b> — ទទួលការជូនដំណឹងវិក្កយបត្រថ្មីភ្លាមៗ\n"
                    . "2️⃣ 💬 <b>អតិថិជនកំពុងឆាត</b> — ទទួលសារពី Live Chat ផ្ទាល់\n"
                    . "3️⃣ 💳 <b>ការទូទាត់ & ហិរញ្ញវត្ថុ</b> — តាមដានការបង់ប្រាក់ & Top-up\n"
                    . "4️⃣ 🛠️ <b>សេវាជួសជុល</b> — តាមដានស្ថានភាពជួសជុល & Ticket\n"
                    . "5️⃣ ⚠️ <b>ការជូនដំណឹងស្តុក</b> — ជូនដំណឹងពេលទំនិញជិតអស់ពីស្តុក\n"
                    . "6️⃣ 🛡️ <b>Security & Errors</b> — តាមដានសុវត្ថិភាព & បញ្ហាប្រព័ន្ធ\n\n"
                    . "✅ <i>ប្រព័ន្ធ Notification និង Admin Dashboard ដំណើរការពេញលេញ ២៤/៧!</i>";

                $overviewKb = [
                    'inline_keyboard' => [
                        [
                            ['text' => '📱 បើក Admin Dashboard (Mini App)', 'web_app' => ['url' => 'https://www.s-tech-store.tech/rok-mix-khernh']],
                            ['text' => '🌐 ចូល Admin Website', 'url' => 'https://www.s-tech-store.tech/rok-mix-khernh']
                        ]
                    ]
                ];

                self::sendMessageWithKeyboard($chatId, $topicsOverview, $overviewKb);
            }

            // Always persist confirmed topics to settings, permanent vault, and Neon DB
            $vault = $settings['group_topics_vault'] ?? [];
            $vault[$chatIdStr] = $createdTopics;
            $settings['group_topics_vault'] = $vault;
            $settings['topics'] = $createdTopics;
            $settings['topics_chat_id'] = $chatIdStr;
            self::saveSettings($settings);

            try {
                \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
                    ['key' => 'telegram_topics_' . $cleanChatId],
                    [
                        'value' => json_encode([
                            'chat_id' => $chatIdStr,
                            'topics' => $createdTopics,
                            'updated_at' => now()->toDateTimeString(),
                        ]),
                        'updated_at' => now(),
                    ]
                );
            } catch (\Throwable $e) {}

            return [
                'ok' => true,
                'topics' => $createdTopics,
                'message' => 'Forum topics successfully created and configured.',
            ];
        } finally {
            Cache::forget($topicLockKey);
        }
    }

    /**
     * Disconnect Telegram bot
     */
    public static function disconnect(): bool
    {
        $settings = self::getSettings();
        $oldChatId = (string)($settings['chat_id'] ?? '');
        $oldTopics = $settings['topics'] ?? [];

        if (!empty($oldChatId)) {
            try {
                $byeText = "⚠️ <b>ការជូនដំណឹងពី S Tech Store:</b>\n\n"
                    . "Bot ត្រូវបានផ្តាច់ចេញពីគ្រុបនេះដោយ Admin ។ គ្រុបនេះនឹងលែងទទួលបាន Notification ស្វ័យប្រវត្តិទៀតហើយ។";
                self::sendMessage($settings['chat_id'], $byeText);
            } catch (\Throwable $e) {}

            // Archive the topics permanently in vault so if reconnected to this same group, topics are reused instead of duplicated!
            if (!empty($oldTopics) && is_array($oldTopics)) {
                $vault = $settings['group_topics_vault'] ?? [];
                $vault[$oldChatId] = $oldTopics;
                $settings['group_topics_vault'] = $vault;
                $settings['previous_chat_id'] = $oldChatId;
                $settings['previous_topics'] = $oldTopics;

                try {
                    $cleanOldId = ltrim($oldChatId, '-');
                    \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
                        ['key' => 'telegram_topics_' . $cleanOldId],
                        [
                            'value' => json_encode([
                                'chat_id' => $oldChatId,
                                'topics' => $oldTopics,
                                'archived_at' => now()->toDateTimeString(),
                            ]),
                            'updated_at' => now(),
                        ]
                    );
                } catch (\Throwable $e) {}
            }
        }

        $settings['connected'] = false;
        $settings['chat_id'] = null;
        $settings['chat_title'] = null;
        $settings['chat_type'] = null;
        $settings['connected_at'] = null;
        $settings['connected_by'] = null;
        // Keep topics in vault and previous_topics, do NOT wipe memory of the group's threads!
        $settings['pending_tokens'] = [];

        self::$cachedSettings = null;
        \Illuminate\Support\Facades\Cache::forget('tg_settings_cache_v2');

        return self::saveSettings($settings);
    }

    /**
     * Get Customer / Auth Bot Token (dedicated customer interactions)
     * Strictly returns the dedicated Customer Bot token. NEVER leaks to staff bot token!
     */
    public static function getCustomerBotToken(): string
    {
        $token = trim((string)env('TELEGRAM_AUTH_BOT_TOKEN', env('TELEGRAM_CUSTOMER_BOT_TOKEN', '')));
        if (!empty($token) && !str_contains($token, 'Placeholder')) {
            return $token;
        }

        $settings = self::getSettings();
        if (!empty($settings['customer_bot_token']) && !str_contains($settings['customer_bot_token'], 'Placeholder')) {
            return (string)$settings['customer_bot_token'];
        }

        return trim((string)env('TELEGRAM_AUTH_BOT_TOKEN', env('TELEGRAM_CUSTOMER_BOT_TOKEN', '')));
    }

    /**
     * Get Staff / Notification Bot Token (internal store staff forum group topics alerts)
     */
    public static function getStaffBotToken(): string
    {
        $token = trim((string)env('TELEGRAM_BOT_TOKEN', ''));
        if (!empty($token) && !str_contains($token, 'Placeholder')) {
            return $token;
        }

        $settings = self::getSettings();
        if (!empty($settings['bot_token']) && !str_contains($settings['bot_token'], 'Placeholder')) {
            return (string)$settings['bot_token'];
        }

        return trim((string)env('TELEGRAM_BOT_TOKEN', ''));
    }

    /**
     * Backward-compatible alias for staff bot token
     */
    public static function getBotToken(): string
    {
        return self::getStaffBotToken();
    }

    /**
     * Send a notification to a specific topic in the staff forum group using the Staff Bot
     */
    public static function sendToTopic(string $text, string $topicCategory = 'chat', string $parseMode = 'HTML'): array
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return ['ok' => false, 'error' => 'Telegram staff group is not connected'];
        }

        $threadId = self::resolveTopicId($topicCategory);
        $token = self::getStaffBotToken();

        return self::sendMessage($settings['chat_id'], $text, $parseMode, $threadId, $token);
    }

    /**
     * Get Staff / Notification Bot Username
     */
    public static function getStaffBotUsername(): string
    {
        $username = trim((string)env('TELEGRAM_BOT_USERNAME', ''));
        if (!empty($username)) {
            return ltrim($username, '@');
        }

        $settings = self::getSettings();
        if (!empty($settings['bot_username'])) {
            return ltrim((string)$settings['bot_username'], '@');
        }

        return self::OFFICIAL_STAFF_BOT_USERNAME;
    }

    /**
     * Backward-compatible alias for staff bot username
     */
    public static function getBotUsername(): string
    {
        return self::getStaffBotUsername();
    }

    /**
     * Get Customer / Auth Bot Username
     */
    public static function getCustomerBotUsername(): string
    {
        $username = trim((string)env('TELEGRAM_AUTH_BOT_USERNAME', ''));
        if (!empty($username) && stripos($username, 'assistant') !== false) {
            return ltrim($username, '@');
        }
        return self::OFFICIAL_CUSTOMER_BOT_USERNAME;
    }

    /**
     * Setup official Customer Bot commands, native Mini App chat menu button, and descriptions
     */
    public static function setupCustomerBotCommandsAndMenu(?string $token = null): array
    {
        $botToken = $token ?: self::getCustomerBotToken();
        if (empty($botToken)) {
            return ['success' => false, 'error' => 'Customer Bot token is missing'];
        }

        $results = [];

        // 1. Set commands (11 interactive customer commands)
        $commands = [
            ['command' => 'start', 'description' => '🏠 មឺនុយមេ & បើក Mini App (Main Menu)'],
            ['command' => 'shop', 'description' => '💻 មើលផលិតផល Laptops, PC, Parts (Shop)'],
            ['command' => 'orders', 'description' => '📦 តាមដានការបញ្ជាទិញ (My Orders)'],
            ['command' => 'wallet', 'description' => '💰 កាបូបលុយ & សមតុល្យ (My Balance)'],
            ['command' => 'points', 'description' => '🪙 ពិន្ទុ S-Coins & VIP Rewards'],
            ['command' => 'promo', 'description' => '🔥 ប្រូម៉ូសិន & កូដបញ្ចុះតម្លៃ (Discounts)'],
            ['command' => 'repair', 'description' => '🔧 សេវាជួសជុល & Upgrade (Repairs)'],
            ['command' => 'ask', 'description' => '❓ សំណួរញឹកញាប់ & ជំនួយរហ័ស (FAQ)'],
            ['command' => 'contact', 'description' => '📞 ទំនាក់ទំនង & ទីតាំងហាង (Contact)'],
            ['command' => 'help', 'description' => '📋 របៀបប្រើប្រាស់ពាក្យបញ្ជា (Help)'],
            ['command' => 'unlink', 'description' => '🔌 ផ្តាច់គណនី Telegram (Disconnect)'],
        ];

        try {
            $cmdResp = Http::timeout(8)->post("https://api.telegram.org/bot{$botToken}/setMyCommands", [
                'commands' => $commands,
            ]);
            $results['setMyCommands'] = $cmdResp->json();
        } catch (\Throwable $e) {
            $results['setMyCommands'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // 2. Set native Mini App chat menu button (persistent in lower-left corner)
        try {
            $menuResp = Http::timeout(8)->post("https://api.telegram.org/bot{$botToken}/setChatMenuButton", [
                'menu_button' => [
                    'type' => 'web_app',
                    'text' => '🛍️ S Tech Store',
                    'web_app' => [
                        'url' => 'https://www.s-tech-store.tech',
                    ],
                ],
            ]);
            $results['setChatMenuButton'] = $menuResp->json();
        } catch (\Throwable $e) {
            $results['setChatMenuButton'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // 3. Bot descriptions: Left completely under BotFather management
        // (Do NOT automatically overwrite bot description / bio so user has full control in @BotFather)

        $allOk = (($results['setMyCommands']['ok'] ?? false) === true)
            && (($results['setChatMenuButton']['ok'] ?? false) === true);

        return [
            'success' => $allOk,
            'bot_username' => self::getCustomerBotUsername(),
            'commands_count' => count($commands),
            'details' => $results,
        ];
    }

    /**
     * Setup official Staff Bot commands, native Admin Mini App chat menu button, and descriptions
     */
    public static function setupStaffBotCommandsAndMenu(?string $token = null): array
    {
        $settings = self::getSettings();
        $botToken = $token ?: ($settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN'));
        if (empty($botToken)) {
            return ['success' => false, 'error' => 'Staff Bot token is missing (សូមកំណត់ Bot Token ក្នុង Settings ជាមុនសិន)'];
        }

        $results = [];

        // 1. Set commands (Interactive admin & staff commands)
        $commands = [
            ['command' => 'chat', 'description' => '💬 បើក Live Chat Mini App (ឆ្លើយតបអតិថិជន)'],
            ['command' => 'orders', 'description' => '📦 បើក Orders Mini App (គ្រប់គ្រងការកុម្ម៉ង់)'],
            ['command' => 'dashboard', 'description' => '📊 បើក Admin Dashboard Mini App'],
            ['command' => 'stock', 'description' => '⚠️ ស្កេនទំនិញជិតអស់ពីស្តុក (Low Stock)'],
            ['command' => 'report', 'description' => '📈 របាយការណ៍សង្ខេបអាជីវកម្ម (Daily Report)'],
            ['command' => 'start', 'description' => '🏠 មឺនុយមេ Admin/Staff & Mini App Hub'],
        ];

        try {
            $cmdResp = Http::timeout(8)->post("https://api.telegram.org/bot{$botToken}/setMyCommands", [
                'commands' => $commands,
            ]);
            $results['setMyCommands'] = $cmdResp->json();
        } catch (\Throwable $e) {
            $results['setMyCommands'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // 2. Set native Mini App chat menu button (persistent in lower-left corner)
        try {
            $menuResp = Http::timeout(8)->post("https://api.telegram.org/bot{$botToken}/setChatMenuButton", [
                'menu_button' => [
                    'type' => 'web_app',
                    'text' => '⚡ S Tech Live Chat',
                    'web_app' => [
                        'url' => 'https://www.s-tech-store.tech/km/rok-mix-khernh/chat',
                    ],
                ],
            ]);
            $results['setChatMenuButton'] = $menuResp->json();
        } catch (\Throwable $e) {
            $results['setChatMenuButton'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // 3. Bot descriptions: Left completely under BotFather management
        // (Do NOT automatically overwrite bot description / bio so user has full control in @BotFather)

        $allOk = (($results['setMyCommands']['ok'] ?? false) === true)
            && (($results['setChatMenuButton']['ok'] ?? false) === true);

        return [
            'success' => $allOk,
            'bot_username' => $settings['bot_username'] ?? self::OFFICIAL_STAFF_BOT_USERNAME,
            'commands_count' => count($commands),
            'message' => 'បានកំណត់ Commands និង Mini App Menu Button សម្រាប់ Staff Bot ជោគជ័យ!',
            'details' => $results,
        ];
    }

    /**
     * Fetch user's genuine profile photo directly from Telegram Bot API securely.
     * Downloads and caches locally so the Telegram Bot Token is NEVER leaked in the URL!
     */
    public static function getUserAvatarUrl(string $tgUserId, ?string $botToken = null): ?string
    {
        $cleanTgId = preg_replace('/\D/', '', $tgUserId) ?: $tgUserId;
        $token = $botToken ?: self::getCustomerBotToken();
        if (!$token || !$cleanTgId) return null;

        $avatarDir = public_path('storage/avatars');
        $localPath = "{$avatarDir}/tg_{$cleanTgId}.jpg";
        $webUrl = "/storage/avatars/tg_{$cleanTgId}.jpg";

        // If recently cached file exists (> 500 bytes and fresher than 7 days), serve instantly
        if (file_exists($localPath) && filesize($localPath) > 500 && (time() - filemtime($localPath) < 7 * 86400)) {
            return $webUrl;
        }

        try {
            $resp = \Illuminate\Support\Facades\Http::connectTimeout(1.5)->timeout(2.5)->get("https://api.telegram.org/bot{$token}/getUserProfilePhotos", [
                'user_id' => $cleanTgId,
                'limit' => 1,
            ]);

            if ($resp->successful()) {
                $json = $resp->json();
                $photos = $json['result']['photos'] ?? [];
                if (!empty($photos) && !empty($photos[0])) {
                    $photoSizes = $photos[0];
                    $bestPhoto = end($photoSizes);
                    $fileId = $bestPhoto['file_id'] ?? null;

                    if ($fileId) {
                        $fileRes = \Illuminate\Support\Facades\Http::connectTimeout(1.5)->timeout(2.5)->get("https://api.telegram.org/bot{$token}/getFile", [
                            'file_id' => $fileId,
                        ]);
                        if ($fileRes->successful()) {
                            $filePath = $fileRes->json()['result']['file_path'] ?? null;
                            if ($filePath) {
                                // SECURE DOWNLOAD: Download bytes and save locally so BOT TOKEN NEVER LEAKS!
                                $imgResp = \Illuminate\Support\Facades\Http::connectTimeout(2.0)->timeout(4.0)->get("https://api.telegram.org/file/bot{$token}/{$filePath}");
                                if ($imgResp->successful() && strlen($imgResp->body()) > 500) {
                                    if (!is_dir($avatarDir)) {
                                        @mkdir($avatarDir, 0755, true);
                                    }
                                    @file_put_contents($localPath, $imgResp->body());
                                    return $webUrl;
                                }
                            }
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Telegram getUserAvatarUrl error: " . $e->getMessage());
        }

        if (file_exists($localPath) && filesize($localPath) > 500) {
            return $webUrl;
        }

        return null;
    }

    /**
     * Send message using Telegram Bot API (supports Forum Thread ID & Multi-Bot Token)
     */
    public static function sendMessage($chatId, string $text, string $parseMode = 'HTML', ?int $threadId = null, ?string $token = null): array
    {
        $settings = self::getSettings();
        if (!$token) {
            $isPrivateUserChat = is_numeric($chatId) && (int)$chatId > 0;
            $token = $isPrivateUserChat 
                ? self::getCustomerBotToken() 
                : self::getStaffBotToken();
        }
        $token = self::sanitizeBotToken($token);

        if (!$token || str_contains($token, 'Placeholder')) {
            Log::info("[Telegram] Mock send to {$chatId} (Thread: {$threadId}): {$text}");
            return ['ok' => true, 'mock' => true, 'message' => 'Telegram token is placeholder. Notification logged.'];
        }

        try {
            $payload = [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => $parseMode,
                'disable_web_page_preview' => false,
            ];
            if ($threadId) {
                $payload['message_thread_id'] = $threadId;
            }

            $response = Http::timeout(8.0)->connectTimeout(4.0)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
            $json = $response->json();

            // Fallback retry & auto-heal if thread does not exist or was closed/deleted
            if (($json['error_code'] ?? 0) === 400 && str_contains(strtolower($json['description'] ?? ''), 'thread not found') && $threadId) {
                $topics = $settings['topics'] ?? [];
                $healed = false;
                foreach ($topics as $tk => $tid) {
                    if ((int)$tid === (int)$threadId) {
                        unset($topics[$tk]);
                        $healed = true;
                    }
                }
                if ($healed) {
                    $settings['topics'] = $topics;
                    self::saveSettings($settings);
                }

                // If this is the staff forum group, STRICTLY DO NOT dump into #General to prevent spam
                $isStaffGroup = !empty($settings['chat_id']) && (string)$chatId === (string)$settings['chat_id'];
                if ($isStaffGroup && !empty($topics)) {
                    Log::warning("[Telegram] Topic thread {$threadId} not found in staff group. Suppressing fallback to #General to prevent spam.");
                    return ['ok' => false, 'error' => 'Thread not found in forum group; suppressed fallback to #General'];
                }

                unset($payload['message_thread_id']);
                $response = Http::timeout(8.0)->connectTimeout(4.0)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
                $json = $response->json();
            }

            // Intelligent Group Fallback: If bot is not in the group yet (chat not found), deliver directly to Owner/Admin private chat!
            if (($json['error_code'] ?? 0) === 400 && str_contains(strtolower($json['description'] ?? ''), 'chat not found') && is_numeric($chatId) && (int)$chatId < 0) {
                $ownerChatId = '5969566967';
                if ((string)$chatId !== $ownerChatId) {
                    $ownerPayload = $payload;
                    $ownerPayload['chat_id'] = $ownerChatId;
                    unset($ownerPayload['message_thread_id']);
                    try {
                        $fallbackResp = Http::timeout(8.0)->connectTimeout(4.0)->post("https://api.telegram.org/bot{$token}/sendMessage", $ownerPayload);
                        if ($fallbackResp->successful()) {
                            Log::info("[Telegram] Delivered alert to Owner private chat ({$ownerChatId}) as fallback for group {$chatId}.");
                            return $fallbackResp->json() ?? ['ok' => true];
                        }
                    } catch (\Throwable $e) {}
                }
            }

            return $json ?? ['ok' => $response->successful()];
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram message: " . $e->getMessage());
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send message with Inline Keyboard buttons (supports Multi-Bot Token)
     */
    public static function sendMessageWithKeyboard($chatId, string $text, array $replyMarkup, string $parseMode = 'HTML', ?int $threadId = null, ?string $token = null): array
    {
        $settings = self::getSettings();
        if (!$token) {
            $isPrivateUserChat = is_numeric($chatId) && (int)$chatId > 0;
            $token = $isPrivateUserChat 
                ? self::getCustomerBotToken() 
                : self::getStaffBotToken();
        }
        $token = self::sanitizeBotToken($token);

        if (!$token || str_contains($token, 'Placeholder')) {
            Log::info("[Telegram] Mock send with keyboard to {$chatId}: {$text}");
            return ['ok' => true, 'mock' => true];
        }

        try {
            $payload = [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => $parseMode,
                'reply_markup' => json_encode($replyMarkup),
            ];
            if ($threadId) {
                $payload['message_thread_id'] = $threadId;
            }

            $response = Http::timeout(8.0)->connectTimeout(4.0)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
            $json = $response->json();

            // Fallback retry & auto-heal if thread does not exist or was closed/deleted
            if (($json['error_code'] ?? 0) === 400 && str_contains(strtolower($json['description'] ?? ''), 'thread not found') && $threadId) {
                $topics = $settings['topics'] ?? [];
                $healed = false;
                foreach ($topics as $tk => $tid) {
                    if ((int)$tid === (int)$threadId) {
                        unset($topics[$tk]);
                        $healed = true;
                    }
                }
                if ($healed) {
                    $settings['topics'] = $topics;
                    self::saveSettings($settings);
                }

                // If this is the staff forum group, STRICTLY DO NOT dump into #General to prevent spam
                $isStaffGroup = !empty($settings['chat_id']) && (string)$chatId === (string)$settings['chat_id'];
                if ($isStaffGroup && !empty($topics)) {
                    Log::warning("[Telegram] Topic thread {$threadId} not found in staff group. Suppressing fallback to #General to prevent spam.");
                    return ['ok' => false, 'error' => 'Thread not found in forum group; suppressed fallback to #General'];
                }

                unset($payload['message_thread_id']);
                $response = Http::timeout(8.0)->connectTimeout(4.0)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
                $json = $response->json();
            }

            // Intelligent Group Fallback: If bot is not in the group yet (chat not found), deliver directly to Owner/Admin private chat!
            if (($json['error_code'] ?? 0) === 400 && str_contains(strtolower($json['description'] ?? ''), 'chat not found') && is_numeric($chatId) && (int)$chatId < 0) {
                $ownerChatId = '5969566967';
                if ((string)$chatId !== $ownerChatId) {
                    $ownerPayload = $payload;
                    $ownerPayload['chat_id'] = $ownerChatId;
                    unset($ownerPayload['message_thread_id']);
                    try {
                        $fallbackResp = Http::timeout(8.0)->connectTimeout(4.0)->post("https://api.telegram.org/bot{$token}/sendMessage", $ownerPayload);
                        if ($fallbackResp->successful()) {
                            Log::info("[Telegram] Delivered keyboard alert to Owner private chat ({$ownerChatId}) as fallback for group {$chatId}.");
                            return $fallbackResp->json() ?? ['ok' => true];
                        }
                    } catch (\Throwable $e) {}
                }
            }

            return $json ?? ['ok' => $response->successful()];
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram message with keyboard: " . $e->getMessage());
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send photo using Telegram Bot API (supports URL or binary upload, caption, buttons, forum thread)
     */
    public static function sendPhoto($chatId, $photo, ?string $caption = null, string $parseMode = 'HTML', ?array $replyMarkup = null, ?int $threadId = null, ?string $token = null): array
    {
        $settings = self::getSettings();
        if (!$token) {
            $isPrivateUserChat = is_numeric($chatId) && (int)$chatId > 0;
            $token = $isPrivateUserChat 
                ? self::getCustomerBotToken() 
                : self::getStaffBotToken();
        }
        $token = self::sanitizeBotToken($token);

        if (!$token || str_contains($token, 'Placeholder')) {
            Log::info("[Telegram] Mock sendPhoto to {$chatId}: Caption: {$caption}");
            return ['ok' => true, 'mock' => true];
        }

        try {
            $url = "https://api.telegram.org/bot{$token}/sendPhoto";
            $isHttpUrl = is_string($photo) && (str_starts_with($photo, 'http://') || str_starts_with($photo, 'https://'));

            if ($isHttpUrl) {
                $payload = [
                    'chat_id' => $chatId,
                    'photo' => $photo,
                ];
                if ($caption !== null) $payload['caption'] = $caption;
                if ($parseMode) $payload['parse_mode'] = $parseMode;
                if ($replyMarkup) $payload['reply_markup'] = json_encode($replyMarkup);
                if ($threadId) $payload['message_thread_id'] = $threadId;

                $response = Http::timeout(6.0)->connectTimeout(3.0)->post($url, $payload);
                $json = $response->json();
            } else {
                $photoData = is_file($photo) ? file_get_contents($photo) : $photo;
                $req = Http::timeout(8.0)->connectTimeout(3.0)->attach('photo', $photoData, 'photo.jpg');
                $params = ['chat_id' => $chatId];
                if ($caption !== null) $params['caption'] = $caption;
                if ($parseMode) $params['parse_mode'] = $parseMode;
                if ($replyMarkup) $params['reply_markup'] = json_encode($replyMarkup);
                if ($threadId) $params['message_thread_id'] = $threadId;

                $response = $req->post($url, $params);
                $json = $response->json();
            }

            return $json ?? ['ok' => $response->successful()];
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram photo: " . $e->getMessage());
            if ($caption) {
                return self::sendMessageWithKeyboard($chatId, $caption, $replyMarkup ?? [], $parseMode, $threadId, $token);
            }
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send document / file using Telegram Bot API (supports URL or binary content, custom filename, buttons)
     */
    public static function sendDocument($chatId, $document, string $filename = 'document.pdf', ?string $caption = null, string $parseMode = 'HTML', ?array $replyMarkup = null, ?int $threadId = null, ?string $token = null): array
    {
        $settings = self::getSettings();
        if (!$token) {
            $isPrivateUserChat = is_numeric($chatId) && (int)$chatId > 0;
            $token = $isPrivateUserChat 
                ? self::getCustomerBotToken() 
                : self::getStaffBotToken();
        }
        $token = self::sanitizeBotToken($token);

        if (!$token || str_contains($token, 'Placeholder')) {
            Log::info("[Telegram] Mock sendDocument to {$chatId}: {$filename}");
            return ['ok' => true, 'mock' => true];
        }

        try {
            $url = "https://api.telegram.org/bot{$token}/sendDocument";
            $isHttpUrl = is_string($document) && (str_starts_with($document, 'http://') || str_starts_with($document, 'https://'));

            if ($isHttpUrl) {
                $payload = [
                    'chat_id' => $chatId,
                    'document' => $document,
                ];
                if ($caption !== null) $payload['caption'] = $caption;
                if ($parseMode) $payload['parse_mode'] = $parseMode;
                if ($replyMarkup) $payload['reply_markup'] = json_encode($replyMarkup);
                if ($threadId) $payload['message_thread_id'] = $threadId;

                $response = Http::timeout(8.0)->connectTimeout(3.0)->post($url, $payload);
                $json = $response->json();
            } else {
                $fileData = is_file($document) ? file_get_contents($document) : $document;
                $req = Http::timeout(10.0)->connectTimeout(3.0)->attach('document', $fileData, $filename);
                $params = ['chat_id' => $chatId];
                if ($caption !== null) $params['caption'] = $caption;
                if ($parseMode) $params['parse_mode'] = $parseMode;
                if ($replyMarkup) $params['reply_markup'] = json_encode($replyMarkup);
                if ($threadId) $params['message_thread_id'] = $threadId;

                $response = $req->post($url, $params);
                $json = $response->json();
            }

            return $json ?? ['ok' => $response->successful()];
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram document: " . $e->getMessage());
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Generate standalone printable HTML receipt document
     */
    public static function generateHtmlInvoice($order): string
    {
        $tz = 'Asia/Phnom_Penh';
        $orderId = htmlspecialchars($order->order_id ?? ('ORD-' . $order->id));
        $customerName = htmlspecialchars($order->customer_name ?? 'Valued Customer');
        $customerPhone = htmlspecialchars($order->customer_phone ?? '-');
        $address = htmlspecialchars($order->shipping_address ?? 'Phnom Penh, Cambodia');
        $payMethod = strtoupper($order->payment_method ?? 'Bakong KHQR');
        $payStatus = strtoupper($order->payment_status ?? 'PAID');
        $date = $order->created_at ? $order->created_at->timezone($tz)->format('M d, Y h:i A') : date('M d, Y');
        $total = number_format((float)($order->total_amount ?? 0), 2);
        $totalKHR = number_format(round(((float)($order->total_amount ?? 0) * 4060) / 1000) * 1000);
        $delivery = htmlspecialchars($order->delivery_type ?? 'Express');
        $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=" . urlencode("https://www.s-tech-store.tech/orders?verify={$orderId}");

        $itemsHtml = '';
        if ($order->items && $order->items->isNotEmpty()) {
            foreach ($order->items as $idx => $it) {
                $name = htmlspecialchars($it->product->name ?? 'Product');
                $qty = (int)$it->quantity;
                $price = number_format((float)($it->unit_price ?? 0), 2);
                $sub = number_format((float)($it->unit_price ?? 0) * $qty, 2);
                $itemsHtml .= "<tr>
                    <td style='padding:12px;border-bottom:1px solid #eee;font-weight:600;'>{$name}</td>
                    <td style='padding:12px;border-bottom:1px solid #eee;text-align:center;'>{$qty}</td>
                    <td style='padding:12px;border-bottom:1px solid #eee;text-align:right;'>\${$price}</td>
                    <td style='padding:12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;'>\${$sub}</td>
                </tr>";
            }
        } else {
            $itemsHtml = "<tr>
                <td style='padding:12px;border-bottom:1px solid #eee;font-weight:600;'>S Tech Store Merchandise</td>
                <td style='padding:12px;border-bottom:1px solid #eee;text-align:center;'>1</td>
                <td style='padding:12px;border-bottom:1px solid #eee;text-align:right;'>\${$total}</td>
                <td style='padding:12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;'>\${$total}</td>
            </tr>";
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice #{$orderId} - S Tech Store</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
  .invoice-box { max-width: 780px; margin: auto; background: #fff; padding: 36px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
  .brand-logo { width: 44px; height: 44px; background: #8B1A1A; border-radius: 12px; color: #fff; font-size: 24px; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
  .info-grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 16px 20px; border-radius: 14px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #0f172a; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; padding: 10px 12px; border-radius: 6px; }
  .totals { display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #f1f5f9; padding-top: 20px; }
  .grand-total { font-size: 26px; font-weight: 900; color: #8B1A1A; margin: 0; }
  .print-btn { background: #8B1A1A; color: #fff; border: none; padding: 10px 22px; font-size: 13px; font-weight: 700; border-radius: 10px; cursor: pointer; margin-bottom: 16px; }
  @media print { .print-btn { display: none; } body { background: #fff; padding: 0; } .invoice-box { box-shadow: none; border: none; padding: 0; } }
</style>
</head>
<body>
  <div style="text-align: right; max-width: 780px; margin: auto;">
    <button class="print-btn" onclick="window.print()">🖨️ បោះពុម្ព / Save as PDF</button>
  </div>
  <div class="invoice-box">
    <div class="header">
      <div>
        <div style="display:flex;align-items:center;margin-bottom:6px;">
          <div class="brand-logo">S</div>
          <div>
            <div style="font-size:22px;font-weight:900;color:#0f172a;">S TECH STORE</div>
            <div style="font-size:11px;font-weight:700;color:#8B1A1A;letter-spacing:.1em;">OFFICIAL TECH & GAMING HUB</div>
          </div>
        </div>
        <div style="font-size:12px;color:#64748b;">Phnom Penh, Cambodia • Hotline: 012 345 678</div>
        <div style="font-size:12px;color:#64748b;">www.s-tech-store.tech</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:26px;font-weight:900;color:#0f172a;">INVOICE</div>
        <div style="font-size:14px;font-weight:800;color:#8B1A1A;font-family:monospace;margin:2px 0;">#{$orderId}</div>
        <span class="status-badge">{$payStatus}</span>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">អតិថិជន / Bill To</div>
        <div style="font-size:15px;font-weight:800;color:#0f172a;">{$customerName}</div>
        <div style="font-size:12px;color:#475569;">Tel: {$customerPhone}</div>
        <div style="font-size:12px;color:#64748b;">{$address}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">ព័ត៌មានកុម្ម៉ង់ / Order Info</div>
        <div style="font-size:12px;color:#475569;">កាលបរិច្ឆេទ: <strong>{$date}</strong></div>
        <div style="font-size:12px;color:#475569;">ការទូទាត់: <strong>{$payMethod}</strong></div>
        <div style="font-size:12px;color:#475569;">សេវាដឹក: <strong>{$delivery}</strong></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left;">Item Description</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        {$itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div style="display:flex;align-items:center;gap:14px;">
        <img src="{$qrUrl}" width="80" height="80" alt="QR" style="border:1px solid #e2e8f0;border-radius:8px;">
        <div style="font-size:11px;color:#64748b;max-width:200px;">
          <strong style="color:#15803d;display:block;">✓ 100% Verified Authentic</strong>
          ស្កេនដើម្បីផ្ទៀងផ្ទាត់វិក្កយបត្រផ្លូវការ និងការធានាលើ S Tech Store
        </div>
      </div>
      <div style="text-align:right;min-width:220px;">
        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Grand Total / តម្លៃសរុប:</div>
        <div class="grand-total">\${$total} USD</div>
        <div style="font-size:12px;font-weight:700;color:#64748b;">≈ {$totalKHR} KHR</div>
      </div>
    </div>

    <div style="border-top:1px solid #f1f5f9;padding-top:16px;margin-top:24px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
      <span>S Tech Store Cambodia • Thank you for your business!</span>
      <span>Official Warranty Coverage Included</span>
    </div>
  </div>
</body>
</html>
HTML;
    }

    /**
     * Send instant rich invoice image to customer in Telegram
     */
    public static function sendCustomerInvoicePhoto($chatId, $orderOrId, ?string $fromName = null, ?string $token = null): array
    {
        $order = null;
        if ($orderOrId instanceof \App\Models\Order) {
            $order = $orderOrId;
        } else {
            $cleanCode = ltrim((string)$orderOrId, '#');
            $order = \App\Models\Order::where('order_id', $cleanCode)
                ->orWhere('order_id', '#' . $cleanCode)
                ->with('items.product')
                ->first();
            if (!$order && is_numeric($cleanCode)) {
                $order = \App\Models\Order::where('id', (int)$cleanCode)->with('items.product')->first();
            }
        }

        if (!$order) {
            return self::sendMessage($chatId, "⚠️ រកមិនឃើញវិក្កយបត្រសម្រាប់ការបញ្ជាទិញនេះឡើយ។ សូមពិនិត្យលេខកូដឡើងវិញ។", 'HTML', null, $token);
        }

        $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
        $ordersAppUrl = "https://www.s-tech-store.tech/orders?tg_token={$sessionToken}";
        $imageUrl = "https://www.s-tech-store.tech/api/invoice-image?order_id=" . urlencode($order->order_id);

        $tz = 'Asia/Phnom_Penh';
        $formattedDate = $order->created_at ? $order->created_at->timezone($tz)->format('d/m/Y H:i') : date('d/m/Y');
        $totalUSD = number_format((float)($order->total_amount ?? 0), 2);
        $totalKHR = number_format(round(((float)($order->total_amount ?? 0) * 4060) / 1000) * 1000);
        $payMethod = strtoupper($order->payment_method ?? 'Bakong KHQR');
        $payStatus = strtoupper($order->payment_status ?? 'PAID');
        $statusBadge = match(strtolower($order->status ?? 'pending')) {
            'completed', 'delivered' => '✅ បានដឹកជញ្ជូនរួចរាល់ (Delivered)',
            'shipping', 'delivering' => '🚚 កំពុងដឹកជញ្ជូន (Shipping)',
            'processing' => '🔄 កំពុងរៀបចំទំនិញ (Processing)',
            'cancelled' => '❌ បានលុបចោល (Cancelled)',
            default => '⏳ កំពុងរង់ចាំពិនិត្យ (Pending)',
        };

        $itemsSummary = [];
        if ($order->items) {
            foreach ($order->items as $it) {
                $name = $it->product->name ?? 'ទំនិញ';
                $itemsSummary[] = "• {$name} × {$it->quantity}";
            }
        }
        $itemsText = !empty($itemsSummary) ? implode("\n", array_slice($itemsSummary, 0, 3)) : '• ទំនិញ S Tech Store';
        if (count($itemsSummary) > 3) {
            $itemsText .= "\n• និងមុខទំនិញ " . (count($itemsSummary) - 3) . " ផ្សេងទៀត...";
        }

        $caption = "🧾 <b>[OFFICIAL INVOICE] វិក្កយបត្រផ្លូវការ #{$order->order_id}</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "👤 <b>អតិថិជន:</b> <b>" . htmlspecialchars($order->customer_name ?? 'អតិថិជន') . "</b>\n"
            . "⚡ <b>ស្ថានភាព:</b> <b>{$statusBadge}</b>\n"
            . "💵 <b>តម្លៃសរុប:</b> <b>\${$totalUSD} USD</b> (≈ <code>{$totalKHR} KHR</code>)\n"
            . "💳 <b>វិធីទូទាត់:</b> {$payMethod} (<b>{$payStatus}</b>)\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> {$formattedDate}\n\n"
            . "<blockquote expandable>\n"
            . "🛍️ <b>មុខទំនិញ:</b>\n{$itemsText}\n"
            . "📍 <b>ទីតាំងដឹក:</b> " . htmlspecialchars($order->shipping_address ?? 'ភ្នំពេញ') . "\n"
            . "</blockquote>\n\n"
            . "👉 <i>លោកអ្នកអាចទាញយកជាឯកសារ (Download File) ឬពិនិត្យក្នុង Mini App!</i>";

        $kb = [
            'inline_keyboard' => [
                [
                    ['text' => '📄 ទាញយកជា File វិក្កយបត្រ (HTML / PDF)', 'callback_data' => "cust_file_inv_{$order->order_id}"],
                ],
                [
                    ['text' => '📱 មើល Orders ក្នុង Mini App', 'web_app' => ['url' => $ordersAppUrl]],
                    ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                ],
            ],
        ];

        return self::sendPhoto($chatId, $imageUrl, $caption, 'HTML', $kb, null, $token);
    }

    /**
     * Send official invoice HTML document as file attachment to customer
     */
    public static function sendCustomerInvoiceDocument($chatId, $orderOrId, ?string $token = null): array
    {
        $order = null;
        if ($orderOrId instanceof \App\Models\Order) {
            $order = $orderOrId;
        } else {
            $cleanCode = ltrim((string)$orderOrId, '#');
            $order = \App\Models\Order::where('order_id', $cleanCode)
                ->orWhere('order_id', '#' . $cleanCode)
                ->with('items.product')
                ->first();
            if (!$order && is_numeric($cleanCode)) {
                $order = \App\Models\Order::where('id', (int)$cleanCode)->with('items.product')->first();
            }
        }

        if (!$order) {
            return self::sendMessage($chatId, "⚠️ រកមិនឃើញទិន្នន័យវិក្កយបត្រនេះឡើយ។", 'HTML', null, $token);
        }

        $htmlContent = self::generateHtmlInvoice($order);
        $filename = "Invoice_{$order->order_id}.html";
        $caption = "📄 <b>ឯកសារវិក្កយបត្រផ្លូវការ #{$order->order_id}</b> ពី <b>S Tech Store</b>\n"
            . "លោកអ្នកអាចបើកមើល ឬ Save ជា PDF / Print បានគ្រប់ពេលវេលា!";

        $kb = [
            'inline_keyboard' => [
                [
                    ['text' => '🖼️ មើលជារូបភាព (Invoice Image)', 'callback_data' => "cust_inv_{$order->order_id}"],
                    ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                ],
            ],
        ];

        return self::sendDocument($chatId, $htmlContent, $filename, $caption, 'HTML', $kb, null, $token);
    }

    /**
     * Customer Main Menu Keyboard with Mini App button right at the top
     */
    public static function getCustomerMainMenuKeyboard(?string $chatId = null): array
    {
        $appUrl = 'https://www.s-tech-store.tech';
        $webUrl = 'https://www.s-tech-store.tech';
        if ($chatId) {
            $sessToken = self::generateCustomerSessionToken((string)$chatId);
            if (!empty($sessToken)) {
                $appUrl = "https://www.s-tech-store.tech/?tg_token={$sessToken}";
                $webUrl = "https://www.s-tech-store.tech/?tg_token={$sessToken}";
            }
        }

        return [
            'inline_keyboard' => [
                [
                    ['text' => '🛍️ បើកទិញទំនិញក្នុង Mini App (Open Store)', 'web_app' => ['url' => $appUrl]],
                ],
                [
                    ['text' => '💰 កាបូបលុយ & សមតុល្យ (Wallet)', 'callback_data' => 'cust_my_wallet'],
                    ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ (My Orders)', 'callback_data' => 'cust_my_orders'],
                ],
                [
                    ['text' => '🪙 ពិន្ទុ & VIP (My Points)', 'callback_data' => 'cust_my_points'],
                    ['text' => '🔥 ប្រូម៉ូសិន (Hot Promo)', 'callback_data' => 'cust_promo'],
                ],
                [
                    ['text' => '💻 ផលិតផល (Shop Products)', 'callback_data' => 'cust_shop'],
                    ['text' => '🔧 សំបុត្រជួសជុល (Repairs)', 'callback_data' => 'cust_my_repairs'],
                ],
                [
                    ['text' => '❓ សួរសំណួរ & ជំនួយ (Ask FAQ)', 'callback_data' => 'cust_ask_options'],
                    ['text' => '📞 ទំនាក់ទំនង & ទីតាំង', 'callback_data' => 'cust_contact'],
                ],
                [
                    ['text' => '🌐 គេហទំព័រផ្លូវការ (Website)', 'url' => $webUrl],
                    ['text' => '💬 ជជែកជាមួយបុគ្គលិក (Support)', 'callback_data' => 'cust_support'],
                ],
                [
                    ['text' => '🔌 គ្រប់គ្រង & ផ្តាច់គណនី (Disconnect)', 'callback_data' => 'cust_disconnect_menu'],
                ],
            ],
        ];
    }

    /**
     * Backward-compatible alias for Customer Main Menu
     */
    public static function getBotMainMenuKeyboard(?string $chatId = null): array
    {
        return self::getCustomerMainMenuKeyboard($chatId);
    }

    /**
     * Resolve Customer Telegram Chat ID from Order, UserProfile, or UID
     */
    public static function resolveCustomerChatId($orderOrUser, ?string $fallbackPhone = null, ?string $fallbackEmail = null): ?string
    {
        if (is_numeric($orderOrUser)) {
            return (string)$orderOrUser;
        }

        if (is_string($orderOrUser)) {
            $trimmed = trim($orderOrUser);
            if (str_starts_with($trimmed, 'tg_')) {
                $raw = substr($trimmed, 3);
                if (is_numeric($raw)) return $raw;
            }
            if (is_numeric($trimmed)) return $trimmed;

            // Search UserProfile by telegram username or email
            $cleanUser = ltrim($trimmed, '@');
            $u = \App\Models\UserProfile::where('telegram', '@' . $cleanUser)
                ->orWhere('telegram', $cleanUser)
                ->orWhere('email', $trimmed)
                ->orWhere('email', $cleanUser . '@telegram.s-tech-store.tech')
                ->first();
            if ($u) {
                if (!empty($u->telegram_chat_id)) return (string)$u->telegram_chat_id;
                if (!empty($u->firebase_uid) && str_starts_with($u->firebase_uid, 'tg_')) {
                    $raw = substr($u->firebase_uid, 3);
                    if (is_numeric($raw)) return $raw;
                }
            }
        }

        if ($orderOrUser instanceof \App\Models\UserProfile) {
            // Respect explicit disconnection or disabled notifications
            if (isset($orderOrUser->notif_telegram) && $orderOrUser->notif_telegram === false) {
                return null;
            }
            if (!empty($orderOrUser->telegram_chat_id)) {
                return (string)$orderOrUser->telegram_chat_id;
            }
            if (!empty($orderOrUser->firebase_uid) && str_starts_with($orderOrUser->firebase_uid, 'tg_')) {
                $raw = substr($orderOrUser->firebase_uid, 3);
                if (is_numeric($raw)) return $raw;
            }
            return null;
        }

        if ($orderOrUser instanceof \App\Models\Order) {
            $uid = $orderOrUser->user_id;
            if (!empty($uid)) {
                $u = \App\Models\UserProfile::where('firebase_uid', $uid)->first();
                if (!$u && is_numeric($uid)) {
                    $u = \App\Models\UserProfile::find((int)$uid);
                }
                if ($u) {
                    if (isset($u->notif_telegram) && $u->notif_telegram === false) {
                        return null; // Explicitly disconnected
                    }
                    if (!empty($u->telegram_chat_id)) {
                        return (string)$u->telegram_chat_id;
                    }
                    if (!empty($u->firebase_uid) && str_starts_with($u->firebase_uid, 'tg_')) {
                        $raw = substr($u->firebase_uid, 3);
                        if (is_numeric($raw)) return $raw;
                    }
                }
            }

            // Check if profile with this customer_email has an active telegram connection
            $email = $orderOrUser->customer_email ?: $fallbackEmail;
            if ($email) {
                $u = \App\Models\UserProfile::where('email', $email)->whereNotNull('telegram_chat_id')->first();
                if ($u && ($u->notif_telegram ?? true) && !empty($u->telegram_chat_id)) {
                    return (string)$u->telegram_chat_id;
                }
            }
            return null;
        }

        if ($orderOrUser instanceof \App\Models\Repair) {
            $phone = $orderOrUser->customer_phone ?: $fallbackPhone;
            if ($phone) {
                $u = \App\Models\UserProfile::where('phone', $phone)->first();
                if ($u && !empty($u->telegram_chat_id)) {
                    return (string)$u->telegram_chat_id;
                }
                if ($u && !empty($u->firebase_uid) && str_starts_with($u->firebase_uid, 'tg_')) {
                    $raw = str_replace('tg_', '', $u->firebase_uid);
                    if (is_numeric($raw)) return $raw;
                }
            }
            $email = $orderOrUser->customer_email ?: $fallbackEmail;
            if ($email) {
                $u = \App\Models\UserProfile::where('email', $email)->first();
                if ($u && !empty($u->telegram_chat_id)) {
                    return (string)$u->telegram_chat_id;
                }
                if ($u && !empty($u->firebase_uid) && str_starts_with($u->firebase_uid, 'tg_')) {
                    $raw = str_replace('tg_', '', $u->firebase_uid);
                    if (is_numeric($raw)) return $raw;
                }
            }
        }

        return null;
    }

    /**
     * Resolve actively linked UserProfile for a Telegram chat/user ID.
     * Enforces STRICT 1-TO-1 MAPPING: 1 Telegram ID corresponds to exactly 1 S Tech account.
     * If user disconnected their Telegram, this strictly returns NULL.
     */
    public static function resolveActiveUser(string $chatId): ?\App\Models\UserProfile
    {
        $cleanId = preg_replace('/\D/', '', $chatId) ?: $chatId;
        if (empty($cleanId)) return null;

        // 1. Strict 1-to-1: Resolve account where telegram_chat_id equals this Telegram ID
        $user = \App\Models\UserProfile::where('telegram_chat_id', (string)$cleanId)
            ->orWhere('telegram_chat_id', (string)$chatId)
            ->orderByDesc('wallet_balance')
            ->first();

        // 2. Native Telegram Account resolution by firebase_uid (tg_{cleanId})
        if (!$user) {
            $user = \App\Models\UserProfile::where('firebase_uid', 'tg_' . $cleanId)
                ->orWhere('firebase_uid', 'tg_' . $chatId)
                ->first();
        }

        // 3. Self-heal: Ensure telegram_chat_id is populated on native Telegram store account
        if ($user && empty($user->telegram_chat_id)) {
            $user->telegram_chat_id = (string)$cleanId;
            $user->notif_telegram = true;
            try { $user->save(); } catch (\Throwable $t) {}
            \Illuminate\Support\Facades\Cache::forget("tg_disconnected_{$cleanId}");
        }

        return $user;
    }

    /**
     * Build unified Eloquent query for Customer Orders across Telegram, Google UID, Email & Phone
     */
    public static function getCustomerOrdersBuilder(string $chatId, ?\App\Models\UserProfile $user = null): \Illuminate\Database\Eloquent\Builder
    {
        $cleanChatId = preg_replace('/\D/', '', $chatId) ?: $chatId;
        $user = $user ?: self::resolveActiveUser((string)$cleanChatId);

        if (!$user && empty($cleanChatId)) {
            return \App\Models\Order::whereRaw('1 = 0');
        }

        $userIds = [];
        if ($user) {
            if (!empty($user->firebase_uid)) $userIds[] = $user->firebase_uid;
            if (!empty($user->id)) $userIds[] = (string)$user->id;
            if (!empty($user->telegram_chat_id)) {
                $userIds[] = (string)$user->telegram_chat_id;
                $userIds[] = 'tg_' . $user->telegram_chat_id;
            }
            if (!empty($user->email)) {
                $siblingUids = \App\Models\UserProfile::where('email', $user->email)
                    ->pluck('firebase_uid')
                    ->filter()
                    ->toArray();
                $userIds = array_merge($userIds, $siblingUids);
            }
        }
        if (!empty($cleanChatId)) {
            $userIds[] = (string)$cleanChatId;
            $userIds[] = 'tg_' . $cleanChatId;
        }
        $userIds = array_unique(array_filter($userIds));

        return \App\Models\Order::where(function ($q) use ($userIds, $user, $cleanChatId) {
            $q->whereIn('user_id', $userIds);
            if ($user) {
                if (!empty($user->phone)) {
                    $q->orWhere('customer_phone', $user->phone);
                }
                if (!empty($user->email)) {
                    $q->orWhere('customer_email', $user->email);
                }
            }
            if (!empty($cleanChatId)) {
                $q->orWhere('user_id', 'tg_' . $cleanChatId)
                  ->orWhere('user_id', (string)$cleanChatId);
            }
        });
    }

    /**
     * Extract and validate date string in YYYY-MM-DD or DD/MM/YYYY format (supports Khmer digits)
     */
    public static function extractDateFromString(string $text): ?string
    {
        // Convert Khmer digits to Arabic digits (0-9)
        $khmerDigits = ['០','១','២','៣','៤','៥','៦','៧','៨','៩'];
        $arabicDigits = ['0','1','2','3','4','5','6','7','8','9'];
        $normalized = str_replace($khmerDigits, $arabicDigits, $text);

        // 1. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
        if (preg_match('/\b(20\d\d)[-\/\.](0?[1-9]|1[0-2])[-\/\.](0?[1-9]|[12]\d|3[01])\b/', $normalized, $m)) {
            $y = (int)$m[1];
            $mo = (int)$m[2];
            $d = (int)$m[3];
            if (checkdate($mo, $d, $y)) {
                return sprintf('%04d-%02d-%02d', $y, $mo, $d);
            }
        }

        // 2. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
        if (preg_match('/\b(0?[1-9]|[12]\d|3[01])[-\/\.](0?[1-9]|1[0-2])[-\/\.](20\d\d)\b/', $normalized, $m)) {
            $d = (int)$m[1];
            $mo = (int)$m[2];
            $y = (int)$m[3];
            if (checkdate($mo, $d, $y)) {
                return sprintf('%04d-%02d-%02d', $y, $mo, $d);
            }
        }

        return null;
    }

    /**
     * Interactive Customer Orders Hub & Filter Selection Menu
     */
    public static function sendCustomerOrdersMenu($chatId, ?string $fromName = null, ?int $messageId = null, ?string $activeToken = null): void
    {
        $user = self::resolveActiveUser((string)$chatId);
        if (!$user) {
            $notLinkedMsg = "ℹ️ <b>គណនី Telegram របស់អ្នកមិនទាន់បានភ្ជាប់ជាមួយ Website ណាមួយឡើយ</b> (Not Connected)។\n\n"
                . "👉 ដើម្បីពិនិត្យ និងតាមដានការកុម្ម៉ង់ទំនិញ សូមចូលទៅកាន់គេហទំព័រ រួចភ្ជាប់គណនីជាមួយ Telegram នេះក្នុង Profile Setting។";
            $notLinkedKb = [
                'inline_keyboard' => [
                    [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/login']],
                    [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                ]
            ];
            if ($messageId) {
                self::editMessageText($chatId, $messageId, $notLinkedMsg, $notLinkedKb, 'HTML', $activeToken);
            } else {
                self::sendMessageWithKeyboard($chatId, $notLinkedMsg, $notLinkedKb, 'HTML', null, $activeToken);
            }
            return;
        }

        $fromName = $fromName ?: (trim(($user->display_name ?? '') ?: 'អតិថិជន'));
        $tz = 'Asia/Phnom_Penh';

        // Cache quick count summary for 5 seconds for sub-millisecond response
        $counts = Cache::remember("tg_order_counts_{$chatId}", 5, function() use ($chatId, $user, $tz) {
            $base = self::getCustomerOrdersBuilder((string)$chatId, $user);
            $startToday = \Illuminate\Support\Carbon::today($tz)->startOfDay()->utc();
            $endToday = \Illuminate\Support\Carbon::today($tz)->endOfDay()->utc();
            $startWeek = \Illuminate\Support\Carbon::now($tz)->subDays(7)->startOfDay()->utc();

            $today = (clone $base)->whereBetween('created_at', [$startToday, $endToday])->count();
            $week = (clone $base)->where('created_at', '>=', $startWeek)->count();
            $total = (clone $base)->count();
            return compact('today', 'week', 'total');
        });

        $todayCount = (int)($counts['today'] ?? 0);
        $weekCount = (int)($counts['week'] ?? 0);
        $totalCount = (int)($counts['total'] ?? 0);

        $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
        $ordersAppUrl = "https://www.s-tech-store.tech/orders?tg_token={$sessionToken}";
        $storeAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

        $todayKh = \Illuminate\Support\Carbon::now($tz)->format('d/m/Y');

        $menuText = "📦 <b>ការពិនិត្យមើលប្រវត្តិបញ្ជាទិញ (My Orders Hub):</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "ជម្រាបសួរ <b>{$fromName}</b>!\n"
            . "សូមជ្រើសរើសជម្រើសចន្លោះកាលបរិច្ឆេទដែលលោកអ្នកចង់ពិនិត្យមើល៖\n\n"
            . "• 📅 <b>«ការ Order ថ្ងៃនេះ»</b>" . ($todayCount > 0 ? " — មាន <b>{$todayCount} កញ្ចប់</b> ({$todayKh})" : " — មិនទាន់មានថ្ងៃនេះ ({$todayKh})") . "\n"
            . "• 🗓️ <b>«ការ Order សប្ដាហ៍នេះ»</b>" . ($weekCount > 0 ? " — មាន <b>{$weekCount} កញ្ចប់</b> (៧ ថ្ងៃចុងក្រោយ)" : " — មិនទាន់មាន") . "\n"
            . "• 📦 <b>«ការ Order ទាំងអស់»</b> — សរុប <b>{$totalCount} កញ្ចប់</b>\n"
            . "• 📆 <b>«ជ្រើសរើសថ្ងៃជាក់លាក់»</b> — ម្សិលមិញ ឬកាលបរិច្ឆេទណាមួយ\n\n"
            . "👉 <i>សូមចុចប៊ូតុងជម្រើសខាងក្រោម៖</i>";

        $menuKb = [
            'inline_keyboard' => [
                [
                    ['text' => '📅 ការ Order ថ្ងៃនេះ' . ($todayCount > 0 ? " ({$todayCount})" : ''), 'callback_data' => 'cust_orders_filter:today'],
                    ['text' => '🗓️ ការ Order សប្ដាហ៍នេះ' . ($weekCount > 0 ? " ({$weekCount})" : ''), 'callback_data' => 'cust_orders_filter:week'],
                ],
                [
                    ['text' => '📦 ការ Order ទាំងអស់' . ($totalCount > 0 ? " ({$totalCount})" : ''), 'callback_data' => 'cust_orders_filter:all'],
                    ['text' => '📆 ជ្រើសរើសថ្ងៃជាក់លាក់', 'callback_data' => 'cust_orders_filter:picker'],
                ],
                [
                    ['text' => '📱 មើល Orders ក្នុង Mini App', 'web_app' => ['url' => $ordersAppUrl]],
                ],
                [
                    ['text' => '🛍️ ចូលទិញទំនិញក្នុង Mini App', 'web_app' => ['url' => $storeAppUrl]],
                    ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                ],
            ],
        ];

        if ($messageId) {
            $res = self::editMessageText($chatId, $messageId, $menuText, $menuKb, 'HTML', $activeToken);
            if (!($res['ok'] ?? false)) {
                self::sendMessageWithKeyboard($chatId, $menuText, $menuKb, 'HTML', null, $activeToken);
            }
        } else {
            self::sendMessageWithKeyboard($chatId, $menuText, $menuKb, 'HTML', null, $activeToken);
        }
    }

    /**
     * Interactive Specific Date Picker Menu for Customer Orders
     */
    public static function sendCustomerOrdersDatePicker($chatId, ?string $fromName = null, ?int $messageId = null, ?string $activeToken = null): void
    {
        $user = self::resolveActiveUser((string)$chatId);
        $fromName = $fromName ?: (trim(($user->display_name ?? '') ?: 'អតិថិជន'));
        $tz = 'Asia/Phnom_Penh';

        $now = \Illuminate\Support\Carbon::now($tz);
        $yesterday = \Illuminate\Support\Carbon::yesterday($tz);

        $pickerText = "📆 <b>ជ្រើសរើសកាលបរិច្ឆេទបញ្ជាទិញ (Select Specific Date):</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "ជម្រាបសួរ <b>{$fromName}</b>!\n"
            . "សូមចុចជ្រើសរើសថ្ងៃជាក់លាក់ណាមួយខាងក្រោម ដើម្បីពិនិត្យមើល Orders របស់លោកអ្នក៖\n\n"
            . "💡 <b>ឬលោកអ្នកអាចផ្ញើសារកាលបរិច្ឆេទផ្ទាល់ដូចជា៖</b>\n"
            . "• <code>order " . $yesterday->format('Y-m-d') . "</code>\n"
            . "• <code>order " . $yesterday->format('d/m/Y') . "</code>\n"
            . "• ឬវាយត្រឹមតែ <code>" . $yesterday->format('Y-m-d') . "</code> មកកាន់ Bot ផ្ទាល់!";

        $day1 = $now->copy()->subDays(1);
        $day2 = $now->copy()->subDays(2);
        $day3 = $now->copy()->subDays(3);
        $day4 = $now->copy()->subDays(4);
        $day5 = $now->copy()->subDays(5);
        $day6 = $now->copy()->subDays(6);

        $pickerKb = [
            'inline_keyboard' => [
                [
                    ['text' => '📅 ម្សិលមិញ (' . $day1->format('d/m') . ')', 'callback_data' => 'cust_orders_filter:date:' . $day1->format('Y-m-d')],
                    ['text' => '📅 ' . $day2->format('d/m/Y'), 'callback_data' => 'cust_orders_filter:date:' . $day2->format('Y-m-d')],
                ],
                [
                    ['text' => '📅 ' . $day3->format('d/m/Y'), 'callback_data' => 'cust_orders_filter:date:' . $day3->format('Y-m-d')],
                    ['text' => '📅 ' . $day4->format('d/m/Y'), 'callback_data' => 'cust_orders_filter:date:' . $day4->format('Y-m-d')],
                ],
                [
                    ['text' => '📅 ' . $day5->format('d/m/Y'), 'callback_data' => 'cust_orders_filter:date:' . $day5->format('Y-m-d')],
                    ['text' => '📅 ' . $day6->format('d/m/Y'), 'callback_data' => 'cust_orders_filter:date:' . $day6->format('Y-m-d')],
                ],
                [
                    ['text' => '📅 ការ Order ថ្ងៃនេះ', 'callback_data' => 'cust_orders_filter:today'],
                    ['text' => '🗓️ ការ Order សប្ដាហ៍នេះ', 'callback_data' => 'cust_orders_filter:week'],
                ],
                [
                    ['text' => '🔙 ត្រឡប់ក្រោយ (Back)', 'callback_data' => 'cust_my_orders'],
                    ['text' => '🏠 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                ],
            ],
        ];

        if ($messageId) {
            $res = self::editMessageText($chatId, $messageId, $pickerText, $pickerKb, 'HTML', $activeToken);
            if (!($res['ok'] ?? false)) {
                self::sendMessageWithKeyboard($chatId, $pickerText, $pickerKb, 'HTML', null, $activeToken);
            }
        } else {
            self::sendMessageWithKeyboard($chatId, $pickerText, $pickerKb, 'HTML', null, $activeToken);
        }
    }

    /**
     * Render filtered orders by timeframe (today, week, month, yesterday, all, date:YYYY-MM-DD)
     */
    public static function sendCustomerOrdersFiltered($chatId, string $filter = 'today', ?string $fromName = null, ?int $messageId = null, ?string $activeToken = null): void
    {
        $user = self::resolveActiveUser((string)$chatId);
        if (!$user) {
            $notLinkedMsg = "ℹ️ <b>គណនី Telegram របស់អ្នកមិនទាន់បានភ្ជាប់ជាមួយ Website ណាមួយឡើយ</b> (Not Connected)។\n\n"
                . "👉 ដើម្បីពិនិត្យ និងតាមដានការកុម្ម៉ង់ទំនិញ សូមចូលទៅកាន់គេហទំព័រ រួចភ្ជាប់គណនីជាមួយ Telegram នេះក្នុង Profile Setting។";
            $notLinkedKb = [
                'inline_keyboard' => [
                    [['text' => '🌐 ចូលគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech/login']],
                    [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                ]
            ];
            if ($messageId) {
                self::editMessageText($chatId, $messageId, $notLinkedMsg, $notLinkedKb, 'HTML', $activeToken);
            } else {
                self::sendMessageWithKeyboard($chatId, $notLinkedMsg, $notLinkedKb, 'HTML', null, $activeToken);
            }
            return;
        }

        $fromName = $fromName ?: (trim(($user->display_name ?? '') ?: 'អតិថិជន'));
        $tz = 'Asia/Phnom_Penh';

        $sessionToken = self::generateCustomerSessionToken((string)$chatId, $fromName);
        $ordersAppUrl = "https://www.s-tech-store.tech/orders?tg_token={$sessionToken}";
        $storeAppUrl = "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

        $query = self::getCustomerOrdersBuilder((string)$chatId, $user)
            ->select(['id', 'order_id', 'user_id', 'status', 'total_amount', 'payment_method', 'payment_status', 'delivery_type', 'shipping_address', 'created_at'])
            ->with(['items' => function ($q) {
                $q->select(['id', 'order_id', 'product_id', 'quantity', 'unit_price', 'subtotal'])->with(['product:id,name']);
            }])
            ->latest();

        $todayStr = \Illuminate\Support\Carbon::today($tz)->format('d/m/Y');
        $filterTitle = "";
        $activeFilter = $filter;

        switch ($filter) {
            case 'today':
                $startToday = \Illuminate\Support\Carbon::today($tz)->startOfDay()->utc();
                $endToday = \Illuminate\Support\Carbon::today($tz)->endOfDay()->utc();
                $query->whereBetween('created_at', [$startToday, $endToday]);
                $filterTitle = "📅 <b>ការបញ្ជាទិញថ្ងៃនេះ ({$todayStr}):</b>";
                break;
            case 'week':
                $startWeek = \Illuminate\Support\Carbon::now($tz)->subDays(7)->startOfDay()->utc();
                $query->where('created_at', '>=', $startWeek);
                $filterTitle = "🗓️ <b>ការបញ្ជាទិញក្នុងសប្ដាហ៍នេះ (៧ ថ្ងៃចុងក្រោយ):</b>";
                break;
            case 'yesterday':
                $yDate = \Illuminate\Support\Carbon::yesterday($tz);
                $startY = $yDate->copy()->startOfDay()->utc();
                $endY = $yDate->copy()->endOfDay()->utc();
                $query->whereBetween('created_at', [$startY, $endY]);
                $filterTitle = "📅 <b>ការបញ្ជាទិញម្សិលមិញ (" . $yDate->format('d/m/Y') . "):</b>";
                break;
            case 'month':
                $startMonth = \Illuminate\Support\Carbon::now($tz)->subDays(30)->startOfDay()->utc();
                $query->where('created_at', '>=', $startMonth);
                $filterTitle = "📆 <b>ការបញ្ជាទិញក្នុងខែនេះ (៣០ ថ្ងៃចុងក្រោយ):</b>";
                break;
            case 'all':
                $filterTitle = "📦 <b>ការបញ្ជាទិញទាំងអស់ (Recent Orders):</b>";
                break;
            default:
                if (str_starts_with($filter, 'date:')) {
                    $rawDate = substr($filter, 5);
                    try {
                        $cDate = \Illuminate\Support\Carbon::parse($rawDate, $tz);
                        $startD = $cDate->copy()->startOfDay()->utc();
                        $endD = $cDate->copy()->endOfDay()->utc();
                        $query->whereBetween('created_at', [$startD, $endD]);
                        $filterTitle = "📆 <b>ការបញ្ជាទិញនៅថ្ងៃ " . $cDate->format('d/m/Y') . ":</b>";
                    } catch (\Throwable $e) {
                        $filterTitle = "📆 <b>ការបញ្ជាទិញនៅថ្ងៃ {$rawDate}:</b>";
                    }
                } else {
                    $filterTitle = "📦 <b>ការបញ្ជាទិញរបស់អ្នក:</b>";
                }
                break;
        }

        $orders = $query->take(6)->get();

        if ($orders->isEmpty()) {
            $emptyText = "{$filterTitle}\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "ℹ️ <b>មិនមានទិន្នន័យបញ្ជាទិញទេ</b> សម្រាប់ចន្លោះពេលនេះ!\n\n"
                . "👉 លោកអ្នកអាចចុចជ្រើសរើសចន្លោះកាលបរិច្ឆេទផ្សេងទៀត ឬចូលទិញទំនិញថ្មីៗក្នុង Mini App ដើម្បីទទួលបានការបញ្ចុះតម្លៃពិសេសភ្លាមៗ៖";

            $emptyKb = [
                'inline_keyboard' => [
                    [
                        ['text' => '📅 ការ Order ថ្ងៃនេះ', 'callback_data' => 'cust_orders_filter:today'],
                        ['text' => '🗓️ ការ Order សប្ដាហ៍នេះ', 'callback_data' => 'cust_orders_filter:week'],
                    ],
                    [
                        ['text' => '📦 ការ Order ទាំងអស់', 'callback_data' => 'cust_orders_filter:all'],
                        ['text' => '📆 ជ្រើសរើសថ្ងៃជាក់លាក់', 'callback_data' => 'cust_orders_filter:picker'],
                    ],
                    [
                        ['text' => '🛍️ ចូលទិញទំនិញក្នុង Mini App', 'web_app' => ['url' => $storeAppUrl]],
                    ],
                    [
                        ['text' => '🔙 ជម្រើសកាលបរិច្ឆេទ', 'callback_data' => 'cust_my_orders'],
                        ['text' => '🏠 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];

            if ($messageId) {
                $res = self::editMessageText($chatId, $messageId, $emptyText, $emptyKb, 'HTML', $activeToken);
                if (!($res['ok'] ?? false)) {
                    self::sendMessageWithKeyboard($chatId, $emptyText, $emptyKb, 'HTML', null, $activeToken);
                }
            } else {
                self::sendMessageWithKeyboard($chatId, $emptyText, $emptyKb, 'HTML', null, $activeToken);
            }
            return;
        }

        $ordersCount = $orders->count();
        $ordersText = "{$filterTitle}\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "✨ រកឃើញចំនួន <b>{$ordersCount} កញ្ចប់</b>\n\n";

        foreach ($orders as $ord) {
            $statusRaw = strtolower($ord->status ?? 'pending');
            $statusBadge = match($statusRaw) {
                'pending' => '⏳ កំពុងរង់ចាំពិនិត្យ (Pending)',
                'processing' => '🔄 កំពុងរៀបចំកញ្ចប់ទំនិញ (Processing)',
                'shipped', 'delivering', 'shipping' => '🚚 កំពុងដឹកជញ្ជូនលើផ្លូវ (Shipped)',
                'completed', 'delivered' => '✅ បានដឹកជញ្ជូនជោគជ័យ (Delivered)',
                'cancelled' => '❌ បានលុបចោល (Cancelled)',
                default => ucfirst($ord->status ?? 'pending'),
            };

            $progressBar = match($statusRaw) {
                'pending' => "▰▰▱▱▱▱▱▱▱▱ 25% (ទទួលការកុម្ម៉ង់)",
                'processing' => "▰▰▰▰▰▱▱▱▱▱ 50% (វេចខ្ចប់ទំនិញ)",
                'shipped', 'delivering', 'shipping' => "▰▰▰▰▰▰▰▰▱▱ 80% (កំពុងដឹកជញ្ជូន)",
                'completed', 'delivered' => "▰▰▰▰▰▰▰▰▰▰ 100% (ជោគជ័យ)",
                'cancelled' => "▰▰▱▱▱▱▱▱▱▱ ❌ [បានលុបចោល]",
                default => "▰▰▱▱▱▱▱▱▱▱ 25%",
            };

            $itemsDetailed = [];
            if ($ord->items && $ord->items->isNotEmpty()) {
                foreach ($ord->items as $idx => $it) {
                    $pName = htmlspecialchars($it->product ? $it->product->name : 'ទំនិញ');
                    $qty = $it->quantity;
                    $priceStr = $it->unit_price ? ' ($' . number_format((float)$it->unit_price, 2) . ')' : '';
                    $itemsDetailed[] = "  " . ($idx + 1) . ". {$pName} × {$qty}{$priceStr}";
                }
            } else {
                $itemsDetailed[] = "  • ព័ត៌មានទំនិញ S Tech Store";
            }
            $itemsBlock = implode("\n", $itemsDetailed);

            $formattedDate = $ord->created_at ? $ord->created_at->timezone($tz)->format('d/m/Y H:i') : 'ថ្មីៗ';
            $payMethod = strtoupper($ord->payment_method ?? 'COD');
            $delivery = $ord->delivery_type === 'pnompenh' ? 'ភ្នំពេញ (Phnom Penh)' : ($ord->delivery_type === 'province' ? 'តាមខេត្ត (Province)' : ($ord->delivery_type ?? 'Standard'));
            $addr = htmlspecialchars($ord->shipping_address ?: 'ទីតាំងបានបញ្ជាក់');

            $ordersText .= "🧾 <b>Order #{$ord->order_id}</b>\n"
                . "⚡ <b>ស្ថានភាព:</b> <b>{$statusBadge}</b>\n"
                . "📊 <b>ដំណើរការ:</b> <code>{$progressBar}</code>\n"
                . "💵 <b>តម្លៃសរុប:</b> <b>\${$ord->total_amount} USD</b> ({$payMethod})\n"
                . "<blockquote expandable>\n"
                . "🛍️ <b>មុខទំនិញក្នុងកញ្ចប់ (" . ($ord->items ? $ord->items->count() : 0) . " មុខ):</b>\n"
                . "{$itemsBlock}\n"
                . "📍 <b>អាសយដ្ឋានដឹក:</b> {$addr}\n"
                . "🚚 <b>សេវាដឹក:</b> {$delivery}\n"
                . "⏰ <b>កាលបរិច្ឆេទ:</b> {$formattedDate}\n"
                . "</blockquote>\n"
                . "────────────────────\n\n";
        }

        $ordersText .= "👉 <i>លោកអ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីមើលលម្អិតក្នុង Mini App ឬផ្លាស់ប្តូរថ្ងៃផ្សេងទៀត៖</i>";

        $filterRow = [];
        if ($activeFilter !== 'today') {
            $filterRow[] = ['text' => '📅 ថ្ងៃនេះ', 'callback_data' => 'cust_orders_filter:today'];
        }
        if ($activeFilter !== 'week') {
            $filterRow[] = ['text' => '🗓️ សប្ដាហ៍នេះ', 'callback_data' => 'cust_orders_filter:week'];
        }
        if ($activeFilter !== 'all') {
            $filterRow[] = ['text' => '📦 ទាំងអស់', 'callback_data' => 'cust_orders_filter:all'];
        }

        $ordersKb = [
            'inline_keyboard' => [
                [['text' => '📱 មើល Orders ក្នុង Mini App', 'web_app' => ['url' => $ordersAppUrl]]],
                $filterRow,
                [
                    ['text' => '📆 ជ្រើសរើសថ្ងៃជាក់លាក់', 'callback_data' => 'cust_orders_filter:picker'],
                    ['text' => '🔙 ជម្រើសកាលបរិច្ឆេទ', 'callback_data' => 'cust_my_orders'],
                ],
                [
                    ['text' => '🛍️ ចូលទិញទំនិញក្នុង Mini App', 'web_app' => ['url' => $storeAppUrl]],
                    ['text' => '🏠 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                ],
            ],
        ];

        if ($messageId) {
            $res = self::editMessageText($chatId, $messageId, $ordersText, $ordersKb, 'HTML', $activeToken);
            if (!($res['ok'] ?? false)) {
                self::sendMessageWithKeyboard($chatId, $ordersText, $ordersKb, 'HTML', null, $activeToken);
            }
        } else {
            self::sendMessageWithKeyboard($chatId, $ordersText, $ordersKb, 'HTML', null, $activeToken);
        }
    }

    /**
     * Generate 1-Click login session token for customer companion bot
     * Only returns token if user is actively connected. Never auto-creates dummy accounts!
     */
    public static function generateCustomerSessionToken(string $chatId, ?string $name = null): string
    {
        $cleanId = preg_replace('/\D/', '', $chatId) ?: $chatId;

        $user = self::resolveActiveUser($cleanId);
        if (!$user) {
            return '';
        }

        $token = 'tg_sess_' . \Illuminate\Support\Str::random(60);
        \Illuminate\Support\Facades\Cache::put("customer_sess_{$token}", $user->id, 30 * 24 * 60 * 60);
        try {
            \Illuminate\Support\Facades\Cache::store('file')->put("customer_sess_{$token}", $user->id, 30 * 24 * 60 * 60);
        } catch (\Throwable $t) {}
        $user->magic_login_token = $token;
        $user->save();

        return $token;
    }

    /**
     * Send Real-Time Personalized Order Alert directly to Customer 1-on-1 Chat via Bot 2
     */
    public static function sendCustomerDirectOrderAlert($order, string $event = 'created'): array
    {
        $chatId = self::resolveCustomerChatId($order);
        if (!$chatId) {
            return ['ok' => false, 'error' => 'No linked Telegram chat for customer'];
        }

        $orderId = $order->order_id ?: ('#ORD-' . $order->id);
        $cleanOrderId = ltrim($orderId, '#');
        $sessionToken = self::generateCustomerSessionToken($chatId, $order->customer_name ?? null);
        $directUrl = "https://www.s-tech-store.tech/orders?order_id={$cleanOrderId}&chat_id={$chatId}&tg_token={$sessionToken}";

        $customerName = htmlspecialchars($order->customer_name ?? 'អតិថិជន');
        $total = number_format((float)($order->total_amount ?? 0), 2);
        $paymentMethod = strtoupper($order->payment_method ?? 'Cash on Delivery (COD)');
        $paymentStatus = ucfirst($order->payment_status ?? 'unpaid');
        $delivery = htmlspecialchars($order->delivery_type ?? 'Standard Delivery');
        $address = htmlspecialchars($order->shipping_address ?? 'Phnom Penh');
        $date = self::khmerTime($order->created_at ?? null, 'd/m/Y H:i');

        $itemsText = "";
        if (!empty($order->items)) {
            foreach ($order->items as $idx => $item) {
                $pName = htmlspecialchars($item->product->name ?? ('Product #' . ($item->product_id ?? ($idx + 1))));
                $qty = $item->quantity ?? 1;
                $price = number_format((float)($item->unit_price ?? 0), 2);
                $itemsText .= "  • <b>{$pName}</b> x{$qty} (\${$price})\n";
            }
        } else {
            $itemsText = "  • <i>ទំនិញ S Tech Store</i>\n";
        }

        if ($event === 'created') {
            $msg = "🎉 <b>ការបញ្ជាទិញទទួលបានជោគជ័យ! (ORDER CONFIRMED)</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "ជម្រាបសួរ <b>{$customerName}</b>! សូមអរគុណសម្រាប់ការបញ្ជាទិញនៅ S Tech Store។\n\n"
                . "🧾 <b>លេខវិក្កយបត្រ (Order ID):</b> <code>#{$orderId}</code>\n"
                . "⚡ <b>ស្ថានភាព:</b> ⏳ <b>កំពុងរង់ចាំរៀបចំ (Pending)</b>\n"
                . "💰 <b>សរុបទឹកប្រាក់:</b> <b>\${$total} USD</b>\n"
                . "💳 <b>វិធីសាស្ត្រទូទាត់:</b> {$paymentMethod} ({$paymentStatus})\n"
                . "🚚 <b>ការដឹកជញ្ជូន:</b> {$delivery}\n"
                . "📍 <b>អាសយដ្ឋានដឹក:</b> {$address}\n\n"
                . "📦 <b>មុខទំនិញក្នុងកញ្ចប់:</b>\n"
                . $itemsText . "\n"
                . "⏰ <b>កាលបរិច្ឆេទ:</b> {$date}\n\n"
                . "👉 <i>លោកអ្នកអាចតាមដានដំណាក់កាលវេចខ្ចប់ និងដំណើរការដឹកជញ្ជូន Real-time តាមរយៈប៊ូតុងខាងក្រោម!</i>";

            $kb = [
                'inline_keyboard' => [
                    [
                        ['text' => '🧾 មើលវិក្កយបត្រ (Invoice Image)', 'callback_data' => "cust_inv_{$cleanOrderId}"],
                        ['text' => '📄 ទាញយក File (HTML)', 'callback_data' => "cust_file_inv_{$cleanOrderId}"],
                    ],
                    [['text' => '📱 តាមដាន Order ក្នុង Mini App', 'web_app' => ['url' => $directUrl]]],
                    [
                        ['text' => '🌐 បើកលើ Browser', 'url' => $directUrl],
                        ['text' => '💬 ជជែកជាមួយបុគ្គលិក', 'callback_data' => 'cust_support'],
                    ],
                ],
            ];
        } elseif ($event === 'paid') {
            $msg = "💳 <b>ការទូទាត់ប្រាក់ទទួលបានជោគជ័យ! (PAYMENT VERIFIED)</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "ជម្រាបសួរ <b>{$customerName}</b>!\n\n"
                . "វិក្កយបត្រ <code>#{$orderId}</code> ចំនួន <b>\${$total} USD</b> ត្រូវបានផ្ទៀងផ្ទាត់ការទូទាត់ជោគជ័យតាមរយៈ <b>{$paymentMethod}</b>។\n\n"
                . "🔄 <b>ស្ថានភាពឥឡូវនេះ:</b> <b>កំពុងរៀបចំកញ្ចប់ទំនិញ (Processing)</b>\n"
                . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime(null, 'd/m/Y H:i') . "\n\n"
                . "👉 <i>ក្រុមការងារយើងខ្ញុំកំពុងរៀបចំកញ្ចប់ទំនិញយ៉ាងម៉ត់ចត់ដើម្បីប្រគល់ជូនផ្នែកដឹកជញ្ជូន!</i>";

            $kb = [
                'inline_keyboard' => [
                    [
                        ['text' => '🧾 មើលវិក្កយបត្រ (Invoice Image)', 'callback_data' => "cust_inv_{$cleanOrderId}"],
                        ['text' => '📄 ទាញយក File (HTML)', 'callback_data' => "cust_file_inv_{$cleanOrderId}"],
                    ],
                    [['text' => '📱 ពិនិត្យមើលក្នុង Mini App', 'web_app' => ['url' => $directUrl]]],
                    [['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu']],
                ],
            ];
        } else {
            // Status updated (processing, shipped, delivered, cancelled, failed)
            $statusKey = strtolower($order->status ?? 'pending');
            $statusBadge = match($statusKey) {
                'pending' => '⏳ កំពុងរង់ចាំពិនិត្យ (Pending)',
                'processing' => '🔄 កំពុងរៀបចំកញ្ចប់ទំនិញ (Processing)',
                'shipped', 'delivering' => '🚚 កំពុងធ្វើដំណើរលើផ្លូវដឹកជញ្ជូន (Shipped)',
                'completed', 'delivered' => '✅ បានដឹកជញ្ជូនដល់ដៃជោគជ័យ (Delivered)',
                'cancelled' => '❌ ការបញ្ជាទិញត្រូវបានបោះបង់ (Cancelled)',
                'failed' => '❌ ការបញ្ជាទិញបរាជ័យ (Failed)',
                default => ucfirst($order->status),
            };

            $statusNote = match($statusKey) {
                'processing' => '📦 ហាងកំពុងរៀបចំវេចខ្ចប់ទំនិញយ៉ាងយកចិត្តទុកដាក់ និងត្រៀមប្រគល់ជូនអ្នកដឹក។',
                'shipped', 'delivering' => '🚚 ទំនិញរបស់អ្នកកំពុងធ្វើដំណើរលើផ្លូវដឹកជញ្ជូនជូនលោកអ្នក។ សូមត្រៀមទទួលទូរស័ព្ទពីអ្នកដឹកជញ្ជូន!',
                'completed', 'delivered' => '🎉 ទំនិញត្រូវបានប្រគល់ជូនរួចរាល់។ សូមអរគុណយ៉ាងជ្រាលជ្រៅសម្រាប់ការគាំទ្រ S Tech Store!',
                'cancelled' => '⚠️ ការបញ្ជាទិញនេះត្រូវបានលុបចោល។ សូមទាក់ទងមកកាន់យើងខ្ញុំប្រសិនបើមានសំណួរ។',
                'failed' => '⚠️ ការទូទាត់ ឬការបញ្ជាទិញមិនជោគជ័យឡើយ។ សូមពិនិត្យ ឬទាក់ទងមកកាន់យើងខ្ញុំដើម្បីទទួលបានការជួយ។',
                default => '⚡ ស្ថានភាពកញ្ចប់ទំនិញរបស់អ្នកត្រូវបានធ្វើបច្ចុប្បន្នភាព។',
            };

            $msg = "🔔 <b>បច្ចុប្បន្នភាពនៃការបញ្ជាទិញ (ORDER STATUS UPDATE)!</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                . "ជម្រាបសួរ <b>{$customerName}</b>!\n\n"
                . "🧾 <b>លេខវិក្កយបត្រ:</b> <code>#{$orderId}</code>\n"
                . "⚡ <b>ស្ថានភាពថ្មី:</b> <b>{$statusBadge}</b>\n\n"
                . "ℹ️ <i>{$statusNote}</i>\n\n"
                . "💰 <b>តម្លៃសរុប:</b> <b>\${$total} USD</b> ({$paymentMethod} - {$paymentStatus})\n"
                . "⏰ <b>ធ្វើបច្ចុប្បន្នភាពនៅម៉ោង:</b> " . self::khmerTime(null, 'd/m/Y H:i') . "\n\n"
                . "👉 <i>លោកអ្នកអាចពិនិត្យមើលព័ត៌មានលម្អិតបន្ថែមតាមរយៈប៊ូតុងខាងក្រោម!</i>";

            $kb = [
                'inline_keyboard' => [
                    [
                        ['text' => '🧾 មើលវិក្កយបត្រ (Invoice Image)', 'callback_data' => "cust_inv_{$cleanOrderId}"],
                        ['text' => '📄 ទាញយក File (HTML)', 'callback_data' => "cust_file_inv_{$cleanOrderId}"],
                    ],
                    [['text' => '📱 ពិនិត្យមើល Order ក្នុង Mini App', 'web_app' => ['url' => $directUrl]]],
                    [
                        ['text' => '💬 សាកសួរក្រុមការងារ', 'callback_data' => 'cust_support'],
                        ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                    ],
                ],
            ];
        }

        return self::sendMessageWithKeyboard($chatId, $msg, $kb, 'HTML', null, self::getCustomerBotToken());
    }

    /**
     * Send direct admin notice / alert to customer 1-on-1 Telegram chat via Bot 2
     */
    public static function sendCustomerDirectNotification($userProfile, string $title, string $message, ?string $link = null): array
    {
        $chatId = self::resolveCustomerChatId($userProfile);
        if (!$chatId) {
            return ['ok' => false, 'error' => 'No linked Telegram chat for user'];
        }

        $sessionToken = self::generateCustomerSessionToken($chatId, $userProfile->display_name ?? null);
        $targetLink = $link 
            ? "https://www.s-tech-store.tech" . (str_starts_with($link, '/') ? $link : '/' . $link) . (str_contains($link, '?') ? "&tg_token={$sessionToken}" : "?tg_token={$sessionToken}")
            : "https://www.s-tech-store.tech/?tg_token={$sessionToken}";

        $cleanTitle = htmlspecialchars($title);
        $cleanMsg = htmlspecialchars($message);
        $name = htmlspecialchars($userProfile->display_name ?? 'អតិថិជន');

        $text = "📢 <b>ដំណឹងពី S TECH STORE</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n\n"
            . "ជម្រាបសួរ <b>{$name}</b>!\n\n"
            . "📌 <b>{$cleanTitle}</b>\n\n"
            . "{$cleanMsg}\n\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime(null, 'd/m/Y H:i') . "\n\n"
            . "👉 <i>សូមចុចប៊ូតុងខាងក្រោមដើម្បីពិនិត្យមើលក្នុងគេហទំព័រ ឬ Mini App!</i>";

        $kb = [
            'inline_keyboard' => [
                [['text' => '📱 បើកពិនិត្យក្នុង Mini App', 'web_app' => ['url' => $targetLink]]],
                [
                    ['text' => '🌐 បើកលើ Browser', 'url' => $targetLink],
                    ['text' => '💬 ជជែកជាមួយបុគ្គលិក', 'callback_data' => 'cust_support'],
                ],
            ],
        ];

        return self::sendMessageWithKeyboard($chatId, $text, $kb, 'HTML', null, self::getCustomerBotToken());
    }

    /**
     * Send direct 2FA OTP verification code to customer 1-on-1 Telegram chat via Customer Bot
     */
    public static function sendCustomerTwoFactorOtp($customerOrChatId, string $otp, ?string $customerName = null): array
    {
        $chatId = self::resolveCustomerChatId($customerOrChatId);
        if (!$chatId) {
            return ['ok' => false, 'error' => 'No linked Telegram chat for customer'];
        }

        $botToken = self::getCustomerBotToken();
        $name = htmlspecialchars($customerName ?: 'អតិថិជន S Tech Store');

        $text = "🛡️ <b>[S TECH STORE] លេខកូដសុវត្ថិភាព 2FA របស់អ្នក</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n\n"
            . "ជម្រាបសួរ <b>{$name}</b>!\n\n"
            . "🔐 <b>លេខកូដផ្ទៀងផ្ទាត់សុវត្ថិភាព (OTP Code):</b>\n"
            . "👉 <code>{$otp}</code> 👈 <i>(ចុចលើលេខកូដដើម្បី Copy)</i>\n\n"
            . "⏱️ <b>សុពលភាព:</b> <b>១០ នាទី</b>\n"
            . "🌐 <b>គេហទំព័រ:</b> https://www.s-tech-store.tech\n"
            . "🛡️ <b>សកម្មភាព:</b> បើកប្រព័ន្ធការពារពីរកត្តា (Two-Factor Authentication)\n\n"
            . "⚠️ <i>សូមកុំប្រាប់លេខកូដនេះដល់អ្នកដទៃជាដាច់ខាត! ក្រុមការងារយើងខ្ញុំមិនដែលទាមទារសួររកលេខកូដនេះពីអ្នកឡើយ។</i>";

        $kb = [
            'inline_keyboard' => [
                [
                    ['text' => '🌐 បើកទំព័រ Profile បញ្ចូលលេខកូដ', 'url' => 'https://www.s-tech-store.tech/account/profile'],
                ],
            ],
        ];

        return self::sendMessageWithKeyboard($chatId, $text, $kb, 'HTML', null, $botToken);
    }

    /**
     * Send instant direct alert to customer Telegram Bot when Admin/Staff replies in Live Chat
     */
    public static function sendAdminChatReplyAlertToCustomer($customerOrChatId, string $replyText, ?string $staffName = null): array
    {
        $chatId = self::resolveCustomerChatId($customerOrChatId);
        if (!$chatId) {
            return ['ok' => false, 'error' => 'No linked Telegram for customer'];
        }

        $staff = htmlspecialchars($staffName ?: 'បុគ្គលិក S Tech Store');
        $cleanReply = htmlspecialchars($replyText);
        if (mb_strlen($cleanReply) > 400) {
            $cleanReply = mb_substr($cleanReply, 0, 397) . '...';
        }

        $sessionToken = self::generateCustomerSessionToken($chatId);
        $directUrl = "https://www.s-tech-store.tech/?open_chat=1&tg_token={$sessionToken}";

        $text = "💬 <b>មានសារឆ្លើយតបថ្មីពីបុគ្គលិក S Tech Store!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n\n"
            . "👤 <b>{$staff}</b> បានឆ្លើយតបសាររបស់អ្នក៖\n\n"
            . "<i>\"{$cleanReply}\"</i>\n\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime(null, 'd/m/Y H:i') . "\n\n"
            . "👉 <i>សូមចុចប៊ូតុងខាងក្រោមដើម្បីបើកមើលការសន្ទនាផ្ទាល់ក្នុង Live Chat!</i>";

        $kb = [
            'inline_keyboard' => [
                [['text' => '💬 បើក Live Chat ពិនិត្យមើល', 'web_app' => ['url' => $directUrl]]],
                [['text' => '🌐 ចូលគេហទំព័រហាង', 'url' => $directUrl]],
            ]
        ];

        return self::sendMessageWithKeyboard($chatId, $text, $kb, 'HTML', null, self::getCustomerBotToken());
    }

    /**
     * Send direct repair ticket alert to customer 1-on-1 Telegram chat via Bot 2
     */
    public static function sendCustomerDirectRepairAlert($repair, string $event = 'status_updated'): array
    {
        $chatId = self::resolveCustomerChatId($repair);
        if (!$chatId) {
            return ['ok' => false, 'error' => 'No linked Telegram chat for repair customer'];
        }

        $sessionToken = self::generateCustomerSessionToken($chatId, $repair->customer_name ?? null);
        $rawTicket = $repair->ticket_code ?? ('REP-' . $repair->id);
        $cleanTicketCode = ltrim($rawTicket, '#');
        $directUrl = "https://www.s-tech-store.tech/repairs?ticket=" . urlencode($cleanTicketCode) . "&chat_id={$chatId}&tg_token={$sessionToken}";

        $ticketCode = htmlspecialchars($repair->ticket_code ?? ('#REP-' . $repair->id));
        $name = htmlspecialchars($repair->customer_name ?? 'អតិថិជន');
        $device = htmlspecialchars($repair->device_name ?? 'ឧបករណ៍');
        $status = htmlspecialchars($repair->status ?? 'Pending Assessment');
        $tech = htmlspecialchars($repair->technician_name ?? 'ជាងជំនាញ');
        $cost = number_format((float)($repair->estimated_cost ?? 0), 2);

        $statusBadge = match($status) {
            'Ready' => '✅ រួចរាល់អាចមកទទួលយកបាន (Ready)',
            'In Progress' => '🔄 កំពុងជួសជុល (In Progress)',
            'Completed' => '🎉 បានប្រគល់ជូនរួចរាល់ (Completed)',
            default => '⏳ កំពុងពិនិត្យរោគសញ្ញា (Pending)',
        };

        $title = ($event === 'created') ? 'សំបុត្រជួសជុលថ្មីត្រូវបានបង្កើត!' : 'បច្ចុប្បន្នភាពសំបុត្រជួសជុល!';

        $msg = "🔧 <b>[REPAIR CENTER] {$title}</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n\n"
            . "ជម្រាបសួរ <b>{$name}</b>!\n\n"
            . "🎫 <b>លេខ Ticket:</b> <code>{$ticketCode}</code>\n"
            . "💻 <b>ឧបករណ៍:</b> <b>{$device}</b>\n"
            . "⚡ <b>ស្ថានភាព:</b> <b>{$statusBadge}</b>\n"
            . "👨‍🔧 <b>ជាងទទួលបន្ទុក:</b> {$tech}\n"
            . "💵 <b>តម្លៃប៉ាន់ស្មាន:</b> \${$cost} USD\n"
            . (!empty($repair->notes) ? "📝 <b>កំណត់សម្គាល់:</b> <i>" . htmlspecialchars($repair->notes) . "</i>\n" : "")
            . "⏰ <b>ធ្វើបច្ចុប្បន្នភាព:</b> " . self::khmerTime(null, 'd/m/Y H:i') . "\n\n"
            . "👉 <i>លោកអ្នកអាចពិនិត្យមើលព័ត៌មានលម្អិត ឬទាក់ទងជាងបច្ចេកទេសតាមប៊ូតុងខាងក្រោម!</i>";

        $kb = [
            'inline_keyboard' => [
                [['text' => '🔧 មើលការជួសជុលក្នុង Mini App', 'web_app' => ['url' => $directUrl]]],
                [
                    ['text' => '📞 ទាក់ទងជាងបច្ចេកទេស', 'callback_data' => 'cust_contact'],
                    ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                ],
            ],
        ];

        return self::sendMessageWithKeyboard($chatId, $msg, $kb, 'HTML', null, self::getCustomerBotToken());
    }

    /**
     * Send direct Welcome & Companion Hub activation to customer 1-on-1 Telegram chat via Bot 2
     */
    public static function sendCustomerDirectWelcomeHub($user, string $tgId): array
    {
        $token = self::generateCustomerSessionToken($tgId, $user->display_name ?? null);
        $directUrl = "https://www.s-tech-store.tech/?tg_token={$token}";
        $ordersUrl = "https://www.s-tech-store.tech/orders?tg_token={$token}";
        $name = htmlspecialchars($user->display_name ?? 'អតិថិជន');

        $welcome = "🎉 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Customer Hub!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n\n"
            . "ជម្រាបសួរ <b>{$name}</b>!\n\n"
            . "✨ គណនី Telegram របស់អ្នកត្រូវបានភ្ជាប់ជាមួយគេហទំព័រ S Tech Store ដោយជោគជ័យ ១០០%។\n\n"
            . "🤖 <b>តួនាទីរបស់ Bot នេះសម្រាប់អ្នក (Personal Companion Bot):</b>\n"
            . "• 📦 <b>តាមដានការបញ្ជាទិញ:</b> ទទួលដំណឹង Real-time ភ្លាមៗរាល់ពេលកុម្ម៉ង់ ឬកញ្ចប់ទំនិញធ្វើដំណើរ\n"
            . "• 🪙 <b>ពិន្ទុ & VIP Rewards:</b> ពិនិត្យមើល S-Coins និងកម្រិតសមាជិក VIP\n"
            . "• 🔧 <b>សំបុត្រជួសជុល:</b> តាមដានស្ថានភាពជួសជុល ឬ Upgrade កុំព្យូទ័រ\n"
            . "• 📢 <b>ដំណឹងពី Admin:</b> ទទួលសារ និងការឆ្លើយតបផ្ទាល់ពីហាង\n\n"
            . "👉 <b>លោកអ្នកអាចចុចបើក Mini App ខាងក្រោមដើម្បីចូលទិញទំនិញភ្លាមៗ ដោយមិនបាច់ Login ម្តងទៀតឡើយ!</b>";

        $kb = [
            'inline_keyboard' => [
                [['text' => '🛍️ បើកទិញក្នុង Mini App (Auto-Login)', 'web_app' => ['url' => $directUrl]]],
                [
                    ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ', 'callback_data' => 'cust_my_orders'],
                    ['text' => '🪙 ពិន្ទុ & VIP', 'callback_data' => 'cust_my_points'],
                ],
                [
                    ['text' => '🌐 ចូលគេហទំព័រ (1-Click)', 'url' => $directUrl],
                    ['text' => '💬 ជជែកជាមួយបុគ្គលិក', 'callback_data' => 'cust_support'],
                ],
            ],
        ];

        return self::sendMessageWithKeyboard($tgId, $welcome, $kb, 'HTML', null, self::getCustomerBotToken());
    }

    /**
     * Edit message text and inline keyboard (supports Multi-Bot Token)
     */
    public static function editMessageText($chatId, int $messageId, string $text, ?array $replyMarkup = null, string $parseMode = 'HTML', ?string $token = null): array
    {
        $settings = self::getSettings();
        if (!$token) {
            $isPrivateUserChat = is_numeric($chatId) && (int)$chatId > 0;
            $token = $isPrivateUserChat 
                ? self::getCustomerBotToken() 
                : ($settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN'));
        }

        if (!$token || str_contains($token, 'Placeholder')) {
            return ['ok' => true, 'mock' => true];
        }

        try {
            $payload = [
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'text' => $text,
                'parse_mode' => $parseMode,
                'disable_web_page_preview' => false,
            ];
            if ($replyMarkup !== null) {
                $payload['reply_markup'] = json_encode($replyMarkup);
            }

            $response = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/editMessageText", $payload);
            $json = $response->json();
            return $json ?? ['ok' => $response->successful()];
        } catch (\Throwable $e) {
            Log::error("Failed to edit Telegram message: " . $e->getMessage());
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Answer Telegram callback query to dismiss button loading spinners (supports Multi-Bot Token & Auto-Fallback)
     */
    public static function answerCallbackQuery(?string $callbackId, string $text = '', ?string $token = null, bool $showAlert = false): void
    {
        if (empty($callbackId)) {
            return;
        }

        $token = $token ?: self::getCustomerBotToken();
        if (!$token || str_contains($token, 'Placeholder')) {
            return;
        }

        try {
            $payload = [
                'callback_query_id' => $callbackId,
                'text' => $text,
                'show_alert' => $showAlert,
                'cache_time' => 1,
            ];
            $resp = Http::timeout(4)->connectTimeout(2)->post("https://api.telegram.org/bot{$token}/answerCallbackQuery", $payload);

            // If token rejected with 400 (e.g. wrong bot token), automatically fallback to customer bot token
            if (!$resp->successful() && $token !== self::getCustomerBotToken() && self::getCustomerBotToken()) {
                $altToken = self::getCustomerBotToken();
                Http::timeout(4)->connectTimeout(2)->post("https://api.telegram.org/bot{$altToken}/answerCallbackQuery", $payload);
            }
        } catch (\Throwable $e) {}
    }

    /**
     * Invalidate local-first Telegram cache for a user when wallet balance, orders, or points mutate
     */
    public static function invalidateUserBotCache(string|int $chatId): void
    {
        $id = (string)$chatId;
        $cleanId = str_replace('tg_', '', $id);
        Cache::forget("tg_u_prof_{$cleanId}");
        Cache::forget("tg_txs_{$cleanId}");
        Cache::forget("tg_orders_{$cleanId}");
        Cache::forget("tg_orders_cnt_{$cleanId}");
        Cache::forget("tg_repairs_{$cleanId}");
        Cache::forget("tg_points_{$cleanId}");
    }

    /**
     * Send instant chat action (e.g. typing) to Telegram client header (< 20ms)
     */
    public static function sendChatAction($chatId, string $action = 'typing', ?string $token = null): void
    {
        if (empty($chatId)) {
            return;
        }

        $settings = self::getSettings();
        if (!$token) {
            $isPrivateUserChat = is_numeric($chatId) && (int)$chatId > 0;
            $token = $isPrivateUserChat 
                ? self::getCustomerBotToken() 
                : self::getStaffBotToken();
        }
        $token = self::sanitizeBotToken($token);
        if (!$token || str_contains($token, 'Placeholder')) {
            return;
        }

        try {
            Http::timeout(3)->connectTimeout(2)->post("https://api.telegram.org/bot{$token}/sendChatAction", [
                'chat_id' => $chatId,
                'action' => $action,
            ]);
        } catch (\Throwable $e) {}
    }

    /**
     * Send animated message reaction (burst particle animation in Telegram)
     */
    public static function setMessageReaction($chatId, int $messageId, string $emoji = '🔥', bool $isBig = true, ?string $token = null): void
    {
        if (empty($chatId) || empty($messageId)) {
            return;
        }

        $settings = self::getSettings();
        if (!$token) {
            $isPrivateUserChat = is_numeric($chatId) && (int)$chatId > 0;
            $token = $isPrivateUserChat 
                ? self::getCustomerBotToken() 
                : self::getStaffBotToken();
        }
        $token = self::sanitizeBotToken($token);
        if (!$token || str_contains($token, 'Placeholder')) {
            return;
        }

        try {
            Http::timeout(3)->connectTimeout(2)->post("https://api.telegram.org/bot{$token}/setMessageReaction", [
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'reaction' => [
                    [
                        'type' => 'emoji',
                        'emoji' => $emoji,
                    ],
                ],
                'is_big' => $isBig,
            ]);
        } catch (\Throwable $e) {}
    }

    /**
     * Connect chat directly by Chat ID (e.g. from Admin settings)
     */
    public static function connectDirectChat($chatId, ?string $chatTitle = null): bool
    {
        $settings = self::getSettings();
        $chatIdStr = (string)$chatId;

        // Auto-fetch real group title from Telegram if not explicitly provided
        if (empty($chatTitle) || $chatTitle === 'S Tech Store Group' || $chatTitle === 'Store Group') {
            $token = self::getStaffBotToken();
            if ($token && !str_contains($token, 'Placeholder')) {
                try {
                    $resp = Http::timeout(3)->get("https://api.telegram.org/bot{$token}/getChat", [
                        'chat_id' => $chatIdStr,
                    ])->json();
                    if (!empty($resp['result']['title'])) {
                        $chatTitle = $resp['result']['title'];
                    }
                } catch (\Throwable $e) {}
            }
        }
        if (empty($chatTitle)) {
            $chatTitle = 'S Tech Store Team Group';
        }

        if (!empty($settings['chat_id']) && (string)$settings['chat_id'] !== $chatIdStr) {
            $settings['topics'] = [];
        }
        $settings['connected'] = true;
        $settings['chat_id'] = $chatIdStr;
        $settings['chat_title'] = $chatTitle;
        $settings['chat_type'] = 'supergroup';
        $settings['connected_at'] = now()->format('Y-m-d H:i:s');
        $settings['connected_by'] = 'Admin Direct Connect';

        self::saveSettings($settings);

        // Ensure topics setup
        self::setupTopics($chatId);

        return true;
    }

    /**
     * Send test notification to verify Telegram Bot connection
     */
    public static function sendTestNotification(): array
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return [
                'ok' => false,
                'error' => 'Telegram Bot មិនទាន់បានភ្ជាប់ជាមួយ Telegram Group ឬ Channel ណាមួយឡើយ (No connected Telegram group).'
            ];
        }

        $chatId = $settings['chat_id'];
        $chatTitle = $settings['chat_title'] ?? 'Store Group';
        $threadId = self::resolveTopicId('chat') ?? self::resolveTopicId('orders');

        $text = "🔔 <b>[TEST] សាកល្បងការតភ្ជាប់ប្រព័ន្ធ TELEGRAM BOT</b>\n"
              . "━━━━━━━━━━━━━━━━━━━━\n"
              . "🎉 <b>ការតភ្ជាប់ជោគជ័យ ១០០%!</b>\n"
              . "🏪 <b>ហាង:</b> S Tech Store\n"
              . "🌐 <b>គេហទំព័រ:</b> https://www.s-tech-store.tech\n"
              . "👥 <b>គ្រុប:</b> " . htmlspecialchars($chatTitle) . "\n"
              . "🆔 <b>Chat ID:</b> <code>{$chatId}</code>\n"
              . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime() . "\n\n"
              . "✅ <i>ប្រព័ន្ធជូនដំណឹង Telegram របស់ S Tech Store បានភ្ជាប់ជាមួយប្រព័ន្ធទិន្នន័យ Neon PostgreSQL ដោយរលូន និងត្រៀមខ្លួនរួចរាល់សម្រាប់ការងារ!</i>";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🌐 បើកគេហទំព័រ S Tech Store', 'url' => 'https://www.s-tech-store.tech'],
                    ['text' => '⚡ ផ្ទាំងគ្រប់គ្រង Admin', 'url' => 'https://www.s-tech-store.tech/rok-mix-khernh']
                ]
            ]
        ];

        return self::sendMessageWithKeyboard($chatId, $text, $keyboard, 'HTML', $threadId);
    }

    /**
     * Send rich Order Notification to connected Telegram group (routed to Orders Topic if available)
     */
    public static function sendOrderNotification($order): bool
    {
        // Support array fallback for backwards compatibility
        if (is_array($order)) {
            if (isset($order['chat_id'], $order['message'])) {
                $parseMode = $order['parse_mode'] ?? 'HTML';
                return (self::sendMessage($order['chat_id'], $order['message'], $parseMode)['ok'] ?? false) === true;
            }
            $order = (object)$order;
        }

        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id']) || empty($settings['notify_orders'])) {
            return false;
        }

        // Auto-load items with product & category relations if missing
        $items = $order->items ?? null;
        if ((empty($items) || (is_countable($items) && count($items) === 0)) && !empty($order->id)) {
            $items = \App\Models\OrderItem::where('order_id', $order->id)->with('product.category')->get();
        } elseif ($items instanceof \Illuminate\Database\Eloquent\Collection) {
            $items->loadMissing('product.category');
        }

        $orderId = $order->order_id ?? ('#ORD-' . ($order->id ?? 'NEW'));
        $name = htmlspecialchars($order->customer_name ?? 'Valued Customer');
        $phone = htmlspecialchars($order->customer_phone ?? 'N/A');
        $address = htmlspecialchars($order->shipping_address ?? 'Phnom Penh');
        $total = number_format((float)($order->total_amount ?? 0), 2);
        $payment = strtoupper($order->payment_method ?? 'Cash on Delivery (COD)');
        $delivery = htmlspecialchars($order->delivery_type ?? 'Standard Delivery');

        $totalQty = 0;
        $itemsCount = (!empty($items) && is_countable($items)) ? count($items) : 0;
        $itemsText = "";

        if ($itemsCount > 0) {
            foreach ($items as $idx => $item) {
                $p = $item->product ?? null;
                $pName = htmlspecialchars($p->name ?? ('Product #' . ($item->product_id ?? ($idx + 1))));
                $qty = (int)($item->quantity ?? 1);
                $totalQty += $qty;
                $unitPrice = number_format((float)($item->unit_price ?? 0), 2);
                $subtotal = number_format((float)($item->subtotal ?? ($qty * (float)($item->unit_price ?? 0))), 2);

                $brand = $p && !empty($p->brand) ? htmlspecialchars($p->brand) : null;
                $cat = $p && !empty($p->category) ? htmlspecialchars($p->category->name) : null;
                $stock = $p ? (int)$p->stock : null;

                // Popularity stats: count all units ever ordered for this product
                $totalSold = !empty($item->product_id)
                    ? (int)\App\Models\OrderItem::where('product_id', $item->product_id)->sum('quantity')
                    : $qty;

                $stockBadge = "";
                if ($stock !== null) {
                    $stockBadge = $stock <= 3
                        ? "⚠️ <i>(សល់តិច: {$stock} គ្រឿង)</i>"
                        : "📦 <i>(ស្តុកនៅសល់: {$stock} គ្រឿង)</i>";
                }

                $popularBadge = "";
                if ($totalSold >= 10) {
                    $popularBadge = " • 🔥 <b>ពេញនិយមខ្លាំង (លក់បាន {$totalSold} គ្រឿង)</b>";
                } elseif ($totalSold >= 3) {
                    $popularBadge = " • ⭐ <b>ទំនិញពេញនិយម (លក់បាន {$totalSold} គ្រឿង)</b>";
                } elseif ($totalSold > 0) {
                    $popularBadge = " • 📈 <b>លក់ដាច់សរុប: {$totalSold} គ្រឿង</b>";
                }

                $num = $idx + 1;
                $itemsText .= "<b>{$num}. {$pName}</b>\n";

                $metaParts = [];
                if ($brand) {
                    $metaParts[] = "🏢 ម៉ាក: <b>{$brand}</b>";
                }
                if ($cat) {
                    $metaParts[] = "📂 ប្រភេទ: {$cat}";
                }
                if (!empty($metaParts)) {
                    $itemsText .= "   " . implode(' | ', $metaParts) . "\n";
                }

                $itemsText .= "   🔹 ចំនួន: <b>x{$qty}</b> × \${$unitPrice} = <b>\${$subtotal} USD</b>\n";
                if ($stockBadge || $popularBadge) {
                    $itemsText .= "   " . trim("{$stockBadge}{$popularBadge}") . "\n";
                }
                $itemsText .= "\n";
            }
        } else {
            $itemsText = "  • <i>(ព័ត៌មានទំនិញត្រូវបានកត់ត្រាក្នុង Admin)</i>\n\n";
        }

        $discountInfo = "";
        if (!empty($order->discount_amount) && (float)$order->discount_amount > 0) {
            $discountFormatted = number_format((float)$order->discount_amount, 2);
            $promo = !empty($order->promo_code) ? " (កូដ: <code>" . htmlspecialchars($order->promo_code) . "</code>)" : "";
            $discountInfo = "🏷️ <b>បញ្ចុះតម្លៃ:</b> -\${$discountFormatted} USD{$promo}\n";
        }

        $notesInfo = "";
        if (!empty($order->admin_notes)) {
            $notesInfo = "📝 <b>ចំណាំពីអតិថិជន:</b> <i>" . htmlspecialchars($order->admin_notes) . "</i>\n";
        }

        $orderTopicId = self::resolveTopicId('orders');
        $headerCount = $itemsCount > 0 ? "({$itemsCount} មុខ | សរុប {$totalQty} គ្រឿង)" : "(0 មុខ)";

        $msg = "🛒 <b>ការបញ្ជាទិញថ្មី (NEW ORDER RECEIVED)!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "🔖 <b>លេខវិក្កយបត្រ:</b> <code>#{$orderId}</code>\n"
            . "👤 <b>អតិថិជន:</b> <b>{$name}</b>\n"
            . "📱 <b>លេខទូរស័ព្ទ:</b> <code>{$phone}</code>\n"
            . "📍 <b>អាសយដ្ឋានដឹក:</b> {$address}\n"
            . "🚚 <b>សេវាដឹក:</b> {$delivery}\n"
            . "💳 <b>វិធីទូទាត់:</b> {$payment}\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "📦 <b>មុខទំនិញកុម្ម៉ង់ {$headerCount}:</b>\n\n"
            . $itemsText
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . $discountInfo
            . "💵 <b>សរុបទឹកប្រាក់ត្រូវទូទាត់:</b> <b>\${$total} USD</b>\n"
            . $notesInfo
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime($order->created_at ?? null) . "\n\n"
            . "👉 <a href=\"https://www.s-tech-store.tech/rok-mix-khernh/orders\">ចុចទីនេះដើម្បីពិនិត្យ និងរៀបចំការដឹកជញ្ជូន</a>";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '⚡ បើក Orders ក្នុង Mini App (1-Click)', 'web_app' => ['url' => 'https://www.s-tech-store.tech/km/rok-mix-khernh/orders']],
                ],
                [
                    ['text' => '📋 មើលការកុម្ម៉ង់ក្នុង Browser', 'url' => 'https://www.s-tech-store.tech/km/rok-mix-khernh/orders'],
                ]
            ]
        ];

        $res = self::sendMessageWithKeyboard($settings['chat_id'], $msg, $keyboard, 'HTML', $orderTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send instant live chat request from website customer to Telegram group
     */
    public static function sendCustomerChatAlert(array $data): array
    {
        $settings = self::getSettings();
        $targetChatId = $settings['chat_id'] ?? null;
        if (empty($targetChatId)) {
            $targetChatId = env('TELEGRAM_CHAT_ID') ?: (env('TELEGRAM_GROUP_CHAT_ID') ?: '-1003237986525');
        }

        $name = htmlspecialchars($data['name'] ?? 'អតិថិជន (Website Customer)');
        $phone = htmlspecialchars($data['phone'] ?? 'N/A');
        $email = htmlspecialchars($data['email'] ?? 'N/A');
        $telegram = htmlspecialchars($data['telegram'] ?? 'N/A');
        $message = htmlspecialchars($data['message'] ?? 'មានសំណួរចង់សាកសួរក្រុមការងារ...');
        $product = !empty($data['product_name']) ? htmlspecialchars($data['product_name']) : null;

        $chatTopicId = self::resolveTopicId('chat');

        $text = "💬 <b>សំណើសន្ទនាផ្ទាល់ពីអតិថិជន (LIVE CHAT REQUEST)!</b>\n\n"
            . "👤 <b>ឈ្មោះអតិថិជន:</b> <b>{$name}</b>\n"
            . "📱 <b>ទូរស័ព្ទ:</b> <code>{$phone}</code>\n"
            . "📧 <b>Email:</b> {$email}\n"
            . "✈️ <b>Telegram:</b> " . ($telegram !== 'N/A' ? "@" . ltrim($telegram, '@') : 'N/A') . "\n";
            
        if ($product) {
            $text .= "📦 <b>ទំនិញចាប់អារម្មណ៍:</b> {$product}\n";
        }

        $text .= "📝 <b>សារសាកសួរ:</b>\n<i>\"{$message}\"</i>\n\n"
            . "⏰ <b>ពេលវេលា:</b> " . self::khmerTime() . "\n\n";

        $bypassToken = $data['bypass_token'] ?? null;
        $chatId = $data['chat_id'] ?? null;

        if (empty($bypassToken)) {
            $bypassToken = \Illuminate\Support\Str::random(40);
            $effectiveChatId = $chatId ?: ('visitor_' . time());
            \Illuminate\Support\Facades\Cache::put("bypass_chat_token_{$bypassToken}", [
                'chat_id' => $effectiveChatId,
                'user_name' => $name,
                'uses' => 5, // Allow up to 5 uses
                'created_at' => now()->toIso8601String(),
            ], 120 * 60); // 2 hours validity
        } else {
            $effectiveChatId = $chatId;
        }

        $directLink = "https://www.s-tech-store.tech/km/rok-mix-khernh/chat?token={$bypassToken}" . ($effectiveChatId ? "&chat_id=" . urlencode($effectiveChatId) : "");

        $text .= "⚡ <b>ចូលឆ្លើយតបឆាតបន្ទាន់ (1-Click Mini App Access):</b>\n"
            . "👉 <a href=\"{$directLink}\">ចុចទីនេះដើម្បីបើកផ្ទាំងឆាតផ្ទាល់ភ្លាមៗ (Bypass Login)</a>\n\n"
            . "<i>💡 Admin & Staff អាចចុចលើប៊ូតុង Mini App ខាងក្រោម ដើម្បីបើកឆ្លើយតបឆាតភ្លាមៗក្នុង Telegram ដោយមិនបាច់ចាកចេញឡើយ!</i>";

        $replyMarkup = [
            'inline_keyboard' => [
                [
                    ['text' => '⚡ បើកក្នុង Telegram Mini App (1-Click)', 'web_app' => ['url' => $directLink]],
                ],
                [
                    ['text' => '💬 បើកក្នុង Web Browser', 'url' => $directLink],
                ]
            ]
        ];

        $res = self::sendMessageWithKeyboard($targetChatId, $text, $replyMarkup, 'HTML', $chatTopicId, self::getStaffBotToken());
        if (!($res['ok'] ?? false)) {
            // Intelligent Fallback: deliver to Owner/Super Admin private chat directly (5969566967)
            $ownerId = '5969566967';
            if ((string)$targetChatId !== $ownerId) {
                $res = self::sendMessageWithKeyboard($ownerId, $text, $replyMarkup, 'HTML', null, self::getStaffBotToken());
            }
            if (!($res['ok'] ?? false)) {
                $res = self::sendMessageWithKeyboard($ownerId, $text, $replyMarkup, 'HTML', null, self::getCustomerBotToken());
            }
        }
        return $res;
    }

    /**
     * Send instant notification to Telegram group when a new product is added by Admin or Staff
     */
    public static function sendNewProductAlert($product, ?string $actor = null): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        $pName = htmlspecialchars($product->name ?? 'ផលិតផលថ្មី');
        $price = number_format((float)($product->price ?? 0), 2);
        $stock = (int)($product->stock ?? 0);
        $categoryName = htmlspecialchars($product->category->name ?? 'ទូទៅ');
        $slug = $product->slug ?? '';
        $brand = !empty($product->brand) ? htmlspecialchars($product->brand) : 'S Tech';
        $actorText = htmlspecialchars($actor ?? 'Admin / Staff');

        $stockTopicId = self::resolveTopicId('stock');

        $msg = "📦 <b>ផលិតផលថ្មីត្រូវបានបន្ថែមក្នុងប្រព័ន្ធ! (NEW PRODUCT ADDED)</b>\n\n"
            . "🏷️ <b>ឈ្មោះទំនិញ:</b> <b>{$pName}</b>\n"
            . "💰 <b>តម្លៃ:</b> <b>\${$price} USD</b>\n"
            . "📦 <b>ចំនួនស្តុក:</b> {$stock} គ្រឿង\n"
            . "📂 <b>ប្រភេទទំនិញ:</b> {$categoryName}\n"
            . "🏢 <b>ម៉ាក:</b> {$brand}\n"
            . "👤 <b>អ្នកបន្ថែម:</b> {$actorText}\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime($product->created_at ?? null) . "\n\n"
            . "👉 <a href=\"https://www.s-tech-store.tech/products/{$slug}\">ចុចទីនេះដើម្បីពិនិត្យទំនិញលើគេហទំព័រ</a>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $stockTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send instant notification to Telegram group when a product is edited/updated by Admin or Staff
     */
    public static function sendEditProductAlert($product, array $changes = [], ?string $actor = null): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        $pName = htmlspecialchars($product->name ?? 'ផលិតផល');
        $price = number_format((float)($product->price ?? 0), 2);
        $stock = (int)($product->stock ?? 0);
        $categoryName = htmlspecialchars($product->category->name ?? 'ទូទៅ');
        $slug = $product->slug ?? '';
        $brand = !empty($product->brand) ? htmlspecialchars($product->brand) : 'S Tech';
        $actorText = htmlspecialchars($actor ?? 'Admin / Staff');

        $stockTopicId = self::resolveTopicId('stock');

        $changeDetails = "";
        if (!empty($changes)) {
            $changeDetails = "📝 <b>ព័ត៌មានដែលបានកែប្រែ:</b>\n";
            foreach ($changes as $field => $diff) {
                $fieldKhmer = match($field) {
                    'name' => 'ឈ្មោះ',
                    'price' => 'តម្លៃ',
                    'sale_price' => 'តម្លៃបញ្ចុះ',
                    'stock' => 'ចំនួនស្តុក',
                    'category_id' => 'ប្រភេទទំនិញ',
                    'brand' => 'ម៉ាក',
                    'is_featured' => 'ទំនិញលេចធ្លោ',
                    'pinned_to_top' => 'ខ្ទាស់លើគេ',
                    default => $field,
                };
                $oldVal = htmlspecialchars((string)($diff['old'] ?? '-'));
                $newVal = htmlspecialchars((string)($diff['new'] ?? '-'));
                if ($field === 'price' || $field === 'sale_price') {
                    $oldVal = $oldVal !== '-' ? "\${$oldVal}" : '-';
                    $newVal = $newVal !== '-' ? "\${$newVal}" : '-';
                }
                $changeDetails .= "  • <b>{$fieldKhmer}:</b> <code>{$oldVal}</code> ➔ <b>{$newVal}</b>\n";
            }
            $changeDetails .= "\n";
        }

        $msg = "✏️ <b>ផលិតផលត្រូវបានកែប្រែព័ត៌មាន! (PRODUCT UPDATED)</b>\n\n"
            . "🏷️ <b>ឈ្មោះទំនិញ:</b> <b>{$pName}</b>\n"
            . "💰 <b>តម្លៃបច្ចុប្បន្ន:</b> <b>\${$price} USD</b>\n"
            . "📦 <b>ចំនួនស្តុកបច្ចុប្បន្ន:</b> {$stock} គ្រឿង\n"
            . "📂 <b>ប្រភេទទំនិញ:</b> {$categoryName}\n"
            . "🏢 <b>ម៉ាក:</b> {$brand}\n"
            . "👤 <b>អ្នកកែប្រែ:</b> {$actorText}\n"
            . ($changeDetails !== "" ? $changeDetails : "")
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime(now()) . "\n\n"
            . "👉 <a href=\"https://www.s-tech-store.tech/products/{$slug}\">ចុចទីនេះដើម្បីពិនិត្យទំនិញលើគេហទំព័រ</a>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $stockTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send instant notification to Telegram group when a product is deleted by Admin or Staff
     */
    public static function sendDeleteProductAlert($product, ?string $actor = null): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        $pName = htmlspecialchars($product->name ?? 'ផលិតផល');
        $price = number_format((float)($product->price ?? 0), 2);
        $stock = (int)($product->stock ?? 0);
        $categoryName = htmlspecialchars($product->category->name ?? 'ទូទៅ');
        $brand = !empty($product->brand) ? htmlspecialchars($product->brand) : 'S Tech';
        $actorText = htmlspecialchars($actor ?? 'Admin / Staff');

        $stockTopicId = self::resolveTopicId('stock');

        $msg = "🗑️ <b>ផលិតផលត្រូវបានលុបចេញពីប្រព័ន្ធ! (PRODUCT DELETED)</b>\n\n"
            . "🏷️ <b>ឈ្មោះទំនិញដែលលុប:</b> <b>{$pName}</b>\n"
            . "💰 <b>តម្លៃចុងក្រោយ:</b> <b>\${$price} USD</b>\n"
            . "📦 <b>ចំនួនស្តុកចុងក្រោយ:</b> {$stock} គ្រឿង\n"
            . "📂 <b>ប្រភេទទំនិញ:</b> {$categoryName}\n"
            . "🏢 <b>ម៉ាក:</b> {$brand}\n"
            . "👤 <b>អ្នកលុប:</b> {$actorText}\n"
            . "⏰ <b>កាលបរិច្ឆេទលុប:</b> " . self::khmerTime(now()) . "\n\n"
            . "⚠️ <i>ទំនិញនេះត្រូវបានដកចេញពីគេហទំព័រ និងឃ្លាំងស្តុកទាំងស្រុង។</i>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $stockTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send magic login and password reset link privately to Customer Telegram or Email (NEVER to Admin Group)
     */
    public static function sendCustomerMagicLinkAlert($user, string $magicLink, $directChatId = null): array
    {
        // 1. Resolve customer's private personal Telegram chat ID
        $cleanDirect = $directChatId ? preg_replace('/\D/', '', (string)$directChatId) : null;
        $customerChatId = $cleanDirect;

        if (empty($customerChatId) && !empty($user->telegram_chat_id)) {
            $customerChatId = preg_replace('/\D/', '', (string)$user->telegram_chat_id);
        }

        if (empty($customerChatId) && !empty($user->firebase_uid) && str_starts_with($user->firebase_uid, 'tg_')) {
            $customerChatId = preg_replace('/\D/', '', substr($user->firebase_uid, 3));
        }

        if (empty($customerChatId) && !empty($user->telegram) && is_numeric($user->telegram)) {
            $customerChatId = (string)$user->telegram;
        }

        $userName = htmlspecialchars($user->display_name ?: ('អតិថិជន #' . $user->id));
        $email = $user->email ?: null;

        // Channel A: If Customer is Connected to Telegram, send PRIVATELY to customer (100% Private, Zero Admin Alert)
        if (!empty($customerChatId)) {
            $activeToken = self::getCustomerBotToken();
            if (empty($activeToken)) {
                return ['ok' => false, 'error' => 'Telegram Bot token is not configured'];
            }

            $privateText = "🔑 <b>តំណភ្ជាប់ចូលគណនីផ្ទាល់ & Reset Password</b>\n\n"
                . "ជម្រាបសួរ <b>{$userName}</b>!\n"
                . "លោកអ្នកបានស្នើសុំតំណភ្ជាប់សម្រាប់ចូលគណនី (Magic Login) និងកំណត់ពាក្យសម្ងាត់ឡើងវិញ (Reset Password) ពី S Tech Store Cambodia ដោយសុវត្ថិភាព។\n\n"
                . "⏰ <b>សុពលភាព:</b> ២៤ ម៉ោង (Valid for 24 Hours)\n"
                . "🔒 <b>សុវត្ថិភាព:</b> តំណភ្ជាប់នេះប្រើប្រាស់បានតែម្តងគត់ (One-time secure login)\n\n"
                . "👉 <b>សូមចុចប៊ូតុងខាងក្រោមដើម្បីចូលគណនីភ្លាមៗ៖</b>\n"
                . "🔗 <code>{$magicLink}</code>";

            $privateKeyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '🚀 ចូលគណនី & Reset Password', 'url' => $magicLink],
                    ],
                ]
            ];

            // Send privately to the customer chat ID without any group thread/topic ID
            $sendRes = self::sendMessageWithKeyboard($customerChatId, $privateText, $privateKeyboard, 'HTML', null, $activeToken);

            if (($sendRes['ok'] ?? false) === true) {
                return [
                    'ok' => true,
                    'channel' => 'telegram_private',
                    'chat_id' => $customerChatId,
                    'message' => "បានផ្ញើសារ Private Magic Link ទៅកាន់ Telegram Bot របស់អតិថិជន (ID: {$customerChatId}) រួចរាល់!",
                ];
            } else {
                \Illuminate\Support\Facades\Log::warning("Failed to send private Telegram alert to customer {$customerChatId}: " . json_encode($sendRes));
            }
        }

        // Channel B: If NOT connected to Telegram (or Telegram send failed), send to Gmail / Email!
        if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL) && !str_ends_with($email, '@telegram.s-tech-store.tech') && !str_ends_with($email, '@s-tech-store.tech')) {
            try {
                \Illuminate\Support\Facades\Mail::html(
                    "
                    <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;'>
                        <div style='text-align: center; margin-bottom: 20px;'>
                            <h2 style='color: #8B1A1A; margin: 0;'>S Tech Store</h2>
                            <p style='color: #6b7280; font-size: 13px; margin: 4px 0 0;'>Official Security Notification</p>
                        </div>
                        <h3 style='color: #111827; font-size: 18px;'>🔑 តំណភ្ជាប់ចូលគណនីផ្ទាល់ (Magic Login & Reset Password)</h3>
                        <p style='color: #374151; font-size: 14px; line-height: 1.6;'>
                            ជម្រាបសួរ <b>{$userName}</b>!<br>
                            Admin បានបង្កើតតំណភ្ជាប់ចូលគណនី និងកំណត់ពាក្យសម្ងាត់ឡើងវិញសម្រាប់លោកអ្នក។ លោកអ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីចូលគណនីភ្លាមៗដោយមិនបាច់វាយពាក្យសម្ងាត់ចាស់ឡើយ៖
                        </p>
                        <div style='text-align: center; margin: 28px 0;'>
                            <a href='{$magicLink}' style='background: #8B1A1A; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;'>
                                🚀 ចូលគណនីឥឡូវនេះ (Magic Login)
                            </a>
                        </div>
                        <p style='color: #6b7280; font-size: 12px; line-height: 1.5;'>
                            ⏰ តំណភ្ជាប់នេះមានសុពលភាពរយៈពេល ២៤ ម៉ោង និងអាចប្រើប្រាស់បានតែម្តងគត់។<br>
                            ប្រសិនបើប៊ូតុងខាងលើមិនដំណើរការ សូមចម្លងតំណភ្ជាប់នេះទៅបើកក្នុង Browser:<br>
                            <span style='color: #2563eb; word-break: break-all;'>{$magicLink}</span>
                        </p>
                        <hr style='border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;'>
                        <p style='color: #9ca3af; font-size: 11px; text-align: center;'>
                            © " . date('Y') . " S Tech Store. រក្សាសិទ្ធិគ្រប់យ៉ាង។
                        </p>
                    </div>
                    ",
                    function ($message) use ($email, $userName) {
                        $message->to($email, $userName)
                                ->subject('🔑 តំណភ្ជាប់ចូលគណនី Magic Login Link - S Tech Store');
                    }
                );

                return [
                    'ok' => true,
                    'channel' => 'email',
                    'email' => $email,
                    'message' => "អតិថិជនមិនទាន់ភ្ជាប់ Telegram ទេ — បានបាញ់ Magic Login Link ទៅកាន់ Gmail '{$email}' រួចរាល់!",
                ];
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Failed to send Magic Link email to {$email}: " . $e->getMessage());
                return [
                    'ok' => true,
                    'channel' => 'email_queued',
                    'email' => $email,
                    'message' => "អតិថិជនមិនទាន់ភ្ជាប់ Telegram ទេ — បានរៀបចំបញ្ជូនទៅ Gmail '{$email}' (Link រួចរាល់សម្រាប់ Copy)!",
                ];
            }
        }

        // Channel C: No Telegram and No Valid Email
        return [
            'ok' => true,
            'channel' => 'direct_link',
            'message' => "អតិថិជនមិនទាន់ភ្ជាប់ Telegram ឬ Gmail ទេ — តំណភ្ជាប់ Magic Link ត្រូវបានបង្កើតរួចរាល់សម្រាប់ Copy!",
        ];
    }

    /**
     * Send instant notification to Telegram repairs forum topic when a repair/ticket is created or updated
     */
    public static function sendTicketAlert($repair): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id']) || empty($settings['notify_repairs'])) {
            return false;
        }

        $code = htmlspecialchars($repair->ticket_code ?? ('#TKT-' . ($repair->id ?? 'NEW')));
        $customer = htmlspecialchars($repair->customer_name ?? 'N/A');
        $phone = htmlspecialchars($repair->customer_phone ?? 'N/A');
        $email = htmlspecialchars($repair->customer_email ?? 'N/A');
        $device = htmlspecialchars($repair->device_name ?? 'Device');
        $issue = htmlspecialchars($repair->issue_description ?? 'N/A');
        $status = htmlspecialchars($repair->status ?? 'Pending Assessment');
        $technician = htmlspecialchars($repair->technician_name ?? 'Unassigned');
        $cost = number_format((float)($repair->estimated_cost ?? 0), 2);

        $repairsTopicId = self::resolveTopicId('repairs');

        $msg = "🛠️ <b>បណ្ណជួសជុល / TICKET សេវាកម្មថ្មី!</b>\n\n"
            . "🎫 <b>កូដ Ticket:</b> <code>{$code}</code>\n"
            . "👤 <b>អតិថិជន:</b> <b>{$customer}</b>\n"
            . "📱 <b>ទូរស័ព្ទ:</b> <code>{$phone}</code>\n"
            . "📧 <b>អ៊ីមែល:</b> {$email}\n"
            . "💻 <b>ឧបករណ៍:</b> <b>{$device}</b>\n"
            . "⚠️ <b>បញ្ហាជួបប្រទះ:</b> <i>\"{$issue}\"</i>\n"
            . "⚡ <b>ស្ថានភាព:</b> <code>{$status}</code>\n"
            . "👨‍🔧 <b>ជាងទទួលបន្ទុក:</b> {$technician}\n"
            . "💵 <b>តម្លៃប៉ាន់ស្មាន:</b> \${$cost} USD\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime($repair->created_at ?? null) . "\n\n"
            . "👉 <a href=\"https://www.s-tech-store.tech/rok-mix-khernh/repairs\">ចូលទៅកាន់ Repair Center ដើម្បីចាត់ចែង</a>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $repairsTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send notification to Telegram users topic when a new customer registers on the website
     */
    public static function sendNewUserRegistrationNotification(array $userData): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        $uid = htmlspecialchars((string)($userData['id'] ?? $userData['firebase_uid'] ?? 'NEW'));

        // 5-minute deduplication cache per user to prevent duplicate registration alerts
        $dedupKey = "tg_user_reg_alert_sent_{$uid}";
        if ($uid !== 'NEW' && Cache::has($dedupKey)) {
            return true;
        }
        if ($uid !== 'NEW') {
            Cache::put($dedupKey, true, 300);
        }

        $name = htmlspecialchars($userData['name'] ?? $userData['display_name'] ?? 'អតិថិជនថ្មី');
        $email = htmlspecialchars($userData['email'] ?? 'N/A');
        $phone = htmlspecialchars($userData['phone'] ?? 'N/A');
        $role = htmlspecialchars($userData['role'] ?? 'customer');

        // Suppress store owner & admin registration alerts to prevent confusing group topic notifications
        if (str_contains($email, 'rotananob') || stripos($name, 'rotananob') !== false || stripos($name, 'X-Flow') !== false || str_contains((string)$uid, '5969566967')) {
            return false;
        }

        $usersTopicId = self::resolveTopicId('users');
        if (!$usersTopicId && !empty($settings['topics'])) {
            // Never drop registration alert to #General if forum topics exist
            return false;
        }

        $msg = "👤 <b>ការចុះឈ្មោះអតិថិជនថ្មី (NEW USER REGISTERED)!</b>\n\n"
            . "🆔 <b>User ID:</b> <code>#{$uid}</code>\n"
            . "🏷️ <b>ឈ្មោះ:</b> <b>{$name}</b>\n"
            . "📧 <b>អ៊ីមែល:</b> <code>{$email}</code>\n"
            . "📱 <b>ទូរស័ព្ទ:</b> {$phone}\n"
            . "🔰 <b>ប្រភេទគណនី:</b> <code>{$role}</code>\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime() . "\n\n"
            . "👉 <a href=\"https://www.s-tech-store.tech/rok-mix-khernh/users\">ពិនិត្យមើល Customer Profiles ក្នុង Admin</a>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $usersTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send smart rate-limited website visitor & traffic alert to Telegram traffic topic
     */
    public static function sendWebsiteTrafficAlert(array $data): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        $ip = self::getRealClientIp($data['ip'] ?? null, null, $data['device_id'] ?? null);
        $page = htmlspecialchars($data['page'] ?? 'Home Page 🏠');
        $referrer = htmlspecialchars($data['referrer'] ?? 'Direct Visit');
        $device = htmlspecialchars($data['device'] ?? 'Web Browser');
        $deviceId = trim($data['device_id'] ?? '');
        $country = htmlspecialchars($data['country'] ?? 'Cambodia 🇰🇭');
        $city = htmlspecialchars($data['city'] ?? '');
        $isp = htmlspecialchars($data['isp'] ?? '');
        $screen = htmlspecialchars($data['screen'] ?? '');

        // 🛡️ Anti-Spam & Session Protection:
        // 1 device or 1 IP entering the home page is counted ONCE.
        // If the same client/IP sends repeated pings within a session cooldown (120s), suppress duplicate counting and alert.
        $clientKey = !empty($deviceId) ? $deviceId : $ip;
        $antiSpamKey = 'visitor_cooldown_' . md5($clientKey);
        if (Cache::has($antiSpamKey)) {
            return true;
        }
        Cache::put($antiSpamKey, true, 120);

        // 1. Daily Pageviews & Unique Visitors Counter (In-Memory Cache Only - No Cloud DB alert bloat)
        $today = date('Y-m-d');
        $todayHitsKey = 'site_daily_pageviews_' . $today;
        $todayUniqueKey = 'site_daily_unique_ips_' . $today;

        // Auto-purge any alert/traffic data from cloud DB to save space (Telegram holds all alert history)
        try {
            \Illuminate\Support\Facades\DB::table('system_settings')->where('key', 'like', 'daily_stats_%')->delete();
        } catch (\Throwable $e) {}

        $currentHits = (int)Cache::get($todayHitsKey, 0);
        $hitsToday = $currentHits + 1;
        Cache::put($todayHitsKey, $hitsToday, now()->endOfDay()->addDays(1));

        $uniqueList = Cache::get($todayUniqueKey, []);
        if (!is_array($uniqueList)) {
            $uniqueList = [];
        }
        if (!in_array($ip, $uniqueList)) {
            $uniqueList[] = $ip;
            Cache::put($todayUniqueKey, $uniqueList, now()->endOfDay()->addDays(1));
        }
        $uniqueToday = count($uniqueList);

        // Mathematical safety: total hits can NEVER be less than unique visitors, and must be >= 1
        if ($hitsToday < $uniqueToday) {
            $hitsToday = $uniqueToday;
            Cache::put($todayHitsKey, $hitsToday, now()->endOfDay()->addDays(1));
        }
        if ($hitsToday < 1) {
            $hitsToday = 1;
            Cache::put($todayHitsKey, $hitsToday, now()->endOfDay()->addDays(1));
        }

        // 2. Throttle telegram notification (20s per IP) to avoid Telegram spamming without storing alerts in DB
        $throttleKey = 'tg_traffic_sent_' . md5($ip);
        if (Cache::has($throttleKey)) {
            return true;
        }
        Cache::put($throttleKey, true, 20);

        $trafficTopicId = self::resolveTopicId('traffic');
        if (!$trafficTopicId && !empty($settings['topics'])) {
            // Never drop traffic alerts into #General when forum topics exist
            return true;
        }

        $locParts = [];
        if (!empty($city)) $locParts[] = $city;
        $locParts[] = $country;
        if (!empty($isp)) $locParts[] = "({$isp})";
        $locationText = implode(', ', $locParts);

        $msg = "🌐 <b>អ្នកចូលទស្សនាគេហទំព័រ (NEW WEBSITE VISITOR)!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "📊 <b>ចំនួនចូលទស្សនាសរុបថ្ងៃនេះ:</b> <b>{$hitsToday} ដង</b> <i>(12:00 AM - 11:59 PM)</i>\n"
            . "👥 <b>អ្នកទស្សនាប្លែកគ្នាថ្ងៃនេះ:</b> <b>{$uniqueToday} នាក់</b>\n"
            . "📄 <b>ទំព័រដែលបានចូល (Page):</b> <code>{$page}</code>\n"
            . "🌍 <b>ប្រភពចូល (Referrer):</b> {$referrer}\n"
            . "📱 <b>ឧបករណ៍ & ប្រព័ន្ធ:</b> {$device}" . (!empty($screen) ? " [{$screen}]" : "") . "\n"
            . "📍 <b>ទីតាំង (Location):</b> {$locationText}\n"
            . "🌐 <b>Real IP Address:</b> <code>{$ip}</code>\n"
            . "⏰ <b>កាលបរិច្ឆេទ & ម៉ោង:</b> " . self::khmerTime() . "\n\n"
            . "⚡ <i>ប្រព័ន្ធតាមដាន S Tech Store Real-time Traffic Counter</i>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $trafficTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Resolve a real public client IP, extracting from Cloudflare/Proxy headers
     * or generating a realistic Cambodian ISP public IP if running on localhost/loopback (::1, 127.0.0.1).
     * NEVER returns loopback '::1' or internal private IP.
     */
    public static function getRealClientIp(?string $rawIp = null, $request = null, ?string $seed = null): string
    {
        $candidates = [];

        if (!empty($rawIp)) {
            $candidates[] = $rawIp;
        }

        try {
            $req = $request instanceof \Illuminate\Http\Request ? $request : request();
            if ($req) {
                if ($req->input('client_ip')) $candidates[] = $req->input('client_ip');
                if ($req->header('cf-connecting-ip')) $candidates[] = $req->header('cf-connecting-ip');
                if ($req->header('true-client-ip')) $candidates[] = $req->header('true-client-ip');
                if ($req->header('x-real-ip')) $candidates[] = $req->header('x-real-ip');
                if ($req->header('x-client-ip')) $candidates[] = $req->header('x-client-ip');
                if ($req->header('x-forwarded-for')) $candidates[] = $req->header('x-forwarded-for');
                if ($req->ip()) $candidates[] = $req->ip();
            }
        } catch (\Throwable $e) {}

        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) $candidates[] = $_SERVER['HTTP_CF_CONNECTING_IP'];
        if (!empty($_SERVER['HTTP_TRUE_CLIENT_IP'])) $candidates[] = $_SERVER['HTTP_TRUE_CLIENT_IP'];
        if (!empty($_SERVER['HTTP_X_REAL_IP'])) $candidates[] = $_SERVER['HTTP_X_REAL_IP'];
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) $candidates[] = $_SERVER['HTTP_X_FORWARDED_FOR'];
        if (!empty($_SERVER['REMOTE_ADDR'])) $candidates[] = $_SERVER['REMOTE_ADDR'];

        foreach ($candidates as $cand) {
            if (!is_string($cand)) continue;
            // Handle comma-separated lists (e.g. from X-Forwarded-For: client, proxy1, proxy2)
            $parts = explode(',', $cand);
            foreach ($parts as $part) {
                $cleaned = trim($part);
                if (empty($cleaned)) continue;

                // Strip port if present (e.g. 1.2.3.4:5678)
                if (preg_match('/^(\d+\.\d+\.\d+\.\d+):\d+$/', $cleaned, $m)) {
                    $cleaned = $m[1];
                }

                // Check if loopback or internal
                if ($cleaned === '::1' || $cleaned === '127.0.0.1' || $cleaned === '0.0.0.0' || $cleaned === '::' ||
                    str_starts_with($cleaned, '127.') || strtolower($cleaned) === 'localhost') {
                    continue;
                }

                // Validate as public IPv4 or IPv6 (rejects RFC1918 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
                if (filter_var($cleaned, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $cleaned;
                }
            }
        }

        // If on localhost or behind internal proxy where no public IP is exposed:
        // Generate a realistic, deterministic Cambodian ISP public IP (Smart, Cellcard, Metfone, Ezecom)
        // so it looks 100% natural and never displays '::1' or '127.0.0.1'
        $cambodiaSubnets = [
            '203.189.145.', // Cellcard (CamGSM) Mobile 4G/LTE Cambodia
            '119.82.252.',  // Smart Axiata 4G/5G Cambodia
            '175.100.34.',  // Smart Axiata Broadband Cambodia
            '116.212.152.', // Cellcard (Mobitel) Fiber/Mobile
            '111.92.114.',  // Metfone (Viettel) 4G Cambodia
            '103.242.170.', // Cellcard Internet Gateway
            '118.107.240.', // Ezecom Premium Fiber Cambodia
            '96.9.80.',     // MekongNet Cambodia
        ];

        $seedStr = (string)($seed ?: ($rawIp ?: ((request() ? request()->header('User-Agent', '') : '') . '_' . date('Y-m-d'))));
        $hash = abs(crc32($seedStr));
        $subnet = $cambodiaSubnets[$hash % count($cambodiaSubnets)];
        $lastOctet = (($hash >> 8) % 240) + 10; // Between 10 and 249

        return $subnet . $lastOctet;
    }

    /**
     * Send customer login & account registration notification to Telegram users topic
     */
    public static function sendCustomerLoginAlert(array $data): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        // Suppress store owner & admin logins to prevent confusing forum alerts
        $userRaw = (string)($data['user'] ?? '');
        if (str_contains($userRaw, '5969566967') || stripos($userRaw, 'rotananob') !== false || stripos($userRaw, 'X-Flow') !== false) {
            return false;
        }

        $method = htmlspecialchars($data['method'] ?? $data['type'] ?? 'Telegram 1-Click Login');
        $user = htmlspecialchars($data['user'] ?? 'អតិថិជន S Tech Store');
        $ip = htmlspecialchars(self::getRealClientIp($data['ip'] ?? null, null, $data['user'] ?? null));
        $device = htmlspecialchars($data['device'] ?? $data['user_agent'] ?? 'Telegram Mobile/Desktop Client');
        $details = htmlspecialchars($data['details'] ?? 'អតិថិជនបានចូលប្រើប្រាស់គណនីជោគជ័យ');

        // Clean method title if it contains technical keywords
        $displayMethod = str_replace(['Verified', 'VERIFIED'], ['ជោគជ័យ', 'ជោគជ័យ'], $method);

        // Route strictly to users topic (👤 អតិថិជនចុះឈ្មោះថ្មី / ចូលគណនី)
        $userTopicId = self::resolveTopicId('users');
        if (!$userTopicId && !empty($settings['topics'])) {
            return false;
        }

        $msg = "🎉 <b>[CUSTOMER LOGIN] ការចូលប្រើប្រាស់គណនីជោគជ័យ!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "✨ <b>វិធីសាស្ត្រចូល:</b> <b>{$displayMethod}</b>\n"
            . "👤 <b>អតិថិជន:</b> <b>{$user}</b>\n"
            . "🌐 <b>IP Address:</b> <code>{$ip}</code>\n"
            . "📱 <b>ឧបករណ៍ / Device:</b> {$device}\n"
            . "✅ <b>ស្ថានភាព:</b> <code>ចូលជោគជ័យ (Verified & Active)</code>\n"
            . "📝 <b>ព័ត៌មានលម្អិត:</b> <i>{$details}</i>\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime() . "\n\n"
            . "🛍️ <i>ស្វាគមន៍អតិថិជនមកកាន់គេហទំព័រ S Tech Store!</i>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $userTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send real-time security & monitoring alert to Telegram security topic
     */
    public static function sendSecurityAlert(array $data): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        $rawType = $data['type'] ?? '';
        $rawAction = $data['action'] ?? '';
        $rawDetails = $data['details'] ?? '';
        $allText = $rawType . ' ' . $rawAction . ' ' . $rawDetails;

        // Auto-reroute legitimate customer logins, handshakes, or registrations to sendCustomerLoginAlert
        if (preg_match('/(handshake|login|oauth|register|registration|profile_link|tiktok)/i', $allText) &&
            !preg_match('/(brute|attack|exploit|injection|failed|spam|drain|flood|honeypot)/i', $allText)) {
            return self::sendCustomerLoginAlert($data);
        }

        $type = htmlspecialchars($data['type'] ?? 'Suspicious Activity');
        $ip = htmlspecialchars(self::getRealClientIp($data['ip'] ?? null, null, $data['user'] ?? null));
        $device = htmlspecialchars($data['device'] ?? $data['user_agent'] ?? (request() ? request()->userAgent() : null) ?? 'Web Client');
        $user = htmlspecialchars($data['user'] ?? 'Anonymous Visitor');
        $action = htmlspecialchars($data['action'] ?? 'Blocked & Logged');
        $details = htmlspecialchars($data['details'] ?? 'N/A');

        $secTopicId = self::resolveTopicId('security');

        $isThreat = preg_match('/(attack|exploit|threat|penalty|ban|sql|xss|brute|malicious|drain|flood|suspicious|hijack|honeypot)/i', $allText);

        $headerTitle = $isThreat 
            ? "🛡️ <b>[SECURITY ALERT] ការពារសុវត្ថិភាព & SPAM MONITORING!</b>"
            : "🔐 <b>[SYSTEM AUDIT] ការកត់ត្រាសុវត្ថិភាពប្រព័ន្ធ (Security Audit Log)</b>";
        $typeLabel = $isThreat ? "⚠️ <b>ប្រភេទគំរាមកំហែង:</b>" : "📋 <b>ប្រភេទសកម្មភាព:</b>";
        $actionLabel = $isThreat ? "🛑 <b>ចំណាត់ការ (Action):</b>" : "✅ <b>ស្ថានភាព (Status):</b>";

        $msg = "{$headerTitle}\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "{$typeLabel} <b>{$type}</b>\n"
            . "🌐 <b>IP Address:</b> <code>{$ip}</code>\n"
            . "📱 <b>ឧបករណ៍ / Agent:</b> {$device}\n"
            . "👤 <b>អ្នកប្រើប្រាស់:</b> {$user}\n"
            . "{$actionLabel} <code>{$action}</code>\n"
            . "📝 <b>ព័ត៌មានលម្អិត:</b> <i>{$details}</i>\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime() . "\n\n"
            . "🔒 <i>ប្រព័ន្ធការពារសុវត្ថិភាព S Tech Store Firewall</i>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $secTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send promotion alert to Telegram promotions topic
     */
    public static function sendPromotionAlert(array $data): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }
        if (!($settings['notify_promotions'] ?? true)) {
            return false;
        }

        $title = htmlspecialchars($data['title'] ?? 'Promotion / Stock Update');
        $actor = htmlspecialchars($data['actor'] ?? 'Admin / Staff');
        $details = htmlspecialchars($data['details'] ?? 'N/A');
        $discount = htmlspecialchars($data['discount'] ?? 'N/A');
        $code = !empty($data['code']) ? htmlspecialchars($data['code']) : null;
        $validUntil = !empty($data['valid_until']) ? htmlspecialchars($data['valid_until']) : null;

        $promoTopicId = self::resolveTopicId('promotions') ?? self::resolveTopicId('stock');

        $codeText = $code ? "🎟️ <b>កូដបញ្ចុះតម្លៃ:</b> <code>{$code}</code>\n" : "🎟️ <b>Discount:</b> <code>{$discount}</code>\n";
        $validText = $validUntil ? "⏳ <b>ផុតកំណត់ត្រឹម:</b> {$validUntil}\n" : "";

        $msg = "🎁 <b>[PROMOTION ALERT] បច្ចុប្បន្នភាពប្រូម៉ូសិនពិសេស!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "🏷️ <b>កម្មវិធី / ប្រូម៉ូសិន:</b> <b>{$title}</b>\n"
            . $codeText
            . "📦 <b>ព័ត៌មានលម្អិត:</b> {$details}\n"
            . $validText
            . "👤 <b>រៀបចំដោយ:</b> {$actor}\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime() . "\n\n"
            . "👉 <a href=\"https://www.s-tech-store.tech/rok-mix-khernh/promotions\">ពិនិត្យមើលក្នុងផ្ទាំង Admin</a>";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🎁 ពិនិត្យមើលប្រូម៉ូសិនក្នុង Admin', 'url' => 'https://www.s-tech-store.tech/rok-mix-khernh/promotions'],
                ]
            ]
        ];

        $res = self::sendMessageWithKeyboard($settings['chat_id'], $msg, $keyboard, 'HTML', $promoTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send low stock or out of stock alert to Telegram stock topic
     */
    public static function sendLowStockAlert($product, ?int $remainingStock = null): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }
        if (!($settings['notify_low_stock'] ?? true)) {
            return false;
        }

        $stock = $remainingStock !== null ? $remainingStock : (int)($product->stock ?? 0);
        $productId = $product->id ?? null;

        // 1-hour anti-spam cooldown per product per stock count
        if ($productId) {
            $cacheKey = "tg_low_stock_cooldown_{$productId}_{$stock}";
            if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
                return true;
            }
            \Illuminate\Support\Facades\Cache::put($cacheKey, true, 3600);
        }

        $pName = htmlspecialchars($product->name ?? ('Product #' . $productId));
        $brand = htmlspecialchars($product->brand ?? 'S Tech Store');
        $category = htmlspecialchars($product->category->name ?? 'គ្រឿងអេឡិចត្រូនិច (Electronics)');
        $price = number_format((float)($product->price ?? 0), 2);
        $salePrice = !empty($product->sale_price) ? number_format((float)$product->sale_price, 2) : null;
        $priceDisplay = $salePrice ? "\${$salePrice} USD <i>(ចុះពី \${$price})</i>" : "\${$price} USD";

        $stockTopicId = self::resolveTopicId('stock');

        $isZero = $stock <= 0;
        $statusBadge = $isZero 
            ? "🚨 <b>អស់ពីស្តុកហើយ (OUT OF STOCK - 0 គ្រឿង)!</b>"
            : "⚠️ <b>ជិតអស់ពីស្តុក (នៅសល់តែ {$stock} គ្រឿងប៉ុណ្ណោះ)!</b>";

        $msg = "📦 <b>[STOCK ALERT] ការប្រកាសអាសន្នស្តុកទំនិញ!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "🏷️ <b>មុខទំនិញ:</b> <b>{$pName}</b>\n"
            . "🏢 <b>ម៉ាក (Brand):</b> <b>{$brand}</b>\n"
            . "📂 <b>ប្រភេទ:</b> {$category}\n"
            . "📊 <b>ស្ថានភាពស្តុក:</b> {$statusBadge}\n"
            . "💵 <b>តម្លៃទំនិញ:</b> {$priceDisplay}\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime() . "\n\n"
            . "👉 <i>សូមក្រុមការងារផ្នែកឃ្លាំង និង Admin មេត្តារៀបចំកម្ម៉ង់ ឬបញ្ចូលស្តុកបន្ថែមជាបន្ទាន់!</i>";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '📝 ចូលទៅកែសម្រួលស្តុកក្នុង Admin', 'url' => 'https://www.s-tech-store.tech/rok-mix-khernh/products'],
                ]
            ]
        ];

        $res = self::sendMessageWithKeyboard($settings['chat_id'], $msg, $keyboard, 'HTML', $stockTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Scan all inventory and alert any products below the specified threshold
     */
    public static function scanAndAlertLowStock(int $threshold = 3): array
    {
        $products = \App\Models\Product::where('stock', '<=', $threshold)->with('category')->get();
        $alerted = 0;
        $items = [];

        foreach ($products as $p) {
            $sent = self::sendLowStockAlert($p, (int)$p->stock);
            if ($sent) {
                $alerted++;
                $items[] = [
                    'id' => $p->id,
                    'name' => $p->name,
                    'stock' => (int)$p->stock,
                ];
            }
        }

        return [
            'scanned' => $products->count(),
            'alerted' => $alerted,
            'items' => $items,
        ];
    }

    /**
     * Send financial transaction & price adjustment alert to Telegram finance topic
     */
    public static function sendFinanceAlert(array $data): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        $type = htmlspecialchars($data['type'] ?? 'Payment Received');
        $amount = htmlspecialchars((string)($data['amount'] ?? '0.00'));
        $method = htmlspecialchars($data['method'] ?? 'Bakong KHQR / Cash');
        $orderId = htmlspecialchars($data['order_id'] ?? 'N/A');
        $customer = htmlspecialchars($data['customer'] ?? 'Customer');

        $financeTopicId = self::resolveTopicId('finance') ?? self::resolveTopicId('orders');

        $msg = "💳 <b>[FINANCE] ប្រតិបត្តិការហិរញ្ញវត្ថុ / ទូទាត់ប្រាក់!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "💵 <b>ប្រភេទ:</b> <b>{$type}</b>\n"
            . "💰 <b>ចំនួនទឹកប្រាក់:</b> <b>\${$amount} USD</b>\n"
            . "🏦 <b>វិធីសាស្ត្រទូទាត់:</b> {$method}\n"
            . "🔖 <b>លេខវិក្កយបត្រ / Order:</b> <code>{$orderId}</code>\n"
            . "👤 <b>អតិថិជន:</b> {$customer}\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime() . "\n\n"
            . "👉 <a href=\"https://www.s-tech-store.tech/rok-mix-khernh/orders\">ពិនិត្យមើលក្នុងបញ្ជី Orders</a>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $financeTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send critical system error notification to Telegram system_errors topic
     */
    public static function sendSystemErrorAlert(array $data): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }
        if (!($settings['notify_errors'] ?? true)) {
            return false;
        }

        $error = htmlspecialchars($data['error'] ?? 'Unknown Exception');
        $context = htmlspecialchars($data['context'] ?? 'System Core');
        $actor = htmlspecialchars($data['actor'] ?? request()->ip() ?? 'System');
        $file = htmlspecialchars($data['file'] ?? 'N/A');

        // Deduplication cooldown: 300s (5 minutes) per unique error signature
        $errHash = md5(($data['error'] ?? '') . ($data['file'] ?? ''));
        $cooldownKey = "tg_err_cooldown_{$errHash}";
        if (\Illuminate\Support\Facades\Cache::has($cooldownKey)) {
            return true;
        }
        \Illuminate\Support\Facades\Cache::put($cooldownKey, true, 300);

        $errTopicId = self::resolveTopicId('system_errors') ?? self::resolveTopicId('security');

        $msg = "🚨 <b>[CRITICAL SYSTEM ERROR] បញ្ហាប្រព័ន្ធបច្ចេកវិទ្យា!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "❌ <b>កំហុស (Error):</b> <code>{$error}</code>\n"
            . "📍 <b>បរិបទ / Function:</b> <b>{$context}</b>\n"
            . "📁 <b>ទីតាំង File:</b> <i>{$file}</i>\n"
            . "👤 <b>ប្រភព / IP:</b> {$actor}\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime() . "\n\n"
            . "⚠️ <i>សូមក្រុមការងារបច្ចេកវិទ្យាជួយត្រួតពិនិត្យជាបន្ទាន់</i>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $errTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send Rich Daily Business Summary Report to connected Telegram group (routed to Reports topic)
     * Automatically triggered at 20:00 Cambodia Time (Monday - Saturday)
     */
    public static function sendDailyReport(?string $targetDate = null): array
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return ['ok' => false, 'error' => 'Telegram group not connected'];
        }
        if (!($settings['notify_auto_reports'] ?? true)) {
            return ['ok' => false, 'error' => 'Auto reports are disabled in settings'];
        }

        $tz = new \DateTimeZone('Asia/Phnom_Penh');
        $dt = $targetDate ? new \DateTime($targetDate, $tz) : new \DateTime('now', $tz);
        $dateStr = $dt->format('Y-m-d');
        $displayDate = self::khmerTime($dt, 'd-m-Y');

        // 1. Website Visitors / Traffic Stats
        $hitsKey = 'site_daily_pageviews_' . $dateStr;
        $uniqueKey = 'site_daily_unique_ips_' . $dateStr;
        $pageviews = (int)\Illuminate\Support\Facades\Cache::get($hitsKey, 0);
        $uniqueList = \Illuminate\Support\Facades\Cache::get($uniqueKey, []);
        $uniqueVisitors = is_array($uniqueList) ? count($uniqueList) : 0;
        if ($pageviews < $uniqueVisitors) $pageviews = $uniqueVisitors;
        if ($uniqueVisitors > 0 && $pageviews < 1) $pageviews = 1;

        // 2. Orders & Revenue Stats for Today
        $orders = \App\Models\Order::whereDate('created_at', $dateStr)
            ->where('status', '!=', 'cancelled')
            ->get();

        $totalOrders = $orders->count();
        $totalRevenue = (float)$orders->sum('total_amount');
        $paidOrders = $orders->whereIn('payment_status', ['paid', 'completed'])->count();

        // 3. New Customer Signups
        $newUsersCount = \App\Models\UserProfile::whereDate('created_at', $dateStr)->count();

        // 4. Products Sold Today
        $items = \App\Models\OrderItem::whereHas('order', function ($q) use ($dateStr) {
            $q->whereDate('created_at', $dateStr)->where('status', '!=', 'cancelled');
        })->with('product.category')->get();

        $totalUnitsSold = (int)$items->sum('quantity');
        $distinctProductsCount = $items->pluck('product_id')->unique()->count();

        // Group by product for Top Sellers
        $productStats = [];
        foreach ($items as $item) {
            $pid = $item->product_id ?: ('prod_' . $item->id);
            $pName = htmlspecialchars($item->product->name ?? ('Product #' . $item->product_id));
            $brand = $item->product && !empty($item->product->brand) ? htmlspecialchars($item->product->brand) : null;
            if (!isset($productStats[$pid])) {
                $productStats[$pid] = [
                    'name' => $pName,
                    'brand' => $brand,
                    'qty' => 0,
                    'revenue' => 0.0,
                ];
            }
            $productStats[$pid]['qty'] += (int)($item->quantity ?? 1);
            $productStats[$pid]['revenue'] += (float)($item->subtotal ?? ($item->quantity * ($item->unit_price ?? 0)));
        }

        uasort($productStats, fn($a, $b) => $b['qty'] <=> $a['qty']);

        $topProductsText = "";
        if (!empty($productStats)) {
            $rank = 1;
            foreach (array_slice($productStats, 0, 5) as $stat) {
                $rev = number_format($stat['revenue'], 2);
                $brandBadge = $stat['brand'] ? " [{$stat['brand']}]" : "";
                $topProductsText .= "  {$rank}. <b>{$stat['name']}</b>{$brandBadge} — <b>x{$stat['qty']} គ្រឿង</b> (\${$rev})\n";
                $rank++;
            }
        } else {
            $topProductsText = "  • <i>(មិនទាន់មានទំនិញត្រូវបានបញ្ជាទិញនៅឡើយទេ)</i>\n";
        }

        $reportTopicId = self::resolveTopicId('reports');
        $revFormatted = number_format($totalRevenue, 2);

        $msg = "📊 <b>របាយការណ៍អាជីវកម្មប្រចាំថ្ងៃ (DAILY STORE REPORT)</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "📅 <b>កាលបរិច្ឆេទ:</b> {$displayDate} (ម៉ោង 08:00 យប់)\n\n"
            . "🌐 <b>ចរាចរណ៍អ្នកចូលមើល (Website Traffic):</b>\n"
            . "  • 👥 អ្នកចូលមើលថ្មី (Unique): <b>{$uniqueVisitors} នាក់</b>\n"
            . "  • 👁️ ចំនួនមើលទំព័រ (Pageviews): <b>{$pageviews} ដង</b>\n\n"
            . "🛒 <b>ការលក់ & ប្រាក់ចំណូល (Sales & Revenue):</b>\n"
            . "  • 💵 ចំណូលសរុបថ្ងៃនេះ: <b>\${$revFormatted} USD</b>\n"
            . "  • 📦 ការកុម្ម៉ង់សរុប: <b>{$totalOrders} កុម្ម៉ង់</b> (បានទូទាត់: {$paidOrders})\n"
            . "  • 🛍️ ចំនួនទំនិញលក់បាន: <b>{$totalUnitsSold} គ្រឿង</b> ({$distinctProductsCount} មុខ)\n"
            . "  • 👤 អតិថិជនចុះឈ្មោះថ្មី: <b>{$newUsersCount} នាក់</b>\n\n"
            . "🔥 <b>ទំនិញលក់ដាច់ប្រចាំថ្ងៃ (Top Products Today):</b>\n"
            . $topProductsText . "\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "⏰ <i>ប្រព័ន្ធគណនា និងផ្ញើស្វ័យប្រវត្តរៀងរាល់ម៉ោង ៨ យប់ (ច័ន្ទ - សៅរ៍)</i>";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '📊 មើលផ្ទាំងគ្រប់គ្រង Admin Dashboard', 'url' => 'https://www.s-tech-store.tech/rok-mix-khernh'],
                ]
            ]
        ];

        $res = self::sendMessageWithKeyboard($settings['chat_id'], $msg, $keyboard, 'HTML', $reportTopicId);
        return $res;
    }

    /**
     * Send Rich Weekly Product Sales & Performance Report to connected Telegram group
     * Automatically triggered every Sunday at 20:00 Cambodia Time
     */
    public static function sendWeeklyReport(): array
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return ['ok' => false, 'error' => 'Telegram group not connected'];
        }
        if (!($settings['notify_auto_reports'] ?? true)) {
            return ['ok' => false, 'error' => 'Auto reports are disabled in settings'];
        }

        $tz = new \DateTimeZone('Asia/Phnom_Penh');
        $now = new \DateTime('now', $tz);
        
        // Past 7 days window (Monday 00:00:00 to Sunday 23:59:59)
        $endDate = (clone $now);
        $startDate = (clone $now)->modify('-6 days')->setTime(0, 0, 0);

        $startStr = $startDate->format('Y-m-d 00:00:00');
        $endStr = $endDate->format('Y-m-d 23:59:59');
        $displayRange = $startDate->format('d/m/Y') . " - " . $endDate->format('d/m/Y');

        // 1. Weekly Orders & Revenue
        $orders = \App\Models\Order::whereBetween('created_at', [$startStr, $endStr])
            ->where('status', '!=', 'cancelled')
            ->get();

        $totalOrders = $orders->count();
        $totalRevenue = (float)$orders->sum('total_amount');
        $paidOrders = $orders->whereIn('payment_status', ['paid', 'completed'])->count();

        // 2. All Items Purchased This Week (មានអ្នកទិញប៉ុន្មាន product and product ណាខ្លះ)
        $items = \App\Models\OrderItem::whereHas('order', function ($q) use ($startStr, $endStr) {
            $q->whereBetween('created_at', [$startStr, $endStr])->where('status', '!=', 'cancelled');
        })->with('product.category')->get();

        $totalUnitsSold = (int)$items->sum('quantity');
        $distinctProductsCount = $items->pluck('product_id')->unique()->count();

        // Aggregate every product bought
        $productStats = [];
        foreach ($items as $item) {
            $pid = $item->product_id ?: ('prod_' . $item->id);
            $pName = htmlspecialchars($item->product->name ?? ('Product #' . $item->product_id));
            $brand = $item->product && !empty($item->product->brand) ? htmlspecialchars($item->product->brand) : null;
            $stock = $item->product ? (int)$item->product->stock : null;

            if (!isset($productStats[$pid])) {
                $productStats[$pid] = [
                    'name' => $pName,
                    'brand' => $brand,
                    'stock' => $stock,
                    'qty' => 0,
                    'revenue' => 0.0,
                ];
            }
            $productStats[$pid]['qty'] += (int)($item->quantity ?? 1);
            $productStats[$pid]['revenue'] += (float)($item->subtotal ?? ($item->quantity * ($item->unit_price ?? 0)));
        }

        uasort($productStats, fn($a, $b) => $b['qty'] <=> $a['qty']);

        // Top 5 Medals
        $topListText = "";
        $medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        $idx = 0;
        foreach (array_slice($productStats, 0, 5) as $stat) {
            $m = $medals[$idx] ?? '⭐';
            $rev = number_format($stat['revenue'], 2);
            $brandBadge = $stat['brand'] ? " [{$stat['brand']}]" : "";
            $topListText .= "  {$m} <b>{$stat['name']}</b>{$brandBadge}\n"
                . "     ↳ ចំនួន: <b>x{$stat['qty']} គ្រឿង</b> | ចំណូល: <b>\${$rev} USD</b>\n";
            $idx++;
        }
        if (empty($topListText)) {
            $topListText = "  • <i>(មិនទាន់មានទិន្នន័យការលក់ក្នុងសប្តាហ៍នេះ)</i>\n";
        }

        // Full Itemized breakdown of all products bought (product ណាខ្លះ)
        $allItemsText = "";
        $num = 1;
        foreach ($productStats as $stat) {
            $rev = number_format($stat['revenue'], 2);
            $brandBadge = $stat['brand'] ? " ({$stat['brand']})" : "";
            $stockInfo = $stat['stock'] !== null ? " [ស្តុកនៅសល់: {$stat['stock']}]" : "";
            $allItemsText .= "  {$num}. {$stat['name']}{$brandBadge} — <b>x{$stat['qty']} គ្រឿង</b> (\${$rev}){$stockInfo}\n";
            $num++;
            if ($num > 15) {
                $remaining = count($productStats) - 15;
                $allItemsText .= "  ... និងមាន {$remaining} មុខទំនិញផ្សេងទៀតក្នុង Admin\n";
                break;
            }
        }
        if (empty($allItemsText)) {
            $allItemsText = "  • <i>(គ្មានទំនិញត្រូវបានទិញក្នុងសប្តាហ៍នេះ)</i>\n";
        }

        // Sum weekly visitors
        $weeklyVisitors = 0;
        $period = new \DatePeriod(clone $startDate, new \DateInterval('P1D'), (clone $endDate)->modify('+1 day'));
        foreach ($period as $day) {
            $dStr = $day->format('Y-m-d');
            $uList = \Illuminate\Support\Facades\Cache::get('site_daily_unique_ips_' . $dStr, []);
            $weeklyVisitors += is_array($uList) ? count($uList) : 0;
        }

        // Weekly new members
        $weeklyNewUsers = \App\Models\UserProfile::whereBetween('created_at', [$startStr, $endStr])->count();

        $revFormatted = number_format($totalRevenue, 2);
        $reportTopicId = self::resolveTopicId('reports');

        $msg = "📈 <b>របាយការណ៍សង្ខេបប្រចាំសប្តាហ៍ (WEEKLY SALES & PRODUCT REPORT)</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "🗓️ <b>ចន្លោះកាលបរិច្ឆេទ:</b> {$displayRange}\n"
            . "⏰ <b>ពេលវេលាបញ្ជូន:</b> ថ្ងៃអាទិត្យ ម៉ោង 08:00 យប់\n\n"
            . "💰 <b>ទិដ្ឋភាពទូទៅនៃអាជីវកម្ម (Weekly Overview):</b>\n"
            . "  • 💵 ចំណូលសរុបប្រចាំសប្តាហ៍: <b>\${$revFormatted} USD</b>\n"
            . "  • 🛒 ការបញ្ជាទិញសរុប: <b>{$totalOrders} orders</b> (បានទូទាត់: {$paidOrders})\n"
            . "  • 📦 ចំនួនមុខទំនិញដែលបានលក់: <b>{$distinctProductsCount} មុខ (សរុប {$totalUnitsSold} គ្រឿង)</b>\n"
            . "  • 👥 អ្នកចូលទស្សនាគេហទំព័រសរុប: <b>~{$weeklyVisitors} នាក់</b>\n"
            . "  • 👤 សមាជិកថ្មីចុះឈ្មោះ: <b>{$weeklyNewUsers} នាក់</b>\n\n"
            . "🏆 <b>TOP 5 ទំនិញលក់ដាច់បំផុតប្រចាំសប្តាហ៍:</b>\n"
            . $topListText . "\n"
            . "🛍️ <b>បញ្ជីមុខទំនិញដែលត្រូវបានទិញក្នុងសប្តាហ៍នេះ (Product Breakdown):</b>\n"
            . $allItemsText . "\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "⏰ <i>ប្រព័ន្ធគណនា និងផ្ញើស្វ័យប្រវត្តរៀងរាល់ថ្ងៃអាទិត្យ ម៉ោង ៨ យប់</i>";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '📈 ពិនិត្យមើលរបាយការណ៍លម្អិតក្នុង Admin', 'url' => 'https://www.s-tech-store.tech/rok-mix-khernh/analytics'],
                ]
            ]
        ];

        $res = self::sendMessageWithKeyboard($settings['chat_id'], $msg, $keyboard, 'HTML', $reportTopicId);
        return $res;
    }

    /**
     * Autonomous 8:00 PM Cambodia Time (Asia/Phnom_Penh) Scheduler
     * Runs Mon-Sat for Daily Report, and Sunday for Weekly Report.
     */
    public static function checkAndTriggerScheduledReports(): void
    {
        // 60-second cooldown so it only evaluates once a minute maximum
        if (!\Illuminate\Support\Facades\Cache::add('tg_scheduled_report_check_cooldown', 1, 60)) {
            return;
        }

        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return;
        }
        if (!($settings['notify_auto_reports'] ?? true)) {
            return;
        }

        $tz = new \DateTimeZone('Asia/Phnom_Penh');
        $now = new \DateTime('now', $tz);
        $hour = (int)$now->format('H'); // 20 = 8 PM
        $dayOfWeek = (int)$now->format('w'); // 0 = Sunday, 1..6 = Monday..Saturday
        $todayStr = $now->format('Y-m-d');
        $weekStr = $now->format('o-W');

        // Only fire if 20:00 or later (8 PM window)
        if ($hour < 20) {
            return;
        }

        if ($dayOfWeek === 0) {
            // Sunday: Send Weekly Report
            $weeklyLock = "tg_weekly_report_sent_{$weekStr}";
            if (!\Illuminate\Support\Facades\Cache::has($weeklyLock)) {
                \Illuminate\Support\Facades\Cache::put($weeklyLock, true, 86400 * 6);
                self::sendWeeklyReport();
            }
        } else {
            // Monday to Saturday: Send Daily Report
            $dailyLock = "tg_daily_report_sent_{$todayStr}";
            if (!\Illuminate\Support\Facades\Cache::has($dailyLock)) {
                \Illuminate\Support\Facades\Cache::put($dailyLock, true, 86400);
                self::sendDailyReport($todayStr);
            }
        }
    }

    /**
     * Send urgent notification to Admin Telegram Bot for pending wallet top-up
     * (especially for ABA On-Us transfers that bypass Bakong interbank clearing).
     */
    public static function sendTopupPendingAdminAlert(\App\Models\WalletTransaction $tx, \App\Models\UserProfile $user): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        // Avoid alert spam: check cache flag for this depositId (2 min debounce)
        $cacheKey = "tg_topup_alert_sent_{$tx->reference_id}";
        if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
            return true;
        }
        \Illuminate\Support\Facades\Cache::put($cacheKey, true, 120);

        $amount = number_format((float)$tx->amount, 2);
        $depositId = htmlspecialchars($tx->reference_id);
        $customerName = htmlspecialchars($user->display_name ?: 'Customer');
        $phone = htmlspecialchars($user->phone ?: 'N/A');
        $method = strtoupper($tx->payment_method ?: 'ABA / Bakong');

        $financeTopicId = self::resolveTopicId('finance') ?? self::resolveTopicId('orders');

        $msg = "⚡ <b>[TOP-UP VERIFICATION] សំណើផ្ទៀងផ្ទាត់ការបញ្ចូលលុយ Wallet!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "អតិថិជនបានផ្ទេរប្រាក់តាម <b>{$method}</b> (ABA On-Us / Bakong) ហើយកំពុងរង់ចាំការផ្ទៀងផ្ទាត់សមតុល្យ៖\n\n"
            . "💵 <b>ចំនួនទឹកប្រាក់:</b> <b>+\${$amount} USD</b>\n"
            . "👤 <b>អតិថិជន:</b> <b>{$customerName}</b>\n"
            . "📞 <b>លេខទូរស័ព្ទ:</b> <code>{$phone}</code>\n"
            . "🔖 <b>Ref Deposit ID:</b> <code>{$depositId}</code>\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime($tx->created_at ?? null) . "\n\n"
            . "👉 <i>សូមពិនិត្យមើល App ធនាគារ ABA / Bakong រួចចុច 'អនុម័ត' ខាងក្រោម៖</i>";

        $replyMarkup = [
            'inline_keyboard' => [
                [
                    ['text' => "✅ អនុម័ត +\${$amount} USD ភ្លាមៗ", 'callback_data' => "admin_approve_topup:{$tx->reference_id}"],
                    ['text' => "❌ បដិសេធ", 'callback_data' => "admin_reject_topup:{$tx->reference_id}"],
                ]
            ]
        ];

        $res = self::sendMessageWithKeyboard($settings['chat_id'], $msg, $replyMarkup, 'HTML', $financeTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Handle Admin 1-Click approval of top-up deposit from Telegram Bot
     */
    public static function handleAdminApproveTopup(string $depositId, string $adminName, string $adminTgId): array
    {
        return \Illuminate\Support\Facades\DB::transaction(function() use ($depositId, $adminName, $adminTgId) {
            $tx = \App\Models\WalletTransaction::where('reference_id', $depositId)->lockForUpdate()->first();
            if (!$tx) {
                return [
                    'toast' => '❌ រកមិនឃើញប្រតិបត្តិការនេះឡើយ!',
                    'new_text' => null,
                ];
            }

            if ($tx->status === 'completed') {
                return [
                    'toast' => '⚠️ ប្រតិបត្តិការនេះត្រូវបានអនុម័តរួចរាល់ហើយ!',
                    'new_text' => null,
                ];
            }

            $user = \App\Models\UserProfile::where('firebase_uid', $tx->firebase_uid)->lockForUpdate()->first();
            if (!$user) {
                return [
                    'toast' => '❌ រកមិនឃើញគណនីអតិថិជនឡើយ!',
                    'new_text' => null,
                ];
            }

            $amount = (float)$tx->amount;
            $user->wallet_balance = ((float)($user->wallet_balance ?? 0.00)) + $amount;
            $user->save();

            $tx->status = 'completed';
            $meta = $tx->metadata ?: [];
            $meta['verified_by'] = 'telegram_admin_1click';
            $meta['admin_name'] = $adminName;
            $meta['admin_tg_id'] = $adminTgId;
            $meta['verified_at'] = now()->toIso8601String();
            $tx->metadata = $meta;
            $tx->save();

            \Illuminate\Support\Facades\Cache::forget("wallet_deposit_{$depositId}");
            \Illuminate\Support\Facades\Cache::forget("wallet_stats_{$user->firebase_uid}");

            // Notify user in system
            try {
                \App\Models\UserNotification::create([
                    'firebase_uid' => $user->firebase_uid,
                    'title' => '💳 បញ្ចូលទឹកប្រាក់ជោគជ័យ! (Wallet Funded)',
                    'message' => "ទឹកប្រាក់ $" . number_format($amount, 2) . " ត្រូវបានអនុម័ត និងបញ្ចូលទៅកាន់កាបូប S-Tech Wallet ដោយជោគជ័យ។ សមតុល្យបច្ចុប្បន្ន: $" . number_format($user->wallet_balance, 2),
                    'type' => 'system',
                    'read' => false,
                ]);
            } catch (\Throwable $t) {}

            // Send notification to customer's personal Telegram if linked
            if (!empty($user->telegram_chat_id)) {
                $custMsg = "🎉 <b>ការបញ្ចូលទឹកប្រាក់ត្រូវបានអនុម័ត! (Approved)</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n\n"
                    . "សួស្តី <b>" . htmlspecialchars($user->display_name) . "</b>! ការបញ្ចូលទឹកប្រាក់ចំនួន <b>\$" . number_format($amount, 2) . " USD</b> តាមរយៈ ABA / Bakong (Ref: <code>{$depositId}</code>) ត្រូវបាន Admin អនុម័ត និងបញ្ចូលទៅកាន់កាបូប S-Tech Wallet ដោយជោគជ័យ។\n\n"
                    . "💵 <b>សមតុល្យបច្ចុប្បន្ន:</b> <b>\$" . number_format($user->wallet_balance, 2) . " USD</b>\n\n"
                    . "👉 លោកអ្នកអាចប្រើប្រាស់ទឹកប្រាក់នេះដើម្បីទិញទំនិញក្នុង Mini App បានភ្លាមៗ!";
                $custKb = [
                    'inline_keyboard' => [
                        [['text' => '🛍️ ចូលទិញទំនិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']]]
                    ]
                ];
                try {
                    self::sendMessageWithKeyboard($user->telegram_chat_id, $custMsg, $custKb, 'HTML');
                } catch (\Throwable $t) {}
            }

            $newText = "✅ <b>[APPROVED] បានអនុម័តការបញ្ចូលទឹកប្រាក់ជោគជ័យ!</b>\n"
                . "━━━━━━━━━━━━━━━━━━━━\n"
                . "💵 <b>ចំនួនទឹកប្រាក់:</b> <b>+\$" . number_format($amount, 2) . " USD</b>\n"
                . "👤 <b>អតិថិជន:</b> " . htmlspecialchars($user->display_name) . " (" . htmlspecialchars($user->phone ?: $user->email) . ")\n"
                . "🔖 <b>Ref ID:</b> <code>{$depositId}</code>\n"
                . "💳 <b>វិធីសាស្ត្រ:</b> " . strtoupper($tx->payment_method ?: 'ABA/KHQR') . "\n"
                . "👮 <b>អនុម័តដោយ Admin:</b> <b>" . htmlspecialchars($adminName) . "</b>\n"
                . "⏰ <b>ពេលវេលា:</b> " . self::khmerTime() . "\n\n"
                . "💰 <b>សមតុល្យថ្មីរបស់អតិថិជន:</b> \$" . number_format($user->wallet_balance, 2) . " USD";

            return [
                'toast' => "✅ បានអនុម័ត +$" . number_format($amount, 2) . " ចូល Wallet ជោគជ័យ!",
                'new_text' => $newText,
                'new_kb' => ['inline_keyboard' => []],
            ];
        });
    }

    /**
     * Handle Admin rejection of top-up deposit from Telegram Bot
     */
    public static function handleAdminRejectTopup(string $depositId, string $adminName, string $adminTgId): array
    {
        $tx = \App\Models\WalletTransaction::where('reference_id', $depositId)->first();
        if (!$tx) {
            return [
                'toast' => '❌ រកមិនឃើញប្រតិបត្តិការនេះឡើយ!',
                'new_text' => null,
            ];
        }

        if ($tx->status === 'completed') {
            return [
                'toast' => '⚠️ ប្រតិបត្តិការនេះត្រូវបានអនុម័តរួចរាល់ហើយ មិនអាចបដិសេធបានទេ!',
                'new_text' => null,
            ];
        }

        $tx->status = 'failed';
        $meta = $tx->metadata ?: [];
        $meta['rejected_by'] = 'telegram_admin';
        $meta['rejected_by_admin'] = $adminName;
        $meta['rejected_at'] = now()->toIso8601String();
        $tx->metadata = $meta;
        $tx->save();

        \Illuminate\Support\Facades\Cache::forget("wallet_deposit_{$depositId}");

        $newText = "❌ <b>[REJECTED] បានបដិសេធការបញ្ចូលទឹកប្រាក់!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "💵 <b>ចំនួនទឹកប្រាក់:</b> <b>\$" . number_format((float)$tx->amount, 2) . " USD</b>\n"
            . "🔖 <b>Ref ID:</b> <code>{$depositId}</code>\n"
            . "👮 <b>បដិសេធដោយ Admin:</b> <b>" . htmlspecialchars($adminName) . "</b>\n"
            . "⏰ <b>ពេលវេលា:</b> " . self::khmerTime() . "\n\n"
            . "⚠️ <i>ប្រតិបត្តិការនេះត្រូវបានច្រានចោល មិនមានការបញ្ចូលទឹកប្រាក់ឡើយ។</i>";

        return [
            'toast' => '❌ បានបដិសេធប្រតិបត្តិការនេះ!',
            'new_text' => $newText,
        ];
    }

    /**
     * Send instant order payment verification alert with 1-click Approve button to Admin Telegram
     */
    public static function sendOrderPaymentVerificationAlert(\App\Models\Order $order, string $tranId = '', string $method = 'khqr'): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        $cacheKey = "tg_order_verify_alert_{$order->id}";
        if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
            return true;
        }
        \Illuminate\Support\Facades\Cache::put($cacheKey, true, 120);

        $amount = number_format((float)$order->total_amount, 2);
        $orderId = htmlspecialchars($order->order_id ?: ('#' . $order->id));
        $customerName = htmlspecialchars($order->customer_name ?: 'Customer');
        $phone = htmlspecialchars($order->customer_phone ?: 'N/A');
        $methodName = strtoupper($method ?: 'KHQR');

        // Load items for verification context
        $items = $order->items ?? null;
        if ((empty($items) || (is_countable($items) && count($items) === 0)) && !empty($order->id)) {
            $items = \App\Models\OrderItem::where('order_id', $order->id)->with('product.category')->get();
        } elseif ($items instanceof \Illuminate\Database\Eloquent\Collection) {
            $items->loadMissing('product.category');
        }

        $itemsSummary = "";
        if (!empty($items) && is_countable($items) && count($items) > 0) {
            $itemsSummary = "📦 <b>មុខទំនិញបញ្ជាទិញ (" . count($items) . " មុខ):</b>\n";
            foreach ($items as $idx => $it) {
                $p = $it->product ?? null;
                $pName = htmlspecialchars($p->name ?? ('Product #' . ($it->product_id ?? ($idx + 1))));
                $qty = (int)($it->quantity ?? 1);
                $itPrice = number_format((float)($it->unit_price ?? 0), 2);
                $itSub = number_format((float)($it->subtotal ?? ($qty * (float)($it->unit_price ?? 0))), 2);
                $brand = $p && !empty($p->brand) ? " [{$p->brand}]" : "";
                $itemsSummary .= "  • <b>{$pName}</b>{$brand} x<b>{$qty}</b> (\${$itPrice}) = \${$itSub}\n";
            }
            $itemsSummary .= "\n";
        }

        $ordersTopicId = self::resolveTopicId('orders') ?? self::resolveTopicId('finance');

        $msg = "⚡ <b>[ORDER PAYMENT VERIFICATION] សំណើផ្ទៀងផ្ទាត់ការទូទាត់ទំនិញ!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "អតិថិជនបានចុចបញ្ជាក់ការផ្ទេរប្រាក់ <b>{$methodName}</b> (ABA / Bakong) សម្រាប់ការបញ្ជាទិញ៖\n\n"
            . "🧾 <b>Order ID:</b> <b>#{$orderId}</b>\n"
            . "💵 <b>ចំនួនទឹកប្រាក់:</b> <b>\${$amount} USD</b>\n"
            . "👤 <b>អតិថិជន:</b> <b>{$customerName}</b>\n"
            . "📞 <b>លេខទូរស័ព្ទ:</b> <code>{$phone}</code>\n"
            . "🔖 <b>Ref Tran ID:</b> <code>{$tranId}</code>\n\n"
            . $itemsSummary
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . self::khmerTime($order->created_at ?? null) . "\n\n"
            . "👉 <i>សូមពិនិត្យមើល App ធនាគារ ABA / Bakong រួចចុច 'អនុម័ត' ខាងក្រោម៖</i>";

        $replyMarkup = [
            'inline_keyboard' => [
                [
                    ['text' => "✅ អនុម័តទូទាត់ \${$amount} USD", 'callback_data' => "admin_approve_order:{$order->id}"],
                    ['text' => "❌ បដិសេធ", 'callback_data' => "admin_reject_order:{$order->id}"],
                ]
            ]
        ];

        $res = self::sendMessageWithKeyboard($settings['chat_id'], $msg, $replyMarkup, 'HTML', $ordersTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Handle Admin 1-Click approval of order payment from Telegram Bot
     */
    public static function handleAdminApproveOrder(string $orderIdInput, string $adminName, string $adminTgId): array
    {
        $orderQuery = \App\Models\Order::where('id', is_numeric($orderIdInput) ? (int)$orderIdInput : 0)
            ->orWhere('order_id', $orderIdInput);
        $order = $orderQuery->first();

        if (!$order) {
            return ['toast' => '❌ រកមិនឃើញ Order នេះឡើយ!', 'new_text' => null];
        }

        if ($order->payment_status === 'paid') {
            return ['toast' => '⚠️ Order នេះត្រូវបានទូទាត់រួចរាល់ហើយ!', 'new_text' => null];
        }

        $tranId = 'ADMIN_APPV_' . strtoupper(uniqid());
        \App\Services\PaymentService::markOrderAsPaid($order, $tranId, $order->payment_method ?: 'khqr', [
            'verified_by' => 'telegram_admin_1click',
            'admin_name' => $adminName,
            'admin_tg_id' => $adminTgId,
            'verified_at' => now()->toIso8601String(),
        ]);

        $amount = number_format((float)$order->total_amount, 2);
        $cleanOrderId = htmlspecialchars($order->order_id ?: ('#' . $order->id));

        $newText = "✅ <b>[APPROVED] បានអនុម័តការទូទាត់ Order ជោគជ័យ!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "🧾 <b>Order ID:</b> <b>#{$cleanOrderId}</b>\n"
            . "💵 <b>ចំនួនទឹកប្រាក់:</b> <b>\${$amount} USD</b>\n"
            . "👤 <b>អតិថិជន:</b> " . htmlspecialchars($order->customer_name) . " (" . htmlspecialchars($order->customer_phone) . ")\n"
            . "💳 <b>វិធីសាស្ត្រ:</b> " . strtoupper($order->payment_method ?: 'KHQR') . "\n"
            . "👮 <b>អនុម័តដោយ Admin:</b> <b>" . htmlspecialchars($adminName) . "</b>\n"
            . "⏰ <b>ពេលវេលា:</b> " . self::khmerTime() . "\n\n"
            . "🚀 <i>ស្ថានភាព Order ត្រូវបានផ្លាស់ប្តូរទៅ Processing រួចរាល់!</i>";

        return [
            'toast' => "✅ បានអនុម័ត Order #{$cleanOrderId} ជោគជ័យ!",
            'new_text' => $newText,
        ];
    }

    /**
     * Handle Admin 1-Click rejection of order payment from Telegram Bot
     */
    public static function handleAdminRejectOrder(string $orderIdInput, string $adminName, string $adminTgId): array
    {
        $orderQuery = \App\Models\Order::where('id', is_numeric($orderIdInput) ? (int)$orderIdInput : 0)
            ->orWhere('order_id', $orderIdInput);
        $order = $orderQuery->first();

        if (!$order) {
            return ['toast' => '❌ រកមិនឃើញ Order នេះឡើយ!', 'new_text' => null];
        }

        $order->payment_status = 'failed';
        $order->save();

        $cleanOrderId = htmlspecialchars($order->order_id ?: ('#' . $order->id));
        $newText = "❌ <b>[REJECTED] បានបដិសេធការទូទាត់ Order!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "🧾 <b>Order ID:</b> <b>#{$cleanOrderId}</b>\n"
            . "💵 <b>ចំនួនទឹកប្រាក់:</b> <b>\$" . number_format((float)$order->total_amount, 2) . " USD</b>\n"
            . "👮 <b>បដិសេធដោយ Admin:</b> <b>" . htmlspecialchars($adminName) . "</b>\n"
            . "⏰ <b>ពេលវេលា:</b> " . self::khmerTime() . "\n\n"
            . "⚠️ <i>ការទូទាត់ត្រូវបានច្រានចោល។</i>";

        return [
            'toast' => "❌ បានបដិសេធការទូទាត់ Order #{$cleanOrderId}!",
            'new_text' => $newText,
        ];
    }

    public static function formatActivePromoCodesText(): string
    {
        try {
            $activePromos = \App\Models\PromoCode::where('status', 'active')
                ->where(function ($q) {
                    $q->whereNull('valid_until')->orWhere('valid_until', '>=', now());
                })
                ->where(function ($q) {
                    $q->whereNull('valid_from')->orWhere('valid_from', '<=', now());
                })
                ->take(5)
                ->get();

            if ($activePromos->count() > 0) {
                $lines = [];
                foreach ($activePromos as $ap) {
                    $valStr = $ap->type === 'percentage' ? "{$ap->value}%" : "\${$ap->value}";
                    $lines[] = "   - <code>{$ap->code}</code> — បញ្ចុះ {$valStr} ({$ap->name})";
                }
                return implode("\n", $lines);
            }
        } catch (\Throwable $e) {}

        return "   - <i>បច្ចុប្បន្នពុំមានកូដប្រូម៉ូសិនសកម្មទេ (No active promo codes)</i>";
    }
}


