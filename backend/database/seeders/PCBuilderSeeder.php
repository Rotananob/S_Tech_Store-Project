<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Product;

class PCBuilderSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'cpu' => 'CPU Processor',
            'motherboard' => 'Motherboard',
            'ram' => 'Memory (RAM)',
            'gpu' => 'Graphics Card',
            'storage' => 'Storage (SSD/HDD)',
            'psu' => 'Power Supply (PSU)',
            'case' => 'PC Case'
        ];

        $catIds = [];
        foreach ($categories as $slug => $name) {
            $cat = Category::firstOrCreate(['slug' => $slug], [
                'name' => $name,
                'description' => 'PC Build Component: ' . $name
            ]);
            $catIds[$slug] = $cat->id;
        }

        $components = [
            // CPUs
            ['cat' => 'cpu', 'name' => 'Intel Core i7-13700K', 'brand' => 'Intel', 'price' => 419, 'image' => 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80', 'specs' => '16-Core, 24-Thread, 5.4 GHz Max Boost, Socket: LGA1700'],
            ['cat' => 'cpu', 'name' => 'AMD Ryzen 5 7600X', 'brand' => 'AMD', 'price' => 249, 'image' => 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&q=80', 'specs' => '6-Core, 12-Thread, 5.3 GHz Max Boost, Socket: AM5'],
            
            // Motherboards
            ['cat' => 'motherboard', 'name' => 'ASUS ROG Strix Z790-E', 'brand' => 'ASUS', 'price' => 499, 'image' => 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80', 'specs' => 'ATX, LGA1700, DDR5, PCIe 5.0'],
            ['cat' => 'motherboard', 'name' => 'MSI MAG B650 Tomahawk', 'brand' => 'MSI', 'price' => 219, 'image' => 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80', 'specs' => 'ATX, AM5, DDR5, PCIe 4.0'],

            // RAM
            ['cat' => 'ram', 'name' => 'Corsair Vengeance RGB 32GB', 'brand' => 'Corsair', 'price' => 114, 'image' => 'https://images.unsplash.com/photo-1563191911-e65f8655ebf9?w=300&q=80', 'specs' => '2x16GB, DDR5-6000, CL36'],
            
            // GPU
            ['cat' => 'gpu', 'name' => 'NVIDIA GeForce RTX 4070 Ti', 'brand' => 'NVIDIA', 'price' => 799, 'image' => 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=300&q=80', 'specs' => '12GB GDDR6X, PCIe 4.0'],
            ['cat' => 'gpu', 'name' => 'AMD Radeon RX 7800 XT', 'brand' => 'AMD', 'price' => 499, 'image' => 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=300&q=80', 'specs' => '16GB GDDR6, PCIe 4.0'],

            // Storage
            ['cat' => 'storage', 'name' => 'Samsung 990 PRO 2TB', 'brand' => 'Samsung', 'price' => 169, 'image' => 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=300&q=80', 'specs' => 'NVMe M.2 PCIe 4.0, up to 7450 MB/s'],
            
            // PSU
            ['cat' => 'psu', 'name' => 'Corsair RM850x (2021)', 'brand' => 'Corsair', 'price' => 129, 'image' => 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=300&q=80', 'specs' => '850W, 80+ Gold, Fully Modular'],

            // Case
            ['cat' => 'case', 'name' => 'NZXT H5 Flow', 'brand' => 'NZXT', 'price' => 94, 'image' => 'https://images.unsplash.com/photo-1555617781-648175cb11c1?w=300&q=80', 'specs' => 'Mid-Tower, ATX, Tempered Glass']
        ];

        foreach ($components as $comp) {
            Product::firstOrCreate(['name' => $comp['name']], [
                'category_id' => $catIds[$comp['cat']],
                'slug' => \Illuminate\Support\Str::slug($comp['name']),
                'brand' => $comp['brand'],
                'price' => $comp['price'],
                'image_url' => $comp['image'],
                'description' => clone \Illuminate\Support\Str::of($comp['specs']),
                'stock' => 10,
                'is_featured' => false
            ]);
        }
    }
}
