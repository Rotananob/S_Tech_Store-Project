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

        // Send welcome & confirmation message into the group
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
            . "<i>Bot ដំណើរការ ២៤/៧ ដោយស្វ័យប្រវត្តិ។</i>";

        self::sendMessage($chatId, $welcomeText);

        return true;
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

        return self::saveSettings($settings);
    }

    /**
     * Send message using Telegram Bot API
     */
    public static function sendMessage($chatId, string $text, string $parseMode = 'HTML'): array
    {
        $settings = self::getSettings();
        $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');

        if (!$token || str_contains($token, 'Placeholder')) {
            Log::info("[Telegram] Mock send to {$chatId}: {$text}");
            return ['ok' => true, 'mock' => true, 'message' => 'Telegram token is placeholder. Notification logged.'];
        }

        try {
            $response = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => $parseMode,
                'disable_web_page_preview' => false,
            ]);

            return $response->json() ?? ['ok' => $response->successful()];
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram message: " . $e->getMessage());
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send rich Order Notification to connected Telegram group
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
            . "👉 <a href=\"https://s-tech-store.vercel.app/admin/orders\">ចុចទីនេះដើម្បីពិនិត្យ និងរៀបចំការដឹកជញ្ជូន</a>";

        $res = self::sendMessage($settings['chat_id'], $msg);
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
