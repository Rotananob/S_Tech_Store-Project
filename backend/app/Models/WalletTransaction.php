<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    protected $fillable = [
        'firebase_uid',
        'type',
        'amount',
        'coins',
        'description',
        'payment_method',
        'reference_id',
        'status',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'float',
        'coins' => 'integer',
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(UserProfile::class, 'firebase_uid', 'firebase_uid');
    }

    protected static function booted()
    {
        static::saved(function ($tx) {
            if (!empty($tx->firebase_uid) && str_starts_with($tx->firebase_uid, 'tg_')) {
                \App\Services\TelegramService::invalidateUserBotCache($tx->firebase_uid);
            }
        });
    }
}
