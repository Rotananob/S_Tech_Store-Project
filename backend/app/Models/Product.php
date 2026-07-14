<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'name', 'slug', 'description', 
        'price', 'stock', 'image_url', 'images', 'is_featured'
    ];

    protected $casts = [
        'images' => 'array',
        'is_featured' => 'boolean'
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
