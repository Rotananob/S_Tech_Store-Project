<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $fillable = [
        'firebase_uid', 'display_name', 'email', 'photo_url',
        'phone', 'address', 'city',
        'two_fa_enabled', 'notif_orders', 'notif_promos', 'notif_builds',
        'points',
    ];

    protected $casts = [
        'two_fa_enabled' => 'boolean',
        'notif_orders' => 'boolean',
        'notif_promos' => 'boolean',
        'notif_builds' => 'boolean',
        'points' => 'integer',
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
