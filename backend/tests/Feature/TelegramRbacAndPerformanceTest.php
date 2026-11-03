<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Shift;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\TelegramService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramRbacAndPerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_is_staff_or_admin_telegram_user_returns_false_for_normal_customer(): void
    {
        $nonStaffTelegramId = '999111222';
        $isStaff = TelegramService::isStaffOrAdminTelegramUser($nonStaffTelegramId);
        $this->assertFalse($isStaff);
    }

    public function test_is_staff_or_admin_telegram_user_recognizes_staff_group_origin(): void
    {
        $staffGroupId = '-100987654321';
        Cache::forever('test_telegram_settings_override', [
            'connected' => true,
            'chat_id' => $staffGroupId,
            'bot_username' => 's_tech_storeBot',
        ]);

        $arbitraryUserId = '44556677';
        $isStaff = TelegramService::isStaffOrAdminTelegramUser($arbitraryUserId, $staffGroupId);
        $this->assertTrue($isStaff);
    }

    public function test_is_staff_or_admin_telegram_user_recognizes_staff_role_user(): void
    {
        $staffPhone = '88887777';
        User::create([
            'name' => 'Internal Staff',
            'email' => 'staff@stech.com',
            'password' => 'secret123',
            'role' => 'staff',
            'phone' => $staffPhone,
            'status' => 'active',
        ]);

        $isStaff = TelegramService::isStaffOrAdminTelegramUser($staffPhone);
        $this->assertTrue($isStaff);
    }

    public function test_is_staff_or_admin_telegram_user_recognizes_admin_profile(): void
    {
        $adminTgId = '55554444';
        UserProfile::create([
            'firebase_uid' => 'tg_' . $adminTgId,
            'display_name' => 'Admin Profile User',
            'email' => 'admin_profile@stech.com',
            'telegram_chat_id' => $adminTgId,
            'is_admin' => true,
        ]);

        $isStaff = TelegramService::isStaffOrAdminTelegramUser($adminTgId);
        $this->assertTrue($isStaff);
    }

    public function test_admin_callback_query_is_rejected_for_unauthorized_telegram_user(): void
    {
        $answeredToast = null;
        $answeredAlert = false;

        Http::fake([
            'https://api.telegram.org/*/answerCallbackQuery' => function ($request) use (&$answeredToast, &$answeredAlert) {
                $data = $request->data();
                $answeredToast = $data['text'] ?? null;
                $answeredAlert = $data['show_alert'] ?? false;
                return Http::response(['ok' => true]);
            },
            '*' => Http::response(['ok' => true]),
        ]);

        $customerTelegramId = 77112233;
        $update = [
            'callback_query' => [
                'id' => 'cb_req_9988',
                'from' => [
                    'id' => $customerTelegramId,
                    'first_name' => 'Attacker',
                    'is_bot' => false,
                ],
                'message' => [
                    'message_id' => 1234,
                    'chat' => [
                        'id' => $customerTelegramId,
                        'type' => 'private',
                    ],
                ],
                'data' => 'admin_approve_topup:DEP-99999',
            ],
        ];

        TelegramService::processUpdate($update, 'staff');

        $this->assertNotNull($answeredToast);
        $this->assertStringContainsString('សិទ្ធិត្រូវបានបដិសេធ', $answeredToast);
        $this->assertTrue($answeredAlert);
    }

    public function test_cached_public_endpoints_performance(): void
    {
        // 1. Categories endpoint caching
        $resCategories = $this->getJson('/api/categories');
        $resCategories->assertStatus(200);
        $this->assertTrue(Cache::has('public_categories_list'));

        // 2. Branches endpoint caching
        Branch::create([
            'name' => 'Main Headquarter Branch',
            'code' => 'HQ01',
            'address' => 'Phnom Penh Center',
            'phone' => '012345678',
            'manager_name' => 'Director',
            'opening_hours' => '8:00 AM - 8:00 PM',
            'is_active' => true,
        ]);

        $resBranches = $this->getJson('/api/branches');
        $resBranches->assertStatus(200);
        $this->assertTrue(Cache::has('public_branches_list'));
        $this->assertCount(1, $resBranches->json());

        // 3. Shifts endpoint caching
        Shift::create([
            'name' => 'Morning Shift',
            'code' => 'SH01',
            'start_time' => '08:00',
            'end_time' => '17:00',
            'days' => 'Mon-Fri',
            'is_active' => true,
        ]);

        $resShifts = $this->getJson('/api/shifts');
        $resShifts->assertStatus(200);
        $this->assertTrue(Cache::has('public_shifts_list'));
        $this->assertCount(1, $resShifts->json());
    }

    public function test_confirm_manual_payment_sets_pending_verification_promptly(): void
    {
        $userId = 'test_cust_uid_101';
        $order = Order::create([
            'order_id' => 'ORD-MANUAL-TEST-001',
            'user_id' => $userId,
            'customer_name' => 'Manual Buyer',
            'customer_phone' => '098112233',
            'total_amount' => 45.00,
            'payment_status' => 'pending',
            'payment_method' => 'khqr',
            'delivery_type' => 'delivery',
            'shipping_address' => 'Phnom Penh',
            'status' => 'pending',
        ]);

        $response = $this->postJson("/api/payment/confirm-manual/{$order->order_id}", [
            'method' => 'khqr',
        ], [
            'X-Firebase-UID' => $userId,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $order->refresh();
        $this->assertEquals('pending_verification', $order->payment_status);
        $this->assertStringStartsWith('MANUAL_', $order->transaction_id);
    }
}
