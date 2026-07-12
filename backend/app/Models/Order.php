<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'customer_name', 'customer_phone', 
        'shipping_address', 'total_amount', 'status'
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
