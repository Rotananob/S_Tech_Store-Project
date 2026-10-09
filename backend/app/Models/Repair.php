<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Repair extends Model
{
    protected $fillable = [
        'ticket_code',
        'customer_name',
        'customer_phone',
        'device_name',
        'issue_description',
        'technician_name',
        'estimated_cost',
        'status',
        'notes',
    ];

    protected $casts = [
        'estimated_cost' => 'decimal:2',
    ];
}
