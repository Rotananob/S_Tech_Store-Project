<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Order;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\PcBuild;
use Carbon\Carbon;

class AdminController extends Controller
{
    public function stats()
    {
        $now = Carbon::now();
        $startOfThisMonth = $now->copy()->startOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        // 1. Total Sales and Sales Growth
        $totalSales = (float) Order::where('status', '!=', 'cancelled')->sum('total_amount');
        $thisMonthSales = (float) Order::where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $startOfThisMonth)
            ->sum('total_amount');
        $lastMonthSales = (float) Order::where('status', '!=', 'cancelled')
            ->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])
            ->sum('total_amount');
        
        $salesGrowth = 0.0;
        if ($lastMonthSales > 0) {
            $salesGrowth = round((($thisMonthSales - $lastMonthSales) / $lastMonthSales) * 100, 1);
        } elseif ($thisMonthSales > 0) {
            $salesGrowth = 100.0;
        }

        // 2. Total Orders and Orders Growth
        $totalOrders = Order::count();
        $thisMonthOrders = Order::where('created_at', '>=', $startOfThisMonth)->count();
        $lastMonthOrders = Order::whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])
            ->count();
            
        $ordersGrowth = 0.0;
        if ($lastMonthOrders > 0) {
            $ordersGrowth = round((($thisMonthOrders - $lastMonthOrders) / $lastMonthOrders) * 100, 1);
        } elseif ($thisMonthOrders > 0) {
            $ordersGrowth = 100.0;
        }

        // 3. Pending Repairs
        $pendingRepairs = \App\Models\Repair::whereIn('status', ['Pending Assessment', 'In Progress'])->count();

        // 4. Active Promotions
        $activePromotions = PromoCode::where('status', 'active')->count();

        // 5. Real 6-Month Monthly Sales for Chart
        $monthlySales = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $monthStart = $month->copy()->startOfMonth();
            $monthEnd = $month->copy()->endOfMonth();
            $monthName = $month->format('M');
            
            $monthRevenue = (float) Order::where('status', '!=', 'cancelled')
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->sum('total_amount');

            $monthlySales[] = [
                'name' => $monthName,
                'sales' => $monthRevenue,
            ];
        }

        return response()->json([
            'totalSales' => $totalSales,
            'salesGrowth' => $salesGrowth,
            'totalOrders' => $totalOrders,
            'ordersGrowth' => $ordersGrowth,
            'pendingRepairs' => $pendingRepairs,
            'activePromotions' => $activePromotions,
            'monthlySales' => $monthlySales,
        ]);
    }
}
