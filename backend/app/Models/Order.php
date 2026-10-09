<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'order_id', 'user_id', 'customer_name', 'customer_phone', 
        'shipping_address', 'delivery_type', 'payment_method', 'total_amount', 'status',
        'payment_status', 'transaction_id', 'payment_currency', 'payment_details', 'paid_at',
    ];

    protected $casts = [
        'total_amount' => 'float',
        'paid_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
