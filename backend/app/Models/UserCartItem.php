<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserCartItem extends Model
{
    protected $fillable = [
        'firebase_uid', 'product_id', 'quantity',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
