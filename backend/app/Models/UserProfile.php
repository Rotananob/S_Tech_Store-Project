<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $fillable = [
        'firebase_uid', 'display_name', 'email', 'photo_url',
        'phone', 'address', 'city', 'delivery_notes',
        'gps_lat', 'gps_lng', 'telegram', 'profession', 'gender', 'birthday',
        'two_fa_enabled', 'notif_orders', 'notif_promos', 'notif_builds',
        'points', 'is_admin', 'avatar_url',
        'is_active', 'status', 'last_password_reset_at',
    ];

    protected $casts = [
        'two_fa_enabled' => 'boolean',
        'notif_orders' => 'boolean',
        'notif_promos' => 'boolean',
        'notif_builds' => 'boolean',
        'is_admin' => 'boolean',
        'is_active' => 'boolean',
        'points' => 'integer',
        'gps_lat' => 'float',
        'gps_lng' => 'float',
        'last_password_reset_at' => 'datetime',
    ];

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
}
