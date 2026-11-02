<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductAndReviewApiTest extends TestCase
{
    use RefreshDatabase;

    private Category $category;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->category = Category::create([
            'name' => 'Gaming Laptops',
            'slug' => 'gaming-laptops',
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Lenovo Legion Pro 7',
            'slug' => 'lenovo-legion-pro-7',
            'brand' => 'Lenovo',
            'description' => 'Flagship Intel Core i9 RTX 4080 Gaming Laptop',
            'price' => '2299.00',
            'sale_price' => '2199.00',
            'stock' => 8,
            'is_featured' => true,
        ]);
    }

    public function test_can_list_products_and_filter_by_category(): void
    {
        $otherCategory = Category::create([
            'name' => 'Monitors',
            'slug' => 'monitors',
        ]);

        Product::create([
            'category_id' => $otherCategory->id,
            'name' => 'Dell UltraSharp 27',
            'slug' => 'dell-ultrasharp-27',
            'price' => '599.00',
            'stock' => 12,
        ]);

        $response = $this->getJson('/api/products?category=gaming-laptops&fresh=1');

        $response->assertStatus(200);
        $json = $response->json();
        $this->assertIsArray($json);
        $this->assertCount(1, $json);
        $this->assertEquals('Lenovo Legion Pro 7', $json[0]['name']);
    }

    public function test_can_search_products_by_keyword(): void
    {
        $response = $this->getJson('/api/products?search=RTX&fresh=1');

        $response->assertStatus(200);
        $json = $response->json();
        $this->assertIsArray($json);
        $this->assertCount(1, $json);
        $this->assertEquals('Lenovo Legion Pro 7', $json[0]['name']);
    }

    public function test_can_retrieve_single_product_by_id_or_slug(): void
    {
        $response = $this->getJson("/api/products/{$this->product->slug}");

        $response->assertStatus(200);
        $response->assertJson([
            'name' => 'Lenovo Legion Pro 7',
            'slug' => 'lenovo-legion-pro-7',
        ]);
    }

    public function test_rejects_unauthenticated_review_submission(): void
    {
        $response = $this->postJson("/api/products/{$this->product->id}/reviews", [
            'rating' => 5,
            'comment' => 'Exceptional performance and thermal cooling.',
        ]);

        $response->assertStatus(401);
    }

    public function test_submits_and_sanitizes_product_review_successfully(): void
    {
        $user = UserProfile::create([
            'firebase_uid' => 'reviewer_uid_998',
            'display_name' => 'Vannak Gamer',
            'email' => 'vannak@gamer.test',
        ]);

        $response = $this->postJson("/api/products/{$this->product->id}/reviews", [
            'rating' => 5,
            'comment' => '<b>Amazing build quality!</b> <script>alert(1)</script> Highly recommended.',
        ], [
            'X-Firebase-UID' => $user->firebase_uid,
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'message' => 'Review added successfully',
            'review' => [
                'rating' => 5,
                'verified_buyer' => true,
            ],
        ]);

        // Verify XSS was stripped in database
        $review = ProductReview::where('product_id', $this->product->id)->first();
        $this->assertNotNull($review);
        $this->assertStringNotContainsString('<script>', $review->comment);
        $this->assertStringNotContainsString('<b>', $review->comment);
        $this->assertStringContainsString('Amazing build quality!', $review->comment);
    }

    public function test_can_retrieve_product_reviews(): void
    {
        ProductReview::create([
            'product_id' => $this->product->id,
            'firebase_uid' => 'cust_rev_11',
            'user_name' => 'Vireak S',
            'rating' => 5,
            'comment' => 'Runs all AAA titles smoothly.',
        ]);

        $response = $this->getJson("/api/products/{$this->product->id}/reviews");

        $response->assertStatus(200);
        $json = $response->json();
        $this->assertIsArray($json);
        $this->assertCount(1, $json);
        $this->assertEquals('Runs all AAA titles smoothly.', $json[0]['comment']);
    }
}
