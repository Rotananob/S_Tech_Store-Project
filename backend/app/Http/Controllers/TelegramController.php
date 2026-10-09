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
        TelegramService::pollPendingUpdates();

        $settings = TelegramService::getSettings();
        
        return response()->json([
            'connected' => (bool)($settings['connected'] ?? false),
            'is_configured' => TelegramService::isConfigured(),
            'chat_id' => $settings['chat_id'] ?? null,
            'chat_title' => $settings['chat_title'] ?? null,
            'chat_type' => $settings['chat_type'] ?? null,
            'connected_at' => $settings['connected_at'] ?? null,
            'connected_by' => $settings['connected_by'] ?? null,
            'bot_username' => $settings['bot_username'] ?? null,
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
        if (!TelegramService::isConfigured()) {
            return response()->json([
                'success' => false,
                'needs_config' => true,
                'error' => 'សូមបញ្ចូល Telegram Bot Token ផ្ទាល់ខ្លួនរបស់ហាងជាមុនសិន ដើម្បីកុំឲ្យច្រឡំ Bot របស់អ្នកដទៃ (Please configure your own Bot Token first).',
            ], 400);
        }

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
     * Broadcast custom announcement to connected Telegram group
     */
    public function broadcast(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
            'topic' => 'nullable|string',
        ]);

        $settings = TelegramService::getSettings();
        if (empty($settings['connected']) || empty($settings['chat_id'])) {
            return response()->json([
                'success' => false,
                'error' => 'Telegram Bot មិនទាន់បានភ្ជាប់ជាមួយ Group នៅឡើយទេ (No connected Telegram group)',
            ], 400);
        }

        $topicKey = $validated['topic'] ?? 'chat';
        $threadId = $settings['topics'][$topicKey] ?? null;

        $sender = $request->input('sender') ?? 'Admin';
        $broadcastText = "📢 <b>ការប្រកាសពីហាង ({$sender}):</b>\n\n"
            . htmlspecialchars($validated['message']) . "\n\n"
            . "⏰ <i>" . date('d-m-Y H:i:s') . "</i>";

        $res = TelegramService::sendMessage($settings['chat_id'], $broadcastText, 'HTML', $threadId);

        if (!($res['ok'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => $res['error'] ?? 'បរាជ័យក្នុងការផ្ញើសារប្រកាសទៅ Telegram',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'បានផ្ញើសារប្រកាសទៅ Telegram Group ជោគជ័យ! 🎉',
        ]);
    }

    /**
     * Update notification event toggles
     */
    public function updateSettings(Request $request)
    {
        $settings = TelegramService::getSettings();

        if ($request->has('bot_token')) {
            $token = trim((string)$request->input('bot_token'));
            if (!empty($token)) {
                $verification = TelegramService::verifyBotToken($token);
                if (!$verification['valid']) {
                    return response()->json([
                        'success' => false,
                        'error' => $verification['error'] ?? 'Bot Token មិនត្រឹមត្រូវ សូមពិនិត្យមើល Token ដែលចម្លងពី @BotFather',
                    ], 400);
                }

                $settings['bot_token'] = $token;
                $settings['bot_username'] = $verification['bot_username'];
            }
        }

        if ($request->has('bot_username') && !empty($request->input('bot_username'))) {
            $settings['bot_username'] = ltrim(trim($request->input('bot_username')), '@');
        }

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
            'message' => 'Telegram Bot settings updated successfully.',
            'settings' => [
                'connected' => (bool)($settings['connected'] ?? false),
                'is_configured' => TelegramService::isConfigured(),
                'bot_username' => $settings['bot_username'] ?? null,
                'chat_id' => $settings['chat_id'] ?? null,
                'chat_title' => $settings['chat_title'] ?? null,
                'notify_orders' => (bool)($settings['notify_orders'] ?? true),
                'notify_low_stock' => (bool)($settings['notify_low_stock'] ?? true),
                'notify_repairs' => (bool)($settings['notify_repairs'] ?? true),
                'notify_shifts' => (bool)($settings['notify_shifts'] ?? true),
            ],
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

        TelegramService::processUpdate($update);

        return response()->json(['ok' => true]);
    }
}
