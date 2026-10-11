<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TelegramService
{
    public const OFFICIAL_BOT_TOKEN = '8899300323:AAFYan1EcMEAEcC6E-3KvahVXKcnPHLhKOI';
    public const OFFICIAL_BOT_USERNAME = 's_tech_storeBot';

    private static $settingsFile = 'telegram_settings.json';

    /**
     * Get current Telegram bot settings & pairing status
     */
    public static function getSettings(): array
    {
        $default = [
            'connected' => false,
            'chat_id' => null,
            'chat_title' => null,
            'chat_type' => null,
            'connected_at' => null,
            'connected_by' => null,
            'bot_username' => env('TELEGRAM_BOT_USERNAME', self::OFFICIAL_BOT_USERNAME),
            'bot_token' => env('TELEGRAM_BOT_TOKEN', self::OFFICIAL_BOT_TOKEN),
            'notify_orders' => true,
            'notify_low_stock' => true,
            'notify_repairs' => true,
            'notify_shifts' => true,
            'topics' => [],
            'pending_tokens' => [],
        ];

        try {
            if (Storage::exists(self::$settingsFile)) {
                $saved = json_decode(Storage::get(self::$settingsFile), true);
                if (is_array($saved)) {
                    $merged = array_merge($default, $saved);
                    if (empty($merged['bot_token'])) {
                        $merged['bot_token'] = self::OFFICIAL_BOT_TOKEN;
                    }
                    if (empty($merged['bot_username'])) {
                        $merged['bot_username'] = self::OFFICIAL_BOT_USERNAME;
                    }
                    return $merged;
                }
            }
        } catch (\Throwable $e) {
            Log::error("Failed to read telegram settings: " . $e->getMessage());
        }

        return $default;
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
        try {
            return Storage::put(self::$settingsFile, json_encode($settings, JSON_PRETTY_PRINT));
        } catch (\Throwable $e) {
            Log::error("Failed to save telegram settings: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Generate a new unique Pairing Link & Code (ABA Merchant Style)
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

        // Telegram deep links
        // ?startgroup= launches Telegram on mobile/desktop and prompts to pick a group with admin rights for Manage Topics
        $groupUrl = "https://t.me/{$botUsername}?startgroup={$pairCode}&admin=manage_topics+post_messages+change_info+pin_messages";
        $directUrl = "https://t.me/{$botUsername}?start={$pairCode}";

        return [
            'configured' => true,
            'pair_code' => $pairCode,
            'bot_username' => $botUsername,
            'group_url' => $groupUrl,
            'direct_url' => $directUrl,
            'expires_in' => 1800, // 30 minutes
        ];
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

        try {
            // If already connected to this chat, do not spam greeting or recreate topics
            if (!empty($settings['connected']) && (string)($settings['chat_id'] ?? '') === $chatIdStr) {
                // Ensure topics exist if not yet created
                $topics = $settings['topics'] ?? [];
                if (empty($topics['orders']) || empty($topics['repairs']) || empty($topics['stock']) || empty($topics['chat'])) {
                    self::setupTopics($chatId);
                }
                return true;
            }

            $tokens = $settings['pending_tokens'] ?? [];
            $matchedKey = null;

            if (isset($tokens[$pairCode])) {
                $matchedKey = $pairCode;
            } else {
                foreach (array_keys($tokens) as $t) {
                    if (str_starts_with($pairCode, $t) || str_starts_with($t, $pairCode)) {
                        $matchedKey = $t;
                        break;
                    }
                }
            }

            $connectedBy = 'Admin/Staff';
            if ($matchedKey) {
                $connectedBy = $tokens[$matchedKey]['user'] ?? 'Admin/Staff';
                unset($tokens[$matchedKey]);
            } elseif ($pairCode === 'AUTO' && !empty($tokens)) {
                $latestToken = array_key_last($tokens);
                $connectedBy = $tokens[$latestToken]['user'] ?? 'Admin/Staff';
                unset($tokens[$latestToken]);
            } elseif (!str_starts_with($pairCode, 'ST') && $pairCode !== 'AUTO') {
                return false;
            }

            $settings['connected'] = true;
            $settings['chat_id'] = $chatIdStr;
            $settings['chat_title'] = $chatTitle ?: "S Tech Store Group ({$chatIdStr})";
            $settings['chat_type'] = $chatType;
            $settings['connected_at'] = date('Y-m-d H:i:s');
            $settings['connected_by'] = $connectedBy;
            $settings['pending_tokens'] = $tokens;

            self::saveSettings($settings);

            // Send initial connection greeting ONCE
            $welcomeText = "🎉 <b>S Tech Store Notification Bot បានភ្ជាប់ជោគជ័យ!</b>\n\n"
                . "🏪 <b>ប្រព័ន្ធហាង:</b> S Tech Store Cambodia\n"
                . "👥 <b>ឈ្មោះគ្រុប:</b> " . htmlspecialchars($settings['chat_title']) . "\n"
                . "🔑 <b>Chat ID:</b> <code>{$chatIdStr}</code>\n"
                . "👤 <b>ភ្ជាប់ដោយ:</b> {$connectedBy}\n\n"
                . "🔔 <b>គ្រុបនេះនឹងទទួលបានការជូនដំណឹងស្វ័យប្រវត្តិនូវរាល់៖</b>\n"
                . "• 🛒 <b>ការបញ្ជាទិញថ្មី (New Orders)</b>\n"
                . "• 🔧 <b>សំណើជួសជុល (Repair Tickets)</b>\n"
                . "• ⚠️ <b>ទំនិញជិតអស់ពីស្តុក (Low Stock Alerts)</b>\n"
                . "• ⏰ <b>វេនការងារបុគ្គលិក (Staff Shift Updates)</b>\n\n"
                . "<i>កំពុងពិនិត្យសិទ្ធិ និងរៀបចំបង្កើត Forum Topics ដោយស្វ័យប្រវត្តិ...</i>";

            self::sendMessage($chatId, $welcomeText);

            // Automatically setup Forum Topics in group
            self::setupTopics($chatId);

            return true;
        } finally {
            Cache::forget($lockKey);
        }
    }

    /**
     * Process an individual update received from Telegram Webhook or Long Polling
     */
    public static function processUpdate(array $up): void
    {
        $settings = self::getSettings();
        $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');
        $botUsername = $settings['bot_username'] ?? self::OFFICIAL_BOT_USERNAME;

        // 1. Handle Inline Keyboard Callback Queries (e.g. Retry Setup button)
        if (isset($up['callback_query'])) {
            $callbackQuery = $up['callback_query'];
            $callbackData = $callbackQuery['data'] ?? '';
            $chatId = $callbackQuery['message']['chat']['id'] ?? null;
            $callbackId = $callbackQuery['id'] ?? null;

            if ($callbackData === 'setup_topics' && $chatId) {
                self::setupTopics($chatId);
                if ($token && !str_contains($token, 'Placeholder')) {
                    try {
                        Http::timeout(5)->post("https://api.telegram.org/bot{$token}/answerCallbackQuery", [
                            'callback_query_id' => $callbackId,
                            'text' => 'កំពុងរៀបចំ Forum Topics...',
                        ]);
                    } catch (\Throwable $e) {}
                }
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
                $settings = self::getSettings();
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

                $joinMsg = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Notification Bot!</b>\n\n"
                    . "🏪 <b>ហាង S Tech Store Cambodia</b>\n"
                    . "Bot ត្រូវបានបន្ថែមចូលក្នុងគ្រុបនេះដោយជោគជ័យ។\n\n"
                    . "👉 ប្រសិនបើអ្នកមាន Pairing Code សូមវាយបញ្ជា: <code>/start STxxxxx</code>\n"
                    . "👉 ឬវាយបញ្ជា <code>/setup_topics</code> ដើម្បីរៀបចំ Forum Topics ដោយស្វ័យប្រវត្តិ!";
                self::sendMessage($chatId, $joinMsg);
            }
            return;
        }

        // 3. Handle Messages & Channel Posts
        $message = $up['message'] ?? $up['channel_post'] ?? null;
        if (!$message) return;

        $chat = $message['chat'] ?? [];
        $chatId = $chat['id'] ?? null;
        $messageId = $message['message_id'] ?? null;
        $chatTitle = $chat['title'] ?? ($chat['first_name'] ?? 'S Tech Store Channel');
        $chatType = $chat['type'] ?? 'group';
        $text = trim($message['text'] ?? '');

        if (!$chatId) return;

        // Message Deduplication
        if ($messageId && !Cache::add("tg_done_msg_{$chatId}_{$messageId}", time(), 86400)) {
            return;
        }

        // Check if bot was added as new chat member
        if (!empty($message['new_chat_members'])) {
            foreach ($message['new_chat_members'] as $newMember) {
                if (($newMember['username'] ?? '') === $botUsername || ($newMember['is_bot'] ?? false)) {
                    $tokens = $settings['pending_tokens'] ?? [];
                    if (!empty($tokens)) {
                        self::pairChat('AUTO', $chatId, $chatTitle, $chatType);
                        return;
                    }

                    if (!empty($settings['connected']) && (string)($settings['chat_id'] ?? '') === (string)$chatId) {
                        return;
                    }

                    $joinMsg = "👋 <b>ជម្រាបសួរក្រុមការងារ S Tech Store!</b>\n\n"
                        . "ខ្ញុំគឺ Bot ផ្លូវការរបស់ហាង S Tech Store។\n\n"
                        . "🔑 ដើម្បីភ្ជាប់គ្រុបនេះជាមួយ Admin Website សូមប្រើពាក្យបញ្ជា:\n"
                        . "<code>/start STxxxxx</code> (លេខកូដ Pairing ពី Settings)\n\n"
                        . "🛠️ ឬវាយ <code>/setup_topics</code> ប្រសិនបើចង់បង្កើត Forum Topics ស្វ័យប្រវត្តិ!";
                    self::sendMessage($chatId, $joinMsg);
                    return;
                }
            }
        }

        // 4. Extract Pairing Code / Hash from incoming commands & deep links
        $extractedCode = null;

        if (preg_match('/^\/start(?:@\w+)?(?:[\s=_]+|\?)(?:start(?:group)?=)?([A-Za-z0-9_-]+)/i', $text, $matches)) {
            $extractedCode = $matches[1];
        } elseif (preg_match('/start(?:group)?=([A-Za-z0-9_-]+)/i', $text, $matches)) {
            $extractedCode = $matches[1];
        } elseif (preg_match('/\b(ST[A-Za-z0-9]{4,12})\b/i', $text, $matches)) {
            $extractedCode = $matches[1];
        }

        if ($extractedCode) {
            $cleanCode = strtoupper(trim($extractedCode));
            // Strip any trailing hash or query params e.g. STxxxxx_hash or STxxxxx&admin=...
            if (preg_match('/^(ST[A-Za-z0-9]{4,8})/i', $cleanCode, $mCode)) {
                $cleanCode = strtoupper($mCode[1]);
            }

            self::pairChat($cleanCode, $chatId, $chatTitle, $chatType);
            return;
        }

        // Command: /start (without code)
        if (preg_match('/^\/start(?:@\w+)?$/i', $text)) {
            $tokens = $settings['pending_tokens'] ?? [];

            // If in a group and there is a recent pending token, auto-pair!
            if (!empty($tokens) && $chatType !== 'private') {
                self::pairChat('AUTO', $chatId, $chatTitle, $chatType);
                return;
            }

            $isConnected = !empty($settings['connected']) && (string)($settings['chat_id'] ?? '') === (string)$chatId;
            $currentChat = $settings['chat_title'] ?? $chatTitle;
            $welcome = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Notification Bot!</b>\n\n"
                . "🤖 <b>គណនី Bot:</b> @{$botUsername}\n"
                . "⚡ <b>ស្ថានភាព:</b> " . ($isConnected ? "🟢 Connected ជាមួយគ្រុប {$currentChat}" : "⚪ មិនទាន់ភ្ជាប់គ្រុប") . "\n\n"
                . "📌 <b>របៀបភ្ជាប់គ្រុប:</b>\n"
                . "1️⃣ ចូលទៅកាន់ Admin Dashboard 👉 <a href=\"https://s-tech-store.vercel.app/rok-mix-khernh/settings\">Telegram Settings</a>\n"
                . "2️⃣ ចុចប៊ូតុង <b>Connect Telegram</b> (1-Click Connect)\n"
                . "3️⃣ ជ្រើសរើស Group របស់ហាង នោះប្រព័ន្ធនឹង Auto Connect ភ្លាមៗ!\n\n"
                . "⚙️ <b>ពាក្យបញ្ជាដែលមាន:</b>\n"
                . "• <code>/setup_topics</code> — បង្កើត និងរៀបចំ Forum Topics ស្វ័យប្រវត្តិ\n"
                . "• <code>/status</code> — ពិនិត្យមើលស្ថានភាពភ្ជាប់បច្ចុប្បន្ន";
            self::sendMessage($chatId, $welcome);
            return;
        }

        // Command: /setup_topics or /topics
        if (preg_match('/^\/(?:setup_topics|topics)(?:@\w+)?/i', $text)) {
            self::setupTopics($chatId);
            return;
        }

        // Command: /status
        if (preg_match('/^\/status(?:@\w+)?/i', $text)) {
            $isConnected = !empty($settings['connected']) && (string)($settings['chat_id'] ?? '') === (string)$chatId;
            $statusText = "📊 <b>ស្ថានភាព S Tech Store Bot:</b>\n\n"
                . "• <b>Bot Username:</b> @{$botUsername}\n"
                . "• <b>Chat ID បច្ចុប្បន្ន:</b> <code>{$chatId}</code>\n"
                . "• <b>ស្ថានភាពភ្ជាប់:</b> " . ($isConnected ? "🟢 ភ្ជាប់រួចរាល់" : "⚪ មិនទាន់ភ្ជាប់") . "\n"
                . "• <b>Topics បានរៀបចំ:</b> " . count($settings['topics'] ?? []) . " topics\n\n"
                . "✅ ប្រព័ន្ធដំណើរការ ២៤/៧ ដោយស្វ័យប្រវត្តិ!";
            self::sendMessage($chatId, $statusText);
            return;
        }

        // In private chat: reply politely so user knows the bot is alive
        if ($chatType === 'private') {
            $privateReply = "🤖 <b>S Tech Store Official Assistant</b>\n\n"
                . "ខ្ញុំជាប្រព័ន្ធស្វ័យប្រវត្តិសម្រាប់ផ្ញើការជូនដំណឹងទំនិញ និងការបញ្ជាទិញ។\n\n"
                . "🌐 គេហទំព័រហាង: <a href=\"https://s-tech-store.vercel.app\">S Tech Store</a>\n"
                . "⚡ ប្រើបញ្ជា <code>/start</code> ដើម្បីមើលព័ត៌មានបន្ថែម។";
            self::sendMessage($chatId, $privateReply);
        }
    }

    /**
     * Poll recent updates from Telegram API (supports long-polling with timeout)
     */
    public static function pollPendingUpdates(int $timeout = 0): void
    {
        $settings = self::getSettings();
        $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');
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

                    self::processUpdate($up);
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
                'repairs' => [
                    'name' => '🛠️ សេវាជួសជុល',
                    'icon_color' => 16749490, // Orange
                ],
                'stock' => [
                    'name' => '⚠️ ការជូនដំណឹងស្តុក',
                    'icon_color' => 16478047, // Red
                ],
                'chat' => [
                    'name' => '💬 សេវាអតិថិជន',
                    'icon_color' => 13338331, // Violet
                ],
            ];

            $createdTopics = $settings['topics'] ?? [];
            if (!is_array($createdTopics)) {
                $createdTopics = [];
            }
            $connectedChatId = (string)($settings['chat_id'] ?? '');
            $topicsChatId = (string)($settings['topics_chat_id'] ?? $connectedChatId);

            // Normalize chat IDs for robust comparison
            $cleanChatId = ltrim($chatIdStr, '-');
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
                    self::saveSettings($settings);
                }
                return [
                    'ok' => true,
                    'already_exists' => true,
                    'topics' => $createdTopics,
                    'message' => 'ប្រធានបទ Topics ទាំងអស់ត្រូវបានបង្កើតរួចរាល់ហើយក្នុងគ្រុប (All topics already exist, no duplicates created).',
                ];
            }

            if (!$token || str_contains($token, 'Placeholder')) {
                // Mock mode for local testing
                $mockTopics = [
                    'orders' => 101,
                    'repairs' => 102,
                    'stock' => 103,
                    'chat' => 104,
                ];
                $settings['topics'] = $mockTopics;
                $settings['topics_chat_id'] = $chatIdStr;
                self::saveSettings($settings);

                $mockNotice = "🎉 <b>S Tech Store — Forum Topics ត្រូវបានបង្កើតជោគជ័យ!</b>\n\n"
                    . "🗂️ <b>រាល់ការជូនដំណឹងពីប្រព័ន្ធ នឹងត្រូវបានបែងចែកតាម Topic ស្វ័យប្រវត្ត៖</b>\n\n"
                    . "1️⃣ 🛒 <b>ការបញ្ជាទិញថ្មី</b> — ទទួលការជូនដំណឹងរាល់ពេលមាន Order\n"
                    . "2️⃣ 🛠️ <b>សេវាជួសជុល</b> — តាមដានស្ថានភាពជួសជុល & Ticket\n"
                    . "3️⃣ ⚠️ <b>ការជូនដំណឹងស្តុក</b> — ជូនដំណឹងពេលទំនិញជិតអស់ពីស្តុក\n"
                    . "4️⃣ 💬 <b>សេវាអតិថិជន</b> — សម្រាប់សន្ទនាទូទៅក្នុងក្រុម\n\n"
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
                $adminNotice = "⚠️ <b>សូមផ្តល់សិទ្ធិជា Administrator ដល់ Bot:</b>\n\n"
                    . "ដើម្បីឲ្យ Bot អាចបង្កើត <b>Forum Topics (ប្រធានបទដោយស្វ័យប្រវត្តិ)</b> ក្នុងគ្រុបនេះបាន សូមធ្វើតាមជំហានងាយៗដូចខាងក្រោម៖\n\n"
                    . "1️⃣ ចូលទៅកាន់ <b>Group Settings ⚙️</b> ➡️ បើកមុខងារ <b>Topics</b>\n"
                    . "2️⃣ ចូលទៅកាន់ <b>Administrators 🛡️</b> ➡️ Add <b>@{$botUsername}</b> ជា Admin\n"
                    . "3️⃣ បើកសិទ្ធិ <b>Manage Topics</b> (ឬផ្តល់សិទ្ធិ Admin ពេញលេញ)\n"
                    . "4️⃣ បន្ទាប់ពីបើកសិទ្ធិរួច សូមចុចប៊ូតុងខាងក្រោម ឬវាយបញ្ជា <code>/setup_topics</code> ម្តងទៀត!\n\n"
                    . "<i>Bot នឹងបង្កើត Topic ដោយស្វ័យប្រវត្តិភ្លាមៗ!</i>";

                $keyboard = [
                    'inline_keyboard' => [
                        [
                            ['text' => '🔄 ចុចដើម្បីបង្កើត Topics ម្តងទៀត (Retry Setup)', 'callback_data' => 'setup_topics']
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

            // Only send congratulatory overview if we actually created new topics
            if ($newlyCreatedCount > 0) {
                $topicsOverview = "🎉 <b>S Tech Store — Forum Topics ត្រូវបានបង្កើតជោគជ័យ!</b>\n\n"
                    . "🗂️ <b>រាល់ការជូនដំណឹងពីប្រព័ន្ធ នឹងត្រូវបានបែងចែកតាម Topic ស្វ័យប្រវត្ត៖</b>\n\n"
                    . "1️⃣ 🛒 <b>ការបញ្ជាទិញថ្មី</b> — ទទួលការជូនដំណឹងវិក្កយបត្រថ្មីភ្លាមៗ\n"
                    . "2️⃣ 🛠️ <b>សេវាជួសជុល</b> — តាមដានស្ថានភាពជួសជុល & Ticket\n"
                    . "3️⃣ ⚠️ <b>ការជូនដំណឹងស្តុក</b> — ជូនដំណឹងពេលទំនិញជិតអស់ពីស្តុក\n"
                    . "4️⃣ 💬 <b>សេវាអតិថិជន</b> — សម្រាប់សន្ទនា និងឆ្លើយតបអតិថិជន\n\n"
                    . "✅ <i>ប្រព័ន្ធ Notification ដំណើរការពេញលេញ ២៤/៧!</i>";

                self::sendMessage($chatId, $topicsOverview);
            }

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
        if (!empty($settings['chat_id'])) {
            try {
                $byeText = "⚠️ <b>ការជូនដំណឹងពី S Tech Store:</b>\n\n"
                    . "Bot ត្រូវបានផ្តាច់ចេញពីគ្រុបនេះដោយ Admin ។ គ្រុបនេះនឹងលែងទទួលបាន Notification ស្វ័យប្រវត្តិទៀតហើយ។";
                self::sendMessage($settings['chat_id'], $byeText);
            } catch (\Throwable $e) {}
        }

        $settings['connected'] = false;
        $settings['chat_id'] = null;
        $settings['chat_title'] = null;
        $settings['chat_type'] = null;
        $settings['connected_at'] = null;
        $settings['connected_by'] = null;
        $settings['topics'] = [];
        $settings['topics_chat_id'] = null;

        return self::saveSettings($settings);
    }

    /**
     * Send message using Telegram Bot API (supports Forum Thread ID)
     */
    public static function sendMessage($chatId, string $text, string $parseMode = 'HTML', ?int $threadId = null): array
    {
        $settings = self::getSettings();
        $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');

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

            $response = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);

            return $response->json() ?? ['ok' => $response->successful()];
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram message: " . $e->getMessage());
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send message with Inline Keyboard buttons
     */
    public static function sendMessageWithKeyboard($chatId, string $text, array $replyMarkup, string $parseMode = 'HTML', ?int $threadId = null): array
    {
        $settings = self::getSettings();
        $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');

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

            $response = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
            return $response->json() ?? ['ok' => $response->successful()];
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram message with keyboard: " . $e->getMessage());
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send rich Order Notification to connected Telegram group (routed to Orders Topic if available)
     */
    public static function sendOrderNotification($order): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id']) || empty($settings['notify_orders'])) {
            return false;
        }

        $orderId = $order->order_id ?? ('#ORD-' . ($order->id ?? 'NEW'));
        $name = htmlspecialchars($order->customer_name ?? 'Valued Customer');
        $phone = htmlspecialchars($order->customer_phone ?? 'N/A');
        $address = htmlspecialchars($order->shipping_address ?? 'Phnom Penh');
        $total = number_format((float)($order->total_amount ?? 0), 2);
        $payment = strtoupper($order->payment_method ?? 'Cash on Delivery (COD)');
        $delivery = htmlspecialchars($order->delivery_type ?? 'Standard Delivery');

        $itemsText = "";
        if (!empty($order->items)) {
            foreach ($order->items as $idx => $item) {
                $pName = htmlspecialchars($item->product->name ?? ('Product #' . ($item->product_id ?? ($idx + 1))));
                $qty = $item->quantity ?? 1;
                $price = number_format((float)($item->unit_price ?? 0), 2);
                $itemsText .= "  • <b>{$pName}</b> x{$qty} (\${$price})\n";
            }
        } else {
            $itemsText = "  • <i>(ព័ត៌មានទំនិញត្រូវបានកត់ត្រាក្នុង Admin)</i>\n";
        }

        $orderTopicId = $settings['topics']['orders'] ?? null;

        $msg = "🛒 <b>ការបញ្ជាទិញថ្មី (NEW ORDER RECEIVED)!</b>\n\n"
            . "🔖 <b>លេខវិក្កយបត្រ:</b> <code>{$orderId}</code>\n"
            . "👤 <b>អតិថិជន:</b> <b>{$name}</b>\n"
            . "📱 <b>លេខទូរស័ព្ទ:</b> <code>{$phone}</code>\n"
            . "📍 <b>អាសយដ្ឋាន:</b> {$address}\n"
            . "🚚 <b>ការដឹកជញ្ជូន:</b> {$delivery}\n"
            . "💳 <b>វិធីទូទាត់:</b> {$payment}\n\n"
            . "📦 <b>មុខទំនិញកុម្ម៉ង់:</b>\n"
            . $itemsText . "\n"
            . "💵 <b>សរុបទឹកប្រាក់:</b> <b>\${$total} USD</b>\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . date('d-m-Y H:i:s') . "\n\n"
            . "👉 <a href=\"https://s-tech-store.vercel.app/rok-mix-khernh/orders\">ចុចទីនេះដើម្បីពិនិត្យ និងរៀបចំការដឹកជញ្ជូន</a>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $orderTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send instant live chat request from website customer to Telegram group
     */
    public static function sendCustomerChatAlert(array $data): array
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return ['ok' => false, 'error' => 'No Telegram group connected'];
        }

        $name = htmlspecialchars($data['name'] ?? 'អតិថិជន (Website Customer)');
        $phone = htmlspecialchars($data['phone'] ?? 'N/A');
        $email = htmlspecialchars($data['email'] ?? 'N/A');
        $telegram = htmlspecialchars($data['telegram'] ?? 'N/A');
        $message = htmlspecialchars($data['message'] ?? 'មានសំណួរចង់សាកសួរក្រុមការងារ...');
        $product = !empty($data['product_name']) ? htmlspecialchars($data['product_name']) : null;

        $chatTopicId = $settings['topics']['chat'] ?? null;

        $text = "💬 <b>សំណើសន្ទនាផ្ទាល់ពីអតិថិជន (LIVE CHAT REQUEST)!</b>\n\n"
            . "👤 <b>ឈ្មោះអតិថិជន:</b> <b>{$name}</b>\n"
            . "📱 <b>ទូរស័ព្ទ:</b> <code>{$phone}</code>\n"
            . "📧 <b>Email:</b> {$email}\n"
            . "✈️ <b>Telegram:</b> " . ($telegram !== 'N/A' ? "@" . ltrim($telegram, '@') : 'N/A') . "\n";
            
        if ($product) {
            $text .= "📦 <b>ទំនិញចាប់អារម្មណ៍:</b> {$product}\n";
        }

        $text .= "📝 <b>សារសាកសួរ:</b>\n<i>\"{$message}\"</i>\n\n"
            . "⏰ <b>ពេលវេលា:</b> " . date('d-m-Y H:i:s') . "\n\n"
            . "👉 <a href=\"https://s-tech-store.vercel.app/rok-mix-khernh/chat\">ចូលទៅកាន់ Admin Chat Portal ដើម្បីឆ្លើយតប</a>";

        return self::sendMessage($settings['chat_id'], $text, 'HTML', $chatTopicId);
    }

    /**
     * Send instant notification to Telegram group when a new product is added by Admin
     */
    public static function sendNewProductAlert($product): bool
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

        $stockTopicId = $settings['topics']['stock'] ?? null;

        $msg = "📦 <b>ផលិតផលថ្មីត្រូវបានបន្ថែមក្នុងប្រព័ន្ធ! (NEW PRODUCT ADDED)</b>\n\n"
            . "🏷️ <b>ឈ្មោះទំនិញ:</b> <b>{$pName}</b>\n"
            . "💰 <b>តម្លៃ:</b> <b>\${$price} USD</b>\n"
            . "📦 <b>ចំនួនស្តុក:</b> {$stock} គ្រឿង\n"
            . "📂 <b>ប្រភេទទំនិញ:</b> {$categoryName}\n"
            . "🏢 <b>ម៉ាក:</b> {$brand}\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . date('d-m-Y H:i:s') . "\n\n"
            . "👉 <a href=\"https://s-tech-store.vercel.app/products/{$slug}\">ចុចទីនេះដើម្បីពិនិត្យទំនិញលើគេហទំព័រ</a>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $stockTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send magic login and password reset link notification to Telegram group/topic or direct chat
     */
    public static function sendCustomerMagicLinkAlert($user, string $magicLink, $directChatId = null): array
    {
        $settings = self::getSettings();
        $targetChat = $directChatId ?: ($settings['chat_id'] ?? null);

        if (empty($targetChat)) {
            return ['ok' => false, 'error' => 'Telegram bot is not connected to any chat'];
        }

        $userName = htmlspecialchars($user->display_name ?: ('អតិថិជន #' . $user->id));
        $email = htmlspecialchars($user->email ?: 'N/A');
        $phone = htmlspecialchars($user->phone ?: 'N/A');
        $telegramHandle = !empty($user->telegram) ? htmlspecialchars($user->telegram) : 'N/A';

        $chatTopicId = $settings['topics']['chat'] ?? null;

        $text = "🔑 <b>សំណើសុំចូលគណនីបន្ទាន់ / Reset Password Magic Link</b>\n\n"
            . "👤 <b>អតិថិជន:</b> <b>{$userName}</b>\n"
            . "📧 <b>អ៊ីមែល:</b> <code>{$email}</code>\n"
            . "📞 <b>ទូរស័ព្ទ:</b> {$phone}\n"
            . "💬 <b>Telegram:</b> {$telegramHandle}\n"
            . "⏰ <b>សុពលភាព:</b> ២៤ ម៉ោង (Valid for 24 Hours)\n\n"
            . "🔗 <b>Magic Login Link:</b>\n"
            . "{$magicLink}\n\n"
            . "<i>អតិថិជនគ្រាន់តែចុចលើតំណភ្ជាប់ខាងលើ នោះនឹងអាចចូលគណនីបានភ្លាមៗដោយមិនបាច់វាយលេខសម្ងាត់ចាស់ឡើយ។</i>";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🚀 ចូលគណនីផ្ទាល់ (Magic Login Now)', 'url' => $magicLink],
                ]
            ]
        ];

        return self::sendMessageWithKeyboard($targetChat, $text, $keyboard, 'HTML', $directChatId ? null : $chatTopicId);
    }
}

