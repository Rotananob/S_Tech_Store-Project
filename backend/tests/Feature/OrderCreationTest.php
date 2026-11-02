<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderCreationTest extends TestCase
{
    use RefreshDatabase;

    private Category $category;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->category = Category::create([
            'name' => 'Laptops',
            'slug' => 'laptops',
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'ASUS ROG Zephyrus G14',
            'slug' => 'asus-rog-zephyrus-g14',
            'price' => '1499.00',
            'sale_price' => '1399.00',
            'stock' => 5,
        ]);
    }

    public function test_rejects_order_with_missing_required_fields(): void
    {
        $response = $this->postJson('/api/orders', [], [
            'X-Owner-Bypass' => '1',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'phone', 'address', 'items']);
    }

    public function test_creates_order_and_decrements_product_stock_accurately(): void
    {
        $initialStock = $this->product->stock;
        $orderQuantity = 2;

        $response = $this->postJson('/api/orders', [
            'name' => 'Sokha Chan',
            'phone' => '012987654',
            'email' => 'sokha@gmail.com',
            'address' => 'Street 271, Phnom Penh',
            'delivery_type' => 'phnom_penh',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => $orderQuantity,
                ],
            ],
        ], [
            'X-Owner-Bypass' => '1',
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'message' => 'Order placed successfully',
        ]);

        $orderId = $response->json('order.order_id');
        $this->assertNotEmpty($orderId);

        // Verify stock was decremented in database
        $this->product->refresh();
        $this->assertEquals($initialStock - $orderQuantity, $this->product->stock);

        // Verify order items saved
        $order = Order::where('order_id', $orderId)->first();
        $this->assertNotNull($order);
        $this->assertEquals('Sokha Chan', $order->customer_name);
        $this->assertCount(1, $order->items);
        $this->assertEquals(1399.00, (float)$order->items->first()->unit_price);
    }

    public function test_rejects_order_when_insufficient_stock(): void
    {
        $response = $this->postJson('/api/orders', [
            'name' => 'Dara Vong',
            'phone' => '098123456',
            'address' => 'Tuol Kork, Phnom Penh',
            'delivery_type' => 'phnom_penh',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 10,
                ],
            ],
        ], [
            'X-Owner-Bypass' => '1',
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'error' => 'Insufficient stock for product: ASUS ROG Zephyrus G14',
        ]);

        // Stock must remain unchanged
        $this->product->refresh();
        $this->assertEquals(5, $this->product->stock);
    }

    public function test_enforces_server_side_pricing_ignoring_client_tampered_price(): void
    {
        // Re-fetch product to ensure it has stock
        $freshProduct = Product::find($this->product->id);

        $response = $this->postJson('/api/orders', [
            'name' => 'Hacker Test',
            'phone' => '077889900',
            'address' => 'Monivong Blvd, Phnom Penh',
            'delivery_type' => 'phnom_penh',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $freshProduct->id,
                    'quantity' => 1,
                    'price' => 1.00,
                ],
            ],
        ], [
            'X-Owner-Bypass' => '1',
        ]);

        if ($response->status() !== 201) {
            $this->fail('Order creation returned status ' . $response->status() . ' with error: ' . $response->content());
        }

        $response->assertStatus(201);
        $orderId = $response->json('order.order_id');
        $order = Order::where('order_id', $orderId)->first();

        // Unit price must be server-side sale price of 1399.00, NOT 1.00
        $this->assertEquals(1399.00, (float)$order->items->first()->unit_price);
    }

    public function test_can_retrieve_order_by_order_id(): void
    {
        $order = Order::create([
            'order_id' => 'ORD-TEST-9988',
            'customer_name' => 'Bopha Pich',
            'customer_phone' => '089554433',
            'customer_email' => 'bopha@example.com',
            'shipping_address' => 'BKK1, Phnom Penh',
            'delivery_type' => 'phnom_penh',
            'payment_method' => 'cod',
            'total_amount' => 1401.00,
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $response = $this->getJson("/api/orders/{$order->order_id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'order' => [
                'order_id' => 'ORD-TEST-9988',
                'customer_name' => 'Bopha Pich',
            ],
        ]);
    }
}
