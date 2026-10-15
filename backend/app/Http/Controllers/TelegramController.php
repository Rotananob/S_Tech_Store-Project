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
    public function status(Request $request)
    {
        $settings = TelegramService::getSettings();

        // Quick-poll updates if explicitly requested via ?check_now=1 with short 2s cooldown for instant 1-click detection
        if ($request->boolean('check_now') && (empty($settings['connected']) || !empty($settings['pending_tokens']))) {
            $cacheKey = 'tg_poll_status_cooldown';
            if (\Illuminate\Support\Facades\Cache::add($cacheKey, 1, 2)) {
                try {
                    TelegramService::pollPendingUpdates(0);
                    $settings = TelegramService::getSettings();
                } catch (\Throwable $e) {}
            }
        }
        
        return response()->json([
            'connected' => (bool)($settings['connected'] ?? false),
            'is_configured' => TelegramService::isConfigured(),
            'chat_id' => $settings['chat_id'] ?? null,
            'chat_title' => $settings['chat_title'] ?? null,
            'chat_type' => $settings['chat_type'] ?? null,
            'connected_at' => $settings['connected_at'] ?? null,
            'connected_by' => $settings['connected_by'] ?? null,
            'bot_username' => $settings['bot_username'] ?? null,
            'customer_bot_username' => TelegramService::getCustomerBotUsername(),
            'customer_bot_configured' => !empty(TelegramService::getCustomerBotToken()),
            'customer_bot_miniapp_url' => 'https://www.s-tech-store.tech',
            'notify_orders' => (bool)($settings['notify_orders'] ?? true),
            'notify_low_stock' => (bool)($settings['notify_low_stock'] ?? true),
            'notify_repairs' => (bool)($settings['notify_repairs'] ?? true),
            'notify_shifts' => (bool)($settings['notify_shifts'] ?? true),
            'topics' => $settings['topics'] ?? [],
        ]);
    }

    /**
     * Generate One-Click Connect Link & QR code token (1-Click Group Pairing)
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

        // 1. Ensure webhook is registered if public HTTPS URL exists
        TelegramService::ensureWebhookRegistered();

        // 2. Launch autonomous background radar poller on server (runs for 90s, 1s interval)
        // Ensures instant pairing & topic creation in Telegram even when admin does not return to site
        TelegramService::startBackgroundRadarPoller($data['pair_code']);

        return response()->json([
            'success' => true,
            'pair_code' => $data['pair_code'],
            'bot_username' => $data['bot_username'],
            'group_url' => $data['group_url'],
            'tg_app_url' => $data['tg_app_url'] ?? null,
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
            'pair_code' => 'nullable|string',
            'chat_id' => 'required',
            'chat_title' => 'nullable|string',
        ]);

        if (!empty($validated['pair_code'])) {
            $success = TelegramService::pairChat(
                $validated['pair_code'],
                $validated['chat_id'],
                $validated['chat_title'] ?? 'S Tech Store Team Group'
            );
        } else {
            $success = TelegramService::connectDirectChat(
                $validated['chat_id'],
                $validated['chat_title'] ?? 'S Tech Store Team Group'
            );
        }

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

        // Idempotency guard: If topics are already set up and non-empty, do not call Telegram API again
        if (!empty($settings['topics']) && is_array($settings['topics']) && count($settings['topics']) >= 4) {
            return response()->json([
                'success' => true,
                'already_exists' => true,
                'data' => [
                    'ok' => true,
                    'topics' => $settings['topics'],
                ],
                'message' => 'ប្រធានបទ Topics ត្រូវបានរៀបចំរួចរាល់ហើយក្នុងគ្រុប (Topics already set up).',
            ], 200);
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
     * Setup Customer Assistant Bot (Commands, native Mini App chat menu button, descriptions)
     */
    public function setupCustomerBot(Request $request)
    {
        $res = TelegramService::setupCustomerBotCommandsAndMenu();
        return response()->json($res);
    }

    /**
     * Public Telegram Webhook Endpoint
     * Handles /start <PAIR_CODE>, customer commands, FAQ inquiries, and callback buttons
     */
    public function webhook(Request $request)
    {
        $webhookSecret = env('TELEGRAM_WEBHOOK_SECRET');
        if (!empty($webhookSecret)) {
            $providedSecret = $request->header('X-Telegram-Bot-Api-Secret-Token');
            if ($providedSecret !== $webhookSecret) {
                Log::warning("Unauthorized Telegram Webhook invocation from IP: " . $request->ip());
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }

        $update = $request->all();
        $botParam = $request->query('bot', '');

        // ⚡ INSTANT LOCAL-FIRST CALLBACK ACKNOWLEDGMENT:
        // When user clicks any inline button in Telegram, respond with method 'answerCallbackQuery'
        // directly in the webhook HTTP response. This stops the top bar "Loading..." pill and button
        // spinner immediately (< 50ms) without waiting for external network or database roundtrips!
        $callbackQuery = $update['callback_query'] ?? null;
        $callbackId = $callbackQuery['id'] ?? null;
        $callbackData = $callbackQuery['data'] ?? '';
        $quickToast = $callbackId ? TelegramService::getQuickToast($callbackData) : '';

        $responsePayload = ['ok' => true];
        if (!empty($callbackId)) {
            $cbChatId = $callbackQuery['message']['chat']['id'] ?? $callbackQuery['from']['id'] ?? null;
            $cbMessageId = $callbackQuery['message']['message_id'] ?? null;
            $fromName = trim(($callbackQuery['from']['first_name'] ?? '') . ' ' . ($callbackQuery['from']['last_name'] ?? '')) ?: 'អតិថិជន';

            if ($callbackData === 'cust_my_orders' && $cbChatId && $cbMessageId) {
                $orderMenuText = "📦 <b>ការពិនិត្យមើលប្រវត្តិបញ្ជាទិញ (My Orders Hub):</b>\n"
                    . "━━━━━━━━━━━━━━━━━━━━\n"
                    . "ជម្រាបសួរ <b>" . htmlspecialchars($fromName) . "</b>!\n"
                    . "សូមជ្រើសរើសជម្រើសចន្លោះកាលបរិច្ឆេទដែលលោកអ្នកចង់ពិនិត្យមើល៖\n\n"
                    . "• 📅 <b>«ការ Order ថ្ងៃនេះ»</b> — មើលទំនិញដែលបានកុម្ម៉ង់ក្នុងថ្ងៃនេះ\n"
                    . "• 🗓️ <b>«ការ Order សប្ដាហ៍នេះ»</b> — មើលទំនិញ ៧ ថ្ងៃចុងក្រោយ\n"
                    . "• 📦 <b>«ការ Order ទាំងអស់»</b> — ប្រវត្តិបញ្ជាទិញសរុប\n"
                    . "• 📆 <b>«ជ្រើសរើសថ្ងៃជាក់លាក់»</b> — ម្សិលមិញ ឬកាលបរិច្ឆេទណាមួយ\n\n"
                    . "👉 <i>សូមចុចប៊ូតុងជម្រើសខាងក្រោម៖</i>";

                $responsePayload = [
                    'method' => 'editMessageText',
                    'chat_id' => $cbChatId,
                    'message_id' => $cbMessageId,
                    'text' => $orderMenuText,
                    'parse_mode' => 'HTML',
                    'reply_markup' => [
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
                                ['text' => '📱 មើល Orders ក្នុង Mini App', 'web_app' => ['url' => "https://www.s-tech-store.tech/orders?tg_token={$cbChatId}"]],
                            ],
                            [
                                ['text' => '🛍️ ចូលទិញទំនិញក្នុង Mini App', 'web_app' => ['url' => "https://www.s-tech-store.tech/?tg_token={$cbChatId}"]],
                                ['text' => '🔙 មឺនុយមេ', 'callback_data' => 'cust_main_menu'],
                            ],
                        ],
                    ],
                ];
            } else {
                $responsePayload = [
                    'method' => 'answerCallbackQuery',
                    'callback_query_id' => $callbackId,
                    'text' => $quickToast,
                    'cache_time' => 1,
                ];
            }
            // Flag this callback as answered directly in webhook response to prevent duplicate HTTP calls
            app()->instance('tg_cb_answered_' . $callbackId, true);
        } elseif (isset($update['message']['text'])) {
            $msgText = trim($update['message']['text']);
            $msgChatId = $update['message']['chat']['id'] ?? null;
            $msgFromName = trim(($update['message']['from']['first_name'] ?? '') . ' ' . ($update['message']['from']['last_name'] ?? '')) ?: 'អតិថិជន';

            if ($msgChatId && preg_match('/^\/start(?:@\w+)?(?:\s+(.*))?$/i', $msgText, $matches)) {
                $startParam = trim($matches[1] ?? '');
                if (str_starts_with(strtolower($startParam), 'syncloc_')) {
                    $responsePayload = [
                        'method' => 'sendMessage',
                        'chat_id' => $msgChatId,
                        'text' => "📍 <b>សូមចែករំលែកទីតាំងសម្រាប់ដឹកជញ្ជូន (Checkout)</b>\n━━━━━━━━━━━━━━━━━━━━\n\nសួស្តី <b>" . htmlspecialchars($msgFromName) . "</b>! សូមចុចប៊ូតុង <b>'📍 ចែករំលែកទីតាំង (Share Location)'</b> ខាងក្រោម ដើម្បីឱ្យប្រព័ន្ធ S Tech Store បំពេញទីតាំង និងគណនាតម្លៃដឹកជញ្ជូនចូលផ្ទាំង Checkout ដោយស្វ័យប្រវត្តិ។",
                        'parse_mode' => 'HTML',
                        'reply_markup' => [
                            'keyboard' => [
                                [['text' => '📍 ចែករំលែកទីតាំង (Share Location)', 'request_location' => true]],
                            ],
                            'resize_keyboard' => true,
                            'one_time_keyboard' => true,
                        ],
                    ];
                } elseif (empty($startParam)) {
                    $welcomeText = "👋 <b>សូមស្វាគមន៍មកកាន់ S Tech Store Official Bot!</b>\n\n"
                        . "ជម្រាបសួរ <b>" . htmlspecialchars($msgFromName) . "</b>!\n"
                        . "🏪 <b>ហាង S Tech Store Cambodia</b> — ឧបករណ៍បច្ចេកវិទ្យា & សេវាកម្មជួសជុលទំនើប\n\n"
                        . "✨ <b>គណនី Telegram របស់អ្នកត្រូវបានទទួលស្គាល់ ១០០% (Connected)!</b>\n"
                        . "លោកអ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីចូលទិញទំនិញភ្លាមៗ ដោយមិនបាច់វាយលេខសម្ងាត់ឡើយ៖";

                    $responsePayload = [
                        'method' => 'sendMessage',
                        'chat_id' => $msgChatId,
                        'text' => $welcomeText,
                        'parse_mode' => 'HTML',
                        'reply_markup' => [
                            'inline_keyboard' => [
                                [['text' => '🛍️ បើកទិញទំនិញក្នុង Mini App (Open Store)', 'web_app' => ['url' => "https://www.s-tech-store.tech/?tg_token={$msgChatId}"]]],
                                [
                                    ['text' => '📦 ការកុម្ម៉ង់របស់ខ្ញុំ', 'callback_data' => 'cust_my_orders'],
                                    ['text' => '💰 កាបូបលុយ & សមតុល្យ', 'callback_data' => 'cust_my_wallet'],
                                ],
                                [
                                    ['text' => '🪙 ពិន្ទុ & VIP (Coins)', 'callback_data' => 'cust_my_points'],
                                    ['text' => '🔥 ប្រូម៉ូសិនពិសេស', 'callback_data' => 'cust_promo'],
                                ],
                                [
                                    ['text' => '💻 ផលិតផល Laptops & PC', 'callback_data' => 'cust_shop'],
                                    ['text' => '📞 ទំនាក់ទំនង & ទីតាំង', 'callback_data' => 'cust_contact'],
                                ],
                            ],
                        ],
                    ];
                }
            }
        }

        // ⚡ INSTANT NON-BLOCKING RESPONSE TO TELEGRAM:
        // Flush HTTP response directly to Telegram webhook servers so client spinners and
        // top bar loading indicators dismiss in < 30ms, while background processing continues!
        if (function_exists('fastcgi_finish_request')) {
            response()->json($responsePayload)->send();
            fastcgi_finish_request();
            TelegramService::processUpdate($update, $botParam);
            return response()->json($responsePayload);
        }

        TelegramService::processUpdate($update, $botParam);

        return response()->json($responsePayload);
    }
}
