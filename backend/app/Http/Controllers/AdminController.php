<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Order;
use App\Models\Product;

class AdminController extends Controller
{
    public function stats()
    {
        $totalSales = Order::where('status', '!=', 'cancelled')->sum('total_amount');
        $totalOrders = Order::count();
        
        // Mocked stats for growth, pending repairs, active promotions as per frontend expectations
        $salesGrowth = 15.2; 
        $ordersGrowth = 8.4;
        $pendingRepairs = 12; // Static for now
        $activePromotions = 3; // Static for now

        return response()->json([
            'totalSales' => $totalSales,
            'salesGrowth' => $salesGrowth,
            'totalOrders' => $totalOrders,
            'ordersGrowth' => $ordersGrowth,
            'pendingRepairs' => $pendingRepairs,
            'activePromotions' => $activePromotions,
        ]);
    }
}
