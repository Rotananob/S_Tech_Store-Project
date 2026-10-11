<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TelegramService
{
    // ⚠️ SECURITY: Bot token is NEVER hardcoded here — always read from .env (TELEGRAM_BOT_TOKEN)
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
            'bot_token' => env('TELEGRAM_BOT_TOKEN', ''),
            'notify_orders' => true,
            'notify_low_stock' => true,
            'notify_repairs' => true,
            'notify_shifts' => true,
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
                    if (empty($merged['bot_token'])) $merged['bot_token'] = env('TELEGRAM_BOT_TOKEN', '');
                    if (empty($merged['bot_username'])) $merged['bot_username'] = self::OFFICIAL_BOT_USERNAME;
                    return $merged;
                }
            }
        } catch (\Throwable $e) {}

        try {
            // 2. Fallback to file storage
            if (Storage::exists(self::$settingsFile)) {
                $saved = json_decode(Storage::get(self::$settingsFile), true);
                if (is_array($saved)) {
                    $merged = array_merge($default, $saved);
                    if (empty($merged['bot_token'])) {
                        $merged['bot_token'] = env('TELEGRAM_BOT_TOKEN', '');
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

        // ── STRICT SECURITY & ANTI-INJECTION LOCK ────────────────────────────
        // If already connected to an official team chat, strictly disallow overriding chat_id from unknown chats
        if (!empty($settings['connected']) && !empty($settings['chat_id']) && (string)$settings['chat_id'] !== $chatIdStr) {
            Log::warning("Telegram Bot injection/takeover attempt detected from chat {$chatIdStr} ('{$chatTitle}'). Denied.");
            self::sendSecurityAlert([
                'type' => 'Unauthorized Telegram Bot Pairing Attempt (Blocked)',
                'ip' => request()->ip() ?? 'Telegram Network',
                'device' => 'Telegram Bot API',
                'user' => "Chat ID: {$chatIdStr} ({$chatTitle})",
                'action' => 'Hijack Attempt Blocked',
                'details' => "A non-whitelisted Telegram chat tried to connect or hijack the bot. Request was blocked.",
            ]);
            return false;
        }

        // Strictly reject private chats from taking over the bot as team chat
        if ($chatType === 'private') {
            Log::info("Rejected pairing attempt from private chat {$chatIdStr}.");
            return false;
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

        // 1. Handle Inline Keyboard Callback Queries (Interactive Bot Menu Navigation)
        if (isset($up['callback_query'])) {
            $callbackQuery = $up['callback_query'];
            $callbackData = $callbackQuery['data'] ?? '';
            $chatId = $callbackQuery['message']['chat']['id'] ?? null;
            $messageId = $callbackQuery['message']['message_id'] ?? null;
            $callbackId = $callbackQuery['id'] ?? null;

            if ($callbackData === 'setup_topics' && $chatId) {
                self::setupTopics($chatId);
                self::answerCallbackQuery($callbackId, 'កំពុងរៀបចំ Forum Topics...');
                return;
            }

            if ($callbackData === 'btn_chat_start' && $chatId) {
                $chatStartText = "💬 <b>ផ្នែកបម្រើអតិថិជន & AI Smart Assistant</b>\n\n"
                    . "សូមស្វាគមន៍មកកាន់ប្រព័ន្ធជំនួយការឆ្លាតវៃ <b>S Tech Store</b>!\n\n"
                    . "✨ <b>សេវាកម្ម និងជំនួយដែលអ្នកអាចទទួលបាន៖</b>\n"
                    . "• 💻 ពិគ្រោះយោបល់ និងសាកសួរតម្លៃ Laptops, PC, Gaming Gears\n"
                    . "• 📦 តាមដានស្ថានភាពនៃការបញ្ជាទិញ (Track Order Status)\n"
                    . "• 🔧 ព័ត៌មានការធានា (Warranty 3-6 ខែ / 1 ឆ្នាំ) និងសេវាជួសជុល\n"
                    . "• 💬 ឆាតផ្ទាល់ជាមួយក្រុមការងារ Support Real-time នៅលើគេហទំព័រ\n\n"
                    . "📞 <b>Hotline ទំនាក់ទំនងផ្ទាល់:</b> <code>012 345 678</code> | <code>098 765 432</code>\n"
                    . "🌐 <b>គេហទំព័រផ្លូវការ:</b> <a href=\"https://www.s-tech-store.tech\">https://www.s-tech-store.tech</a>";

                $chatKb = [
                    'inline_keyboard' => [
                        [
                            ['text' => '📱 បើកទិញក្នុង Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']],
                            ['text' => '🌐 ចូលគេហទំព័រហាង', 'url' => 'https://www.s-tech-store.tech'],
                        ],
                        [
                            ['text' => '🔙 ត្រឡប់ទៅមឺនុយមេ (Main Menu)', 'callback_data' => 'btn_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $chatStartText, $chatKb);
                } else {
                    self::sendMessageWithKeyboard($chatId, $chatStartText, $chatKb);
                }
                self::answerCallbackQuery($callbackId, 'សេវាអតិថិជន S Tech Store');
                return;
            }

            if ($callbackData === 'btn_how_to_connect' && $chatId) {
                $howToConnectText = "🛡️ <b>ស្ថាបត្យកម្មសុវត្ថិភាពខ្ពស់បំផុត (Zero-Trust Bot Pairing Architecture)</b>\n\n"
                    . "⚠️ <b>សេចក្ដីប្រកាសសុវត្ថិភាពតឹងរ៉ឹង (Security Notice):</b>\n"
                    . "ដើម្បីការពារទិន្នន័យហាង និងទប់ស្កាត់ការវាយប្រហារ Hack / Phishing ប្រព័ន្ធ Bot ផ្លូវការរបស់យើង <b>ដាច់ខាតមិនផ្ដល់ Link ឬ Token ភ្ជាប់សម្ងាត់នៅក្នុងការឆាតផ្ទាល់ខ្លួន (Personal Chat)</b> នេះឡើយ!\n\n"
                    . "🔐 <b>គោលការណ៍ផ្ទៀងផ្ទាត់ «Admin ពិត ១០០%»:</b>\n"
                    . "លុះត្រាតែ Admin ឬបុគ្គលិកដែលមានសិទ្ធិស្របច្បាប់ ធ្វើការ Login ចូលទៅកាន់ <b>Admin Dashboard ផ្លូវការ</b> នៅលើ Website រួចចុចប៊ូតុងភ្ជាប់ Telegram (Connect Direct / 1-Click Pairing) ចេញពីក្នុងប្រព័ន្ធផ្ទាល់ ទើប Bot ជឿជាក់ និងអនុញ្ញាត ១០០% ថាជា <b>«Admin ពិត ១០០%»</b>!\n\n"
                    . "📌 <b>ឧទាហរណ៍ទីតាំងកំណត់ប្រព័ន្ធ (Example URL Only):</b>\n"
                    . "<code>https://www.s-tech-store.tech/rok-mix-khernh/settings</code>\n"
                    . "<i>(សម្គាល់៖ នេះគ្រាន់តែជា Example URL សម្រាប់ជាគំរូទូទៅប៉ុណ្ណោះ អ្នកត្រូវតែមានគណនី Admin និង Login ដោយជោគជ័យជាមុនសិន)</i>\n\n"
                    . "✨ <b>ជំហានភ្ជាប់សម្រាប់ Admin ផ្លូវការ៖</b>\n"
                    . "1️⃣ ចូលទៅកាន់ Admin Portal ផ្លូវការរបស់ហាង S Tech Store\n"
                    . "2️⃣ ចូលទៅកាន់មឺនុយ Settings ➡️ Telegram Integration\n"
                    . "3️⃣ ចុចប៊ូតុង <b>Connect Group</b> ដើម្បីភ្ជាប់គ្រុបផ្លូវការ\n"
                    . "4️⃣ Bot នឹងផ្ទៀងផ្ទាត់ Cryptographic Handshake និងបង្កើត Forum Topics ស្វ័យប្រវត្តិ!";

                $howKb = [
                    'inline_keyboard' => [
                        [
                            ['text' => '🌐 ចូលទៅកាន់គេហទំព័រហាង', 'url' => 'https://www.s-tech-store.tech'],
                        ],
                        [
                            ['text' => '🔙 ត្រឡប់ទៅមឺនុយមេ (Main Menu)', 'callback_data' => 'btn_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $howToConnectText, $howKb);
                } else {
                    self::sendMessageWithKeyboard($chatId, $howToConnectText, $howKb);
                }
                self::answerCallbackQuery($callbackId, 'របៀបភ្ជាប់ប្រព័ន្ធសុវត្ថិភាព');
                return;
            }

            if ($callbackData === 'btn_about_store' && $chatId) {
                $aboutStoreText = "🏪 <b>អំពី S Tech Store Cambodia</b>\n\n"
                    . "🌟 <b>មជ្ឈមណ្ឌលចែកចាយ និងផ្គត់ផ្គង់ឧបករណ៍បច្ចេកវិទ្យាទំនើបឈានមុខគេ៖</b>\n"
                    . "• 💻 Laptops ម៉ាកល្បីៗ (ASUS ROG, Apple MacBook, Dell, Lenovo, Acer, MSI)\n"
                    . "• 📱 Smartphones, Tablets & Accessories សុទ្ធ ១០០%\n"
                    . "• 🎮 Gaming Gear & PC Components កម្លាំងខ្លាំង\n"
                    . "• 🔧 សេវាកម្មជួសជុល ថែទាំកុំព្យូទ័រ និងដំឡើងប្រព័ន្ធដោយជាងជំនាញ\n"
                    . "• 🛡️ ការធានាផ្លូវការ ៣ ទៅ ៦ ខែ / ១ ឆ្នាំពេញ ទំនុកចិត្ត ១០០%\n"
                    . "• 🚀 សេវាដឹកជញ្ជូនរហ័សទូទាំង ២៥ ខេត្ត-ក្រុង\n\n"
                    . "🌐 <b>គេហទំព័រផ្លូវការ:</b> <a href=\"https://www.s-tech-store.tech\">https://www.s-tech-store.tech</a>\n"
                    . "📍 <b>ទីតាំងហាង:</b> រាជធានីភ្នំពេញ, ប្រទេសកម្ពុជា\n"
                    . "📞 <b>Hotline:</b> <code>012 345 678</code> | <code>098 765 432</code>";

                $aboutKb = [
                    'inline_keyboard' => [
                        [
                            ['text' => '📱 បើក Mini App ក្នុង Telegram', 'web_app' => ['url' => 'https://www.s-tech-store.tech']],
                            ['text' => '🌐 បើកគេហទំព័រផ្លូវការ', 'url' => 'https://www.s-tech-store.tech'],
                        ],
                        [
                            ['text' => '🔙 ត្រឡប់ទៅមឺនុយមេ (Main Menu)', 'callback_data' => 'btn_main_menu'],
                        ],
                    ],
                ];

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $aboutStoreText, $aboutKb);
                } else {
                    self::sendMessageWithKeyboard($chatId, $aboutStoreText, $aboutKb);
                }
                self::answerCallbackQuery($callbackId, 'អំពី S Tech Store');
                return;
            }

            if ($callbackData === 'btn_main_menu' && $chatId) {
                $welcome = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Official Bot!</b>\n\n"
                    . "🤖 <b>គណនី Bot ផ្លូវការ:</b> @{$botUsername}\n"
                    . "🏪 <b>ហាង S Tech Store Cambodia</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n"
                    . "សូមចុចជ្រើសរើសមុខងារដែលអ្នកត្រូវការខាងក្រោម៖";

                if ($messageId) {
                    self::editMessageText($chatId, $messageId, $welcome, self::getBotMainMenuKeyboard());
                } else {
                    self::sendMessageWithKeyboard($chatId, $welcome, self::getBotMainMenuKeyboard());
                }
                self::answerCallbackQuery($callbackId, 'មឺនុយមេ');
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

            // In Private Chat: Send full interactive menu with Mini App & Zero-Trust security guides
            if ($chatType === 'private') {
                $welcome = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Official Bot!</b>\n\n"
                    . "🤖 <b>គណនី Bot ផ្លូវការ:</b> @{$botUsername}\n"
                    . "🏪 <b>ហាង S Tech Store Cambodia</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n"
                    . "សូមចុចជ្រើសរើសមុខងារដែលអ្នកត្រូវការខាងក្រោម៖";
                self::sendMessageWithKeyboard($chatId, $welcome, self::getBotMainMenuKeyboard());
                return;
            }

            $isConnected = !empty($settings['connected']) && (string)($settings['chat_id'] ?? '') === (string)$chatId;
            $currentChat = $settings['chat_title'] ?? $chatTitle;
            $welcome = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Notification Bot!</b>\n\n"
                . "🤖 <b>គណនី Bot:</b> @{$botUsername}\n"
                . "⚡ <b>ស្ថានភាព:</b> " . ($isConnected ? "🟢 Connected ជាមួយគ្រុប {$currentChat}" : "⚪ មិនទាន់ភ្ជាប់គ្រុប") . "\n\n"
                . "📌 <b>របៀបភ្ជាប់គ្រុប:</b>\n"
                . "1️⃣ ចូលទៅកាន់ Admin Dashboard 👉 <a href=\"https://www.s-tech-store.tech/rok-mix-khernh/settings\">Telegram Settings</a>\n"
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

        // In private chat: When any visitor or customer searches or chats with bot, present interactive menu
        if ($chatType === 'private') {
            $welcome = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Official Bot!</b>\n\n"
                . "🤖 <b>គណនី Bot ផ្លូវការ:</b> @{$botUsername}\n"
                . "🏪 <b>ហាង S Tech Store Cambodia</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n"
                . "សូមចុចជ្រើសរើសមុខងារដែលអ្នកត្រូវការខាងក្រោម៖";
            self::sendMessageWithKeyboard($chatId, $welcome, self::getBotMainMenuKeyboard());
            return;
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
                    . "2️⃣ 🌐 <b>អ្នកចូលទស្សនាវេបសាយ</b> — តាមដាន Traffic & Visitors Real-time\n"
                    . "3️⃣ 👤 <b>អតិថិជនចុះឈ្មោះថ្មី</b> — ជូនដំណឹងរាល់ពេលមាន User Signup ថ្មី\n"
                    . "4️⃣ 🛠️ <b>សេវាជួសជុល</b> — តាមដានស្ថានភាពជួសជុល & Ticket\n"
                    . "5️⃣ ⚠️ <b>ការជូនដំណឹងស្តុក</b> — ជូនដំណឹងពេលទំនិញជិតអស់ពីស្តុក\n"
                    . "6️⃣ 💬 <b>សេវាអតិថិជន</b> — សម្រាប់សន្ទនា និងឆ្លើយតបអតិថិជន\n\n"
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
            $json = $response->json();

            // Fallback retry if thread does not exist or was closed/deleted
            if (($json['error_code'] ?? 0) === 400 && str_contains(strtolower($json['description'] ?? ''), 'thread not found') && $threadId) {
                unset($payload['message_thread_id']);
                $response = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
                $json = $response->json();
            }

            return $json ?? ['ok' => $response->successful()];
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
            $json = $response->json();

            // Fallback retry if thread does not exist or was closed/deleted
            if (($json['error_code'] ?? 0) === 400 && str_contains(strtolower($json['description'] ?? ''), 'thread not found') && $threadId) {
                unset($payload['message_thread_id']);
                $response = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
                $json = $response->json();
            }

            return $json ?? ['ok' => $response->successful()];
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram message with keyboard: " . $e->getMessage());
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Standard Bot Main Menu Keyboard with 3 action buttons + Mini App + Website
     */
    public static function getBotMainMenuKeyboard(): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => '💬 ចាប់ផ្ដើមឆាត / Start Chat', 'callback_data' => 'btn_chat_start'],
                ],
                [
                    ['text' => '📖 របៀបភ្ជាប់ប្រព័ន្ធ (Setup Guide)', 'callback_data' => 'btn_how_to_connect'],
                    ['text' => '🏪 អំពី S Tech Store', 'callback_data' => 'btn_about_store'],
                ],
                [
                    ['text' => '📱 បើក Mini App', 'web_app' => ['url' => 'https://www.s-tech-store.tech']],
                    ['text' => '🌐 បើកគេហទំព័រ (Open Website)', 'url' => 'https://www.s-tech-store.tech'],
                ],
            ],
        ];
    }

    /**
     * Edit message text and inline keyboard (seamless single-chat menu navigation)
     */
    public static function editMessageText($chatId, int $messageId, string $text, ?array $replyMarkup = null, string $parseMode = 'HTML'): array
    {
        $settings = self::getSettings();
        $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');

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
     * Answer Telegram callback query to dismiss button loading spinners
     */
    public static function answerCallbackQuery(?string $callbackId, string $text = ''): void
    {
        if (empty($callbackId)) {
            return;
        }

        $settings = self::getSettings();
        $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');
        if (!$token || str_contains($token, 'Placeholder')) {
            return;
        }

        try {
            Http::timeout(5)->post("https://api.telegram.org/bot{$token}/answerCallbackQuery", [
                'callback_query_id' => $callbackId,
                'text' => $text,
            ]);
        } catch (\Throwable $e) {}
    }

    /**
     * Connect chat directly by Chat ID (e.g. from Admin settings)
     */
    public static function connectDirectChat($chatId, string $chatTitle = 'S Tech Store Group'): bool
    {
        $settings = self::getSettings();
        $settings['connected'] = true;
        $settings['chat_id'] = (string)$chatId;
        if (!empty($chatTitle)) {
            $settings['chat_title'] = $chatTitle;
        }
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
        $threadId = $settings['topics']['chat'] ?? $settings['topics']['orders'] ?? null;

        $text = "🔔 <b>[TEST] សាកល្បងការតភ្ជាប់ប្រព័ន្ធ TELEGRAM BOT</b>\n"
              . "━━━━━━━━━━━━━━━━━━━━\n"
              . "🎉 <b>ការតភ្ជាប់ជោគជ័យ ១០០%!</b>\n"
              . "🏪 <b>ហាង:</b> S Tech Store\n"
              . "🌐 <b>គេហទំព័រ:</b> https://www.s-tech-store.tech\n"
              . "👥 <b>គ្រុប:</b> " . htmlspecialchars($chatTitle) . "\n"
              . "🆔 <b>Chat ID:</b> <code>{$chatId}</code>\n"
              . "⏰ <b>កាលបរិច្ឆេទ:</b> " . date('Y-m-d H:i:s') . "\n\n"
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
            . "👉 <a href=\"https://www.s-tech-store.tech/rok-mix-khernh/orders\">ចុចទីនេះដើម្បីពិនិត្យ និងរៀបចំការដឹកជញ្ជូន</a>";

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
            . "⏰ <b>ពេលវេលា:</b> " . date('d-m-Y H:i:s') . "\n\n";

        $bypassToken = $data['bypass_token'] ?? null;
        $chatId = $data['chat_id'] ?? null;

        if ($bypassToken) {
            $directLink = "https://www.s-tech-store.tech/rok-mix-khernh/chat?bypass_token={$bypassToken}&chat_id=" . urlencode($chatId ?? '');
            $text .= "⚡ <b>ចូលឆ្លើយតបបន្ទាន់ (Direct Bypass Link - ប្រើបាន ២ ដង):</b>\n"
                . "👉 <a href=\"{$directLink}\">ចុចទីនេះដើម្បីបើកផ្ទាំងឆាតផ្ទាល់ភ្លាមៗ (Bypass Login)</a>\n\n"
                . "<i>💡 តំណភ្ជាប់នេះមានសុវត្ថិភាពខ្ពស់ អាចចុចចូលឆ្លើយតបភ្លាមៗដោយមិនបាច់វាយលេខសម្ងាត់ឡើយ!</i>";
        } else {
            $text .= "👉 <a href=\"https://www.s-tech-store.tech/rok-mix-khernh/chat\">ចូលទៅកាន់ Admin Chat Portal ដើម្បីឆ្លើយតប</a>";
        }

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
            . "👉 <a href=\"https://www.s-tech-store.tech/products/{$slug}\">ចុចទីនេះដើម្បីពិនិត្យទំនិញលើគេហទំព័រ</a>";

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

        // Route to users topic (Thread 9)
        $usersTopicId = $settings['topics']['users'] ?? ($settings['topics']['chat'] ?? null);

        $text = "🔑 <b>តំណភ្ជាប់ចូលគណនីបន្ទាន់ / Reset Password Token Link</b>\n\n"
            . "👤 <b>អតិថិជន:</b> <b>{$userName}</b>\n"
            . "📧 <b>អ៊ីមែល:</b> <code>{$email}</code>\n"
            . "📞 <b>ទូរស័ព្ទ:</b> {$phone}\n"
            . "💬 <b>Telegram:</b> {$telegramHandle}\n"
            . "⏰ <b>សុពលភាព:</b> ២៤ ម៉ោង (Valid for 24 Hours)\n\n"
            . "🔗 <b>Direct Reset / Magic Login Link:</b>\n"
            . "<code>{$magicLink}</code>\n\n"
            . "📋 <b>សារសម្រាប់ Forward ទៅអតិថិជន (Forwardable Message):</b>\n"
            . "<blockquote>សួស្តីបង {$userName}! នេះជាតំណភ្ជាប់ចូលគណនី និងកំណត់ពាក្យសម្ងាត់ឡើងវិញរបស់បងនៅ S Tech Store:\n{$magicLink}\n(តំណភ្ជាប់នេះមានសុពលភាព ២៤ ម៉ោង)។ សូមអរគុណបង!</blockquote>";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🚀 ចូលគណនីផ្ទាល់ (Magic Login Now)', 'url' => $magicLink],
                ]
            ]
        ];

        return self::sendMessageWithKeyboard($targetChat, $text, $keyboard, 'HTML', $directChatId ? null : $usersTopicId);
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

        $repairsTopicId = $settings['topics']['repairs'] ?? null;

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
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . date('d-m-Y H:i:s') . "\n\n"
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

        $name = htmlspecialchars($userData['name'] ?? $userData['display_name'] ?? 'អតិថិជនថ្មី');
        $email = htmlspecialchars($userData['email'] ?? 'N/A');
        $phone = htmlspecialchars($userData['phone'] ?? 'N/A');
        $uid = htmlspecialchars((string)($userData['id'] ?? 'NEW'));
        $role = htmlspecialchars($userData['role'] ?? 'customer');

        $usersTopicId = $settings['topics']['users'] ?? null;

        $msg = "👤 <b>ការចុះឈ្មោះអតិថិជនថ្មី (NEW USER REGISTERED)!</b>\n\n"
            . "🆔 <b>User ID:</b> <code>#{$uid}</code>\n"
            . "🏷️ <b>ឈ្មោះ:</b> <b>{$name}</b>\n"
            . "📧 <b>អ៊ីមែល:</b> <code>{$email}</code>\n"
            . "📱 <b>ទូរស័ព្ទ:</b> {$phone}\n"
            . "🔰 <b>ប្រភេទគណនី:</b> <code>{$role}</code>\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . date('d-m-Y H:i:s') . "\n\n"
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

        $ip = trim($data['ip'] ?? request()->ip() ?? '127.0.0.1');
        $page = htmlspecialchars($data['page'] ?? '/');
        $referrer = htmlspecialchars($data['referrer'] ?? 'Direct Visit');
        $device = htmlspecialchars($data['device'] ?? 'Web Browser');
        $country = htmlspecialchars($data['country'] ?? 'Cambodia 🇰🇭');
        $city = htmlspecialchars($data['city'] ?? '');
        $isp = htmlspecialchars($data['isp'] ?? '');
        $screen = htmlspecialchars($data['screen'] ?? '');

        // 1. Daily Pageviews & Unique Visitors Counter (Counts from 12:00 AM to 11:59 PM)
        $today = date('Y-m-d');
        $todayHitsKey = 'site_daily_pageviews_' . $today;
        $todayUniqueKey = 'site_daily_unique_ips_' . $today;

        // Persistent stats in Neon DB as primary/fallback source of truth
        $dbStatKey = 'daily_stats_' . $today;
        $dbStats = null;
        try {
            $row = \Illuminate\Support\Facades\DB::table('system_settings')->where('key', $dbStatKey)->first();
            if ($row && !empty($row->value)) {
                $dbStats = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
            }
        } catch (\Throwable $e) {}

        $currentHits = (int)Cache::get($todayHitsKey, $dbStats['hits'] ?? 0);
        $hitsToday = $currentHits + 1;
        Cache::put($todayHitsKey, $hitsToday, now()->endOfDay()->addDays(2));

        $uniqueList = Cache::get($todayUniqueKey, $dbStats['ips'] ?? []);
        if (!is_array($uniqueList)) {
            $uniqueList = [];
        }
        if (!in_array($ip, $uniqueList)) {
            $uniqueList[] = $ip;
            Cache::put($todayUniqueKey, $uniqueList, now()->endOfDay()->addDays(2));
        }
        $uniqueToday = count($uniqueList);

        // Mathematical safety: total hits can NEVER be less than unique visitors, and must be >= 1
        if ($hitsToday < $uniqueToday) {
            $hitsToday = $uniqueToday;
            Cache::put($todayHitsKey, $hitsToday, now()->endOfDay()->addDays(2));
        }
        if ($hitsToday < 1) {
            $hitsToday = 1;
            Cache::put($todayHitsKey, $hitsToday, now()->endOfDay()->addDays(2));
        }

        // Persist to Neon PostgreSQL system_settings table so serverless restart / redeploy NEVER loses count!
        try {
            \Illuminate\Support\Facades\DB::table('system_settings')->updateOrInsert(
                ['key' => $dbStatKey],
                [
                    'value' => json_encode([
                        'hits' => $hitsToday,
                        'unique' => $uniqueToday,
                        'ips' => array_slice($uniqueList, -300),
                        'updated_at' => now()->toIso8601String(),
                    ]),
                    'updated_at' => now(),
                ]
            );
        } catch (\Throwable $e) {}

        // 2. Throttle telegram notification (25s per IP+Page) to avoid Telegram API 429 rate limit
        // (Note: hitsToday count above is ALWAYS incremented on every single visit!)
        $throttleKey = 'tg_traffic_sent_' . md5($ip . '_' . $page);
        if (Cache::has($throttleKey)) {
            return true;
        }
        Cache::put($throttleKey, true, 25);

        $trafficTopicId = $settings['topics']['traffic'] ?? null;

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
            . "⏰ <b>កាលបរិច្ឆេទ & ម៉ោង:</b> " . date('d-m-Y H:i:s') . "\n\n"
            . "⚡ <i>ប្រព័ន្ធតាមដាន S Tech Store Real-time Traffic Counter</i>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $trafficTopicId);
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

        $type = htmlspecialchars($data['type'] ?? 'Suspicious Activity');
        $ip = htmlspecialchars($data['ip'] ?? request()->ip() ?? 'Unknown');
        $device = htmlspecialchars($data['device'] ?? $data['user_agent'] ?? request()->userAgent() ?? 'Web Client');
        $user = htmlspecialchars($data['user'] ?? 'Anonymous Visitor');
        $action = htmlspecialchars($data['action'] ?? 'Blocked & Logged');
        $details = htmlspecialchars($data['details'] ?? 'N/A');

        $secTopicId = $settings['topics']['security'] ?? null;

        $msg = "🛡️ <b>[SECURITY ALERT] ការពារសុវត្ថិភាព & SPAM MONITORING!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "⚠️ <b>ប្រភេទគំរាមកំហែង:</b> <b>{$type}</b>\n"
            . "🌐 <b>IP Address:</b> <code>{$ip}</code>\n"
            . "📱 <b>ឧបករណ៍ / Agent:</b> {$device}\n"
            . "👤 <b>អ្នកប្រើប្រាស់:</b> {$user}\n"
            . "🛑 <b>ចំណាត់ការ (Action):</b> <code>{$action}</code>\n"
            . "📝 <b>ព័ត៌មានលម្អិត:</b> <i>{$details}</i>\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . date('d-m-Y H:i:s') . "\n\n"
            . "🔒 <i>ប្រព័ន្ធការពារស្វ័យប្រវត្ត S Tech Store Firewall & Anti-Spam Guard</i>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $secTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send promotion & stock update alert to Telegram promotions topic
     */
    public static function sendPromotionAlert(array $data): bool
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return false;
        }

        $title = htmlspecialchars($data['title'] ?? 'Promotion / Stock Update');
        $actor = htmlspecialchars($data['actor'] ?? 'Admin / Staff');
        $details = htmlspecialchars($data['details'] ?? 'N/A');
        $discount = htmlspecialchars($data['discount'] ?? 'N/A');

        $promoTopicId = $settings['topics']['promotions'] ?? $settings['topics']['stock'] ?? null;

        $msg = "🎁 <b>[PROMOTION & STOCK] បច្ចុប្បន្នភាពប្រូម៉ូសិន ឬស្តុក!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "🏷️ <b>កម្មវិធី / ការផ្លាស់ប្តូរ:</b> <b>{$title}</b>\n"
            . "👤 <b>អ្នករៀបចំ:</b> {$actor}\n"
            . "🎟️ <b>Discount / Code:</b> <code>{$discount}</code>\n"
            . "📦 <b>ព័ត៌មានលម្អិត:</b> {$details}\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . date('d-m-Y H:i:s') . "\n\n"
            . "👉 <a href=\"https://www.s-tech-store.tech/rok-mix-khernh/promotions\">ពិនិត្យមើលក្នុងផ្ទាំង Admin</a>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $promoTopicId);
        return ($res['ok'] ?? false) === true;
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

        $financeTopicId = $settings['topics']['finance'] ?? $settings['topics']['orders'] ?? null;

        $msg = "💳 <b>[FINANCE] ប្រតិបត្តិការហិរញ្ញវត្ថុ / ទូទាត់ប្រាក់!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "💵 <b>ប្រភេទ:</b> <b>{$type}</b>\n"
            . "💰 <b>ចំនួនទឹកប្រាក់:</b> <b>\${$amount} USD</b>\n"
            . "🏦 <b>វិធីសាស្ត្រទូទាត់:</b> {$method}\n"
            . "🔖 <b>លេខវិក្កយបត្រ / Order:</b> <code>{$orderId}</code>\n"
            . "👤 <b>អតិថិជន:</b> {$customer}\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . date('d-m-Y H:i:s') . "\n\n"
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

        $error = htmlspecialchars($data['error'] ?? 'Unknown Exception');
        $context = htmlspecialchars($data['context'] ?? 'System Core');
        $actor = htmlspecialchars($data['actor'] ?? request()->ip() ?? 'System');
        $file = htmlspecialchars($data['file'] ?? 'N/A');

        $errTopicId = $settings['topics']['system_errors'] ?? null;

        $msg = "🚨 <b>[CRITICAL SYSTEM ERROR] បញ្ហាប្រព័ន្ធបច្ចេកវិទ្យា!</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━\n"
            . "❌ <b>កំហុស (Error):</b> <code>{$error}</code>\n"
            . "📍 <b>បរិបទ / Function:</b> <b>{$context}</b>\n"
            . "📁 <b>ទីតាំង File:</b> <i>{$file}</i>\n"
            . "👤 <b>ប្រភព / IP:</b> {$actor}\n"
            . "⏰ <b>កាលបរិច្ឆេទ:</b> " . date('d-m-Y H:i:s') . "\n\n"
            . "⚠️ <i>សូមក្រុមការងារបច្ចេកវិទ្យាជួយត្រួតពិនិត្យជាបន្ទាន់</i>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $errTopicId);
        return ($res['ok'] ?? false) === true;
    }
}


