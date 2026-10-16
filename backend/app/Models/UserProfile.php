<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $fillable = [
        'firebase_uid', 'display_name', 'username', 'email', 'password', 'auth_provider', 'created_by', 'photo_url',
        'phone', 'address', 'city', 'delivery_notes',
        'gps_lat', 'gps_lng', 'telegram', 'telegram_chat_id', 'notif_telegram', 'profession', 'gender', 'birthday',
        'two_fa_enabled', 'notif_orders', 'notif_promos', 'notif_builds',
        'points', 'is_admin', 'avatar_url',
        'is_active', 'status', 'last_password_reset_at',
        'magic_login_token', 'magic_token_expires_at',
        'has_claimed_welcome_gift', 'welcome_gift_claimed_at',
        'wallet_balance', 'last_daily_coin_at', 'daily_streak', 'lifetime_free_coins',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'two_fa_enabled' => 'boolean',
        'notif_orders' => 'boolean',
        'notif_promos' => 'boolean',
        'notif_builds' => 'boolean',
        'notif_telegram' => 'boolean',
        'is_admin' => 'boolean',
        'is_active' => 'boolean',
        'has_claimed_welcome_gift' => 'boolean',
        'welcome_gift_claimed_at' => 'datetime',
        'points' => 'integer',
        'wallet_balance' => 'float',
        'daily_streak' => 'integer',
        'lifetime_free_coins' => 'integer',
        'last_daily_coin_at' => 'date',
        'gps_lat' => 'float',
        'gps_lng' => 'float',
        'last_password_reset_at' => 'datetime',
        'magic_token_expires_at' => 'datetime',
    ];

    public function walletTransactions()
    {
        return $this->hasMany(WalletTransaction::class, 'firebase_uid', 'firebase_uid');
    }

    public function notifications()
    {
        return $this->hasMany(UserNotification::class, 'firebase_uid', 'firebase_uid');
    }

    public function wishlists()
    {
        return $this->hasMany(Wishlist::class, 'firebase_uid', 'firebase_uid');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'user_id', 'firebase_uid');
    }

    protected static function booted()
    {
        static::saved(function ($user) {
            if (!empty($user->telegram_chat_id)) {
                \App\Services\TelegramService::invalidateUserBotCache($user->telegram_chat_id);
            }
            if (!empty($user->firebase_uid) && str_starts_with($user->firebase_uid, 'tg_')) {
                \App\Services\TelegramService::invalidateUserBotCache($user->firebase_uid);
            }
        });
    }
}
