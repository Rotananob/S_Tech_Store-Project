<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wishlist extends Model
{
    protected $fillable = [
        'firebase_uid', 'product_id',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
