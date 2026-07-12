<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Categories
        $laptops = \App\Models\Category::create([
            'name' => 'Laptops',
            'slug' => 'laptops',
            'description' => 'High performance laptops for gaming and work'
        ]);

        $phones = \App\Models\Category::create([
            'name' => 'Smartphones',
            'slug' => 'smartphones',
            'description' => 'Latest smartphones with best cameras'
        ]);

        $accessories = \App\Models\Category::create([
            'name' => 'Accessories',
            'slug' => 'accessories',
            'description' => 'Keyboards, mice, and other accessories'
        ]);

        // Create Products
        \App\Models\Product::create([
            'category_id' => $laptops->id,
            'name' => 'MacBook Pro M3 Max',
            'slug' => 'macbook-pro-m3-max',
            'description' => 'Apple MacBook Pro 16-inch with M3 Max chip, 36GB RAM, 1TB SSD.',
            'price' => 3499.00,
            'stock' => 15,
            'image_url' => 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
            'is_featured' => true
        ]);

        \App\Models\Product::create([
            'category_id' => $laptops->id,
            'name' => 'Dell XPS 15',
            'slug' => 'dell-xps-15',
            'description' => 'Dell XPS 15 with 13th Gen Intel Core i7, 16GB RAM, 512GB SSD, RTX 4050.',
            'price' => 1899.00,
            'stock' => 20,
            'image_url' => 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45',
            'is_featured' => false
        ]);

        \App\Models\Product::create([
            'category_id' => $phones->id,
            'name' => 'iPhone 15 Pro Max',
            'slug' => 'iphone-15-pro-max',
            'description' => 'Apple iPhone 15 Pro Max 256GB Natural Titanium.',
            'price' => 1199.00,
            'stock' => 50,
            'image_url' => 'https://images.unsplash.com/photo-1695048133142-1a20484d2569',
            'is_featured' => true
        ]);

        \App\Models\Product::create([
            'category_id' => $accessories->id,
            'name' => 'Logitech MX Master 3S',
            'slug' => 'logitech-mx-master-3s',
            'description' => 'Advanced Wireless Mouse with MagSpeed Scrolling.',
            'price' => 99.99,
            'stock' => 100,
            'image_url' => 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7',
            'is_featured' => false
        ]);
    }
}
