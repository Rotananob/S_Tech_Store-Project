<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductReview extends Model
{
    protected $fillable = [
        'product_id', 'firebase_uid', 'user_name', 'rating', 'comment'
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
