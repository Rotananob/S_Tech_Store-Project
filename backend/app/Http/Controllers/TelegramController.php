<?php

namespace App\Http\Controllers;

use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramController extends Controller
{
    /**
     * Get current Telegram connection status
     */
    public function status()
    {
        $settings = TelegramService::getSettings();
        
        return response()->json([
            'connected' => (bool)($settings['connected'] ?? false),
            'chat_id' => $settings['chat_id'] ?? null,
            'chat_title' => $settings['chat_title'] ?? null,
            'chat_type' => $settings['chat_type'] ?? null,
            'connected_at' => $settings['connected_at'] ?? null,
            'connected_by' => $settings['connected_by'] ?? null,
            'bot_username' => $settings['bot_username'] ?? 'STechStoreBot',
            'notify_orders' => (bool)($settings['notify_orders'] ?? true),
            'notify_low_stock' => (bool)($settings['notify_low_stock'] ?? true),
            'notify_repairs' => (bool)($settings['notify_repairs'] ?? true),
            'notify_shifts' => (bool)($settings['notify_shifts'] ?? true),
            'topics' => $settings['topics'] ?? [],
        ]);
    }

    /**
     * Generate One-Click Connect Link & QR code token (ABA Merchant Style)
     */
    public function generateLink(Request $request)
    {
        $user = $request->input('user') ?? $request->header('X-User-Email') ?? 'Admin/Staff';
        $data = TelegramService::generatePairLink($user);

        return response()->json([
            'success' => true,
            'pair_code' => $data['pair_code'],
            'bot_username' => $data['bot_username'],
            'group_url' => $data['group_url'],
            'direct_url' => $data['direct_url'],
            'expires_in' => $data['expires_in'],
            'message' => 'Pairing link generated successfully. Add bot to group to auto-connect.',
        ]);
    }

    /**
     * Manual pair confirmation (useful if webhook not reachable on local/staging)
     */
    public function pair(Request $request)
    {
        $validated = $request->validate([
            'pair_code' => 'required|string',
            'chat_id' => 'required',
            'chat_title' => 'nullable|string',
        ]);

        $success = TelegramService::pairChat(
            $validated['pair_code'],
            $validated['chat_id'],
            $validated['chat_title'] ?? 'S Tech Store Team Group'
        );

        if (!$success) {
            return response()->json(['error' => 'Invalid or expired pair code'], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Telegram group paired successfully!',
        ]);
    }

    /**
     * Trigger or Retry Forum Topics Setup
     */
    public function setupTopics()
    {
        $settings = TelegramService::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return response()->json([
                'success' => false,
                'error' => 'សូមភ្ជាប់ Telegram Bot ទៅកាន់គ្រុបជាមុនសិន (No Telegram group connected yet).',
            ], 400);
        }

        $result = TelegramService::setupTopics($settings['chat_id']);
        return response()->json([
            'success' => $result['ok'] ?? false,
            'data' => $result,
            'message' => $result['message'] ?? '',
        ], ($result['ok'] ?? false) ? 200 : 400);
    }

    /**
     * Send test notification
     */
    public function test()
    {
        $result = TelegramService::sendTestNotification();

        if (!($result['ok'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'Failed to send test message to Telegram.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Test notification sent to Telegram group successfully!',
            'details' => $result,
        ]);
    }

    /**
     * Disconnect bot
     */
    public function disconnect()
    {
        TelegramService::disconnect();

        return response()->json([
            'success' => true,
            'message' => 'Telegram group disconnected.',
        ]);
    }

    /**
     * Update notification event toggles
     */
    public function updateSettings(Request $request)
    {
        $settings = TelegramService::getSettings();

        if ($request->has('notify_orders')) {
            $settings['notify_orders'] = (bool)$request->input('notify_orders');
        }
        if ($request->has('notify_low_stock')) {
            $settings['notify_low_stock'] = (bool)$request->input('notify_low_stock');
        }
        if ($request->has('notify_repairs')) {
            $settings['notify_repairs'] = (bool)$request->input('notify_repairs');
        }
        if ($request->has('notify_shifts')) {
            $settings['notify_shifts'] = (bool)$request->input('notify_shifts');
        }

        TelegramService::saveSettings($settings);

        return response()->json([
            'success' => true,
            'message' => 'Telegram preferences updated.',
            'settings' => $settings,
        ]);
    }

    /**
     * Public Telegram Webhook Endpoint
     * Handles /start <PAIR_CODE>, /setup_topics, and callback buttons
     */
    public function webhook(Request $request)
    {
        $update = $request->all();
        Log::info("Telegram Webhook Update received:", $update);

        // 1. Handle Inline Keyboard Callback Queries (e.g. Retry Setup button)
        if (isset($update['callback_query'])) {
            $callbackQuery = $update['callback_query'];
            $callbackData = $callbackQuery['data'] ?? '';
            $chatId = $callbackQuery['message']['chat']['id'] ?? null;
            $callbackId = $callbackQuery['id'] ?? null;

            if ($callbackData === 'setup_topics' && $chatId) {
                TelegramService::setupTopics($chatId);

                // Acknowledge callback query
                $settings = TelegramService::getSettings();
                $token = $settings['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');
                if ($token && !str_contains($token, 'Placeholder')) {
                    try {
                        \Illuminate\Support\Facades\Http::post("https://api.telegram.org/bot{$token}/answerCallbackQuery", [
                            'callback_query_id' => $callbackId,
                            'text' => 'កំពុងពិនិត្យ និងរៀបចំ Forum Topics...',
                        ]);
                    } catch (\Throwable $e) {}
                }
            }

            return response()->json(['ok' => true]);
        }

        // 2. Handle Messages
        $message = $update['message'] ?? $update['channel_post'] ?? null;

        if ($message) {
            $text = trim($message['text'] ?? '');
            $chat = $message['chat'] ?? [];
            $chatId = $chat['id'] ?? null;
            $chatTitle = $chat['title'] ?? ($chat['first_name'] ?? 'S Tech Channel');
            $chatType = $chat['type'] ?? 'group';

            // Check if text is `/start <CODE>` or `/start@BotName <CODE>`
            if (preg_match('/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]+)/', $text, $matches)) {
                $pairCode = strtoupper(trim($matches[1]));
                TelegramService::pairChat($pairCode, $chatId, $chatTitle, $chatType);
            }
            // Check if user types `/setup_topics` or `/topics` manually
            elseif (preg_match('/^\/(?:setup_topics|topics)(?:@\w+)?/i', $text)) {
                if ($chatId) {
                    TelegramService::setupTopics($chatId);
                }
            }
        }

        return response()->json(['ok' => true]);
    }
}
