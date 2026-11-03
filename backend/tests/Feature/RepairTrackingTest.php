<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Repair;
use App\Models\User;
use App\Services\AdminTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RepairTrackingTest extends TestCase
{
    use RefreshDatabase;

    private function createAdminToken(): array
    {
        $admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin_test@stech.com',
            'password' => bcrypt('AdminSecret123!'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $token = AdminTokenService::createToken($admin);

        return [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];
    }

    public function test_unauthenticated_request_cannot_access_admin_repair_endpoints(): void
    {
        $response = $this->getJson('/api/admin/repairs');
        $response->assertStatus(401);

        $postResponse = $this->postJson('/api/admin/repairs', [
            'customer_name' => 'Unauthenticated User',
            'device_name' => 'Laptop',
            'issue_description' => 'Broken screen',
        ]);
        $postResponse->assertStatus(401);
    }

    public function test_admin_can_create_repair_ticket_and_generate_ticket_code(): void
    {
        $headers = $this->createAdminToken();

        $payload = [
            'customer_name' => 'Sok Dara',
            'customer_phone' => '012345678',
            'customer_email' => 'sokdara@example.com',
            'device_name' => 'MacBook Pro M2 14-inch',
            'issue_description' => 'Display screen flickering and battery draining fast',
            'technician_name' => 'Chanthy',
            'estimated_cost' => 120.00,
            'status' => 'Pending Assessment',
            'notes' => 'Customer requested urgent diagnostic',
            'send_email' => false,
            'send_telegram' => false,
            'send_web' => false,
        ];

        $response = $this->postJson('/api/admin/repairs', $payload, $headers);

        $response->assertStatus(201);
        $response->assertJsonPath('data.customer_name', 'Sok Dara');
        $response->assertJsonPath('data.device_name', 'MacBook Pro M2 14-inch');
        $response->assertJsonPath('data.status', 'Pending Assessment');

        $this->assertDatabaseHas('repairs', [
            'customer_name' => 'Sok Dara',
            'customer_phone' => '012345678',
            'customer_email' => 'sokdara@example.com',
            'device_name' => 'MacBook Pro M2 14-inch',
        ]);

        $ticketCode = $response->json('data.ticket_code');
        $this->assertNotEmpty($ticketCode);
        $this->assertStringStartsWith('REP-', $ticketCode);
    }

    public function test_public_user_can_track_repair_by_ticket_code(): void
    {
        $repair = Repair::create([
            'ticket_code' => 'REP-778899',
            'customer_name' => 'Chea Vanna',
            'customer_phone' => '098765432',
            'customer_email' => 'chea.vanna@example.com',
            'device_name' => 'Asus ROG Zephyrus G14',
            'issue_description' => 'Keyboard backlight not lighting up',
            'technician_name' => 'Rithy',
            'estimated_cost' => 45.00,
            'status' => 'In Progress',
            'notes' => 'Awaiting spare ribbon cable',
        ]);

        $response = $this->getJson('/api/repairs/track/REP-778899');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'found' => true,
            'type' => 'repair',
            'ticket' => [
                'ticket_code' => 'REP-778899',
                'customer_name' => 'Chea Vanna',
                'device_name' => 'Asus ROG Zephyrus G14',
                'status' => 'In Progress',
                'step_index' => 1,
            ],
        ]);

        // Also test query with hash prefix
        $hashResponse = $this->getJson('/api/repairs/track/%23REP-778899');
        $hashResponse->assertStatus(200);
        $hashResponse->assertJsonPath('ticket.ticket_code', 'REP-778899');
    }

    public function test_public_user_can_track_repair_by_customer_phone(): void
    {
        Repair::create([
            'ticket_code' => 'REP-554433',
            'customer_name' => 'Keo Pich',
            'customer_phone' => '0887766554',
            'customer_email' => 'keo.pich@example.com',
            'device_name' => 'Dell XPS 15',
            'issue_description' => 'Overheating and thermal throttling',
            'technician_name' => 'Mengly',
            'estimated_cost' => 30.00,
            'status' => 'Ready',
        ]);

        $response = $this->getJson('/api/repairs/track?phone=0887766554');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'found' => true,
            'type' => 'repair',
            'ticket' => [
                'ticket_code' => 'REP-554433',
                'customer_name' => 'Keo Pich',
                'status' => 'Ready',
                'step_index' => 2,
            ],
        ]);
    }

    public function test_public_tracking_falls_back_to_order_warranty_lookup(): void
    {
        $category = Category::create([
            'name' => 'Components',
            'slug' => 'components',
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'RTX 4080 Super GPU',
            'slug' => 'rtx-4080-super-gpu',
            'price' => 1199.00,
            'stock' => 5,
            'brand' => 'NVIDIA',
            'status' => 'active',
        ]);

        $order = Order::create([
            'order_id' => 'ST-99001',
            'customer_name' => 'Chan Tola',
            'customer_phone' => '015998877',
            'shipping_address' => 'Phnom Penh',
            'total_amount' => 1199.00,
            'payment_method' => 'cod',
            'status' => 'completed',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 1199.00,
            'subtotal' => 1199.00,
        ]);

        $response = $this->getJson('/api/repairs/track/ST-99001');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'found' => true,
            'type' => 'warranty',
            'warranty' => [
                'order_id' => 'ST-99001',
                'customer_name' => 'Chan Tola',
                'status' => 'active',
            ],
        ]);
    }

    public function test_public_tracking_returns_404_when_code_not_found(): void
    {
        $response = $this->getJson('/api/repairs/track/INVALID-CODE-99999');

        $response->assertStatus(404);
        $response->assertJson([
            'success' => true,
            'found' => false,
        ]);
    }

    public function test_admin_can_update_repair_status_and_technician(): void
    {
        $headers = $this->createAdminToken();

        $repair = Repair::create([
            'ticket_code' => 'REP-112233',
            'customer_name' => 'Heng Ly',
            'customer_phone' => '017112233',
            'device_name' => 'iPad Pro 11',
            'issue_description' => 'Port not charging',
            'status' => 'Pending Assessment',
        ]);

        $updateResponse = $this->putJson("/api/admin/repairs/{$repair->id}", [
            'status' => 'Completed',
            'technician_name' => 'Master Sok',
            'estimated_cost' => 50.00,
            'send_email' => false,
            'send_telegram' => false,
            'send_web' => false,
        ], $headers);

        $updateResponse->assertStatus(200);

        $repair->refresh();
        $this->assertEquals('Completed', $repair->status);
        $this->assertEquals('Master Sok', $repair->technician_name);
        $this->assertEquals(50.00, (float)$repair->estimated_cost);
    }
}
