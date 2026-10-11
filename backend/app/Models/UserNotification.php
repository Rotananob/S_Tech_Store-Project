<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    protected $fillable = [
        'firebase_uid', 'title', 'message', 'type', 'link', 'image', 'read',
    ];

    protected $casts = [
        'read' => 'boolean',
    ];
}
