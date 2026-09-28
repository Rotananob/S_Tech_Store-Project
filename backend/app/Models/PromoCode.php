<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromoCode extends Model
{
    protected $fillable = [
        'name', 'code', 'type', 'value', 
        'valid_from', 'valid_until', 'usage_count', 
        'usage_max', 'status', 'auto_applied'
    ];

    protected $casts = [
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'auto_applied' => 'boolean',
        'value' => 'decimal:2',
    ];
}
