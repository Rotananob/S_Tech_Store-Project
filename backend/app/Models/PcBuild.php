<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PcBuild extends Model
{
    protected $fillable = [
        'firebase_uid', 'name', 'components', 'total_price'
    ];

    protected $casts = [
        'components' => 'array',
        'total_price' => 'decimal:2',
    ];
}
