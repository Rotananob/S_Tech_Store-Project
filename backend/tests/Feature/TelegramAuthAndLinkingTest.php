<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\UserProfile;
use App\Models\WalletTransaction;
use App\Services\TelegramService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TelegramAuthAndLinkingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_native_telegram_user_can_sync_and_auto_register_via_miniapp(): void
    {
        $tgId = 12345678;
        $response = $this->postJson('/api/auth/telegram/miniapp-sync', [
            'telegram_user' => [
                'id' => $tgId,
                'first_name' => 'John',
                'last_name' => 'Doe',
                'username' => 'johndoe',
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'linked' => true,
            'is_connected_account' => false,
            'user' => [
                'firebase_uid' => 'tg_' . $tgId,
                'telegram_chat_id' => (string)$tgId,
                'telegram_id' => (string)$tgId,
                'provider' => 'telegram',
                'points' => 5,
            ],
        ]);

        $token = $response->json('token');
        $this->assertNotEmpty($token);

        // Fetch profile using server session token
        $profileRes = $this->getJson('/api/user/profile', [
            'X-Customer-Token' => $token,
        ]);

        $profileRes->assertStatus(200);
        $profileRes->assertJson([
            'profile' => [
                'firebase_uid' => 'tg_' . $tgId,
                'display_name' => 'John Doe',
                'points' => 5,
            ],
        ]);
    }

    public function test_existing_google_user_linking_telegram_resolves_primary_account_in_miniapp(): void
    {
        $googleUser = UserProfile::create([
            'firebase_uid' => 'goog_user_1001',
            'display_name' => 'Google Customer',
            'email' => 'customer@gmail.com',
            'auth_provider' => 'google',
            'wallet_balance' => 45.00,
            'points' => 120,
            'telegram_chat_id' => '88776655',
            'telegram' => '@customer_tg',
            'notif_telegram' => true,
        ]);

        $response = $this->postJson('/api/auth/telegram/miniapp-sync', [
            'telegram_user' => [
                'id' => 88776655,
                'first_name' => 'Google',
                'last_name' => 'Customer',
                'username' => 'customer_tg',
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'linked' => true,
            'is_connected_account' => true,
            'user' => [
                'firebase_uid' => 'goog_user_1001',
                'display_name' => 'Google Customer',
                'email' => 'customer@gmail.com',
                'provider' => 'google',
                'wallet_balance' => 45.00,
                'points' => 120,
            ],
        ]);

        $token = $response->json('token');

        // Verify wallet endpoint returns connected account wallet balance
        $walletRes = $this->getJson('/api/user/wallet', [
            'X-Customer-Token' => $token,
        ]);

        $walletRes->assertStatus(200);
        $walletRes->assertJson([
            'success' => true,
            'wallet' => [
                'balance' => 45.00,
                'coins' => 120,
            ],
        ]);
    }

    public function test_linking_telegram_auto_merges_pre_existing_native_telegram_account(): void
    {
        $tgChatId = '55443322';

        // 1. Pre-existing native Telegram account from earlier bot usage
        $nativeTgUser = UserProfile::create([
            'firebase_uid' => 'tg_' . $tgChatId,
            'display_name' => 'Telegram Old User',
            'email' => "tg_{$tgChatId}@telegram.s-tech-store.tech",
            'telegram_chat_id' => $tgChatId,
            'auth_provider' => 'telegram',
            'wallet_balance' => 5.00,
            'points' => 20,
        ]);

        // Create an order for native user
        $order = Order::create([
            'order_id' => 'ORD-NATIVE-001',
            'user_id' => 'tg_' . $tgChatId,
            'status' => 'pending',
            'total_amount' => 15.00,
            'payment_method' => 'khqr',
            'payment_status' => 'paid',
            'delivery_type' => 'delivery',
            'shipping_address' => 'Phnom Penh',
            'customer_name' => 'Telegram Old User',
            'customer_phone' => '012345678',
        ]);

        // 2. Google user who registered on website
        $googleUser = UserProfile::create([
            'firebase_uid' => 'goog_web_user_2002',
            'display_name' => 'Rotana Nob',
            'email' => 'rotana@gmail.com',
            'auth_provider' => 'google',
            'wallet_balance' => 30.00,
            'points' => 50,
        ]);

        // 3. Google user initiates link token
        $linkToken = 'linktest_' . md5(uniqid());
        $linkData = [
            'status' => 'pending',
            'user_id' => $googleUser->id,
            'created_at' => time(),
        ];
        Cache::put("tg_link_{$linkToken}", $linkData, 600);
        DB::table('system_settings')->insert([
            'key' => "tg_link_{$linkToken}",
            'value' => json_encode($linkData),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 4. Telegram Bot processes link handshake
        $message = [
            'from' => [
                'id' => (int)$tgChatId,
                'first_name' => 'Rotana',
                'last_name' => 'Nob',
                'username' => 'rotananob',
            ],
            'chat' => [
                'id' => (int)$tgChatId,
            ],
        ];

        $result = TelegramService::processProfileLinkSync($linkToken, $message);
        $this->assertTrue($result['ok']);

        // 5. Verify the native Telegram placeholder row has been merged into Google account
        $this->assertDatabaseMissing('user_profiles', [
            'firebase_uid' => 'tg_' . $tgChatId,
        ]);

        $googleUser->refresh();
        $this->assertEquals((string)$tgChatId, (string)$googleUser->telegram_chat_id);
        // Merged wallet balance: 30.00 + 5.00 = 35.00
        $this->assertEquals(35.00, (float)$googleUser->wallet_balance);
        // Merged points: 50 + 20 = 70
        $this->assertEquals(70, (int)$googleUser->points);

        // Verify order has been reassigned to Google user
        $order->refresh();
        $this->assertEquals('goog_web_user_2002', $order->user_id);
    }

    public function test_user_orders_query_returns_orders_for_both_direct_and_connected_accounts(): void
    {
        $tgChatId = '77665544';

        $connectedUser = UserProfile::create([
            'firebase_uid' => 'goog_order_user_3003',
            'display_name' => 'Order Tester',
            'email' => 'tester@gmail.com',
            'auth_provider' => 'google',
            'telegram_chat_id' => $tgChatId,
            'wallet_balance' => 10.00,
        ]);

        // Order placed with Google UID
        Order::create([
            'order_id' => 'ORD-GOOGLE-101',
            'user_id' => 'goog_order_user_3003',
            'status' => 'completed',
            'total_amount' => 50.00,
            'payment_method' => 'khqr',
            'payment_status' => 'paid',
            'delivery_type' => 'delivery',
            'shipping_address' => 'Phnom Penh',
            'customer_name' => 'Order Tester',
            'customer_phone' => '098765432',
        ]);

        // Order placed earlier with Telegram UID
        Order::create([
            'order_id' => 'ORD-TELEGRAM-102',
            'user_id' => 'tg_' . $tgChatId,
            'status' => 'pending',
            'total_amount' => 25.00,
            'payment_method' => 'wallet',
            'payment_status' => 'paid',
            'delivery_type' => 'delivery',
            'shipping_address' => 'Phnom Penh',
            'customer_name' => 'Order Tester',
            'customer_phone' => '098765432',
        ]);

        // Query orders via API with X-Telegram-Chat-ID header
        $response = $this->getJson('/api/user/orders', [
            'X-Telegram-Chat-ID' => $tgChatId,
        ]);

        $response->assertStatus(200);
        $orders = $response->json();
        $this->assertCount(2, $orders);

        $orderIds = array_column($orders, 'order_id');
        $this->assertContains('ORD-GOOGLE-101', $orderIds);
        $this->assertContains('ORD-TELEGRAM-102', $orderIds);
    }

    public function test_unlink_telegram_cleans_chat_id_without_destroying_primary_account(): void
    {
        $user = UserProfile::create([
            'firebase_uid' => 'goog_unlink_test_4004',
            'display_name' => 'Unlink Tester',
            'email' => 'unlink@gmail.com',
            'auth_provider' => 'google',
            'telegram_chat_id' => '33221100',
            'telegram' => '@unlink_tg',
            'notif_telegram' => true,
            'wallet_balance' => 15.00,
        ]);

        $response = $this->postJson('/api/user/telegram/unlink', [], [
            'X-Firebase-UID' => 'goog_unlink_test_4004',
            'X-Telegram-Chat-ID' => '33221100',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $user->refresh();
        $this->assertNull($user->telegram_chat_id);
        $this->assertNull($user->telegram);
        $this->assertFalse((bool)$user->notif_telegram);
        $this->assertEquals('goog_unlink_test_4004', $user->firebase_uid);
        $this->assertEquals(15.00, (float)$user->wallet_balance);
    }
}
