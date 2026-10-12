<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

use App\Models\Order;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\PcBuild;
use Carbon\Carbon;

class AdminController extends Controller
{
    public function stats(Request $request)
    {
        $selectedYear = (int) $request->query('year', Carbon::now()->year);
        $selectedMonth = $request->query('month', 'all'); // 'all' or '1'..'12'

        // Determine available years from orders
        $earliestOrder = Order::orderBy('created_at', 'asc')->first();
        $startYear = $earliestOrder ? Carbon::parse($earliestOrder->created_at)->year : Carbon::now()->year;
        $currentYear = Carbon::now()->year;
        $availableYears = [];
        for ($y = $currentYear; $y >= min($startYear, $currentYear - 2); $y--) {
            $availableYears[] = $y;
        }

        $now = Carbon::now();
        $startOfThisMonth = $now->copy()->startOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        // 1. Overall Total Sales and Growth
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

        // 2. Overall Total Orders and Growth
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

        // 3. Pending Repairs & Active Promotions
        $pendingRepairs = \App\Models\Repair::whereIn('status', ['Pending Assessment', 'In Progress'])->count();
        $activePromotions = PromoCode::where('status', 'active')->count();

        // 4. Filtered Sales & Performance Chart by Month and Year
        $monthlySales = [];
        $filterSales = 0.0;
        $filterOrders = 0;

        if ($selectedMonth === 'all' || empty($selectedMonth)) {
            // Full 12-month breakdown for selectedYear
            $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for ($m = 1; $m <= 12; $m++) {
                $monthStart = Carbon::create($selectedYear, $m, 1, 0, 0, 0)->startOfMonth();
                $monthEnd = $monthStart->copy()->endOfMonth();
                $revenue = (float) Order::where('status', '!=', 'cancelled')
                    ->whereBetween('created_at', [$monthStart, $monthEnd])
                    ->sum('total_amount');
                $count = Order::whereBetween('created_at', [$monthStart, $monthEnd])->count();

                $monthlySales[] = [
                    'name' => $monthNames[$m - 1],
                    'monthNum' => $m,
                    'sales' => $revenue,
                    'orders' => $count,
                ];
                $filterSales += $revenue;
                $filterOrders += $count;
            }
        } else {
            // Specific month: Break down into weekly periods
            $m = max(1, min(12, (int) $selectedMonth));
            $monthStart = Carbon::create($selectedYear, $m, 1, 0, 0, 0)->startOfMonth();
            $daysInMonth = $monthStart->daysInMonth;

            $intervals = [
                ['name' => 'W1 (1-7)', 'start' => 1, 'end' => 7],
                ['name' => 'W2 (8-14)', 'start' => 8, 'end' => 14],
                ['name' => 'W3 (15-21)', 'start' => 15, 'end' => 21],
                ['name' => 'W4 (22-' . min(28, $daysInMonth) . ')', 'start' => 22, 'end' => min(28, $daysInMonth)],
            ];
            if ($daysInMonth > 28) {
                $intervals[] = [
                    'name' => 'W5 (29-' . $daysInMonth . ')',
                    'start' => 29,
                    'end' => $daysInMonth,
                ];
            }

            foreach ($intervals as $inter) {
                $start = Carbon::create($selectedYear, $m, $inter['start'], 0, 0, 0);
                $end = Carbon::create($selectedYear, $m, $inter['end'], 23, 59, 59);
                $revenue = (float) Order::where('status', '!=', 'cancelled')
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('total_amount');
                $count = Order::whereBetween('created_at', [$start, $end])->count();

                $monthlySales[] = [
                    'name' => $inter['name'],
                    'sales' => $revenue,
                    'orders' => $count,
                ];
                $filterSales += $revenue;
                $filterOrders += $count;
            }
        }

        return response()->json([
            'totalSales' => $totalSales,
            'salesGrowth' => $salesGrowth,
            'totalOrders' => $totalOrders,
            'ordersGrowth' => $ordersGrowth,
            'pendingRepairs' => $pendingRepairs,
            'activePromotions' => $activePromotions,
            'monthlySales' => $monthlySales,
            'selectedYear' => $selectedYear,
            'selectedMonth' => $selectedMonth,
            'filteredSales' => $filterSales,
            'filteredOrders' => $filterOrders,
            'availableYears' => $availableYears,
        ]);
    }
}
