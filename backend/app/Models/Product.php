<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'name', 'slug', 'description', 
        'price', 'sale_price', 'stock', 'image_url', 'images',
        'is_featured', 'brand', 'badge', 'rating', 'reviews_count'
    ];

    protected $casts = [
        'images' => 'array',
        'is_featured' => 'boolean',
        'sale_price' => 'float',
        'rating' => 'float',
        'reviews_count' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function getImagesAttribute($value)
    {
        if (!$value) {
            return [];
        }
        $decoded = is_string($value) ? json_decode($value, true) : $value;
        return is_array($decoded) ? $decoded : [];
    }
}
