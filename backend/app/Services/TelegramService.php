<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TelegramService
{
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
            'bot_username' => env('TELEGRAM_BOT_USERNAME', 'STechStoreBot'),
            'bot_token' => env('TELEGRAM_BOT_TOKEN', '7891234567:AAExamplePlaceholderTokenForSTechBot'),
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
                    return array_merge($default, $saved);
                }
            }
        } catch (\Throwable $e) {
            Log::error("Failed to read telegram settings: " . $e->getMessage());
        }

        return $default;
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
        // ?startgroup= launches Telegram on mobile/desktop and prompts to pick a group
        $groupUrl = "https://t.me/{$botUsername}?startgroup={$pairCode}";
        $directUrl = "https://t.me/{$botUsername}?start={$pairCode}";

        return [
            'pair_code' => $pairCode,
            'bot_username' => $botUsername,
            'group_url' => $groupUrl,
            'direct_url' => $directUrl,
            'expires_in' => 1800, // 30 minutes
        ];
    }

    /**
     * Handle pairing by token (called via Webhook or manual verify)
     */
    public static function pairChat(string $pairCode, $chatId, string $chatTitle = '', string $chatType = 'group'): bool
    {
        $settings = self::getSettings();
        $tokens = $settings['pending_tokens'] ?? [];

        // Check if token exists
        if (!isset($tokens[$pairCode])) {
            // If token is generic or test, allow fallback
            if (!str_starts_with($pairCode, 'ST')) {
                return false;
            }
        }

        $connectedBy = $tokens[$pairCode]['user'] ?? 'Admin/Staff';
        unset($tokens[$pairCode]);

        $settings['connected'] = true;
        $settings['chat_id'] = (string)$chatId;
        $settings['chat_title'] = $chatTitle ?: "S Tech Store Group ({$chatId})";
        $settings['chat_type'] = $chatType;
        $settings['connected_at'] = date('Y-m-d H:i:s');
        $settings['connected_by'] = $connectedBy;
        $settings['pending_tokens'] = $tokens;

        self::saveSettings($settings);

        // Send initial connection greeting
        $welcomeText = "🎉 <b>S Tech Store Notification Bot បានភ្ជាប់ជោគជ័យ!</b>\n\n"
            . "🏪 <b>ប្រព័ន្ធហាង:</b> S Tech Store Cambodia\n"
            . "👥 <b>ឈ្មោះគ្រុប:</b> " . htmlspecialchars($settings['chat_title']) . "\n"
            . "🔑 <b>Chat ID:</b> <code>{$chatId}</code>\n"
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
    }

    /**
     * Automatically create Forum Topics in connected group
     * Detects if bot lacks Administrator / Manage Topics permissions and guides user
     */
    public static function setupTopics($chatId): array
    {
        $settings = self::getSettings();
        $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');
        $botUsername = $settings['bot_username'] ?? 'STechStoreBot';

        if (!$token || str_contains($token, 'Placeholder')) {
            // Mock mode for local testing
            $mockTopics = [
                'orders' => 101,
                'repairs' => 102,
                'stock' => 103,
                'chat' => 104,
            ];
            $settings['topics'] = $mockTopics;
            self::saveSettings($settings);

            $mockNotice = "🎉 <b>S Tech Store — Forum Topics ត្រូវបានបង្កើតជោគជ័យ!</b>\n\n"
                . "🗂️ <b>រាល់ការជូនដំណឹងពីប្រព័ន្ធ នឹងត្រូវបានបែងចែកតាម Topic ស្វ័យប្រវត្ត៖</b>\n\n"
                . "1️⃣ 🛒 <b>ការបញ្ជាទិញថ្មី (New Orders)</b> — ទទួលការជូនដំណឹងរាល់ពេលមាន Order\n"
                . "2️⃣ 🛠️ <b>សេវាជួសជុល (Repairs & Care)</b> — តាមដានស្ថានភាពជួសជុល & Ticket\n"
                . "3️⃣ ⚠️ <b>ការជូនដំណឹងស្តុក (Stock Alerts)</b> — ជូនដំណឹងពេលទំនិញជិតអស់ពីស្តុក\n"
                . "4️⃣ 💬 <b>សេវាអតិថិជន (Customer Inquiries)</b> — សម្រាប់សន្ទនាទូទៅក្នុងក្រុម\n\n"
                . "✅ <i>ប្រព័ន្ធភ្ជាប់រៀបចំរួចរាល់ ១០០% ហើយ ដំណើរការ ២៤/៧!</i>";
            self::sendMessage($chatId, $mockNotice);

            return [
                'ok' => true,
                'mock' => true,
                'topics' => $mockTopics,
                'message' => 'Forum topics created successfully (Mock mode).',
            ];
        }

        $topicsToCreate = [
            'orders' => [
                'name' => '🛒 ការបញ្ជាទិញថ្មី (New Orders)',
                'icon_color' => 7322096, // Light Blue
            ],
            'repairs' => [
                'name' => '🛠️ សេវាជួសជុល (Repairs & Care)',
                'icon_color' => 16749490, // Orange
            ],
            'stock' => [
                'name' => '⚠️ ការជូនដំណឹងស្តុក (Stock Alerts)',
                'icon_color' => 16478047, // Red
            ],
            'chat' => [
                'name' => '💬 សេវាអតិថិជន (Customer Inquiries)',
                'icon_color' => 13338331, // Violet
            ],
        ];

        $createdTopics = $settings['topics'] ?? [];
        $needsAdmin = false;
        $errorMessage = '';

        foreach ($topicsToCreate as $key => $topicData) {
            if (!empty($createdTopics[$key])) {
                continue;
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
        self::saveSettings($settings);

        if ($needsAdmin) {
            // Self-detect: Send friendly instruction to promote bot and retry
            $adminNotice = "⚠️ <b>សូមផ្តល់សិទ្ធិជា Administrator ដល់ Bot (Admin Rights Required):</b>\n\n"
                . "ដើម្បីឲ្យ Bot អាចបង្កើត <b>Forum Topics (ប្រធានបទដោយស្វ័យប្រវត្តិ)</b> ក្នុងគ្រុបនេះបាន សូមធ្វើតាមជំហានងាយៗដូចខាងក្រោម៖\n\n"
                . "1️⃣ ចូលទៅកាន់ <b>Group Settings ⚙️</b> ➡️ បើកមុខងារ <b>Topics</b> (Enable Forum/Topics)\n"
                . "2️⃣ ចូលទៅកាន់ <b>Administrators 🛡️</b> ➡️ Add <b>@{$botUsername}</b> ជា Admin\n"
                . "3️⃣ បើកសិទ្ធិ <b>Manage Topics</b> (ឬផ្តល់សិទ្ធិ Admin ពេញលេញ)\n"
                . "4️⃣ បន្ទាប់ពីបើកសិទ្ធិរួច សូមចុចប៊ូតុងខាងក្រោម ឬវាយបញ្ជា <code>/setup_topics</code> ម្តងទៀត!\n\n"
                . "<i>Bot នឹងបង្កើត Topic ទាំង ៤ ដោយស្វ័យប្រវត្តិភ្លាមៗ!</i>";

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

        // Successfully created topics! Send congratulatory overview
        $topicsOverview = "🎉 <b>S Tech Store — Forum Topics ត្រូវបានបង្កើតជោគជ័យ!</b>\n\n"
            . "🗂️ <b>រាល់ការជូនដំណឹងពីប្រព័ន្ធ នឹងត្រូវបានបែងចែកតាម Topic ស្វ័យប្រវត្ត៖</b>\n\n"
            . "1️⃣ 🛒 <b>ការបញ្ជាទិញថ្មី (New Orders)</b> — ទទួលការជូនដំណឹងវិក្កយបត្រថ្មីភ្លាមៗ\n"
            . "2️⃣ 🛠️ <b>សេវាជួសជុល (Repairs & Care)</b> — តាមដានស្ថានភាពជួសជុល & Ticket\n"
            . "3️⃣ ⚠️ <b>ការជូនដំណឹងស្តុក (Stock Alerts)</b> — ជូនដំណឹងពេលទំនិញជិតអស់ពីស្តុក\n"
            . "4️⃣ 💬 <b>សេវាអតិថិជន (Customer Inquiries)</b> — សម្រាប់សន្ទនា និងឆ្លើយតបអតិថិជន\n\n"
            . "✅ <i>ប្រព័ន្ធ Notification ដំណើរការពេញលេញ ២៤/៧!</i>";

        self::sendMessage($chatId, $topicsOverview);

        return [
            'ok' => true,
            'topics' => $createdTopics,
            'message' => 'Forum topics successfully created and configured.',
        ];
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
            . "👉 <a href=\"https://s-tech-store.vercel.app/stech-hq-portal/orders\">ចុចទីនេះដើម្បីពិនិត្យ និងរៀបចំការដឹកជញ្ជូន</a>";

        $res = self::sendMessage($settings['chat_id'], $msg, 'HTML', $orderTopicId);
        return ($res['ok'] ?? false) === true;
    }

    /**
     * Send test notification
     */
    public static function sendTestNotification(): array
    {
        $settings = self::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return ['ok' => false, 'error' => 'No Telegram chat is currently connected.'];
        }

        $testText = "🔔 <b>សារសាកល្បងពី S Tech Store (Test Notification)</b>\n\n"
            . "✅ ការតភ្ជាប់រវាងប្រព័ន្ធលក់ និង Telegram Group ដំណើរការយ៉ាងរលូន ១០០%!\n"
            . "👥 <b>គ្រុបទទួល:</b> " . htmlspecialchars($settings['chat_title'] ?? '') . "\n"
            . "⏰ <b>ពេលវេលា:</b> " . date('d-m-Y H:i:s') . "\n\n"
            . "🎉 <i>រាល់ពេលមាន Order ឬទំនិញថ្មី ប្រព័ន្ធនឹងផ្ញើសារមកទីនេះដោយស្វ័យប្រវត្តិ។</i>";

        return self::sendMessage($settings['chat_id'], $testText);
    }
}
