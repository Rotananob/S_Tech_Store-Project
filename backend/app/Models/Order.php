<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'order_id', 'user_id', 'customer_name', 'customer_phone', 'customer_email',
        'shipping_address', 'delivery_type', 'tracking_number', 'payment_method', 'promo_code', 'discount_amount',
        'total_amount', 'status',
        'payment_status', 'transaction_id', 'payment_currency', 'payment_details', 'admin_notes', 'paid_at',
    ];

    protected $casts = [
        'total_amount' => 'float',
        'discount_amount' => 'float',
        'paid_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user()
    {
        return $this->belongsTo(UserProfile::class, 'user_id', 'firebase_uid');
    }

    protected static function booted()
    {
        static::saved(function ($order) {
            if (!empty($order->user_id) && str_starts_with($order->user_id, 'tg_')) {
                \App\Services\TelegramService::invalidateUserBotCache($order->user_id);
            }
        });
    }
}
