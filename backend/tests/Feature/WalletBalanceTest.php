<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\UserProfile;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletBalanceTest extends TestCase
{
    use RefreshDatabase;

    private UserProfile $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = UserProfile::create([
            'firebase_uid' => 'test_uid_wallet_101',
            'display_name' => 'Kosal Dev',
            'email' => 'kosal@stech.test',
            'wallet_balance' => 100.00,
            'points' => 50,
            'is_active' => true,
        ]);
    }

    public function test_retrieves_wallet_balance_and_summary_for_authenticated_user(): void
    {
        $response = $this->getJson('/api/user/wallet', [
            'X-Firebase-UID' => $this->user->firebase_uid,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'wallet' => [
                'balance' => 100.00,
            ],
        ]);
    }

    public function test_rejects_wallet_payment_when_balance_insufficient(): void
    {
        $order = Order::create([
            'order_id' => 'ORD-EXPENSIVE-1',
            'customer_name' => 'Kosal Dev',
            'customer_phone' => '012334455',
            'shipping_address' => 'Phnom Penh',
            'total_amount' => 250.00, // Balance is only 100.00
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $response = $this->postJson('/api/user/wallet/pay-order', [
            'order_id' => $order->order_id,
        ], [
            'X-Firebase-UID' => $this->user->firebase_uid,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'current_balance' => 100.00,
            'required_amount' => 250.00,
            'shortage' => 150.00,
        ]);

        // User balance must remain untouched
        $this->user->refresh();
        $this->assertEquals(100.00, (float)$this->user->wallet_balance);
    }

    public function test_deducts_wallet_balance_and_marks_order_paid_on_sufficient_funds(): void
    {
        $order = Order::create([
            'order_id' => 'ORD-AFFORDABLE-2',
            'customer_name' => 'Kosal Dev',
            'customer_phone' => '012334455',
            'shipping_address' => 'Phnom Penh',
            'total_amount' => 45.00,
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $response = $this->postJson('/api/user/wallet/pay-order', [
            'order_id' => $order->order_id,
        ], [
            'X-Firebase-UID' => $this->user->firebase_uid,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'remaining_balance' => 55.00,
        ]);

        // User balance must be exactly 55.00
        $this->user->refresh();
        $this->assertEquals(55.00, (float)$this->user->wallet_balance);

        // Order must be marked paid
        $order->refresh();
        $this->assertEquals('paid', $order->payment_status);
        $this->assertEquals('wallet', $order->payment_method);
        $this->assertEquals('processing', $order->status);

        // Ledger transaction must be recorded
        $tx = WalletTransaction::where('firebase_uid', $this->user->firebase_uid)->first();
        $this->assertNotNull($tx);
        $this->assertEquals(-45.00, (float)$tx->amount);
        $this->assertEquals('purchase', $tx->type);
        $this->assertEquals('completed', $tx->status);
    }

    public function test_rejects_unauthorized_wallet_requests(): void
    {
        $response = $this->postJson('/api/user/wallet/pay-order', [
            'order_id' => 'ORD-ANY',
        ]);

        $response->assertStatus(401);
    }
}
