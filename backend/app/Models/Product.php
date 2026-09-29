<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'name', 'slug', 'description', 
        'price', 'sale_price', 'stock', 'image_url', 'images',
        'is_featured', 'brand', 'badge', 'rating', 'reviews_count', 'condition'
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
            return !empty($this->attributes['image_url']) ? [$this->attributes['image_url']] : [];
        }
        $decoded = is_string($value) ? json_decode($value, true) : $value;
        if (is_array($decoded) && !empty($decoded)) {
            return array_values(array_filter($decoded));
        }
        return !empty($this->attributes['image_url']) ? [$this->attributes['image_url']] : [];
    }
}
