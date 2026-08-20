<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'order_id', 'user_id', 'customer_name', 'customer_phone', 
        'shipping_address', 'delivery_type', 'payment_method', 'total_amount', 'status'
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
