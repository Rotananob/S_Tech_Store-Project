<?php

namespace Tests\Feature;

use App\Models\PromoCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromoCodeValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_validates_active_percentage_promo_code_successfully(): void
    {
        PromoCode::create([
            'name' => 'Tech Saver 10%',
            'code' => 'TECH10',
            'type' => 'percentage',
            'value' => 10,
            'status' => 'active',
            'usage_count' => 0,
            'usage_max' => 100,
            'valid_from' => now()->subDay(),
            'valid_until' => now()->addDays(7),
        ]);

        $response = $this->postJson('/api/promo-codes/validate', [
            'code' => 'tech10',
            'subtotal' => 500.00,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'code' => 'TECH10',
                'type' => 'percentage',
                'discount_amount' => 50,
            ],
        ]);
    }

    public function test_validates_fixed_discount_promo_code(): void
    {
        PromoCode::create([
            'name' => 'Flat $20 Off',
            'code' => 'FLAT20',
            'type' => 'fixed',
            'value' => 20,
            'status' => 'active',
            'usage_count' => 0,
            'usage_max' => 50,
            'valid_from' => now()->subDay(),
            'valid_until' => now()->addDays(3),
        ]);

        $response = $this->postJson('/api/promo-codes/validate', [
            'code' => 'FLAT20',
            'subtotal' => 100.00,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'code' => 'FLAT20',
                'type' => 'fixed',
                'discount_amount' => 20,
            ],
        ]);
    }

    public function test_rejects_expired_promo_code(): void
    {
        PromoCode::create([
            'name' => 'Expired Summer Sale',
            'code' => 'SUMMEREXPIRED',
            'type' => 'fixed',
            'value' => 15,
            'status' => 'active',
            'usage_count' => 0,
            'usage_max' => 10,
            'valid_from' => now()->subDays(10),
            'valid_until' => now()->subDay(),
        ]);

        $response = $this->postJson('/api/promo-codes/validate', [
            'code' => 'SUMMEREXPIRED',
            'subtotal' => 200.00,
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
        ]);
    }

    public function test_rejects_disabled_promo_code(): void
    {
        PromoCode::create([
            'name' => 'Disabled Promo',
            'code' => 'DISABLEDCODE',
            'type' => 'fixed',
            'value' => 25,
            'status' => 'disabled',
            'usage_count' => 0,
            'usage_max' => 50,
        ]);

        $response = $this->postJson('/api/promo-codes/validate', [
            'code' => 'DISABLEDCODE',
            'subtotal' => 100.00,
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
        ]);
    }

    public function test_rejects_max_usage_exceeded_promo_code(): void
    {
        PromoCode::create([
            'name' => 'Limited 5 Uses',
            'code' => 'LIMITED5',
            'type' => 'fixed',
            'value' => 30,
            'status' => 'active',
            'usage_count' => 5,
            'usage_max' => 5,
        ]);

        $response = $this->postJson('/api/promo-codes/validate', [
            'code' => 'LIMITED5',
            'subtotal' => 150.00,
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
        ]);
    }
}
