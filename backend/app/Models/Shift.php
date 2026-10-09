<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    protected $fillable = [
        'name',
        'code',
        'start_time',
        'end_time',
        'days',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function staff()
    {
        return $this->hasMany(User::class, 'shift', 'name');
    }
}
