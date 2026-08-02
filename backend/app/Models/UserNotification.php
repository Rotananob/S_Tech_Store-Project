<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    protected $fillable = [
        'firebase_uid', 'title', 'message', 'type', 'read',
    ];

    protected $casts = [
        'read' => 'boolean',
    ];
}
